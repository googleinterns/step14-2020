/*
    Location
 */

var position;

function successCallback(pos){
    position = pos;
    console.log(pos);
}

function errorCallback(err){
    console.log("error");
}

function getLocation() {
    if(navigator.geolocation){
        navigator.geolocation.getCurrentPosition(successCallback,errorCallback,{timeout:10000, enableHighAccuracy:false});
    }
    else{
        console.log("Error. Geolocation not supported or not enabled");
    }
    return;
}

exports.getLocation = getLocation