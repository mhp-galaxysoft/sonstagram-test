const db = require('../middleware/db_factory')
const mysql = require('mysql2/promise')

// 전체 관리자 - 유저 정보 상세 보기
exports.SelectMemberInfo = async(mem_pk) => {
    try {
        const query = `SELECT * FROM f_members WHERE mem_pk = ${mysql.escape(mem_pk)}`
        const [result] = await db.execute(query)

        return result
    } catch(err){
        console.error(`[ERROR] adminRepo.SelectMemberInfo => ${err}`)
        return false
    }
}

// 전체 관리자 - 채널 관리자 상세 보기
exports.SelectChannelInfo = async(chnl_pk) => {
    try {
        const query = ` SELECT      fc.chnl_shop_url, fc2.category_name AS chnl_category 
                        FROM        f_channel fc 
                        INNER JOIN  f_category fc2 
                        ON          fc.category_pk = fc2.category_pk 
                        WHERE       fc.chnl_pk = ${mysql.escape(chnl_pk)}`
        const [result] = await db.execute(query)
        return result
    } catch (err) {
        console.error(`[ERROR] adminRepo.SelectChannelInfo => ${err}`)
        return false
    }
}

// 유저 리스트
exports.SelectMemberList = async (pageNo, sort, keywordType, keyword, orderType) => {
    try {
        let query1 = `SELECT COUNT(*) AS cnt FROM f_members fm`

        switch (sort){
            case 'NORMAL':{
                query1 += ` WHERE user_type = 0`
                break
            }
            case 'CHANNEL-ADMIN':{
                query1 += ` WHERE user_type = 1`
                break
            }
        }
        if(keyword) {
            keyword = `%${keyword}%`
            if(!sort){
                query1 += ' WHERE'
            }else {
                query1 += ' AND '
            }
            switch (keywordType){
                case 'NICKNAME':{
                    query1 += ` mem_nickname LIKE ${mysql.escape(keyword)}`
                    break
                }
                case 'NAME':{
                    query1 += ` mem_name LIKE ${mysql.escape(keyword)}`
                    break
                }
                case 'EMAIL':{
                    query1 += ` mem_id LIKE ${mysql.escape(keyword)}`
                    break
                }
            }
        }

        const [result1] = await db.execute(query1)

        // 페이지네이션
        let rowCnt = result1.cnt
        pageNo = (!pageNo) ? 1 : pageNo

        const rowUnit = 10;
        const pageUnit = 10;

        let pageCnt = Math.ceil(rowCnt/rowUnit)
        let bucketCnt  = Math.ceil(pageCnt/pageUnit)
        let bucketNo = Math.ceil(pageNo/pageUnit)

        let startPage
        let endPage
        let currentPageCnt

        if (bucketCnt === bucketNo) {
            startPage = (bucketNo - 1) * pageUnit + 1
            currentPageCnt = pageCnt - (bucketCnt - 1) * pageUnit
            endPage = (bucketNo - 1) * pageUnit + 1 + (currentPageCnt - 1)
        } else {
            startPage = (bucketNo - 1) * pageUnit + 1
            currentPageCnt = pageUnit
            endPage = (bucketNo - 1) * pageUnit + 1 + (currentPageCnt - 1)
        }

        let yn_next = (bucketCnt > bucketNo) ? 1 : 0
        let yn_prev = (bucketNo > 1) ? 1 : 0

        let startRow = ((pageNo-1)*rowUnit) + 1

        if(rowCnt === 0){
            startRow = 1
            currentPageCnt = 0
            endPage = 1
        }
        let query2 = `SELECT mem_pk, mem_nickname, mem_name, mem_id, user_type, flag_status, DATE_FORMAT(mem_created,'%Y-%m-%d') AS mem_created 
                      FROM f_members fm`
        switch (sort){
            case 'NORMAL':{
                query2 += ' WHERE user_type = 0 '
                break
            }
            case 'CHANNEL-ADMIN':{
                query2 += ' WHERE user_type = 1 '
                break
            }
        }
        if(keyword) {
            if(!sort){
                query2 += ' WHERE'
            }else {
                query2 += ' AND '
            }
            switch (keywordType){
                case 'NICKNAME':{
                    query2 += ` mem_nickname LIKE ${mysql.escape(keyword)} `
                    break
                }
                case 'NAME':{
                    query2 += ` mem_name LIKE ${mysql.escape(keyword)} `
                    break
                }
                case 'EMAIL':{
                    query2 += ` mem_id LIKE ${mysql.escape(keyword)} `
                    break
                }
            }
        }
        switch(orderType) {
            case 'OLDEST':
                query2 += ` ORDER BY mem_created ASC`
                break
            default:
                query2 += ` ORDER BY mem_created DESC`
                break
        }
        query2 += ` LIMIT ${startRow - 1}, ${rowUnit}`

        const result2 = await db.execute(query2)

        const result = {
            member : result2,
            rowCnt: rowCnt,
            pageNo: pageNo,
            rowUnit: rowUnit,
            pageUnit: pageUnit,
            pageCnt: pageCnt,
            bucketCnt: bucketCnt,
            bucketNo: bucketNo,
            startPage: startPage,
            endPage: endPage,
            currentPageCnt: currentPageCnt,
            yn_next: yn_next,
            yn_prev: yn_prev,
            startRow: startRow
        }
        return result
    }  catch(err){
        console.error(`[ERROR] adminRepo.SelectMemberList => ${err}`)
        return false
    }
}

