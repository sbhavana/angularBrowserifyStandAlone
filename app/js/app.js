'use strict';

// Declare app level module which depends on filters, and services
angular.module('myApp', [
        'ngRoute',
        'btford.socket-io'
    ])

    .config(['$routeProvider', function($routeProvider) {
        $routeProvider.when('/list', {templateUrl: 'templates/list.html', controller: 'ListController'});
        $routeProvider.when('/new', {templateUrl: 'templates/detail.html', controller: 'CreateController'});
        $routeProvider.when('/edit/:userId', {templateUrl: 'templates/detail.html', controller: 'EditController'});
        $routeProvider.otherwise({redirectTo: '/list'});
    }])

    .value('app-version', '0.1')

    // create and register a uuid service
    .service ( 'uuid', [ function () {

        return {

            newUUID: function () {

                function _p8(s) {
                    var p = (Math.random().toString(16)+"000000000").substr(2,8);
                    return s ? "-" + p.substr(0,4) + "-" + p.substr(4,4) : p ;
                }

                return _p8() + _p8(true) + _p8(true) + _p8();
            }
        }
    }])

    .controller ( 'mainController', [ '$scope', 'app-version', function ( $scope,  app_version ) {

        var Cntrl = {};
        $scope.Cntrl = Cntrl;
        Cntrl.appVersion = app_version;
    }])

    .controller ( 'ListController', [ '$scope', 'socket', function ( $scope, socket ) {

        var Cntrl = {};
        $scope.Cntrl = Cntrl;

        // get users list from the server
        socket.emit ( 'getAllUsers', function ( err, data ) {

            if ( err ) {

                console.log ( err );
            }

            else {

                console.log ( "getAllUsers callback: ", data );

                Cntrl.users = data;

                socket.on ( 'userDeleted', function ( data ) {

                    console.log ( "userDeleted: ", data );

                    // update $scope.users
                    Cntrl.users = window._.filter ( Cntrl.users, function ( user ) {

                        return user._id !== data._id;
                    });
                });

                socket.on ( 'newUserAdded', function ( data ) {

                    console.log ( "newUserAdded: ", data );

                    // update $scope.users
                    Cntrl.users.push ( data );
                });

                socket.on ( 'userUpdated', function ( data ) {

                    console.log ( "userUpdated: ", data );

                    // update $scope.users
                    var ix = window._.findIndex ( Cntrl.users, function ( user ) {

                        return user._id === data._id;
                    });

                    if ( ix === -1 ) {

                        Cntrl.users [ Cntrl.users.length ] = data;
                    }

                    else {

                        Cntrl.users [ ix ] = data;
                    }
                });

                $scope.$on ( '$destroy', function () {

                    socket.removeListener ( 'newUserAdded' );
                    socket.removeListener ( 'userUpdated' );
                    socket.removeListener ( 'userDeleted' );
                })
            }
        });
    }])

    .controller ( 'CreateController', [ '$scope', '$location', 'socket', 'uuid', function ( $scope, $location, socket ) {

        var Cntrl = {};
        $scope.Cntrl = Cntrl;

        Cntrl.save = function () {

            // send the new user details to the server to add
            socket.emit ( 'addNewUser', Cntrl.user,  function ( err ) {

                if ( err ) {

                    console.log ( err );
                }

                else {

                    console.log ( "addNewUser callback" );
                    $location.path('/');
                }
            });
        };
    }])

    .controller ( 'EditController', [ '$scope', '$location', '$routeParams', 'socket', function ( $scope, $location, $routeParams, socket ) {

        var Cntrl = {};
        $scope.Cntrl = Cntrl;

        // get user from the server
        socket.emit ( 'getUser', { _id: $routeParams.userId },  function ( err, data ) {

            if ( err ) {

                console.log ( err );
            }

            else {

                console.log ( "getUser callback: ", data );
                Cntrl.user = data;
            }
        });

        Cntrl.save = function () {

            // send the updated user details to the server to add
            socket.emit ( 'updateUser', Cntrl.user,  function ( err ) {

                if ( err ) {

                    console.log ( err );
                }

                else {

                    console.log ( "updateUser callback" );
                    $location.path('/');
                }
            });
        };

        Cntrl.destroy = function () {

            // send the user details to the server to delete
            socket.emit ( 'deleteUser', Cntrl.user, function ( err ) {

                if ( err ) {

                    console.log ( err );
                }

                else {

                    console.log ( "deleteUser callback" );
                    $location.path('/');
                }
            });
        };
    }]);

