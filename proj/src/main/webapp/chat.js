notifications = require('./notifications.js');
const MAX_CHAT_SIZE = 200;
const DEFAULT_PFP = "gs://arringtonh-step-2020-d.appspot.com/profile-pictures/default.png";

// Adds user to an existing chat when given a reference to the place in the database
function addUserToTag(reference, tag, newLat, newLong){
    currentUid = firebase.auth().currentUser.uid;
    const removalKey = reference.push(currentUid).key;
    const infoRef = reference.parent.child("chatInfo");
    infoRef.update({latitude : newLat, longitude : newLong});
    return removalKey;
}

// Creates a new chat given a tag and adds the current user as a member
function createNewChatWithUser(tag, lat, long){
    var time = new Date().getTime();
    var messageContent = "Welcome to the " + tag + " chat!";
    var newChat = {
        "chatInfo" : {
            "name" : tag,
            "tag" : tag,
            // Sets latitude and longitude to 0 because it's averaged by position of users in it
            "latitude" : 0,
            "longitude" : 0,
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
    var removalKey = addUserToTag(currentReference, tag, lat, long);
    return {'tag':postKey, 'tagRemoval':removalKey};
}

// Loops through open chat rooms, adds the user to the first open chat and returns the key
function findChatAndAddUser(snapshot, tag, lat, long){
    var key;
    var removalKey;
    var chatLat;
    var chatLong;
    const precision = .5;

    var foundOpenRoom = false;
    snapshot.forEach(function(childSnapshot){
        key = childSnapshot.key;

        var infoSnapshot = childSnapshot.child("chatInfo");
        // Has both lat and long if it has latitude
        if(infoSnapshot.hasChild("latitude")){
            chatLat = infoSnapshot.child("latitude").val();
            chatLong = infoSnapshot.child("longitude").val();
        }
        else{
            chatLat = 999;
            chatLong = 999;
        }

        var userSnapshot = childSnapshot.child("users");
        var usersReference = userSnapshot.ref;

        var numUsers = userSnapshot.numChildren();
        // Handled below if spillover is needed
        if(numUsers < MAX_CHAT_SIZE && Math.abs(chatLat - lat) < precision && Math.abs(chatLong - long) < precision){
            chatLat = ((chatLat*numUsers) + lat)/(numUsers + 1);
            chatLong = ((chatLong*numUsers) + long)/(numUsers + 1);
            removalKey = addUserToTag(usersReference, tag, chatLat, chatLong);
            foundOpenRoom = true;
            return true;
        }
    });
    if(foundOpenRoom){
        return {'tag':key,'tagRemoval':removalKey};
    } else {
        // Create new chat if room is full, add new user
        return createNewChatWithUser(tag, lat, long);
    }
}


// Create or join chatroom
function createOrJoinChat(currentTag, lat, long){
    var ref = firebase.database().ref("/chat/");
    return ref.once("value").then(function(snapshot){
        // Checks to see if tag already exists in database
        if(snapshot.hasChild(currentTag)){
            // If tag already exists, navigate to users and add users if there is room
            var query = firebase.database().ref("/chat/" + currentTag + "/").orderByKey();
            return query.once("value").then(function(snapshot){

                //adds user to chat and returns key
                return findChatAndAddUser(snapshot, currentTag, lat, long);
            });
        }
        else{
            // Create new chat if tag does not exist yet
           return createNewChatWithUser(currentTag, lat, long);
        }
    }).catch(function(err){
        console.log("unexpected error searching for chat rooms:", err);
    });
}

function getExistingTags(ref){
    var currentTags = {};
    return ref.once("value").then(function(dataSnapshot){
        dataSnapshot.forEach(function(tagSnapshot){
            currentTags[tagSnapshot.key] = tagSnapshot.val();
        });
        return currentTags;
    });
}

function removeAllCurrentTags(currentTags, allTagsRef, tagRemovalRef, abridgedTagsRef, lat, long){
    return new Promise(async function(resolve){
        for(var remainingTag in currentTags){
            await removeUserFromChatByTag(remainingTag, allTagsRef, tagRemovalRef, abridgedTagsRef, lat, long);
        }

        resolve(1);
    });

}

async function setUserTags(tagList){
    if(firebase.auth().currentUser){
        var lat;
        var long;

        const currentUid = firebase.auth().currentUser.uid;
        const abridgedTagsRef = "/users/" + currentUid + "/allTags";
        const abridgedTagRemovalRef = "/users/" + currentUid + "/tagRemovalDict";
        
        var allTagsRef;
        var tagRemovalRef;
        await new Promise(function(resolve){
            allTagsRef = firebase.database().ref(abridgedTagsRef);
            tagRemovalRef = firebase.database().ref(abridgedTagRemovalRef);
            const userDataRef = allTagsRef.parent;
            userDataRef.once("value").then(function(snapshot){
                lat = snapshot.child("latitude").val();
                long = snapshot.child("longitude").val();
            });
            resolve(1);
        });

        var currentTags = await getExistingTags(allTagsRef);
        var currentTagRemovalDict = await getExistingTags(tagRemovalRef);
        var allTags = {};
        var tagRemovalDict = {};

        new Promise(async function(resolve){
            // If tag is not in existing list of tags, adds user to the chat
            // If user already has tag, deletes tag from list of current tags (as every remaining
                // tag will be removed)
            for(var ii = 0; ii < tagList.length; ii++){
                var tag = tagList[ii];
                if(!currentTags.hasOwnProperty(tag) && !allTags.hasOwnProperty(tag)){
                    let keys = await createOrJoinChat(tag, lat, long);
                    allTags[tag] = keys['tag'];
                    tagRemovalDict[tag] = keys['tagRemoval'];
                    notifications.subscribeToTagChatId(tag, keys['tag']);
                }
                else{
                    allTags[tag] = currentTags[tag];
                    tagRemovalDict[tag] = currentTagRemovalDict[tag];
                    delete currentTags[tag];
                    delete currentTagRemovalDict[tag];
                }
            }

            await removeAllCurrentTags(currentTags, allTagsRef, tagRemovalRef, abridgedTagsRef, lat, long);

            resolve(1);
        }).then(function(){
            var updates = {};
            updates[abridgedTagsRef] = allTags;
            firebase.database().ref().update(updates).then(function(){
                // After updating tags, update tag removal keys
                var tagRemovalUpdates = {};
                tagRemovalUpdates[abridgedTagRemovalRef] = tagRemovalDict;
                firebase.database().ref().update(tagRemovalUpdates);
                console.log("chats changed successfully");
            });
        });
    }
}

async function addUserTags(tagList){
    if(firebase.auth().currentUser){
        var lat;
        var long;

        const currentUid = firebase.auth().currentUser.uid;
        const abridgedTagsRef = "/users/" + currentUid + "/allTags";
        const abridgedTagRemovalRef = "/users/" + currentUid + "/tagRemovalDict";

        var allTagsRef;
        var tagRemovalRef;
        await new Promise(function(resolve){
            allTagsRef = firebase.database().ref(abridgedTagsRef);
            tagRemovalRef = firebase.database().ref(abridgedTagRemovalRef);
            const userDataRef = allTagsRef.parent;
            userDataRef.once("value").then(function(snapshot){
                lat = snapshot.child("latitude").val();
                long = snapshot.child("longitude").val();
            });
            resolve(1);
        });

        var currentTags = await getExistingTags(allTagsRef);
        var currentTagRemovalDict = await getExistingTags(tagRemovalRef);
        var allTags = {};
        var tagRemovalDict = {};
        for(var property in currentTags){
            allTags[property] = currentTags[property];
            tagRemovalDict[property] = currentTagRemovalDict[property];
        }

        new Promise(async function(resolve){
            for(var ii = 0; ii < tagList.length; ii++){
                var tag = tagList[ii];
                if(!allTags.hasOwnProperty(tag)){
                    let keys = await createOrJoinChat(tag, lat, long);
                    allTags[tag] = keys['tag'];
                    tagRemovalDict[tag] = keys['tagRemoval'];
                    notifications.subscribeToTagChatId(tag, keys['tag'])
                }
            }

            resolve(1);
        }).then(function(){
            var updates = {};
            updates[abridgedTagsRef] = allTags;
            firebase.database().ref().update(updates).then(function(){

                // After updating tags, update tag removal keys
                var tagRemovalUpdates = {};
                tagRemovalUpdates[abridgedTagRemovalRef] = tagRemovalDict;
                firebase.database().ref().update(tagRemovalUpdates);
                console.log("tags added successfully");
            });
        });
    }
}

async function removeUserFromChatByTag(tag, allTagsRef, tagRemovalRef, abridgedTagsRef, lat, long){

    var numUsers;
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
            notifications.unsubscribeFromTagChatId(tag, chatId);
        }).finally(async function(){
            // Removes user from chat
            const chatRef = firebase.database().ref("/chat/" + tag + "/" + chatId + "/users/" + removalKey);
            chatRef.remove();
            await chatRef.parent.once("value").then(async function(snapshot){
                numUsers = await snapshot.numChildren();
            });
            // Removes tag removal key from user 
            var allTagsWithTagRef = firebase.database().ref(abridgedTagsRef + "/" + tag);
            allTagsWithTagRef.remove();
        });
    });

    const infoRef = firebase.database().ref("/chat/" + tag + "/" + chatId + "/chatInfo");
    if(numUsers > 0){
        // Updates location of chat
        var chatLat;
        var chatLong;
        infoRef.once("value").then(function(snap){
            chatLat = snap.child("latitude").val();
            chatLong = snap.child("longitude").val();
        }).finally(function(){
            // numUsers is the number of users remaining after removal
            // There is a check to make sure numUsers is not 0
            chatLat = (chatLat * (numUsers+1) - lat)/numUsers;
            chatLong = (chatLong * (numUsers+1) - long)/numUsers;
            infoRef.update({latitude : chatLat, longitude : chatLong});
        });
    }
    else{
        // Deletes chat
        infoRef.parent.update({chatInfo: null, messages: null});
    }

}

