const db = require('../middleware/db_factory')
const mysql = require('mysql2/promise')

exports.ProductSearch = async (text, pageNo)=>{
    try {
        const query1 = ` SELECT COUNT(product_pk) as cnt FROM f_products
                         WHERE product_name LIKE '%${text}%' AND view_flag = 0`
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

        const query2 = ` SELECT product_img, product_name, product_price, chnl_pk FROM f_products fp WHERE
                     product_name LIKE '%${text}%' AND view_flag = 0 ORDER BY product_pk DESC LIMIT ${startRow - 1}, ${rowUnit}`

        const result2 = await db.execute(query2)

        const result = {
            products: result2,
            keyword : text,
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
        console.error(err)
    }
}

exports.ChannelSearch = async (text, pageNo) => {
    try{
        const query1 = `SELECT COUNT(fm.chnl_pk) as cnt FROM f_channel fc
                        INNER JOIN f_members fm ON fm.chnl_pk = fc.chnl_pk WHERE mem_nickname LIKE '%${text}%'`
        const [result1] = await db.execute(query1)

        // 페이지네이션
        let rowCnt = result1.cnt
        pageNo = (!pageNo) ? 1 : pageNo

        const rowUnit = 10
        const pageUnit = 5

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

        const query2 = ` SELECT fm.mem_img, fm.mem_nickname, fm.chnl_pk, chnl_info, ff.factory_img FROM f_channel fc
                         INNER JOIN f_members fm ON fm.chnl_pk = fc.chnl_pk
                         LEFT OUTER JOIN     f_factory_chnl_map ffcm
                         ON                  fc.chnl_pk = ffcm.chnl_pk
                         LEFT OUTER JOIN     f_factory ff
                         ON                  ffcm.factory_pk = ff.factory_pk
                         WHERE fm.mem_nickname LIKE '%${text}%'
                         ORDER BY chnl_pk DESC LIMIT ${startRow - 1}, ${rowUnit}`

        const result2 = await db.execute(query2)
        const result = {
            channels : result2,
            keyword : text,
            rowCnt : rowCnt,
            pageNo : pageNo,
            rowUnit : rowUnit,
            pageUnit : pageUnit,
            pageCnt : pageCnt,
            bucketCnt : bucketCnt,
            bucketNo : bucketNo,
            startPage : startPage,
            endPage : endPage,
            currentPageCnt : currentPageCnt,
            yn_next : yn_next,
            yn_prev : yn_prev,
            startRow : startRow
        }
        return result
    }catch (err) {
        console.error(`[ERROR] searchRepo.channelSearch => ${err}`)
        return false
    }
}

exports.LiveSearch = async (text, pageNo) => {
    try{
        const query1 = ` SELECT COUNT(live_pk) as cnt FROM f_live 
                         WHERE live_title LIKE '%${text}%' AND view_flag = 0`
        const [result1] = await db.execute(query1)

        // 페이지네이션
        let rowCnt = result1.cnt
        pageNo = (!pageNo) ? 1 : pageNo

        const rowUnit = 10
        const pageUnit = 5

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

        const query2 = ` SELECT live_title, live_pk, live_thumbnail FROM f_live fl WHERE
                         live_title LIKE '%${text}%' AND view_flag = 0
                         ORDER BY live_pk DESC LIMIT ${startRow - 1}, ${rowUnit}`
        const result2 = await db.execute(query2)

        const result = {
            lives : result2,
            keyword : text,
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
        console.error(`[ERROR] searchRepo.channelSearch => ${err}`)
        return false
    }
}

exports.VodSearch = async (text, pageNo) => {
    try{
        const query1 = ` SELECT COUNT(vod_pk) as cnt FROM f_vod fv
                         INNER JOIN f_live fl  
                         ON fv.live_pk = fl.live_pk 
                         WHERE live_title LIKE '%${text}%' AND fv.view_flag = 1`
        const [result1] = await db.execute(query1)

        // 페이지네이션
        let rowCnt = result1.cnt
        pageNo = (!pageNo) ? 1 : pageNo

        const rowUnit = 10
        const pageUnit = 5

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

        const query2 = ` SELECT vod_pk, live_thumbnail, live_title FROM f_vod fv 
                         INNER JOIN f_live fl
                         ON fv.live_pk = fl.live_pk
                         WHERE fl.live_title LIKE '%${text}%' AND fv.view_flag = 1
                         ORDER BY fv.live_pk DESC LIMIT ${startRow - 1}, ${rowUnit}`
        const result2 = await db.execute(query2)
        const result = {
            vod : result2,
            keyword : text,
            rowCnt : rowCnt,
            pageNo : pageNo,
            rowUnit : rowUnit,
            pageUnit : pageUnit,
            pageCnt : pageCnt,
            bucketCnt : bucketCnt,
            bucketNo : bucketNo,
            startPage : startPage,
            endPage : endPage,
            currentPageCnt : currentPageCnt,
            yn_next : yn_next,
            yn_prev : yn_prev,
            startRow : startRow
        }
        return result
    }catch (err) {
        console.error(`[ERROR] searchRepo.channelSearch => ${err}`)
        return false
    }
}
