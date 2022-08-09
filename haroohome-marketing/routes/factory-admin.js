const express = require('express')
const { isLoggedIn, isFactoryAdmin } = require('./util') // factory 관리자 계정 확인 필요
const factoryRepo = require('../repository/factory_repo')
const memberRepo = require('../repository/member_repo')
const adminRepo = require('../repository/admin_repo')
const multer    = require('multer')
const config    = require("../config/config")
const mail = require('../middleware/mail')
const path      = require('path')
const { v4: uuidV4 } = require('uuid')
const logger = require('../middleware/logger')
const action = require('../middleware/logger_action')
const router = express.Router()

// disk에 저장
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/' + config.path.factory)
  },
  filename: function (req, file, cb) {
    cb(null, uuidV4() + path.extname(file.originalname))
  }
})

const upload = multer({
  storage
})

// 메인 페이지
router.get('/main', isLoggedIn, isFactoryAdmin, async (req, res, next) => {
  const factory_pk = req.user.factory_pk
  try{
    const result = await factoryRepo.SelectStatisticInfo(factory_pk)
    res.render('./factory-admin/factory-main', result)
  }catch(err){
    next(err)
  }
})

// 메인 페이지에 통계 정보 가져오기
router.get('/main/statistic/:startDate/:lastDate', isLoggedIn, isFactoryAdmin, async (req, res, next) => {
  const {startDate , lastDate} = req.params
  const factory_pk = req.user.factory_pk
  try{
    const result = await factoryRepo.SelectStatisticInfo(factory_pk, startDate, lastDate)
    res.send( result )
  }catch (err){
    next(err)
  }
})

// 팩토리 관리자 - 프로필 수정 페이지
router.get('/info', isLoggedIn, isFactoryAdmin, (req, res, next) => {
  res.render('./factory-admin/factory-info')
})

// 팩토리 관리자 - 프로필 수정하기
router.put('/info', upload.single('img'), isLoggedIn, isFactoryAdmin, async (req,res,next) => {
  let info = JSON.parse(req.body.info)
  if(req.file){
    info.factory_img = '/' + config.path.factory + req.file.filename
  }
  const id = req.user.factory_id
  try{
    const result = await factoryRepo.UpdateFactoryInfo(id, info)
    if(result){
      res.send({ state: 'SUCCESS' })
    } else {
      res.send({ state: 'FAIL' })
    }
  }catch (err){
    next(err)
  }
})

// 통계 설정 - 채널 선택
router.get('/statistic', isLoggedIn, isFactoryAdmin, async (req, res, next) => {
  res.render('./factory-admin/factory-statistic')
})

// 통계 설정 - 채널 리스트
router.get('/statistic/list', isLoggedIn, isFactoryAdmin, async (req,res,next) => {
  let result
  const factory_pk = req.user.factory_pk
  try{
    result = await factoryRepo.SelectStatisticChannel(factory_pk)
    res.render('./factory-admin/factory-statistic-channel-list', { channel : result })
  }catch (err){
    next(err)
  }
})

// 통계 설정 - 채널 선택 후 상품 선택
router.post('/statistic/product', isLoggedIn, isFactoryAdmin, async (req, res, next) => {
  let result
  let channel = req.body.channel
  channel = channel.split(',')
  try{
    result = await factoryRepo.SelectStatisticProduct(channel)
    res.render('./factory-admin/factory-statistic-product', result )
  }catch (err){
    next(err)
  }
})

// 통계 기록 저장
router.post('/statistic/save', isLoggedIn, isFactoryAdmin, async (req, res, next) => {
  const factory_pk = req.user.factory_pk
  const products = req.body.statistic_products
  try {
    const result = await factoryRepo.SaveStatisticInfo(factory_pk, products)
    if(result){
      res.send({ state: 'SUCCESS' })
    } else {
      res.send({ state: 'FAIL' })
    }
  }catch (err){
    next(err)
  }
})

// 소속 채널 관리
router.get('/channel/manage', isLoggedIn, isFactoryAdmin, async (req, res, next) => {
  try {
    const result = await adminRepo.SelectCategoryOptions()
    res.render('./factory-admin/factory-channel-manage',{ category : result })
  } catch (err){
    next(err)
  }
})

// 소속 채널 리스트
router.get('/channel/manage/list', isLoggedIn, isFactoryAdmin, async (req, res, next) => {
  const { pageNo, keyword, category_pk } = req.query
  const factory_pk = req.user.factory_pk
  try{
    const result = await factoryRepo.SelectChannelList(factory_pk, pageNo, keyword, category_pk)
    res.render('./factory-admin/factory-channel-manage-list', result)
  }catch(err){
    next(err)
  }
})

