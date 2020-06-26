
/*
    Notifications
 */

const messaging = firebase.messaging();
messaging.requestPermission()
.then(function () {
    console.log("Have permission");
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .then(function(registration) {
            console.log('Registration successful, scope is:', registration.scope);
        }).catch(function(err) {
            console.log('Service worker registration failed, error:', err);
        });
    }
});

messaging.onMessage((payload) => {
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

/*
    Realtime Database
 */

const path = '/messages'; // can make this more detailed (for example add user ID)
const LIMIT = 20; // how many messages to load at a time
var firstChildKey;

function init() {
    initRef();

    const chat = document.getElementById('chat-as-list');
    chat.addEventListener('scroll', addMoreMessagesAtTheTop);
}

// initializes the .on() functions for the database reference
function initRef() {
    // create database reference
    const dbRefObject = firebase.database().ref(path);

    const listObject = document.getElementById('chat-as-list');
    // note that when a comment is added it will display more than the limit, which
    // is intentional
    dbRefObject.limitToLast(LIMIT + 1).on('child_added', snap => {
        if (!firstChildKey) {
            firstChildKey = snap.key;
        } else {
            const li = document.createElement('li');
            li.innerText = snap.val();
            listObject.appendChild(li);
        }
    });
}

function pushChatMessage() {
    const messageRef = firebase.database().ref(path);

    const message = document.getElementById('message-input').value;
    // push message to datastore
    messageRef.push(message);
}

function addMoreMessagesAtTheTop() {
    const dbRefObject = firebase.database().ref(path);
    const chat = document.getElementById('chat-as-list');
    if (chat.scrollTop === 0) {
        const oldScrollHeight = chat.scrollHeight;
        // because we don't add the last child, add one to the limit
        dbRefObject.orderByKey().endAt(FIRST_CHILD_KEY).limitToLast(LIMIT + 1).once('value', snap => {
            FIRST_CHILD_KEY = null;
            addMessagesToListElement(snap.val(), chat.firstChild, oldScrollHeight);
        });
    }
}

function addMessagesToListElement(messages, firstChild, oldScrollHeight) {
    const chat = document.getElementById('chat-as-list');
    for (var key in messages) {
        if (messages.hasOwnProperty(key)) {
            if (!FIRST_CHILD_KEY) {
                FIRST_CHILD_KEY = key;
                continue;
            }
            const li = document.createElement('li');
            li.innerText = messages[key];
            chat.insertBefore(li, firstChild);
        }
    }
    chat.scrollTop = chat.scrollHeight - oldScrollHeight;
}
