const express = require('express')
const { isLoggedIn, isUser } = require('./util')
const channelRepo = require('../repository/channel_repo')
const broadcastRepo = require('../repository/broadcast_repo')
const adminRepo = require('../repository/admin_repo')
let router = express.Router()

// home - live
router.get('/live', isLoggedIn, isUser, async(req, res, next)=>{
    try {
        const result = await adminRepo.SelectCategoryOptions()
        res.render('./home/home-live',{ category : result })
    } catch (err){
        next(err)
    }
})

// home - vod
router.get('/vod', isLoggedIn, isUser, async(req, res, next)=>{
    try {
        const result = await adminRepo.SelectCategoryOptions()
        res.render('./home/home-vod', { category : result })
    } catch (err){
        next(err)
    }
})

// home - channel
router.get('/channel', isLoggedIn, isUser, async(req, res, next)=>{
    try {
        const result = await adminRepo.SelectCategoryOptions()
        res.render('./home/home-channel', { category : result })
    } catch (err){
        next(err)
    }
})

// home - 라이브 리스트
router.get('/live/list/now', isLoggedIn, isUser, async function(req,res,next){
    const {category_pk, keyword, pageNo} = req.query
    try{
        const result = await broadcastRepo.SelectLiveList("", pageNo, keyword, "", category_pk)
        res.render('./home/live-list-now',result)
    }catch (err){
        next(err)
    }
})

// home - 인기 라이브 리스트
router.get('/live/list/hot', isLoggedIn, isUser, async (req,res,next) => {
    const {category_pk, keyword} = req.query
    try{
        const lives = await broadcastRepo.SelectLiveListHot(category_pk, keyword)
        res.render('./home/live-list-hot',{lives})
    }catch (err){
        next(err)
    }
})

// home - 채널 리스트
router.get('/channel/list', isLoggedIn, isUser, async (req,res,next) => {
    const mem_pk = req.user.mem_pk
    const {sort, keyword, pageNo} = req.query
    try{
        const result = await channelRepo.SelectChannelList(mem_pk, sort, pageNo, keyword )
        res.render('./home/channel-list',result)
    }catch (err){
        next(err)
    }
})

// home - vod 리스트
router.get('/vod/list', isLoggedIn, isUser, async (req,res,next) =>{
    const { keyword, pageNo, category_pk } = req.query
    try{
        const result = await broadcastRepo.SelectVodList("", pageNo, keyword, null, category_pk, 1)
        res.render('./home/vod-list', result)
    }catch (err){
        next(err)
    }
})
module.exports = router;
