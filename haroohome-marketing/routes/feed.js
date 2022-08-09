const express   = require('express')
const { isLoggedIn, isChannelAdmin } = require('./util')
const multer    = require('multer')
const config    = require("../config/config")
const path      = require('path')
const router    = express.Router()
const { v4: uuidV4 } = require('uuid')
const feedRepo = require('../repository/feed_repo')

// disk에 저장
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/'+config.path.feed)
    },
    filename: function (req, file, cb) {
        cb(null, uuidV4() + path.extname(file.originalname))
    }
})

const upload = multer({ storage })

// 피드 생성
router.post('/', isLoggedIn, isChannelAdmin, upload.single('img'),async (req, res, next)=>{
    let info = JSON.parse(req.body.info)
    info.feed_img = '/' + config.path.feed + req.file.filename
    info.chnl_pk = req.user.chnl_pk

    try{
        const result = await feedRepo.CreateFeed(info)
        if(result){
            res.send({ state: 'SUCCESS'})
        } else {
            res.send({ state: 'FAIL'})
        }
    }catch (err){
        next(err)
    }
})

// 피드 수정
router.put('/', isLoggedIn, isChannelAdmin, upload.single('img'),async (req,res,next)=>{
    let info = JSON.parse(req.body.info)
    const feed_pk = req.body.feed_pk
    if(req.file) {
        info.feed_img = '/' + config.path.feed + req.file.filename
    }
    info.chnl_pk = req.user.chnl_pk
    try{
        const result = await feedRepo.UpdateFeed(info, feed_pk)
        if(result){
            res.send({ state: 'SUCCESS'})
        } else {
            res.send({ state: 'FAIL'})
        }
    }catch (err){
        next(err)
    }
})


// 채널관리자 - 피드관리 - 피드 리스트
router.get('/list', isLoggedIn, isChannelAdmin, async(req,res,next)=>{
    const { pageNo, sort, keyword } = req.query
    const chnl_pk = req.user.chnl_pk
    try {
        const result = await feedRepo.SelectFeedList(chnl_pk, pageNo, sort, keyword)
        res.render('./channel-admin/feed-list',result)
    } catch(err) {
        next(err)
    }
})

// 피드 삭제
router.delete('/:feed_pk', isLoggedIn, isChannelAdmin, async(req,res,next)=>{
    const feed_pk = req.params.feed_pk
    try{
        const result = await feedRepo.DeleteFeed(feed_pk)
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
