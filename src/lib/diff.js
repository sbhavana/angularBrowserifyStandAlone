
module.exports = function () {

    "use strict";

    var diff = {};

    var lib = require ( './lib.js' );
    var _ =  lib._;

    diff.version = "1.0.0";
    diff.config = {};

    var printDifference = diff.printDifference = function ( a1, a2  ) {

     return _.difference ( a1, a2 );
    };


    return diff;
};
