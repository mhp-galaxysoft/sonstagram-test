const express = require('express')
const broadcastRepo = require('../repository/broadcast_repo')
const channelRepo = require('../repository/channel_repo')
const followRepo = require('../repository/follow_repo')
const { isLoggedIn, isUserAndChannel } = require('./util')
const logger = require('../middleware/logger')
const action = require('../middleware/logger_action')
const router = express.Router()

// LIVE 방송화면
router.get('/live/:live_pk', async (req, res, next)=>{
    const ip = req.headers['x-forwarded-for'] ||req.connection.remoteAddress ||req.socket.remoteAddress ||req.connection.socket.remoteAddress;
    const live_pk = req.params.live_pk
    let mem_pk, mem_id
    if(req.user){
        if(req.user.user_type === 'factoryAdmin'){
            mem_pk = req.user.factory_pk
            mem_id = req.user.factory_id
        } else {
            mem_pk = req.user.mem_pk
            mem_id = req.user.mem_id
        }
    } else {
        mem_pk = 0
        mem_id = '-'
    }

    try{
        const {live, products} = await broadcastRepo.SelectLive(live_pk, mem_pk)
        if(!live){
            logger.error('[FAIL] broadcastRepo => SelectLive', {
                log_router   : '/broadcast/live/' + live_pk,
                user_type    : req.user ? req.user.user_type : 0,
                user_ip      : ip,
                user_pk      : mem_pk,
                user_id      : mem_id,
                target_type  : action.target.LIVE,
                target_pk    : live_pk,
                action_type  : action.log.TARGET.view
            })
            res.redirect('/')
        }else{
            const chnl_pk   = live.chnl_pk
            const chats     = await broadcastRepo.SelectChats(live_pk)
            const follow_yn = await followRepo.FollowState(chnl_pk, mem_pk)
            const items     = await channelRepo.SelectProducts(chnl_pk)

            logger.info('[SUCCESS] broadcastRepo => SelectLive', {
                log_router   : '/broadcast/live/' + live_pk,
                user_type    : req.user ? req.user.user_type : 0,
                user_ip      : ip,
                user_pk      : mem_pk,
                user_id      : mem_id,
                target_type  : action.target.LIVE,
                target_pk    : live_pk,
                action_type  : action.log.TARGET.view
            })

            const isTimeOut = live.stream_available_time === 0 ? true : false

            res.render('./broadcast/live', {live, products, items, chats, follow_yn, isTimeOut})
        }
    }catch(err){
        logger.error(`[ERROR] => ${err}`, {
            log_router   : '/broadcast/live/' + live_pk,
            user_type    : req.user ? req.user.user_type : 0,
            user_ip      : ip,
            user_pk      : mem_pk,
            user_id      : mem_id,
            target_type  : action.target.LIVE,
            target_pk    : live_pk,
            action_type  : action.log.TARGET.view
        })
        next(err)
    }
})

// LIVE 방송화면 - 채팅 입력
router.post('/live/:live_pk/chat', isLoggedIn, isUserAndChannel, async (req,res,next)=>{
    const { chat, type } = req.body
    const room_pk = req.params.live_pk
    const chatLog = {
        chat_user : req.user.mem_pk,
        chat_contents : chat,
        room_pk
    }
    try{
        await broadcastRepo.CreateChat(chatLog)
        const room = req.app.get('io').of('/chat').to(room_pk) // app에 있는 io 가져오기 of(chat에 들어가겟다) to (name 안의 room.. 방)
        room.emit("chat", {
            user : req.user.mem_nickname,
            img : req.user.mem_img,
            chat,
            type
        })
        res.end()
    }catch (err){
        next(err)
    }
})

// VOD 방송화면
router.get('/vod/:vod_pk',async (req, res, next)=>{
    const ip = req.headers['x-forwarded-for'] ||req.connection.remoteAddress ||req.socket.remoteAddress ||req.connection.socket.remoteAddress;
    const vod_pk = req.params.vod_pk
    let mem_pk, mem_id
    if(req.user){
        if(req.user.user_type === 'factoryAdmin'){
            mem_pk = req.user.factory_pk
            mem_id = req.user.factory_id
        } else {
            mem_pk = req.user.mem_pk
            mem_id = req.user.mem_id
        }
    } else {
        mem_pk = 0
        mem_id = '-'
    }

    try{
        const {vod, products} = await broadcastRepo.SelectVod(vod_pk,mem_pk)
        if(!vod){
            logger.error('[FAIL] broadcastRepo => SelectVod', {
                log_router   : '/broadcast/vod/' + vod_pk,
                user_type    : req.user ? req.user.user_type : 0,
                user_ip      : ip,
                user_pk      : mem_pk,
                user_id      : mem_id,
                target_type  : action.target.VOD,
                target_pk    : vod_pk,
                action_type  : action.log.TARGET.view
            })
            res.redirect('/')
        }else{
            const chnl_pk   = vod.chnl_pk
            const chats     = await broadcastRepo.SelectChats(vod.live_pk)
            const follow_yn = await followRepo.FollowState(chnl_pk, mem_pk)

            logger.info('[SUCCESS] broadcastRepo => SelectVod', {
                log_router   : '/broadcast/vod/' + vod_pk,
                user_type    : req.user ? req.user.user_type : 0,
                user_ip      : ip,
                user_pk      : mem_pk,
                user_id      : mem_id,
                target_type  : action.target.VOD,
                target_pk    : vod_pk,
                action_type  : action.log.TARGET.view
            })
            res.render('./broadcast/vod', {vod, products, chats, chnl_pk, follow_yn})
        }
    }catch(err){
        logger.error(`[ERROR] => ${err}`, {
            log_router   : '/broadcast/vod/' + vod_pk,
            user_type    : req.user ? req.user.user_type : 0,
            user_ip      : ip,
            user_pk      : mem_pk,
            user_id      : mem_id,
            target_type  : action.target.VOD,
            target_pk    : vod_pk,
            action_type  : action.log.TARGET.view
        })
        next(err)
    }
})

module.exports = router;
