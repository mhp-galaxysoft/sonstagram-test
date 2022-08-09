const db = require('../middleware/db_factory')
const mysql = require('mysql2/promise')

// 회원 조회(id로)
exports.SelectMemberForId = async (mem_id, flag_status) => {
    try {
        let query1 = `SELECT * FROM f_members WHERE BINARY mem_id = ${mysql.escape(mem_id)}`
        let query2 = `SELECT * FROM f_factory WHERE BINARY factory_id = ${mysql.escape(mem_id)}`

        // 로그인을 위해 현재 유효한 계정만 select 하는 경우
        if(flag_status){
            query1 +=  ' AND flag_status = 0'
            query2 +=  ' AND flag_status = 0'
        }

        const [existMemberData] = await db.execute(query1)
        const [existFactoryData] = await db.execute(query2)

        if(existMemberData){
            return existMemberData
        }else if(existFactoryData){
            return existFactoryData
        }else{
            return ""
        }
    } catch (err) {
        console.error("[ERROR] memberRepo.SelectMemberForId => " + err)
        return false
    }
}

// 채널 관리자 조회(email로)
exports.SelectChannelForId = async (mem_id) => {
    try {
        const query = `SELECT       chnl_pk, mem_pk, mem_nickname
                       FROM         f_members
                       WHERE        mem_id = ${mysql.escape(mem_id)}
                       AND          flag_status = 0 
                       AND          user_type = 1`
        const [result] = await db.execute(query)
        return result
    } catch (err) {
        console.error("[ERROR] memberRepo.SelectChannelForId => " + err)
        return false
    }
}

// 멤버 휴대폰 번호 조회
exports.SelectMemberForTel = async (mem_tel, mem_type) => {
    try {
        let query
        if(mem_type === 'user'){
            query = `SELECT   COUNT(*) AS cnt
                       FROM     f_members
                       WHERE    mem_tel = ${mysql.escape(mem_tel)}
                       AND      chnl_pk IS NULL`
        } else if(mem_type === 'channelAdmin') {
            query = `SELECT   COUNT(*) AS cnt
                       FROM     f_members
                       WHERE    mem_tel = ${mysql.escape(mem_tel)}
                       AND      chnl_pk IS NOT NULL`
        }

        const [result] = await db.execute(query);
        return result
    } catch (err) {
        console.error("[ERROR] memberRepo.SelectMemberForTel => " + err);
        return false
    }
}

// 채널 관리자가 이미 팩토리에 소속되어 있는지 확인
exports.SelectChannelFactory = async (chnl_pk, factory_pk) => {
    try {
        const query1 = `SELECT * FROM f_factory_chnl_map
                        WHERE chnl_pk = ${mysql.escape(chnl_pk)}`
        const [result1] = await db.execute(query1)
        if(!result1) {
            return 'SUCCESS'
        }

        const query2 = `SELECT * FROM f_factory_chnl_map
                        WHERE chnl_pk = ${mysql.escape(chnl_pk)}
                        AND factory_pk = ${mysql.escape(factory_pk)}`
        const [result2] = await db.execute(query2)

        if(result2){
            return 'CURRENT FACTORY'
        } else {
            return 'OTHER FACTORY'
        }
    } catch (err) {
        console.error("[ERROR] memberRepo.selectChannelFactory => " + err)
    }
}

// 회원가입
exports.CreateMember = async (memInfo)=>{
    try {
        const query = `INSERT INTO f_members SET ?;`
        const result = await db.query(query, memInfo)

        if(result && result.affectedRows === 1){
            return result
        } else {
            return false
        }
    } catch (err) {
        console.error("[ERROR] memberRepo.CreateMember => " + err)
        return false
    }
}

// 비밀번호 찾기 - 비밀번호 update
exports.UpdateMemberPassword = async(id, password)=>{
    try{
        const query1 = `UPDATE f_members SET mem_password = ${mysql.escape(password)} WHERE mem_id = ${mysql.escape(id)} AND flag_status = 0;`
        const result1 = await db.query(query1)
        if(result1 && result1.affectedRows >= 1){
            return true
        } else {
            return false
        }
    }catch(err){
        console.error("[ERROR] memberRepo.UpdateMemberPassword => " + err)
        return false
    }
}

// 프로필 - 회원 정보 수정 - 일반 유저 정보 수정
exports.UpdateMemberInfo = async(mem_pk, info)=>{
    try {
        const query = `UPDATE f_members SET ? WHERE mem_pk = ${mysql.escape(mem_pk)};`
        const result = await db.query(query, info)
        if(result && result.affectedRows === 1){
            return true
        } else {
            return false
        }
    } catch (err) {
        console.error("[ERROR] memberRepo.UpdateMemberInfo => " + err)
        return false
    }
}

// 프로필 - 회원 정보 수정 - 채널 관리자 정보 수정
exports.UpdateChannelAuthInfo = async(mem_pk, info, chnl_pk, channelInfo)=>{
    const pool = db.pool
    const conn = await pool.getConnection()
    try {
        await conn.beginTransaction()

        const query1 = `UPDATE f_members SET ? WHERE mem_pk = ${mysql.escape(mem_pk)};`
        const [result1] = await conn.query(query1, info)
        if(!(result1 && result1.affectedRows >= 1)){
            await conn.rollback()
            return false
        }

        const query2 = `UPDATE f_channel SET ? WHERE chnl_pk = ${mysql.escape(chnl_pk)};`
        const [result2] = await conn.query(query2, channelInfo)
        if(!(result2 && result2.affectedRows >= 1)){
            await conn.rollback()
            return false
        }

        await conn.commit()
        return true
    } catch (err) {
        console.error("[ERROR] memberRepo.UpdateChannelAuthInfo => " + err)
        await conn.rollback()
        return false
    } finally {
        conn.release()
    }
}

// 프로필 - 회원 탈퇴
exports.DeleteMember = async(mem_pk)=>{
    try {
        const query = `UPDATE f_members SET flag_status = 1 WHERE mem_pk = ${mysql.escape(mem_pk)} AND flag_status = 0;`
        const result = await db.query(query)
        return result.affectedRows === 1
    }catch (err){
        console.error("[ERROR] memberRepo.DeleteMember => " + err)
        return false
    }
}
