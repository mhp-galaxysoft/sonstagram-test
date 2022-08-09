const express = require('express')
const { isLoggedIn, isUser } = require('./util')
let router = express.Router()
const likeRepo = require('../repository/like_repo')

// 좋아요 수
router.get('/:review_pk', isLoggedIn, async (req,res,next) => {
    const review_pk = req.params.review_pk
    const LikeNo = await likeRepo.LikeCnt(review_pk)
    res.send({likeNo :LikeNo.cnt})
})

// 리뷰 좋아요
router.post('/:review_pk',isLoggedIn, isUser, async (req,res,next)=>{
    const mem_pk = req.user.mem_pk
    const {review_pk} = req.params
    try{
        const result = await likeRepo.Like(review_pk, mem_pk)
        if(result){
            res.send({ state: 'SUCCESS' })
        } else {
            res.send({ state: 'FAIL'})
        }
    }catch (err){
        next(err)
    }
})

// 리뷰 좋아요 취소
router.delete('/:review_pk',isLoggedIn, isUser, async (req,res,next) =>{
    const mem_pk = req.user.mem_pk
    const review_pk = req.params.review_pk
    try {
        const result = await likeRepo.UnLike(review_pk, mem_pk)
        if(result){
            res.send({ state: 'SUCCESS' })
        } else {
            res.send({ state: 'FAIL'})
        }
    }catch (err){
        next(err)
    }
})

module.exports = router;
