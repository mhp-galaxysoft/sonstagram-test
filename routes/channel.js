const express = require('express')
const { isLoggedIn, isUser, isUserAndFactory } = require('./util')
const channelRepo = require('../repository/channel_repo')
const feedRepo = require('../repository/feed_repo')
const broadcastRepo = require('../repository/broadcast_repo')
let router = express.Router()

// 채널 구경 - 영상 페이지
router.get('/main/:chnl_pk/live', isLoggedIn, isUserAndFactory, async (req, res, next) => {
    const chnl_pk = req.params.chnl_pk
    const mem_pk = req.user.mem_pk
    try{
        const channelInfo = await channelRepo.SelectChannelVisit(chnl_pk, mem_pk)
        res.render('./channel/channel-live', channelInfo )
    }catch (err){
        next(err)
    }
})

// 채널 구경 - 라이브, vod 영상 리스트
router.get('/channel-live-list/:chnl_pk', isLoggedIn, isUserAndFactory, async(req,res,next)=>{
    const { sort, keyword, pageNo } = req.query
    const chnl_pk = req.params.chnl_pk
    try{
        const {lives} = await broadcastRepo.SelectLiveList( sort, pageNo, keyword,chnl_pk, '' )
        const result2 = await broadcastRepo.SelectVodList(sort, pageNo, keyword, chnl_pk, '', 1)
        res.render('./channel/channel-live-list',{lives, ...result2})
    }catch (err){
        next(err)
    }
})

// 채널 구경 - 피드 페이지
router.get('/main/:chnl_pk/feed', isLoggedIn, isUserAndFactory, async (req, res, next) => {
    const chnl_pk = req.params.chnl_pk
    const mem_pk = req.user.mem_pk
    try{
        const channelInfo = await channelRepo.SelectChannelVisit(chnl_pk, mem_pk)
        res.render('./channel/channel-feed', channelInfo )
    }catch (err){
        next(err)
    }
})

// 채널 구경 - 피드 리스트
router.get('/channel-feed-list/:chnl_pk', isLoggedIn, isUserAndFactory, async(req,res,next)=>{
    const { pageNo, sort, keyword } = req.query
    const chnl_pk = req.params.chnl_pk
    try{
        const feeds = await feedRepo.SelectFeedList(chnl_pk, pageNo, sort, keyword)
        res.render('./channel/channel-feed-list', feeds)
    }catch (err){
        next(err)
    }
})

// 채널 구경 - 피드 자세히보기
router.get('/main/:chnl_pk/feed/:feed_pk', isLoggedIn, isUserAndFactory, async (req,res,next) => {
    const feed_pk = req.params.feed_pk
    try{
        const feed = await feedRepo.SelectFeed(feed_pk)
        res.render('./channel/channel-feed-detail', feed)
    }catch (err){
        next(err)
    }
})

// 채널 구경 - 상품 페이지
router.get('/main/:chnl_pk/product', isLoggedIn, isUserAndFactory, async (req, res, next) => {
    const chnl_pk = req.params.chnl_pk
    const mem_pk = req.user.mem_pk
    try {
        const channelInfo = await channelRepo.SelectChannelVisit(chnl_pk, mem_pk)
        res.render('./channel/channel-product', channelInfo )
    }catch (err){
        next(err)
    }
})

// 채널 구경 - 상품 리스트
router.get('/channel-product-list/:chnl_pk', isLoggedIn, isUserAndFactory, async(req,res,next)=>{
    const { pageNo, sort, keyword } = req.query
    const chnl_pk = req.params.chnl_pk
    const mem_pk = req.user.mem_pk
    try{
        const products = await channelRepo.SelectProductList(chnl_pk, sort, pageNo, keyword, mem_pk)
        res.render('./channel/channel-product-list', products)
    }catch (err){
        next(err)
    }
})

// 후기 리스트 페이지
router.get('/main/:chnl_pk/product/:product_pk/review', isLoggedIn, isUserAndFactory, async (req,res,next) => {
    const {chnl_pk, product_pk} = req.params
    const mem_pk = req.user.mem_pk
    try {
        const channelInfo = await channelRepo.SelectChannelVisit(chnl_pk, mem_pk)
        res.render('./channel/channel-product-review', {product_pk, ...channelInfo})
    }catch (err) {
        next(err)
    }
})

// 후기 생성 페이지
router.get('/main/:chnl_pk/product/:product_pk/review/newReview', isLoggedIn, isUser, async (req,res,next) => {
    const { chnl_pk, product_pk } = req.params
    const mem_pk = req.user.mem_pk
    try {
        const channelInfo = await channelRepo.SelectChannelVisit(chnl_pk, mem_pk)
        const product = await channelRepo.SelectProduct(product_pk)
        res.render('./channel/channel-product-review-regist', {product_pk, product, ...channelInfo})
    }catch (err){
        next(err)
    }
})

// 문의 리스트 페이지
router.get('/main/:chnl_pk/product/:product_pk/inquiry', isLoggedIn, isUserAndFactory, async (req,res,next) => {
    const {chnl_pk, product_pk} = req.params
    const mem_pk = req.user.mem_pk
    try{
        const channelInfo = await channelRepo.SelectChannelVisit(chnl_pk, mem_pk)
        res.render('./channel/channel-product-inquiry', {product_pk, ...channelInfo})
    }catch (err){
        next(err)
    }
})

// 문의 생성 페이지
router.get('/main/:chnl_pk/product/:product_pk/inquiry/newInquiry', isLoggedIn, isUser, async (req,res,next) => {
    const chnl_pk = req.params.chnl_pk
    const product_pk = req.params.product_pk
    const mem_pk = req.user.mem_pk
    try{
        const channelInfo = await channelRepo.SelectChannelVisit(chnl_pk, mem_pk)
        const product = await channelRepo.SelectProduct(product_pk)
        res.render('./channel/channel-product-inquiry-regist', {product_pk, product, ...channelInfo})
    }catch (err){
        next(err)
    }
})

module.exports = router;
