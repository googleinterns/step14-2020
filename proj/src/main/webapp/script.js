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


// Adds user to an existing chat when given a reference to the place in the database
function addUserToTag(reference){
    var currentUID = firebase.auth().currentUser.uid;
    console.log("adding new user to chat room with uid: " + currentUID);
    reference.push(currentUID);
}

// Creates a new chat given a tag and adds the current user as a member
function createNewChatWithUser(tag){
    console.log("creating new chat with tag: " + tag);
    var time = new Date().getTime();
    var messageContent = "Welcome to the " + tag + " chat!";
    var newChat = {
        "chatInfo" : {
            "name" : tag,
            "tag" : tag,
            "lastMessage" : messageContent,
            "timestamp" : time,
            "lastAuthor" : ""
        },
        "messages" : {
            "welcome" : {
                "content" : messageContent,
                "timestamp" : time,
                "senderDisplay" : "",
                "senderUID" : "admin"
            }
        }
    };
    var currentReference = firebase.database().ref("/chat/" + tag);
    var postKey = currentReference.push(newChat).key;
    currentReference = firebase.database().ref("/chat/" + tag + "/" + postKey + "/users/");
    addUserToTag(currentReference);

    return postKey;
}

MAX_CHAT_SIZE = 200;

// Loops through open chat rooms, adds the user to the first open chat and returns the key
function findChatAndAddUser(snapshot){
    var key;
    var foundOpenRoom = false;
    snapshot.forEach(function(childSnapshot){
        key = childSnapshot.key;
        console.log("key1 " + key);

        var userSnapshot = childSnapshot.child("users");
        var usersReference = userSnapshot.ref;

        // Handled below if spillover is needed
        if(userSnapshot.numChildren() < MAX_CHAT_SIZE){
            addUserToTag(usersReference);
            foundOpenRoom = true;
            return true;
        }
    });
    if(foundOpenRoom){
        return key;
    } else {
        // Create new chat if room is full, add new user
        return createNewChatWithUser(currentTag);
    }
}

// Create or join chatroom
function createOrJoinChat(currentTag){
    var ref = firebase.database().ref("/chat/");
    return ref.once("value").then(function(snapshot){
        // Checks to see if tag already exists in database
        if(snapshot.hasChild(currentTag)){

            // If tag already exists, navigate to users and add users if there is room
            var query = firebase.database().ref("/chat/" + currentTag + "/").orderByKey();
            return query.once("value").then(function(snapshot){

                //adds user to chat and returns key
                return findChatAndAddUser(snapshot);
            });
        }
        else{
            // Create new chat if tag does not exist yet
           return createNewChatWithUser(currentTag);
        }
    }).catch(function(err){
        console.log("unexpected error searching for chat rooms:", err);
    });
}


// Add sign up event
if(btnSignUp){
    btnSignUp.addEventListener("click", e => {
        const emailVal = txtEmail.value;
        const passVal = pass.value;
        var tagList = tagStr.value.split(',');
        for(var ii = 0; ii < tagList.length; ii++){
            tagList[ii] = tagList[ii].trim();
        }

        // Initialize auth object
        const auth = firebase.auth();
        auth.useDeviceLanguage();

        auth.createUserWithEmailAndPassword(emailVal, passVal).then(async function(){
            var allTags = {};
            for(var ii = 0; ii < tagList.length; ii++){

                var tag = tagList[ii];
                var key = await createOrJoinChat(tag)
                allTags[tag] = key;
            }

            const user = auth.currentUser;
            user.updateProfile({
                displayName: fname.value + " " + lname.value
                }).then(function(){
                console.log("display name updated successfully");
                firebase.database().ref("users/" + auth.currentUser.uid).set({
                    firstName : fname.value,
                    lastName : lname.value,
                    allTags : allTags,
                    bio : "I'm a new user! Say hi!"
                }).then(function(){
                    window.location.replace("chat.html");
                });
            }).catch(function(err){
                console.log("error updating display name:", err);
            });
        });

    });
}

if(btnLogout){
    btnLogout.addEventListener("click", e => {
        firebase.auth().signOut();
        window.location.replace("welcome.html");
        console.log("You logged out")
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
        const chatName = snap.val().name;
        const messageContent = snap.val().lastMessage;
        const uid = snap.val().lastAuthor;

        const preview = await makeChatPreview(chatName, messageContent, uid, tag, chatId);

        const sidebar = document.getElementById('chats-submenu');
        sidebar.prepend(preview);
    });
}

async function makeChatPreview(name, messageContent, uid, tag, chatId) {
    if (document.getElementById(chatId)) {
        oldPreview = document.getElementById(chatId);
        oldPreview.remove();
    }

    const previewTemplate = document.getElementById('chat-preview-temp');
    const docFrag = previewTemplate.content.cloneNode(true);
    const preview = docFrag.querySelector(".chat-preview")

    const chatName = preview.querySelector('#chat-name');
    chatName.innerText = name;
    const msgBody = preview.querySelector('.message-body');
    msgBody.innerText = messageContent;
    preview.setAttribute("id", chatId)
    changeChatOnClick(preview, tag, chatId);
    await addUsernameToMessage(uid, preview);

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

/*
    Location
 */

var position;

function successCallback(pos){
    position = pos;
    console.log(pos);
}

function errorCallback(err){
    console.log("error");
}

function getLocation() {
    if(navigator.geolocation){
        navigator.geolocation.getCurrentPosition(successCallback,errorCallback,{timeout:10000, enableHighAccuracy:false});
    }
    else{
        console.log("Error. Geolocation not supported or not enabled");
    }
    return;
}


/*
    Chatroom sidebar
 */ 

// Hides submenus. Profile and chat lists are in different submenus and appear when its sidebar option is clicked.
$('#body-row .collapse').collapse('hide'); 

// Collapse/Expand icon
$('#collapse-icon').addClass('fa-angle-double-left'); 

// Collapse on click
$('[data-toggle=sidebar-colapse]').click(function() {
    SidebarCollapse();
});

// Currently hides the sidebar on smaller and medium screens (TODO: adjust screen for different screen sizes)
function SidebarCollapse () {
    $('.menu-collapsed').toggleClass('d-none');
    $('.sidebar-submenu').toggleClass('d-none');
    $('.submenu-icon').toggleClass('d-none');
    $('#sidebar-container').toggleClass('sidebar-expanded sidebar-collapsed');
    
    // Treating d-flex/d-none on separators with title
    var SeparatorTitle = $('.sidebar-separator-title');
    if ( SeparatorTitle.hasClass('d-flex') ) {
        SeparatorTitle.removeClass('d-flex');
    } else {
        SeparatorTitle.addClass('d-flex');
    }
    
    // Collapse/Expand icon
    $('#collapse-icon').toggleClass('fa-angle-double-left fa-angle-double-right');
}
