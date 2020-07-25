const $ = require('jquery');
require('bootstrap'); // for collapse

/*
    Notifications
 */

// const messaging = firebase.messaging();
// messaging.requestPermission()
// .then(function () {
//     console.log("Have permission");
//     if ('serviceWorker' in navigator) {
//         navigator.serviceWorker.register('/firebase-messaging-sw.js')
//         .then(function(registration) {
//             console.log('Registration successful, scope is:', registration.scope);
//         }).catch(function(err) {
//             console.log('Service worker registration failed, error:', err);
//         });
//     }
// });

// messaging.onMessage((payload) => {
//     appendMessage(payload);
// });

function appendMessage(payload){
    const messagesElement = document.getElementById("messages");
    const dataHeaderElement = document.createElement("h4");
    const dataElement = document.createElement("pre");
    dataHeaderElement.textContent = payload.notification.title;
    dataElement.textContent = payload.notification.body;

    messagesElement.appendChild(dataHeaderElement);
    messagesElement.appendChild(dataElement);
}
