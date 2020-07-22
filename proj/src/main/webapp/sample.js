const firebase = require('firebase');

function makeUppercase(s){
    return s.toUpperCase();
}

function addUserToTag(tag, postKey){
    var currentReference = firebase.database().ref("/chat/" + tag + "/" + postKey + "/users/");
    currentUID = firebase.auth().currentUser.uid;
    console.log("adding new user to chat room with uid: " + currentUID);
    const removalKey = currentReference.push(currentUID).key;
    return removalKey
}

module.exports.makeUppercase = makeUppercase;
module.exports.addUserToTag = addUserToTag;