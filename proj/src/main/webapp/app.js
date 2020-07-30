// Imports
const firebase = require('firebase/app');
require('firebase/auth');
require('firebase/database');
require('firebase/messaging');
require('firebase/storage');
global.firebase = firebase;

const { JSDOM } = require('jsdom');
window = (new JSDOM('')).window;
global.window = window;
global.document = window.document;

global.$ = require('jquery'); // Must be after setting global.window and global.document
require('bootstrap'); // for collapse

// Initialize Firebase
const appconfig = require('./appconfig.js');
firebase.initializeApp(appconfig.firebaseConfig);

// Other files
require('./chat.js');
require('./location.js');
require('./notifications.js');
require('./script.js');
require('./signup.js');
require('./welcome.js');

// Redirect from index.html to welcome page if not signed in.
function redirectToWelcomeOrChat() {
    const welcomePageUrl = '/static/welcome.html';
    const signupPageUrl = '/static/signup.html';
    const chatPageUrl = '/static/chat.html';

    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            // User is already signed in.
            window.location.replace(chatPageUrl);
        } else {
            // No user is signed in.
            if (!(window.location.href.endsWith(welcomePageUrl)||window.location.href.endsWith(signupPageUrl))){
                window.location.replace(welcomePageUrl);
            }
        }
    });
}

window.redirectToWelcomeOrChat = redirectToWelcomeOrChat;