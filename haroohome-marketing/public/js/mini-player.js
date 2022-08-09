(function (){
    function getQueryStringValue (key) {
        let scripts = document.getElementsByTagName('script')
        let index = scripts.length - 1
        let myScript = scripts[index]

        return decodeURIComponent(myScript.src.replace(new RegExp("^(?:.*[&\\?]" + encodeURIComponent(key).replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1"));
    }

    let accessKey = getQueryStringValue("accessKey")
    setTimeout(function(){
        $.ajax({
            url: "http://livefactory.kr/mini-player/"+accessKey,
            method: "GET"
        }).done(function (html) {
            $('body').append(html)
        })
    }, 3000)
})()

