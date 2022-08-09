const mysql = require('mysql2/promise')
const config = require('../config/config')
const { dbFactory : dbFactory } = config;

const pool = mysql.createPool({
    host              : dbFactory.host,
    user              : dbFactory.user,
    database          : dbFactory.database,
    password          : dbFactory.password,
    port              : dbFactory.port,
    connectionLimit   : dbFactory.connectionLimit,
    waitForConnections : true
})

//select
let execute = async (query, params) => {
    try {
        // console.log('[Query] => ' + query)
        const [rows] = await pool.execute(query,params)
        // console.log('[SUCCESS] The solution is: ', rows)
        return rows
    } catch(err){
        console.log('[ERROR] Error while performing Query.', err)
        return false;
    }
};

//insert, update, delete
let query = async (query, inParam) => {
    try {
        // console.log('[Query] => ' + query)
        let [rows] = await pool.query(query,inParam)
        // console.log('[SUCCESS] The solution is: ', rows)
        return rows;
    } catch(err) {
        console.log('[ERROR] Error while performing Query.', err)
        return false;
    }
};

module.exports = {
    execute : execute,
    query : query,
    pool : pool
};
