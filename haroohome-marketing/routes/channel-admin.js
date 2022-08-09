const express = require('express')
const { isLoggedIn, isChannelAdmin, isNewChannelAdmin } = require('./util')
const channelRepo   = require('../repository/channel_repo')
const feedRepo      = require('../repository/feed_repo')
const broadcastRepo = require('../repository/broadcast_repo')
const adminRepo     = require('../repository/admin_repo')
const streamRepo    = require('../repository/stream_repo')
const factoryRepo   = require('../repository/factory_repo')
const memberRepo    = require('../repository/member_repo')
const logger        = require('../middleware/logger')
const action        = require('../middleware/logger_action')
const bcrypt        = require('bcrypt')
const { v4: uuidV4 } = require('uuid')
const router = express.Router()

// 채널 관리자 - 채널 생성 페이지
router.get('/join', isLoggedIn, isNewChannelAdmin, async (req,res,next)=>{
    try{
        const result = await adminRepo.SelectCategoryOptions()
        res.render('./channel-admin/join',{ category : result })
    } catch (err) {
        console.error(err)
    }
})

// 채널 관리자 - 채널 생성
router.post('/join', isLoggedIn, isNewChannelAdmin, async (req, res, next) => {
    console.log('here?')
    const ip = req.headers['x-forwarded-for'] ||req.connection.remoteAddress ||req.socket.remoteAddress ||req.connection.socket.remoteAddress;
    const {category_pk, chnl_info, chnl_shop_url} = req.body
    const chnlInfo = {
        category_pk,
        chnl_info,
        chnl_shop_url
    }
    const {mem_pk, mem_id} = req.user
    let applicationName = await bcrypt.hash( `${mem_pk}${mem_id}`,10)
    const reg_name = RegExp( /[ \/\\<>()\[\]\{\}:;]/gi )
    applicationName = applicationName.replace(reg_name, "")
    const streamPw = uuidV4()
    const url_count = chnl_shop_url.split(',')
    const secret_key = uuidV4()
    try{
        const result_app = await streamRepo.CreateApplication(applicationName) // wowza app 생성
        if(result_app.success){
            const result_key = await streamRepo.CreatePublisher(applicationName, mem_id, streamPw) // wowza 인증키 생성
            if(result_key.success){
                chnlInfo.stream_application = applicationName
                chnlInfo.stream_id          = mem_id
                chnlInfo.stream_password    = streamPw
                chnlInfo.secret_key         = secret_key

                const channel = await channelRepo.InsertChannel(mem_pk, chnlInfo, streamPw)
                if(channel){
                    logger.info('[SUCCESS] channelRepo => InsertChannel', {
                        log_router   : '/channel-admin/join',
                        user_type    : req.user.user_type,
                        user_ip      : ip, // ip
                        user_pk      : mem_pk,
                        user_id      : mem_id,
                        target_type  : action.target.ADMIN,
                        target_pk    : channel,
                        action_type  : action.log.TARGET.create
                    })
                    res.send({ state: 'SUCCESS' })
                } else {
                    let delete_key = await streamRepo.DeletePublisher(applicationName, mem_id) // wowza 인증키 삭제
                    delete_key = JSON.parse(delete_key)
                    if(delete_key.success){
                        let delete_app = await streamRepo.DeleteApplication(applicationName) // wowza app 삭제
                        delete_app = JSON.parse(delete_app)
                        if(delete_app.success){
                            console.log('Delete Wowza App')
                        } else {
                            next(delete_app)
                        }
                    } else {
                        next(delete_key)
                    }

                    logger.error('[FAIL] channelRepo => InsertChannel', {
                        log_router   : '/channel-admin/join',
                        user_type    : req.user.user_type,
                        user_ip      : ip, // ip
                        user_pk      : mem_pk,
                        user_id      : mem_id,
                        target_type  : action.target.ADMIN,
                        target_pk    : 0,
                        action_type  : action.log.TARGET.create
                    })

                    res.send({ state: 'FAIL' })
                }
            }else{
                next(result_key)
            }
        }else{
            next(result_app)
        }
    }catch(err){
        logger.error(`[ERROR] => ${err}`, {
            log_router   : '/channel-admin/join',
            user_type    : req.user.user_type,
            user_ip      : ip, // ip
            user_pk      : mem_pk,
            user_id      : mem_id,
            target_type  : action.target.ADMIN,
            target_pk    : 0,
            action_type  : action.log.TARGET.create
        })
        next(err)
    }
})

