const express = require('express')
let router = express.Router()

router.get('/mobile/index', async(req, res, next)=>{
    res.render('./marketing/mobile/index')
})
router.get('/mobile/company', async(req, res, next)=>{
    res.render('./marketing/mobile/company')
})
router.get('/mobile/sd', async(req, res, next)=>{
    res.render('./marketing/mobile/sd')
})
router.get('/mobile/live', async(req, res, next)=>{
    res.render('./marketing/mobile/live')
})
router.get('/mobile/cs', async(req, res, next)=>{
    res.render('./marketing/mobile/cs')
})

router.get('/pc/index', async(req, res, next)=>{
    res.render('./marketing/pc/index')
})

router.get('/pc/company', async(req, res, next)=>{
    res.render('./marketing/pc/company')
})

router.get('/pc/sd', async(req, res, next)=>{
    res.render('./marketing/pc/sd')
})

router.get('/pc/live', async(req, res, next)=>{
    res.render('./marketing/pc/live')
})

router.get('/pc/cs', async(req, res, next)=>{
    res.render('./marketing/pc/cs')
})

module.exports = router;
