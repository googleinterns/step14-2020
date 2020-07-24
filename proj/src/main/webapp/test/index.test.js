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
//appconfig.firebaseConfig = testconfig.firebaseTestConfig
const app = require("../app.js");

let jsdom = require("jsdom"); 
let fs = require("fs");
let path = require("path")
let $ = require("jquery")

describe('Functions calling to the firestore database', () => {
    let myFunctions;
    const testEmail = 'test@test.com';
    const testPassword = 'test123';
    let testUserUID;

    before(async () => {
        // Require sample.js and save the exports inside a namespace called myFunctions.
        myFunctions = require('../sample.js');
        // Sign in to test user
        testUserUID = await firebase.auth().signInWithEmailAndPassword(testEmail, testPassword).then(function(data){
                console.log("Successfully logged in to test user.",testEmail,"\\",testPassword)
                return firebase.auth().currentUser.uid;
            }).catch(function(err){
                // Create the test user if it doesn't exists
                console.log("Creating user",testEmail,"\\",testPassword);
                return firebase.auth().createUserWithEmailAndPassword(testEmail, testPassword).then(function(data){
                    console.log("Successfully created test user.")
                    return firebase.auth().currentUser.uid;
                }).catch(function(err){
                        console.log("Error creating user:", err);
                        throw err
                    })
                })
    });

    after(async () => {
        // Delete the test user
        await firebase.auth().currentUser.delete()
        // Remove nodes created
        await firebase.database().ref("/chat/").remove().then(function(){
            console.log("Successfully removed chat node from database")
        }).catch(function(err){
            console.log("Error cleaning up chat node from:", err);
            throw err
        })
        // Do cleanup tasks.
        test.cleanup();
    });

    describe('Create a chat with the current user', () => {
        it('should create add UID to chat/test-tag/', () => {
            const tag = 'test-tag';
            const postKey = 'test-postKey';
            const key = myFunctions.addUserToTag(tag,postKey);
            // Check that uid is stored as the value under the return key
            var chatRef = firebase.database().ref("/chat/" + tag + "/" + postKey + "/users/");
            chatRef.once("value").then(function(snapshot){
                var data = snapshot.child(key).val();
                assert.equal(data, testUserUID);
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

describe('testing profile picture functions', () => {
    let functions;
    before(async function() {
        functions = require('../chat.js');
        const email = "realdog@woof.com";
        const pass = "dogdogdog";
        console.log("BRO!");
        await firebase.auth().signInWithEmailAndPassword(email, pass).then(function() {
                console.log("Successfully logged in to test user.");
            }).catch(function(e) {
                console.log("error: "+e.message);
            });
    });

    after(() => {
        firebase.auth().signOut();
        test.cleanup();
    })

    describe('addUserInfoToDom', () => {
        it('no profile picture', () => {
            const expected = "https://images.fineartamerica.com/images/artworkimages/mediumlarge/2/poppyscape-sunset-impasto-palette-knife-acrylic-painting-mona-edulesco-mona-edulesco.jpg";
            const testUser = {};
            functions.addUserInfoToDom(testUser);
            const actual = document.querySelector('#user-pfp').src;
            assert.equal(actual, expected);
        })

        it('test user profile picture', async function() {
            const uid = "AsaCFzk14xRoru19RpIkKENH5Bs2"; // test user uid
            const pfpRef = firebase.storage().ref('/'+uid+'/pfp.png');
            const expected = await pfpRef.getDownloadURL().then(function(url) {
                return url;
            })
            const testUser = {
                "uid": uid,
                "photo": expected,
            };
            functions.addUserInfoToDom(testUser);
            const actual = document.querySelector('#user-pfp').src;
            assert.equal(actual, expected);
        })
    })
})