// 유저 탈퇴
exports.DeleteUser = async (users) => {
    try {
        let query = `UPDATE f_members SET flag_status = 1 WHERE`
        query += ` mem_pk = ${mysql.escape(users[0])}`
        for(let i = 1; i < users.length; i++){
            query += ` OR mem_pk = ${mysql.escape(users[i])}`
        }

        const result = await db.query(query)
        return result.affectedRows === users.length;
    } catch (err) {
        console.error(`[ERROR] adminRepo.DeleteUser => ${err}`)
        return false
    }
}

// 팩토리 상세 보기
exports.SelectFactoryInfo = async(factory_pk) => {
    try {
        const query = `SELECT * FROM f_factory WHERE factory_pk = ${mysql.escape(factory_pk)}`
        const [result] = await db.execute(query)
        return result
    } catch(err){
        console.error(`[ERROR] adminRepo.SelectFactoryInfo => ${err}`)
        return false
    }
}

// 팩토리 정보 수정
exports.UpdateFactoryInfo = async(factory_info) => {
    try {
        const query = `UPDATE f_factory SET ? WHERE factory_pk = ${mysql.escape(factory_info.factory_pk)}`
        const result = await db.query(query, factory_info)
        if(result && result.affectedRows === 1){
            return true
        } else {
            return false
        }
    } catch(err){
        console.error(`[ERROR] adminRepo.UpdateFactoryInfo => ${err}`)
        return false
    }
}

