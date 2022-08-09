const express = require('express')
const {isLoggedIn, isTotalAdmin } = require('./util') // factory 관리자 계정 확인 필요
const multer    = require('multer')
const config    = require("../config/config")
const path      = require('path')
const { v4: uuidV4 } = require('uuid')
const adminRepo = require('../repository/admin_repo')
const logger = require('../middleware/logger')
const action = require('../middleware/logger_action')
const router = express.Router()
const bcrypt = require('bcrypt')
const ExcelJS = require('exceljs');
const iconvLite = require('iconv-lite');

// disk에 저장
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/' + config.path.factory)
    },
    filename: function (req, file, cb) {
        cb(null, uuidV4() + path.extname(file.originalname))
    }
})
const upload = multer({ storage })

//전체 관리자 - 유저 관리 페이지
router.get('/user', isLoggedIn, isTotalAdmin, (req, res, next) => {
    res.render('./total-admin/total-admin-user')
})

//전체 관리자 - 유저 상세보기
router.get('/user/detail', isLoggedIn, isTotalAdmin, async (req, res, next) => {
    const mem_pk = req.query.mem_pk
    try{
        const user = await adminRepo.SelectMemberInfo(mem_pk)
        if(user){
            if(user.user_type === 0){ // 일반유저
                user.user_type = 'user'
                res.send({ state : 'SUCCESS', user })
            } else { // 채널관리자
                const channelInfo = await adminRepo.SelectChannelInfo(user.chnl_pk)
                if(channelInfo){
                    user.user_type = 'channelAdmin'
                    res.send({state : 'SUCCESS', user : {...user, ...channelInfo}})
                }else{
                    res.send({ state : 'SUCCESS', user })
                }
            }
        }else{
            res.send({state : 'FAIL'})
        }
    }catch(err){
        next(err)
    }
})

//전체 관리자 - 유저 리스트
router.get('/user-list', isLoggedIn, isTotalAdmin, async (req, res, next) => {
    const { pageNo, sort, keywordType, keyword, orderType } = req.query
    try{
        const member = await adminRepo.SelectMemberList(pageNo, sort, keywordType, keyword, orderType)
        res.render('./total-admin/total-admin-user-list', member)
    }catch (err){
        next(err)
    }
})

//전체 관리자 - 유저 계정 중지
router.delete('/user', isLoggedIn, isTotalAdmin, async (req, res, next) =>{
    const ip = req.headers['x-forwarded-for'] ||req.connection.remoteAddress ||req.socket.remoteAddress ||req.connection.socket.remoteAddress;
    const { selectedUser } = req.body
    try{
        const result = await adminRepo.DeleteUser(selectedUser)
        if(result) {
            for(let i=0; i<selectedUser.length; i++){
                logger.info('[SUCCESS] adminRepo => DeleteUser', {
                    log_router   : '/total-admin/user',
                    user_type    : req.user.user_type,
                    user_ip      : ip,
                    user_pk      : 0,
                    user_id      : 'admin',
                    target_type  : action.target.ADMIN,
                    target_pk    : selectedUser[i],
                    action_type  : action.log.TARGET.delete
                })
            }
            res.send({ state : 'SUCCESS'})
        } else {
            logger.error('[FAIL] adminRepo => DeleteUser', {
                log_router   : '/total-admin/user',
                user_type    : req.user.user_type,
                user_ip      : ip,
                user_pk      : 0,
                user_id      : 'admin',
                target_type  : action.target.ADMIN,
                target_pk    : 0,
                action_type  : action.log.TARGET.delete
            })
            res.send({ state : 'FAIL'})
        }
    }catch (err){
        logger.error(`[ERROR] => ${err}`, {
            log_router   : '/total-admin/user',
            user_type    : req.user.user_type,
            user_ip      : ip,
            user_pk      : 0,
            user_id      : 'admin',
            target_type  : action.target.ADMIN,
            target_pk    : 0,
            action_type  : action.log.TARGET.delete
        })
        next(err)
    }
})

//전체 관리자 - 팩토리 계정
router.get('/factory', isLoggedIn, isTotalAdmin, (req, res, next) => {
    res.render('./total-admin/total-admin-factory')
})

