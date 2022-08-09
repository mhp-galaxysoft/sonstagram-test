const express = require('express')
const memberRepo = require('../repository/member_repo')
const { isLoggedIn, isNotLoggedIn } = require('./util')
const mail = require('../middleware/mail')
const bcrypt = require('bcrypt')
const logger = require('../middleware/logger')
const action = require('../middleware/logger_action')
let router = express.Router()

// 튜토리얼 - 로그인 페이지
router.get('/login', isNotLoggedIn, (req, res, next) => {
    res.render('./pumkin/tutorial/login')
})

// 튜토리얼 - 회원가입 페이지
router.get('/join', isNotLoggedIn, (req, res, next) => {
    res.render('./pumkin/tutorial/join')
})

// 튜토리얼 - 아이디, 비밀번호 찾기 페이지
router.get('/help', isNotLoggedIn, (req, res, next) => {
    res.render('./pumkin/tutorial/find-info')
})

// 튜토리얼 - 아이디, 비밀번호 찾기 페이지 - 비밀번호 찾기
router.post('/help/password', isNotLoggedIn, async (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] ||req.connection.remoteAddress ||req.socket.remoteAddress ||req.connection.socket.remoteAddress;
    const { id } = req.body
    try{
        const exUser = await memberRepo.SelectMemberForId(id, true)

        // if(!(exUser && exUser.length === 1))
        if(!exUser)
            return res.send({state : 'NOT FOUND'})

        //임시 비밀번호 변경
        const originPassword = exUser.mem_password;
        const newPassword = Math.random().toString(36).slice(2)

        let user_type
        if(exUser.factory_pk){
            user_type = 'factoryAdmin'
        } else {
            user_type = 'user'
        }
        const hash = await bcrypt.hash(newPassword,12)
        const result = await memberRepo.UpdateMemberPassword(id, hash, user_type)
        if(!result)
            return res.send({state : 'FAIL'})

        // 메일 전송
        const mailResult = await mail.sendUserPassword(newPassword, id, true)
        if(!mailResult) { // 전송 실패
            await memberRepo.UpdateMemberPassword(id, originPassword)
            logger.error('[FAIL] mail => sendUserPassword', {
                log_router   : '/pumkin/help/password',
                user_type    : user_type,
                user_ip      : ip,
                user_pk      : exUser.mem_pk ? exUser.mem_pk : exUser.factory_pk,
                user_id      : id,
                target_type  : action.target.ADMIN,
                target_pk    : 0,
                action_type  : action.log.USER.pw_search
            })
            return res.send({state: 'INVALID EMAIL'})
        }else{
            let user_type
            if(exUser.user_type === 0){
                user_type = 'user'
            } else if(exUser.user_type === 1){
                user_type = 'channelAdmin'
            } else if(exUser.factory_pk) {
                user_type = 'factoryAdmin'
            } else {
                user_type = 'totalAdmin'
            }

            logger.info('[SUCCESS] mail => sendUserPassword', {
                log_router   : '/pumkin/help/password',
                user_type    : user_type,
                user_ip      : ip,
                user_pk      : exUser.mem_pk ? exUser.mem_pk : exUser.factory_pk,
                user_id      : id,
                target_type  : action.target.ADMIN,
                target_pk    : 0,
                action_type  : action.log.USER.pw_search
            })
            return res.send({state : 'SUCCESS'})
        }
    }catch(err){
        logger.error(`[ERROR] => ${err}`, {
            log_router   : '/pumkin/help/password',
            user_type    : 0,
            user_ip      : ip,
            user_pk      : 0,
            user_id      : id,
            target_type  : action.target.ADMIN,
            target_pk    : 0,
            action_type  : action.log.USER.pw_search
        })
        console.error(err)
        res.send({state : 'FAIL'})
    }
})

// 일반 유저 로그아웃
router.get('/logout', isLoggedIn, (req,res)=>{
    const ip = req.headers['x-forwarded-for'] ||req.connection.remoteAddress ||req.socket.remoteAddress ||req.connection.socket.remoteAddress;
    const user_type = req.user.user_type
    let user_pk = req.user.mem_pk
    let user_id = req.user.mem_id

    req.logout()
    req.session.destroy()

    logger.info('[SUCCESS] Session Destroy', {
        log_router   : '/pumkin/logout',
        user_type    : user_type,
        user_ip      : ip, // 현재 ip
        user_pk      : user_pk,
        user_id      : user_id,
        target_type  : action.target.ADMIN,
        target_pk    : 0,
        action_type  : action.log.USER.logout
    })
    res.redirect('/pumkin/tutorial/login')
})

module.exports = router;
