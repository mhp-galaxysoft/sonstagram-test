const request = require('request-promise')
const auth = require('../config/stream_config.json')
const headers = { // 공통 헤더
    'Accept': 'application/json; charset=utf-8',
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Expose-Headers': 'Date, Server, Content-Type, Content-Length',
    'Access-Control-Allow-Methods': 'OPTIONS, GET, POST, HEAD',
    'Access-Control-Allow-Headers': 'Content-Type, User-Agent, If-Modified-Since, Cache-Control, Range'
}

// 라이브 어플리케이션 생성 - 채널 신청 시
exports.CreateApplication = async (applicationName)=>{
    const options = {
        url: `http://110.93.134.242:8087/v2/servers/_defaultServer_/vhosts/_defaultVHost_/applications/${applicationName}`,
        method: 'POST',
        auth,
        headers,
        body : {
            "name": `${applicationName}`,
            "serverName": "_defaultServer_",
            "appType": "Live",
            "applicationTimeout": 0,
            "pingTimeout": 0,
            "clientStreamReadAccess": "*",
            "clientStreamWriteAccess": "*",
            "avSyncMethod": "senderreport",
            "maxRTCPWaitTime": 12000,
            "httpCORSHeadersEnabled": true,
            "httpStreamers": [ // 무조건 이 5개 있어야 함
                "cupertinostreaming",
                "smoothstreaming",
                "sanjosestreaming",
                "mpegdashstreaming",
                "dvrchunkstreaming"
            ],
            "mediaReaderRandomAccessReaderClass": "",
            "httpOptimizeFileReads": false,
            "mediaReaderBufferSeekIO": false,
            "captionLiveIngestType": "",
            "securityConfig": { // 보안 설정
                "serverName": "_defaultServer_",
                "secureTokenVersion": 0,
                "clientStreamWriteAccess": "*",
                "publishRequirePassword": true,
                "publishPasswordFile": "",
                "publishRTMPSecureURL": "",
                "publishIPBlackList": "",
                "publishIPWhiteList": "",
                "publishBlockDuplicateStreamNames": true,
                "publishValidEncoders": "",
                "publishAuthenticationMethod": "digest",
                "playMaximumConnections": 20, // 50명 제한 plan이면 51로 해야 함
                "playRequireSecureConnection": false,
                "secureTokenSharedSecret": "",
                "secureTokenUseTEAForRTMP": false,
                "secureTokenIncludeClientIPInHash": false,
                "secureTokenHashAlgorithm": "",
                "secureTokenQueryParametersPrefix": "",
                "secureTokenOriginSharedSecret": "",
                "playIPBlackList": "",
                "playIPWhiteList": "",
                "playAuthenticationMethod": "none"
            },
            "streamConfig": {
                "serverName": "_defaultServer_",
                "streamType": "live-record-lowlatency", // low-latency 설정
                "storageDir": "${com.wowza.wms.context.VHostConfigHome}/content",
                "createStorageDir": false,
                "storageDirExists": true,
                "keyDir": "${com.wowza.wms.context.VHostConfigHome}/keys",
                "liveStreamPacketizer": [
                    "cupertinostreamingpacketizer",
                    "dvrstreamingpacketizer",
                    "mpegdashstreamingpacketizer",
                    "sanjosestreamingpacketizer",
                    "smoothstreamingpacketizer"
                ],
                "httpRandomizeMediaName": false
            },
            "dvrConfig": { // vod 설정
                "serverName": "_defaultServer_",
                "licenseType": "Subscription",
                "inUse": false,
                "dvrEnable": true, // vod 사용하게 설정 => true
                "recorders": "dvrrecorder",
                "store": "dvrfilestorage",
                "windowDuration": 0,
                "storageDir": "${com.wowza.wms.context.VHostConfigHome}/dvr",
                "archiveStrategy": "version", // vod 동일한 이름으로 만들어졌을 때 방식 -> append, delete, version
                "dvrOnlyStreaming": false,
                "startRecordingOnStartup": true, // 라이브 시작과 동시에 record
                "dvrEncryptionSharedSecret": "",
                "dvrMediaCacheEnabled": false,
                "httpRandomizeMediaName": false
            },
            "drmConfig": {
                "serverName": "_defaultServer_",
                "licenseType": "Subscription",
                "inUse": false,
                "ezDRMUsername": "",
                "ezDRMPassword": "",
                "buyDRMUserKey": "",
                "buyDRMProtectSmoothStreaming": false,
                "buyDRMProtectCupertinoStreaming": false,
                "buyDRMProtectMpegDashStreaming": false,
                "verimatrixProtectCupertinoStreaming": false,
                "verimatrixCupertinoKeyServerIpAddress": "",
                "verimatrixCupertinoKeyServerPort": 0,
                "verimatrixCupertinoVODPerSessionKeys": false,
                "verimatrixProtectSmoothStreaming": false,
                "verimatrixSmoothKeyServerIpAddress": "",
                "verimatrixSmoothKeyServerPort": 0,
                "cupertinoEncryptionAPIBased": false
            },
            "transcoderConfig": { // 360p, 720p 등 라이브를 원하는 퀄리티에 맞게 조정하는 부분
                "serverName": "_defaultServer_",
                "available": true, // transcode 하게 설정함 -> 라이브 시작 시 transcode 돼서 송출 + 모든 라이브는 vod로 변환됨
                "licensed": true,
                "licenses": -1,
                "licensesInUse": 0,
                "templates": {
                    "vhostName": "_defaultVHost_",
                    "templates": [
                        {
                            "id": "audioonly",
                            "href": `/v2/servers/_defaultServer_/vhosts/_defaultVHost_/applications/${applicationName}/transcoder/templates/audioonly`
                        },
                        {
                            "id": "transcode-h265",
                            "href": `/v2/servers/_defaultServer_/vhosts/_defaultVHost_/applications/${applicationName}/transcoder/templates/transcode-h265`
                        },
                        {
                            "id": "transcode",
                            "href": `/v2/servers/_defaultServer_/vhosts/_defaultVHost_/applications/${applicationName}/transcoder/templates/transcode`
                        },
                        {
                            "id": "transrate",
                            "href": `/v2/servers/_defaultServer_/vhosts/_defaultVHost_/applications/${applicationName}/transcoder/templates/transrate`
                        }
                    ]
                },
                "liveStreamTranscoder": "transcoder",
                "templatesInUse": "${SourceStreamName}.xml,transrate.xml", // transrate 사용
                "profileDir": "${com.wowza.wms.context.VHostConfigHome}/transcoder/profiles",
                "templateDir": "${com.wowza.wms.context.VHostConfigHome}/transcoder/templates",
                "createTemplateDir": false
            },
            "webRTCConfig": {
                "serverName": "_defaultServer_",
                "enablePublish": false,
                "enablePlay": false,
                "enableQuery": false,
                "iceCandidateIpAddresses": "127.0.0.1,tcp,1935",
                "preferredCodecsAudio": "opus,pcmu,pcma",
                "preferredCodecsVideo": "vp8,h264",
                "debugLog": false
            },
            "modules": {
                "serverName": "_defaultServer_",
                "moduleList": [
                    {
                        "description": "Base",
                        "name": "base",
                        "order": 0,
                        "class": "com.wowza.wms.module.ModuleCore"
                    },
                    {
                        "description": "Client Logging",
                        "name": "logging",
                        "order": 1,
                        "class": "com.wowza.wms.module.ModuleClientLogging"
                    },
                    {
                        "description": "FLVPlayback",
                        "name": "flvplayback",
                        "order": 2,
                        "class": "com.wowza.wms.module.ModuleFLVPlayback"
                    },
                    { // 보안 설정 (꼭 있어야 함)
                        "description": "Core Security Module for Applications",
                        "name": "ModuleCoreSecurity",
                        "order": 3,
                        "class": "com.wowza.wms.security.ModuleCoreSecurity"
                    }
                ]
            }
        },
        json : true
    }

    return await request(options, (error, res, body) => {
        if (!error && res.statusCode == 200) {
            return body
        }else{
            console.log('ERROR :: ')
            console.error(error)
            return error
        }
    })
}

