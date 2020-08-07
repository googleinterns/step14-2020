

// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here, other Firebase libraries
// are not available in the service worker.
// TODO: get this using require('firebase'),require('firebase/messaging')
importScripts('https://www.gstatic.com/firebasejs/7.17.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/7.17.1/firebase-messaging.js');

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// https://firebase.google.com/docs/web/setup#config-object
// TODO: get this from appconfig.js
firebase.initializeApp({
    
});

const messaging = firebase.messaging();

messaging.setBackgroundMessageHandler(function(payload) {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = 'Received message in ' + payload.data.tag;
    const notificationOptions = {
        body: payload.notification.body,
        icon: './static/images/friendsChatting.png'
    };
    missedMessages[payload.data.time] = true;

    return self.registration.showNotification(notificationTitle,
        notificationOptions);
});
