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
function init() {
    initRef();
    clickWithEnterKey();
}

const PATH = '/messages'; // can make this more detailed (for example add user ID)

// initializes the .on() functions for the database reference
function initRef() {
    // create database reference
    const dbRefObject = firebase.database().ref(PATH);

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
    const messageRef = firebase.database().ref(PATH);

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
            pushChatMessage();
        }
    });
}
