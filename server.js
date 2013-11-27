
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

    socket.on('newUser', function (data) {

        console.log( "newUser: ", data);
        db.collection ( 'Users' ). insert ( data, function ( err ) {

            if ( err ) {

                socket.emit ( 'error', err );
            }

            else {

                io.sockets.emit ( 'newUser', data );
            }
        });
    });

    socket.on('updateUser', function (data) {

        console.log( "updateUser: ", data);
        data._id =  db.ObjectId(data._id);
        db.collection ( 'Users' ). save ( data, function ( err ) {

            if ( err ) {

                socket.emit ( 'error', err );
            }

            else {

                io.sockets.emit ( 'updateUser', data );
            }
        });
    });

    socket.on('deleteUser', function (data) {

        console.log( "deleteUser: ", data);

        db.collection ( 'Users' ). remove ( { _id: db.ObjectId(data._id) }, function ( err ) {

            if ( err ) {

                socket.emit ( 'error', err );
            }

            else {

                io.sockets.emit ( 'deleteUser', data );
            }
        });
    });

    socket.on('getAllUsers', function () {

        console.log( "getAllUsers");
        db.collection ( 'Users' ). find ( function ( err, data ) {

            if ( err ) {

                socket.emit ( 'error', err );
            }

            else {

                io.sockets.emit ( 'getAllUsers', data );
            }
        });
    });

    socket.on('getUser', function ( data ) {

        console.log( "getUser: ", data );
        db.collection ( 'Users' ). find ({ "_id": db.ObjectId(data._id) }, function ( err, data ) {

            if ( err ) {

                socket.emit ( 'error', err );
            }

            else {

                console.log ( data );
                socket.emit ( 'getUser', data [ 0 ] );
            }
        });
    });
});


