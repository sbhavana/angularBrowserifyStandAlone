
//var passport = require ( 'passport' );
var fs = require('fs');
var _ = require ( 'lodash' );
var async = require ( 'async' );
var rkh = require ( './src-server/redisKeyHelper.js' )();
var redis = require ( "redis" );
//redis.debug_mode = true;
var redisClient = redis.createClient ();
var redisSubClient = redis.createClient ();
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

redisSubClient.on ( "message", function ( channel, message ) {

    console.log ( "Received message: " + message + " from channel: " + channel );

    var channelParts = channel.split ( ':');

    console.log ( channelParts );

    // if channel is a keyspace notification channel
    if ( channelParts [ 0 ] === "__keyspace@0__" ) {

        var lockKey = channelParts [ 1 ];

        // if the lockKey was deleted or expired
        if ( message === 'del' || message === 'expired' ) {

            serviceWQ ( lockKey.substr ( 5 ) );
        }
    }
});

var serviceWQ = function ( docKey ) {

    var lockKey = "lock_" + docKey;

    redisSubClient.subscribe ( "__keyspace@0__:" + lockKey );

    // try to set lock_docKey
    redisClient.set ( lockKey, "1", "EX", 60000, "NX" , function ( err, res ) {

        if ( err ) {

            console.log ( "Redis Server Error: ", err );
        }

        else {

            // if able to set
            if ( res === 'OK' ) {

                // got the lock
                console.log ( "got the lock: ", lockKey );

                redisSubClient.unsubscribe ( "__keyspace@0__:" + lockKey );

                // clone the current work queue for this docKey
                // and reset the work queue to an empty queue
                var reqQ = _.cloneDeep ( workQueue [ docKey ] );
                delete workQueue [ docKey ];

                // process the cloned request queue
                var stasks = [];

                _.forEach ( reqQ, function ( req, ix ) {

                    stasks [ ix ] = async.apply ( handleWReq, docKey, req );
                });

                async.series ( stasks, function ( err ) {

                    if ( err ) {

                        console.log ( "Error while processing write requests on docKey: " + docKey + ", err: " + err );
                    }

                    // free the lock
                    redisClient.del ( lockKey );
                });
            }

            // not able to get the lock
            else   {
            }
        }
    });
};

var queueWReq = function ( docKey, type, data, callback, socketId ) {

    if ( workQueue [ docKey ] ) {

        workQueue [ docKey ].push ( { type: type, data: data, callback: callback, socketId: socketId } );
    }

    else {

        workQueue [ docKey ] = [ { type: type, data: data, callback: callback, socketId: socketId } ];
    }

    serviceWQ ( docKey );
};

var handleWReq = function ( docKey, req, cb ) {

    var data = req.data;
    var callback = req.callback;
    var socketId = req.socketId;

    switch ( req.type ) {

        case 'Update': {

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

                    // callback the client
                    callback ( null, data );

                    // broadcast to all clients except sender
                    io.sockets.sockets [ socketId ].broadcast.emit ( 'userUpdated', data );
                }

                cb ();
            });
        }
            break;

        case 'Delete': {

            // update mongoDB
            db.collection ( 'Users' ). remove ( { _id: db.ObjectId ( data._id ) }, function ( err ) {

                if ( err ) {

                    console.log ( "MongoDB Server Error: ", err );
                    callback ( err, null );
                }

                else {

                    // delete redis key value
                    redisClient.del ( docKey );

                    callback ( null, data );

                    // broadcast to all clients except sender
                    io.sockets.sockets [ socketId ].broadcast.emit ( 'userDeleted', data );
                }

                cb ();
            });
        }
            break;

        default: {

            console.log ( "Unrecognized type of write request" );

            // TODO: pass in an error
            cb ();
        }
            break;
    }
};

sessionSockets.on ( 'connection', function ( err, socket, session ) {

    if ( err ) {

        console.log ( "On connection, err: ", err );
    }

    else {

        var sessionId = socket.handshake.headers.cookie;
        console.log ( "Session ID: ", sessionId );
    }

    socket.on ( 'updateUser', function ( data, callback ) {

        console.log ( 'updateUser received: ', data );
        var docKey = rkh.generateDocKey ( 'Test', 'Users', data._id );

        queueWReq ( docKey, 'Update', data, callback, socket.id );
    });

    socket.on ( 'deleteUser', function ( data, callback ) {

        console.log ( 'deleteUser received: ', data );
        var docKey = rkh.generateDocKey ( 'Test', 'Users', data._id );

        queueWReq ( docKey, 'Delete', data, callback, socket.id );
    });

    var handleNew = function ( data, callback ) {

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
                redisClient.set ( docKey, JSON.stringify ( data ), "EX", EXPIRE_SECONDS );

                callback ( null, data );

                // broadcast to all clients except sender
                socket.broadcast.emit('newUserAdded', data );
            }
        });
    };

    socket.on ( 'addNewUser', function (data, callback) {

        handleNew ( data, callback );
    });

    socket.on ( 'getAllUsers', function ( data, callback ) {

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

    socket.on ( 'getUser', function ( data, callback ) {

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
                            redisClient.setex ( docKey, EXPIRE_SECONDS, JSON.stringify ( data [ 0 ] ) );

                            callback ( null, data [ 0 ] );
                        }
                    });
                }
            }
        });
    });
});

