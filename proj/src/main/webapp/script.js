function init() {
    initRef();
    clickWithEnterKey();
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

    const messageInput = document.getElementById('message-input');
    // push message to datastore
    messageRef.push(messageInput.value);
    messageInput.value = null; // clear the message
}

/**
    so pressing enter instead of using the button submits the form,
    which is not what we want because it reloads the page. so this
    makes it so when they press enter, it presses the send button
 */
function clickWithEnterKey() {
    const messageInput = document.getElementById('message-input');

    messageInput.addEventListener('keyup', function(event) {
        if (event.keyCode === 13) { // 13 is the keycode for the enter key
            document.getElementById('send-button').click();
        }
    });
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