//전체 관리자 - 팩토리 상세보기
router.get('/factory/detail', isLoggedIn, isTotalAdmin, async (req, res, next) => {
    const factory_pk = req.query.factory_pk
    try{
        const factory = await adminRepo.SelectFactoryInfo(factory_pk)
        if(factory){
            if(factory.flag_status === 0){
                res.send({ state : 'SUCCESS', factory : factory })
            } else {
                res.send({ state : 'DELETE', factory : factory })
            }
        }else{
            res.send({ state : 'FAIL' })
        }
    }catch(err){
        next(err)
    }
})

//전체 관리자 - 팩토리 계정 리스트
router.get('/factory-list', isLoggedIn, isTotalAdmin, async (req, res, next) => {
    const { pageNo, keywordType, keyword, orderType } = req.query
    try {
        const result = await adminRepo.SelectFactoryList(pageNo, keywordType, keyword, orderType)
        res.render('./total-admin/total-admin-factory-list', result)
    } catch (err){
        next(err)
    }
})

//전체 관리자 - 팩토리 계정 생성
router.post('/factory', isLoggedIn, isTotalAdmin, upload.fields([{name: 'img'}, {name: 'business'}]), async (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] ||req.connection.remoteAddress ||req.socket.remoteAddress ||req.connection.socket.remoteAddress;
    const factory = JSON.parse(req.body.info)
    const file = req.files
    const profile_img = req.files.img[0]
    const business_file = req.files.business[0]
    try{
        const exUser = await adminRepo.SelectFactoryForId(factory.factory_id, factory.factory_email) // 이전에 가입된 아이디가 있는지 확인

        if(exUser === 'EMAIL'){
            return res.send({state : 'EMAIL'})
        } else if(exUser === 'ID'){
            return res.send({state : 'ID'})
        } else if(exUser === false){
            return res.send({state : 'FAIL'})
        }

        // 팩토리 관리자 계정 생성
        if(profile_img){
            factory.factory_img = '/' + config.path.factory + profile_img.filename
        }
        factory.factory_business = '/' + config.path.factory + business_file.filename
        factory.factory_password = await bcrypt.hash(factory.factory_password, 12)

        const result = await adminRepo.InsertFactory(factory)
        if(result && result.affectedRows >= 1){
            logger.info('[SUCCESS] adminRepo => InsertFactory', {
                log_router   : '/total-admin/factory',
                user_type    : req.user.user_type,
                user_ip      : ip,
                user_pk      : 0,
                user_id      : 'admin',
                target_type  : action.target.FACTORY,
                target_pk    : result.insertId,
                action_type  : action.log.FACTORY.create
            })
            return res.send({state : 'SUCCESS'})
        }else{
            logger.error('[FAIL] adminRepo => InsertFactory', {
                log_router   : '/total-admin/factory',
                user_type    : req.user.user_type,
                user_ip      : ip,
                user_pk      : 0,
                user_id      : 'admin',
                target_type  : action.target.FACTORY,
                target_pk    : 0,
                action_type  : action.log.FACTORY.create
            })
            return res.send({state :'FAIL'})
        }
    }catch(err){
        logger.error(`[ERROR] => ${err}`, {
            log_router   : '/total-admin/factory',
            user_type    : req.user.user_type,
            user_ip      : ip,
            user_pk      : 0,
            user_id      : 'admin',
            target_type  : action.target.FACTORY,
            target_pk    : 0,
            action_type  : action.log.FACTORY.create
        })
        next(err)
    }
})

