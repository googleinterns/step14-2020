/*
    Authentication
 */

// Elements of login container
const fname = document.getElementById("fname")
const txtEmail = document.getElementById("email");
const txtPassword = document.getElementById("pass");
const tagStr = document.getElementById("tags");
const btnLogin = document.getElementById("btnLogin");
const btnSignUp = document.getElementById("btnSignUp");
const btnLogout = document.getElementById("btnLogout");

// Add login event
if(btnLogin){
    btnLogin.addEventListener("click", e => {
        const emailVal = txtEmail.value;
        const passVal = pass.value;

        // Initialize auth object
        const auth = firebase.auth();

        const promise = auth.signInWithEmailAndPassword(emailVal, passVal).then(function(user){
            window.location.replace("chat.html");
        });
        promise.catch(e => console.log(e.message));
    });
}

// Add sign up event
if(btnSignUp){
    btnSignUp.addEventListener("click", e => {
        const emailVal = txtEmail.value;
        const passVal = pass.value;

        // Initialize auth object
        const auth = firebase.auth();
        auth.useDeviceLanguage();

        const promise = auth.createUserWithEmailAndPassword(emailVal, passVal).then(function(){
            const user = auth.currentUser;
            user.updateProfile({
                displayName: fname.value + " " + lname.value
                }).then(function(){
                console.log("display name updated successfully");
                firebase.database().ref("users/" + auth.currentUser.uid).set({
                    firstName : fname.value,
                    lastName : lname.value,
                    tags : tagStr.value.split(',')
                }).then(function(){
                    window.location.replace("chat.html");
                });
            }).catch(function(){
                console.log("error updating display name");
            });
        });
        promise.catch(e => console.log(e.message));

    });
}

if(btnLogout){
    btnLogout.addEventListener("click", e => {
        firebase.auth().signOut();
        window.location.replace("welcome.html");
    });
}

firebase.auth().onAuthStateChanged(firebaseUser => {
    if(firebaseUser){
        console.log(firebaseUser);
        if(btnLogout)
            btnLogout.classList.remove("hidden");
    }
    else{
        console.log("not logged in");
        if(btnLogout)
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

var CHAT_ID = '-MB0ycAOM8VGIXlev5u8'
var tag = 'test';
var dbRefObject = getDbRef(tag, CHAT_ID);
const LIMIT = 20; // how many messages to load at a time
var firstChildKey;

function init() {
    initRef();
    clickWithEnterKey();
    populateSidebar();

    const chat = document.getElementById('chatbox');
    chat.addEventListener('scroll', addMoreMessagesAtTheTop);
}

// initializes the .on() functions for the database reference
function initRef() {
    const chat = document.getElementById('chatbox');
    chat.innerHTML = '';
    // note that when a comment is added it will display more than the limit, which
    // is intentional
    dbRefObject.limitToLast(LIMIT + 1).on('child_added', snap => {
        if (!firstChildKey) {
            firstChildKey = snap.key;
        } else {
            messageDom = createMessageWithTemplate(snap.val());
            chat.appendChild(messageDom);
        }
    });
}

function pushChatMessage() {
    const messageInput = document.getElementById('message-input');

    var message = {
        content : messageInput.value,
        timestamp : new Date().getTime()
    }
    // push message to datastore
    dbRefObject.push(message);
    messageInput.value = null; // clear the message
}

function addMoreMessagesAtTheTop() {
    const chat = document.getElementById('chatbox');
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
    const chat = document.getElementById('chatbox');
    for (var key in messages) {
        if (messages.hasOwnProperty(key)) {
            if (!firstChildKey) {
                firstChildKey = key;
            } else {
                const messageDom = createMessageWithTemplate(messages[key]);
                chat.insertBefore(messageDom, firstChild);
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

function createMessageWithTemplate(messageObj) {
    const messageTemplate = document.getElementById('message-temp');
    const message = messageTemplate.content.cloneNode(true);

    const msgHeader = message.querySelector('.message-header');
    msgHeader.querySelector('#username').innerText = 'name go here';
            
    const msgBody = message.querySelector('.message-body');
    msgBody.innerText = messageObj.content;
    return message;
}

function getDbRef(tag, chatId) {
    const path = "/chat/"+tag+"/"+chatId+"/messages";
    const dbRefObj = firebase.database().ref(path);
    return dbRefObj;
}

async function makePreviewWithLastMessage(tag, chatId) {
    var chatName;
    var preview;
    const tagRefObj = firebase.database().ref('/chat/'+tag+'/'+chatId)
    await tagRefObj.on('value', (snap) => {
        chatName = snap.val().name;
        const last = Object.keys(snap.val().messages).pop();
        preview = makeChatPreview(chatName, snap.val().messages[last], tag, chatId)

        const sidebar = document.getElementById('sidebar');
        sidebar.prepend(preview);
    });
}

function makeChatPreview(name, messageObj, tag, chatId) {
    if (document.getElementById(chatId)) {
        oldPreview = document.getElementById(chatId);
        oldPreview.remove();
    }

    const previewTemplate = document.getElementById('chat-preview-temp');
    const docFrag = previewTemplate.content.cloneNode(true);
    const preview = docFrag.querySelector(".chat-preview")

    const chatName = preview.querySelector('#chat-name');
    chatName.innerText = name;

    const msgHeader = preview.querySelector('.message-header');
    msgHeader.querySelector('#username').innerText = 'name go here';
            
    const msgBody = preview.querySelector('.message-body');
    msgBody.innerText = messageObj.content;
    preview.setAttribute("id", chatId)
    changeChatOnClick(preview, tag, chatId);

    return preview;
}

function populateSidebar() {
    // Initialize auth object
    const auth = firebase.auth();

    // const iud = auth.currentUser.uid;
    const iud = "testuserwithdict";
    const userTagsRef = firebase.database().ref('/users/'+iud+'/tags');

    userTagsRef.orderByKey().on('child_added', snap => {
        const chatTag = snap.key;
        const chatId = snap.val();

        // get last message
        makePreviewWithLastMessage(chatTag, chatId)
        
    })
}

function changeChatOnClick(domElement, tag, chatId) {
    domElement.addEventListener('click', function() {
        dbRefObject = getDbRef(tag, chatId);
        initRef();
    });
}