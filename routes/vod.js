const express   = require('express')
const router    = express.Router()
const broadcastRepo = require('../repository/broadcast_repo')
const { isLoggedIn, isChannelAdmin } = require('../routes/util')

// 채널관리자 - vod 생성
router.post('/:vod_pk', isLoggedIn, isChannelAdmin, async (req,res,next)=>{
    const vod_pk = req.params.vod_pk
    try{
        const result = await broadcastRepo.UpdateVod(vod_pk, 1)
        if(result){
            res.send({ state: 'SUCCESS' })
        } else {
            res.send({ state: 'FAIL'})
        }
    }catch (err){
        next(err)
    }
})

// 채널관리자 - vod 삭제
router.delete('/:vod_pk', isLoggedIn, isChannelAdmin, async (req,res,next)=>{
    const vod_pk = req.params.vod_pk
    try{
        const result = await broadcastRepo.UpdateVod(vod_pk, 0)
        if(result){
            return res.send({ state: 'SUCCESS' })
        } else {
            return res.send({ state: 'FAIL' })
        }
    }catch (err){
        next(err)
    }
})

// 채널관리자 - 채널 영상 관리 - vod 리스트 조회
router.get('/list/manage', isLoggedIn, isChannelAdmin, async(req,res,next)=>{
    const chnl_pk = req.user.chnl_pk
    const {sort, keyword, pageNo} = req.query
    try{
        const vodList = await broadcastRepo.SelectVodList( sort, pageNo, keyword, chnl_pk, "",1)
        const live    = await broadcastRepo.SelectLiveList(null,1,null,chnl_pk,null)
        res.render('./channel-admin/vod-list-manage', {...vodList, live : live.lives[0]})
    }catch (err){
        next(err)
    }
})

// 채널관리자 - 채널 영상 생성 - vod 리스트 조회
router.get('/list/create', isLoggedIn, isChannelAdmin, async(req,res,next)=>{
    const chnl_pk = req.user.chnl_pk
    const {pageNo} = req.query
    try{
        const result = await broadcastRepo.SelectVodList( null, pageNo, null, chnl_pk, "",0)
        res.render('./channel-admin/vod-list-create', result)
    }catch (err){
        next(err)
    }
})

module.exports = router;
