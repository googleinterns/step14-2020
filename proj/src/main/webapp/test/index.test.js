// Chai is a commonly used library for creating unit test suites. It is easily extended with plugins.
const chai = require('chai');
const assert = chai.assert;

// Sinon is a library used for mocking or verifying function calls in JavaScript.
const sinon = require('sinon');

// Firebase for setting up database for tests
const firebase = require('firebase');

// For Test Clean Up
const test = require('firebase-functions-test')();

// Set up the app
const appconfig = require("../appconfig.js");
const testconfig = require("./test-appconfig.js");
appconfig.firebaseConfig = testconfig.firebaseTestConfig
require("../app.js");

let testHelper = require('./test-helper-functions.js');

describe('Functions calling to the firestore database', () => {
    let myFunctions;
    var userData = {email:'test@test.com', password:'test123!'};

    before(async () => {
        // Require js functions and store their functionality
        myFunctions = require('../sample.js');
        
        // Sign in to test user
        await testHelper.createUserIfNotExisting(userData);
    });

    after(async () => {
        // Remove nodes created
        if (testconfig.shouldCleanUp) {
            // Remove nodes created
            await testHelper.emptyDatabase();
        }
        // Do cleanup tasks.
        test.cleanup();
    });

    describe('Create a chat with the current user', () => {
        it('should create add UID to chat/test-tag/', async () => {
            const tag = 'test-tag';
            const postKey = 'test-postKey';
            const key = myFunctions.addUserToTag(tag,postKey);
            // Check that uid is stored as the value under the return key
            var chatRef = firebase.database().ref("/chat/" + tag + "/" + postKey + "/users/");
            await chatRef.once("value").then(function(snapshot){
                var data = snapshot.child(key).val();
                assert.equal(data, userData.uid);
            });
            
        })
    });
})


describe('Simple Functions', () => {
    let myFunctions;
    before(() => {
        // Require sample.js and save the exports inside a namespace called myFunctions.
        // This includes our cloud functions, which can now be accessed at myFunctions.makeUppercase
        myFunctions = require('../sample.js');
    });

    after(() => {
        // Do cleanup tasks.
        test.cleanup();
    });

    describe('makeUpperCase', () => {
        it('should upper case input', () => {
            const expected = 'TEST';
            const actual = myFunctions.makeUppercase('test');
            assert.equal(actual, expected);
        })
    });
})