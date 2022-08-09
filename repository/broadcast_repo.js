const db = require('../middleware/db_factory')
const mysql = require('mysql2/promise')
const streamRepo = require('./stream_repo')

// 라이브 생성
exports.InsertLive = async (info, products) => {
    const pool = db.pool
    const conn = await pool.getConnection()
    try{
        await conn.beginTransaction()

        const query1 = `INSERT INTO f_live SET ?;`
        const [result1] = await conn.query(query1, info)

        const live_pk = result1.insertId
        for (let i in products) {
            const mappingItem = {
                live_pk,
                product_pk : products[i],
                product_order : i
            }
            const query2 = `INSERT INTO f_live_products_map SET ?`
            const [result2] = await conn.query(query2, mappingItem)
            if(!(result2 && result2.affectedRows === 1)){
                await conn.rollback()
                return false
            }
        }

        await conn.commit()
        return live_pk
    }catch(err){
        console.error(`[ERROR] broadcastRepo.InsertLive => ${err}`)
        await conn.rollback()
        return false
    }finally {
        conn.release()
    }
}

// 라이브 접속자 수 높은 리스트 조회
exports.SelectLiveListHot = async (category_pk, keyword)=>{
    /*
        SELECT live_pk, live_title, live_thumbnail, live_ccu, mem_img, mem_nickname, ff.factory_pk, ff.factory_img
        FROM f_live fl
        INNER JOIN f_members fm
        ON fl.chnl_pk = fm.chnl_pk AND view_flag = 0
        LEFT OUTER JOIN f_factory_chnl_map ffcm
        ON fl.chnl_pk = ffcm.chnl_pk
        LEFT OUTER JOIN f_factory ff
        ON ffcm.factory_pk = ff.factory_pk
        ORDER BY live_ccu DESC LIMIT 30;
    */
    try{
        let query = `SELECT live_pk, live_title, live_thumbnail, live_ccu, mem_img, mem_nickname, ff.factory_img
                    FROM f_live fl
                    INNER JOIN f_members fm
                    ON fl.chnl_pk = fm.chnl_pk AND view_flag = 0
                    LEFT OUTER JOIN f_factory_chnl_map ffcm
                    ON fl.chnl_pk = ffcm.chnl_pk
                    LEFT OUTER JOIN f_factory ff
                    ON ffcm.factory_pk = ff.factory_pk
                    INNER JOIN f_channel fc
                    ON fc.chnl_pk = fl.chnl_pk
                    AND (fc.stream_plan_time != 0 OR fc.stream_coupon_time != 0)`

        if(keyword){
            keyword = `%${keyword}%`
            query += ` WHERE fl.live_title LIKE ${mysql.escape(keyword)} `
        }

        if(category_pk){
            if(keyword){
                query += ` AND`
            } else {
                query += ` WHERE`
            }
            query += ` fc.category_pk = ${category_pk}`
        }

        query += ` ORDER BY live_ccu DESC LIMIT 30`

        return await db.execute(query)
    }catch (err){
        console.error("[ERROR] broadcastRepo.SelectLiveListHot => " + err)
    }
}

