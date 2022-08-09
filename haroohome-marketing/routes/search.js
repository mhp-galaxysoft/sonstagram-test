const express = require('express')
const { isLoggedIn, isUser } = require('./util')
const searchRepo = require('../repository/search_repo')
let router = express.Router()

// 전체 검색 - 상품
router.get('/product', isLoggedIn, isUser, async (req,res,next) => {
    const { keyword, pageNo } = req.query
    if(keyword) {
        const result = await searchRepo.ProductSearch(keyword, pageNo)
        res.render('./search/search-product', result)
    } else {
        const result = {
            products: "",
            keyword : "",
            rowCnt: 0,
            pageNo: 0,
            rowUnit: 0,
            pageUnit: 0,
            pageCnt: 0,
            bucketCnt: 0,
            bucketNo: 0,
            startPage: 0,
            endPage: 0,
            currentPageCnt: 0,
            yn_next: 0,
            yn_prev: 0,
            startRow: 0
        }
        res.render('./search/search-product', result)
    }
})

// 전체 검색 - 채널
router.get('/channel', isLoggedIn, isUser, async (req,res,next) => {
    let result
    const { keyword, pageNo } = req.query
    if (keyword) {
        result = await searchRepo.ChannelSearch(keyword, pageNo)
    } else {
        result = {
            channels: "",
            keyword : "",
            rowCnt: 0,
            pageNo: 0,
            rowUnit: 0,
            pageUnit: 0,
            pageCnt: 0,
            bucketCnt: 0,
            bucketNo: 0,
            startPage: 0,
            endPage: 0,
            currentPageCnt: 0,
            yn_next: 0,
            yn_prev: 0,
            startRow: 0
        }
    }
    res.render('./search/search-channel', result)
})

// 전체 검색 - 라이브
router.get('/live', isLoggedIn, isUser, async (req,res,next) => {
    let result
    const { keyword, pageNo } = req.query
    if (keyword) {
        result = await searchRepo.LiveSearch(keyword, pageNo)
    } else {
        result = {
            lives: "",
            keyword : "",
            rowCnt: 0,
            pageNo: 0,
            rowUnit: 0,
            pageUnit: 0,
            pageCnt: 0,
            bucketCnt: 0,
            bucketNo: 0,
            startPage: 0,
            endPage: 0,
            currentPageCnt: 0,
            yn_next: 0,
            yn_prev: 0,
            startRow: 0
        }
    }
    res.render('./search/search-live', result)
})

router.get('/vod', isLoggedIn, isUser, async (req,res,next) => {
    let result
    const { keyword, pageNo } = req.query
    if (keyword) {
        result = await searchRepo.VodSearch(keyword, pageNo)
    } else {
        result = {
            vod: "",
            keyword : "",
            rowCnt: 0,
            pageNo: 0,
            rowUnit: 0,
            pageUnit: 0,
            pageCnt: 0,
            bucketCnt: 0,
            bucketNo: 0,
            startPage: 0,
            endPage: 0,
            currentPageCnt: 0,
            yn_next: 0,
            yn_prev: 0,
            startRow: 0
        }
    }
    res.render('./search/search-vod', result)
})

module.exports = router;
