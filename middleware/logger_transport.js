/**
 *
 create table f_logs (
 log_created		timestamp not null default current_timestamp primary key,
 log_router		    varchar(200) not null,
 user_type		    bigint(20) default 0,
 user_ip			varchar(200) not null,
 user_pk			bigint(20) default 0,
 target_type		tinyint(4) default 0,
 target_pk		    bigint(20) default 0,
 action_type		tinyint(4) not null,
 log_msg			varchar(600) not null
 )

 */

const util = require('util'),
    winston = require('winston'),
    MySql = require('mysql')

/**
 * @constructor
 * @param {Object} options      Options for the MySQL
 * @param {String} options.user Database username
 * @param {String} options.database Database name
 * @param {String} options.table  Database table for the logs
 * @param {Object} **Optional** options.fields Log object, set custom fields for the log table
 */

const mysql = function(options) {
    "use strict";
    //Please visit https://github.com/felixge/node-mysql#connection-options to get default options for mysql module
    this.options = options || {};

    if(!options.user){
        throw new Error('The database username is required')
    }

    if(!options.database){
        throw new Error('The database name is required')
    }

    if(!options.table){
        throw new Error('The database table is required')
    }

    //check custom table fields
    if(!options.fields){
        this.options.fields = {};
        //use default names
        this.fields = {
            log_router   : 'log_router',
            user_type    : 'user_type',
            user_ip      : 'user_ip',
            user_pk      : 'user_pk',
            user_id      : 'user_id',
            target_type  : 'target_type',
            target_pk    : 'target_pk',
            action_type  : 'action_type',
            log_msg      : 'log_msg'
        }
    } else {
        //use custom table field names
        this.fields = {
            log_router   : this.options.fields.log_router,
            user_type    : this.options.fields.user_type,
            user_ip      : this.options.fields.user_ip,
            user_pk      : this.options.fields.user_pk,
            user_id      : this.options.fields.user_id,
            target_type  : this.options.fields.target_type,
            target_pk    : this.options.fields.target_pk,
            action_type  : this.options.fields.action_type,
            log_msg      : this.options.fields.log_msg
        }
    }
    //Create a connection poll
    this.pool = MySql.createPool(this.options)
};

// Inherit from `winston.Transport`.
util.inherits(mysql, winston.Transport)
//logger name in winston
mysql.prototype.name = 'mysql';
//getter
winston.transports.Mysql = mysql;

/**
 * @method log called by winston when to log somethings
 * @param level {string} Level in winston
 * @param message {string} Message in winston
 * @param meta  {Object} JSON object in winston
 * @param callback {function} callback when finished
 */
mysql.prototype.log = function(level, message, meta, callback) {
    "use strict";

    //save this
    const self = this;
    //run it in nextTick
    process.nextTick(function() {

        const pool = self.pool;

        pool.getConnection(function (err, connection) {

            if(err){
                return callback(err, null)
            }
            //connected
            //set log object
            let log = {};

            let user_type = 0
            switch(meta.user_type){
                case 'user':
                    user_type = 1
                    break
                case 'channelAdmin':
                    user_type = 2
                    break
                case 'factoryAdmin':
                    user_type = 3
                    break
                case 'totalAdmin':
                    user_type = 4
                    break
            }

            log[self.fields.log_router]  = meta.log_router;
            log[self.fields.user_type]   = user_type;
            log[self.fields.user_ip]     = meta.user_ip;
            log[self.fields.user_pk]     = meta.user_pk ? meta.user_pk : 0;
            log[self.fields.user_id]     = meta.user_id;
            log[self.fields.target_type] = meta.target_type.pk;
            log[self.fields.target_pk]   = meta.target_pk
            log[self.fields.action_type] = meta.action_type.pk;
            const obj = {
                level       : level.toUpperCase(),
                target_type : meta.target_type.text,
                action_type : meta.action_type.text,
                message     : meta.message
            }
            log[self.fields.log_msg] = JSON.stringify(obj)

            //Save the log
            connection.query('INSERT INTO '+ self.options.table + ' SET ?', log, function(err, rows, fields) {
                if(err){
                    return callback(err, null)
                }
                //finished
                connection.release()
                callback(null, true)
            })

        })

    })

};

module.exports = mysql;
