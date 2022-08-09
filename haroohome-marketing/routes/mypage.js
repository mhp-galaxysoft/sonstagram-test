const express = require('express')
const { isLoggedIn, isUser, isUserAndChannel, isNotTotalAdmin } = require('./util')
const memberRepo = require("../repository/member_repo")
const channelRepo = require("../repository/channel_repo")
const mypageRepo = require("../repository/mypage_repo")
const streamRepo = require("../repository/stream_repo")
const adminRepo = require("../repository/admin_repo")
const logger = require('../middleware/logger')
const action = require('../middleware/logger_action')
const { v4: uuidV4 } = require('uuid')
const bcrypt = require('bcrypt')

let router = express.Router()

// 마이페이지 - 개인정보 수정
router.get('/profile/info', isLoggedIn, isUserAndChannel, async (req, res, next) => {
    try {
        const result = await adminRepo.SelectCategoryOptions()
        res.render('./mypage/user-info',{ category : result })
    } catch(err) {
        console.error(err)
    }
})

// 마이페이지 - 비밀번호 변경
router.get('/profile/password', isLoggedIn, isUserAndChannel, (req, res, next) => {
    res.render('./mypage/user-password')
})

// 마이 페이지 - 비밀번호 수정
router.put('/profile/password', isLoggedIn, isUserAndChannel, async(req,res,next) =>{
    const ip = req.headers['x-forwarded-for'] ||req.connection.remoteAddress ||req.socket.remoteAddress ||req.connection.socket.remoteAddress;
    const { password, newPassword } = req.body

    const id = req.user.mem_id
    const savedPassword = req.user.mem_password
    const compareResult = await bcrypt.compareSync(password, savedPassword, err => console.error(err))

    // 현재 비밀번호 확인
    if(!compareResult)
        return res.send({state: 'NOT MATCH'})

    const user_pk = req.user.mem_pk
    try{
        const hash = await bcrypt.hash(newPassword,12)
        const result = await memberRepo.UpdateMemberPassword(id, hash)

        if(result){
            logger.info('[SUCCESS] memberRepo => UpdateMemberPassword', {
                log_router   : '/mypage/profile/password',
                user_type    : req.user.user_type,
                user_ip      : ip,
                user_pk      : user_pk,
                user_id      : id,
                target_type  : action.target.ADMIN,
                target_pk    : 0,
                action_type  : action.log.USER.pw_update
            })
            return res.send({state: 'SUCCESS'})
        }else{
            logger.error('[FAIL] memberRepo => UpdateMemberPassword', {
                log_router   : '/mypage/profile/password',
                user_type    : req.user.user_type,
                user_ip      : ip,
                user_pk      : user_pk,
                user_id      : id,
                target_type  : action.target.ADMIN,
                target_pk    : 0,
                action_type  : action.log.USER.pw_update
            })
            return res.send({state: 'FAIL'})
        }
    }catch(err){
        logger.error(`[ERROR] => ${err}`, {
            log_router   : '/mypage/profile/password',
            user_type    : req.user.user_type,
            user_ip      : ip,
            user_pk      : user_pk,
            user_id      : id,
            target_type  : action.target.ADMIN,
            target_pk    : 0,
            action_type  : action.log.USER.pw_update
        })
        next(err)
    }
})

// 마이페이지 - 일반 유저
router.get('/following', isLoggedIn, isUser, async (req, res, next) => {
    res.render('./mypage/following')
})

// 마이페이지 - 일반 유저 - 팔로잉한 채널
router.get('/following-list', isLoggedIn, isUser, async (req, res, next) => {
    const { pageNo } = req.query
    const mem_pk = req.user.mem_pk
    try{
        const result = await mypageRepo.SelectFollowList(pageNo, mem_pk)
        res.render('./mypage/following-list', result)
    }catch(err){
        next(err)
    }
})

// 마이페이지 - 일반 유저 - 내 위시리스트
router.get('/wish', isLoggedIn, isUser, (req, res, next) => {
    res.render('./mypage/wishlist')
})

router.get('/wish-list', isLoggedIn, isUser, async (req, res, next) => {
    const { pageNo } = req.query
    const mem_pk = req.user.mem_pk
    try{
        const result = await mypageRepo.SelectWishList(pageNo, mem_pk)
        res.render('./mypage/wishlist-list', result)
    }catch(err){
        next(err)
    }
})

// 마이페이지 - 일반 유저 - 내 후기내역
router.get('/review', isLoggedIn, isUser, (req, res, next) => {
    res.render('./mypage/review')
})

// 마이페이지 - 일반 유저 - 후기 리스트
router.get('/review/list', isLoggedIn, isUser, async (req,res,next) =>{
    const pageNo = req.query.pageNo
    const mem_pk = req.user.mem_pk
    try{
        const result = await mypageRepo.SelectMyPageReview(mem_pk, pageNo)
        res.render('./mypage/review-list', result)
    }catch(err){
        next(err)
    }
})

// 마이페이지 - 일반 유저 - 내 1:1 문의
router.get('/inquiry', isLoggedIn, isUser, (req, res, next) => {
    res.render('./mypage/inquiry')
})

// 마이페이지 - 일반 유저 - 1:1 문의 리스트
router.get('/inquiry/list', isLoggedIn, isUser, async (req,res,next) => {
    const pageNo = req.query.pageNo
    const mem_pk = req.user.mem_pk
    try{
        const result = await mypageRepo.SelectMyPageInquiry(mem_pk, pageNo)
        res.render('./mypage/inquiry-list', result)
    }catch (err) {
        next(err)
    }
})

module.exports = router;
