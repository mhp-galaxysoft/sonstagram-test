const express   = require('express')
const { isLoggedIn, isChannelAdmin } = require('./util')
const adminRepo = require('../repository/admin_repo')
const channelRepo = require('../repository/channel_repo')
const broadcastRepo = require('../repository/broadcast_repo')
const logger        = require('../middleware/logger')
const action        = require('../middleware/logger_action')
const router    = express.Router()

// 채널관리자 - 쿠폰 등록
router.post('/', isLoggedIn, isChannelAdmin, async (req, res, next) => {
    const { coupon_number } = req.body
    try {
        const coupon = await adminRepo.SelectCouponExist(coupon_number)
        if(!coupon){
            res.send({ state : 'NOT EXIST'})
            return false
        }

        const chnl_pk = req.user.chnl_pk
        const coupon_pk = coupon.coupon_pk
        const coupon_user = await channelRepo.SelectCouponUser(coupon_pk)
        if(coupon_user.coupon_user === 0){ // 단일 유저
            if(coupon_user.flag_status === 1){
                res.send({ state : 'ALREADY EXIST' })
                return false
            }
        } else { // 다수 유저
            const coupon_check = await channelRepo.SelectCoupon(coupon_pk, chnl_pk)
            if(coupon_check) {
                res.send({ state : 'ALREADY EXIST' })
                return false
            }
        }

        const result = await channelRepo.InsertCoupon(coupon_pk, chnl_pk)
        if(result) {
            res.send({ state : 'SUCCESS' })
            return true
        } else {
            res.send({ state : 'FAIL' })
            return false
        }

    } catch (err) {
        next(err)
        return false
    }
})

// 쿠폰 사용
router.put('/:map_pk', isLoggedIn, isChannelAdmin,async (req,res,next)=>{
    const ip = req.headers['x-forwarded-for'] ||req.connection.remoteAddress ||req.socket.remoteAddress ||req.connection.socket.remoteAddress;
    const map_pk = req.params.map_pk
    const chnl_pk = req.user.chnl_pk
    const coupon_time = req.body.coupon_time
    try{
        const result1 = await broadcastRepo.SelectCurrentLive(chnl_pk)
        if(result1){
            res.send({state: 'EXIST'})
            return
        }

        // 00:00:00 형태로 받아온 시간을 초단위로 변경
        // 원래 쿠폰 시간에 현재 추가한 쿠폰 시간 합산 후 저장
        const result2 = await channelRepo.UpdateCoupon(chnl_pk, map_pk, coupon_time)
        if(!result2) {
            logger.error(`[FAIL] channelRepo => UpdateCoupon`, {
                log_router: '/coupon/' + map_pk,
                user_type: req.user.user_type,
                user_ip: ip, // 현재 ip
                user_pk: chnl_pk,
                user_id: req.user.mem_id,
                target_type: action.target.COUPON,
                target_pk: map_pk,
                action_type: action.log.TARGET.use
            })
            res.send({state: 'FAIL'})
        } else {
            logger.info(`[SUCCESS] channelRepo => UpdateCoupon`, {
                log_router: '/coupon/' + map_pk,
                user_type: req.user.user_type,
                user_ip: ip, // 현재 ip
                user_pk: chnl_pk,
                user_id: req.user.mem_id,
                target_type: action.target.COUPON,
                target_pk: map_pk,
                action_type: action.log.TARGET.use
            })
            res.send({state: 'SUCCESS'})
        }
    }catch (err){
        logger.error(`[ERROR] => ${err}`, {
            log_router: '/coupon/' + map_pk,
            user_type: req.user.user_type,
            user_ip: ip, // 현재 ip
            user_pk: chnl_pk,
            user_id: req.user.mem_id,
            target_type: action.target.COUPON,
            target_pk: map_pk,
            action_type: action.log.TARGET.use
        })
        next(err)
    }
})

module.exports = router;