// 라이브 별 인증키 생성 - 채널 신청 시
exports.CreatePublisher = async (applicationName, name, password)=>{
    const options = {
        url: `http://110.93.134.242:8087/v2/servers/_defaultServer_/vhosts/_defaultVHost_/applications/${applicationName}/publishers`,
        method: 'POST',
        headers,
        auth,
        body: {
            "publisherName": `${name}`,
            "password": `${password}`
        },
        json : true
    };

     return await request(options, (error, res, body) => {
        if (!error && res.statusCode == 200) {
            return body
        }
    })
}

// 앱 삭제 - 회원 탈퇴 시
exports.DeleteApplication = async (applicationName)=>{
    const options = {
        url: `http://110.93.134.242:8087/v2/servers/_defaultServer_/vhosts/_defaultVHost_/applications/${applicationName}`,
        method: 'DELETE',
        headers,
        auth
    }

    return await request(options, (error, res, body) => {
        if (!error && res.statusCode == 200) {
            return body
        }
    })
}

// 라이브 별 인증키 삭제 - 회원 탈퇴 시
exports.DeletePublisher = async (applicationName, publisherName)=>{
    const options = {
        url: `http://110.93.134.242:8087/v2/servers/_defaultServer_/vhosts/_defaultVHost_/applications/${applicationName}/publishers/${publisherName}`,
        method: 'DELETE',
        headers,
        auth
    }

    return await request(options, (error, res, body) => {
        if (!error && res.statusCode == 200) {
            return body
        }
    })
}

