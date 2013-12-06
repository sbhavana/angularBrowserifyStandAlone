
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
sessionSockets.on('connection', function (err, socket, session ) {

    if ( err ) {

        console.log ( "On connection, err: ", err );
    }

    else {

        console.log ( "Socket handshake data: ", socket.handshake );
    }

    var handleUpdate = function ( data, callback ) {

        console.log( "updateUser: ", data );
        var docKey = rkh.generateDocKey ( 'Test', 'Users', data._id );

        // try to set lock::docKey
        redisClient.setnx ( "lock::" + docKey, "1", function ( err, res ) {

            if ( err ) {

                callback ( err, null );
            }

            else {

                // if not able to set, put this request in queue
                if ( res === 0 ) {

                    var req = {

                        command: "Update",
                        data: data,
                        callback: callback
                    };

                    console.log ( "Queuing request: ", req );
                    redisClient.rpush ( "wq::" + docKey, JSON.stringify ( req ) );
                }

                // else
                else {

                    data._id = db.ObjectId ( data._id );

                    // update mongoDB
                    db.collection ( 'Users' ). save ( data, function ( err ) {

                        if ( err ) {

                            callback ( err, null );
                        }

                        else {

                            // update redis key value and expiration
                            redisClient.setex ( docKey, EXPIRE_SECONDS, JSON.stringify ( data ) );

                            callback ( null, data );
                            socket.broadcast.emit ( 'userUpdated', data );

                            // check the work queue
                            redisClient.lpop ( "wq::" + docKey, function ( err, res ) {

                                if ( err ) {

                                    console.log ( err );
                                }

                                else {

                                    // if an item present, then process it
                                    if ( res ) {

                                        // parse the res into a req object
                                        var req = JSON.parse ( res );

                                        console.log ( "pending request: ", req );
                                        switch ( req.command ) {

                                            case "Update": {

                                                handleUpdate ( req.data, req.callback );
                                            }
                                                break;

                                            case "Delete": {

                                                handleDelete ( req.data, req.callback );
                                            }
                                                break;
                                        }
                                    }

                                    // else, delete the lock::docKey
                                    else {

                                        redisClient.del ( "lock::" + docKey );
                                    }
                                }
                            });
                        }
                    });
                }
            }
        });
    };

    var handleNew = function ( data, callback ) {

        console.log ( "Callback: ", callback );
        console.log( "newUser: ", data );
        db.collection ( 'Users' ). insert ( data, function ( err ) {

            if ( err ) {

                callback ( err, null );
            }

            else {

                console.log ( "inserted doc: ", data );
                // create a redis key for the new document
                var docKey = rkh.generateDocKey ( 'Test', 'Users', data._id );

                // add this key-value and expiration to redis DB
                redisClient.setex ( docKey, EXPIRE_SECONDS, JSON.stringify ( data ) );

                callback ( null, data );
                socket.broadcast.emit('newUserAdded', data );
            }
        });
    };

    var handleDelete = function ( data, callback ) {

        console.log( "deleteUser: ", data );

        var docKey = rkh.generateDocKey ( 'Test', 'Users', data._id );

        // try to set lock::docKey
        redisClient.setnx ( "lock::" + docKey, "1", function ( err, res ) {

            if ( err ) {

                callback ( err, null );
            }

            else {

                console.log ( "response from setnx ", res );
                // if not able to set, put this request in queue
                if ( res === 0 ) {

                    var req = {

                        command: "Delete",
                        data: data,
                        callback: callback
                    };

                    // prepend this request to he work queue
                    redisClient.lpush ( "wq::" + docKey, JSON.stringify ( req ) );
                }

                // else
                else {

                    // update mongoDB
                    db.collection ( 'Users' ). remove ( { _id: db.ObjectId ( data._id ) }, function ( err ) {

                        if ( err ) {

                            callback ( err, null );
                        }

                        else {

                            // delete redis key value
                            redisClient.del ( docKey );
                            // delete the work queue
                            redisClient.del ( "wq::" + docKey );
                            // delete the lock::docKey
                            redisClient.del ( "lock::" + docKey );

                            callback ( null, data );
                            socket.broadcast.emit('userDeleted', data );
                        }
                    });
                }
            }
        });
    };

    socket.on('addNewUser', function (data, callback) {

        handleNew ( data, callback );
    });

    socket.on('updateUser', function ( data, callback ) {

        handleUpdate ( data, callback );
    });

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

                            console.log ( "Putting in cache: ", data );
                            // add this key-value and expiration to redis DB
                            redisClient.setex ( docKey, EXPIRE_SECONDS, JSON.stringify ( data ) );

                            callback ( null, data [ 0 ] );
                        }
                    });
                }
            }
        });
    });
});


