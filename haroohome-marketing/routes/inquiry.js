const express = require('express')
const { isLoggedIn, isUser, isChannelAdmin, isUserAndFactory } = require('./util')
const channelRepo = require('../repository/channel_repo')
let router = express.Router()

// 문의 생성
router.post('/',  isLoggedIn, isUser, async (req,res,next) => {
    let info = req.body
    info.mem_pk = req.user.mem_pk
    try{
        const result = await channelRepo.InsertInquiry(info)
        if(result){
            res.send({ state: 'SUCCESS' })
        } else {
            res.send({ state: 'FAIL' })
        }
    }catch (err){
        next(err)
    }
})

// 답변 등록
router.put('/answer', isLoggedIn, isChannelAdmin, async (req,res,next) => {
    let info = req.body
    try{
        const answer = await channelRepo.UpdateInquiryAnswer(info.response_contents, info.inquiry_pk)
        if(answer){
            res.send({ state: 'SUCCESS', answer })
        } else {
            res.send({ state: 'FAIL' })
        }
    }catch (err){
        next(err)
    }
})

// 문의 리스트 조회
router.get('/:product_pk', isLoggedIn, isUserAndFactory, async (req,res,next) => {
    const product_pk = req.params.product_pk
    const pageNo = req.query.pageNo
    try{
        const result = await channelRepo.SelectInquiryList(product_pk, pageNo)
        res.render('./channel/channel-product-inquiry-list', result)
    }catch (err){
        next(err)
    }
})

module.exports = router;
