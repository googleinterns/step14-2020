/*
    Authentication
 */

// Elements of login container
const txtEmail = document.getElementById("email");
const txtPassword = document.getElementById("pass");
const btnLogin = document.getElementById("btnLogin");
const btnSignUp = document.getElementById("btnSignUp");
const btnLogout = document.getElementById("btnLogout");

// Add login event
btnLogin.addEventListener("click", e => {
    const emailVal = txtEmail.value;
    const passVal = pass.value;

    // Initialize auth object
    const auth = firebase.auth();

    const promise = auth.signInWithEmailAndPassword(emailVal, passVal);
    promise.catch(e => console.log(e.message));
});

// Add sign up event 
btnSignUp.addEventListener("click", e => {
    const emailVal = txtEmail.value;
    const passVal = pass.value;

    // Initialize auth object
    const auth = firebase.auth();

    const promise = auth.createUserWithEmailAndPassword(emailVal, passVal);
    promise.catch(e => console.log(e.message));
});

btnLogout.addEventListener("click", e => {
    firebase.auth().signOut();
});

firebase.auth().onAuthStateChanged(firebaseUser => {
    if(firebaseUser){
        console.log(firebaseUser);
        btnLogout.classList.remove("hidden");
    }
    else{
        console.log("not logged in");
        btnLogout.classList.add("hidden");
    }
});

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

const CHAT_ID = '-MB0ycAOM8VGIXlev5u8'
const PATH = '/chat/'+CHAT_ID+'/messages'; // can make this more detailed (for example add user ID)
const LIMIT = 20; // how many messages to load at a time
var firstChildKey;

function init() {
    initRef();
    clickWithEnterKey();

    const chat = document.getElementById('chat-as-list');
    chat.addEventListener('scroll', addMoreMessagesAtTheTop);
}

// initializes the .on() functions for the database reference
function initRef() {
    // create database reference
    const dbRefObject = firebase.database().ref(PATH);

    const listObject = document.getElementById('chat-as-list');
    // note that when a comment is added it will display more than the limit, which
    // is intentional
    dbRefObject.limitToLast(LIMIT + 1).on('child_added', snap => {
        if (!firstChildKey) {
            firstChildKey = snap.key;
        } else {
            const li = document.createElement('li');
            li.innerText = snap.val().content;
            listObject.appendChild(li);
        }
    });
}

function pushChatMessage() {
    const messageInput = document.getElementById('message-input');

    const chatRef = firebase.database().ref(PATH);

    var message = {
        content : messageInput.value,
        timestamp : new Date().getTime()
    }
    // push message to datastore
    chatRef.push(message);
    messageInput.value = null; // clear the message
}

function addMoreMessagesAtTheTop() {
    const dbRefObject = firebase.database().ref(PATH);
    const chat = document.getElementById('chat-as-list');
    if (chat.scrollTop === 0) {
        const oldScrollHeight = chat.scrollHeight;
        // because we don't add the last child, add one to the limit
        dbRefObject.orderByKey().endAt(firstChildKey).limitToLast(LIMIT + 1).once('value', snap => {
            firstChildKey = null;
            addMessagesToListElement(snap.val(), chat.firstChild, oldScrollHeight);
        });
    }
}

function addMessagesToListElement(messages, firstChild, oldScrollHeight) {
    const chat = document.getElementById('chat-as-list');
    for (var key in messages) {
        if (messages.hasOwnProperty(key)) {
            if (!firstChildKey) {
                firstChildKey = key;
            } else {
                const li = document.createElement('li');
                li.innerText = messages[key].content;
                chat.insertBefore(li, firstChild);
            }
        }
    }
    chat.scrollTop = chat.scrollHeight - oldScrollHeight;
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
            pushChatMessage();
        }
    });
}
