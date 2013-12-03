
'use strict';

var mock = {};

mock.socketBackendProvider = function() {

    this.$get = ['$rootScope', '$timeout', createSocketBackendMock];
};

/**
 * General factory function for $SocketBackend mock.
 * Returns instance for unit testing
 */
var createSocketBackendMock = function ( $rootScope, $timeout ) {

    var socketBackend = {};
    var eventHandlers = {};
    var trainedResponses = {};
    var expectations = [];

    socketBackend.emit = function ( event, data, callback ) {

        if ( !callback && typeof data === 'function' ) {

            callback = data;
            data = undefined;
        }

        function prettyPrint ( data ) {

            return ( angular.isString ( data ) || angular.isFunction ( data ) || data instanceof RegExp )
                ? data
                : angular.toJson ( data );
        }

        var expectation = expectations [ 0 ];

        if ( expectation ) {

            if ( expectation.match ( event ) ) {

                if ( ! expectation.matchData ( data ) ) {

                    throw new Error ( 'Expected ' + event + ' with different data\n' +
                                      'EXPECTED: ' + prettyPrint ( expectation.data ) + '\nGOT:      ' + data );
                }

                expectations.shift();
            }

            else {

                new Error ( 'Unexpected event: ' + event + '\n' +
                            ('Expected ' + expectation ) );
            }
        }

        $rootScope.$apply ( function () {
            $timeout ( function () {
                callback ( null, trainedResponses [ event ] )},  0 );
        });
    };

    socketBackend.on = function ( event, callback ) {

        eventHandlers [ event ] = callback;
    };

    socketBackend.onEvent = function ( event, data ) {

        return {

            respond: function ( res ) {

                trainedResponses [ event ] = res;
            }
        };
    };

    socketBackend.emitEvent = function ( event, data ) {

        $rootScope.$apply ( function () {
            $timeout ( function () {
                eventHandlers [ event ] ( data ) },  0 );
        });
    };

    socketBackend.expectEvent = function ( event, data ) {

        var expectation = new MockSocketExpectation ( event, data );
        expectations.push ( expectation );
        return {

            respond: function ( res ) {

                trainedResponses [ event ] = res;
            }
        }
    };

    socketBackend.verifyNoOutstandingExpectation = function() {

        if ( expectations.length ) {

            throw new Error ( 'Unsatisfied requests: ' + expectations.join ( ', ' ) );
        }
    };

    return socketBackend;
};

var MockSocketExpectation = function ( event, data ) {

    this.data = data;

    this.match = function(e, d) {
        if (event != e) return false;
        if (angular.isDefined(d) && !this.matchData(d)) return false;
        return true;
    };

    this.matchData = function(d) {
        if (angular.isUndefined(data)) return true;
        if (data && angular.isFunction(data.test)) return data.test(d);
        if (data && angular.isFunction(data)) return data(d);
        if (data && !angular.isString(data)) return angular.equals(data, angular.fromJson(d));
        return data == d;
    };

    this.toString = function() {
        return event;
    };
};

/* Mock Socket.io Service and BackEnd*/
angular.module ( 'dnMock', [] )
    .provider ({
    socketBackend: mock.socketBackendProvider
});

