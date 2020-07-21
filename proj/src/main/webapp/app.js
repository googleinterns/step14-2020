// Initialize Firebase
const firebase = require('firebase');
const appconfig = require('./appconfig.js');
const jsdom = require('jsdom');

firebase.initializeApp(appconfig.firebaseConfig);

require('./chat.js');
require('./location.js');
require('./script.js');


const { JSDOM } = jsdom;
window = (new JSDOM('')).window;
const welcomePageUrl = '/static/welcome.html';
const signupPageUrl = '/static/signup.html';
const chatPageUrl = '/static/chat.html';

function redirectToWelcomeOrChat() {
    if(!firebase.auth().currentUser && !(window.location.href.endsWith(welcomePageUrl)||window.location.href.endsWith(signupPageUrl))) {
        window.location.replace(welcomePageUrl);
    } else {
        window.location.replace(chatPageUrl);
    }
}


window.redirectToWelcomeOrChat = redirectToWelcomeOrChat;