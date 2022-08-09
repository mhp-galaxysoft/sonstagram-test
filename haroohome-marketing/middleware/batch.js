const schedule = require('node-schedule')
const request = require('request-promise')
const mysql = require('mysql')
const db = require('./db_factory')
const logger = require('../middleware/logger')
const action = require('../middleware/logger_action')
const auth = require('../config/stream_config.json')
const broadcastRepo = require('../repository/broadcast_repo')
const moment = require('moment')

const headers = { // 공통 헤더
    'Accept': 'application/json; charset=utf-8',
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Expose-Headers': 'Date, Server, Content-Type, Content-Length',
    'Access-Control-Allow-Methods': 'OPTIONS, GET, POST, HEAD',
    'Access-Control-Allow-Headers': 'Content-Type, User-Agent, If-Modified-Since, Cache-Control, Range'
}

const countLiveTimeScheduler = (live_pk, channel, room)=>{
    const chnl_pk = channel.chnl_pk
    const applicationName = channel.stream_application
    let totalTime = channel.stream_plan_time + channel.stream_coupon_time // 라이브 가능 시간 계산 - plan 시간 + 쿠폰 시간

    const options = {
        url: `http://110.93.134.242:8087/v2/servers/_defaultServer_/vhosts/_defaultVHost_/applications/${applicationName}/instances`,
        method: 'GET',
        headers,
        auth
    }

    schedule.scheduleJob(String(live_pk), '*/5 * * * * *', async (date)=>{ // 5초마다 수행될 스케줄러 등록
        try{
            if(totalTime <= 0){ // 시간이 모두 소요됐을 때
                const query = `UPDATE f_channel SET stream_plan_time = 0, stream_coupon_time = 0 
                           WHERE chnl_pk = ${mysql.escape(chnl_pk)}`
                db.query(query)

                // 스케줄러 삭제하고 라이브에 들어가 있는 사람 모두 내보내기
                const countSchedule = schedule.scheduledJobs[live_pk]
                countSchedule.cancel()
                room.emit("time out")
            }else{
                let result1 = await request(options, (error, res, body) => {
                    if (!error && res.statusCode == 200) {
                        return body
                    }
                })
                result1 = JSON.parse(result1)
                let streams = result1.instanceList
                if(streams.length === 0 || streams[0].incomingStreams.length === 0){
                    broadcastRepo.DeleteLive(chnl_pk, live_pk, applicationName)
                    countLiveTimeSchedulerStop(live_pk, channel)
                    room.emit("compulsion")
                } else {
                    totalTime -= 5
                    schedule.scheduledJobs[live_pk].remainTime = totalTime
                    console.log(totalTime)
                }
            }
        }catch (e) {
            console.error(e)
        }
    })
}

const countLiveTimeSchedulerStop = (live_pk, channel) => {
    const countSchedule = schedule.scheduledJobs[live_pk] // 등록된 스케줄러들 중에서 삭제할 스케줄러 조회
    try{
        if(countSchedule) { // 이미 시간 만료로 스케줄러 종료된 경우에는 수행 X
            const usedTime = channel.stream_plan_time + channel.stream_coupon_time - countSchedule.remainTime // 사용한 시간 구하기 (전체 가능 시간 - 소요 시간)

            // plan 시간, 쿠폰 시간 정의
            let planTime
            let couponTime = channel.stream_coupon_time

            // 먼저 plan 시간 사용하고 이후에 쿠폰 시간 사용하도록
            // plan 시간보다 덜 썼으면 plan 시간에서만 깎기
            if(usedTime <= channel.stream_plan_time){
                planTime = channel.stream_plan_time - usedTime
            }else{
                // plan 시간 다 썼으면 plan 시간 0 만들고, 나머지 사용 시간은 쿠폰 시간에서 제하기
                planTime = 0
                couponTime = channel.stream_coupon_time - (usedTime - channel.stream_plan_time)
                couponTime = couponTime > 0 ? couponTime : 0
            }

            // stream_plan_time, stream_coupon_time 업데이트
            const query = `UPDATE f_channel SET stream_plan_time = ${mysql.escape(planTime)}, stream_coupon_time = ${mysql.escape(couponTime)} 
                       WHERE chnl_pk = ${mysql.escape(channel.chnl_pk)}`
            db.query(query)

            // 스케줄러 삭제
            countSchedule.cancel()

        }
    }catch (e) {
        console.error(e)
    }

}

