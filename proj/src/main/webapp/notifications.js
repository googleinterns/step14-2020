const appconfig = require('./appconfig.js');
/*
    Notifications
 */
function getTopic(tag,chatId) {
    return "/topics/"+tag+"."+chatId
}

async function getToken(){
    const messaging = firebase.messaging();
    return await messaging.getToken().then((currentToken) => {
        if (currentToken) {
            return currentToken;
        } else {
            console.log('No Instance ID token available. Request permission to generate one.');
        }
    }).catch((err) => {
        console.log('An error occurred while retrieving token. ', err);
    });
}

async function initNotifications() {
    const messaging = firebase.messaging();
    await messaging.requestPermission()
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
    subscribeToAllChats()
    messaging.onMessage((payload) => {
        if (!((payload.data.tag==sessionStorage.activeChatTag)&&(payload.data.chatId==sessionStorage.activeChatId))){
            console.log("RECEIVED A MESSAGE FROM A NON-ACTIVE CHAT:", payload);
            // TODO: Show in page popup or notification and update the chat preview for that chat here
        }
    });
}
function subscribeToAllChats() {
    currentUid = firebase.auth().currentUser.uid;
    tagsRef = firebase.database().ref('/users/'+currentUid+'/allTags');
    tagsRef.once('value', function(snap) {
        if (snap.val()) {
            for (const [tag,chatId] of Object.entries(snap.val())) {
                subscribeToTagChatId(tag, chatId)
            }
        }
    });
}

async function unSubscribeFromAllChats() {
    currentUid = firebase.auth().currentUser.uid;
    tagsRef = firebase.database().ref('/users/'+currentUid+'/allTags');
    await tagsRef.once('value', async function(snap) {
        if (snap.val()) {
            for (const [tag,chatId] of Object.entries(snap.val())) {
                await unsubscribeFromTagChatId(tag, chatId)
            }
        }
    });
}

async function unsubscribeFromTagChatId(tag, chatId) {
    const token = await getToken();
    url = "https://iid.googleapis.com/iid/v1:batchRemove";
    payload = {
        "to": getTopic(tag,chatId),
        "registration_tokens": [token]
    }
    $.ajax({
        url: url,
        type: 'post',
        data: JSON.stringify(payload),
        dataType: 'json',
        headers: {
            "Content-Type": 'application/json',
            "Authorization": appconfig.serverKey
        }
    });
}

async function subscribeToTagChatId(tag, chatId) {
    const token = await getToken();
    url = "https://iid.googleapis.com/iid/v1/"+token+"/rel"+getTopic(tag,chatId);
    $.ajax({
        url: url,
        type: 'post',
        headers: {
            "Content-Type": 'application/json',
            "Authorization": appconfig.serverKey
        }
    });
}

function sendNotificationForChat(message) {
    const tag = sessionStorage.activeChatTag;
    const chatId = sessionStorage.activeChatId;
    const name = message.senderDisplay;
    notificationBody = name+' has sent a message:\n\n'+message.content
    let payload = {
        "to": getTopic(tag,chatId),
        "notification": {
            "title": tag,
            "body": notificationBody,
            "icon": '/static/images/friendsChatting.png',
            "click_action": 'https://8080-9f73b32e-6ccb-426e-8d6e-c03d6f324666.us-west1.cloudshell.dev/static/chat.html'
        },
        "data":{
            "tag": tag,
            "chatId": chatId,
            "name" : name,
            "time" : message.timestamp
        }
    }
    $.ajax({
        url: 'https://fcm.googleapis.com/fcm/send',
        type: 'post',
        data: JSON.stringify(payload),
        dataType: 'json',
        headers: {
            "Content-Type": 'application/json',
            "Authorization": appconfig.serverKey
        },
        dataType: 'json'
    });
}


exports.initNotifications = initNotifications;
exports.subscribeToTagChatId = subscribeToTagChatId;
exports.unsubscribeFromTagChatId = unsubscribeFromTagChatId;
exports.sendNotificationForChat = sendNotificationForChat;
exports.unSubscribeFromAllChats = unSubscribeFromAllChats;