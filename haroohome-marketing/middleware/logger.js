const winston = require('winston')
const winston_mysql = require('./logger_transport')
const config = require('../config/config')
const { dbFactory : dbFactory } = config;

const options_default = {
    host              : dbFactory.host,
    user              : dbFactory.user,
    database          : dbFactory.database,
    password          : dbFactory.password,
    database          : 'test',
    table             : 'f_logs'
}

const logger = new (winston.createLogger)({
    transports: [
        new winston_mysql(options_default)
    ]
})

module.exports = logger

