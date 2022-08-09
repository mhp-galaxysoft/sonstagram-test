// 유효성 검사
// 글자 길이(byte)
// 정규식 검사 함수
var reg_name = RegExp( /[^a-zA-Z0-9ㄱ-힣·\-\_.,%&?:\s\(\)\[\]]/gi ) //이름
var reg_id = RegExp(  /[^a-z0-9]/g) //id 숫자랑 영어 소문자만
var reg_coupon = RegExp(  /[^a-zA-Z0-9]/gi) //쿠폰 번호 숫자랑 영어 대문자만
var reg_num = RegExp( /[^0-9]/gi) //숫자만
var reg_num2 = RegExp( /[^0-9.]/gi) //숫자만
var reg_float = RegExp( /[^\d*\.?\d+]/gi) //숫자, '.'만(실수)
var reg_web = RegExp(/^(https?:\/\/)(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/) //웹페이지
var reg_email = RegExp(/^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i) //이메일
var reg_string = RegExp(/[;|`\@$%&\\]/gi) //문자열
var reg_password = RegExp(/^[A-Za-z0-9!@#+]{4,12}$/)
var reg_url = RegExp(/^(((http(s?))\:\/\/)?)([0-9a-zA-Z\-]+\.)+[a-zA-Z]{2,6}(\:[0-9]+)?(\/\S*)?/)
var reg_phone = RegExp(/^01([0|1|6|7|8|9]?)-?([0-9]{3,4})-?([0-9]{4})$/)
// 각 input 마다 limitsize, reg_type을 지정해주고 check_reg_exp 클래스를 지정한다.
// 해당 attribute가 있는지 검사한다.
// 있으면 input의 크기와 종류에 맞춰 checkRegExp()을 실행한다.
// 정규식에 걸리면 alert() 수행하고 함수를 종료한다.
// 기존 byteCheck 함수는 필요없으므로 사용하지 않기로 한다.

function checkRegExp(obj){
    const limitsize = obj.attr('limitsize')
    const reg_type = obj.attr('reg_type')
    let flag = true

    switch(reg_type){
        case "name" :
        if(reg_name.test(obj.val())){
            alert("입력 불가능한 문자가 포함되었습니다.")
            obj.val(obj.val().replace(reg_name, ""))
            flag = false
        }
        break
        case "id" :
        if(reg_id.test(obj.val())){
            alert("입력 불가능한 문자가 포함되었습니다.")
            obj.val(obj.val().replace(reg_id, ""));
            flag = false;
        }
        break
        case "coupon" :
        if(reg_coupon.test(obj.val())){
            alert("입력 불가능한 문자가 포함되었습니다.")
            obj.val(obj.val().replace(reg_coupon, ""));
            flag = false;
        }
        break
        case 'num' :
        if(reg_num.test(obj.val())){
            alert("입력 불가능한 문자가 포함되었습니다.");
            obj.val(obj.val().replace(reg_num, ""));
            flag = false;
        }
        break
        case 'num2' :
        if(reg_num2.test(obj.val())){
            alert("입력 불가능한 문자가 포함되었습니다.");
            obj.val(obj.val().replace(reg_num2, ""));
            flag = false;
        }
        break
        case 'float' :
        if(reg_float.test(obj.val())){
        alert("입력 불가능한 문자가 포함되었습니다.");
        obj.val(obj.val().replace(reg_float, ""));
        flag = false;
        }
        break
        case 'web' :
        if(!reg_web.test(obj.val())){
            alert('정확한 도메인 주소를 입력해주세요. (ex. http://***.***)')
            obj.val("");
            flag = false;
        }
        break
        case 'email' :
        if(!reg_email.test(obj.val())){
            alert("정확한 이메일 형식으로 입력해주세요.");
            obj.val("");
            flag = false;
        }
        break
        case 'string' :
        if(reg_string.test(obj.val())){
            alert("입력 불가능한 문자가 포함되었습니다.");
            obj.val(obj.val().replace(reg_string, ""));
            flag = false;
        }
        break
        case 'password':
        if (!reg_password.test(obj.val()) && obj.val().trim() != "") {
          alert('비밀번호는 4-12자리까지 입력가능하며, 특수문자는 !@#만 허용됩니다.');
          obj.val("");
          obj.focus();
          flag = false;
        }
        break
        case 'url':
        if (!reg_url.test(obj.val())){
            alert("정확한 url 형식으로 입력해주세요.");
            obj.val("")
            flag = false;
        }
        break
        case 'phone':
            if (!reg_phone.test(obj.val())){
                alert("정확한 핸드폰번호 형식으로 입력해주세요.");
                obj.val("")
                flag = false;
            }
            break
    }
    if(!flag){
        obj.focus();
        return false;
    }

    // 제한 길이만큼 입력 받으면 이후에 초과되었다고 알리고 입력 방지
    const length = obj.val().length
    if(limitsize < length){
        alert("입력은 최대 " + limitsize + "글자까지 가능합니다.")
        obj.val(obj.val().substr(0,limitsize))
    }
    return true
}

$(".reg_exp").unbind("keyup").bind("keyup",function(){
    let attr = $(this).attr('reg_type');
    if( attr !== "web" && attr !== 'email' && attr !== 'password' && attr !== 'url' && attr !== 'phone'){
        if($(this).val().trim() !== "")
            checkRegExp($(this))
    }
})
$(".reg_exp").unbind("focusout").bind("focusout",function(){
    if($(this).val().trim() !== "")
        checkRegExp($(this))
})

