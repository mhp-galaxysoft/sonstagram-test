const db = require('../middleware/db_factory')
const mysql = require('mysql2/promise')

// 피드 생성
exports.CreateFeed = async (info) => {
    try {
        const query = `INSERT INTO f_feed SET ?`
        const result = await db.query(query, info)
        if(result && result.affectedRows === 1){
            return true
        } else {
            return false
        }
    } catch (err) {
        console.error("[ERROR] feedRepo.CreateFeed => " + err)
        return false
    }
}

// 피드 수정
exports.UpdateFeed = async (info, feed_pk) => {
    try{
        const query = `UPDATE f_feed SET ? WHERE feed_pk = ${mysql.escape(feed_pk)}`
        const result = await db.query(query,info)
        if(result && result.affectedRows === 1){
            return true
        } else {
            return false
        }
    }catch (err){
        console.error(`[ERROR] feedRepo.UpdateFeed => ${err}`)
        return false
    }
}

// 피드 리스트 조회
exports.SelectFeedList = async (chnl_pk, pageNo, sort, keyword) => {
    try {
        let query1 = `SELECT COUNT(feed_pk) AS rowCnt ` +
            ` FROM f_feed WHERE chnl_pk = ${mysql.escape(chnl_pk)} AND view_flag = 0 `

        if(keyword){
            keyword = `%${keyword}%`
            query1 += ` AND feed_text LIKE ${mysql.escape(keyword)} `
        }

        const [result1] = await db.execute(query1)

        // 페이지네이션
        let rowCnt = result1.rowCnt
        pageNo = (!pageNo) ? 1 : pageNo

        const rowUnit = 10;
        const pageUnit = 5;

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

        let query2 = `SELECT feed_pk,feed_text,feed_img 
                         FROM f_feed WHERE chnl_pk = ${mysql.escape(chnl_pk)} AND view_flag = 0 `

        if(keyword){
            keyword = `%${keyword}%`
            query2 += ` AND feed_text LIKE ${mysql.escape(keyword)}`
        }
        if(sort==='OLDEST'){
            query2 += ` ORDER BY feed_pk ASC`
        }else{
            query2 += ` ORDER BY feed_pk DESC`
        }

        query2 += ` LIMIT  ${(startRow - 1)}, ${rowUnit}`

        const result2 = await db.execute(query2)

        const result = {
            feeds: result2,
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
    }catch (err) {
        console.error(`[ERROR] feedRepo.SelectFeedList => ${err}`)
        return false
    }
}

// 특정 피드 조회
exports.SelectFeed = async (feed_pk)=>{
    try{
        const query = `SELECT ff.feed_pk, ff.feed_text, ff.feed_img, fm.mem_nickname, fm.mem_img, DATE_FORMAT(ff.updated_time,'%Y-%m-%d') as feed_time, ff2.factory_img
                    FROM f_feed ff
                    INNER JOIN          f_members fm
                    ON                  fm.chnl_pk = ff.chnl_pk
                    LEFT OUTER JOIN     f_factory_chnl_map ffcm
                    ON                  ff.chnl_pk = ffcm.chnl_pk
                    LEFT OUTER JOIN     f_factory ff2
                    ON                  ffcm.factory_pk = ff2.factory_pk
                    WHERE feed_pk = ${mysql.escape(feed_pk)}`
        const [result] = await db.execute(query)
        return result
    }catch(err){
        console.error(`[ERROR] feedRepo.SelectFeed => ${err}`)
        return false
    }
}

// 피드 삭제
exports.DeleteFeed = async (feed_pk)=>{
    try{
        const query = `UPDATE f_feed SET view_flag = 1 WHERE feed_pk=${mysql.escape(feed_pk)}`
        const result = await db.query(query)
        if(result && result.affectedRows === 1){
            return true
        } else {
            return false
        }
    }catch(err){
        console.error(`[ERROR] feedRepo.DeleteFeed => ${err}`)
        return false
    }
}