// 팩토리 계정 목록
exports.SelectFactoryList = async (pageNo, keywordType, keyword, orderType) => {
    try {
        let query1 = `SELECT COUNT(*) AS cnt FROM f_factory ff`

        if(keyword) {
            keyword = `%${keyword}%`

            switch(keywordType) {
                case 'NAME':
                    query1 += ` WHERE factory_name LIKE ${mysql.escape(keyword)}`
                    break
                case 'REPNAME':
                    query1 += ` WHERE factory_repname LIKE ${mysql.escape(keyword)}`
                    break
                case 'EMAIL':
                    query1 += ` WHERE factory_id LIKE ${mysql.escape(keyword)}`
                    break
                default:
                    query1 += ` WHERE factory_name LIKE ${mysql.escape(keyword)}
                                OR factory_repname LIKE ${mysql.escape(keyword)}
                                OR factory_id LIKE ${mysql.escape(keyword)}`
                    break
            }
        }

        const [result1] = await db.execute(query1)

        // 페이지네이션
        let rowCnt = result1.cnt
        pageNo = (!pageNo) ? 1 : pageNo

        const rowUnit = 10;
        const pageUnit = 10;

        let pageCnt = Math.ceil(rowCnt/rowUnit)
        let bucketCnt  = Math.ceil(pageCnt/pageUnit)
        let bucketNo = Math.ceil(pageNo/pageUnit)

        let startPage
        let endPage
        let currentPageCnt

        if (bucketCnt === bucketNo) {
            startPage = (bucketNo - 1) * pageUnit + 1
            currentPageCnt = pageCnt - (bucketCnt - 1) * pageUnit
            endPage = (bucketNo - 1) * pageUnit + 1 + (currentPageCnt - 1)
        } else {
            startPage = (bucketNo - 1) * pageUnit + 1
            currentPageCnt = pageUnit
            endPage = (bucketNo - 1) * pageUnit + 1 + (currentPageCnt - 1)
        }

        let yn_next = (bucketCnt > bucketNo) ? 1 : 0
        let yn_prev = (bucketNo > 1) ? 1 : 0

        let startRow = ((pageNo-1)*rowUnit) + 1

        if(rowCnt === 0){
            startRow = 1
            currentPageCnt = 0
            endPage = 1
        }

        let query2 = `SELECT factory_pk, factory_repname, factory_name, factory_id, flag_status, DATE_FORMAT(factory_created,'%Y-%m-%d') AS factory_created
                      FROM f_factory ff`

        if(keyword) {
            switch(keywordType) {
                case 'NAME':
                    query2 += ` WHERE factory_name LIKE ${mysql.escape(keyword)}`
                    break
                case 'REPNAME':
                    query2 += ` WHERE factory_repname LIKE ${mysql.escape(keyword)}`
                    break
                case 'EMAIL':
                    query2 += ` WHERE factory_id LIKE ${mysql.escape(keyword)}`
                    break
                default:
                    query2 += ` WHERE factory_name LIKE ${mysql.escape(keyword)}
                                        OR factory_repname LIKE ${mysql.escape(keyword)}
                                        OR factory_id LIKE ${mysql.escape(keyword)}`
                    break;
            }
        }

        switch(orderType) {
            case 'OLDEST':
                query2 += ` ORDER BY factory_created ASC`
                break
            default:
                query2 += ` ORDER BY factory_created DESC`
                break
        }

        query2 += ` LIMIT ${startRow - 1}, ${rowUnit}`

        const result2 = await db.execute(query2)

        const result = {
            factory : result2,
            rowCnt: rowCnt,
            pageNo: pageNo,
            rowUnit: rowUnit,
            pageUnit: pageUnit,
            pageCnt: pageCnt,
            bucketCnt: bucketCnt,
            bucketNo: bucketNo,
            startPage: startPage,
            endPage: endPage,
            currentPageCnt: currentPageCnt,
            yn_next: yn_next,
            yn_prev: yn_prev,
            startRow: startRow
        }
        return result
    }  catch(err){
        console.error(`[ERROR] adminRepo.SelectFactoryList => ${err}`)
        return false
    }
}

// 팩토리 관리자 계정 확인 (id, email)
 exports.SelectFactoryForId = async(factory_id, factory_email, factory_pk) => {
    try {
        let query1 = `SELECT * FROM f_members WHERE BINARY mem_id = ${mysql.escape(factory_email)}`
        let query2 = `SELECT * FROM f_factory WHERE BINARY factory_email = ${mysql.escape(factory_email)}`
        let query3 = `SELECT * FROM f_factory WHERE BINARY factory_id = ${mysql.escape(factory_id)}`

        if(factory_pk){
            query2 += ` AND factory_pk != ${mysql.escape(factory_pk)}`
            query3 += ` AND factory_pk != ${mysql.escape(factory_pk)}`
        }

        const [existEmail1] = await db.execute(query1)
        const [existEmail2] = await db.execute(query2)
        const [existId] = await db.execute(query3)

        if(existEmail1 || existEmail2){
            return 'EMAIL'
        }else if(existId){
            return 'ID'
        }
        return true
    } catch (err) {
        console.error("[ERROR] factoryRepo.SelectFactoryForId => " + err)
        return false
    }
}