// 채널관리자 - 채널 영상 관리 - LIVE 생성
router.get('/video/live/create', isLoggedIn, isChannelAdmin, async (req, res, next) => {
    const chnl_pk = req.user.chnl_pk
    try{
        const islive = await broadcastRepo.SelectCurrentLive(chnl_pk)
        if(islive){ // 라이브가 이미 켜져 있는 경우
            res.redirect('/channel-admin/video/vod/manage')
        }else{
            const products = await channelRepo.SelectProducts(chnl_pk)
            res.render('./channel-admin/live-create',{products})
        }
    }catch (err){
        next(err)
    }
})

// 채널관리자 - 채널 영상 관리 - VOD 관리
router.get('/video/vod/manage', isLoggedIn, isChannelAdmin, async (req, res, next) => {
    try{
        const isLive = await broadcastRepo.SelectCurrentLive(req.user.chnl_pk)
        res.render('./channel-admin/vod-manage', {isLive})
    }catch (err){
        next(err)
    }
})

// 채널관리자 - 채널 영상 관리 - VOD 생성
router.get('/video/vod/create', isLoggedIn, isChannelAdmin, (req, res, next) => {
    res.render('./channel-admin/vod-create')
})

// 채널관리자 - 상품 관리 페이지
router.get('/products/manage', isLoggedIn, isChannelAdmin, async (req, res, next)=> {
    res.render('./channel-admin/product-manage')
})

// 채널관리자 - 상품 생성 페이지
router.get('/products/newproduct', isLoggedIn, isChannelAdmin, (req, res, next) => {
    res.render('./channel-admin/product-create',{pageType : 'creation'})
})

// 채널관리자 - 상품 수정 페이지
router.get('/products/modification/:product_pk', isLoggedIn, isChannelAdmin, async (req, res, next) => {
    let product_pk = req.params.product_pk
    const result = await channelRepo.SelectProductOptions(product_pk)
    const {option_pk, option_title, option_name, option_price, ...product} = result[result.length -1]
    const options = {}
    result.map(data => {
        const {option_pk, option_title_idx, option_title, option_name, option_price} = data
        const option = { option_pk, option_title_idx, option_title, option_name, option_price }
        if(option_title_idx)
        if(!options[option_title_idx]) options[option_title_idx] = [option]
        else options[option_title_idx].push(option)
    })

    res.render('./channel-admin/product-create',{pageType : 'modification', product, options})
})

// 채널관리자 - 고객 관리
router.get('/customer-manage', isLoggedIn, isChannelAdmin, (req, res, next) => {
    res.render('./channel-admin/customer-manage')
})

// 채널관리자 - 고객관리 - 후기내역
router.get('/customer-manage/review', isLoggedIn, isChannelAdmin, async function (req,res,next){
    try {
        const reviews = await channelRepo.SelectCustomerReview(req.user.chnl_pk, req.query.pageNo)
        res.render('./channel-admin/customer-manage-review', reviews)
    }catch (err){
        next(err)
        return false
    }
})

// 채널관리자 - 고객 문의
router.get('/customer-inquiry', isLoggedIn, isChannelAdmin, (req, res, next) => {
    res.render('./channel-admin/customer-inquiry')
})

// 채널관리자 - 고객문의 - 1:1문의
router.get('/customer-inquiry/list', isLoggedIn, isChannelAdmin, async function (req,res,next){
    const chnl_pk = req.user.chnl_pk
    const pageNo = req.query.pageNo
    try {
        const result = await channelRepo.SelectCustomerInquiry(chnl_pk, pageNo)
        res.render('./channel-admin/customer-inquiry-list', result)
    }catch (err){
        next(err)
    }
})

