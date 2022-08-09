const express   = require('express')
const { isLoggedIn, isChannelAdmin } = require('./util')
const multer    = require('multer')
const config    = require("../config/config")
const path      = require('path')
const router    = express.Router()
const channelRepo = require('../repository/channel_repo')
const logger = require('../middleware/logger')
const action = require('../middleware/logger_action')
const { v4: uuidV4 } = require('uuid')

// disk에 저장
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/'+config.path.product)
    },
    filename: function (req, file, cb) {
        cb(null, uuidV4() + path.extname(file.originalname))
    }
})
const upload = multer({ storage })

// 채널관리자 - 상품 생성
router.post('/', isLoggedIn, isChannelAdmin, upload.single('img'),async (req,res,next)=>{
    const ip = req.headers['x-forwarded-for'] ||req.connection.remoteAddress ||req.socket.remoteAddress ||req.connection.socket.remoteAddress
    const info = JSON.parse(req.body.info)
    const option = JSON.parse(req.body.option)

    try{
        info.product_img = '/' + config.path.product + req.file.filename
        info.chnl_pk = req.user.chnl_pk

        const result = await channelRepo.InsertProduct(info, option)
        if(result){
            logger.info('[SUCCESS] channelRepo => InsertProduct', {
                log_router   : '/product',
                user_type    : req.user.user_type,
                user_ip      : ip,
                user_pk      : req.user.mem_pk,
                user_id      : req.user.mem_id,
                target_type  : action.target.PRODUCT,
                target_pk    : result.insertId,
                action_type  : action.log.TARGET.create
            })
            res.send({state : 'SUCCESS'})
        } else {
            logger.error('[FAIL] channelRepo => InsertProduct', {
                log_router   : '/product',
                user_type    : req.user.user_type,
                user_ip      : ip,
                user_pk      : req.user.mem_pk,
                user_id      : req.user.mem_id,
                target_type  : action.target.PRODUCT,
                target_pk    : 0,
                action_type  : action.log.TARGET.create
            })
            res.send({state : 'FAIL'})
        }
    }catch(err){
        logger.error(`[ERROR] => ${err}`, {
            log_router   : '/product',
            user_type    : req.user.user_type,
            user_ip      : ip,
            user_pk      : req.user.mem_pk,
            user_id      : req.user.mem_id,
            target_type  : action.target.PRODUCT,
            target_pk    : 0,
            action_type  : action.log.TARGET.create
        })
        next(err)
    }
})

// 채널관리자 - 상품 수정
router.put('/:product_pk', isLoggedIn, isChannelAdmin, upload.single('img'),async (req,res,next)=>{
    const info = JSON.parse(req.body.info)
    const option = JSON.parse(req.body.option)
    const remove = req.body.remove.split(',')

    const product_pk = req.params.product_pk
    if(req.file){
        info.product_img = '/' + config.path.product + req.file.filename
    }
    info.chnl_pk = req.user.chnl_pk
    try{
        const result = await channelRepo.UpdateProduct(product_pk, info, option, remove)
        if(result){
            res.send({state : 'SUCCESS'})
        }else{
            res.send({state : 'FAIL'})
        }
    }catch(err){
        next(err)
    }
})

