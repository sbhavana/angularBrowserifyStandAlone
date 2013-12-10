
//var passport = require ( 'passport' );
var fs = require('fs');
var rkh = require ( './src-server/redisKeyHelper.js' )();
var redis = require ( "redis" );
redis.debug_mode = true;
var redisClient = redis.createClient ();
var EXPIRE_SECONDS = 1000;

var db = require ( 'mongojs' ).connect ( 'mongodb://localhost' );
var express = require('express');
var app = express ();

// parameters required for session creation
var secret = 'secret';
var cookieParser = express.cookieParser( secret);
var sessionStoreKey = 'express.sid';
// create a redis-based session store
var RedisStore = require('connect-redis')(express);
var sessionStore = new RedisStore({
    // client: An existing redis client object you normally get from redis.createClient()
     host: 'localhost',
     port: 6379
    // ttl: Redis session TTL in seconds
    // db: Database index to use
    // pass: Password for Redis authentication
    // prefix: Key prefix defaulting to "sess:"
});

// configure app
// Documentation on session: Refer http://www.senchalabs.org/connect/session.html#session

app.configure(function () {
    app.use(cookieParser);
    app.use(express.session({
        store: sessionStore,
        secret: 'secret',
        key: sessionStoreKey
    }));
    app.use(express.static(__dirname + '/app'));
});

// create an app-based httpServer, attach it to socket.io and start the socket.io server
var http = require ( 'http' );
var server = http.createServer ( app );
var io = require('socket.io').listen(server);
server.listen(8000);

// Bind express's session with socket.io server
var SessionSockets = require('session.socket.io');
var sessionSockets = new SessionSockets(io, sessionStore, cookieParser, sessionStoreKey );
var workQueue = {};

sessionSockets.on('connection', function (err, socket, session ) {

    if ( err ) {

        console.log ( "On connection, err: ", err );
    }

    else {

        var sessionId = socket.handshake.headers.cookie;
        console.log ( "Session ID: ", sessionId );
    }

    var handleNew = function ( data, callback ) {

        console.log ( 'In handleNew: ', data );

        db.collection ( 'Users' ). insert ( data, function ( err ) {

            if ( err ) {

                callback ( err, null );
            }

            else {

                console.log ( "inserted doc: ", data );

                // create a redis key for the new document
                var docKey = rkh.generateDocKey ( 'Test', 'Users', data._id );

                // add this key-value and expiration to redis DB
                redisClient.set ( docKey, JSON.stringify ( data ), "EX", EXPIRE_SECONDS );

                callback ( null, data );
                socket.broadcast.emit('newUserAdded', data );
            }
        });
    };

    socket.on('addNewUser', function (data, callback) {

        handleNew ( data, callback );
    });


    var handleUpdate = function ( data, callback ) {

        console.log ( 'In handleUpdate: ', data );

        var docKey = rkh.generateDocKey ( 'Test', 'Users', data._id );

        // try to get lock on this document
        redisClient.set ( "lock::" + docKey, "1", "EX", 60000, "NX" , function ( err, res ) {

        if ( err ) {

                console.log ( "Redis Server Error: ", err );
                callback ( err, null );
            }

            else {

                console.log ( "response: ", res );
                // got the lock
                if ( res === 'OK' ) {

                    console.log ( "Got the lock: ", "lock::" + docKey );

                    // process the request
                    data._id = db.ObjectId ( data._id );

                    console.log ( "Going to call update on mongo " );

                    // update mongoDB
                    db.collection ( 'Users' ). save ( data, function ( err ) {

                        if ( err ) {

                            console.log ( "MongoDB Server Error: ", err );
                            callback ( err, null );
                        }

                        else {

                            console.log ( "Got response from the db after update " );

                            // update redis key value and expiration
                            redisClient.set ( docKey, JSON.stringify ( data ), "EX", EXPIRE_SECONDS );

                            // after processing, release the lock
                            redisClient.del ( "lock::" + docKey );

                            // callback the client
                            callback ( null, data );

                            // broadcast
                            socket.broadcast.emit ( 'userUpdated', data );
                        }
                    });
                }

                // didn't get the lock
                else {

                    console.log ( "Queuing update request: ", data );

                    // put a future callback for processing this request in node's event loop using setImmediate
                    setImmediate ( handleUpdate, data, callback );
                }
            }
        });
    };

    socket.on('updateUser', function ( data, callback ) {

        handleUpdate ( data, callback );
    });


    var handleDelete = function ( data, callback ) {

        console.log ( 'In handleDelete: ', data );

        var docKey = rkh.generateDocKey ( 'Test', 'Users', data._id );

        // try to get lock on this document
        redisClient.set ( "lock::" + docKey, "1", "NX", "EX", 60000 , function ( err, res ) {

            if ( err ) {

                console.log ( "Redis Server Error: ", err );
                callback ( err, null );
            }

            else {

                // got the lock
                if ( res === 'OK' ) {

                    // process the request
                    // update mongoDB
                    db.collection ( 'Users' ). remove ( { _id: db.ObjectId ( data._id ) }, function ( err ) {

                        if ( err ) {

                            console.log ( "MongoDB Server Error: ", err );
                            callback ( err, null );
                        }

                        else {

                            // delete redis key value
                            redisClient.del ( docKey );

                            // delete the lock::docKey
                            redisClient.del ( "lock::" + docKey );

                            callback ( null, data );
                            socket.broadcast.emit('userDeleted', data );
                        }
                    });
                }

                // didn't get the lock
                else {

                    console.log ( "Queuing delete request: ", data );

                    // put a future callback for processing this request in node's event loop using setImmediate
                    setImmediate ( handleDelete, data, callback );
                }
            }
        });
    };

    socket.on('deleteUser', function ( data, callback ) {

        handleDelete ( data, callback );
    });


    socket.on('getAllUsers', function ( data, callback ) {

        console.log( "getAllUsers " );
        db.collection ( 'Users' ). find ( function ( err, data1 ) {

            if ( err ) {

                callback ( err, null );
            }

            else {

                callback ( null, data1 );
            }
        });
    });

    socket.on('getUser', function ( data, callback ) {

        console.log( "getUser: ", data._id );
        var docKey = rkh.generateDocKey ( 'Test', 'Users', data._id );

        // first try the redis cache
        redisClient.get ( docKey, function ( err, res ) {

            if ( err ) {

                console.log ( err );
            }

            else {

                if ( res ) {

                    console.log ( "Received doc from cache: ", res );
                    callback ( null, JSON.parse ( res ) );
                }

                else {

                    // go to mongo DB
                    db.collection ( 'Users' ). find ({ "_id": db.ObjectId ( data._id ) }, function ( err, data ) {

                        if ( err ) {

                            callback ( err, null );
                        }

                        else {

                            console.log ( "Putting in cache: ", data [ 0 ]);
                            // add this key-value and expiration to redis DB
                            redisClient.set ( docKey, JSON.stringify ( data [ 0 ] ), "EX", EXPIRE_SECONDS );

                            callback ( null, data [ 0 ] );
                        }
                    });
                }
            }
        });
    });
});


