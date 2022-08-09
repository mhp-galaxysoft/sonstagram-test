const db = require('../middleware/db_factory')
const mysql = require('mysql2/promise')

// 팩토리 관리자 정보 수정
exports.UpdateFactoryInfo = async (id, info) => {
    try {
        const query = `UPDATE f_factory SET ? WHERE factory_id = ${mysql.escape(id)}`
        const [result] = await db.query(query, info)
        if(result && result.affectedRows === 1){
            return true
        } else {
            return false
        }
    } catch (err) {
        console.error ("[ERROR] factoryRepo.UpdateFactoryInfo => " + err)
        return false
    }
}

// 팩토리 관리자 탈퇴 요청
exports.DeleteFactory = async (factory_pk) => {
    try {
        const query = `UPDATE f_factory SET flag_status = 1
                       WHERE factory_pk = ${mysql.escape(factory_pk)} AND flag_status = 0;`
        const result = await db.query(query)
        if(result && result.affectedRows === 1){
            return true
        } else {
            return false
        }
    } catch (err) {
        console.error ("[ERROR] factoryRepo.DeleteFactory => " + err)
        return false
    }
}

// 팩토리 관리자 채널 리스트
exports.SelectStatisticChannel = async (factory_pk) => {
    try {
        const query = ` SELECT ffcm.chnl_pk ,mem_img ,mem_nickname FROM f_factory ff
                        INNER JOIN f_factory_chnl_map ffcm 
                        ON ff.factory_pk = ffcm.factory_pk
                        INNER JOIN f_members fm 
                        ON ffcm.chnl_pk = fm.chnl_pk 
                        WHERE ff.factory_pk = ${mysql.escape(factory_pk)}`
        return await db.execute(query)
    }catch (err) {
        console.error ("[ERROR] factoryRepo.SelectStatisticChannel => " + err)
        return false
    }
}

