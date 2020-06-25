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

    const limit = 20; // how many messages to load at a time

    const listObject = document.getElementById('chat-as-list');
    // note that when a comment is added it will display more than the limit, which
    // is intentional
    dbRefObject.limitToLast(limit).on('child_added', snap => {
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

const messaging = firebase.messaging();
messaging.requestPermission()
.then(function(){
    console.log("Permission granted");
    return messaging.getToken();
})
.then(function(token) {
    console.log(token);
})
.catch(function(err){
    console.log("Permission denied");
})

messaging.onMessage((payload) => {
    console.log("Message received. ", payload);
    appendMessage(payload);
});

function appendMessage(payload){
    const messagesElement = document.getElementById("messages");
    const dataHeaderElement = document.createElement("h4");
    const dataElement = document.createElement("pre");
    dataHeaderElement.textContent = payload.notification.title;
    dataElement.textContent = payload.notification.body;

    messagesElement.appendChild(dataHeaderElement);
    messagesElement.appendChild(dataElement);
}
