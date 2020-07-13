/*
    Realtime Database
 */

var currentUID = null;
var globalChatId = '-MB0ycAOM8VGIXlev5u8'
var tag = 'test';
var dbRefObject = getDbRef(tag, globalChatId);
const LIMIT = 20; // how many messages to load at a time
var firstChildKey;

// Broad init function
function init() {
    const auth = firebase.auth();
    
    auth.onAuthStateChanged(async firebaseUser => {
        if(firebaseUser){
            // InitUserChat sets information relevant to logged-in user
            // Must run before enclosed functions
            await initUserChat().then(function(){
                populateSidebar();
                initRef(dbRefObject);
                populateProfileSidebar(firebaseUser);
                initBio();
            });

            clickWithEnterKey();
        }
        else{
            window.location.replace("/static/welcome.html");
        }
    });

    const chat = document.getElementById('chatbox');
    chat.addEventListener('scroll', addMoreMessagesAtTheTop);
}


function initUserChat(){
    currentUID = firebase.auth().currentUser.uid;
    const userTagsRef = firebase.database().ref('/users/'+currentUID+'/allTags');

    // Wraps content function in a promise to ensure it runs before wrest of init
    return new Promise(function(resolve){
        var query = firebase.database().ref(userTagsRef).orderByKey();
        query.once("value").then(function(snapshot) {
            snapshot.forEach(function(childSnapshot) {
                var key = childSnapshot.key;
                var ChatID = childSnapshot.val();
                if(key && ChatID){
                    tag = key;
                    globalChatId = ChatID;
                    dbRefObject = getDbRef(tag, globalChatId);
                    return true;
                }
            });
            resolve(1);
        });
    });


}
// Sets title of page
function setTitle(){
    nameRef = firebase.database().ref("/chat/"+tag+"/"+globalChatId+"/chatInfo/name");
    nameRef.once("value").then(function(snapshot){
        var data = snapshot.val();
        console.log(data);
        var presentableTitle = data.charAt(0).toUpperCase() + data.slice(1);
        document.getElementById("big-title").innerText = presentableTitle;
    });
}

// initializes the .on() functions for the database reference
function initRef(dbRefObject) {
    const chat = document.getElementById('chatbox');
    chat.innerHTML = '';    

    setTitle();

    // note that when a comment is added it will display more than the limit, which
    // is intentional
    dbRefObject.off('child_added');
    dbRefObject.orderByChild("timestamp").limitToLast(LIMIT + 1).on('child_added', snap => {
        if (!firstChildKey) {
            firstChildKey = snap.key;
        } else {
            messageDom = createMessageWithTemplate(snap.key, snap.val());
            chat.appendChild(messageDom);
        }
    });
}

function pushChatMessage() {
    const messageInput = document.getElementById('message-input');

    var message = {
        content : messageInput.value,
        timestamp : new Date().getTime(),
        senderDisplay : firebase.auth().currentUser.displayName,
        senderUID : firebase.auth().currentUser.uid
    }
    // push message to datastore
    dbRefObject.push(message);

    messageInput.value = null; // clear the message

    // update chatInfo
    const chatRef =  dbRefObject.parent.child('chatInfo');
    chatRef.child('lastAuthor').set(message.senderUID);
    chatRef.child('lastMessage').set(message.content);
    chatRef.child('timestamp').set(message.timestamp);
}

