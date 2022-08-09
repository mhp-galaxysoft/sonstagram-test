const express = require('express')
const passport = require('passport')
const bcrypt = require('bcrypt')
const { isNotLoggedIn, isLoggedIn } = require('./util')
const memberRepo = require('../repository/member_repo')
const streamRepo = require('../repository/stream_repo')
const mail = require('../middleware/mail')
const router = express.Router()
const logger = require('../middleware/logger')
const action = require('../middleware/logger_action')
const sms = require('../middleware/sms')

// 회원가입 아이디 검증
router.post('/valid/id', isNotLoggedIn, async (req,res,next)=>{
    const {id} = req.body
    try{
        const exUser = await memberRepo.SelectMemberForId(id) // 이전에 가입된 아이디가 있는지 확인

        if(exUser === false){       // 서버 에러
            res.send({state : 'FAIL'})
        }else if(exUser){           // 중복된 아이디 존재
            res.send({state : 'DUPLICATE'})
        }else{                      // 중복된 아이디 없음 -> 가입 가능
            res.send({state : 'SUCCESS'})
        }
    }catch(err){
        next(err)
    }
})

// 회원가입 아이디 검증
router.post('/valid/email', isNotLoggedIn, async (req,res,next)=>{
    const { id } = req.body
    try{
        const validationKey = Math.floor(Math.random() * (100000000 - 10000000 + 1)) + 10000000
        const result = await mail.validateId(id, validationKey)//최댓값은 제외, 최솟값은 포함
        if(result){
            res.send({ state : 'SUCCESS', validationKey })
        }else{
            res.send({state : 'FAIL'})
        }
    }catch(err){
        next(err)
    }
})

// 회원가입 전화번호 검증
router.post('/valid/sms', isNotLoggedIn, async (req,res,next)=>{
    const { mem_type, tel } = req.body

    try{
        const isExist = await memberRepo.SelectMemberForTel(tel, mem_type)
        if(isExist.cnt > 0){
            return res.send({ state : 'ALREADY' })
        }

        const randomVal = await sms.sendSms(tel)
        if(randomVal){
            return res.send({ state : 'SUCCESS', randomVal })
        }else{
            return res.send({ state : 'FAIL' })
        }
    }catch(err){
        next(err)
    }
})

// 일반 유저 회원가입
router.post('/join', isNotLoggedIn, async(req,res,next)=>{
    const {mem_type, memInfo} = req.body
    const ip = req.headers['x-forwarded-for'] ||req.connection.remoteAddress ||req.socket.remoteAddress ||req.connection.socket.remoteAddress
    memInfo.mem_ip = ip
    memInfo.user_type = mem_type === 'user' ? 0 : 1

    try{
        memInfo.mem_password = await bcrypt.hash(memInfo.mem_password,12)
        const result = await memberRepo.CreateMember(memInfo)
        if(!result){
            logger.error('[FAIL] memberRepo => CreateMember', {
                log_router   : '/auth/join',
                user_type    : mem_type,
                user_ip      : ip,
                user_pk      : 0,
                user_id      : memInfo.mem_id,
                target_type  : action.target.ADMIN,
                target_pk    : 0,
                action_type  : action.log.USER.signup
            })
            return res.send({state: 'FAIL'})
        }else{
            logger.info('[SUCCESS] memberRepo => CreateMember', {
                log_router   : '/auth/join',
                user_type    : mem_type,
                user_ip      : ip,
                user_pk      : result.insertId,
                user_id      : memInfo.mem_id,
                target_type  : action.target.ADMIN,
                target_pk    : 0,
                action_type  : action.log.USER.signup
            })
            return res.send({state: 'SUCCESS'})
        }
    }catch(err){
        logger.error(`[ERROR] => ${err}`, {
            log_router   : '/auth/join',
            user_type    : mem_type,
            user_ip      : ip,
            user_pk      : 0,
            user_id      : '-',
            target_type  : action.target.ADMIN,
            target_pk    : 0,
            action_type  : action.log.USER.signup
        })
        next(err)
    }
})

