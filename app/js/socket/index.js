/*
 * angular-socket-io v0.2.0
 * (c) 2013 Brian Ford http://briantford.com
 * License: MIT
 */

'use strict';

module.exports = angular.module('btford.socket-io', []).
    provider('socket', function () {

        // when forwarding events, prefix the event name
        var prefix = 'socket:',
            ioSocket;

        // expose to provider
        this.$get = function ($rootScope, $timeout) {

            var socket = ioSocket || io.connect('http://localhost:8000');

            var asyncAngularify = function (callback) {
                return function () {
                    var args = arguments;
                    $rootScope.$apply(function () {
                        callback.apply(socket, args);
                    });
                };
            };

            var addListener = function (eventName, callback) {
                socket.on(eventName, asyncAngularify(callback));
            };

            var wrappedSocket = {

                on: function (eventName, callback) {

                    //console.log ( "registering callback for event: ", eventName );
                    socket.on(eventName, asyncAngularify ( callback ));
                },

                addListener: addListener,

                emit: function (eventName, data, callback) {

                    if ( !callback && typeof data === 'function' ) {

                        callback = data;
                        data = undefined;
                    }

                    if ( callback ) {

                        socket.emit(eventName, data, asyncAngularify(callback));
                    }

                    else {

                        socket.emit(eventName, data);
                    }
                },

                removeListener: function ( eventName ) {
                    //console.log ( "de-registering callback for event: ", eventName );
                    return socket.removeAllListeners.apply ( socket, [ eventName ] );
                },

                // when socket.on('someEvent', fn (data) { ... }),
                // call scope.$broadcast('someEvent', data)
                forward: function (events, scope) {

                    if (events instanceof Array === false) {
                        events = [events];
                    }
                    if (!scope) {
                        scope = $rootScope;
                    }
                    events.forEach(function (eventName) {
                        var prefixed = prefix + eventName;
                        var forwardEvent = asyncAngularify(function (data) {
                            scope.$broadcast(prefixed, data);
                        });
                        scope.$on('$destroy', function () {
                            socket.removeListener(eventName, forwardEvent);
                        });
                        socket.on(eventName, forwardEvent);
                    });
                }
            };

            return wrappedSocket;
        };

        this.prefix = function (newPrefix) {
            prefix = newPrefix;
        };

        this.ioSocket = function (socket) {
            ioSocket = socket;
        };
    });