//전체 관리자 - 팩토리관리자 계정 수정
router.put('/factory', isLoggedIn, isTotalAdmin, upload.fields([{name: 'img'}, {name: 'business'}]), async (req,res,next) => {
    const factory_info = JSON.parse(req.body.factory_info)
    const file = req.files
    try{
        // 이전에 가입된 아이디가 있는지 확인
        const exUser = await adminRepo.SelectFactoryForId(factory_info.factory_id, factory_info.factory_email, factory_info.factory_pk)

        if(exUser === 'EMAIL'){
            return res.send({state : 'EMAIL'})
        } else if(exUser === 'ID'){
            return res.send({state : 'ID'})
        } else if(exUser === false){
            return res.send({state : 'FAIL'})
        }

        // 팩토리 관리자 계정 수정
        if(file.img) {
            factory_info.factory_img = '/' + config.path.factory + file.img[0].filename
        }
        if(file.business){
            factory_info.factory_business = '/' + config.path.factory + file.business[0].filename
        }
        if(factory_info.factory_password){
            factory_info.factory_password = await bcrypt.hash(factory_info.factory_password, 12)
        }

        const result = await adminRepo.UpdateFactoryInfo(factory_info)
        if(result) {
            return res.send({state: 'SUCCESS'})
        } else {
            return res.send({state: 'FAIL'})
        }
    }catch(err){
        next(err)
    }
})

//전체 관리자 - 팩토리관리자 계정 중지
router.delete('/factory', isLoggedIn, isTotalAdmin, async (req, res, next) =>{
    const ip = req.headers['x-forwarded-for'] ||req.connection.remoteAddress ||req.socket.remoteAddress ||req.connection.socket.remoteAddress;
    const { selectedFactory } = req.body
    try{
        const result = await adminRepo.DeleteFactory(selectedFactory)
        if(result)  {
            for(let i=0; i<selectedFactory.length; i++){
                logger.info('[SUCCESS] adminRepo => DeleteFactory', {
                    log_router   : '/total-admin/factory',
                    user_type    : req.user.user_type,
                    user_ip      : ip,
                    user_pk      : 0,
                    user_id      : 'admin',
                    target_type  : action.target.FACTORY,
                    target_pk    : selectedFactory[i],
                    action_type  : action.log.FACTORY.stop
                })
            }
            res.send({ state : 'SUCCESS'})
        } else {
            logger.error('[FAIL] adminRepo => DeleteFactor', {
                log_router   : '/total-admin/factory',
                user_type    : req.user.user_type,
                user_ip      : ip,
                user_pk      : 0,
                user_id      : 'admin',
                target_type  : action.target.FACTORY,
                target_pk    : 0,
                action_type  : action.log.FACTORY.stop
            })
            res.send({ state : 'FAIL'})
        }
    }catch (err){
        logger.error(`[ERROR] => ${err}`, {
            log_router   : '/total-admin/factory',
            user_type    : req.user.user_type,
            user_ip      : ip,
            user_pk      : 0,
            user_id      : 'admin',
            target_type  : action.target.FACTORY,
            target_pk    : 0,
            action_type  : action.log.FACTORY.stop
        })
        next(err)
    }
})

//전체 관리자 - 결제내역
router.get('/payment', isLoggedIn, isTotalAdmin, (req, res, next) => {
    res.render('./total-admin/total-admin-payment')
})

//전체관리자 - 로그
router.get('/log', isLoggedIn, isTotalAdmin, (req, res, next) => {
    res.render('./total-admin/total-admin-log')
})

//전체관리자 - 로그 리스트
router.get('/log-list', isLoggedIn, isTotalAdmin, async (req, res, next) => {
    const { pageNo, userType, keywordType, keyword, orderType } = req.query
    try{
        const result = await adminRepo.SelectLogList(pageNo, userType, keywordType, keyword, orderType)
        for(let i=0; i<result.log.length; i++){
            result.log[i].log_msg = JSON.parse(result.log[i].log_msg)
            result.log[i].log_msg.level = result.log[i].log_msg.level.toUpperCase()
        }
        res.render('./total-admin/total-admin-log-list', result)
    }catch (err){
        next(err)
    }
})

//전체관리자 - 쿠폰생성 페이지
router.get('/coupon', isLoggedIn, isTotalAdmin, (req, res, next) => {
    res.render('./total-admin/total-admin-coupon')
})

//전체관리자 - 쿠폰 리스트
router.get('/coupon-list', isLoggedIn, isTotalAdmin, async (req, res, next) => {
    const { pageNo, orderType } = req.query
    try{
        const result = await adminRepo.SelectCouponList(pageNo, orderType)

        for(let idx=0; idx<result.coupon.length; idx++){
            const coupon_number = result.coupon[idx].coupon_number
            result.coupon[idx].coupon_number = coupon_number.substr(0, 4) + ' ' +
                                             coupon_number.substr(4, 4) + ' ' +
                                             coupon_number.substr(8, 4) + ' ' +
                                             coupon_number.substr(12, 4)
        }

        res.render('./total-admin/total-admin-coupon-list', result)
    }catch (err){
        next(err)
    }
})

