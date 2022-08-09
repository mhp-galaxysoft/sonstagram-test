let CryptoJS = require('crypto-js');
const request = require('request');

exports.sendSms = async (hp_no) => {
    const uri = 'ncp:sms:kr:262096729620:livefactory'//프로젝트 id / 서비스 id
    const secretKey = 'GLeGePvM07UirWpZYjY63eFdPuwzpcDkPOcuMic8' //마이페이지 > 계정설정 > 인증키 관리 Secret key
    const accessKey = 'nWBR2V3E4jK5ct3lrwBs' //마이페이지 > 계정설정 > 인증키 관리 Access  key
    const method = 'POST'
    const space = " "
    const newLine = "\n"
    const url = `https://sens.apigw.ntruss.com/sms/v2/services/${uri}/messages`
    const url2 = `/sms/v2/services/${uri}/messages`
    const hmac = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA256, secretKey)

    const date = Date.now().toString()

    hmac.update(method)
    hmac.update(space)
    hmac.update(url2)
    hmac.update(newLine)
    hmac.update(date)
    hmac.update(newLine)
    hmac.update(accessKey)

    const hash = hmac.finalize();
    const signature = await hash.toString(CryptoJS.enc.Base64)

    let randomVal = await Math.floor(Math.random() * 1000000)+100000
    if(randomVal > 1000000){
        randomVal = randomVal - 100000
    }

    return new Promise((resolve) => {
        request({
            method : method,
            json : true,
            uri : url,
            headers : {
                'Contenc-type': 'application/json; charset=utf-8',
                'x-ncp-apigw-timestamp': date,
                'x-ncp-iam-access-key': accessKey,
                'x-ncp-apigw-signature-v2': signature,
            },
            body : {
                "type":"SMS",
                "contentType":"COMM",
                "from":"01030085799",
                "content":"라이브팩토리 인증번호 입니다.",
                "messages":[
                    {
                        "to":`${hp_no}`,
                        "content":`안녕하세요 라이브팩토리입니다. 요청하신 인증번호는 [${randomVal}]입니다.`
                    }
                ]
            }
        }, function (err, res, html){
            if(err){
                console.error(err)
                resolve(false)
            }else{
                console.log(html)
                resolve(randomVal)
            }
        })
    })
}

