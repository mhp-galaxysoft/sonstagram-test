const db = require('../middleware/db_factory')
const mysql = require('mysql2/promise')

exports.addWishList = async (product_pk, mem_pk) => {
    try {
        const query1 = `SELECT * FROM f_wishlist
                        WHERE product_pk=${mysql.escape(product_pk)}
                        AND mem_pk=${mysql.escape(mem_pk)}`
        const [result1] = await db.execute(query1)

        if(result1){
            return true
        }

        const query2 = `INSERT INTO f_wishlist SET
                    product_pk = ${mysql.escape(product_pk)},
                    mem_pk = ${mysql.escape(mem_pk)}`
        const result = await db.query(query2)
        if(result && result.affectedRows === 1){
            return true
        } else {
            return false
        }
    } catch (err) {
        console.error("[ERROR] wishRepo.addWishList => " + err)
        return false
    }
}

exports.removeWishList = async (product_pk, mem_pk) => {
    try {
        const query1 = `SELECT * FROM f_wishlist
                        WHERE product_pk=${mysql.escape(product_pk)}
                        AND mem_pk=${mysql.escape(mem_pk)}`
        const [result1] = await db.execute(query1)

        if(!result1){
            return true
        }

        const query2 = `DELETE FROM f_wishlist 
                    WHERE product_pk = ${mysql.escape(product_pk)} AND mem_pk = ${mysql.escape(mem_pk)}`
        const result = await db.query(query2)
        if(result && result.affectedRows === 1){
            return true
        } else {
            return false
        }
    } catch (err) {
        console.error("[ERROR] wishRepo.removeWishList => " + err)
        return false
    }
}