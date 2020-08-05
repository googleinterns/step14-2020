

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
    apiKey: "AIzaSyAcpxnpwrTCO4XTymTcneRscMBzJBne2Qg",
    authDomain: "arringtonh-step-2020-d.firebaseapp.com",
    databaseURL: "https://arringtonh-step-2020-d.firebaseio.com",
    projectId: "arringtonh-step-2020-d",
    storageBucket: "arringtonh-step-2020-d.appspot.com",
    messagingSenderId: "336825043126",
    appId: "1:336825043126:web:1256d7b08f1c8daa93be17",
    measurementId: "G-VJQS6TEYGV"
});

const messaging = firebase.messaging();

messaging.setBackgroundMessageHandler(function(payload) {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = 'Background Message Title';
    const notificationOptions = {
        body: 'Background Message body.',
        icon: '/firebase-logo.png'
    };
    missedMessages[payload.data.time] = true;

    return self.registration.showNotification(notificationTitle,
        notificationOptions);
});