//전체관리자 - 쿠폰 번호 생성
router.post('/coupon-number', isLoggedIn, isTotalAdmin, async (req, res, next) => {
    const reg_exp = RegExp(/[^a-zA-Z0-9]/gi)
    const coupon_user_num = req.body.coupon.coupon_user_num
    const coupon = req.body.coupon
    const coupons = []

    try {
        delete coupon.coupon_user_num
        if(coupon.coupon_user == 1){ // 모든 유저 = 쿠폰 번호가 이미 생성되어 들어옴
            coupon.coupon_number = coupon.coupon_number.toUpperCase()
            const result1 = await adminRepo.SelectCoupon(coupon.coupon_number)
            if(result1.cnt == 0) {
                coupons.push(Object.assign({}, coupon))
                const result2 = await adminRepo.InsertCoupon(coupons)
                if(result2){
                    res.send({ state : 'SUCCESS' })
                    return true
                } else {
                    res.send({state: 'FAIL'})
                    return false
                }
            }
        }

        let count = 0
        while(true) {
            let coupon_key = uuidV4()

            if (reg_exp.test(coupon_key)) {
                coupon_key = coupon_key.replace(reg_exp, '')
            }

            const coupon_number = coupon_key.substr(0, 16).toUpperCase()
            if(!coupon.coupon_number.includes(coupon_number)){
                const result3 = await adminRepo.SelectCoupon(coupon_number)
                if(result3.cnt === 0) {
                    coupon.coupon_number = coupon_number
                    coupons.push(Object.assign({}, coupon))

                    count += 1
                    if(count === Number(coupon_user_num)) {
                        const result4 = await adminRepo.InsertCoupon(coupons)
                        if(result4){
                            return res.send({ state : 'SUCCESS'})
                        } else {
                            return res.send({ state : 'FAIL'})
                        }
                    }
                }
            }
        }

    } catch(err) {
        next(err)
        return false
    }
})

//전체관리자 - 쿠폰 삭제
router.delete('/coupon', isLoggedIn, isTotalAdmin, async (req, res, next) => {
    try{
        const { selectedCoupon } = req.body
        const result = await adminRepo.DeleteCoupon(selectedCoupon)
        if(result)  {
            res.send({ state : 'SUCCESS'})
        } else {
            res.send({ state : 'FAIL'})
        }
    }catch (err){
        next(err)
    }
})

//전체관리자 - 카테고리 관리
router.get('/category', isLoggedIn, isTotalAdmin,(req, res, next) => {
    res.render('./total-admin/total-admin-category')
})

//전체관리자 - 카테고리 리스트
router.get('/category-list', isLoggedIn, isTotalAdmin, async (req, res, next) => {
    let result
    const { pageNo, orderType } = req.query

    try {
        result = await adminRepo.SelectCategoryList(pageNo, orderType)
        res.render('./total-admin/total-admin-category-list', result)
    } catch (err) {
        next(err)
    }
})

//전체관리자 - 새 카테고리 생성
router.post('/category', isLoggedIn, isTotalAdmin, async (req, res, next) => {
    const { category_name } = req.body
    try {
        const result1 = await adminRepo.SelectCategoryCount(category_name)
        if(result1.cnt != 0){
            res.send({ state : 'ALREADY' })
            return false
        }

        const result2 = await adminRepo.InsertCategory(category_name)
        if(result2) {
            return res.send({ state : 'SUCCESS' })
        } else {
            return res.send({ state : 'FAIL' })
        }
    } catch (err) {
        next(err)
    }
})

//전체관리자 - 카테고리 수정
router.put('/category', isLoggedIn, isTotalAdmin, async (req, res, next) => {
    const { category_pk, category_name } = req.body
    try {
        const result = await adminRepo.UpdateCategory(category_pk, category_name)
        if(result){
            res.send({ state : 'SUCCESS' })
        } else {
            res.send({ state : 'FAIL' })
        }
    } catch (err) {
        next(err)
    }
})

