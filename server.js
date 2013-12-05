
//var passport = require ( 'passport' );
var fs = require('fs');
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

    socket.on('addNewUser', function (data, callback) {

        console.log( "newUser: ", data );
        db.collection ( 'Users' ). insert ( data, function ( err ) {

            if ( err ) {

                callback ( err, null );
            }

            else {

                callback ( null, data );
                socket.broadcast.emit('newUserAdded', data );
            }
        });
    });

    socket.on('updateUser', function ( data, callback ) {

        console.log( "updateUser: ", data );
        data._id =  db.ObjectId(data._id);
        db.collection ( 'Users' ). save ( data, function ( err ) {

            if ( err ) {

                callback ( err, null );
            }

            else {

                callback ( null, data );
                socket.broadcast.emit('userUpdated', data );
            }
        });
    });

    socket.on('deleteUser', function ( data, callback ) {

        console.log( "deleteUser: ", data );

        db.collection ( 'Users' ). remove ( { _id: db.ObjectId(data._id) }, function ( err ) {

            if ( err ) {

                callback ( err, null );
            }

            else {

                callback ( null, data );
                socket.broadcast.emit('userDeleted', data );
            }
        });
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

        console.log( "getUser: ", data );
        db.collection ( 'Users' ). find ({ "_id": db.ObjectId(data._id) }, function ( err, data ) {

            if ( err ) {

                callback ( err, null );
            }

            else {

                callback ( null, data [ 0 ] );
            }
        });
    });
});


