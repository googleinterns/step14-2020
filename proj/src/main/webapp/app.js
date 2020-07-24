// Imports
const firebase = require('firebase');
const appconfig = require('./appconfig.js');
const { JSDOM } = require('jsdom');
window = (new JSDOM('')).window;
global.window = window;
global.document = window.document;

// Initialize Firebase
firebase.initializeApp(appconfig.firebaseConfig);

// Other files
require('./location.js');
require('./chat.js');
require('./script.js');
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