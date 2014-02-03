
module.exports = function () {

    "use strict";

    var comparator = {};

    var lib = require ( '../lib.js' );
    var _ =  lib._;
    var diff = lib.diff;

    comparator.version = "1.0.0";
    comparator.config = {};

    var isEqual = comparator.isEqual = function ( a1, a2 ) {

        console.log ( "printing difference: ", diff.printDifference ( a1, a2 ) );

        return _.isEqual ( a1, a2 );
    };

    return comparator;
};



