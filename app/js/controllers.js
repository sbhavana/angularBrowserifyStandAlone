'use strict';

/* Controllers */
   /*
var ListController = function ( $scope, socket ) {

    $scope.newDoc = function () {

        socket.emit ( 'newDoc', "Hello World");
    };

    socket.on ( 'newDoc', function ( data ) {

        $scope.doc = data;

        data = "Bye World";

        socket.emit ( 'updateDoc', data );
    });

    socket.on ( 'updateDoc', function ( data ) {

        $scope.doc = data;
    });
};    */

var ListController = function ( $scope, socket ) {

    // get users list from the server
    socket.emit ( 'getAllUsers' );

    socket.on ( 'getAllUsers', function ( data ) {

        $scope.users = data;
    });

    socket.on ( 'deleteUser', function ( data ) {

        // update $scope.users
        $scope.users = window._.filter ( $scope.users, function ( user ) {

            return user._id === data._id;
        });
    });

    socket.on ( 'newUser', function ( data ) {

        // update $scope.users
        $scope.users.push ( data );
    });

    socket.on ( 'updateUser', function ( data ) {

        // update $scope.users
        var ix = window._.findIndex ( $scope.users, function ( user ) {

            return user._id === data._id;
        });

        $scope.users [ ix ] = data;
    });
};

ListController.$inject = ['$scope', 'socket'];

var CreateController = function ( $scope, $location, $timeout, socket ) {

    $scope.save = function () {

        // send the new user details to the server to add
        socket.emit ( 'newUser', $scope.user );
    };

    socket.on ( 'newUser', function ( data ) {

        $location.path('/');
    });
};

CreateController.$inject = ['$scope', '$location', '$timeout', 'socket'];

var EditController = function ( $scope, $location, $routeParams, socket ) {

    // get user from the server
    socket.emit ( 'getUser', { _id: $routeParams.userId } );

    socket.on ( 'getUser', function ( data ) {

        console.log ( "getUser: ", data );
        $scope.user = data;
    });

    socket.on ( 'error', function ( data ) {

        console.log ( data );
    });

    $scope.save = function () {

        // send the updated user details to the server to add
        socket.emit ( 'updateUser', $scope.user );
    };

    socket.on ( 'updateUser', function ( data ) {

        $location.path('/');
    });

    $scope.destroy = function () {

        // send the user details to the server to delete
        socket.emit ( 'deleteUser', $scope.user );
    };

    socket.on ( 'deleteUser', function ( data ) {

         $location.path('/');
    });

};

EditController.$inject = ['$scope', '$location', '$routeParams', 'socket'];