/*
    Realtime Database
 */
const LIMIT = 20; // how many messages to load at a time
const TAG_1ON1 = 'chats-1on1';
// Broad init function
function initChat() {
    firebase.auth().onAuthStateChanged(async firebaseUser => {
        if(firebaseUser){
            // If the user is verified or using a test server
            if(firebaseUser.emailVerified || window.location.href.includes("https://8080")){
                if(firebaseUser.emailVerified){
                    console.log("You have been verified as a Camaraderie user");
                } else {
                    console.log("You have been verified as a Camaraderie testing developer");
                }

                setupSidebar();
                clickWithEnterKey();
                initDeleteAccountButton();
                notifications.initNotifications();

                // InitUserChat sets information relevant to logged-in user
                // Must run before enclosed functions
                await initUserChat().then(function(){
                    var lastVisited;
                    const dbRef = firebase.database().ref("/users/" + firebaseUser.uid + "/lastVisited/");
                    dbRef.once('value', snap => {
                        lastVisited = snap.child(sessionStorage.activeChatTag).val();
                    });

                    populateSidebar();
                    initRef(lastVisited);
                    populateProfileSidebar(firebaseUser.uid);
                    addBlockedToSettings();
                });
            }
            else{
                firebaseUser.sendEmailVerification().then(function(){
                    alert("An email has been sent to your account for verification. " +
                    "\n\nPlease follow the verification link and then refresh the page.");
                }).catch(function(err){
                    console.log("There has been an error sending an email to your account", err);
                });
            }
        }
        else{
            console.log("You logged out")
            window.location.replace("/static/welcome.html");
        }
    });

    const chat = document.getElementById('message-list');
    chat.addEventListener('scroll', addMoreMessagesAtTheTop);
    document.getElementById('pfp-upload').oninput = pfpOnInput;
}

