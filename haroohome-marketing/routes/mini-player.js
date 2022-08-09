const express   = require('express')
const { isLoggedIn } = require('./util')
const channelRepo = require('../repository/channel_repo')
const broadcastRepo = require('../repository/broadcast_repo')
const streamRepo = require('../repository/stream_repo')
const router    = express.Router()

router.get('/:secret_key' ,  async (req, res, next) => {
    console.log('미니플레이어 인입')
    const secret_key = req.params.secret_key
    let live0, products0, stream_title
    try {
        const {live, products} = await channelRepo.miniPlayer(secret_key)
        stream_title = await streamRepo.SelectLive(live.stream_application)
        live0 = live
        products0 = products
        res.render('./include/mini-player', {live : live0, products : products0, stream_title})
    }catch(err){
        console.log('error')
        next(err)
    }

})

module.exports = router;
