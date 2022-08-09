const express   = require('express')
const multer    = require('multer')
const config    = require("../config/config")
const path      = require('path')
const router    = express.Router()
const { v4: uuidV4 } = require('uuid')
const memberRepo = require('../repository/member_repo')
const { isLoggedIn, isUserAndChannel } = require('./util')

// disk에 저장
const storage = multer.diskStorage({
    destination: function (req, file, cb) { // 파일 저장 경로
        cb(null, 'public/' + config.path.profile)
    },
    filename: function (req, file, cb) { // 저장할 파일 이름, 파일 이름 중복 방지를 위해 uuid 사용
        cb(null, uuidV4() + path.extname(file.originalname))
    }
})

const upload = multer({ storage })

// 마이 페이지 - 개인 정보 수정
router.put('/info', isLoggedIn, isUserAndChannel, upload.single('img'),async (req, res, next)=>{
    let info = JSON.parse(req.body.info)
    if(req.file){
        info.mem_img = '/' + config.path.profile + req.file.filename
    }

    try{
        let result
        if(req.user.user_type === 'user'){
            result = await memberRepo.UpdateMemberInfo(req.user.mem_pk, info)
        } else {
            const chnlInfo = JSON.parse(req.body.channel)
            result = await memberRepo.UpdateChannelAuthInfo(req.user.mem_pk, info, req.user.chnl_pk, chnlInfo)
        }

        if(result){
            res.send({state : 'SUCCESS'})
        }else{
            res.send({state : 'FAIL'})
        }
    }catch(err){
        next(err)
    }
})

module.exports = router;
