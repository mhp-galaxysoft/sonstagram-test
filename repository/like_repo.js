const db = require('../middleware/db_factory')
const mysql = require('mysql2/promise')

// 후기 좋아요
exports.Like = async (review_pk, mem_pk) => {
    try {
        const query1 = `SELECT  *
                        FROM    f_review_like
                        WHERE   review_pk = ${mysql.escape(review_pk)}
                        AND     mem_pk = ${mysql.escape(mem_pk)}`
        const [result1] = await db.execute(query1)
        if(result1){
            return true
        }

        const query2 = `INSERT INTO f_review_like (
                            review_pk,
                            mem_pk
                         )VALUES ( 
                            ${mysql.escape(review_pk)},
                            ${mysql.escape(mem_pk)}
                         );`
        const result2 = await db.query(query2)
        if(result2 && result2.affectedRows === 1){
            return true
        } else {
            return false
        }
    } catch (err) {
        console.error("[ERROR] likeRepo.Like => " + err)
        return false
    }
}

// 후기 좋아요 취소
exports.UnLike = async (review_pk, mem_pk) => {
    try {
        const query1 = `SELECT  *
                        FROM    f_review_like
                        WHERE   review_pk = ${mysql.escape(review_pk)}
                        AND     mem_pk = ${mysql.escape(mem_pk)}`
        const [result1] = await db.execute(query1)
        if(!result1){
            return true
        }

        const query2 = ` DELETE FROM f_review_like
                        WHERE review_pk=${mysql.escape(review_pk)}
                        AND mem_pk=${mysql.escape(mem_pk)}`
        const result2 = await db.query(query2)
        if(result2 && result2.affectedRows === 1){
            return true
        } else {
            return false
        }
    } catch (err) {
        console.error("[ERROR] likeRepo.UnLike => " + err)
        return false
    }
}

// 후기 좋아요 수
exports.LikeCnt = async (review_pk) => {
    try {
        const query = ` SELECT count(review_pk) as cnt
                    FROM f_review_like
                    WHERE review_pk = ${mysql.escape(review_pk)}`
        const [result] = await db.execute(query)
        if(result){
            return result
        } else {
            return false
        }
    } catch (err) {
        console.error("[ERROR] likeRepo.LikeCnt => " + err)
        return false
    }
}
