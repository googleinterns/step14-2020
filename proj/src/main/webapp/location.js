/*
    Location
 */

var position;

function successCallback(pos){
    position = pos;
    console.log(pos.coords);
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

function getLatLong(){
    if(position){
        return [position.coords.latitude, position.coords.longitude];
    }
}


exports.getLocation = getLocation
exports.getLatLong = getLatLong