// 팩토리 관리자 계정 조회
exports.SelectFactory = async(factory_pk) => {
    try {
        let query1 = `SELECT * FROM f_members WHERE BINARY mem_id = ${mysql.escape(factory_email)}`
        let query2 = `SELECT * FROM f_factory WHERE BINARY factory_id = ${mysql.escape(factory_id)} AND factory_pk != ${mysql.escape(factory_pk)}`

        const [existEmail] = await db.execute(query1)
        const [existId] = await db.execute(query2)

        if(existEmail){
            return 'EMAIL'
        }else if(existId){
            return 'ID'
        }
    } catch (err) {
        console.error("[ERROR] factoryRepo.SelectFactoryForId => " + err)
        return false
    }
}

// 팩토리 계정 생성
exports.InsertFactory = async ( factory ) => {
    try {
        const query = `INSERT INTO f_factory SET ?`
        const result = await db.query(query, factory)
        if(result && result.affectedRows === 1){
            return result
        } else {
            return false
        }
    }catch (err){
        console.error(`[ERROR] adminRepo.InsertFactory => ${err}`)
        return false
    }
}

// 팩토리 계정 중지
exports.DeleteFactory = async (factorys) => {
    try {
        let query = `UPDATE f_factory SET flag_status = 2 WHERE`
        query += ` factory_pk = ${mysql.escape(factorys[0])}`
        for(let i = 1; i < factorys.length; i++){
            query += ` OR factory_pk = ${mysql.escape(factorys[i])}`
        }
        const result = await db.query(query)
        return result.affectedRows === factorys.length;
    }catch (err){
        console.error(`[ERROR] adminRepo.DeleteFactory => ${err}`)
        return false
    }
}

// 카테고리 목록
exports.SelectCategoryList = async (pageNo, orderType) => {
    try {
        let query1 = `SELECT COUNT(category_pk) AS cnt FROM f_category`
        const [result1] = await db.execute(query1)

        // 페이지네이션
        let rowCnt = result1.cnt
        pageNo = (!pageNo) ? 1 : pageNo

        const rowUnit = 10;
        const pageUnit = 10;

        let pageCnt = Math.ceil(rowCnt/rowUnit)
        let bucketCnt  = Math.ceil(pageCnt/pageUnit)
        let bucketNo = Math.ceil(pageNo/pageUnit)

        let startPage
        let endPage
        let currentPageCnt

        if (bucketCnt === bucketNo) {
            startPage = (bucketNo - 1) * pageUnit + 1
            currentPageCnt = pageCnt - (bucketCnt - 1) * pageUnit
            endPage = (bucketNo - 1) * pageUnit + 1 + (currentPageCnt - 1)
        } else {
            startPage = (bucketNo - 1) * pageUnit + 1
            currentPageCnt = pageUnit
            endPage = (bucketNo - 1) * pageUnit + 1 + (currentPageCnt - 1)
        }

        let yn_next = (bucketCnt > bucketNo) ? 1 : 0
        let yn_prev = (bucketNo > 1) ? 1 : 0

        let startRow = ((pageNo-1)*rowUnit) + 1

        if(rowCnt === 0){
            startRow = 1
            currentPageCnt = 0
            endPage = 1
        }

        let query2 = `SELECT    fct.category_pk,
                                fct.category_name,
                                DATE_FORMAT(fct.category_created, '%Y-%m-%d') AS category_created,
                                ( SELECT COUNT(*)
                                  FROM f_channel fcnl
                                  WHERE fct.category_pk = fcnl.category_pk ) AS category_cnt
                      FROM      f_category fct
                      GROUP BY  fct.category_pk`
        switch(orderType) {
            case 'OLDEST':
                query2 += ` ORDER BY fct.category_pk ASC`
                break
            default:
                query2 += ` ORDER BY fct.category_pk DESC`
                break
        }
        query2 += ` LIMIT ${startRow - 1}, ${rowUnit}`

        const result2 = await db.execute(query2)

        const result = {
            category : result2,
            rowCnt: rowCnt,
            pageNo: pageNo,
            rowUnit: rowUnit,
            pageUnit: pageUnit,
            pageCnt: pageCnt,
            bucketCnt: bucketCnt,
            bucketNo: bucketNo,
            startPage: startPage,
            endPage: endPage,
            currentPageCnt: currentPageCnt,
            yn_next: yn_next,
            yn_prev: yn_prev,
            startRow: startRow
        }
        return result
    }  catch(err){
        console.error(`[ERROR] adminRepo.SelectCategoryList => ${err}`)
        return false
    }
}

