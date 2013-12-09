
//var passport = require ( 'passport' );
var fs = require('fs');
var _ = require ( 'lodash' );
var async = require ( 'async' );
var rkh = require ( './src-server/redisKeyHelper.js' )();
var redis = require ( "redis" );
//redis.debug_mode = true;
var redisClient = redis.createClient ();
var EXPIRE_SECONDS = 1000;
var WQ_SERVICE_INTERVAL_MILLISECS = 5000;

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

    var serviceWQ = function () {

        //console.log ( "Servicing WQ: ", workQueue );
        var ptasks = [];
        var i = 0;

        _.forOwn ( workQueue, function ( reqArr, docId ) {

            ptasks [ i++ ] =  async.apply ( handleWReqArr, docId, reqArr );
        });

        async.parallel ( ptasks, function () {

            setInterval ( serviceWQ, WQ_SERVICE_INTERVAL_MILLISECS );
        });
    };

    if ( err ) {

        console.log ( "On connection, err: ", err );
    }

    else {

        var sessionId = socket.handshake.headers.cookie;
        console.log ( "Session ID: ", sessionId );

        // set a Timer for servicing work queue
        setInterval ( serviceWQ, WQ_SERVICE_INTERVAL_MILLISECS );
    }

    var handleWReq = function ( docKey, req, cb ) {

        var data = req.data;
        var callback = req.callback;

        switch ( req.type ) {

            case 'Update': {

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
                    }

                    // mark the end timestamp on db write request
                    db.collection ( 'writeRequest' ). update ( { _id: req.dbWReqId }, { endTime: new Date().getTime() }, function ( err1 ) {

                        cb ( err1 );
                    });
                });
            }
                break;

            case 'Delete': {

                    // update mongoDB
                    db.collection ( 'Users' ). remove ( { _id: db.ObjectId ( data._id ) }, function ( err ) {

                        if ( err ) {

                            callback ( err, null );
                        }

                        else {

                            // delete redis key value
                            redisClient.del ( docKey );

                            callback ( null, data );
                            socket.broadcast.emit('userDeleted', data );
                        }

                        // mark the end timestamp on db write request
                        db.collection ( 'writeRequest' ). update ( { _id: req.dbWReqId }, { endTime: new Date().getTime() }, function ( err1 ) {

                            cb ( err1 );
                        });
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

    var handleWReqArr = function ( docId, reqArr, cb ) {

        var docKey = rkh.generateDocKey ( 'Test', 'Users', docId );

        // try to set lock::docKey
        redisClient.setnx ( "lock::" + docKey, "1", function ( err, res ) {

            if ( err ) {

                console.log ( "Internal Server Error: ", err );
                cb ( err );
            }

            else {

                // if not able to set, return
                if ( res === 0 ) {

                    cb ();
                }

                else {

                    // got the lock, service all pending requests in the order given
                    // should we merge all updates ? What if there is a delete in there ?
                    // what happens to the updates which are ordered after the delete ?

                    var stasks = [];

                    _.forEach ( reqArr, function ( req, ix ) {

                        stasks [ ix ] = async.apply ( handleWReq, docKey, req );
                    });

                    async.series ( stasks, function ( err ) {

                        if ( !err ) {

                            // delete the request array for this doc
                            delete workQueue [ docId ];
                        }

                        // free the lock
                        redisClient.del ( "lock::" + docKey );

                        cb ( err );
                    });
                }
            }
        });
    };

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
                redisClient.setex ( docKey, EXPIRE_SECONDS, JSON.stringify ( data ) );

                callback ( null, data );
                socket.broadcast.emit('newUserAdded', data );
            }
        });
    };

    var queueWReq = function ( type, data, callback ) {

        // insert this write request to mongoDB's 'writeRequest' collection
        // A write request contains:
        // 1. UserId
        // 2. SessionId
        // 3. Start Time
        // 4. End Time
        // 5. Db Name
        // 6. Collection Name
        // 7. Document Id
        // 8. Write Request Type
        // 9. Request Data

        var dbWReq = {

            userId: session.userId,

            sessionId: sessionId,

            startTime: new Date().getTime(),

            db: 'Test',

            col: 'Users',

            docId: data._id,

            type: type,

            data: data
        };

        db.collection ( 'writeRequest' ). insert ( dbWReq, function ( err ) {

            if ( err ) {

                callback ( err, null );
            }

            else {

                // insert it in the work queue
                console.log ( "inserted write request in DB: ", dbWReq );

                if ( workQueue [ data._id ] ) {

                    workQueue [ data._id ].push ( { type: type, data: data, callback: callback, dbWReqId: dbWReq._id } );
                }

                else {

                    workQueue [ data._id ] = [ { type: type, data: data, callback: callback, dbWReqId: dbWReq._id } ];
                }
            }
        });
    };

    socket.on('addNewUser', function (data, callback) {

        handleNew ( data, callback );
    });

    socket.on('updateUser', function ( data, callback ) {

        console.log ( 'updateUser received: ', data );
        queueWReq ( 'Update', data, callback );
    });

    socket.on('deleteUser', function ( data, callback ) {

        console.log ( 'deleteUser received: ', data );
        queueWReq ( 'Delete', data, callback );
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
                            redisClient.setex ( docKey, EXPIRE_SECONDS, JSON.stringify ( data [ 0 ] ) );

                            callback ( null, data [ 0 ] );
                        }
                    });
                }
            }
        });
    });
});