// 로그인
router.post('/login', isNotLoggedIn, (req,res,next)=>{
    const ip = req.headers['x-forwarded-for'] ||req.connection.remoteAddress ||req.socket.remoteAddress ||req.connection.socket.remoteAddress
    passport.authenticate('local',(authError, userData, state)=>{
        if(authError){
            console.error(`[authError]: ${authError}`)
            logger.error(`[ERROR] authError => ${authError}`, {
                log_router   : '/auth/login',
                user_type    : 0,
                user_ip      : ip, // ip
                user_pk      : 0,
                user_id      : '-',
                target_type  : action.target.ADMIN,
                target_pk    : 0,
                action_type  : action.log.USER.login
            })
            next(authError)
        }

        if(!userData){ // 유저 정보가 없는 경우
            res.send({state})
        }

        return req.login(userData, (loginError)=>{
            if(loginError){
                logger.error(`[ERROR] loginError => ${loginError}`, {
                    log_router   : '/auth/login',
                    user_type    : 0,
                    user_ip      : ip, // ip
                    user_pk      : 0,
                    user_id      : '-',
                    target_type  : action.target.ADMIN,
                    target_pk    : 0,
                    action_type  : action.log.USER.login
                })
                res.send({state: 'FAIL'})
            } else {
                logger.info('[SUCCESS] => LOGIN', {
                    log_router   : '/auth/login',
                    user_type    : userData.user_type,
                    user_ip      : ip,
                    user_pk      : userData.user_pk,
                    user_id      : userData.id,
                    target_type  : action.target.ADMIN,
                    target_pk    : 0,
                    action_type  : action.log.USER.login
                })
                res.send({state : 'SUCCESS'})
            }
        })
    })(req,res,next)
})

// 일반 유저 로그아웃
router.get('/logout', isLoggedIn, (req,res)=>{
    const ip = req.headers['x-forwarded-for'] ||req.connection.remoteAddress ||req.socket.remoteAddress ||req.connection.socket.remoteAddress;
    const flag_pumkin = req.user.flag_pumkin ? req.user.flag_pumkin : 0
    const user_type = req.user.user_type
    let user_pk = req.user.mem_pk
    let user_id = req.user.mem_id
    if(!user_pk){
        if(user_type === 'factoryAdmin'){
            user_pk = req.user.factory_pk
            user_id = req.user.factory_id
        }
    }

    req.logout()
    req.session.destroy()

    logger.info('[SUCCESS] Session Destroy', {
        log_router   : '/auth/logout',
        user_type    : user_type,
        user_ip      : ip, // 현재 ip
        user_pk      : user_pk,
        user_id      : user_id,
        target_type  : action.target.ADMIN,
        target_pk    : 0,
        action_type  : action.log.USER.logout
    })

    if(flag_pumkin === 0){
        res.redirect('/')
    } else {
        res.redirect('/pumkin/login')
    }
})

// 프로필 - 일반 유저 탈퇴
router.get('/leave', isLoggedIn, async (req,res,next)=>{
    const ip = req.headers['x-forwarded-for'] ||req.connection.remoteAddress ||req.socket.remoteAddress ||req.connection.socket.remoteAddress;
    const { mem_pk, mem_id, user_type } = req.user.mem_pk
    try {
        const result = await memberRepo.DeleteMember(mem_pk)
        if(result){
            if(req.user.user_type === 'channelAdmin'){
                const applicationName = req.user.channel.stream_application

                let delete_key = await streamRepo.DeletePublisher(applicationName, mem_id) // wowza 인증키 삭제
                delete_key = JSON.parse(delete_key)
                if(delete_key.success){
                    let delete_app = await streamRepo.DeleteApplication(applicationName) // wowza app 삭제
                    delete_app = JSON.parse(delete_app)
                    if(delete_app.success) {
                        console.log('Delete Wowza App')
                    } else {
                        next(delete_app)
                    }
                } else {
                    next(delete_key)
                }
            }

            req.logout()
            req.session.destroy()
            logger.info('[SUCCESS] memberRepo => DeleteMember', {
                log_router   : '/auth/leave',
                user_type    : user_type,
                user_ip      : ip, // 현재 ip
                user_pk      : mem_pk,
                user_id      : mem_id,
                target_type  : action.target.ADMIN,
                target_pk    : 0,
                action_type  : action.log.USER.signout
            })
            res.send({ state: 'SUCCESS' })
        } else {
            logger.error('[FAIL] memberRepo => DeleteMember', {
                log_router   : '/auth/leave',
                user_type    : user_type,
                user_ip      : ip, // 현재 ip
                user_pk      : mem_pk,
                user_id      : mem_id,
                target_type  : action.target.ADMIN,
                target_pk    : 0,
                action_type  : action.log.USER.signout
            })
            res.send({ state: 'FAIL' })
        }
    }catch (err){
        logger.error(`[ERROR] => ${err}`, {
            log_router   : '/auth/leave',
            user_type    : user_type,
            user_ip      : ip, // 현재 ip
            user_pk      : mem_pk,
            user_id      : mem_id,
            target_type  : action.target.ADMIN,
            target_pk    : 0,
            action_type  : action.log.USER.signout
        })
        next(err)
    }
})

module.exports = router;