// 라이브 전체 조회
exports.SelectLiveList = async ( sort, pageNo, keyword, chnl_pk, category_pk )=>{
    try{
        // 방송중인 채널 개수 조회
        let query1 = `SELECT COUNT(*) AS cnt FROM f_live fl
                        INNER JOIN f_channel fc
                        ON fc.chnl_pk = fl.chnl_pk
                        AND (fc.stream_plan_time != 0 OR fc.stream_coupon_time != 0)
                        WHERE fl.view_flag = 0`
        if(chnl_pk){
            query1 += ` AND fl.chnl_pk = ${mysql.escape(chnl_pk)}`
        }
        if(keyword){
            keyword = `%${keyword}%`
            query1 += ` AND fl.live_title LIKE ${mysql.escape(keyword)} `
        }
        if(category_pk){
            query1 += ` AND fc.category_pk = ${category_pk}`
        }
        const [result1] = await db.execute(query1)

        // 페이지네이션
        let rowCnt = result1.cnt
        pageNo = (!pageNo) ? 1 : pageNo
        let rowUnit, pageUnit
        if(!chnl_pk){
            rowUnit = 15
            pageUnit = 5
        }else{
            rowUnit = 10
            pageUnit = 5
        }
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

        let query2 = `SELECT          live_pk, live_title, live_thumbnail, live_ccu, mem_img, mem_nickname, ff.factory_img
                      FROM            f_live fl
                      INNER JOIN      f_members fm
                      ON              fl.chnl_pk = fm.chnl_pk
                      INNER JOIN      f_channel fc
                      ON              fc.chnl_pk = fl.chnl_pk
                      AND             (fc.stream_plan_time != 0 OR fc.stream_coupon_time != 0)
                      LEFT OUTER JOIN f_factory_chnl_map ffcm
                      ON              fl.chnl_pk = ffcm.chnl_pk
                      LEFT OUTER JOIN f_factory ff
                      ON              ffcm.factory_pk = ff.factory_pk
                      WHERE           view_flag = 0`
        if(chnl_pk){
            query2 += ` AND fl.chnl_pk = ${mysql.escape(chnl_pk)}`
        }
        if(keyword){
            keyword = `%${keyword}%`
            query2 += ` AND fl.live_title LIKE ${mysql.escape(keyword)}`
        }
        if(category_pk){
            query2 += ` AND fc.category_pk = ${category_pk}`
        }

        switch (sort){
            case 'RECENT':{
                query2 += ' ORDER BY live_pk DESC'
                break
            }
            case 'OLD':{
                query2 += ' ORDER BY live_pk ASC'
                break
            }
            default : {
                query2 += ' ORDER BY live_pk DESC'
            }
        }

        query2 += ` LIMIT ${startRow - 1}, ${rowUnit};`
        const result2 = await db.execute(query2)

        const result = {
            lives : result2,
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
        console.error(`[ERROR] broadcastRepo.SelectLiveList => ${err}`)
        return false
    }
}

//  라이브 조회
exports.SelectLive = async (live_pk, mem_pk)=>{
    try{
        // 라이브 방송에서 필요한 멤버와 라이브 정보 불러오기
        const query1 = `SELECT              fl.live_pk, fl.live_title, fl.live_info, fl.live_thumbnail, fl.live_ccu, fl.live_quality, fm.mem_pk, fm.mem_img, fm.mem_nickname, fm.chnl_pk, fc.stream_application,
                                            fc.stream_plan_time + fc.stream_coupon_time AS stream_available_time, ff.factory_img, fct.category_name
                        FROM                f_live fl
                        INNER JOIN          f_channel fc
                        ON                  fc.chnl_pk = fl.chnl_pk
                        INNER JOIN          f_category fct
                        ON                  fc.category_pk = fct.category_pk
                        INNER JOIN          f_members fm 
                        ON                  fl.chnl_pk = fm.chnl_pk 
                        LEFT OUTER JOIN     f_factory_chnl_map ffcm
                        ON                  fc.chnl_pk = ffcm.chnl_pk
                        LEFT OUTER JOIN     f_factory ff
                        ON                  ffcm.factory_pk = ff.factory_pk
                        WHERE live_pk = ${mysql.escape(live_pk)} AND view_flag = 0`
        const [live] = await db.execute(query1)

        // 라이브가 없을 때 or 삭제된 라이브에 접근했을 때
        if(!live){
            return { live : null, products : null }
        }

        // 라이브 상품 목록 가져오기
        const query2 = `SELECT              fp.*,
                        CASE WHEN           fw.wish_pk IS NULL THEN 0 ELSE 1 END AS wish_yn
                        FROM                f_products fp
                        INNER JOIN          f_live_products_map flpm 
                        ON                  fp.product_pk = flpm.product_pk 
                        LEFT OUTER JOIN     f_wishlist fw
                        ON                  flpm.product_pk = fw.product_pk AND mem_pk=${mysql.escape(mem_pk)}
                        WHERE               flpm.live_pk = ${mysql.escape(live_pk)} AND fp.view_flag = 0
                        ORDER BY            flpm.product_order ASC`
        const products = await db.execute(query2)
        return {live, products}
    }catch(err){
        console.error(`[ERROR] broadcastRepo.SelectLive => ${err}`)
        return false
    }
}

// 현재 라이브가 있는지 검사
exports.SelectCurrentLive = async (chnl_pk)=>{
    try{
        const query = `SELECT live_pk
                       FROM f_live
                       WHERE chnl_pk = ${mysql.escape(chnl_pk)}
                       AND view_flag = 0`
        const [result] = await db.execute(query)
        if(result){
            return result.live_pk
        } else {
            return false
        }
    }catch (err){
        console.error(`[ERROR] broadcastRepo.SelectCurrentLive => ${err}`)
        return false
    }
}

// 라이브 상품 리스트
exports.SelectLiveProductList = async (live_pk, mem_pk)=>{
    try{
        const query = `SELECT fp.*,
                        CASE WHEN fw.wish_pk IS NULL THEN 0 ELSE 1 END AS wish_yn
                        FROM f_products fp
                        INNER JOIN f_live_products_map flpm 
                        ON fp.product_pk = flpm.product_pk 
                        LEFT OUTER JOIN f_wishlist fw
                        ON flpm.product_pk = fw.product_pk AND mem_pk=${mysql.escape(mem_pk)}
                        WHERE flpm.live_pk = ${mysql.escape(live_pk)} AND fp.view_flag = 0
                        ORDER BY flpm.product_order ASC`
        return await db.execute(query)
    }catch (err){
        console.error(`[ERROR] broadcastRepo.SelectLiveProductList => ${err}`)
        return false
    }
}

//라이브 수정
exports.UpdateLive = async (info, products, live_pk, product_no)=>{
    const pool = db.pool
    const conn = await pool.getConnection()
    try{
        await conn.beginTransaction()

        const query1 = `UPDATE f_live SET ? WHERE live_pk = ${mysql.escape(live_pk)}`
        const [result1] = await conn.query(query1, info)
        if(!(result1 && result1.affectedRows === 1)){
            await conn.rollback()
            return false
        }

        products = products[0] === '' ? [] : products
        for (let i in products) {
            const mappingItem = {
                live_pk,
                product_pk : products[i],
                product_order : i
            }
            const query2 = `INSERT INTO f_live_products_map SET ? 
                            ON DUPLICATE KEY UPDATE product_pk = ${mysql.escape(products[i])}`
            const [result2] = await conn.query(query2, mappingItem)
            if(!(result2 && result2.affectedRows >= 1)){
                await conn.rollback()
                return false
            }
        }

        if(product_no > products.length){ //삭제한 아이템이 있으면
            for(let i = products.length; i < product_no; i++){
                const query3 = `DELETE FROM f_live_products_map 
                                WHERE product_order=${i} AND live_pk = ${mysql.escape(live_pk)}`
                const [result3] = await conn.query(query3)
                if(!(result3 && result3.affectedRows >= 1)){
                    await conn.rollback()
                    return false
                }
            }
        }

        await conn.commit()
        return true
    }catch(err){
        console.error(`[ERROR] broadcastRepo.UpdateLive => ${err}`)
        await conn.rollback()
        return false
    }finally {
        conn.release()
    }
}

//라이브 종료
exports.DeleteLive = async (chnl_pk, live_pk, applicationName)=>{
    const pool = db.pool
    const conn = await pool.getConnection()
    try{
        await conn.beginTransaction()

        const query1 = `UPDATE f_live SET view_flag = 1 WHERE live_pk = ${mysql.escape(live_pk)}`
        const [result1] = await conn.query(query1)
        if(!(result1 && result1.affectedRows === 1)){
            await conn.rollback()
        }

        const vodList = await streamRepo.SelectVodList(applicationName)
            // vod 리스트를 반환하긴 함
            // 스트림 레포는 와우자랑 연결 -> url이 같이 있음
            // dvrconvertstoresummery -> vod 리스트 (정렬 x)
            // 그래서 따로 정렬해줘야해~~~
        if(vodList){
            for(let i = 0; i < vodList.length ; i++){
                const vod_length = await streamRepo.SelectVod(applicationName, vodList[i].name)
                const vod_version = vodList[i].name.substring(12,)
                const query2 = `INSERT INTO f_vod(chnl_pk, vod_version, live_pk, vod_length) 
                            VALUES (${mysql.escape(chnl_pk)}, ${mysql.escape(vod_version)}, ${mysql.escape(live_pk)}, ${mysql.escape(vod_length)})
                            ON DUPLICATE KEY 
                            UPDATE vod_length = ${mysql.escape(vod_length)}`
                await conn.query(query2)
            }
        }

        await conn.commit()
        return true
    }catch(err){
        console.error("[ERROR] broadcastRepo.DeleteLive => " + err)
        await conn.rollback()
        return false
    }finally {
        conn.release()
    }
}

// 라이브 - 채팅 입력
exports.CreateChat = async (chat)=>{
    try{
        const query = `INSERT INTO f_chat SET ?`
        await db.query(query,chat)
        return true
    }catch (err){
        console.error("[ERROR] broadcastRepo.CreateChat => " + err)
        return false
    }
}

//라이브 - 채팅 조회
exports.SelectChats = async (room_pk)=>{
    try{
        const query = `SELECT fc.chat_contents, fm.mem_pk, fm.mem_img, fm.mem_nickname FROM f_chat fc 
                    LEFT OUTER JOIN f_members fm 
                    ON fc.chat_user = fm.mem_pk
                    WHERE room_pk = ${mysql.escape(room_pk)} AND DATE_FORMAT(chat_created,'%Y-%m-%d') = CURDATE() ORDER BY chat_pk ASC`
        return await db.execute(query)
    }catch (err){
        console.error("[ERROR] broadcastRepo.SelectChats => " + err)
        return false
    }
}

// 라이브 - 동시 접속자 수 증가
exports.UpdateLiveCcuAdd = async (room_pk)=>{
    const pool = db.pool
    const conn = await pool.getConnection()
    try{
        await conn.beginTransaction()

        const query1 = `UPDATE f_live SET live_ccu = live_ccu + 1 WHERE live_pk = ${mysql.escape(room_pk)}`
        const [result1] = await conn.query(query1)
        if(!(result1 && result1.affectedRows === 1)){
            await conn.rollback()
        }

        const query2 = `SELECT live_ccu FROM f_live WHERE live_pk = ${mysql.escape(room_pk)}`
        const [result] = await conn.execute(query2)

        await conn.commit()
        return result[0].live_ccu
    }catch(err){
        console.error(`[ERROR] broadcastRepo.UpdateLiveCcuAdd => ${err}`)
        await conn.rollback()
        return false
    }finally {
        conn.release()
    }
}

// 라이브 - 동시 접속자 수 감소
exports.UpdateLiveCcuSub = async (room_pk)=>{
    const pool = db.pool
    const conn = await pool.getConnection()
    try{
        await conn.beginTransaction()

        const query1 = `UPDATE f_live SET live_ccu = live_ccu - 1 WHERE live_pk = ${mysql.escape(room_pk)}`
        const [result1] = await conn.query(query1)
        if(!(result1 && result1.affectedRows === 1)){
            await conn.rollback()
        }

        const query2 = `SELECT live_ccu FROM f_live WHERE live_pk = ${mysql.escape(room_pk)}`
        const [result] = await conn.execute(query2)

        await conn.commit()
        return result[0].live_ccu
    }catch(err){
        console.error(`[ERROR] broadcastRepo.UpdateLiveCcuSub => ${err}`)
        await conn.rollback()
        return false
    }finally {
        conn.release()
    }
}

// vod 전체 조회
exports.SelectVodList = async ( sort, pageNo, keyword, chnl_pk, category_pk, view_flag )=>{
    try{
        // VOD 개수 조회
        let query1 = `  SELECT          COUNT(*) AS  cnt
                        FROM            f_vod fv
                        INNER JOIN      f_live fl
                        ON              fl.live_pk = fv.live_pk
                        INNER JOIN      f_channel fc
                        ON              fc.chnl_pk = fv.chnl_pk
                        INNER JOIN      f_category fct
                        ON              fc.category_pk = fct.category_pk
                        INNER JOIN      f_members fm
                        ON              fm.chnl_pk = fc.chnl_pk
                        LEFT OUTER JOIN f_factory_chnl_map ffcm
                        ON              fl.chnl_pk = ffcm.chnl_pk
                        LEFT OUTER JOIN f_factory ff
                        ON              ffcm.factory_pk = ff.factory_pk
                        WHERE           fv.view_flag = ${mysql.escape(view_flag)}
                        AND             fm.flag_status = 0`
        if(chnl_pk){
            query1 += ` AND fv.chnl_pk = ${mysql.escape(chnl_pk)}`
        }
        if(keyword){
            keyword = `%${keyword}%`
            query1 += ` AND fl.live_title LIKE ${mysql.escape(keyword)} `
        }
        if(category_pk) {
            query1 += ` AND fc.category_pk = ${mysql.escape(category_pk)}`
        }
        const [result1] = await db.execute(query1)

        // 페이지네이션
        let rowCnt = result1.cnt
        pageNo = (!pageNo) ? 1 : pageNo
        let rowUnit, pageUnit
        if(!chnl_pk){
            rowUnit = 15
            pageUnit = 5
        }else{
            rowUnit = 10
            pageUnit = 5
        }
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

        let query2 = `  SELECT          fv.vod_pk, fv.vod_version, fv.vod_length, fv.vod_viewer, fl.live_pk, fl.live_title, fl.live_thumbnail, 
                                        DATE_FORMAT(fl.live_created,'%Y. %m. %d') AS live_created, fc.stream_application, fm.mem_nickname, fm.mem_img, ff.factory_img, fct.category_name
                        FROM            f_vod fv
                        INNER JOIN      f_live fl
                        ON              fl.live_pk = fv.live_pk
                        INNER JOIN      f_channel fc
                        ON              fc.chnl_pk = fv.chnl_pk
                        INNER JOIN      f_category fct
                        ON              fc.category_pk = fct.category_pk
                        INNER JOIN      f_members fm 
                        ON              fm.chnl_pk = fc.chnl_pk 
                        LEFT OUTER JOIN f_factory_chnl_map ffcm
                        ON              fl.chnl_pk = ffcm.chnl_pk
                        LEFT OUTER JOIN f_factory ff
                        ON              ffcm.factory_pk = ff.factory_pk
                        WHERE           fv.view_flag = ${mysql.escape(view_flag)}
                        AND             fm.flag_status = 0`
        if(chnl_pk){
            query2 += ` AND fv.chnl_pk = ${mysql.escape(chnl_pk)}`
        }
        if(keyword){
            keyword = `%${keyword}%`
            query2 += ` AND fl.live_title LIKE ${mysql.escape(keyword)}`
        }
        if(category_pk) {
            query2 += ` AND fc.category_pk = ${mysql.escape(category_pk)}`
        }
        switch (sort){
            case 'RECENT':{
                query2 += ' ORDER BY fv.vod_pk DESC'
                break
            }
            case 'OLD':{
                query2 += ' ORDER BY fv.vod_pk ASC'
                break
            }
            default : {
                query2 += ' ORDER BY fv.vod_pk DESC'
            }
        }
        query2 += ` LIMIT ${startRow - 1}, ${rowUnit};`
        const result2 = await db.execute(query2)

        const result = {
            vods : result2,
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
        console.error(`[ERROR] broadcastRepo.SelectVodList => ${err}`)
        return false
    }
}

exports.SelectVod = async (vod_pk, mem_pk)=>{
    const pool = db.pool
    const conn = await pool.getConnection()
    try{
        await conn.beginTransaction()

        const query1 = `SELECT              fv.vod_pk, fv.vod_version, fl.live_pk, fl.live_quality, fl.live_title, fl.live_info, fl.live_thumbnail, fm.mem_img, fm.mem_nickname, fm.chnl_pk, fc.stream_application, ff.factory_img, fct.category_name
                        FROM                f_vod fv
                        INNER JOIN          f_live fl
                        ON                  fv.live_pk = fl.live_pk
                        INNER JOIN          f_channel fc
                        ON                  fc.chnl_pk = fl.chnl_pk
                        INNER JOIN          f_category fct
                        ON                  fc.category_pk = fct.category_pk
                        INNER JOIN          f_members fm 
                        ON                  fl.chnl_pk = fm.chnl_pk
                        LEFT OUTER JOIN     f_factory_chnl_map ffcm
                        ON                  fc.chnl_pk = ffcm.chnl_pk
                        LEFT OUTER JOIN     f_factory ff
                        ON                  ffcm.factory_pk = ff.factory_pk
                        WHERE fv.vod_pk = ${mysql.escape(vod_pk)} AND fv.view_flag = 1`
        const [vod] = await conn.execute(query1)

        // vod가 없을 때 or 삭제된 vod에 접근했을 때
        if(vod.length === 0){
            return { live : null, products : null }
        }
        const live_pk = vod[0].live_pk
        const query2 = `SELECT              fp.*, CASE WHEN fw.wish_pk IS NULL THEN 0 ELSE 1 END AS wish_yn
                        FROM                f_products fp
                        INNER JOIN          f_live_products_map flpm 
                        ON                  fp.product_pk = flpm.product_pk 
                        LEFT OUTER JOIN     f_wishlist fw
                        ON                  flpm.product_pk = fw.product_pk AND mem_pk=${mysql.escape(mem_pk)}
                        WHERE               flpm.live_pk = ${mysql.escape(live_pk)} AND fp.view_flag = 0
                        ORDER BY            flpm.product_order ASC`
        const [products] = await conn.execute(query2)

        const query3 = `UPDATE f_vod set vod_viewer = vod_viewer + 1
                        WHERE vod_pk = ${mysql.escape(vod_pk)}`
        await conn.query(query3)

        await conn.commit()
        return {vod : vod[0], products : products}
    }catch(err){
        console.error(`[ERROR] broadcastRepo.SelectVod => ${err}`)
        await conn.rollback()
        return false
    }finally {
        conn.release()
    }
}

exports.UpdateVod = async (vod_pk, view_flag)=>{
    try{
        const query = `UPDATE f_vod SET view_flag = ${mysql.escape(view_flag)} WHERE vod_pk = ${mysql.escape(vod_pk)}`
        const result = await db.query(query)
        if(result && result.affectedRows === 1){
            return true
        } else {
            return false
        }
    }catch (err){
        console.error("[ERROR] broadcastRepo.UpdateVod => " + err)
        return false
    }
}
