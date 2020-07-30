// Chai is a commonly used library for creating unit test suites. It is easily extended with plugins.
const chai = require('chai');
const assert = chai.assert;

// // Sinon is a library used for mocking or verifying function calls in JavaScript.
// const sinon = require('sinon');

// For Test Clean Up
const test = require('firebase-functions-test')();

// Set up the app
const appconfig = require("../appconfig.js");
const testconfig = require("./test-appconfig.js");
appconfig.firebaseConfig = testconfig.firebaseTestConfig
require("../app.js");
// TODO: call browserify for the test app config

let testHelper = require('./test-helper-functions.js');

const { JSDOM } = require('jsdom');
const PAGE_LOAD_DELAY = 5000; // 5 seconds
const delay = ms => new Promise(res => setTimeout(res, ms));

async function loadPage(file) {
        let originalWindowDoc = { 
            originalWindow : global.window,
            originalDocument : global.document
        };
        const options = {
            resources: 'usable',
            runScripts: 'dangerously',
        };
        await JSDOM.fromFile('src/main/webapp/static/welcome.html', options).then(async (dom) => {
            console.log("ARINZE11.2:",dom.window.document.body.textContent.trim());
            global.document = dom.window.document;
            console.log("ARINZE11.3:",document.body.textContent.trim());
            delete dom.window.location;
            dom.window.location = {
                replace:function(url){console.log('WOULD NAVIGATE TO:',url)}
            }
            global.window = dom.window;
            await delay(PAGE_LOAD_DELAY)
            console.log("DONE!")
        })
        console.log("DONE2!")
        return originalWindowDoc;

}
describe('Example DOM Test', () => {
    var userData = {email:'test@test.com', password:'test123!'};
    let originalWindowDoc;

    before(async function () {
        this.timeout(10000)
        const file = 'src/main/webapp/static/welcome.html'
        originalWindowDoc = await loadPage(file);
    });

    after(async () => {
        global.document = originalWindowDoc.originalDocument;
        global.window = originalWindowDoc.originalWindow;
        // Do cleanup tasks.
        test.cleanup();
    });

    describe('Create a chat with the current user', function() {
        this.timeout(3*PAGE_LOAD_DELAY)
        it('should create add UID to chat/test-tag/', async () => {
            const txtEmail = document.getElementById("email");
            const txtPassword = document.getElementById("pass");
            const btnLogin = document.getElementById("btnLogin");
            console.log("ARINZE7:",txtEmail,txtPassword,btnLogin)
            txtEmail.value = 'test@test.com';
            txtPassword.value = 'test123!';
            btnLogin.click();
            await delay(PAGE_LOAD_DELAY)
            // Test that user is logged in and that it would have navigated to the chat page
        })
        // it('should create add UID to chat/test-tag/', async () => {
        //     const txtEmail = document.getElementById("email");
        //     const txtPassword = document.getElementById("pass");
        //     const btnLogin = document.getElementById("btnLogin");
        //     console.log("ARINZE7:",txtEmail,txtPassword,btnLogin)
        //     txtEmail.value = 'test@test.com';
        //     txtPassword.value = 'test123';
        //     btnLogin.click();
        //     await delay(PAGE_LOAD_DELAY)
        //     // Test that user is NOT logged in because the password is incorrect
        // })
    });
})