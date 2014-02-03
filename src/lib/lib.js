
module.exports = lib = {};

    lib._ = require ( 'lodash' )._;

    lib.diff = require ( './diff.js' )();
    lib.comparator = require ( './comparator/compare.js' )();

