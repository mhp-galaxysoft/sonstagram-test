const db = require('../middleware/db_factory')
const mysql = require('mysql2/promise')

exports.SelectFollowList = async (pageNo, mem_pk) => {
    try {
        let query1 = ` SELECT COUNT(f.follow_pk) AS rowCnt FROM f_channel c
                        INNER JOIN f_members m
                        ON c.chnl_pk = m.chnl_pk
                        AND m.flag_status = 0
                        LEFT OUTER JOIN f_follow f
                        ON c.chnl_pk = f.chnl_pk 
                        AND f.mem_pk = ${mysql.escape(mem_pk)}
                        WHERE NOT f.follow_pk is NULL`
        const [result1] = await db.execute(query1)

        // 페이지네이션
        let rowCnt = result1.rowCnt // 총 로우 개수
        pageNo = (!pageNo) ? 1 : pageNo

        const rowUnit = 5;    // 한 페이지에 표시되는 로우 수
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

        let query2 = `SELECT mem_nickname,mem_img ,chnl_info, m.chnl_pk, ff.factory_img 
                      FROM f_channel c
                      INNER JOIN f_members m
                      ON c.chnl_pk = m.chnl_pk
                      AND m.flag_status = 0
                      LEFT OUTER JOIN f_follow f
                      ON c.chnl_pk = f.chnl_pk 
                      AND f.mem_pk = ${mysql.escape(mem_pk)}
                      LEFT OUTER JOIN f_factory_chnl_map ffcm
                      ON m.chnl_pk = ffcm.chnl_pk
                      LEFT OUTER JOIN f_factory ff
                      ON ffcm.factory_pk = ff.factory_pk
                      WHERE NOT f.follow_pk is NULL
                      ORDER BY f.follow_pk DESC`

        query2 += ` LIMIT ${startRow - 1}, ${rowUnit}`

        const result2 = await db.execute(query2)
        const result = {
            followChnl : result2,
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
        console.error("[ERROR] mypageRepo.SelectChannelList => " + err)
        return false
    }
}

exports.SelectWishList = async (pageNo, mem_pk) => {
    try {
        let query1 = `SELECT COUNT(wish_pk) as rowCnt
                        FROM f_products fp
                        INNER JOIN f_channel fc
                        ON fc.chnl_pk = fp.chnl_pk
                        INNER JOIN f_members fm
                        ON fm.chnl_pk = fc.chnl_pk
                        AND fm.flag_status = 0
                        INNER JOIN f_wishlist fw
                        ON fp.product_pk = fw.product_pk
                        WHERE fw.mem_pk = ${mysql.escape(mem_pk)}`
        const [result1] = await db.execute(query1)

        // 페이지네이션
        let rowCnt = result1.rowCnt // 총 로우 개수
        pageNo = (!pageNo) ? 1 : pageNo

        const rowUnit = 4;    // 한 페이지에 표시되는 로우 수
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

        let query2 = `SELECT fp.product_img, fp.product_name, fp.product_price, fp.product_url, fc.chnl_pk, fp.product_pk
                        FROM f_products fp
                        INNER JOIN f_channel fc
                        ON fc.chnl_pk = fp.chnl_pk
                        INNER JOIN f_members fm
                        ON fm.chnl_pk = fc.chnl_pk
                        AND fm.flag_status = 0
                        INNER JOIN f_wishlist fw
                        ON fp.product_pk = fw.product_pk
                        WHERE fw.mem_pk = ${mysql.escape(mem_pk)}
                        ORDER BY wish_pk DESC`
        query2 += ` LIMIT ${startRow - 1}, ${rowUnit}`

        const result2 = await db.execute(query2)
        const result = {
            wish : result2,
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
        console.error("[ERROR] mypageRepo.SelectWishList => " + err)
        return false
    }
}

// 마이페이지 - 내 후기 내역
exports.SelectMyPageReview = async (mem_pk, pageNo) => {
    try {
        let query1 = `SELECT COUNT(review_pk) AS cnt FROM f_review
                      WHERE mem_pk=${mem_pk}`

        const [result1] = await db.execute(query1)

        // 페이지네이션
        let rowCnt = result1.cnt
        pageNo = (!pageNo) ? 1 : pageNo
        let rowUnit = 10
        let pageUnit = 5

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

        let query2 = `SELECT product_name, review_img, review_contents, review_star, DATE_FORMAT(create_time,'%Y-%m-%d') as create_time
                      FROM f_review fr
                      INNER JOIN f_products fp
                      ON fr.product_pk = fp.product_pk
                      WHERE mem_pk=${mem_pk} ORDER BY review_pk DESC
                      LIMIT ${startRow - 1}, ${rowUnit}`

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
    }catch(err){
        console.error(`[ERROR] mypageRepo.SelectMyPageReview => ${err}`)
        return false
    }
}

// 마이페이지 - 내 1:1 문의
exports.SelectMyPageInquiry = async (mem_pk, pageNo) => {
    try{
        const query1 = `SELECT COUNT(inquiry_pk) AS cnt FROM f_inquiry
                        WHERE mem_pk = ${mysql.escape(mem_pk)}`
        const [result1] = await db.execute(query1)

        // 페이지네이션
        let rowCnt = result1.cnt
        pageNo = (!pageNo) ? 1 : pageNo
        let rowUnit = 10
        let pageUnit = 5

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
                        WHERE fi.mem_pk = ${mysql.escape(mem_pk)}
                        ORDER BY inquiry_pk DESC
                        LIMIT ${startRow - 1}, ${rowUnit}`
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
        console.error(`[ERROR] mypageRepo.SelectMyPageInquiry => ${err}`)
        return false
    }
}
