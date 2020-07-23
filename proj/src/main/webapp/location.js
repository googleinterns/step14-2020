const firebase = require('firebase');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const html = '';//'./index.html'
window = new JSDOM(html).window
document = window.document;

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


window.getLocation = getLocation
window.getLatLong = getLatLong