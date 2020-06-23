// Copyright 2019 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

importScripts("https://www.gstatic.com/firebasejs/7.15.4/firebase-app.js");
importScripts("https://www.gstatic.com/firebasejs/7.15.4/firebase-messaging.js");

var firebaseConfig = {
    
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.setBackgroundMessageHandler(function(payload) {
    console.log("[messages.js] Received background message ", payload);
    const notificationTitle = "Background Message Title";
    const notificationOptions = {
        body: "Background Message body."
    };

    return self.ServiceWorkerRegistration.showNotification(notificationTitle,
        notificationOptions);
});
