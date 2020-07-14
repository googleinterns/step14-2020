/*
    Authentication
 */

const MAX_CHAT_SIZE = 200;

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

// TODO: Make local variable; rewrite to allow for returning of keyIdDict
var keyIdDict = {};

// Adds user to an existing chat when given a reference to the place in the database
function addUserToTag(reference, tag){
    currentUID = firebase.auth().currentUser.uid;
    console.log("adding new user to chat room with uid: " + currentUID);
    const removalKey = reference.push(currentUID).key;
    keyIdDict[tag] = removalKey;
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
    addUserToTag(currentReference, tag);

    return postKey;
}

// Loops through open chat rooms, adds the user to the first open chat and returns the key
function findChatAndAddUser(snapshot, tag){
    var key;
    var foundOpenRoom = false;
    snapshot.forEach(function(childSnapshot){
        key = childSnapshot.key;

        var userSnapshot = childSnapshot.child("users");
        var usersReference = userSnapshot.ref;

        // Handled below if spillover is needed
        if(userSnapshot.numChildren() < MAX_CHAT_SIZE){
            addUserToTag(usersReference, tag);
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
                return findChatAndAddUser(snapshot, currentTag);
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
                var key = await createOrJoinChat(tag);
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
                    tagRemovalDict : keyIdDict,
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



function getExistingTags(ref){
    var currentTags = {};
    console.log(ref.toString());
    return ref.once("value").then(function(dataSnapshot){
        dataSnapshot.forEach(function(tagSnapshot){
            currentTags[tagSnapshot.key] = tagSnapshot.val();
        });
        return currentTags;
    });
}

function removeAllCurrentTags(currentTags, allTagsRef, tagRemovalRef, abridgedTagsRef){
    return new Promise(async function(resolve){
        for(var remainingTag in currentTags){
            await removeUserFromChatByTag(remainingTag, allTagsRef, tagRemovalRef, abridgedTagsRef);
        }

        resolve(1);
    });

}

async function setUserTags(tagList){
    if(firebase.auth().currentUser){

        const abridgedTagsRef = "/users/" + firebaseUser.uid + "/allTags";
        const abridgedTagRemovalRef = "/users/" + firebaseUser.uid + "/tagRemovalDict";
        const allTagsRef = firebase.database().ref(abridgedTagsRef);
        const tagRemovalRef = firebase.database().ref(abridgedTagRemovalRef);

        var currentTags = await getExistingTags(allTagsRef);
        var allTags = {};
        keyIdDict = await getExistingTags(tagRemovalRef);

        new Promise(async function(resolve){
            // If tag is not in existing list of tags, adds user to the chat
            // If user already has tag, deletes tag from list of current tags (as every remaining
                // tag will be removed)
            for(var ii = 0; ii < tagList.length; ii++){
                var tag = tagList[ii];
                var key;
                if(!currentTags.hasOwnProperty(tagList[ii]) && !allTags.hasOwnProperty(tagList[ii])){
                    key = await createOrJoinChat(tag);
                }
                else{
                    key = currentTags[tag];
                    delete currentTags[tag];
                }
                allTags[tag] = key;
            }

            await removeAllCurrentTags(currentTags);

            resolve(1);
        }).then(function(){
            var updates = {};
            updates[abridgedTagsRef] = allTags;
            firebase.database().ref().update(updates).then(function(){
                // After updating tags, update tag removal keys
                var tagRemovalUpdates = {};
                tagRemovalUpdates[abridgedTagRemovalRef] = keyIdDict;
                firebase.database().ref().update(tagRemovalUpdates);
                console.log("chats changed successfully");
            });
        });
    }
}

async function addUserTags(tagList){
    if(firebase.auth().currentUser){

        const abridgedTagsRef = "/users/" + firebaseUser.uid + "/allTags";
        const allTagsRef = firebase.database().ref(abridgedTagsRef);

        var currentTags = await getExistingTags(allTagsRef);
        var allTags = {};
        keyIdDict = await getExistingTags(tagRemovalRef);

        for(var property in currentTags){
            allTags[property] = currentTags[property];
        }

        new Promise(async function(resolve){
            for(var ii = 0; ii < tagList.length; ii++){
                var tag = tagList[ii];
                var key;
                if(!allTags.hasOwnProperty(tagList[ii])){
                    key = await createOrJoinChat(tag);
                    allTags[tag] = key;
                }
            }

            resolve(1);
        }).then(function(){
            var updates = {};
            updates[abridgedTagsRef] = allTags;
            firebase.database().ref().update(updates).then(function(){

                // After updating tags, update tag removal keys
                var tagRemovalUpdates = {};
                tagRemovalUpdates[abridgedTagRemovalRef] = keyIdDict;
                firebase.database().ref().update(tagRemovalUpdates);
                console.log("tags added successfully");
            });
        });
    }
}

async function removeUserFromChatByTag(tag, allTagsRef, tagRemovalRef, abridgedTagsRef){
    // Can't be an invalid ref (will be valid ref if tags exist; this is tag removal function)
    // Gets tag removal key
    // tagRemovalRef = ref@ "/users/" + firebaseUser.uid + "/tagRemovalDict"

    var removalKey;
    var chatId;
    await tagRemovalRef.once("value").then(function(snapshot){
        //Gets removal key to remove specific user from chat
        var data = snapshot.val();
        removalKey = data[tag];
    }).then(async function(){
        // allTagsRef = ref@ "/users/" + firebaseUser.uid + "/allTags";
        await allTagsRef.once("value").then(function(snapshot2){
            // Gets chatId to remove user from
            var data2 = snapshot2.val();
            chatId = data2[tag];
        }).finally(function(){
            // Removes user from chat
            var chatRef = firebase.database().ref("/chat/" + tag + "/" + chatId + "/users/" + removalKey);
            chatRef.remove();

            // Removes tag removal key from user 
            var allTagsWithTagRef = firebase.database().ref(abridgedTagsRef + "/" + tag);
            allTagsWithTagRef.remove();

            // Removes tag removal key as well
            delete keyIdDict[tag];
        });
    });

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

            clickWithEnterKey();

            // InitUserChat sets information relevant to logged-in user
            // Must run before enclosed functions
            await initUserChat().then(function(){
                populateSidebar();
                initRef(dbRefObject);
                populateProfileSidebar(firebaseUser);
                initBio();
            });
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
    
    preview.setAttribute("id", chatId);
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

function changeChatOnClick(domElement, tag, chatId) {
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