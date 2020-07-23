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
const app = require("../app.js");

let jsdom = require("jsdom");
let fs = require("fs");
let path = require("path")
let $ = require("jquery")

describe('Functions calling to the firestore database', () => {
    let myFunctions;
    let chatFunctions;
    const testEmail = 'test@test.com';
    const testPassword = 'test123';
    let testUserUID;

    before(async () => {
        // Require js functions and store their functionality
        myFunctions = require('../sample.js');
        chatFunctions = require('../chat.js');
        console.log("Nick1 ", chatFunctions);
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

    describe('With a new user, creates or joins a predetermined chat', () => {
        it('keys should match, signifying successful creation of chat', async () => {
            const tag = 'createOrJoinChat-test';
            const lat = 100;
            const long = 100;
            var chatLat;
            var chatLong;
            var key = await chatFunctions.createOrJoinChat(tag, lat, long);

            const chatRef = firebase.database().ref("/chat/" + tag);
            var chatKey;
            await chatRef.once("value").then(function(snapshot){
                assert(snapshot.hasChild(key), "If a chat is created with a key, this passes");
                var infoSnap = snapshot.child(key).child("chatInfo");
                chatLat = infoSnap.child("latitude").val();
                chatLong = infoSnap.child("longitude").val();
            });
            assert.equal(lat, chatLat);
            assert.equal(long, chatLong);
        });
    });

    // Long runtime test
    describe('Creates another user to join the same chat', () => {
        it('lat and long should be averaged (99.8)', async () => {
            const tag = "averaging-test";
            var chatLat;
            var chatLong;
            var key;
            await firebase.auth().createUserWithEmailAndPassword("newEmail@totallyNewEmail.com", "newPassword").then(async function(data){
                key = await chatFunctions.createOrJoinChat(tag, 100, 100);
                await firebase.auth().currentUser.delete();
            });
            await firebase.auth().createUserWithEmailAndPassword("anotherNewEmail@newemail.com", "anotherNewPassword").then(async function(data){
                key = await chatFunctions.createOrJoinChat(tag, 99.6, 99.6);
            });
            const infoRef = firebase.database().ref("/chat/" + tag + "/" + key + "/chatInfo/");
            await infoRef.once("value").then(function(snap){
                chatLat = snap.child("latitude").val();
                chatLong = snap.child("longitude").val();
            });
            assert(Math.abs((chatLat - 99.8)) < .0001);
            assert(Math.abs((chatLong - 99.8)) < .0001);
        });
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