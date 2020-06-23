function init() {
    test();
}

function test() {
    const divObject = document.getElementById('content');

    // create database reference
    const dbRefObject = firebase.database().ref().child('object');

    // sync object data
    dbRefObject.on('value', snap => console.log(snap.val()));
}