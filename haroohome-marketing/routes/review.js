const express = require('express')
const { isLoggedIn, isUser, isUserAndFactory, isChannelAdmin } = require('./util')
const path      = require('path')
const config    = require("../config/config")
const multer    = require('multer')
const { v4: uuidV4 } = require('uuid')
const channelRepo = require('../repository/channel_repo')

const router = express.Router()

// disk에 저장
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/'+config.path.review)
    },
    filename: function (req, file, cb) {
        cb(null, uuidV4() + path.extname(file.originalname))
    }
})

const upload = multer({ storage })

// 채널 - 후기 생성
router.post('/', isLoggedIn, isUser, upload.single('img') ,async (req,res,next) => {
    let info = JSON.parse(req.body.info)
    if(req.file) {
        info.review_img = '/' + config.path.review + req.file.filename
    }
    info.mem_pk = req.user.mem_pk

    try{
        const result = await channelRepo.InsertReview(info)
        if(result){
            res.send({ state: 'SUCCESS' })
        } else {
            res.send({ state: 'FAIL' })
        }
    }catch (err){
        next(err)
    }
})

// 채널 - 후기 리스트 조회
router.get('/list/:product_pk', isLoggedIn, isUserAndFactory, async (req,res,next) => {
    const mem_pk = req.user.user_type === 'user' ? req.user.mem_pk : 0
    const product_pk = req.params.product_pk
    const { pageNo, sort } = req.query
    try{
        const result = await channelRepo.SelectReviewList(mem_pk, pageNo, product_pk, sort)
        res.render('./channel/channel-product-review-list', result)
    }catch (err){
        next(err)
    }
})

// 후기 조회
router.get('/:review_pk', isLoggedIn, isChannelAdmin, async (req,res,next) => {
    try{
        const review = await channelRepo.SelectReview(req.params.review_pk)
        if(review){
            res.send({state:'SUCCESS', review : review})
        }else{
            res.send({state : 'FAIL'})
        }
    }catch (err){
        next(err)
    }
})

module.exports = router;