// 전체 카테고리 정보
exports.SelectCategoryOptions = async () => {
    try {
        const query = `SELECT * FROM f_category`
        return await db.execute(query)
    } catch(err){
        console.error(`[ERROR] adminRepo.SelectCategoryOptions => ${err}`)
        return false
    }
}

// 카테고리 조회
exports.SelectCategoryCount = async (category_name) => {
    try {
        const query = `SELECT COUNT(*) AS cnt FROM f_category WHERE category_name = ${mysql.escape(category_name)}`
        const [result] = await db.execute(query)
        return result
    } catch(err){
        console.error(`[ERROR] adminRepo.SelectCategoryCount => ${err}`)
        return false
    }
}

// 카테고리 등록
exports.InsertCategory = async (category_name) => {
    try {
        const query = `INSERT INTO f_category(category_name) VALUES (${mysql.escape(category_name)})`
        const result = await db.query(query)
        if(result && result.affectedRows === 1){
            return true
        } else {
            return false
        }
    } catch(err){
        console.error(`[ERROR] adminRepo.SelectCategory => ${err}`)
        return false
    }
}

// 카테고리 수정
exports.UpdateCategory = async (category_pk, category_name) => {
    try {
        const query = `UPDATE f_category SET category_name = ${mysql.escape(category_name)} WHERE category_pk = ${category_pk}`
        const result = await db.query(query)
        if(result && result.affectedRows === 1){
            return true
        } else {
            return false
        }
    } catch(err){
        console.error(`[ERROR] adminRepo.UpdateCategory => ${err}`)
        return false
    }
}

// 카테고리 삭제
exports.DeleteCategory = async (category_pk) => {
    try {
        const query = `DELETE FROM f_category WHERE category_pk = ${mysql.escape(category_pk)}`
        const result = await db.query(query)
        if(result && result.affectedRows === 1){
            return true
        } else {
            return false
        }
    } catch(err){
        console.error(`[ERROR] adminRepo.DeleteCategory => ${err}`)
        return false
    }
}

