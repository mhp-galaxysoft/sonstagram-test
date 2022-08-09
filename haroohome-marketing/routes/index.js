const express = require('express')
const router = express.Router()
const broadcastRepo = require('../repository/broadcast_repo')
const { isNotLoggedIn } = require('./util')

router.use(async (req,res,next) => {
  res.locals.user = req.user
  next()
})

// 서비스페이지
router.get('/', isNotLoggedIn, (req, res, next) => {
  res.render('./index/service-index')
})

// 서비스페이지 - 라이브 쇼핑 바로가기
router.get('/live', isNotLoggedIn, async (req, res, next) => {
  const lives = await broadcastRepo.SelectLiveListHot()
  res.render('./index/service-live', {lives})
})

module.exports = router;
