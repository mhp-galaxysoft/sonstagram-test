const express   = require('express')
const { isLoggedIn, isChannelAdmin } = require('./util')
const multer    = require('multer')
const config    = require("../config/config")
const path      = require('path')
const router    = express.Router()
const broadcastRepo = require('../repository/broadcast_repo')
const streamRepo = require('../repository/stream_repo')
const logger = require('../middleware/logger')
const action = require('../middleware/logger_action')
const { countLiveTimeScheduler, countLiveTimeSchedulerStop } = require('../middleware/batch')
const { v4: uuidV4 } = require('uuid')

// disk에 저장
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/'+config.path.live)
    },
    filename: function (req, file, cb) {
        cb(null, uuidV4() + path.extname(file.originalname))
    }
})

const upload = multer({ storage })

// 채널관리자 - 라이브 생성
router.post('/', isLoggedIn, isChannelAdmin, upload.single('img'), async (req,res,next)=>{
    const ip = req.headers['x-forwarded-for'] ||req.connection.remoteAddress ||req.socket.remoteAddress ||req.connection.socket.remoteAddress;
    let info = JSON.parse(req.body.info)
    const products = req.body.products.split(',')

    info.live_thumbnail = '/' + config.path.live + req.file.filename
    info.chnl_pk = req.user.chnl_pk

    try{
        const exist_live_pk = await broadcastRepo.SelectCurrentLive(req.user.chnl_pk)
        if(exist_live_pk){ // 라이브가 이미 켜져 있는 경우
            return res.send({state : 'LIVE', live_pk : exist_live_pk})
        }

        const applicationName = req.user.channel.stream_application
        const exist_obs = await streamRepo.SelectLive(applicationName)
        if(exist_obs === 'no-streaming'){
            return res.send({state : 'OBS'})
        }

        const live_pk = await broadcastRepo.InsertLive(info, products)
        if(live_pk){
            logger.info('[SUCCESS] broadcastRepo => InsertLive', {
                log_router   : '/live',
                user_type    : req.user.user_type,
                user_ip      : ip,
                user_pk      : req.user.mem_pk,
                user_id      : req.user.mem_id,
                target_type  : action.target.LIVE,
                target_pk    : live_pk,
                action_type  : action.log.TARGET.create
            })
            res.send({ state : 'SUCCESS', live_pk })
        }else{
            logger.error('[FAIL] broadcastRepo => InsertLive', {
                log_router   : '/live',
                user_type    : req.user.user_type,
                user_ip      : ip,
                user_pk      : req.user.mem_pk,
                user_id      : req.user.mem_id,
                target_type  : action.target.LIVE,
                target_pk    : 0,
                action_type  : action.log.TARGET.create
            })
            res.send({state : 'FAIL'})
        }
    }catch(err){
        logger.error(`[ERROR] => ${err}`, {
            log_router   : '/live',
            user_type    : req.user.user_type,
            user_ip      : ip,
            user_pk      : req.user.mem_pk,
            user_id      : req.user.mem_id,
            target_type  : action.target.LIVE,
            target_pk    : 0,
            action_type  : action.log.TARGET.create
        })
        next(err)
    }
})

router.post('/socket', isLoggedIn, isChannelAdmin, async (req,res,next)=> {
    const room_pk = req.body.room_pk
    try{
        const room = req.app.get('io').of('/chat').to(room_pk)
        countLiveTimeScheduler(room_pk, req.user.channel, room) // 스케줄러 등록
        res.end()
    }catch (err){
        next(err)
    }
})

// 채널관리자 - 라이브 수정
router.put('/:live_pk', isLoggedIn, isChannelAdmin, upload.single('img'), async (req,res,next)=>{
    let info = JSON.parse(req.body.info)
    const live_pk = req.params.live_pk
    const items = req.body.items.split(',')
    const product_no = req.body.product_no
    const mem_pk = req.user.mem_pk
    if(req.file){
        info.live_thumbnail = '/' + config.path.live + req.file.filename
    }

    try{
        const result = await broadcastRepo.UpdateLive(info, items, live_pk, product_no)
        if(result){
            const {live, products} = await broadcastRepo.SelectLive(live_pk,mem_pk) //업데이트 된 정보 가져오기
            res.send({ state: 'SUCCESS', products, live })
        } else {
            res.send({ state: 'FAIL' })
        }
    }catch(err){
        next(err)
    }
})

// 채널관리자 - 채널 영상 관리 - 라이브 리스트 조회
router.get('/list', isLoggedIn, isChannelAdmin, async(req,res,next)=>{
    let result
    const chnl_pk = req.user.chnl_pk
    const {sort, keyword, pageNo} = req.query
    try{
        result = await broadcastRepo.SelectLiveList( sort, pageNo, keyword, chnl_pk, "")
        res.render('./channel-admin/live-list',result)
    }catch (err){
        next(err)
    }
})

// socket 통신 실시간 채널 정보 변경
router.get('/:live_pk', async (req, res, next) => {
    const live_pk = req.params.live_pk
    const mem_pk = req.user ? req.user.mem_pk : 0
    try {
        const {live, products} = await broadcastRepo.SelectLive(live_pk, mem_pk)
        res.send({products, live})
    }catch(err){
        next(err)
    }
})

// LIVE 방송 종료
router.delete('/:live_pk', isLoggedIn, isChannelAdmin, async (req, res, next)=>{
    const ip = req.headers['x-forwarded-for'] ||req.connection.remoteAddress ||req.socket.remoteAddress ||req.connection.socket.remoteAddress;
    let result
    const chnl_pk = req.user.chnl_pk
    const applicationName = req.user.channel.stream_application
    const room_pk = req.params.live_pk

    try{
        result = await streamRepo.SelectLive(applicationName)
        if(result !== 'no-streaming'){
            // 라이브가 이미 켜져 있는 경우
            res.send({liveExist : true})
        }else{
            const applicationName = req.user.channel.stream_application
            result = await broadcastRepo.DeleteLive(chnl_pk, room_pk, applicationName)

            if(result){
                logger.info('[SUCCESS] broadcastRepo => DeleteLive', {
                    log_router   : '/live/' + room_pk,
                    user_type    : req.user.user_type,
                    user_ip      : ip,
                    user_pk      : req.user.mem_pk,
                    user_id      : req.user.mem_id,
                    target_type  : action.target.LIVE,
                    target_pk    : room_pk,
                    action_type  : action.log.TARGET.end
                })
                countLiveTimeSchedulerStop(room_pk, req.user.channel) // 스케줄러 삭제

                const room = req.app.get('io').of('/chat').to(room_pk) // socket 객체 조회하기
                room.emit("close")
            } else {
                logger.error('[FAIL] broadcastRepo => DeleteLive', {
                    log_router   : '/live/' + room_pk,
                    user_type    : req.user.user_type,
                    user_ip      : ip,
                    user_pk      : req.user.mem_pk,
                    user_id      : req.user.mem_id,
                    target_type  : action.target.LIVE,
                    target_pk    : room_pk,
                    action_type  : action.log.TARGET.end
                })
            }
            res.end()
        }
    }catch (err){
        logger.error(`[ERROR] => ${err}`, {
            log_router   : '/live/' + room_pk,
            user_type    : req.user.user_type,
            user_ip      : ip,
            user_pk      : req.user.mem_pk,
            user_id      : req.user.mem_id,
            target_type  : action.target.LIVE,
            target_pk    : room_pk,
            action_type  : action.log.TARGET.end
        })
        next(err)
    }
})

module.exports = router;;