// 채널관리자 - 플랜 신청/변경
router.get('/plans/subscription', isLoggedIn, isChannelAdmin, async (req, res, next) => {
    const chnl_pk = req.user.chnl_pk
    try{
        const plans = await channelRepo.SelectPlans()
        const planInfo = await channelRepo.SelectPlan(chnl_pk)

        res.render('./channel-admin/plan-subscription', {plans, ...planInfo})
    }
    catch (err){
        next(err)
    }
})

// 채널관리자 - 플랜 신청
router.post('/plans/subscription',isLoggedIn,isChannelAdmin,async (req,res,next)=>{
    const ip = req.headers['x-forwarded-for'] ||req.connection.remoteAddress ||req.socket.remoteAddress ||req.connection.socket.remoteAddress;
    const {planInfo, additionalTime} = req.body
    planInfo.chnl_pk = req.user.chnl_pk
    try{
        const result = await channelRepo.InsertPlan(planInfo, additionalTime, req.user.chnl_pk)
        if(result){
            logger.info('[SUCCESS] channelRepo => InsertPlan', {
                log_router   : '/channel-admin/plans/subscription',
                user_type    : req.user.user_type,
                user_ip      : ip, // ip
                user_pk      : req.user.mem_pk,
                user_id      : req.user.mem_id,
                target_type  : action.target.PLAN,
                target_pk    : result.insertId,
                action_type  : action.log.TARGET.create
            })
            res.send({state : 'SUCCESS'})
        }else{
            logger.error('[FAIL] channelRepo => InsertPlan', {
                log_router   : '/channel-admin/plans/subscription',
                user_type    : req.user.user_type,
                user_ip      : ip, // ip
                user_pk      : req.user.mem_pk,
                user_id      : req.user.mem_id,
                target_type  : action.target.PLAN,
                target_pk    : 0,
                action_type  : action.log.TARGET.create
            })
            res.send({state : 'FAIL'})
        }
    }catch (err){
        logger.error(`[ERROR] => ${err}`, {
            log_router   : '/channel-admin/plans/subscription',
            user_type    : req.user.user_type,
            user_ip      : ip, // ip
            user_pk      : req.user.mem_pk,
            user_id      : req.user.mem_id,
            target_type  : action.target.PLAN,
            target_pk    : 0,
            action_type  : action.log.TARGET.create
        })
        res.send({state : 'ERROR'})
    }
})

// 채널관리자 - 플랜 변경
router.put('/plans/subscription',isLoggedIn,isChannelAdmin, async (req,res,next)=>{
    const ip = req.headers['x-forwarded-for'] ||req.connection.remoteAddress ||req.socket.remoteAddress ||req.connection.socket.remoteAddress;
    const {planInfo} = req.body
    const chnl_pk = req.user.chnl_pk
    try{
        const result = await channelRepo.UpdatePlan(chnl_pk, planInfo)
        if(result){
            res.send({state : 'SUCCESS'})
        }else{
            res.send({state : 'ERROR'})
        }
    }catch (err){
        logger.error(`[ERROR] => ${err}`, {
            log_router   : '/channel-admin/plans/subscription',
            user_type    : req.user.user_type,
            user_ip      : ip, // ip
            user_pk      : req.user.mem_pk,
            user_id      : req.user.mem_id,
            target_type  : action.target.PLAN,
            target_pk    : chnl_pk,
            action_type  : action.log.TARGET.change
        })
        res.send({state : 'ERROR'})
    }
})

// 채널관리자 - 플랜 신청 - 플랜
router.get('/plans/info', isLoggedIn, isChannelAdmin, async (req, res, next) => {
    const chnl_pk = req.user.chnl_pk
    try{
        const planInfo = await channelRepo.SelectPlan(chnl_pk)
        if(!planInfo){
            res.redirect('/channel-admin/plans/subscription')
        }else{
            res.render('./channel-admin/plan-info', {...planInfo})
        }
    }catch (err){
        next(err)
    }
})

// 채널관리자 - 피드 관리 페이지
router.get('/feed/manage', isLoggedIn, isChannelAdmin, async (req, res, next) => {
    res.render('./channel-admin/feed-manage')
})

