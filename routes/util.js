const redirectDirection = (user, res)=>{
    if(user.user_type === 'user'){
        res.redirect('/home/live')
    }else if(user.user_type === 'channelAdmin'){
        if(!user.chnl_pk){
            res.redirect('/channel-admin/join')
        }else{
            res.redirect('/channel-admin/video/vod/manage')
        }
    }else if(user.user_type === 'factoryAdmin'){
        res.redirect('/factory-admin/main')
    }else if(user.user_type === 'totalAdmin'){
        res.redirect('/total-admin/user')
    }
}

// 로그인 했을 때 진입 가능
exports.isLoggedIn = (req,res,next)=>{
    if(req.isAuthenticated()){
        next()
    }else{
        //로그인 안 한 상태로 접근 시 login 페이지로 이동
        res.redirect('/tutorial/login')
    }
}

// 로그인 안 했을 때 진입 가능
exports.isNotLoggedIn = (req,res,next)=>{
    if(!req.isAuthenticated()){
        next()
    }else{
        redirectDirection(req.user, res)
    }
}

// 일반 유저일 때 진입 가능
exports.isUser = (req,res,next) => {
    if( req.user.user_type === 'user' ){
        next()
    }else{
        redirectDirection(req.user, res)
    }
}

exports.isNewChannelAdmin = (req, res, next)=>{
    if( req.user.user_type === 'channelAdmin' && !req.user.chnl_pk){
        next()
    }else{
        redirectDirection(req.user, res)
    }
}

exports.isChannelAdmin = (req, res, next) =>{
    if( req.user.user_type === 'channelAdmin' && req.user.chnl_pk){
        next()
    }else{
        redirectDirection(req.user, res)
    }
}

exports.isFactoryAdmin = (req,res,next)=>{
    if( req.user.user_type === 'factoryAdmin' ){
        next()
    }else{
        redirectDirection(req.user, res)
    }
}

exports.isTotalAdmin = (req, res,next)=>{
    if( req.user.user_type === 'totalAdmin' ){
        next()
    }else{
        redirectDirection(req.user, res)
    }
}

exports.isNotTotalAdmin = (req, res,next)=>{
    if( req.user.user_type !== 'totalAdmin' ){
        next()
    }else{
        redirectDirection(req.user, res)
    }
}

exports.isUserAndChannel = (req, res, next) => {
    if(req.user.user_type === 'user' || req.user.user_type === 'channelAdmin'){
        next()
    }else{
        redirectDirection(req.user, res)
    }
}

exports.isUserAndFactory = (req, res, next) => {
    if(req.user.user_type === 'user' || req.user.user_type === 'factoryAdmin'){
        next()
    }else{
        redirectDirection(req.user, res)
    }
}