function addMoreMessagesAtTheTop() {
    const chat = document.getElementById('chatbox');
    if (chat.scrollTop === 0) {
        const oldScrollHeight = chat.scrollHeight;
        dbRefObject.orderByChild("timestamp").limitToLast(LIMIT + 1).once("value",snap => {
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
                const messageDom = createMessageWithTemplate(key, messages[key]);
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

function createMessageWithTemplate(key, messageObj) {
    const messageTemplate = document.getElementById('message-temp');
    const docFrag = messageTemplate.content.cloneNode(true);
    const message = docFrag.querySelector('.message')
            
    const msgBody = message.querySelector('.message-body');
    msgBody.innerText = messageObj.content;

    const timestamp = message.querySelector('#timestamp');
    timestamp.innerText = new Date(messageObj.timestamp).toLocaleString();

    message.id = key;
    addUsernameToMessage(messageObj.senderUID, message)
    return message;
}



function getDbRef(tag, chatId) {
    const path = "/chat/"+tag+"/"+chatId+"/messages";
    const dbRefObj = firebase.database().ref(path);
    return dbRefObj;
}

async function makePreviewWithLastMessage(tag, chatId) {
    const tagRefObj = firebase.database().ref('/chat/'+tag+'/'+chatId+'/chatInfo')
    await tagRefObj.on('value', async function (snap) {

        const preview = await makeChatPreview(snap.val(), tag, chatId);

        const sidebar = document.getElementById('chats-submenu');
        sidebar.prepend(preview);
    });
}

async function makeChatPreview(chatInfoObj, tag, chatId) {
    if (document.getElementById(chatId)) {
        oldPreview = document.getElementById(chatId);
        oldPreview.remove();
    }

    const previewTemplate = document.getElementById('chat-preview-temp');
    const docFrag = previewTemplate.content.cloneNode(true);
    const preview = docFrag.querySelector(".chat-preview")

    const chatName = preview.querySelector('#chat-name');
    chatName.innerText = chatInfoObj.name;
    const msgBody = preview.querySelector('.message-body');
    msgBody.innerText = chatInfoObj.lastMessage;

    const timestamp = preview.querySelector('#timestamp');
    timestamp.innerText = new Date(chatInfoObj.timestamp).toLocaleString();
    
    preview.setAttribute("id", chatId)
    changeChatOnClick(preview, tag, chatId);
    await addUsernameToMessage(chatInfoObj.lastAuthor, preview);

    return preview;
}

// i can't access two paths at the same time so i need two separate functions :/
async function addUsernameToMessage(uid, preview) {
    const userRef = firebase.database().ref('/users/'+uid);
    await userRef.once('value', snap => {
        preview.querySelector('#username').innerText = snap.val().firstName + ' ' + snap.val().lastName;
    })
}

function initBio() {
    const bioBox = document.getElementById('user-bio');
    const editInputBox = document.getElementById('bio-edit');

    bioBox.addEventListener('dblclick', function() {
        this.hidden = true;

        editInputBox.hidden = false;
        editInputBox.value = this.innerText

        editInputBox.focus();
    });

    editInputBox.addEventListener('blur', function() {
        const uid = firebase.auth().currentUser.uid;
        const userBioRef = firebase.database().ref('/users/'+uid+'/bio');
        userBioRef.set(this.value);

        this.hidden = true;
        bioBox.hidden = false;
        bioBox.innerText = this.value;
    });
}





function populateSidebar() {
    const userTagsRef = firebase.database().ref('/users/'+currentUID+'/allTags');
    userTagsRef.orderByKey().on('child_added', snap => {

        const chatTag = snap.key;
        const chatId = snap.val();

        // get last message
        makePreviewWithLastMessage(chatTag, chatId)

    });
}

function changeChatOnClick(domElement, newTag, chatId) {
    domElement.addEventListener('click', function() {
        var dbRefObject = getDbRef(tag, chatId);
        initRef(dbRefObject);
    });
}

function populateProfileSidebar(user) {
    if (user) {
    const userRef = firebase.database().ref('/users/'+user.uid)
    userRef.once('value', snap => {
        const userObj = {};
        userObj.photo = user.photoUrl;
        userObj.uid = user.uid;
        userObj.fname = snap.val().firstName;
        userObj.lname = snap.val().lastName;
        userObj.bio = snap.val().bio;  // there is no bio yet
        userObj.tags = snap.val().allTags;
        addUserInfoToDom(userObj)
        })
    }
}

function addUserInfoToDom(userObj) {
    const profile = document.getElementById('user-profile');
    profile.querySelector("#user-display-name").innerText = userObj.fname + ' ' + userObj.lname;
    profile.querySelector("#user-pfp").src = userObj.photo;
    profile.querySelector("#user-bio").innerText = userObj.bio;

    const tagList = profile.querySelector("#user-tags");
    for (tag in userObj.tags) {
        if (userObj.tags.hasOwnProperty(tag)) {
            const tagNode = document.createElement('li');
            tagNode.innerText = tag;
            tagList.appendChild(tagNode);
        }
    }
}