//전체관리자 - 카테고리 삭제
router.delete('/category', isLoggedIn, isTotalAdmin, async (req, res, next) => {
    const category_pk = req.query.category_pk
    try {
        const result = await adminRepo.DeleteCategory(category_pk)
        if(result){
            res.send({ state : 'SUCCESS' })
        } else {
            res.send({ state : 'FAIL' })
        }
    } catch (err) {
        next(err)
    }
})

//전체관리자 - 로그 리스트
router.get('/log-download', isLoggedIn, isTotalAdmin, async (req, res, next) => {
    const { userType, keywordType, keyword, orderType } = req.query
    try{
        let result = await adminRepo.SelectLogListForExcel(userType, keywordType, keyword, orderType)

        for(let i=0; i<result.length; i++){
            if(result[i].target_type === 0) {
                result[i].target_type = '계정관리'
            } else if(result[i].target_type === 1) {
                result[i].target_type = 'LIVE'
            } else if(result[i].target_type === 2) {
                result[i].target_type = 'VOD'
            } else if(result[i].target_type === 3) {
                result[i].target_type = '상품'
            } else if(result[i].target_type === 4) {
                result[i].target_type = '쿠폰'
            } else if(result[i].target_type === 5) {
                result[i].target_type = '팩토리'
            } else if(result[i].target_type === 6) {
                result[i].target_type = '플랜'
            }

            if(result[i].user_type === 0) {
                result[i].user_type = '미가입자'
            } else if(result[i].user_type === 1) {
                result[i].user_type = '일반유저'
            } else if(result[i].user_type === 2) {
                result[i].user_type = '채널관리자'
            } else if(result[i].user_type === 3) {
                result[i].user_type = '팩토리관리자'
            } else if(result[i].user_type === 4) {
                result[i].user_type = '전체관리자'
            }

            result[i].log_msg = JSON.parse(result[i].log_msg)
            result[i].log_msg.level = result[i].log_msg.level.toUpperCase()
            result[i].log_msg = `[${result[i].log_msg.level}][ IP: ${result[i].user_ip} ] ${result[i].target_type} - ${result[i].log_msg.action_type}`
        }

        const today = new Date()
        const year = today.getFullYear()
        const month = today.getMonth() + 1
        const date = today.getDate()

        const fileName = `라이브팩토리 로그_${year}-${month}-${date}`
        const workbook = new ExcelJS.Workbook()
        workbook.created = new Date();
        workbook.modified = new Date();
        workbook.views = [
            {
                x: 0, y: 0, width: 100, height: 50,
                firstSheet: 0, activeTab: 1, visibility: 'visible'
            }
        ]

        const worksheet = workbook.addWorksheet(`학원 목록`);

        worksheet.columns = [
            { header: '일시', key: 'log_created', width: 20},
            { header: '유저타입', key: 'user_type', width: 12},
            { header: '아이디', key: 'user_id', width: 25},
            { header: '로그타입', key: 'target_type', width: 10},
            { header: '로그내용', key: 'log_msg', width: 60},
        ]

        worksheet.addRows(result)

        res.status(200);
        res.setHeader('Content-Type', 'text/xlsx');
        res.setHeader('Content-Disposition', `attachment; filename=${getDownloadFilename(req, fileName)}.xlsx`);

        function getDownloadFilename(req, filename) {
            const header = req.headers['user-agent'];
            if (header.includes("MSIE") || header.includes("Trident")) {
                return encodeURIComponent(filename).replace(/\\+/gi, "%20");
            } else if (header.includes("Chrome")) {
                return iconvLite.decode(iconvLite.encode(filename, "UTF-8"), 'ISO-8859-1');
            } else if (header.includes("Opera")) {
                return iconvLite.decode(iconvLite.encode(filename, "UTF-8"), 'ISO-8859-1');
            } else if (header.includes("Firefox")) {
                return iconvLite.decode(iconvLite.encode(filename, "UTF-8"), 'ISO-8859-1');
            }
            return filename;
        }

        workbook.xlsx.write(res).then(function () {
            return true;
        });
    }catch(e){
        next(e)
    }
})

module.exports = router;
