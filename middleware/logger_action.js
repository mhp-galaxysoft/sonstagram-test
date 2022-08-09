const path = require('path')

const log = Object.freeze({
    USER : {
        login     : { pk: 1, text: '로그인' },
        logout    : { pk: 2, text: '로그아웃' },
        signup    : { pk: 3, text: '회원가입' },
        signout   : { pk: 4, text: '회원탈퇴' },
        pw_search : { pk: 5, text: '비밀번호 찾기' },
        pw_update : { pk: 6, text: '비밀번호 변경' }
    },
    TARGET : {
        create  : { pk: 7, text: '생성' },
        delete  : { pk: 8, text: '삭제' },
        view    : { pk: 9, text: '조회' },
        end     : { pk: 10, text: '종료' },
        use     : { pk: 11, text: '등록' },
        change  : { pk: 12, text: '변경' }
    },
    FACTORY : {
        invite  : { pk: 13, text: '새 채널 초대' },
        accept  : { pk: 14, text: '초대 수락' },
        create  : { pk: 15, text: '팩토리 계정 생성' },
        stop    : { pk: 16, text: '팩토리 계정 중지' }
    }
})

const target = Object.freeze({
    ADMIN   : { pk: 0, text: '계정관리' },
    LIVE    : { pk: 1, text: 'LIVE' },
    VOD     : { pk: 2, text: 'VOD' },
    PRODUCT : { pk: 3, text: '상품' },
    COUPON  : { pk: 4, text: '쿠폰' },
    FACTORY : { pk: 5, text: '팩토리' },
    PLAN    : { pk: 6, text: '플랜'}
})
/*

let getProtocol = function (req) {
    return ('/'+path.basename(__filename).replace('.js','') + req.url).replace('/logger', "");
}
*/

module.exports = {
    // getProtocol : getProtocol,
    log     : log,
    target  : target
};