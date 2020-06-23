function init() {
    test();
}

const path = '/messages'; // can make this more detailed

function test() {
    const divObject = document.getElementById('content');

    // create database reference
    const dbRefObject = firebase.database().ref(path);

    // sync object data
    dbRefObject.on('value', snap => {
        divObject.innerHTML = JSON.stringify(snap.val(), null, 3);
    });
}

function pushChatMessage() {
    const messageRef = firebase.database().ref(path);

    const message = document.getElementById('message-input').value;
    // push message to datastore
    messageRef.push(message);
}