"use strict";

var should = require ( "should" );
var rkh = require ( '../src-server/redisKeyHelper.js' )();

var options = {
    'force new connection': true
};

describe ( 'Client-Action Scenarios ', function (){

    describe ( "Single Action ", function () {

        var cli1,
            cli2;

        afterEach ( function ( done ) {

            cli1.disconnect ();
            cli2.disconnect ();

            done ();
        });

        it ( "A \'Create\' action in one client gets advertised to another passive client ", function ( done ) {

            // create the Initiator client and the passive client
            cli1 = require('socket.io-client').connect('http://localhost:8000', options );
            cli2 = require('socket.io-client').connect('http://localhost:8000', options );

            cli1. on ( 'connect', function() {
                console.log ( "initiator client connected: ", cli1.socket.sessionid );
                cli1.emit ( 'addNewUser', { name:'Mary', email:'mary@gmail.com', phone:9822245347 }, function ( err, data ) {

                    data.name.should.equal ( 'Mary' );
                    data.email.should.equal ('mary@gmail.com' );
                    data.phone.should.equal (9822245347 );
                } );
            });

            cli2. on ( 'connect', function() {

                console.log ( "passive client connected: ", cli2.socket.sessionid );

                cli2.on ( 'newUserAdded', function ( data ) {

                    data.name.should.equal ( 'Mary' );
                    data.email.should.equal ('mary@gmail.com' );
                    data.phone.should.equal (9822245347 );
                    data._id.should.not.be.undefined;

                    // cleanup
                    cli2.emit ( 'deleteUser', { _id: data._id }, function ( err, data1 ) {

                        done ( err );
                    });
                });
            });
        });

        it ( "A \'Update\' action in one client gets advertised to another passive client ", function ( done ) {

            // create the Initiator client and the passive client
            cli1 = require('socket.io-client').connect('http://localhost:8000', options );
            cli2 = require('socket.io-client').connect('http://localhost:8000', options );

            cli1. on ( 'connect', function() {
                console.log ( "initiator client connected: ", cli1.socket.sessionid );
                cli1.emit ( 'addNewUser', { name:'Mary', email:'mary@gmail.com', phone:9822245347 }, function ( err, data ) {

                    cli1.emit ( 'updateUser', { name:'John', email:'john@gmail.com', phone:9822245347, _id: data._id }, function ( err1, data1 ) {
                        data1.name.should.equal ( 'John' );
                        data1.email.should.equal ('john@gmail.com' );
                        data1.phone.should.equal (9822245347 );
                        data1._id.should.equal ( data._id );
                    } );
                });
            });

            cli2. on ( 'connect', function() {

                console.log ( "passive client connected: ", cli2.socket.sessionid );

                cli2.on ( 'userUpdated', function ( data ) {

                    data.name.should.equal ( 'John' );
                    data.email.should.equal ('john@gmail.com' );
                    data.phone.should.equal (9822245347 );
                    data._id.should.not.be.undefined;

                    // cleanup
                    cli2.emit ( 'deleteUser', { _id: data._id }, function ( err1, data1 ) {

                        done (err1);
                    });
                });
            });
        });

        it ( "A \'Delete\' action in one client gets advertised to another passive client ", function ( done ) {

            // create the Initiator client and the passive client
            cli1 = require('socket.io-client').connect('http://localhost:8000', options );
            cli2 = require('socket.io-client').connect('http://localhost:8000', options );

            cli1. on ( 'connect', function() {
                console.log ( "initiator client connected: ", cli1.socket.sessionid );
                cli1.emit ( 'addNewUser', { name:'Mary', email:'mary@gmail.com', phone:9822245347 }, function ( err, data ) {

                    cli1.emit ( 'deleteUser', { _id: data._id }, function ( err1, data1 ) {
                        data1._id.should.equal ( data._id );
                    } );
                });
            });

            cli2. on ( 'connect', function() {

                console.log ( "passive client connected: ", cli2.socket.sessionid );

                cli2.on ( 'userDeleted', function ( data ) {

                    data._id.should.not.be.undefined;

                    done ();
                });
            });
        });
    });

    // Incomplete
    describe ( "Multiple Simultaneous Actions ", function () {

        var cli1,
            cli2;
        var doc;
        var cli1_done;
        var cli2_done;

        beforeEach ( function ( done ) {

            cli1_done = cli2_done = false;

            // create the Initiator client and the passive client
            cli2 = require('socket.io-client').connect('http://localhost:8000', options );
            cli2. on ( 'connect', function() {

                console.log ( " client2 connected: ", cli2.socket.sessionid );
            });

            cli1 = require('socket.io-client').connect('http://localhost:8000', options );
            cli1. on ( 'connect', function() {
                console.log ( " client1 connected: ", cli1.socket.sessionid );
                cli1.emit ( 'addNewUser', { name:'Mary', email:'mary@gmail.com', phone:9822245347 }, function ( err, data ) {

                    doc = data;
                    done ( err );
                } );
            });
        });

        afterEach ( function ( done ) {

            cli1.disconnect ();
            cli2.disconnect ();

            done ();
        });

        it ( "A simultaneous 'Update' and 'Delete' on same document by two clients results in they being applied in random order. The end result can either by a delete or an update. ", function ( done ) {

            // emit update
            cli1.emit ( 'updateUser', { name:'John', email:'john@gmail.com', phone:9822245347, _id: doc._id }, function ( err1, data1 ) {

                cli1_done = true;

                if ( cli2_done ) {

                    done ();
                }
            });

            // emit delete
            cli2.emit ( 'deleteUser', { _id: doc._id }, function ( err2, data2 ) {

                cli2_done = true;

                if ( cli1_done ) {

                    done ();
                }
            });
        });
    });
});