// 쿠폰 리스트
exports.SelectCouponList = async (pageNo, orderType) => {
    try {
        let query1 = `SELECT COUNT(*) AS cnt FROM f_coupons`
        const [result1] = await db.execute(query1)

        // 페이지네이션
        let rowCnt = result1.cnt
        pageNo = (!pageNo) ? 1 : pageNo

        const rowUnit = 10;
        const pageUnit = 10;

        let pageCnt = Math.ceil(rowCnt/rowUnit)
        let bucketCnt  = Math.ceil(pageCnt/pageUnit)
        let bucketNo = Math.ceil(pageNo/pageUnit)

        let startPage
        let endPage
        let currentPageCnt

        if (bucketCnt === bucketNo) {
            startPage = (bucketNo - 1) * pageUnit + 1
            currentPageCnt = pageCnt - (bucketCnt - 1) * pageUnit
            endPage = (bucketNo - 1) * pageUnit + 1 + (currentPageCnt - 1)
        } else {
            startPage = (bucketNo - 1) * pageUnit + 1
            currentPageCnt = pageUnit
            endPage = (bucketNo - 1) * pageUnit + 1 + (currentPageCnt - 1)
        }

        let yn_next = (bucketCnt > bucketNo) ? 1 : 0
        let yn_prev = (bucketNo > 1) ? 1 : 0

        let startRow = ((pageNo-1)*rowUnit) + 1

        if(rowCnt === 0){
            startRow = 1
            currentPageCnt = 0
            endPage = 1
        }

        let query2 = `SELECT    coupon_pk,
                                coupon_name,
                                coupon_number,
                                coupon_detail,
                                coupon_time,
                                coupon_type,
                                coupon_user,
                                DATE_FORMAT(coupon_created, '%Y-%m-%d') AS coupon_created,
                                flag_status
                      FROM      f_coupons fc`

        switch(orderType) {
            case 'OLDEST':
                query2 += ` ORDER BY coupon_pk ASC`
                break
            default:
                query2 += ` ORDER BY coupon_pk DESC`
                break
        }
        query2 += ` LIMIT ${startRow - 1}, ${rowUnit}`

        const result2 = await db.execute(query2)

        const result = {
            coupon : result2,
            rowCnt: rowCnt,
            pageNo: pageNo,
            rowUnit: rowUnit,
            pageUnit: pageUnit,
            pageCnt: pageCnt,
            bucketCnt: bucketCnt,
            bucketNo: bucketNo,
            startPage: startPage,
            endPage: endPage,
            currentPageCnt: currentPageCnt,
            yn_next: yn_next,
            yn_prev: yn_prev,
            startRow: startRow
        }
        return result
    }  catch(err){
        console.error(`[ERROR] adminRepo.SelectCouponList => ${err}`)
        return false
    }
}

// 쿠폰 수 조회
exports.SelectCoupon = async (coupon_number) => {
    try {
        const query = `SELECT COUNT(*) AS cnt FROM f_coupons WHERE coupon_number = ${mysql.escape(coupon_number)} AND flag_status = 0`
        const [result] = await db.execute(query)
        return result
    } catch(err){
        console.error(`[ERROR] adminRepo.SelectCoupon => ${err}`)
        return false
    }
}

// 쿠폰 정보 조회
exports.SelectCouponExist = async (coupon_number) => {
    try {
        const query = `SELECT * FROM f_coupons WHERE coupon_number = ${mysql.escape(coupon_number)} AND flag_status != 2`
        const [result] = await db.execute(query)
        return result
    } catch(err){
        console.error(`[ERROR] adminRepo.SelectCoupon => ${err}`)
        return false
    }
}

// 쿠폰 생성
exports.InsertCoupon = async (coupons) => {
    const pool = db.pool
    const conn = await pool.getConnection()
    try {
        await conn.beginTransaction()
        for(let i=0; i<coupons.length; i++) {
            const query = `INSERT INTO f_coupons SET ?`;
            const [result] = await conn.query(query, coupons[i])
            if(!(result && result.affectedRows === 1)) {
                await conn.rollback()
                return false
            }
        }

        await conn.commit()
        return true
    } catch(err){
        console.error(`[ERROR] adminRepo.InsertCoupon => ${err}`)
        await conn.rollback()
        return false
    }finally {
        await conn.release()
    }
}

// 쿠폰 삭제
exports.DeleteCoupon = async (coupons) => {
    try {
        let query = `UPDATE f_coupons SET flag_status = 2 WHERE`
        query += ` coupon_pk = ${mysql.escape(coupons[0])}`
        for(let i = 1; i < coupons.length; i++){
            query += ` OR coupon_pk = ${mysql.escape(coupons[i])}`
        }

        const result = await db.query(query)
        return result.affectedRows === coupons.length;
    }catch (err){
        console.error(`[ERROR] adminRepo.DeleteCoupon => ${err}`)
        return false
    }
}

