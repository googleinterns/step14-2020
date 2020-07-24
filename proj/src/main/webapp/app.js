// Imports
const firebase = require('firebase');
const appconfig = require('./appconfig.js');
const { JSDOM } = require('jsdom');
const { window } = new JSDOM('<!doctype html><html><body></body></html>');
global.document = window.document;
global.window = window;

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
    if(!firebase.auth().currentUser && !(window.location.href.endsWith(welcomePageUrl)||window.location.href.endsWith(signupPageUrl))) {
        window.location.replace(welcomePageUrl);
    } else {
        window.location.replace(chatPageUrl);
    }
}

window.redirectToWelcomeOrChat = redirectToWelcomeOrChat