// 팩토리 관리자 소속 채널 조회
exports.SelectChannelList = async (factory_pk, pageNo, keyword, category_pk)=>{
    try{
        // 소속 채널 개수 조회
        let query1 = ` SELECT COUNT(*) AS cnt FROM f_factory ff
                       LEFT OUTER JOIN f_factory_chnl_map ffcm
                       ON ff.factory_pk = ffcm.factory_pk 
                       INNER JOIN f_members fm
                       ON ffcm.chnl_pk = fm.chnl_pk 
                       WHERE ff.factory_pk = ${mysql.escape(factory_pk)} AND ff.flag_status = 0`
        if(keyword){
            keyword = `%${keyword}%`
            query1 += ` AND factory_name LIKE ${mysql.escape(keyword)} `
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

        /*

            SELECT ff.factory_pk, fc.chnl_pk, fm.mem_pk, category_pk, chnl_info, mem_nickname, mem_name, mem_img
            FROM f_factory ff
            LEFT OUTER JOIN f_factory_chnl_map ffcm
            ON ff.factory_pk = ffcm.factory_pk
            INNER JOIN f_channel fc
            ON fc.chnl_pk = ffcm.chnl_pk
            LEFT JOIN f_members fm
            ON fm.chnl_pk = fc.chnl_pk
            WHERE ff.factory_pk = ffcm.factory_pk AND fm.flag_status = 0
            ORDER BY fc.chnl_pk;

        */

        let query2 = `SELECT ff.factory_pk, fc.chnl_pk, fm.mem_pk, factory_img, category_pk, chnl_info, mem_nickname, mem_name, mem_img
                        FROM f_factory ff
                        LEFT OUTER JOIN f_factory_chnl_map ffcm
                        ON ff.factory_pk = ffcm.factory_pk
                        INNER JOIN f_channel fc
                        ON fc.chnl_pk = ffcm.chnl_pk
                        LEFT JOIN f_members fm
                        ON fm.chnl_pk = fc.chnl_pk
                        WHERE ff.factory_pk = ${mysql.escape(factory_pk)} AND fm.flag_status = 0 `

        if(keyword){
            keyword = `%${keyword}%`
            query2 += ` AND mem_nickname LIKE ${mysql.escape(keyword)}`
        }
        if(category_pk){
            query2 += ` AND fc.category_pk = ${category_pk}`
        }
        query2 += ` ORDER BY fc.chnl_pk LIMIT ${startRow - 1}, ${rowUnit}`

        const result2 = await db.execute(query2)
        const result = {
            channels : result2,
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
        console.error(`[ERROR] factoryRepo.SelectChannelList => ${err}`)
        return false
    }
}

// 통계 설정 -> 상품 설정 불러오기
exports.SelectStatisticProduct = async (channel) => {
    let result = []
    try {
        for ( let i = 0; i < channel.length; i++) {
            const query = ` SELECT mem_img, mem_nickname, product_pk, product_img, product_name , product_price, view_flag FROM f_products fp
                            RIGHT OUTER JOIN f_members fm   
                            ON fm.chnl_pk = fp.chnl_pk AND view_flag = 0
                            WHERE fm.chnl_pk = ${mysql.escape(channel[i])}`

            const product = await db.execute(query)
            result[i] = product
        }
        return { product : result }
    }catch (err){
        console.error(`[ERROR] factoryRepo.SelectStatisticProduct => ${err}`)
        return false
    }
}

exports.SelectClickCount = async (product_pk) => {
    try {
        // 날짜 입력 필요
        const query1 = `SELECT product_pk, product_name, SUM(view_cnt) AS COUNT FROM f_product_cnt
                        WHERE product_pk = ${mysql.escape(product_pk)}
                        GROUP BY product_pk`
        const result1 = await db.execute(query1)

        return { product_cnt : result1 }
    } catch (err){
        console.error(`[ERROR] factoryRepo.selectClickCount => ${err}`)
        return false
    }
}

// 팩토리 관리자 통계 기록 저장
exports.SaveStatisticInfo = async (factory_pk, products) => {
    try{
        const query = `INSERT INTO f_statistic_archive (
                            factory_pk,
                            statistic_products
                        )VALUES ( 
                            ${mysql.escape(factory_pk)},
                            ${mysql.escape(products)}
                        )
                    ON DUPLICATE KEY UPDATE statistic_products = ${mysql.escape(products)}`
        const result = await db.query(query)
        if(!(result && result.affectedRows === 1)){
            return true
        } else {
            return false
        }
    } catch (err) {
        console.error("[ERROR] factoryRepo.SaveStatisticInfo => " + err)
        return false
    }
}

// 팩토리 관리자 통계 기록 가져오기
exports.SelectStatisticInfo = async (factory_pk, startDate, lastDate) => {
    try {
        let result
        let maxCnt
        const query1 = `SELECT * FROM f_statistic_archive
                        WHERE factory_pk = ${mysql.escape(factory_pk)}`

        let [products] = await db.execute(query1)
        if(products) {
            products = products.statistic_products.split(',')

            let query2 = `SELECT fp.product_pk ,COUNT(fpcc.product_pk) as cnt , product_name  FROM f_product_click_cnt fpcc
                      RIGHT OUTER JOIN f_products fp 
                      ON fpcc.product_pk = fp.product_pk `
            if (startDate) {
                query2 += ` AND click_date BETWEEN date(${mysql.escape(startDate)}) and date(${mysql.escape(lastDate)})+1 `
            }
            query2 += `WHERE fp.product_pk = ${products} `
            for (let i = 1; i < products.length; i++) {
                query2 += ` OR fp.product_pk = ${products[i]} `
            }
            query2 += ` GROUP BY fp.product_pk`
            const result2 = await db.execute(query2)

            for (let i = 0; i < result2.length; i++) {
                if (!maxCnt) {
                    maxCnt = result2[i].cnt
                }
                if (maxCnt < result2[i].cnt) {
                    maxCnt = result2[i].cnt
                }
            }
            result = {
                products: result2,
                maxCnt: maxCnt
            }
        }else {
            result = {
                products: "",
                maxCnt: 0
            }
        }
        return result
    } catch (err) {
        console.error("[ERROR] factoryRepo.SelectStatisticInfo => " + err)
        return false
    }
}

/* 채널 추가 */
exports.InsertChannel = async (factory_pk, chnl_pk) => {
    try {
        /* 이미 등록된 유저인지 확인 */
        const query1 = `SELECT * FROM f_factory_chnl_map
                        WHERE factory_pk = ${mysql.escape(factory_pk)} AND chnl_pk = ${mysql.escape(chnl_pk)}`
        let [result1] = await db.execute(query1)
        if(result1){
            return 'ALREADY'
        }

        /* 등록된 유저가 아니라면 insert */
        const query2 = `INSERT INTO f_factory_chnl_map (factory_pk, chnl_pk)
                            VALUES (${mysql.escape(factory_pk)}, ${mysql.escape(chnl_pk)})`

        const result2 = await db.query(query2)
        if(!(result2 && result2.affectedRows === 1)){
            return false
        }

        return 'SUCCESS'
    } catch (err){
        console.error(`[ERROR] factoryRepo.insertChannel => ${err}`)
        return false
    }
}