// 로그 리스트
exports.SelectLogList = async (pageNo, userType, keywordType, keyword, orderType) => {
    try {
        let query1 = `SELECT COUNT(*) AS cnt FROM f_logs`

        switch(userType){
            case 'NOT-EXIST': {
                query1 += ` WHERE user_type = 0`
                break
            }
            case 'NORMAL': {
                query1 += ` WHERE user_type = 1`
                break
            }
            case 'CHANNEL': {
                query1 += ` WHERE user_type = 2`
                break
            }
            case 'FACTORY': {
                query1 += ` WHERE user_type = 3`
                break
            }
        }

        if(keywordType){
            if(userType){
                query1 += ` AND`
            } else {
                query1 += ` WHERE`
            }

            switch(keywordType){
                case 'ADMIN': {
                    query1 += ` target_type = 0`
                    break
                }
                case 'LIVE': {
                    query1 += ` target_type = 1`
                    break
                }
                case 'VOD': {
                    query1 += ` target_type = 2`
                    break
                }
                case 'PRODUCT': {
                    query1 += ` target_type = 3`
                    break
                }
                case 'COUPON': {
                    query1 += ` target_type = 4`
                    break
                }
                case 'FACTORY': {
                    query1 += ` target_type = 5`
                    break
                }
                case 'PLAN': {
                    query1 += ` target_type = 6`
                    break
                }
            }
        }

        if(keyword){
            keyword = `%${keyword}%`

            if(userType || keywordType){
                query1 += ` AND user_id LIKE ${mysql.escape(keyword)}`
            }else {
                query1 += ` WHERE user_id LIKE ${mysql.escape(keyword)}`
            }
        }

        const [result1] = await db.execute(query1)

        // 페이지네이션
        let rowCnt = result1.cnt
        pageNo = (!pageNo) ? 1 : pageNo

        const rowUnit = 10;
        const pageUnit = 10;

        let pageCnt = Math.ceil(rowCnt/rowUnit)
        let bucketCnt  = Math.ceil(pageCnt/pageUnit)
        let bucketNo = Math.ceil(pageNo/pageUnit)

        let startPage
        let endPage
        let currentPageCnt

        if (bucketCnt === bucketNo) {
            startPage = (bucketNo - 1) * pageUnit + 1
            currentPageCnt = pageCnt - (bucketCnt - 1) * pageUnit
            endPage = (bucketNo - 1) * pageUnit + 1 + (currentPageCnt - 1)
        } else {
            startPage = (bucketNo - 1) * pageUnit + 1
            currentPageCnt = pageUnit
            endPage = (bucketNo - 1) * pageUnit + 1 + (currentPageCnt - 1)
        }

        let yn_next = (bucketCnt > bucketNo) ? 1 : 0
        let yn_prev = (bucketNo > 1) ? 1 : 0

        let startRow = ((pageNo-1)*rowUnit) + 1

        if(rowCnt === 0){
            startRow = 1
            currentPageCnt = 0
            endPage = 1
        }

        let query2 = `SELECT    DATE_FORMAT(log_created, '%Y-%m-%d %T') AS log_created,
                                log_router,
                                user_type,
                                user_ip,
                                user_pk,
                                user_id,
                                target_type,
                                target_pk,
                                action_type,
                                log_msg
                       FROM f_logs`

        switch(userType){
            case 'NOT-EXIST': {
                query2 += ` WHERE user_type = 0`
                break
            }
            case 'NORMAL': {
                query2 += ` WHERE user_type = 1`
                break
            }
            case 'CHANNEL': {
                query2 += ` WHERE user_type = 2`
                break
            }
            case 'FACTORY': {
                query2 += ` WHERE user_type = 3`
                break
            }
        }

        if(keywordType){
            if(userType){
                query2 += ` AND`
            } else {
                query2 += ` WHERE`
            }

            switch(keywordType){
                case 'ADMIN': {
                    query2 += ` target_type = 0`
                    break
                }
                case 'LIVE': {
                    query2 += ` target_type = 1`
                    break
                }
                case 'VOD': {
                    query2 += ` target_type = 2`
                    break
                }
                case 'PRODUCT': {
                    query2 += ` target_type = 3`
                    break
                }
                case 'COUPON': {
                    query2 += ` target_type = 4`
                    break
                }
                case 'FACTORY': {
                    query2 += ` target_type = 5`
                    break
                }
                case 'PLAN': {
                    query2 += ` target_type = 6`
                    break
                }
            }
        }

        if(keyword){
            keyword = `%${keyword}%`

            if(userType || keywordType){
                query2 += ` AND user_id LIKE ${mysql.escape(keyword)}`
            }else {
                query2 += ` WHERE user_id LIKE ${mysql.escape(keyword)}`
            }
        }

        switch(orderType) {
            case 'OLDEST':
                query2 += ` ORDER BY log_created ASC`
                break
            default:
                query2 += ` ORDER BY log_created DESC`
                break
        }
        query2 += ` LIMIT ${startRow - 1}, ${rowUnit}`

        const result2 = await db.execute(query2)

        const result = {
            log : result2,
            rowCnt: rowCnt,
            pageNo: pageNo,
            rowUnit: rowUnit,
            pageUnit: pageUnit,
            pageCnt: pageCnt,
            bucketCnt: bucketCnt,
            bucketNo: bucketNo,
            startPage: startPage,
            endPage: endPage,
            currentPageCnt: currentPageCnt,
            yn_next: yn_next,
            yn_prev: yn_prev,
            startRow: startRow
        }
        return result
    }  catch(err){
        console.error(`[ERROR] adminRepo.SelectLogList => ${err}`)
        return false
    }
}

