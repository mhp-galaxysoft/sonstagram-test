const express = require('express')
const { isLoggedIn, isUser } = require('./util')
let router = express.Router()
const followRepo = require('../repository/follow_repo')

// 팔로워 수
router.get('/:chnl_pk', isLoggedIn, async (req,res,next) => {
    const chnl_pk = req.params.chnl_pk
    const followerNo = await followRepo.FollowerCnt(chnl_pk)
    res.send({followerNo : followerNo.cnt})
})

// 채널구경하기 - 팔로잉
router.post('/:chnl_pk',isLoggedIn, isUser, async (req,res,next)=>{
    const mem_pk = req.user.mem_pk
    const chnl_pk = req.params.chnl_pk
    try{
        const result = await followRepo.Following(chnl_pk, mem_pk)
        if(result){
            res.send({ state: 'SUCCESS' })
        } else {
            res.send({ state: 'FAIL' })
        }
    }catch (err){
        next(err)
    }
})

// 언팔로잉
router.delete('/:chnl_pk',isLoggedIn, isUser, async (req,res,next) =>{
    const mem_pk = req.user.mem_pk
    const chnl_pk = req.params.chnl_pk
    try {
        const result = await followRepo.UnFollowing(chnl_pk, mem_pk)
        if(result){
            res.send({ state: 'SUCCESS' })
        } else {
            res.send({ state: 'FAIL' })
        }
    }catch (err){
        next(err)
    }
})

module.exports = router;
