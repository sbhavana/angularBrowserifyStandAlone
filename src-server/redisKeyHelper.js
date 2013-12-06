module.exports = function () {

    "use strict";
    var _ = require ( 'lodash' );

    var crypto = require('crypto');
    var redisKeyHelper = {};
    redisKeyHelper.version = "1.0.0";
    redisKeyHelper.config = {};

    var generateDocKey = redisKeyHelper.generateDocKey = function ( dbName, colName, docId, versionNum ) {

        var keyString = dbName + '::' + colName + '::' + docId;

        if ( ! _.isUndefined ( versionNum ) ) {

            keyString = keyString + '::' + versionNum;
        }

        return crypto.createHash ( 'sha1' ).update ( keyString ).digest ( 'base64' );
    };

    return redisKeyHelper;
};