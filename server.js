
var fs = require('fs');
var db = require ( 'mongojs' ).connect ( 'mongodb://localhost' );
var express = require('express');
var app = express ();
var http = require ( 'http' );
var server = http.createServer ( app );
var io = require('socket.io').listen(server);

server.listen(8000);

app.use(express.static(__dirname + '/app'));

io.on('connection', function (socket) {

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