// 채널관리자 - 피드 생성 페이지
router.get('/feed/create', isLoggedIn, isChannelAdmin, (req, res, next) => {
    res.render('./channel-admin/feed-create',{pageType : 'creation'})
})

// 채널관리자 - 피드 수정 페이지
router.get('/feed/modification/:feed_pk', isLoggedIn, isChannelAdmin, async function(req,res,next){
    const feed_pk = req.params.feed_pk
    try {
        const result = await feedRepo.SelectFeed(feed_pk)
        res.render('./channel-admin/feed-create',{pageType : 'modification', feed : result})
    } catch(err) {
        next(err)
    }
})

// 채널관리자 - 팩토리 초대 권유
router.get('/invite', isLoggedIn, isChannelAdmin, (req, res, next) => {
    res.render('./channel-admin/factory-invite')
})

// 채널관리자 - 쿠폰 관리
router.get('/coupon', isLoggedIn, isChannelAdmin, async (req, res, next) => {
    try{
        const coupon = await channelRepo.SelectCouponList(req.user.chnl_pk)
        res.render('./channel-admin/coupon-manage', { coupon })
    } catch (err) {
        next(err)
    }
})

// 채널관리자 - 쿠폰 등록 페이지
router.get('/coupon-reg', isLoggedIn, isChannelAdmin, (req, res, next) => {
    res.render('./channel-admin/coupon-reg')
})

// 채널관리자 - 미니 플레이어 정보
router.get('/mini-player', isLoggedIn, isChannelAdmin, async (req, res, next) => {
    const chnl_pk = req.user.chnl_pk
    try {
        const result = await channelRepo.SelectChannelInfo(chnl_pk)
        res.render('./channel-admin/mini-player', { result : result })
    } catch (err) {
        next(err)
    }
})

// 채널관리자 - 배송 관리 - 환불교환관리
router.get('/refund', isLoggedIn, isChannelAdmin, async (req, res, next) => {
    res.render('./channel-admin/delivery-manage')
})

// 채널관리자 - 배송 관리 - 환불교환 요청 리스트
router.get('/refund-list', isLoggedIn, isChannelAdmin, async (req, res, next) => {
    const chnl_pk = req.user.chnl_pk
    const pageNo = req.query.pageNo
    try {
        const result = await channelRepo.SelectRefundList(chnl_pk, pageNo)
        res.render('./channel-admin/delivery-manage-list', result)
        return true
    } catch (err) {
        next(err)
        return false
    }
})

// 채널관리자 - 배송 관리 - 환불 요청 승인
router.post('/refund/agree/:inquiry_pk', isLoggedIn, isChannelAdmin, async (req, res, next) => {
    const inquiry_pk = req.params.inquiry_pk
    try {
        const result = await channelRepo.UpdateRefundAgree(inquiry_pk)
        if(result){
            res.send({ state : 'SUCCESS'})
        } else {
            res.send({ state : 'FAIL'})
        }
        return true
    } catch (err) {
        next(err)
        return false
    }
})

// 채널관리자 - 배송 관리 - 교환 요청 승인
router.post('/exchange/agree/:inquiry_pk', isLoggedIn, isChannelAdmin, async (req, res, next) => {
    const inquiry_pk = req.params.inquiry_pk
    try {
        const result = await channelRepo.UpdateExchangeAgree(inquiry_pk)
        if(result){
            res.send({ state : 'SUCCESS'})
        } else {
            res.send({ state : 'FAIL'})
        }
        return true
    } catch (err) {
        next(err)
        return false
    }
})

// 채널관리자 - 배송 관리 - 요청 거절
router.post('/inquiry/reject/:inquiry_pk', isLoggedIn, isChannelAdmin, async (req, res, next) => {
    const inquiry_pk = req.params.inquiry_pk
    try {
        const result = await channelRepo.UpdateRefundReject(inquiry_pk)
        if(result){
            res.send({ state : 'SUCCESS'})
        } else {
            res.send({ state : 'FAIL'})
        }
        return true
    } catch (err) {
        next(err)
        return false
    }
})