// 로그 리스트
exports.SelectLogListForExcel = async (userType, keywordType, keyword, orderType) => {
    try {

        let query = ` SELECT DATE_FORMAT(log_created, '%Y-%m-%d %T') AS log_created,
                             log_router,
                             user_type,
                             user_ip,
                             user_pk,
                             user_id,
                             target_type,
                             target_pk,
                             action_type,
                             log_msg
                       FROM f_logs `

        switch(userType){
            case 'NOT-EXIST': {
                query += ` WHERE user_type = 0`
                break
            }
            case 'NORMAL': {
                query += ` WHERE user_type = 1`
                break
            }
            case 'CHANNEL': {
                query += ` WHERE user_type = 2`
                break
            }
            case 'FACTORY': {
                query += ` WHERE user_type = 3`
                break
            }
        }

        if(keywordType){
            if(userType){
                query += ` AND`
            } else {
                query += ` WHERE`
            }

            switch(keywordType){
                case 'ADMIN': {
                    query += ` target_type = 0`
                    break
                }
                case 'LIVE': {
                    query += ` target_type = 1`
                    break
                }
                case 'VOD': {
                    query += ` target_type = 2`
                    break
                }
                case 'PRODUCT': {
                    query += ` target_type = 3`
                    break
                }
                case 'COUPON': {
                    query += ` target_type = 4`
                    break
                }
                case 'FACTORY': {
                    query += ` target_type = 5`
                    break
                }
                case 'PLAN': {
                    query += ` target_type = 6`
                    break
                }
            }
        }

        if(keyword){
            keyword = `%${keyword}%`

            if(userType || keywordType){
                query += ` AND user_id LIKE ${mysql.escape(keyword)}`
            }else {
                query += ` WHERE user_id LIKE ${mysql.escape(keyword)}`
            }
        }

        switch(orderType) {
            case 'OLDEST':
                query += ` ORDER BY log_created ASC`
                break
            default:
                query += ` ORDER BY log_created DESC`
                break
        }

        return await db.execute(query)
    }  catch(err){
        console.error(`[ERROR] adminRepo.SelectLogList => ${err}`)
        return false
    }
}