function initUserChat(){
    const currentUid = firebase.auth().currentUser.uid;
    const userTagsRef = firebase.database().ref('/users/'+currentUid+'/allTags');

    // Wraps content function in a promise to ensure it runs before wrest of init
    return new Promise(function(resolve){
        var query = firebase.database().ref(userTagsRef).orderByKey();
        query.once("value").then(function(snapshot) {
            snapshot.forEach(function(childSnapshot) {
                var key = childSnapshot.key;
                var chatId = childSnapshot.val();
                if (key && chatId) {
                    sessionStorage.activeChatTag = key;
                    sessionStorage.activeChatId = chatId;
                    return true;
                }
            });
            resolve(1);
        });
    });
}


// Sets title of page
function setTitle(){
    nameRef = getActiveDbRef().parent.child('chatInfo');
    nameRef.once("value").then(function(snapshot){
        var data = snapshot.child("name").val();
        var presentableTitle = data.charAt(0).toUpperCase() + data.slice(1);
        document.getElementById("big-title").innerText = presentableTitle;
    });
}

// initializes the .on() functions for the database reference
function initRef(lastVisited) {
    let dbRefObject = getActiveDbRef();
    const chat = document.getElementById('chatbox');
    chat.innerHTML = '';
    const currentUid = firebase.auth().currentUser.uid;

    setTitle();

    // note that when a comment is added it will display more than the limit, which
    // is intentional
    dbRefObject.off('child_added');
    blockedRef = firebase.database().ref('/users/'+currentUid+'/blocked')
    blockedRef.once('value').then(function(snap) {
        return snap.val(); // dict of blocked users
    }).then(function(blockedUsers) {
        blockedUsers = blockedUsers || {};
        var firstMessageSkipped = false;
        //Makes messages visible
        dbRefObject.orderByChild("timestamp").limitToLast(LIMIT + 1).on('child_added', snap => {
            messageUid = snap.val().senderUID;
            if (!blockedUsers[messageUid]) {
                if (!firstMessageSkipped) {
                    firstMessageSkipped = true;
                } else {
                    messageDom = createMessageWithTemplate(snap.key, snap.val(), currentUid, lastVisited);
                    chat.appendChild(messageDom);
                }
            }
        })
    })
}

function pushChatMessage() {
    const messageInput = document.getElementById('message-input');
    const currentUid = firebase.auth().currentUser.uid;
    // prevent blank messages
    if (messageInput.value.trim().length != 0){
        var message = {
            content : messageInput.value,
            timestamp : new Date().getTime(),
            senderDisplay : firebase.auth().currentUser.displayName,
            senderUID : currentUid
        }
        // push message to datastore
        let dbRefObj = getActiveDbRef();
        dbRefObj.push(message);

        // scroll down chat history to show recent message
        var chatHistory = document.getElementById("message-list");
        chatHistory.scrollTop = chatHistory.scrollHeight;

        // update chatInfo
        const chatRef = dbRefObj.parent.child('chatInfo');
        chatRef.update({
            'lastAuthor': message.senderUID,
            'lastMessage': message.content,
            'timestamp': message.timestamp
        });
        notifications.sendNotificationForChat(message)

        const unreadClasses = document.querySelectorAll('.unread');
        unreadClasses.forEach(unreadMarker => {
            unreadMarker.classList.add('invisible');
        });

        // updates last visited property
        const dbRef = firebase.database().ref("/users/" + currentUid + "/lastVisited/");
        var date = new Date();
        var timestamp = date.getTime();
        var updates = {};
        updates[sessionStorage.activeChatTag] = timestamp;
        dbRef.update(updates);
    }
    messageInput.value = null; // clear the message
}

