const db = require('../middleware/db_factory')
const mysql = require('mysql2/promise')

// 플랜 조회
exports.SelectPlans = async (plan_type) => {
    try {
        let query = `SELECT * FROM f_plan`
        if(plan_type){
            query += ` WHERE plan_type = ${mysql.escape(plan_type)}`
        }
        return await db.execute(query)
    } catch (err) {
        console.error(`[ERROR] channelRepo.SelectPlans => ${err}`)
        throw err
    }
}

// 플랜 조회
exports.SelectPlan = async (chnl_pk) => {
    try {
        const query1 = `SELECT * FROM f_plan_scheduler WHERE chnl_pk = ${mysql.escape(chnl_pk)}`
        const [subscribedInfo] = await db.execute(query1)
        if(!subscribedInfo)
            return false

        const query2 = `SELECT * FROM f_plan WHERE plan_pk = ${mysql.escape(subscribedInfo.current_plan_pk)}`

        const [current_plan] = await db.execute(query2)
        if(!current_plan)
            return false

        const query3 = `SELECT * FROM f_plan WHERE plan_pk = ${mysql.escape(subscribedInfo.scheduled_plan_pk)}`
        const scheduled_plan = await db.execute(query3)

        return {
            subscribedInfo,
            current_plan,
            scheduled_plan : scheduled_plan.length === 1 ? scheduled_plan[0] : null
        }
    } catch (err) {
        console.error(`[ERROR] channelRepo.SelectPlan => ${err}`)
        throw err
    }
}

// 플랜 신청
exports.InsertPlan = async (planInfo, additionalTime, chnl_pk) => {
    const pool = db.pool
    const conn = await pool.getConnection()
    try{
        await conn.beginTransaction()
        const query1 = `INSERT INTO f_plan_scheduler SET ?`
        const [result1] = await conn.query(query1, planInfo)
        if(result1.affectedRows !== 1){
            await conn.rollback()
            return false
        }

        // plan 시간 추가
        const query2 = `UPDATE f_channel SET stream_plan_time = TIME_TO_SEC(${mysql.escape(additionalTime)}) WHERE chnl_pk = ${mysql.escape(chnl_pk)}`
        const [result2] = await conn.query(query2)
        if(result2.affectedRows !== 1){
            await conn.rollback()
            return false
        }

        await conn.commit()
        return result1
    }catch (err){
        console.error(`[ERROR] channelRepo.InsertPlan => ${err}`)
        await conn.rollback()
        return false
    }finally {
        await conn.release()
    }
}

// 플랜 결제 정보 변경
exports.UpdatePlan = async (chnl_pk, planInfo) => {
    try{
        const query = `UPDATE f_plan_scheduler SET ? WHERE chnl_pk = ${mysql.escape(chnl_pk)}`
        const result = await db.query(query, planInfo)
        if(result.affectedRows === 1){
            return true
        }else{
            return false
        }
    }catch (err){
        console.error(`[ERROR] channelRepo.UpdatePlan => ${err}`)
        throw err
    }
}

// 채널 신청
exports.InsertChannel = async (mem_pk, chnlInfo)=>{
    const pool = db.pool
    const conn = await pool.getConnection()
    try{
        await conn.beginTransaction()
        const query1 = `INSERT INTO f_channel SET ?`
        const [result1] = await conn.query(query1, chnlInfo)
        if(!(result1 && result1.affectedRows === 1)){
            await conn.rollback()
            return false
        }

        const chnl_pk = result1.insertId
        const query2 =  `UPDATE f_members SET chnl_pk= ${mysql.escape(chnl_pk)}, user_type = 1 WHERE mem_pk = ${mysql.escape(mem_pk)};`
        const [result2] = await conn.query(query2)
        if(!(result2 && result2.affectedRows === 1)){
            await conn.rollback()
            return false
        }

        await conn.commit()
        return result1
    }catch(err){
        console.error(`[ERROR] channelRepo.InsertChannel =>${err}`)
        await conn.rollback()
        return false
    }finally {
        await conn.release()
    }
}

// 마이페이지 - 채널 정보 select
exports.SelectChannelInfo = async (chnl_pk)=>{
    try {
        const query = `SELECT fc.*, current_plan_pk, scheduled_plan_pk FROM f_channel fc
                       LEFT OUTER JOIN f_plan_scheduler fps
                       ON fps.chnl_pk = fc.chnl_pk
                       WHERE fc.chnl_pk = ${mysql.escape(chnl_pk)};`
        const [channelInfo] = await db.execute(query)
        return channelInfo
    } catch (err) {
        console.error(`[ERROR] channelRepo.SelectChannelInfo => ${err}`)
        return false
    }
}