// 채널관리자 - 상품 삭제
router.delete('/:product_pk', isLoggedIn, isChannelAdmin, async (req,res,next)=>{
    const ip = req.headers['x-forwarded-for'] ||req.connection.remoteAddress ||req.socket.remoteAddress ||req.connection.socket.remoteAddress
    const product_pk = req.params.product_pk
    try{
        const result = await channelRepo.DeleteProduct(product_pk)
        if(result){
            logger.info('[SUCCESS] channelRepo => DeleteProduct', {
                log_router   : '/product/' + product_pk,
                user_type    : req.user.user_type,
                user_ip      : ip,
                user_pk      : req.user.mem_pk,
                user_id      : req.user.mem_id,
                target_type  : action.target.PRODUCT,
                target_pk    : product_pk,
                action_type  : action.log.TARGET.delete
            })
            res.send({ state: 'SUCCESS' })
        } else {
            logger.error('[FAIL] channelRepo => DeleteProduct', {
                log_router   : '/product/' + product_pk,
                user_type    : req.user.user_type,
                user_ip      : ip,
                user_pk      : req.user.mem_pk,
                user_id      : req.user.mem_id,
                target_type  : action.target.PRODUCT,
                target_pk    : product_pk,
                action_type  : action.log.TARGET.delete
            })
            res.send({ state: 'FAIL' })
        }
    }catch (err){
        logger.error(`[ERROR] => ${err}`, {
            log_router   : '/product/' + product_pk,
            user_type    : req.user.user_type,
            user_ip      : ip,
            user_pk      : req.user.mem_pk,
            user_id      : req.user.mem_id,
            target_type  : action.target.PRODUCT,
            target_pk    : product_pk,
            action_type  : action.log.TARGET.delete
        })
        next(err)
    }
})

// 채널관리자 - 상품 관리 - 상품 리스트 조회
router.get('/list', isLoggedIn, isChannelAdmin, async(req,res,next)=>{
    const chnl_pk = req.user.chnl_pk
    const mem_pk = req.user.mem_pk
    const {sort, keyword, pageNo} = req.query
    try{
        const result = await channelRepo.SelectProductList(chnl_pk, sort, pageNo, keyword, mem_pk)
        res.render('./channel-admin/product-list', result)
    }catch (err){
        next(err)
    }
})

// 상품 구매하기 클릭 시 클릭 수 증가
router.post('/click/:product_pk', async (req,res,next) => {
    const ip = req.headers['x-forwarded-for'] ||req.connection.remoteAddress ||req.socket.remoteAddress ||req.connection.socket.remoteAddress
    const product_pk = req.params.product_pk
    let user_pk = 0
    let user_id
    if(req.user){
        if(req.user.user_type === 'factoryAdmin'){
            user_id = req.user.factory_id
            user_pk = req.user.factory_pk
        } else {
            user_id = req.user.mem_id
            user_pk = req.user.mem_pk
        }
    } else {
        user_id = '-'
    }

    logger.info('[SUCCESS] View Product', {
        log_router   : '/product/click/' + product_pk,
        user_type    : req.user ? req.user.user_type : 0,
        user_ip      : ip,
        user_pk      : user_pk,
        user_id      : user_id,
        target_type  : action.target.PRODUCT,
        target_pk    : product_pk,
        action_type  : action.log.TARGET.view
    })

    try{
        const result = await channelRepo.UpdateClickCount(product_pk,user_pk)
        if(result){
            logger.info('[SUCCESS] channelRepo => UpdateClickCount', {
                log_router   : '/product/click/' + product_pk,
                user_type    : req.user ? req.user.user_type : 0,
                user_ip      : ip,
                user_pk      : user_pk,
                user_id      : user_id,
                target_type  : action.target.PRODUCT,
                target_pk    : product_pk,
                action_type  : action.log.TARGET.view
            })
            res.send({ state: 'SUCCESS'})
        } else {
            logger.error('[FAIL] channelRepo => UpdateClickCount', {
                log_router   : '/product/click/' + product_pk,
                user_type    : req.user.user_type,
                user_ip      : ip,
                user_pk      : user_pk,
                user_id      : user_id,
                target_type  : action.target.PRODUCT,
                target_pk    : product_pk,
                action_type  : action.log.TARGET.view
            })
            res.send({ state: 'FAIL'})
        }
    }catch (err){
        logger.error(`[ERROR] => ${err}`, {
            log_router   : '/product/click/' + product_pk,
            user_type    : req.user.user_type,
            user_ip      : ip,
            user_pk      : user_pk,
            user_id      : user_id,
            target_type  : action.target.PRODUCT,
            target_pk    : product_pk,
            action_type  : action.log.TARGET.view
        })
        next(err)
    }
})

module.exports = router;