describe ( 'Lock Scenarios ', function () {

    var cli1;
    var doc;
    var redis = require ( "redis" );
    var redisClient = redis.createClient ();
    var redisSubClient = redis.createClient ();

    beforeEach ( function ( done ) {

        cli1 = require('socket.io-client').connect('http://localhost:8000', options );
        cli1. on ( 'connect', function() {
            console.log ( " client1 connected: ", cli1.socket.sessionid );
            cli1.emit ( 'addNewUser', { name:'Mary', email:'mary@gmail.com', phone:9822245347 }, function ( err, data ) {

                doc = data;
                done ( err );
            } );
        });
    });

    afterEach ( function ( done ) {

        cli1.disconnect ();

        done ();
    });

    it ( 'Lock expiry event should get generated in order to service pending write requests on a document whose lock has been artificially held by an outside redis client. ', function ( done ) {

        var expiredEvRcvd = false,
            cleanUpDone = false;

        // generate lock key
        var docKey = rkh.generateDocKey ( 'Test', 'Users', doc._id );
        var lockKey = "lock_" + docKey;

        redisSubClient.subscribe ( "__keyspace@0__:" + lockKey );

        redisSubClient.on ( "message", function ( channel, message ) {

            if ( message === 'expired' && channel === "__keyspace@0__:" + lockKey ) {

                expiredEvRcvd = true;

                if ( cleanUpDone ) {

                    done ();
                }
            }
        });

        // get the lock
        redisClient.set ( lockKey, "1", "EX", 1 , "NX" );

            // issue the write request which shall get queued
        cli1.emit ( 'updateUser', { name:'John', email:'john@gmail.com', phone:9822245347, _id: doc._id }, function ( err1, data1 ) {

            data1.name.should.equal ( 'John' );
            data1.email.should.equal ('john@gmail.com' );
            data1.phone.should.equal (9822245347 );
            data1._id.should.equal ( doc._id );


            // cleanup
            cli1.emit ( 'deleteUser', { _id: doc._id }, function ( err2, data2 ) {

                cleanUpDone = true;

                if ( expiredEvRcvd ) {

                    done (err2);
                }
            });
        } );
    });
});