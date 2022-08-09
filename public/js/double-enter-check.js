let doubleEnterFlag = false;
function doubleEnterCheck() {
    if(doubleEnterFlag){
        return doubleEnterFlag;
    } else {
        doubleEnterFlag = true;
        return false;
    }
}
