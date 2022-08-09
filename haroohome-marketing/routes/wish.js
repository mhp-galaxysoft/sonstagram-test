const express = require('express')
const { isLoggedIn, isUser } = require('./util')
let router = express.Router()
const wishRepo = require('../repository/wish_repo')

// 위시리스트 등록
router.post('/:product_pk', isLoggedIn, isUser, async (req, res, next)=>{
    const product_pk = req.params.product_pk
    const mem_pk = req.user.mem_pk
    try {
        const result = await wishRepo.addWishList(product_pk, mem_pk)
        if(result){
            res.send({ state: 'SUCCESS' })
        } else {
            res.send({ state: 'FAIL' })
        }
    }catch (err){
        next(err)
    }
})

// 위시리스트 삭제
router.delete('/:product_pk', isLoggedIn, isUser, async (req,res,next) => {
    const product_pk = req.params.product_pk
    const mem_pk = req.user.mem_pk
    try {
        const result = await wishRepo.removeWishList(product_pk, mem_pk)
        if(result){
            res.send({ state: 'SUCCESS' })
        } else {
            res.send({ state: 'FAIL' })
        }
    }catch (err){
        next(err)
    }
})

module.exports = router;
