const db = require('../middleware/db_factory')
const mysql = require('mysql2/promise')

// 채널 팔로잉
exports.Following = async (chnl_pk, mem_pk) => {
    try {
        const query1 = `SELECT * FROM f_follow
                        WHERE chnl_pk = ${mysql.escape(chnl_pk)}
                        AND   mem_pk  = ${mysql.escape(mem_pk)};`

        const [result1] = await db.execute(query1)
        if(result1){ // 이미 팔로우 처리 되어있다면
            return true
        }

        const query2 = `INSERT INTO f_follow (
                    chnl_pk,
                    mem_pk
                 )VALUES ( 
                    ${mysql.escape(chnl_pk)},
                    ${mysql.escape(mem_pk)}
                 )`

        const result2 = await db.query(query2)
        if(result2 && result2.affectedRows >= 1){
            return true
        } else {
            return false
        }
    } catch (err){
        console.error("[ERROR] followRepo.Following => " + err)
        return false
    }
}

// 언팔로우
exports.UnFollowing = async (chnl_pk, mem_pk) => {
    try {
        const query1 = `SELECT * FROM f_follow
                        WHERE chnl_pk = ${mysql.escape(chnl_pk)}
                        AND   mem_pk  = ${mysql.escape(mem_pk)};`
        const [result1] = await db.execute(query1)

        if(!result1){ // 이미 언팔로우 처리 되어있다면
            return true
        }

        const query2 = `DELETE FROM f_follow 
                                WHERE chnl_pk = ${mysql.escape(chnl_pk)}
                                AND mem_pk    = ${mysql.escape(mem_pk)};`

        const result2 = await db.query(query2)
        if(result2 && result2.affectedRows >= 1){
            return true
        } else {
            return false
        }
    } catch (err) {
        console.error("[ERROR] followRepo.UnFollowing => " + err)
        return false
    }
}

// 팔로워 수 검색
exports.FollowerCnt = async (chnl_pk) => {
    try {
        const query = `SELECT count(chnl_pk) as cnt FROM f_follow WHERE chnl_pk=${mysql.escape(chnl_pk)}`
        const [result] = await db.execute(query)
        return result
    } catch (err) {
        console.error("[ERROR] followRepo.FollowerCnt => " + err)
        return false
    }
}

// 팔로우 여부
exports.FollowState = async (chnl_pk, mem_pk) => {
    try {
        const query = `SELECT follow_pk FROM f_follow WHERE chnl_pk=${mysql.escape(chnl_pk)} AND mem_pk=${mem_pk}`
        const result = await db.execute(query)
        return result
    } catch (err) {
        console.error("[ERROR] followRepo.FollowState => " + err)
        return false
    }
}