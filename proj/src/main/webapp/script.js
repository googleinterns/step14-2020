function init() {
    initRef();
}

const path = '/messages'; // can make this more detailed (for example add user ID)

// initializes the .on() functions for the database reference
function initRef() {
    // create database reference
    const dbRefObject = firebase.database().ref(path);

    // sync object data
    const divObject = document.getElementById('content');
    dbRefObject.on('value', snap => {
        divObject.innerHTML = JSON.stringify(snap.val(), null, 3);
    });

    const listObject = document.getElementById('chat-as-list');
    dbRefObject.on('child_added', snap => {
        const li = document.createElement('li');
        li.innerText = snap.val();
        listObject.appendChild(li);
    });
}

function pushChatMessage() {
    const messageRef = firebase.database().ref(path);

    const message = document.getElementById('message-input').value;
    // push message to datastore
    messageRef.push(message);
} 