// 매달 플랜 결제
const planScheduler = ()=>{
    // 매일 자정에 실행
    schedule.scheduleJob('0 0 0 * * *',  async ()=>{
        const pool = db.pool
        const conn = await pool.getConnection()

        try{
            await conn.beginTransaction()

            const query1 = `SELECT DAY(LAST_DAY(NOW())) AS last_day`
            const [[{last_day}]] = await conn.execute(query1) //이번 달 마지막 일
            if(!last_day){
                await conn.rollback()
                return false
            }

            const nowDate = new Date().getDate() // 오늘 일자

            /**
             *결제 예정 플랜을 현재 플랜으로 변경
             */
            let query2
            if(nowDate === last_day){ // 마지막 날인 경우
                query2 = `UPDATE f_plan_scheduler
                          SET current_plan_pk = scheduled_plan_pk
                          WHERE ps_pk IN (SELECT ps_pk from (SELECT ps_pk FROM f_plan_scheduler WHERE DAY(ps_plan_start_date) >= ${mysql.escape(last_day)}) AS temp)`
            }else{
                query2 = `UPDATE f_plan_scheduler
                          SET current_plan_pk = scheduled_plan_pk // schaduled_plan_pk = 다음달 결제 풀랜
                          WHERE ps_pk IN (SELECT ps_pk from (SELECT ps_pk FROM f_plan_scheduler WHERE DAY(ps_plan_start_date) = ${mysql.escape(nowDate)}) AS temp)`
            }

            const [result1] = await conn.query(query2)
            if(!result1){
                await conn.rollback()
                return false
        }

            /**
             *  결제 플랜에 따라 플랜 시간 초기화
             */
            let query3
            if(nowDate === last_day){ // 마지막 날인 경우
                query3 = `UPDATE f_channel fc, (
                                SELECT fps.chnl_pk, IFNULL(TIME_TO_SEC(fp.plan_limited_time),0) AS plan_time FROM f_plan_scheduler fps
                                LEFT OUTER JOIN f_plan fp
                                ON fp.plan_pk = fps.scheduled_plan_pk
                                WHERE DAY(ps_plan_start_date) >= ${mysql.escape(last_day)}
                            ) s
                            SET fc.stream_plan_time = s.plan_time
                            WHERE fc.chnl_pk = s.chnl_pk`
            }else{
                query3 = `UPDATE f_channel fc, (
                                SELECT fps.chnl_pk, IFNULL(TIME_TO_SEC(fp.plan_limited_time),0) AS plan_time FROM f_plan_scheduler fps
                                LEFT OUTER JOIN f_plan fp
                                ON fp.plan_pk = fps.scheduled_plan_pk
                                WHERE DAY(ps_plan_start_date) = ${mysql.escape(nowDate)}
                            ) s
                            SET fc.stream_plan_time = s.plan_time
                            WHERE fc.chnl_pk = s.chnl_pk`
            }

            const [result3] = await conn.query(query3)
            if(!result3){
                await conn.rollback()
                return false
            }

            // 플랜 탈퇴한 사용자는 결제 중지
            let query4
            if(nowDate === last_day){
                query4 = `DELETE FROM f_plan_scheduler WHERE DAY(ps_plan_start_date) >= ${mysql.escape(last_day)} AND current_plan_pk = 0`
            }else{
                query4 = `DELETE FROM f_plan_scheduler WHERE DAY(ps_plan_start_date) = ${mysql.escape(nowDate)} AND current_plan_pk = 0`
            }
            const [result4] = await conn.query(query4)
            if(!result4){
                await conn.rollback()
                return false
            }

            await conn.commit()
            return true
        }catch (err){
            console.error(err)
            await conn.rollback()
            return false
        }finally {
            await conn.release()
        }
    })
}

module.exports = {
    countLiveTimeScheduler,
    countLiveTimeSchedulerStop,
    planScheduler
};
