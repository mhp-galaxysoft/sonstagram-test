const SocketIO = require('socket.io')
const broadcastRepo = require('./repository/broadcast_repo')
module.exports = (server, app) =>{
    //const io = SocketIO(server,{ path : "/socket.io",'pingInterval': 10000 }) // SocketIO 객체 선언
    const io = SocketIO(server,{ path : "/socket.io" }) // SocketIO 객체 선언
    app.set('io',io) // 서버 다른 곳에서도 socket 사용할 수 있도록 app 전역 변수로 등록

    // namespace 선언
    const chat = io.of('/chat')

    chat.on('connection',(socket)=>{
        socket.on('newRoom', (data)=> {
            socket.room = data.live_pk
            socket.join(socket.room) //방에 접속
        })

        socket.on('newLive',async (data)=>{
            const req = socket.request
            const {headers : {referer}} = req

            socket.room = referer.split('/')[referer.split('/').length-1].replace(/\?.+/,'')
            socket.join(socket.room) //방에 접속

            socket.user = data
            const concurrentUser = await broadcastRepo.UpdateLiveCcuAdd(socket.room)
            chat.to(socket.room).emit('join',{concurrentUser})
            chat.to(socket.room).emit('count', socket.room)
            console.log(`${concurrentUser}번째 시청자가 ${socket.room}번방에 입장하였습니다.`)
        })

        socket.on('disconnect',async (data)=>{
            if(socket.room){
                const concurrentUser = await broadcastRepo.UpdateLiveCcuSub(socket.room)
                chat.to(socket.room).emit('exit',{concurrentUser})
                console.log(`[${data}] ${socket.room}번방에서 시청자가 퇴장하였습니다. 남은 인원 : ${concurrentUser}`)
                socket.leave(socket.room) // socket 을 room 에서 내보내기
            }
        })
       socket.on('update', () => {
           chat.to(socket.room).emit('updateInfo')
        })
    })
}