//채널 리스트 조회
exports.SelectChannelList = async (mem_pk, sort, pageNo, keyword)=>{
    try {
        let query1 = `SELECT COUNT(fc.chnl_pk) AS rowCnt
                        FROM f_channel fc
                        INNER JOIN f_members fm
                        ON fc.chnl_pk = fm.chnl_pk
                        AND fm.flag_status = 0`
        if(keyword){
            keyword = `%${keyword}%`
            query1 += ` WHERE chnl_info LIKE ${mysql.escape(keyword)}
                        OR mem_nickname LIKE ${mysql.escape(keyword)}`
        }
        if(sort) {
            if (keyword) {
                query1 += ` AND`
            } else {
                query1 += ` WHERE`
                query1 += ` fc.category_pk = ${sort}`
            }
        }
        const [result1] = await db.execute(query1)

        // 페이지네이션
        let rowCnt = result1.rowCnt // 총 로우 개수
        pageNo = (!pageNo) ? 1 : pageNo

        const rowUnit = 8;    // 한 페이지에 표시되는 로우 수
        const pageUnit = 5;   // 밑에 나오는 페이지 수

        let pageCnt = Math.ceil(rowCnt/rowUnit)      // 총 페이지 갯수
        let bucketCnt  = Math.ceil(pageCnt/pageUnit) // 페이지유닛이 몇 세트 있는지.
        let bucketNo = Math.ceil(pageNo/pageUnit)    // 내가 몇 번째 세트에 있는지

        let startPage
        let endPage
        let currentPageCnt

        if (bucketCnt === bucketNo) {  // 내가 있는 곳이 마지막 페이지 세트면
            startPage = (bucketNo - 1) * pageUnit + 1 // 시작페이지 번호
            currentPageCnt = pageCnt - (bucketCnt - 1) * pageUnit // 현재의 페이지세트의 페이지 갯수
            endPage = (bucketNo - 1) * pageUnit + 1 + (currentPageCnt - 1) // 마지막 페이지 번호
        } else {
            startPage = (bucketNo - 1) * pageUnit + 1 // 마지막 페이지 세트가 아니면
            currentPageCnt = pageUnit // 현재 페이지 갯수
            endPage = (bucketNo - 1) * pageUnit + 1 + (currentPageCnt - 1) // 마지막 페이지 번호
        }

        let yn_next = (bucketCnt > bucketNo) ? 1 : 0 // 다음페이지가 있냐 없냐
        let yn_prev = (bucketNo > 1) ? 1 : 0 // 이전페이지가 있냐 없냐

        let startRow = ((pageNo-1)*rowUnit) + 1 // 컬럼 시작 번호

        if(rowCnt === 0){
            startRow = 1
            currentPageCnt = 0
            endPage = 1
        }

        let query2 = `SELECT mem_nickname, mem_img, chnl_info, m.chnl_pk,
                        CASE WHEN f.follow_pk IS NULL THEN 0 ELSE 1 END AS f_yn, ff.factory_img
                        FROM f_channel c
                        INNER JOIN f_members m
                        ON c.chnl_pk = m.chnl_pk
                        AND m.flag_status = 0
                        LEFT OUTER JOIN f_follow f
                        ON c.chnl_pk = f.chnl_pk
                        AND f.mem_pk = ${mysql.escape(mem_pk)}
                        LEFT OUTER JOIN f_factory_chnl_map ffcm
                        ON c.chnl_pk = ffcm.chnl_pk
                        LEFT OUTER JOIN f_factory ff
                        ON ffcm.factory_pk = ff.factory_pk`

        if(keyword){
            keyword = `%${keyword}%`
            query2 += ` WHERE c.chnl_info LIKE ${mysql.escape(keyword)}
                        OR mem_nickname LIKE ${mysql.escape(keyword)}`
        }
        if(sort)
            if(keyword) {
                query2 += ` AND`
            } else {
                query2 += ` WHERE`
            query2 += ` c.category_pk = ${sort}`
        }

        query2 += ` ORDER BY f_yn DESC`
        query2 += ` LIMIT ${startRow - 1}, ${rowUnit}`
        const result2 = await db.execute(query2)

        const result = {
            livechnl : result2,
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
    }catch (err){
        console.error("[ERROR] channelRepo.SelectChannelList => " + err)
        return false
    }
}

// 라이브 채널 -> 채널 구경하기
exports.SelectChannelVisit = async (chnl_pk, mem_pk) => {
    try{
        let result, follow

        const query1 = `SELECT count(chnl_pk) as followerNo FROM f_follow
                        WHERE chnl_pk=${mysql.escape(chnl_pk)}`
        const [followerNo] = await db.execute(query1)

        const query2 = `SELECT count(*) as liveNo
                        FROM f_live
                        WHERE chnl_pk=${mysql.escape(chnl_pk)} AND view_flag = 0;`
        const [liveNo] = await db.execute(query2)

        const query3 = `SELECT count(chnl_pk) as productNo FROM f_products
                        WHERE chnl_pk=${mysql.escape(chnl_pk)} AND view_flag = 0`
        const [productNo] = await db.execute(query3)

        const query4 = `SELECT count(*) as vodNo
                        FROM f_vod
                        WHERE chnl_pk=${mysql.escape(chnl_pk)} AND view_flag = 1`
        const [vodNo] = await db.execute(query4)

        if(mem_pk){
            const query5 = `SELECT follow_pk FROM f_follow
                            WHERE chnl_pk=${mysql.escape(chnl_pk)} AND mem_pk=${mem_pk}`

            const [state] = await db.execute(query5)

            if(state){
                follow = true
            }else{
                follow = false
            }
        }

        const query6 =  `SELECT mem_nickname ,mem_img ,chnl_info, c.chnl_pk, c.chnl_shop_url, ff.factory_img
                        FROM f_members as m
                        INNER JOIN f_channel as c ON m.chnl_pk = c.chnl_pk
                        LEFT OUTER JOIN f_factory_chnl_map ffcm
                        ON c.chnl_pk = ffcm.chnl_pk
                        LEFT OUTER JOIN f_factory ff
                        ON ffcm.factory_pk = ff.factory_pk
                        WHERE m.chnl_pk = ${mysql.escape(chnl_pk)}`

        let [info] = await db.execute(query6)
        info.chnl_shop_url = info.chnl_shop_url.split(',')

        if(mem_pk) {
            result = {
                info        : info,
                follow,
                followerNo  : followerNo.followerNo,
                productNo   : productNo.productNo,
                liveNo      : (liveNo.liveNo + vodNo.vodNo)
            }
        } else {
            result = {
                info        : info,
                followerNo  : followerNo.followerNo,
                productNo   : productNo.productNo,
                liveNo      : (liveNo.liveNo + vodNo.vodNo)
            }
        }
        return result
    } catch (err){
        console.error(`[ERROR] channelRepo.SelectChannelVisit => ${err}`)
        return false
    }
}
/**
 * 채널 관리자 - 상품
 **/

// 상품 조회
exports.SelectProductList = async (chnl_pk, sort, pageNo, keyword, mem_pk)=>{
    try{
        // 상품 개수 조회
        let query1 = ` SELECT COUNT(*) AS cnt FROM f_products WHERE chnl_pk = ${mysql.escape(chnl_pk)} AND view_flag = 0`
        if(keyword){
            keyword = `%${keyword}%`
            query1 += ` AND product_name LIKE ${mysql.escape(keyword)} `
        }
        const [result1] = await db.execute(query1)

        // 페이지네이션
        let rowCnt = result1.cnt
        pageNo = (!pageNo) ? 1 : pageNo

        const rowUnit = 10
        const pageUnit = 5

        let pageCnt = Math.ceil(rowCnt/rowUnit)
        let bucketCnt  = Math.ceil(pageCnt/pageUnit)
        let bucketNo = Math.ceil(pageNo/pageUnit)

        let startPage;
        let endPage;
        let currentPageCnt;

        if (bucketCnt === bucketNo) {
            startPage = (bucketNo - 1) * pageUnit + 1;
            currentPageCnt = pageCnt - (bucketCnt - 1) * pageUnit;
            endPage = (bucketNo - 1) * pageUnit + 1 + (currentPageCnt - 1)
        } else {
            startPage = (bucketNo - 1) * pageUnit + 1;
            currentPageCnt = pageUnit;
            endPage = (bucketNo - 1) * pageUnit + 1 + (currentPageCnt - 1)
        }

        let yn_next = (bucketCnt > bucketNo) ? 1 : 0;
        let yn_prev = (bucketNo > 1) ? 1 : 0;

        let startRow = ((pageNo-1)*rowUnit) + 1;

        if(rowCnt === 0){
            startRow = 1;
            currentPageCnt = 0;
            endPage = 1;
        }

        /* SELECT * ,
            CASE WHEN T2.wish_pk IS NULL THEN 0 ELSE 1 END AS wish_yn
            FROM f_products T1
            LEFT OUTER JOIN f_wishlist T2
            ON T1.product_pk = T2.product_pk
            AND mem_pk = 30
            WHERE chnl_pk = 48 AND view_flag = 0 */

        let query2 = `SELECT T1.product_pk, product_name, product_price, product_img, product_url`
        if(mem_pk) {
            query2 += `, CASE WHEN T2.wish_pk IS NULL THEN 0 ELSE 1 END AS wish_yn
                        FROM f_products T1
                        LEFT OUTER JOIN f_wishlist T2
                        ON T1.product_pk = T2.product_pk AND mem_pk = ${mysql.escape(mem_pk)}
                        WHERE chnl_pk = ${mysql.escape(chnl_pk)} AND view_flag = 0`
        } else {
            query2 += ` FROM f_products T1
                        WHERE chnl_pk = ${mysql.escape(chnl_pk)} AND view_flag = 0`
        }

        if(keyword){
            keyword = `%${keyword}%`
            query2 += ` AND product_name LIKE ${mysql.escape(keyword)}`
        }
        switch (sort){
            case 'EXPENSIVE':{
                query2 += ' ORDER BY product_price DESC, product_pk DESC'
                break
            }
            case 'CHEAP':{
                query2 += ' ORDER BY product_price ASC, product_pk DESC'
                break
            }
            case 'RECENT':{
                query2 += ' ORDER BY product_pk DESC'
                break
            }
            default : {
                query2 += ' ORDER BY product_pk DESC'
            }
        }
        query2 += ` LIMIT ${startRow - 1}, ${rowUnit};`

        const result2 = await db.execute(query2)
        const result = {
            products : result2,
            rowCnt:rowCnt,
            pageNo:pageNo,
            rowUnit:rowUnit,
            pageUnit:pageUnit,
            pageCnt:pageCnt,
            bucketCnt:bucketCnt,
            bucketNo:bucketNo,
            startPage:startPage,
            endPage:endPage,
            currentPageCnt:currentPageCnt,
            yn_next:yn_next,
            yn_prev:yn_prev,
            startRow:startRow
        }
        return result
    }catch (err) {
        console.error(`[ERROR] channelRepo.SelectProductList => ${err}`)
        return false
    }
}

// 상품 전체 조회
exports.SelectProducts = async (chnl_pk)=>{
    try{
        const query = `SELECT product_pk, product_name FROM f_products WHERE chnl_pk = ${mysql.escape(chnl_pk)}
                    AND view_flag = 0`
        return await db.execute(query)
    }catch(err){
        console.error(`[ERROR] channelRepo.SelectProducts => ${err}`)
        return false
    }
}

//  상품 1개 조회
exports.SelectProduct = async (product_pk)=>{
    try{
        const query = `SELECT * FROM f_products WHERE product_pk = ${mysql.escape(product_pk)}`
        return await db.execute(query)
    }catch(err){
        console.error(`[ERROR] channelRepo.SelectProduct => ${err}`)
        return false
    }
}

// 상품 + 옵션 조회
exports.SelectProductOptions = async (product_pk)=>{
    try{
        const query = `SELECT fp.product_pk, product_name, product_price, product_discount_rate, product_url, product_img, IFNULL(fpo.option_title_idx,0) AS option_title_idx, option_pk, option_title, option_name, option_price
                          FROM f_products fp
                          LEFT OUTER JOIN f_product_options fpo
                          ON fpo.product_pk = fp.product_pk
                          AND fpo.view_flag = 0
                          WHERE fp.product_pk = ${mysql.escape(product_pk)}
                          ORDER BY option_title_idx ASC, option_pk ASC`
        return await db.execute(query)
    }catch(err){
        console.error(`[ERROR] channelRepo.SelectProductInfo => ${err}`)
        return false
    }
}

// 상품 등록
exports.InsertProduct = async  (info, option)=>{
    const pool = db.pool
    const conn = await pool.getConnection()
    try{
        await conn.beginTransaction()

        const query1 = `INSERT INTO f_products SET ?`
        const query2 = `INSERT INTO f_product_options SET ?`

        const [product] = await conn.query(query1, info)

        if(product && product.affectedRows === 1){
            const product_pk = product.insertId

            for(let i = 0; i < option.length; i++){
                option[i].product_pk = product_pk
                const [result] = await conn.query(query2, option[i])
                if(!(result && result.affectedRows === 1)){
                    await conn.rollback()
                    return false
                }
            }
            await conn.commit()
            return product
        } else{
            await conn.rollback()
            return false
        }
    }catch(err){
        console.error(`[ERROR] channelRepo.InsertProduct => ${err}`)
        await conn.rollback()
        return false
    }finally {
        await conn.release()
    }
}

// 상품 수정
exports.UpdateProduct = async  (product_pk, info, option, remove)=>{
    const pool = db.pool
    const conn = await pool.getConnection()
    try{
        await conn.beginTransaction()
        const query1 = `UPDATE f_products SET ? WHERE product_pk = ${mysql.escape(product_pk)}`
        const [product] = await conn.query(query1, info)

        if(product && product.affectedRows === 1){
            for(let i = 0; i < option.length; i++){
                option[i].product_pk = product_pk
                const query2 = `INSERT INTO f_product_options SET ?
                                ON DUPLICATE KEY UPDATE option_title=${mysql.escape(option[i].option_title)}, option_name=${mysql.escape(option[i].option_name)}, option_price=${mysql.escape(option[i].option_price)}`
                const [result2] = await conn.query(query2, option[i])
                if(!(result2 && result2.affectedRows === 1)){
                    await conn.rollback()
                    return false
                }
            }

            for(let i = 0; i < remove.length; i++){
                const query3 = `UPDATE f_product_options SET view_flag = 1 WHERE option_pk = ${mysql.escape(remove[i])};`
                await conn.query(query3)
            }
            await conn.commit()
            return true
        }else{
            await conn.rollback()
            return false
        }
    }catch(err){
        console.error(`[ERROR] channelRepo.UpdateProduct => ${err}`)
        await conn.rollback()
        return false
    }finally {
        await conn.release()
    }
}

// 상품 삭제
exports.DeleteProduct = async (product_pk)=>{
    try{
        const query = `UPDATE f_products SET view_flag = 1 WHERE product_pk = ${mysql.escape(product_pk)}`
        const result = await db.query(query)
        if(result && result.affectedRows === 1){
            return true
        } else {
            return false
        }
    }catch (err){
        console.error(`[ERROR] channelRepo.DeleteProduct => ${err}`)
        return false
    }
}

// 후기 등록
exports.InsertReview = async (info) => {
    try {
        const query = `INSERT INTO f_review SET ?`
        const result = await db.query(query, info)
        if(result && result.affectedRows === 1){
            return true
        } else {
            return false
        }
    }catch (err){
        console.error(`[ERROR] channelRepo.InsertReview => ${err}`)
        return false
    }
}

// 후기 조회
exports.SelectReviewList = async (mem_pk, pageNo, product_pk , sort) => {
    try {
        let query1 = `SELECT COUNT(*) AS cnt FROM f_review
                      WHERE product_pk=${mysql.escape(product_pk)}`
        const [result1] = await db.execute(query1)

        let query2 = `SELECT ROUND(AVG(review_star),1) AS starAvg FROM f_review
                      WHERE product_pk=${mysql.escape(product_pk)}`
        const [starAvg] = await db.query(query2)

        // 페이지네이션
        let rowCnt = result1.cnt
        pageNo = (!pageNo) ? 1 : pageNo
        let rowUnit = 10
        let pageUnit = 5

        let pageCnt = Math.ceil(rowCnt/rowUnit)
        let bucketCnt  = Math.ceil(pageCnt/pageUnit)
        let bucketNo = Math.ceil(pageNo/pageUnit)

        let startPage;
        let endPage;
        let currentPageCnt;

        if (bucketCnt === bucketNo) {
            startPage = (bucketNo - 1) * pageUnit + 1;
            currentPageCnt = pageCnt - (bucketCnt - 1) * pageUnit;
            endPage = (bucketNo - 1) * pageUnit + 1 + (currentPageCnt - 1)
        } else {
            startPage = (bucketNo - 1) * pageUnit + 1;
            currentPageCnt = pageUnit;
            endPage = (bucketNo - 1) * pageUnit + 1 + (currentPageCnt - 1)
        }

        let yn_next = (bucketCnt > bucketNo) ? 1 : 0;
        let yn_prev = (bucketNo > 1) ? 1 : 0;

        let startRow = ((pageNo-1)*rowUnit) + 1;

        if(rowCnt === 0){
            startRow = 1;
            currentPageCnt = 0;
            endPage = 1;
        }

        let query3 = `SELECT product_price, product_name , product_img, chnl_pk
                      FROM f_products
                      WHERE product_pk=${mysql.escape(product_pk)}`
        const [productInfo] = await db.execute(query3)

        let query4
        if(mem_pk){
            query4 = ` SELECT mem_img, mem_nickname, review_img, fr.mem_pk, review_star, review_contents, IFNULL(frl.cnt,0) AS likeNo, fr.review_pk,
                        CASE WHEN frl2.like_pk IS NULL THEN 0 ELSE 1 END AS like_yn
                        FROM f_review fr
                        INNER JOIN f_members fm
                        ON fr.mem_pk = fm.mem_pk
                        LEFT OUTER JOIN (
                            SELECT review_pk ,COUNT(review_pk) AS cnt FROM f_review_like GROUP BY review_pk
                        ) frl
                        ON frl.review_pk = fr.review_pk
                        LEFT OUTER JOIN (
                            SELECT like_pk, review_pk FROM f_review_like frl WHERE frl.mem_pk = ${mysql.escape(mem_pk)}
                        )frl2
                        ON frl2.review_pk = fr.review_pk
                        WHERE fr.product_pk=${mysql.escape(product_pk)} `
        } else {
            query4 = `SELECT mem_img, mem_nickname, review_img, fr.mem_pk, review_star, review_contents, IFNULL(frl.cnt,0) AS likeNo, fr.review_pk
                      FROM f_review fr
                      INNER JOIN f_members fm
                      ON fr.mem_pk = fm.mem_pk
                      LEFT OUTER JOIN (
                          SELECT review_pk ,COUNT(review_pk) AS cnt FROM f_review_like GROUP BY review_pk
                      ) frl
                      ON frl.review_pk = fr.review_pk
                      WHERE fr.product_pk=${mysql.escape(product_pk)}`
        }

        switch (sort){
            case 'RECOMMEND':{
                query4 += ' ORDER BY likeNo DESC'
                break
            }
            case 'RECENT':{
                query4 += ' ORDER BY review_pk DESC'
                break
            }
            case 'STAR':{
                query4 += ' ORDER BY review_star DESC'
            }
        }
        query4 += ` LIMIT ${startRow - 1}, ${rowUnit}`
        const result4 = await db.execute(query4)

        const result = {
            review : result4,
            productInfo : productInfo,
            starAvg : starAvg.starAvg,
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
    } catch(err){
        console.error(`[ERROR] channelRepo.SelectReviewList => ${err}`)
        return false
    }
}

// 고객 관리 - 후기 조회
exports.SelectCustomerReview = async (chnl_pk, pageNo) => {
    try{
        const query1 = `SELECT COUNT(fr.review_pk) AS cnt
                        FROM f_products fp
                        INNER JOIN f_review fr
                        ON fp.product_pk = fr.product_pk
                        WHERE fp.chnl_pk=${mysql.escape(chnl_pk)}`

        const [result1] = await db.execute(query1)

        // 페이지네이션
        let rowCnt = result1.cnt
        pageNo = (!pageNo) ? 1 : pageNo
        let rowUnit = 10
        let pageUnit = 5

        let pageCnt = Math.ceil(rowCnt/rowUnit)
        let bucketCnt  = Math.ceil(pageCnt/pageUnit)
        let bucketNo = Math.ceil(pageNo/pageUnit)

        let startPage;
        let endPage;
        let currentPageCnt;

        if (bucketCnt === bucketNo) {
            startPage = (bucketNo - 1) * pageUnit + 1;
            currentPageCnt = pageCnt - (bucketCnt - 1) * pageUnit;
            endPage = (bucketNo - 1) * pageUnit + 1 + (currentPageCnt - 1)
        } else {
            startPage = (bucketNo - 1) * pageUnit + 1;
            currentPageCnt = pageUnit;
            endPage = (bucketNo - 1) * pageUnit + 1 + (currentPageCnt - 1)
        }

        let yn_next = (bucketCnt > bucketNo) ? 1 : 0;
        let yn_prev = (bucketNo > 1) ? 1 : 0;

        let startRow = ((pageNo-1)*rowUnit) + 1;

        if(rowCnt === 0){
            startRow = 1;
            currentPageCnt = 0;
            endPage = 1;
        }

        let query2 = `SELECT product_name, fp.product_pk, fp.chnl_pk , fr.review_pk, IFNULL(ST.cnt, 0) AS likeCnt , DATE_FORMAT(create_time,'%Y-%m-%d') AS create_time
                      FROM f_review fr
                      LEFT OUTER JOIN ( SELECT review_pk , COUNT(review_pk) AS cnt
                                        FROM f_review_like
                                        GROUP BY review_pk) ST
                      ON fr.review_pk = ST.review_pk
                      INNER JOIN f_products fp
                      ON fr.product_pk = fp.product_pk
                      WHERE chnl_pk = ${chnl_pk}
                      ORDER BY fr.review_pk DESC`

        query2 += ` LIMIT ${startRow - 1}, ${rowUnit}`

        const result2 = await db.execute(query2)

        const result = {
            review : result2,
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
        console.error(`[ERROR] channelRepo.SelectCustomerReview => ${err}`)
        return false
    }
}

// 후기 조회
exports.SelectReview = async (review_pk) => {
    try{
        const query = `SELECT mem_img, mem_nickname, review_img, fr.mem_pk, review_star, review_contents, review_pk, DATE_FORMAT(create_time,'%Y-%m-%d') AS create_time, product_name
                   FROM f_review fr
                   INNER JOIN f_members fm
                   ON fr.mem_pk = fm.mem_pk
                   INNER JOIN f_products fp
                   ON fp.product_pk = fr.product_pk
                   WHERE fr.review_pk = ${mysql.escape(review_pk)}`
        const [result] = await db.execute(query)
        return result
    }catch (err){
        console.error(`[ERROR] channelRepo.SelectReview => ${err}`)
        return false
    }
}

// 문의 등록
exports.InsertInquiry = async (info) => {
    try {
        const query = `INSERT INTO f_inquiry SET ?`
        const result = await db.query(query, info)
        if(result && result.affectedRows === 1){
            return true
        } else {
            return false
        }
    }catch (err){
        console.error(`[ERROR] channelRepo.InsertInquiry => ${err}`)
        return false
    }
}

// 상품 문의 조회
exports.SelectInquiryList = async (product_pk , pageNo) => {
    try{
        const query1 = `SELECT COUNT(inquiry_pk) AS cnt FROM f_inquiry
                        WHERE product_pk = ${mysql.escape(product_pk)}`

        const [result1] = await db.execute(query1)

        // 페이지네이션
        let rowCnt = result1.cnt
        pageNo = (!pageNo) ? 1 : pageNo
        let rowUnit = 10
        let pageUnit = 5

        let pageCnt = Math.ceil(rowCnt/rowUnit)
        let bucketCnt  = Math.ceil(pageCnt/pageUnit)
        let bucketNo = Math.ceil(pageNo/pageUnit)

        let startPage;
        let endPage;
        let currentPageCnt;

        if (bucketCnt === bucketNo) {
            startPage = (bucketNo - 1) * pageUnit + 1;
            currentPageCnt = pageCnt - (bucketCnt - 1) * pageUnit;
            endPage = (bucketNo - 1) * pageUnit + 1 + (currentPageCnt - 1)
        } else {
            startPage = (bucketNo - 1) * pageUnit + 1;
            currentPageCnt = pageUnit;
            endPage = (bucketNo - 1) * pageUnit + 1 + (currentPageCnt - 1)
        }

        let yn_next = (bucketCnt > bucketNo) ? 1 : 0;
        let yn_prev = (bucketNo > 1) ? 1 : 0;

        let startRow = ((pageNo-1)*rowUnit) + 1;

        if(rowCnt === 0){
            startRow = 1;
            currentPageCnt = 0;
            endPage = 1;
        }

        const query2 = `SELECT inquiry_pk, inquiry_contents, product_name, fm.mem_nickname, DATE_FORMAT(inq_create_time,'%Y-%m-%d') AS inq_create_time,
                        DATE_FORMAT(res_create_time,'%Y-%m-%d') AS res_create_time, response_contents , cm.mem_nickname AS chnl_mem_nickname
                        FROM f_inquiry fi
                        INNER JOIN f_products fp
                        ON fi.product_pk = fp.product_pk
                        INNER JOIN f_channel fc
                        ON fc.chnl_pk = fp.chnl_pk
                        INNER JOIN f_members cm
                        ON cm.chnl_pk = fc.chnl_pk
                        INNER JOIN f_members fm
                        ON fi.mem_pk = fm.mem_pk
                        WHERE fi.product_pk = ${mysql.escape(product_pk)}
                        ORDER BY inquiry_pk DESC
                        LIMIT ${startRow - 1}, ${rowUnit}`

        const result2 = await db.execute(query2)

        let query3 = `SELECT product_price, product_name , product_img, chnl_pk
                      FROM f_products
                      WHERE product_pk=${mysql.escape(product_pk)}`
        const [productInfo] = await db.execute(query3)

        const result = {
            inquiry : result2,
            productInfo : productInfo,
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
    }catch(err){
        console.error(`[ERROR] channelRepo.SelectInquiryList => ${err}`)
        return false
    }
}

// 문의
exports.SelectCustomerInquiry = async (chnl_pk, pageNo) => {
    try{
        const query1 = `SELECT COUNT(inquiry_pk) AS cnt FROM f_inquiry fi
                        INNER JOIN f_products fp
                        ON fi.product_pk = fp.product_pk
                        WHERE fp.chnl_pk=${mysql.escape(chnl_pk)}`
        const [result1] = await db.execute(query1)

        // 페이지네이션
        let rowCnt = result1.cnt
        pageNo = (!pageNo) ? 1 : pageNo
        let rowUnit = 10
        let pageUnit = 5

        let pageCnt = Math.ceil(rowCnt/rowUnit)
        let bucketCnt  = Math.ceil(pageCnt/pageUnit)
        let bucketNo = Math.ceil(pageNo/pageUnit)

        let startPage;
        let endPage;
        let currentPageCnt;

        if (bucketCnt === bucketNo) {
            startPage = (bucketNo - 1) * pageUnit + 1;
            currentPageCnt = pageCnt - (bucketCnt - 1) * pageUnit;
            endPage = (bucketNo - 1) * pageUnit + 1 + (currentPageCnt - 1)
        } else {
            startPage = (bucketNo - 1) * pageUnit + 1;
            currentPageCnt = pageUnit;
            endPage = (bucketNo - 1) * pageUnit + 1 + (currentPageCnt - 1)
        }

        let yn_next = (bucketCnt > bucketNo) ? 1 : 0;
        let yn_prev = (bucketNo > 1) ? 1 : 0;

        let startRow = ((pageNo-1)*rowUnit) + 1;

        if(rowCnt === 0){
            startRow = 1;
            currentPageCnt = 0;
            endPage = 1;
        }

        let query2 = `SELECT inquiry_pk, inquiry_contents, product_name, fm.mem_nickname, DATE_FORMAT(inq_create_time,'%Y-%m-%d') AS inq_create_time,
                        DATE_FORMAT(res_create_time,'%Y-%m-%d') AS res_create_time, response_contents , cm.mem_nickname AS chnl_mem_nickname
                        FROM f_inquiry fi
                        INNER JOIN f_products fp
                        ON fi.product_pk = fp.product_pk
                        INNER JOIN f_channel fc
                        ON fc.chnl_pk = fp.chnl_pk
                        INNER JOIN f_members cm
                        ON cm.chnl_pk = fc.chnl_pk
                        INNER JOIN f_members fm
                        ON fi.mem_pk = fm.mem_pk
                        WHERE fp.chnl_pk = ${mysql.escape(chnl_pk)}
                        ORDER BY inquiry_pk DESC`
        query2 += ` LIMIT ${startRow - 1}, ${rowUnit}`
        const result2 = await db.execute(query2)

        const result = {
            inquiry : result2,
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
    }catch(err){
        console.error(`[ERROR] channelRepo.SelectCustomerInquiry => ${err}`)
        return false
    }
}

// 답변 등록
exports.UpdateInquiryAnswer = async (response_contents, inquiry_pk) => {
    const pool = db.pool
    const conn = await pool.getConnection()
    try {
        await conn.beginTransaction()
        const query1 = `UPDATE f_inquiry
                       SET response_contents = ${mysql.escape(response_contents)}
                       WHERE inquiry_pk = ${mysql.escape(inquiry_pk)}`
        const [result1] = await conn.query(query1)
        if(!(result1 && result1.affectedRows === 1)){
            await conn.rollback()
            return false
        }

        const query2 = `SELECT DATE_FORMAT(res_create_time,'%Y-%m-%d') AS res_create_time, response_contents
                        FROM f_inquiry
                        WHERE inquiry_pk = ${mysql.escape(inquiry_pk)}`
        const [answer] = await conn.execute(query2)

        await conn.commit()
        return answer[0]
    }catch (err){
        console.error(`[ERROR] channelRepo.UpdateInquiryAnswer => ${err}`)
        await conn.rollback()
        return false
    }finally {
        await conn.release()
    }
}

/*
 * 채널 관리자 - 쿠폰
 */

// 쿠폰 확인
exports.SelectCouponList = async (chnl_pk) => {
    try {
        const query = `SELECT      *
                       FROM         f_coupons fc
                       INNER JOIN   f_chnl_cp_map fccm
                       ON           fccm.coupon_pk = fc.coupon_pk
                       WHERE        fccm.chnl_pk = ${mysql.escape(chnl_pk)}
                       AND          fccm.flag_use = 0`

        return await db.execute(query)
    }catch (err){
        console.error(`[ERROR] channelRepo.SelectCouponList => ${err}`)
        return false
    }
}

// 단일/다수 쿠폰 확인
exports.SelectCouponUser = async (coupon_pk) => {
    try {
        let query = `SELECT *
                     FROM   f_coupons
                     WHERE  coupon_pk = ${mysql.escape(coupon_pk)}`

        const [result] = await db.execute(query)
        return result
    }catch (err){
        console.error(`[ERROR] channelRepo.SelectCoupon => ${err}`)
        return false
    }
}

// 내 쿠폰 등록 확인
exports.SelectCoupon = async (coupon_pk, chnl_pk) => {
    try {
        let query = `SELECT       *
                       FROM         f_chnl_cp_map fccm
                       INNER JOIN   f_coupons fc
                       ON           fccm.coupon_pk = fc.coupon_pk
                       WHERE        fccm.coupon_pk = ${coupon_pk}
                       AND          fc.flag_status != 2`

        if(chnl_pk){
            query += ` AND fccm.chnl_pk = ${chnl_pk}`
        }
        const [result] = await db.execute(query)
        return result
    }catch (err){
        console.error(`[ERROR] channelRepo.SelectCoupon => ${err}`)
        return false
    }
}

// 쿠폰 등록
exports.InsertCoupon = async (coupon_pk, chnl_pk) => {
    const pool = db.pool
    const conn = await pool.getConnection()
    try {
        await conn.beginTransaction()
        const query1 = `INSERT INTO   f_chnl_cp_map(chnl_pk, coupon_pk)
                        VALUES        (${mysql.escape(chnl_pk)}, ${mysql.escape(coupon_pk)})`
        const [result1] = await conn.query(query1)
        if(!(result1 && result1.affectedRows === 1)){
            await conn.rollback()
            return false
        }

        const query2 = `UPDATE f_coupons SET flag_status = 1 WHERE coupon_pk = ${mysql.escape(coupon_pk)}`
        const [result2] = await conn.query(query2)
        if(!(result2 && result2.affectedRows === 1)){
            await conn.rollback()
            return false
        }

        await conn.commit()
        return true
    } catch (err){
        console.error(`[ERROR] channelRepo.InsertCoupon => ${err}`)
        await conn.rollback()
        return false
    } finally {
        await conn.release()
    }
}

// 쿠폰 사용
exports.UpdateCoupon = async (chnl_pk, map_pk, coupon_time) => {
    const pool = db.pool
    const conn = await pool.getConnection()
    try {
        await conn.beginTransaction()
        const query1 = `UPDATE f_chnl_cp_map SET flag_use = 1 WHERE map_pk = ${mysql.escape(map_pk)}`
        const [result1] = await conn.query(query1)
        if(!(result1 && result1.affectedRows === 1)){
            await conn.rollback()
            return false
        }

        const query2 = `UPDATE f_channel SET stream_coupon_time = stream_coupon_time + TIME_TO_SEC(${mysql.escape(coupon_time)})
                        WHERE chnl_pk = ${mysql.escape(chnl_pk)}`
        const [result2] = await conn.query(query2)
        if(!(result2 && result2.affectedRows === 1)){
            await conn.rollback()
            return false
        }

        await conn.commit()
        return true
    }catch (err){
        console.error(`[ERROR] channelRepo.UpdateCoupon => ${err}`)
        await conn.rollback()
        return false
    }finally {
        await conn.release()
    }
}

// 상품 구매하기 클릭 시 카운트 증가
exports.UpdateClickCount = async (product_pk, mem_pk) => {
    try {
        const query = `INSERT INTO f_product_click_cnt(product_pk, mem_pk)
                            VALUES (${mysql.escape(product_pk)}, ${mysql.escape(mem_pk)})`
        const result = await db.query(query)
        if(result && result.affectedRows === 1){
            return true
        } else {
            return false
        }
    } catch (err){
        console.error(`[ERROR] channelRepo.UpdateClickCount => ${err}`)
        return false
    }
}

// 미니플레이어
exports.miniPlayer = async (secret_key) => {
    try {
        const query1 = `SELECT fc.chnl_pk, fl.live_pk, stream_application , live_title , secret_key FROM f_channel fc
                        INNER JOIN f_live fl
                        ON fc.chnl_pk = fl.chnl_pk
                        WHERE fc.secret_key = ${mysql.escape(secret_key)} AND fl.view_flag = 0`
        const live = await db.execute(query1)

        const query2 = `SELECT fl.live_pk, product_name, product_img, product_price, product_url FROM f_live_products_map flpm
                        LEFT OUTER JOIN f_live fl
                        ON flpm.live_pk = fl.live_pk
                        INNER JOIN f_products fp
                        ON fp.product_pk = flpm.product_pk
                        WHERE fl.live_pk = ${live[0].live_pk} AND fp.view_flag = 0`
        const products = await db.execute(query2)
        return { live : live[0] , products : products[0]}
    } catch (err){
        console.error(`[ERROR] channelRepo.miniPlayer => ${err}`)
        return false
    }
}

/*
 * 채널관리자 - 배송관리
 */

// 환불교환 요청 리스트
exports.SelectRefundList = async (chnl_pk, pageNo) => {
    try{
        // 상품 개수 조회
        const query1 = ` SELECT            COUNT(*) AS cnt
                       FROM              f_refund_inquiry fri
                       LEFT OUTER JOIN   f_order fo
                       ON                fri.order_pk = fo.order_pk
                       WHERE             fo.chnl_pk = ${mysql.escape(chnl_pk)}`

        const [result1] = await db.execute(query1)

        // 페이지네이션
        let rowCnt = result1.cnt
        pageNo = (!pageNo) ? 1 : pageNo

        const rowUnit = 10
        const pageUnit = 5

        let pageCnt = Math.ceil(rowCnt/rowUnit)
        let bucketCnt  = Math.ceil(pageCnt/pageUnit)
        let bucketNo = Math.ceil(pageNo/pageUnit)

        let startPage;
        let endPage;
        let currentPageCnt;

        if (bucketCnt === bucketNo) {
            startPage = (bucketNo - 1) * pageUnit + 1;
            currentPageCnt = pageCnt - (bucketCnt - 1) * pageUnit;
            endPage = (bucketNo - 1) * pageUnit + 1 + (currentPageCnt - 1)
        } else {
            startPage = (bucketNo - 1) * pageUnit + 1;
            currentPageCnt = pageUnit;
            endPage = (bucketNo - 1) * pageUnit + 1 + (currentPageCnt - 1)
        }

        let yn_next = (bucketCnt > bucketNo) ? 1 : 0;
        let yn_prev = (bucketNo > 1) ? 1 : 0;

        let startRow = ((pageNo-1)*rowUnit) + 1;

        if(rowCnt === 0){
            startRow = 1;
            currentPageCnt = 0;
            endPage = 1;
        }

        /*
            select fri.*, fo.order_number, fo.mem_pk, fm.mem_nickname, fo.reciever_zip, fo.reciever_addr, fo.receiver_addr_detail, fri.inquiry_created
            from f_refund_inquiry fri
            left outer join f_order fo
            on fri.order_pk = fo.order_pk
            inner join f_members fm
            on fm.mem_pk = fri.mem_pk
            where fo.chnl_pk = 3;
        */

        let query2 = `SELECT            fri.*,
                                        fo.order_number,
                                        fo.mem_pk,
                                        fm.mem_nickname,
                                        fo.receiver_zip,
                                        fo.receiver_addr,
                                        fo.receiver_addr_detail,
                                        fri.inquiry_created
                      FROM              f_refund_inquiry fri
                      LEFT OUTER JOIN   f_order fo
                      ON                fri.order_pk = fo.order_pk
                      INNER JOIN        f_members fm
                      ON                fm.mem_pk = fri.mem_pk
                      WHERE             fo.chnl_pk = ${mysql.escape(chnl_pk)}`

        query2 += ` LIMIT ${startRow - 1}, ${rowUnit};`

        const result2 = await db.execute(query2)
        const result = {
            inquiry : result2,
            rowCnt:rowCnt,
            pageNo:pageNo,
            rowUnit:rowUnit,
            pageUnit:pageUnit,
            pageCnt:pageCnt,
            bucketCnt:bucketCnt,
            bucketNo:bucketNo,
            startPage:startPage,
            endPage:endPage,
            currentPageCnt:currentPageCnt,
            yn_next:yn_next,
            yn_prev:yn_prev,
            startRow:startRow
        }
        return result
    }catch (err) {
        console.error(`[ERROR] channelRepo.SelectRefundList => ${err}`)
        return false
    }
}

// 환불 요청 승인
exports.UpdateRefundAgree = async (inquiry_pk) => {
    const pool = db.pool
    const conn = await pool.getConnection()
    try {
        await conn.beginTransaction()
        const query1 = `SELECT * FROM f_refund_inquiry
                        WHERE inquiry_pk = ${mysql.escape(inquiry_pk)}
                        AND inquiry_type = 1`
        const [result1] = await conn.execute(query1)
        const order_pk = result1[0].order_pk

        const query2 = `UPDATE f_order
                        SET flag_status = 2
                        WHERE order_pk = ${mysql.escape(order_pk)}`
        const [result2] = await conn.query(query2)
        if(!(result2 && result2.affectedRows === 1)){
            conn.rollback()
            return false
        }

        const query3 = `UPDATE f_refund_inquiry SET flag_status = 1
                        WHERE inquiry_pk = ${mysql.escape(inquiry_pk)}`
        const [result3] = await conn.query(query3)
        if(!(result3 && result3.affectedRows === 1)){
            conn.rollback()
            return false
        }

        await conn.commit()
        return result3
    } catch (err){
        console.error(`[ERROR] channelRepo.UpdateRefundAgree => ${err}`)
        await conn.rollback()
        return false
    } finally {
        await conn.release()
    }
}

// 교환 요청 승인
exports.UpdateExchangeAgree = async (inquiry_pk) => {
    const pool = db.pool
    const conn = await pool.getConnection()
    try {
        await conn.beginTransaction()
        const query1 = `UPDATE  f_refund_inquiry
                        SET     flag_status = 1
                        WHERE   flag_status = 0
                        AND     inquiry_pk = ${inquiry_pk}`
        const [result1] = await conn.query(query1)
        if(!(result1 && result1.affectedRows === 1)){
            conn.rollback()
            return false
        }

        const query2 = `SELECT * FROM f_refund_inquiry WHERE inquiry_pk = ${inquiry_pk}`
        const [result2] = await conn.execute(query2)

        const value = {
            order_pk    : result2[0].order_pk,
            mem_pk      : result2[0].mem_pk
        }
        const query3 = `INSERT INTO f_exchange SET ?`
        const [result3] = await conn.query(query3, value)
        if(!(result3 && result3.affectedRows === 1)){
            conn.rollback()
            return false
        }

        await conn.commit()
        return result3
    } catch (err){
        console.error(`[ERROR] channelRepo.UpdateExchangeAgree => ${err}`)
        await conn.rollback()
        return false
    } finally {
        await conn.release()
    }
}

// 요청 거절
exports.UpdateRefundReject = async (inquiry_pk) => {
    try {
        const query1 = `UPDATE  f_refund_inquiry
                        SET     flag_status = 2
                        WHERE   inquiry_pk = ${inquiry_pk}
                        AND     flag_status = 0`
        const result1 = await db.query(query1)
        if(!(result1 && result1.affectedRows === 1)){
            return false
        }

        // 거절 사유 입력 추가 필요

        return result1
    } catch (err){
        console.error(`[ERROR] channelRepo.UpdateRefundReject => ${err}`)
        return false
    }
}

// 전체 주문
exports.SelectOrderList = async (chnl_pk, pageNo) => {
    try{
        // 주문 개수 조회
        const query1 = ` SELECT     COUNT(*) AS cnt
                         FROM       f_order
                         WHERE      chnl_pk = ${mysql.escape(chnl_pk)}`

        const [result1] = await db.execute(query1)

        // 페이지네이션
        let rowCnt = result1.cnt
        pageNo = (!pageNo) ? 1 : pageNo

        const rowUnit = 10
        const pageUnit = 5

        let pageCnt = Math.ceil(rowCnt/rowUnit)
        let bucketCnt  = Math.ceil(pageCnt/pageUnit)
        let bucketNo = Math.ceil(pageNo/pageUnit)

        let startPage;
        let endPage;
        let currentPageCnt;

        if (bucketCnt === bucketNo) {
            startPage = (bucketNo - 1) * pageUnit + 1;
            currentPageCnt = pageCnt - (bucketCnt - 1) * pageUnit;
            endPage = (bucketNo - 1) * pageUnit + 1 + (currentPageCnt - 1)
        } else {
            startPage = (bucketNo - 1) * pageUnit + 1;
            currentPageCnt = pageUnit;
            endPage = (bucketNo - 1) * pageUnit + 1 + (currentPageCnt - 1)
        }

        let yn_next = (bucketCnt > bucketNo) ? 1 : 0;
        let yn_prev = (bucketNo > 1) ? 1 : 0;

        let startRow = ((pageNo-1)*rowUnit) + 1;

        if(rowCnt === 0){
            startRow = 1;
            currentPageCnt = 0;
            endPage = 1;
        }

        /*
            select fri.*, fo.order_number, fo.mem_pk, fm.mem_nickname, fo.reciever_zip, fo.reciever_addr, fo.receiver_addr_detail, fri.inquiry_created
            from f_refund_inquiry fri
            left outer join f_order fo
            on fri.order_pk = fo.order_pk
            inner join f_members fm
            on fm.mem_pk = fri.mem_pk
            where fo.chnl_pk = 3;
        */

        let query2 = `SELECT      fo.*, fm.mem_nickname
                      FROM        f_order fo
                      INNER JOIN  f_members fm
                      ON          fm.mem_pk = fo.mem_pk
                      WHERE       fo.chnl_pk = ${mysql.escape(chnl_pk)}`

        query2 += ` LIMIT ${startRow - 1}, ${rowUnit};`

        const result2 = await db.execute(query2)
        const result = {
            order : result2,
            rowCnt:rowCnt,
            pageNo:pageNo,
            rowUnit:rowUnit,
            pageUnit:pageUnit,
            pageCnt:pageCnt,
            bucketCnt:bucketCnt,
            bucketNo:bucketNo,
            startPage:startPage,
            endPage:endPage,
            currentPageCnt:currentPageCnt,
            yn_next:yn_next,
            yn_prev:yn_prev,
            startRow:startRow
        }
        return result
    }catch (err) {
        console.error(`[ERROR] channelRepo.SelectOrderList => ${err}`)
        return false
    }
}

// 운송장 입력
exports.InsertOrderWaybill = async (order_pk, waybill_number) => {
    try{
        const query = `UPDATE  f_order
                        SET     waybill_number = ${mysql.escape(waybill_number)}
                        WHERE   order_pk = ${mysql.escape(order_pk)}`

        const result = await db.query(query)
        if(!(result && result.affectedRows === 1)){
            return false
        } else {
            return true
        }
    }catch(err){
        console.error(`[ERROR] channelRepo.InsertOrderWaybill =>${err}`)
        return false
    }
}