// 초대할 멤버 확인
/* 해당 이메일을 가진 채널관리자가 있다면 초대 메일 보내기 */
router.post('/channel/manage/invite/check', isLoggedIn, isFactoryAdmin, async (req, res, next) => {
  const mem_id = req.body.mem_id
  const factory_pk = req.user.factory_pk

  try{
    const channel = await memberRepo.SelectChannelForId(mem_id)
    if(!channel){
      res.send({state : 'FAIL'})
    }

    const chnl_pk = channel.chnl_pk
    const state = await memberRepo.SelectChannelFactory(chnl_pk, factory_pk)
    res.send({ state : state, chnl_pk : chnl_pk })
  }catch(err){
    next(err)
  }
})

// 새 채널 초대
router.post('/channel/manage/invite', isLoggedIn, isFactoryAdmin, async (req, res, next) => {
  const ip = req.headers['x-forwarded-for'] ||req.connection.remoteAddress ||req.socket.remoteAddress ||req.connection.socket.remoteAddress;
  const { channel, chnl_pk } = req.body
  const factory_pk = req.user.factory_pk
  const factory_name = req.user.factory_name
  try{
    for(let i=0; i<channel.length; i++){
      const mailResult = await mail.sendInvitation(factory_pk, factory_name, channel[i])
      if(!mailResult){
        logger.error('[FAIL] mail => sendInvitation', {
          log_router   : '/factory-admin/channel/manage/invite',
          user_type    : req.user.user_type,
          user_ip      : ip,
          user_pk      : factory_pk,
          user_id      : req.user.factory_id,
          target_type  : action.target.FACTORY,
          target_pk    : chnl_pk[i], // 채널 pk
          action_type  : action.log.FACTORY.invite
        })
        return res.send({state : 'FAIL'})
      } else {
        logger.info('[SUCCESS] mail => sendInvitation', {
          log_router   : '/factory-admin/channel/manage/invite',
          user_type    : req.user.user_type,
          user_ip      : ip,
          user_pk      : factory_pk,
          user_id      : req.user.factory_id,
          target_type  : action.target.FACTORY,
          target_pk    : chnl_pk[i], // 채널 pk
          action_type  : action.log.FACTORY.invite
        })
      }
    }
    res.send({state : 'SUCCESS'})
  }catch(err){
    logger.error(`[ERROR] => ${err}`, {
      log_router   : '/factory-admin/channel/manage/invite',
      user_type    : req.user.user_type,
      user_ip      : ip,
      user_pk      : factory_pk,
      user_id      : req.user.factory_id,
      target_type  : action.target.FACTORY,
      target_pk    : 0,
      action_type  : action.log.FACTORY.invite
    })
    next(err)
  }
})

// 팩토리 관리자 탈퇴 요청
router.get('/leave', isLoggedIn, async (req,res,next)=>{
  const ip = req.headers['x-forwarded-for'] ||req.connection.remoteAddress ||req.socket.remoteAddress ||req.connection.socket.remoteAddress;
  try {
    const factory_pk = req.user.factory_pk
    const result = await factoryRepo.DeleteFactory(factory_pk)
    if(result){
      logger.info('[SUCCESS] factoryRepo => DeleteFactory', {
        log_router   : '/factory-admin/leave',
        user_type    : req.user.user_type,
        user_ip      : ip, // 현재 ip
        user_pk      : req.user.factory_pk,
        user_id      : req.user.factory_id,
        target_type  : action.target.ADMIN,
        target_pk    : 0,
        action_type  : action.log.USER.signout
      })
      req.logout()
      req.session.destroy()
      res.send({ state: 'SUCCESS' })
    } else {
      logger.error('[FAIL] factoryRepo => DeleteFactory', {
        log_router   : '/factory-admin/leave',
        user_type    : req.user.user_type,
        user_ip      : ip, // 현재 ip
        user_pk      : req.user.factory_pk,
        user_id      : req.user.factory_id,
        target_type  : action.target.ADMIN,
        target_pk    : 0,
        action_type  : action.log.USER.signout
      })
      res.send({ state: 'FAIL' })
    }
  }catch (err){
    logger.error(`[ERROR] => ${err}`, {
      log_router   : '/factory-admin/leave',
      user_type    : req.user.user_type,
      user_ip      : ip, // 현재 ip
      user_pk      : req.user.factory_pk,
      user_id      : req.user.factory_id,
      target_type  : action.target.ADMIN,
      target_pk    : 0,
      action_type  : action.log.USER.signout
    })
    next(err)
  }
})

module.exports = router;