// 채널관리자 - 배송 관리 - 송장번호입력 페이지
router.get('/invoice', isLoggedIn, isChannelAdmin, async (req, res, next) => {
    res.render('./channel-admin/delivery-invoice')
})

// 채널관리자 - 배송 관리 - 송장번호입력 리스트
router.get('/invoice-list', isLoggedIn, isChannelAdmin, async (req, res, next) => {
    const chnl_pk = req.user.chnl_pk
    const pageNo = req.query.pageNo
    try {
        const result = await channelRepo.SelectOrderList(chnl_pk, pageNo)
        res.render('./channel-admin/delivery-invoice-list----tmp', result)
        return true
    } catch (err) {
        next(err)
        return false
    }
})

// 채널관리자 - 배송 관리 - 전체 주문 송장번호입력
router.post('/invoice/order', isLoggedIn, isChannelAdmin, async (req, res, next) => {
    const { order_pk, waybill_number } = req.body
    try {
        const result = await channelRepo.InsertOrderWaybill(order_pk, waybill_number)
        if(result){
            res.send({ state : 'SUCCESS'})
        } else {
            res.send({ state : 'FAIL'})
        }
        return true
    } catch (err) {
        next(err)
        return false
    }
})

// 채널 초대 수락 페이지
router.get('/factory-invite', async (req, res, next) => {
    const { factory_pk, mem_id } = req.query
    try {
        const channel = await memberRepo.SelectChannelForId(mem_id)
        const factory = await adminRepo.SelectFactoryInfo(factory_pk)
        const result = {
            channel : channel,
            factory : factory
        }
        res.render('./channel-admin/factory-invite', result)
    } catch(err) {
        next(err)
    }
})

// 채널 초대 수락 링크
router.post('/factory-invite/:factory_pk', async (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] ||req.connection.remoteAddress ||req.socket.remoteAddress ||req.connection.socket.remoteAddress;
    const factory_pk = req.params.factory_pk
    const { chnl_pk, user_id } = req.body
    try {
        const result = await factoryRepo.InsertChannel(factory_pk, chnl_pk)
        if(result){
            if(result === 'SUCCESS'){
                logger.info('[SUCCESS] factoryRepo => InsertChannel', {
                    log_router   : '/channel-admin/factory-invite/' + factory_pk,
                    user_type    : 'channelAdmin',
                    user_ip      : ip, // 현재 ip
                    user_pk      : chnl_pk, // 채널 pk
                    user_id      : user_id,
                    target_type  : action.target.FACTORY,
                    target_pk    : factory_pk,
                    action_type  : action.log.FACTORY.accept
                })
            } else {
                logger.info('[ALREADY] factoryRepo => InsertChannel', {
                    log_router   : '/channel-admin/factory-invite/' + factory_pk,
                    user_type    : 'channelAdmin',
                    user_ip      : ip, // 현재 ip
                    user_pk      : chnl_pk, // 채널 pk
                    user_id      : user_id,
                    target_type  : action.target.FACTORY,
                    target_pk    : factory_pk,
                    action_type  : action.log.FACTORY.accept
                })
            }
            return res.send({ state: result })
        } else {
            logger.error('[FAIL] factoryRepo => InsertChannel', {
                log_router   : '/channel-admin/factory-invite/' + factory_pk,
                user_type    : 'channelAdmin',
                user_ip      : ip, // 현재 ip
                user_pk      : chnl_pk, // 채널 pk
                user_id      : user_id,
                target_type  : action.target.FACTORY,
                target_pk    : factory_pk,
                action_type  : action.log.FACTORY.accept
            })
            return res.send({ state: 'FAIL' })
        }
    } catch(err) {
        logger.error(`[ERROR] => ${err}`, {
            log_router   : '/channel-admin/factory-invite/' + factory_pk,
            user_type    : 'channelAdmin',
            user_ip      : ip, // 현재 ip
            user_pk      : chnl_pk,
            user_id      : user_id,
            target_type  : action.target.FACTORY,
            target_pk    : factory_pk,
            action_type  : action.log.FACTORY.accept
        })
        next(err)
    }
})

module.exports = router;