function addMoreMessagesAtTheTop() {
    const chatbox = document.getElementById('chatbox');
    const messages = document.getElementById('message-list');
    const currentUid = firebase.auth().currentUser.uid;

    if (messages.scrollTop === 0) {
        const blockedRef = firebase.database().ref('/users/'+currentUid+'/blocked');

        blockedRef.once('value').then(function(snap) {
            // dict of blocked users
            return snap.val();
        }).then(function(blockedUsers) {
            blockedUsers = blockedUsers || {};

            const firstChild = chatbox.firstChild;
            const firstChildTimestamp = firstChild.querySelector('#timestamp').dataMilli; // timestamp

            getActiveDbRef().orderByChild("timestamp").endAt(firstChildTimestamp, firstChild.id).limitToLast(LIMIT + 1).once("value", snap => {
                snap.forEach(function(child) {
                    const messageUid = child.val().senderUID;

                    if (!blockedUsers[messageUid] && child.key !== firstChild.id) {
                        const message = createMessageWithTemplate(child.key, child.val(), currentUid, 0);
                        chatbox.insertBefore(message, firstChild);
                    }
                });
            });
        });
    }
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

function createMessageWithTemplate(key, messageObj, currentUid, lastVisited) {
    const messageTemplate = document.getElementById('message-temp');
    const docFrag = messageTemplate.content.cloneNode(true);
    const message = docFrag.querySelector('.message')

    const msgHeader = message.querySelector('.message-header');
    loadProfileOfSender(msgHeader, messageObj.senderUID);
            
    const msgBody = message.querySelector('.message-body');
    msgBody.innerText = messageObj.content;

    const timestamp = message.querySelector('#timestamp');
    timestamp.dataMilli = messageObj.timestamp;
    timestamp.innerText = new Date(messageObj.timestamp).toLocaleString();

    // add pfp
    const pfpRef = firebase.database().ref('/users/'+messageObj.senderUID+'/photo');
    pfpRef.once('value', function(snap) {
        const url = snap.val() || DEFAULT_PFP;
        storageRef = firebase.storage().refFromURL(url);
        storageRef.getDownloadURL().then(function(src) {
            message.querySelector('#pfp').src = src;
        })
    })
    if((messageObj.timestamp > lastVisited) && lastVisited != 0 && messageObj.senderUID != firebase.auth().currentUser.uid){
        message.querySelector('.unread').classList.remove('invisible');
    }
    

    message.id = key;
    message.dataset.userId = messageObj.senderUID;
    addUsernameToMessage(messageObj.senderUID, message)
    return message;
}

// onclick for messages
function loadProfileOfSender(domElement, uid) {
    domElement.addEventListener('click', function() {
        // close friend req/blocked listeners before adding more
        const currentUid = firebase.auth().currentUser.uid;
        const friendReqRef = firebase.database().ref('/users/'+currentUid+'/friend-requests/'+uid);
        friendReqRef.off();
        const blockedRef = firebase.database().ref('/users/'+currentUid+'/blocked/'+uid);
        blockedRef.off();

        populateProfileSidebar(uid);
    })
}

function friendRequestButton(uid) {
    const currentUid = firebase.auth().currentUser.uid;
    const currUserRef = firebase.database().ref('/users/'+currentUid+'/friend-requests/'+uid);
    const otherUserRef = firebase.database().ref('/users/'+uid+'/friend-requests/'+currentUid);

    const button = document.getElementById('friend-request');

    currUserRef.on('value', function(snap) {
        switch (snap.val()) {
            case 'sent':
                // cancel friend request
                deny.hidden = true;
                button.innerText = 'cancel friend request';
                button.onclick = function() {
                    currUserRef.remove();
                    otherUserRef.remove();
                };
                break;
            case 'received':
                // accept or deny
                button.innerText = 'accept friend request';
                button.onclick = function() {
                    currUserRef.remove();
                    otherUserRef.remove();

                    const currFriendRef = firebase.database().ref('/users/'+currentUid+'/friends/'+uid);
                    const otherFriendRef = firebase.database().ref('/users/'+uid+'/friends/'+currentUid);

                    const oneOnOneRef = firebase.database().ref(`/chat/${TAG_1ON1}`);
                    const chatId = oneOnOneRef.push().key;
                    createFriendChat(chatId, uid);
                    currFriendRef.set(chatId);
                    otherFriendRef.set(chatId);

                    deny.hidden = true;
                    deny.onclick = null;
                };

                deny = document.getElementById('deny');
                deny.onclick = function () {
                    currUserRef.remove();
                    otherUserRef.remove();

                    deny.hidden = true;
                    deny.onclick = null;
                };
                deny.hidden = false;
                break;
            default:
                deny.hidden = true;
                // check if already friends, then send request
                const currFriendRef = firebase.database().ref('/users/'+currentUid+'/friends/'+uid);
                const otherFriendRef = firebase.database().ref('/users/'+uid+'/friends/'+currentUid);

                currFriendRef.off();
                currFriendRef.on('value', function(snap) {
                    if (snap.val()) {
                        // already friends, unfriend button
                        button.innerText = 'unfriend';
                        button.onclick = function() {
                            currFriendRef.remove();
                            otherFriendRef.remove();

                            // delete friend chat
                            const oneOnOneRef = firebase.database().ref(`/chat/${TAG_1ON1}`);
                            oneOnOneRef.child(snap.val()).remove();
                        };
                    } else {
                        // not friends, send request
                        button.innerText = 'send friend request';
                        button.onclick = function() {
                            currUserRef.set('sent');
                            otherUserRef.set('received');
                        };
                    }
                })
                
        }
        button.hidden = false;
    });
}

/*
    1 on 1 chat between friends
*/

async function createFriendChat(chatId, friendUid) {
    const chatRef = firebase.database().ref(`/chat/${TAG_1ON1}`);

    // set users' ref to the chat id
    const currentUid = firebase.auth().currentUser.uid;
    const currFriendRef = firebase.database().ref('/users/'+currentUid+'/friends/'+friendUid);
    await currFriendRef.set(chatId);
    const otherFriendRef = firebase.database().ref('/users/'+friendUid+'/friends/'+currentUid);
    await otherFriendRef.set(chatId);

    // we gotta make a chat now
    const chatInfoObj = {
        'chatInfo': {
            'name': 'to be set later',
            'tag': TAG_1ON1,
        }
    }

    // fetch the users' names
    const currUserRef = firebase.database().ref('/users/'+currentUid);
    const friendRef = firebase.database().ref('/users/'+friendUid);

    await currUserRef.once('value', function(snap) {
        return snap.val();
    }).then(function(currSnap) {
        friendRef.once('value', async function(snap) {
            const currName = currSnap.val().firstName + ' ' + currSnap.val().lastName;
            const friendName = snap.val().firstName + ' ' + snap.val().lastName;
            const chatName = currName + ' and ' + friendName + "'s chat";
            chatInfoObj.chatInfo.name = chatName;
            
            // push new chat info to chats
            await chatRef.child(chatId).set(chatInfoObj);
        })
    })

}

function blockButton(uid) {
    const currentUid = firebase.auth().currentUser.uid;
    const currUserRef = firebase.database().ref('/users/'+currentUid+'/blocked/'+uid);
    const button = document.getElementById('block');
    

    currUserRef.on('value', function(snap) {
        if (snap.val()) {
            // user is blocked
            button.innerText = 'unblock user';
            button.onclick = function() {
                currUserRef.remove();
            }
        } else {
            // user not blocked
            button.innerText = 'block user';
            button.onclick = function() {
                currUserRef.set(true);
                // remove from each others' friend lists
                const currFriendRef = firebase.database().ref('/users/'+currentUid+'/friends/'+uid);
                const otherFriendRef = firebase.database().ref('/users/'+uid+'/friends/'+currentUid);

                currFriendRef.once('value', function(snap) {
                    if (snap.val()) {
                        currFriendRef.remove();
                        otherFriendRef.remove();
                    }
                })
            }
        }
    })
    button.hidden = false;
}

function getActiveDbRef() {
    if (!sessionStorage.activeChatTag || !sessionStorage.activeChatId) {
        return;
    }
    const path = "/chat/"+sessionStorage.activeChatTag+"/"+sessionStorage.activeChatId+"/messages";
    return firebase.database().ref(path);
}

async function makePreviewWithLastMessage(tag, chatId) {
    const tagRefObj = firebase.database().ref('/chat/'+tag+'/'+chatId+'/chatInfo')
    await tagRefObj.on('value', async function (snap) {
        chatInfoObj = snap.val();
        if (chatInfoObj) {
            const preview = await makeChatPreview(snap.val(), tag, chatId);
            const sidebar = document.getElementById('chats-submenu');
            sidebar.prepend(preview);
        }
    });
}

async function makeChatPreview(chatInfoObj, tag, chatId) {
    if (document.getElementById(chatId)) {
        oldPreview = document.getElementById(chatId);
        oldPreview.parentNode.removeChild(oldPreview);
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
    await userRef.once("value", snap => {
        if(snap.val()) {
            const fName = snap.val().firstName || ' ';
            const lName = snap.val().lastName || ' ';
            preview.querySelector('#username').innerText = fName + ' ' + lName;
            // add pfp
            const url = snap.val().photo || DEFAULT_PFP;
            if (sessionStorage[uid+" pfp"]) {
                const src = sessionStorage[uid+" pfp"];
                preview.querySelector("#pfp").src = src;
            } else {
                const pfpStorageRef = firebase.storage().refFromURL(url);
                pfpStorageRef.getDownloadURL().then(function(src) {
                    preview.querySelector("#pfp").src = src;
                    sessionStorage[uid+" pfp"] = src;
                })
                
            }
        }
    });
}

// function for when a user adds a picture
function pfpOnInput() {
    const input = document.getElementById("pfp-upload");
    const pfp = input.files[0];

    const currentUid = firebase.auth().currentUser.uid;
    const pfpStorageRef = firebase.storage().ref(`/profile-pictures/${currentUid}/pfp.png`);
    const uploadStatus = document.getElementById('upload-status')
    pfpStorageRef.put(pfp).then(function() {
        uploadStatus.innerText = 'upload success';
        setTimeout(function(){ uploadStatus.innerText = ''; }, 5000);
    }).catch(function(error) {
        uploadStatus.innerText = 'upload failed: '+error.message;
        setTimeout(function(){ uploadStatus.innerText = ''; }, 5000);
    }).then(function() {
        return pfpStorageRef.getDownloadURL();
    }).then(function(url) {
        const userPfpRef = firebase.database().ref(`/users/${currentUid}/photo`);
        userPfpRef.set(pfpStorageRef.toString());

        userPfp = document.getElementById('user-pfp');
        userPfp.src = url;

        input.files = null; // clear the input
        input.value = "";
        delete sessionStorage[currentUid +" pfp"]; // clear session storage
    })
}

function initBio() {
    const bioBox = document.getElementById('user-bio');
    const editInputBox = document.getElementById('bio-edit');

    bioBox.ondblclick = function() {
        this.hidden = true;

        editInputBox.hidden = false;
        editInputBox.value = this.innerText;

        editInputBox.focus();
    };

    editInputBox.onblur = function() {
        const uid = firebase.auth().currentUser.uid;
        const userBioRef = firebase.database().ref('/users/'+uid+'/bio');
        userBioRef.set(this.value);

        this.hidden = true;
        bioBox.hidden = false;
        bioBox.innerText = this.value;
    };
}

function unInitBio() {
    const bioBox = document.getElementById('user-bio');
    const editInputBox = document.getElementById('bio-edit');

    bioBox.ondblclick = null;
    editInputBox.onblur = null;
}


/*
    Chatroom sidebar
*/
function setupSidebar(){
    // Hides submenus
    // Profile and chat lists are in different submenus and appear when its sidebar option is clicked
    $('#body-row .collapse').collapse('hide');

    // Collapse/Expand icon
    $('#collapse-icon').addClass('fa-angle-double-left');

    // Collapse on click
    $('[data-toggle = sidebar-colapse]').click(function() {
        sidebarCollapse();
    });
}

$( document ).ready(function() {
    if (screen.width < 768) {
        checkLoadingDisplays();
    }

    // Adjust message template proportions
    if (screen.width < 800) {
        $('.img-col').removeClass('col-1');
        $('.img-col').addClass('col-2');
        $('.msg-col').removeClass('col-11');
        $('.msg-col').addClass('col-10');
    }
});

function sidebarCollapse () {
    // If the device is small, this will hide the chat when they open the side bar
    if (screen.width < 768) {
        $('.sidebar + .p-4').toggleClass('d-none');
    }

    // Hide sidebar when collpased on mobile screens
    if (screen.width < 543) {
        $('#sidebar-container').toggleClass('d-block');
    }

    // Collapse sidebar as normal
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

/*  This makes sure that the logic is working properly for the classes.
    This ensures that if the sidebar is opened on a mobile device, the chat is hidden.
    It also make sure that there is not an d-none tag on the chat if the sidebar
    is closed.
**/
function checkLoadingDisplays() {
    if ($( '#sidebar-container' ).hasClass( 'sidebar-collapsed' )) {
        $('.sidebar + .p-4').addClass('d-block');
    }
    else {
        $('.sidebar + .p-4').addClass('d-none');
    }
}

function populateSidebar() {
    const currentUid = firebase.auth().currentUser.uid;
    const userTagsRef = firebase.database().ref('/users/'+currentUid+'/allTags');

    userTagsRef.orderByKey().on('value', snap => {
        const sidebar = document.getElementById('chats-submenu');
        sidebar.innerHTML = '';
        for (tag in snap.val()) {
            chatId = snap.val()[tag];
            makePreviewWithLastMessage(tag, chatId)
        }
    });
}

function changeChatOnClick(domElement, tag, chatId) {
    domElement.addEventListener('click', function() {
        getActiveDbRef().off('child_added');
        sessionStorage.clear(); // clear pfps and activeChat data
        sessionStorage.activeChatTag = tag;
        sessionStorage.activeChatId = chatId;
        
        var lastVisited;
        var uid = firebase.auth().currentUser.uid;
        const dbRef = firebase.database().ref("/users/" + uid + "/lastVisited/");
        dbRef.once('value', snap => {
            lastVisited = snap.child(tag).val();
            initRef(lastVisited);
        }).finally(function(){
            var date = new Date();
            var timestamp = date.getTime();
            var updates = {};
            updates[tag] = timestamp;
            dbRef.update(updates);
        });
    });
}

function populateProfileSidebar(uid) {
    const userRef = firebase.database().ref('/users/'+uid)
    const auth = firebase.auth();

    userRef.once('value', snap => {
        const userObj = {};
        userObj.photo = snap.val().photo;
        userObj.uid = uid;
        userObj.fname = snap.val().firstName;
        userObj.lname = snap.val().lastName;
        userObj.bio = snap.val().bio;  // there is no bio yet
        userObj.tags = snap.val().allTags;
        userObj.email = auth.currentUser.email;
        addUserInfoToDom(userObj)
    })
}

function addUserInfoToDom(userObj) {
    const currentUid = firebase.auth().currentUser.uid;
    const profile = document.getElementById('user-profile');
    const tagContainer = profile.querySelector(".tag-container");
    tagContainer.innerHTML = '';
    
    if (userObj.uid !== currentUid) {
        friendRequestButton(userObj.uid);
        blockButton(userObj.uid);
        document.getElementById('change-pfp').classList.remove('d-flex');
        document.getElementById('change-pfp').hidden = true;
        unInitBio();
    } else {
        document.getElementById('friend-request').hidden = true;
        document.getElementById('block').hidden = true;
        initBio();
        addTagsToDom(currentUid);
        document.getElementById('change-pfp').classList.add('d-flex');
        document.getElementById('change-pfp').hidden = false;
    }

    profile.querySelector("#user-display-name").innerText = userObj.fname + ' ' + userObj.lname;

    const url = userObj.photo || DEFAULT_PFP;
    if (sessionStorage[userObj.uid+" pfp"]) {
        const src = sessionStorage[userObj.uid+" pfp"];
        profile.querySelector("#user-pfp").src = src;
    } else {
        const pfpStorageRef = firebase.storage().refFromURL(url);
        pfpStorageRef.getDownloadURL().then(function(src) {
            profile.querySelector("#user-pfp").src = src;
            sessionStorage[userObj.uid+" pfp"] = src;
        })
    }
    
    profile.querySelector("#user-bio").innerText = userObj.bio;

    profile.querySelector("#user-email").innerText = userObj.email;

    document.getElementById('friend-house').innerHTML = '';
    addFriendsToProfile(userObj.uid);

    for (tag in userObj.tags) {
        if (userObj.tags.hasOwnProperty(tag)) {
            addTag(tag, userObj.uid);
        }
    }
}

$( "#btnChangePassword" ).click(function() {
    initChangePasswordButton();
});

function initChangePasswordButton(){
    const auth = firebase.auth();
    const user = auth.currentUser;
    const email = user.email;
    var oldPassword = document.getElementById("oldPass").value;
    var newPassword = document.getElementById("newPass").value;
    const promise = auth.signInWithEmailAndPassword(email, oldPassword).then(function(){
        if (meetPWRequirements(newPassword)) {
            user.updatePassword(newPassword).then(function() {
                alert("Password changed successfully");
            }).catch(function(error) {
                alert(error.message);
            });
        }
    });
    // Catches errors for old passwords
    promise.catch(error => alert(error.message));
}

function meetPWRequirements(password){
    errors = [];
    if (password.length < 6) {
        errors.push("Your password must contain at least 6 characters."); 
    }
    if (password.search(/[0-9]/) < 0) {
        errors.push("Your password must contain at least one number."); 
    }
    if (password.search(/[$-/:-?{-~!"^_`@#\[\]\\]/) < 0) {
        errors.push("Your password must contain at least one symbol."); 
    }
    if (errors.length > 0) {
        // Shows what the new password is missing, if any
        alert(errors.join("\n"));
        return false;
    }
    return true;
}


function initDeleteAccountButton(){
    const txtEmail = document.getElementById("email");
    const txtPassword = document.getElementById("pass");
    const btnDelete = document.getElementById("btnDeleteAccount");

    btnDelete.addEventListener("click", async function () {
        const emailVal = txtEmail.value;
        const passVal = txtPassword.value;

        // Re-authenticate credentials
        const auth = firebase.auth();
        const promise = auth.signInWithEmailAndPassword(emailVal, passVal).then(function(){
            // Unsubscribe from chats 
            notifications.unSubscribeFromAllChats();
            
            // Deletes user from Database but save their old messages 
            const uid = firebase.auth().currentUser.uid;
            let userRef = firebase.database().ref('users/' + uid);
            userRef.remove();

            // Deletes user from Authentication 
            // A new account can be created with the previously associated email 
            var user = firebase.auth().currentUser;
            user.delete().then(function() {
                window.location.replace(welcome.html);
            }).catch(function(error) {
                error => alert(error.message);
            });
        });
        promise.catch(e => alert(e.message));
    });
}

// adds tag input
function addTagsToDom(uid) {
    tagsRef = firebase.database().ref('/users/'+uid+'/allTags');
    tagContainer = document.querySelector('.tag-container');

    const tagInput = document.createElement('input');
    tagInput.id = "tag-input";
    tagContainer.append(tagInput);
    tagInput.addEventListener('keyup', function(event) {
        if (event.keyCode === 13) { // enter key pressed
            tagsRef.once('value', function(snap) {
                var tags;
                if (snap.val()) {
                    tags = Object.keys(snap.val());
                } else {
                    tags = [];
                }
                const newTag = tagInput.value;
                if (!tags.includes(newTag)) {
                    tags.push(newTag);
                    addTag(newTag, uid);
                    addUserTags(tags);
                }
                tagInput.value = '';
            });
        }
    });
}

/*
    block list in settings section
*/

function addBlockedToSettings() {
    const currentUid = firebase.auth().currentUser.uid;
    const blockedRef = firebase.database().ref('/users/'+currentUid+'/blocked');
    blockedRef.on('value', function(snap) {
        const blockedHouse = document.getElementById('blocked-house');
        blockedHouse.innerHTML = '';

        snap.forEach(function(child) {
            const blockedUid = child.key;
            addBlockedToDom(blockedUid);
        })
    })
}

function addBlockedToDom(uid) {
    const blockedRef = firebase.database().ref('/users/'+uid);
    blockedRef.once('value', function(snap) {
        const name = snap.val().firstName + " " + snap.val().lastName;

        const blockedTemplate = document.getElementById('blocked-template');
        const docFrag = blockedTemplate.content.cloneNode(true);
        const blockedt = docFrag.querySelector('.blockedt');

        loadProfileOfSender(blockedt, uid); // go to profile on click

        blockedt.querySelector('#display-name').innerText = name;
        const blockedHouse = document.getElementById('blocked-house');
        blockedHouse.append(blockedt);

    })
}

/*
    friend list in profile section
*/

function addFriendsToProfile(uid) {
    const friendRef = firebase.database().ref('/users/'+uid+'/friends');
    friendRef.once('value', function(snap) {
        snap.forEach(function(child) {
            const friendUid = child.key;
            const chatId = child.val();
            addFriendToDom(uid, friendUid, chatId);
        })
    })
}

function addFriendToDom(profileUid, uid, chatId) {
    const friendRef = firebase.database().ref('/users/'+uid);
    friendRef.once('value', function(snap) {
        const friendTemplate = document.getElementById('friend-template');
        const docFrag = friendTemplate.content.cloneNode(true);
        const friend = docFrag.querySelector('.friend');

        if (sessionStorage[uid+" pfp"]) {
            const src = sessionStorage[uid+" pfp"];
            friend.querySelector('#pfp').src = src;
        } else {
            const url = snap.val().photo || DEFAULT_PFP;
            pfpRef = firebase.storage().refFromURL(url);
            pfpRef.getDownloadURL().then(function(src) {
                friend.querySelector('#pfp').src = src;
                sessionStorage[uid+" pfp"] = src;
            })
        }

        // add chat button
        const currentUid = firebase.auth().currentUser.uid;
        const button = friend.querySelector('#one-on-one');
        if (currentUid == profileUid) { // on own profile
            const tag = TAG_1ON1;
            changeChatOnClick(button, tag, chatId); // chat changes to 1on1 on button click
        } else { // remove button
            button.remove();
        }
        

        // sub to notifications
        notifications.subscribeToTagChatId(tag, chatId);
        

        loadProfileOfSender(friend, uid); // go to profile on click

        const displayName = friend.querySelector('#display-name');
        displayName.innerText = snap.val().firstName + ' ' + snap.val().lastName;

        const friendHouse = document.getElementById('friend-house');
        friendHouse.append(friend);
    })
}

/* 
    add and remove tags!
*/
function addTag(tag, uid) {
    const currentUid = firebase.auth().currentUser.uid;
    const tagTemplate = document.getElementById('tag-template');
    const docFrag = tagTemplate.content.cloneNode(true);
    const tagContainer = docFrag.querySelector(".tag");

    const label = tagContainer.querySelector('.label');
    label.innerText = tag;

    const close = tagContainer.querySelector('i');
    if (uid == currentUid) {
        close.id = tag;
        close.onclick = function() {
            const tagsRef = firebase.database().ref('/users/'+currentUid+'/allTags');
            tagsRef.once('value', function(snap) {
                const tagObj = snap.val();
                delete tagObj[tag];
                const tags = Object.keys(tagObj);
                setUserTags(tags);
                close.parentNode.remove();
            })
        };
    } else {
        close.remove();
    }

  const tagInput = document.getElementById('tag-input');
  document.querySelector('.tag-container').insertBefore(tagContainer, tagInput);
}

async function logout(){
    await notifications.unSubscribeFromAllChats();
    sessionStorage.clear();
    firebase.auth().signOut();
}

window.initChat = initChat;
window.pushChatMessage = pushChatMessage;
window.logout = logout;
exports.createOrJoinChat = createOrJoinChat;
exports.createFriendChat = createFriendChat;
exports.DEFAULT_PFP = DEFAULT_PFP;