exports.SelectLive = async (applicationName)=>{
    const options = {
        url: `http://110.93.134.242:8087/v2/servers/_defaultServer_/vhosts/_defaultVHost_/applications/${applicationName}/instances`,
        method: 'GET',
        headers,
        auth
    }

    let result = await request(options, (error, res, body) => {
        if (!error && res.statusCode == 200) {
            return body
        }
    })
    result = JSON.parse(result)
    let streams = result.instanceList
    if(streams.length === 0 || streams[0].incomingStreams.length === 0){
        return 'no-streaming'
    }

    for(let stream of streams[0].incomingStreams){
        const Exp = new RegExp('local')
        if(!Exp.test(stream.sourceIp)){
            return stream.name
        }
    }
}

exports.SelectVodList = async (applicationName)=>{
    const options = {
        url: `http://110.93.134.242:8087/v2/servers/_defaultServer_/vhosts/_defaultVHost_/applications/${applicationName}/instances/_definst_/dvrstores`,
        method: 'GET',
        headers,
        auth
    }

    let result = await request(options, (error, res, body) => {
        if (!error && res.statusCode == 200) {
            return body
        }
    })
    result = JSON.parse(result)

    let dvrStore = result.dvrconverterstoresummary
    if(!dvrStore) return null

    dvrStore = dvrStore.filter(dvr => dvr.name.includes('livefactory.'))
    dvrStore.sort((a,b)=>{ //vod 이름이 정렬되지 않은 채로 리스트가 반환되기 때문에 정렬시켜서 반환
        return a.name.localeCompare(b.name)
    })

    return dvrStore
}

exports.SelectVod = async (applicationName, vod)=>{
    const options = {
        url: `http://110.93.134.242:8087/v2/servers/_defaultServer_/vhosts/_defaultVHost_/applications/${applicationName}/instances/_definst_/dvrstores/${vod}`,
        method: 'GET',
        headers,
        auth
    }

    let result = await request(options, (error, res, body) => {
        if (!error && res.statusCode == 200) {
            return body
        }
    })
    result = JSON.parse(result)
    function msToTime(duration) { // ms를 시간으로 바꾸는 함수
        let milliseconds = parseInt((duration % 1000) / 100),
            seconds = Math.floor((duration / 1000) % 60),
            minutes = Math.floor((duration / (1000 * 60)) % 60),
            hours = Math.floor((duration / (1000 * 60 * 60)) % 24)

        hours = (hours < 10) ? "0" + hours : hours;
        minutes = (minutes < 10) ? "0" + minutes : minutes;
        seconds = (seconds < 10) ? "0" + seconds : seconds;

        return hours + ":" + minutes + ":" + seconds;
    }

    return msToTime(result.DvrConverterStore.duration) // result.DvrConverterStore.duration 에 영상 길이가 ms로 주어짐
}
