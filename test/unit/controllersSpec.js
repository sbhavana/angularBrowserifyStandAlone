'use strict';

/* jasmine specs for controllers go here */

describe('myApp Controllers', function(){

    var socketBackend;

    beforeEach ( module ( 'myApp', 'dnMock' ) );

    beforeEach ( inject ( function ( _socketBackend_ ) {

        socketBackend = _socketBackend_;
    }));

    afterEach ( function () {

        socketBackend.verifyNoOutstandingExpectation();
    });

    describe ( 'mainController', function () {

        it ( 'should show correct app version number', inject ( function ( $controller ) {

            var scope = {},
                ctrl = $controller ( 'mainController', { $scope: scope } );

            expect(scope.Cntrl.appVersion).toBe('0.1');
        }));
    });

    describe ( 'ListController', function () {

        var scope;

        beforeEach ( inject ( function ( $rootScope, $location ) {

            $location.path ( '/list' );
            scope = $rootScope.$new();
        }));

        it ( 'should ask for the user list from the backend', inject ( function ( $controller, $timeout ) {

            socketBackend.expectEvent ( 'getAllUsers').respond (  [
                {
                    "name": "John",
                    "email": "john@gmail.com",
                    "phone": 111,
                    "_id": 1
                },
                {
                    "name": "Mary",
                    "email": "mary@gmail.com",
                    "phone": 222,
                    "_id": 2
                },
                {
                    "name": "Sara",
                    "email": "sara@gmail.com",
                    "phone": 333,
                    "_id": 3
                }
            ] );
            var ctrl = $controller ( 'ListController', { $scope: scope, socket: socketBackend } );
            expect(scope.Cntrl.users ).toBeUndefined();
            $timeout.flush ();
        }));

        it ( 'should list three users', inject ( function ( $controller, $timeout ) {

            socketBackend.onEvent ( 'getAllUsers' ).respond ( [
                {
                    "name": "John",
                    "email": "john@gmail.com",
                    "phone": 111,
                    "_id": 1
                },
                {
                    "name": "Mary",
                    "email": "mary@gmail.com",
                    "phone": 222,
                    "_id": 2
                },
                {
                    "name": "Sara",
                    "email": "sara@gmail.com",
                    "phone": 333,
                    "_id": 3
                }
            ]);
            var ctrl = $controller ( 'ListController', { $scope: scope, socket: socketBackend } );
            expect(scope.Cntrl.users ).toBeUndefined();
            $timeout.flush ();
            expect(scope.Cntrl.users.length).toBe(3);
        }));

        it ( 'should not change browser location on getting user list from backend', inject ( function ( $controller, $timeout, $location ) {

            socketBackend.onEvent ( 'getAllUsers' ).respond ( [
                {
                    "name": "John",
                    "email": "john@gmail.com",
                    "phone": 111,
                    "_id": 1
                },
                {
                    "name": "Mary",
                    "email": "mary@gmail.com",
                    "phone": 222,
                    "_id": 2
                },
                {
                    "name": "Sara",
                    "email": "sara@gmail.com",
                    "phone": 333,
                    "_id": 3
                }
            ]);
            var ctrl = $controller ( 'ListController', { $scope: scope, socket: socketBackend } );
            $timeout.flush ();

            expect ( $location.path () ).toBe ( '/list' );
        } ) );

        it ( 'should not show deleted user data on getting a userDeleted event from the backend', inject ( function ( $controller, $timeout ) {

            socketBackend.onEvent ( 'getAllUsers' ).respond ( [
                {
                    "name": "John",
                    "email": "john@gmail.com",
                    "phone": 111,
                    "_id": 1
                },
                {
                    "name": "Mary",
                    "email": "mary@gmail.com",
                    "phone": 222,
                    "_id": 2
                },
                {
                    "name": "Sara",
                    "email": "sara@gmail.com",
                    "phone": 333,
                    "_id": 3
                }
            ]);
            var ctrl = $controller ( 'ListController', { $scope: scope, socket: socketBackend } );
            $timeout.flush ();

            // fire a 'userDeleted' event from mock backend
            socketBackend.emitEvent ( 'userDeleted', {
                "name": "Mary",
                "email": "mary@gmail.com",
                "phone": 222,
                "_id": 2
            } );
            $timeout.flush ();
            expect(scope.Cntrl.users.length).toBe(2);
            expect(scope.Cntrl.users).toContain( {
                "name": "John",
                "email": "john@gmail.com",
                "phone": 111,
                "_id": 1
            });
            expect(scope.Cntrl.users).toContain({
                "name": "Sara",
                "email": "sara@gmail.com",
                "phone": 333,
                "_id": 3
            });
        }));

        it ( 'should not change browser location after updating the list on userDeleted event from backend', inject ( function ( $controller, $timeout, $location ) {

            socketBackend.onEvent ( 'getAllUsers' ).respond ( [
                {
                    "name": "John",
                    "email": "john@gmail.com",
                    "phone": 111,
                    "_id": 1
                },
                {
                    "name": "Mary",
                    "email": "mary@gmail.com",
                    "phone": 222,
                    "_id": 2
                },
                {
                    "name": "Sara",
                    "email": "sara@gmail.com",
                    "phone": 333,
                    "_id": 3
                }
            ]);
            var ctrl = $controller ( 'ListController', { $scope: scope, socket: socketBackend } );
            $timeout.flush ();

            // fire a 'userDeleted' event from mock backend
            socketBackend.emitEvent ( 'userDeleted', {
                "name": "Mary",
                "email": "mary@gmail.com",
                "phone": 222,
                "_id": 2
            } );
            $timeout.flush ();

            expect ( $location.path () ).toBe ( '/list' );
        }));

        it ( 'should show the additional user data on getting a newUserAdded event from the backend', inject ( function ( $controller, $timeout ) {

            socketBackend.onEvent ( 'getAllUsers' ).respond ( [
                {
                    "name": "John",
                    "email": "john@gmail.com",
                    "phone": 111,
                    "_id": 1
                },
                {
                    "name": "Mary",
                    "email": "mary@gmail.com",
                    "phone": 222,
                    "_id": 2
                },
                {
                    "name": "Sara",
                    "email": "sara@gmail.com",
                    "phone": 333,
                    "_id": 3
                }
            ]);
            var ctrl = $controller ( 'ListController', { $scope: scope, socket: socketBackend } );
            $timeout.flush ();

            // fire a 'userDeleted' event from mock backend
            socketBackend.emitEvent ( 'newUserAdded', {
                "name": "Richard",
                "email": "richard@gmail.com",
                "phone": 444,
                "_id": 4
            } );
            $timeout.flush ();
            expect(scope.Cntrl.users.length).toBe(4);
            expect(scope.Cntrl.users).toContain({
                "name": "Richard",
                "email": "richard@gmail.com",
                "phone": 444,
                "_id": 4
            } );
        }));

        it ( 'should not change browser location after updating the list on newUserAdded event from backend', inject ( function ( $controller, $timeout, $location ) {

            socketBackend.onEvent ( 'getAllUsers' ).respond ( [
                {
                    "name": "John",
                    "email": "john@gmail.com",
                    "phone": 111,
                    "_id": 1
                },
                {
                    "name": "Mary",
                    "email": "mary@gmail.com",
                    "phone": 222,
                    "_id": 2
                },
                {
                    "name": "Sara",
                    "email": "sara@gmail.com",
                    "phone": 333,
                    "_id": 3
                }
            ]);
            var ctrl = $controller ( 'ListController', { $scope: scope, socket: socketBackend } );
            $timeout.flush ();

            // fire a 'userDeleted' event from mock backend
            socketBackend.emitEvent ( 'newUserAdded', {
                "name": "Richard",
                "email": "richard@gmail.com",
                "phone": 444,
                "_id": 4
            } );
            $timeout.flush ();

            expect ( $location.path () ).toBe ( '/list' );
        }));

        it ( 'should show updated user data on getting a userUpdated event from the backend', inject ( function ( $controller, $timeout ) {

            socketBackend.onEvent ( 'getAllUsers' ).respond ( [
                {
                    "name": "John",
                    "email": "john@gmail.com",
                    "phone": 111,
                    "_id": 1
                },
                {
                    "name": "Mary",
                    "email": "mary@gmail.com",
                    "phone": 222,
                    "_id": 2
                },
                {
                    "name": "Sara",
                    "email": "sara@gmail.com",
                    "phone": 333,
                    "_id": 3
                }
            ]);
            var ctrl = $controller ( 'ListController', { $scope: scope, socket: socketBackend } );
            $timeout.flush ();

            // fire a 'userDeleted' event from mock backend
            socketBackend.emitEvent ( 'userUpdated', {
                "name": "Sara",
                "email": "sara@gmail.com",
                "phone": 555,
                "_id": 3
            } );
            $timeout.flush ();
            expect(scope.Cntrl.users.length).toBe(3);
            expect(scope.Cntrl.users).toContain({
                "name": "Sara",
                "email": "sara@gmail.com",
                "phone": 555,
                "_id": 3
            } );
        }));

        it ( 'should not change browser location after updating the list on userUpdated event from backend', inject ( function ( $controller, $timeout, $location ) {

            socketBackend.onEvent ( 'getAllUsers' ).respond ( [
                {
                    "name": "John",
                    "email": "john@gmail.com",
                    "phone": 111,
                    "_id": 1
                },
                {
                    "name": "Mary",
                    "email": "mary@gmail.com",
                    "phone": 222,
                    "_id": 2
                },
                {
                    "name": "Sara",
                    "email": "sara@gmail.com",
                    "phone": 333,
                    "_id": 3
                }
            ]);
            var ctrl = $controller ( 'ListController', { $scope: scope, socket: socketBackend } );
            $timeout.flush ();

            // fire a 'userDeleted' event from mock backend
            socketBackend.emitEvent ( 'userUpdated', {
                "name": "Sara",
                "email": "sara@gmail.com",
                "phone": 555,
                "_id": 3
            } );
            $timeout.flush ();

            expect ( $location.path () ).toBe ( '/list' );
        }));

    });

    describe ( 'CreateController', function () {

        var scope;

        beforeEach ( inject ( function ( $rootScope, $location ) {

            $location.path ( '/new' );
            scope = $rootScope.$new();
        }));

        it ( 'should notify backend about the new User on save', inject ( function ( $controller, $timeout ) {

            socketBackend.expectEvent ( 'addNewUser', {
                "name": "Richard",
                "email": "richard@gmail.com",
                "phone": 444,
                "_id": 4
            } ).respond ( {
                "name": "Richard",
                    "email": "richard@gmail.com",
                    "phone": 444,
                    "_id": 4
            } );
            var ctrl = $controller ( 'CreateController', { $scope: scope, socket: socketBackend } );
            expect(scope.Cntrl.user ).toBeUndefined();

            // provide new user data
            scope.Cntrl.user = {
                "name": "Richard",
                "email": "richard@gmail.com",
                "phone": 444,
                "_id": 4
            };

            scope.Cntrl.save ();
            $timeout.flush ();
        }));

        it ( 'should navigate to / after successful save', inject ( function ( $controller, $timeout, $location ) {

            socketBackend.onEvent ( 'addNewUser', {
                "name": "Richard",
                "email": "richard@gmail.com",
                "phone": 444,
                "_id": 4
            } ).respond ( {
                "name": "Richard",
                "email": "richard@gmail.com",
                "phone": 444,
                "_id": 4
            } );
            var ctrl = $controller ( 'CreateController', { $scope: scope, socket: socketBackend } );
            expect ( $location.path () ).toBe ( '/new' );

            // provide new user data
            scope.Cntrl.user = {
                "name": "Richard",
                "email": "richard@gmail.com",
                "phone": 444,
                "_id": 4
            };
            scope.Cntrl.save ();
            $timeout.flush ();

            expect ( $location.path () ).toBe ( '/' );
        }));

        it ( 'should not change browser location on getting newUserAdded event from backend', inject ( function ( $controller, $timeout, $location ) {

            var ctrl = $controller ( 'CreateController', { $scope: scope, socket: socketBackend } );

            // send newUserAdded event from the backend
            socketBackend.emitEvent ( 'newUserAdded', {
                "name": "Richard",
                "email": "richard@gmail.com",
                "phone": 444,
                "_id": 4
            } );
            $timeout.flush ();

            expect ( $location.path () ).toBe ( '/new' );
        } ) );

        it ( 'should not change browser location on getting userUpdated event from backend', inject ( function ( $controller, $timeout, $location ) {

            var ctrl = $controller ( 'CreateController', { $scope: scope, socket: socketBackend } );

            // send newUserAdded event from the backend
            socketBackend.emitEvent ( 'userUpdated', {
                "name": "Richard",
                "email": "richard@gmail.com",
                "phone": 444,
                "_id": 4
            } );
            $timeout.flush ();

            expect ( $location.path () ).toBe ( '/new' );
        } ) );

        it ( 'should not change browser location on getting userDeleted event from backend', inject ( function ( $controller, $timeout, $location ) {

            var ctrl = $controller ( 'CreateController', { $scope: scope, socket: socketBackend } );

            // send newUserAdded event from the backend
            socketBackend.emitEvent ( 'userDeleted', {
                "name": "Richard",
                "email": "richard@gmail.com",
                "phone": 444,
                "_id": 4
            } );
            $timeout.flush ();

            expect ( $location.path () ).toBe ( '/new' );
        } ) );

    });

    describe ( 'EditController', function () {

        var scope;

        beforeEach ( inject ( function ( $rootScope, $location ) {

            $location.path ( '/edit/1');
            scope = $rootScope.$new();
        }));

        it ( 'should fetch user data from the backend', inject ( function ( $controller, $timeout ) {

            socketBackend.expectEvent ( 'getUser', { _id: 1 }).respond ( {
                    "name": "John",
                    "email": "john@gmail.com",
                    "phone": 111,
                    "_id": 1
                });
            var ctrl = $controller ( 'EditController', { $scope: scope, socket: socketBackend, $routeParams: { userId: 1 } } );
            expect(scope.Cntrl.user ).toBeUndefined();
            $timeout.flush ();
            expect(scope.Cntrl.user ).toEqual({
                "name": "John",
                "email": "john@gmail.com",
                "phone": 111,
                "_id": 1
            });
        }));

        it ( 'should not change browser location on getting user data from backend', inject ( function ( $controller, $timeout, $location ) {

            socketBackend.expectEvent ( 'getUser', { _id: 1 }).respond ( {
                "name": "John",
                "email": "john@gmail.com",
                "phone": 111,
                "_id": 1
            });
            var ctrl = $controller ( 'EditController', { $scope: scope, socket: socketBackend, $routeParams: { userId: 1 } } );
            $timeout.flush ();

            expect ( $location.path () ).toBe ( '/edit/1' );
        } ) );

        it ( 'should ask backend to update a user data on save', inject ( function ( $controller, $timeout ) {

            socketBackend.expectEvent ( 'getUser', { _id: 1 }).respond ( {
                "name": "John",
                "email": "john@gmail.com",
                "phone": 111,
                "_id": 1
            });
            var ctrl = $controller ( 'EditController', { $scope: scope, socket: socketBackend, $routeParams: { userId: 1 } } );
            expect(scope.Cntrl.user ).toBeUndefined();
            $timeout.flush ();

            scope.Cntrl.user.phone = 222;
            socketBackend.expectEvent ( 'updateUser', {
                "name": "John",
                "email": "john@gmail.com",
                "phone": 222,
                "_id": 1
            }).respond ( {
                "name": "John",
                "email": "john@gmail.com",
                "phone": 222,
                "_id": 1
            });
            scope.Cntrl.save ();
            $timeout.flush ();
        }));

        it ( 'should navigate to / after successful save', inject ( function ( $controller, $timeout, $location ) {

            socketBackend.onEvent ( 'getUser', { _id: 1 }).respond ( {
                "name": "John",
                "email": "john@gmail.com",
                "phone": 111,
                "_id": 1
            });
            var ctrl = $controller ( 'EditController', { $scope: scope, socket: socketBackend, $routeParams: { userId: 1 } } );
            $timeout.flush ();

            scope.Cntrl.user.phone = 222;
            socketBackend.onEvent ( 'updateUser', {
                "name": "John",
                "email": "john@gmail.com",
                "phone": 222,
                "_id": 1
            }).respond ( {
                "name": "John",
                "email": "john@gmail.com",
                "phone": 222,
                "_id": 1
            });
            scope.Cntrl.save ();
            $timeout.flush ();

            expect ( $location.path () ).toBe ( '/' );
        }));

        it ( 'should ask backend to delete a user on destroy', inject ( function ( $controller, $timeout ) {

            socketBackend.expectEvent ( 'getUser', { _id: 1 }).respond ( {
                "name": "John",
                "email": "john@gmail.com",
                "phone": 111,
                "_id": 1
            });
            var ctrl = $controller ( 'EditController', { $scope: scope, socket: socketBackend, $routeParams: { userId: 1 } } );
            expect(scope.Cntrl.user ).toBeUndefined();
            $timeout.flush ();

            socketBackend.expectEvent ( 'deleteUser', {
                "name": "John",
                "email": "john@gmail.com",
                "phone": 111,
                "_id": 1
            }).respond ( {
                "name": "John",
                "email": "john@gmail.com",
                "phone": 111,
                "_id": 1
            });
            scope.Cntrl.destroy ();
            $timeout.flush ();
        }));

        it ( 'should navigate to / after successful destroy', inject ( function ( $controller, $timeout, $location ) {

            socketBackend.onEvent ( 'getUser', { _id: 1 }).respond ( {
                "name": "John",
                "email": "john@gmail.com",
                "phone": 111,
                "_id": 1
            });
            var ctrl = $controller ( 'EditController', { $scope: scope, socket: socketBackend, $routeParams: { userId: 1 } } );
            $timeout.flush ();

            socketBackend.onEvent ( 'deleteUser', {
                "name": "John",
                "email": "john@gmail.com",
                "phone": 111,
                "_id": 1
            }).respond ( {
                "name": "John",
                "email": "john@gmail.com",
                "phone": 111,
                "_id": 1
            });
            scope.Cntrl.destroy ();
            $timeout.flush ();

            expect ( $location.path () ).toBe ( '/' );
        }));

        it ( 'should not change browser location on getting newUserAdded event from backend', inject ( function ( $controller, $timeout, $location ) {

            socketBackend.onEvent ( 'getUser', { _id: 1 }).respond ( {
                "name": "John",
                "email": "john@gmail.com",
                "phone": 111,
                "_id": 1
            });
            var ctrl = $controller ( 'EditController', { $scope: scope, socket: socketBackend, $routeParams: { userId: 1 } } );
            $timeout.flush ();

            // send newUserAdded event from the backend
            socketBackend.emitEvent ( 'newUserAdded', {
                "name": "Richard",
                "email": "richard@gmail.com",
                "phone": 444,
                "_id": 4
            } );
            $timeout.flush ();

            expect ( $location.path () ).toBe ( '/edit/1' );
        } ) );

        it ( 'should not change browser location on getting userUpdated event from backend', inject ( function ( $controller, $timeout, $location ) {

            socketBackend.onEvent ( 'getUser', { _id: 1 }).respond ( {
                "name": "John",
                "email": "john@gmail.com",
                "phone": 111,
                "_id": 1
            });
            var ctrl = $controller ( 'EditController', { $scope: scope, socket: socketBackend, $routeParams: { userId: 1 } } );
            $timeout.flush ();

            // send newUserAdded event from the backend
            socketBackend.emitEvent ( 'userUpdated', {
                "name": "John",
                "email": "john@gmail.com",
                "phone": 222,
                "_id": 1
            } );
            $timeout.flush ();

            expect ( $location.path () ).toBe ( '/edit/1' );
        } ) );

        it ( 'should not change browser location on getting userDeleted event from backend', inject ( function ( $controller, $timeout, $location ) {

            socketBackend.onEvent ( 'getUser', { _id: 1 }).respond ( {
                "name": "John",
                "email": "john@gmail.com",
                "phone": 111,
                "_id": 1
            });
            var ctrl = $controller ( 'EditController', { $scope: scope, socket: socketBackend, $routeParams: { userId: 1 } } );
            $timeout.flush ();

            // send newUserAdded event from the backend
            socketBackend.emitEvent ( 'userDeleted', {
                "name": "John",
                "email": "john@gmail.com",
                "phone": 111,
                "_id": 1
            } );
            $timeout.flush ();

            expect ( $location.path () ).toBe ( '/edit/1' );
        } ) );
    });
});
