// Chai is a commonly used library for creating unit test suites. It is easily extended with plugins.
const chai = require('chai');
const assert = chai.assert;

// For Test Clean Up
const test = require('firebase-functions-test')();

// Set up the app
const appconfig = require("../appconfig.js");
const testconfig = require("./test-appconfig.js");
appconfig.firebaseConfig = testconfig.firebaseTestConfig
require("../app.js");

let testHelper = require('./test-helper-functions.js');
let chat = require('../chat.js');

describe('creating and joining 1-on-1 chats', function() {
    this.timeout(10000);
    let testUsers = [{
        email: 'test@test.com', 
        password: 'test123!'
    }, 
    {
        email: 'test2@test.com', 
        password: 'test123!'
    }];
    const TAG = 'chats-1on1';
    let chatId;
    const oneOnOneRef = firebase.database().ref(`/chat/${TAG}`);

    before(async function() {
        for (let i = 0; i < testUsers.length; i++) {
            await testHelper.createUserIfNotExisting(testUsers[i]);
            await firebase.auth().signInWithEmailAndPassword(testUsers[i].email, testUsers[i].password);
            // leaving the second user signed in b/c function needs current user
            if (i == 0) {
               await firebase.auth().signOut();
            }
        }
    });

    after(async function() {
        if (testconfig.shouldCleanUp) {
            // Remove nodes created
            await testHelper.emptyDatabase();
        }

        // sign out second user
        await firebase.auth().signOut();

        // Do cleanup tasks.
        test.cleanup();
    });

    describe('make sure chat is created', function() {
        it("make sure new chat is made properly", async function() {
            chatId = oneOnOneRef.push().key;
            await chat.createFriendChat(chatId, testUsers[0]["uid"]);
            await oneOnOneRef.child(chatId).once('value', function(snap) {
                assert.isTrue(snap.exists());
            })

            // name property exists
            await oneOnOneRef.child(chatId+'/chatInfo/name').once('value', function(snap) {
                assert.isTrue(snap.exists());
            })

            // tag property is correct
            await oneOnOneRef.child(chatId+'/chatInfo/tag').once('value', function(snap) {
                assert.equal(snap.val(), TAG);
            })
        })

        it("both users' friend value is set to the chatId", async function() {
            const uid1 = testUsers[0].uid;
            const uid2 = testUsers[1].uid;
            var friendRef = firebase.database().ref('/users/'+uid1+'/friends/'+uid2);
            await friendRef.once('value', function(snap) {
                assert.equal(snap.val(), chatId);
            })

            friendRef = firebase.database().ref('/users/'+uid2+'/friends/'+uid1);
            await friendRef.once('value', function(snap) {
                assert.equal(snap.val(), chatId);
            })
        })
    })
    
})

describe('Creating and Joining Chats', function() {
    this.timeout(10000);
    let testUsers = [
        {email:'test@test.com', password:'test123!'},
        {email:'test2@test.com', password:'test123!'}]
    const tag = 'test-tag';

    before(async function() {
        for (let i=0;i<testUsers.length;i++){
            await testHelper.createUserIfNotExisting(testUsers[i]);
            await firebase.auth().signOut();
        }
    });

    after(async function() {
        if (testconfig.shouldCleanUp) {
            // Remove nodes created
            await testHelper.emptyDatabase();
        }

        // Do cleanup tasks.
        test.cleanup();
    });

    describe('With a new user, creates a predetermined chat', function() {
        let userData = testUsers[0];
        let keys;
        it('log into first user', async function() {
            // Log into user
            await firebase.auth().signInWithEmailAndPassword(userData.email, userData.password).then(function(data){
                assert.equal(userData.uid,firebase.auth().currentUser.uid);
            }).catch(function(err){
                throw err;
                });
        });

        it('create a chat with the tag', async function() {
            const lat = 100;
            const long = 100;
            // Make sure chat with 'test-tag' does not exit
            let chatRef = firebase.database().ref("/chat/")
            await chatRef.once('value', function(snapshot) {
                assert.isFalse(snapshot.hasChild(tag));
            });
            
            // Create chat with tag='test-tag'
            keys = await chat.createOrJoinChat(tag,lat,long);

            // Make sure a chat was created and the user was added to the set of users
            let specificChatRemovalRef = firebase.database().ref("/chat/" + tag + "/" + keys.tag + "/users/");
            await specificChatRemovalRef.once("value").then(function(snapshot){
                var data = snapshot.child(keys.tagRemoval).val();
                assert.equal(data, userData.uid);
            });

            const chatInfoRef = firebase.database().ref("/chat/" + tag + "/" + keys.tag + "/chatInfo/");
            await chatInfoRef.once("value").then(function(snapshot){
                chatLat = snapshot.child("latitude").val();
                chatLong = snapshot.child("longitude").val();
                assert.equal(lat, chatLat);
                assert.equal(long, chatLong);
            });
        });
        it('sign out of first user', async function() {

            //Sign out of user
            await firebase.auth().signOut();
            assert.isTrue(!firebase.auth().currentUser);
        });
    });


    describe('Log into second user and join existing a chats', function() {
        let userData = testUsers[1];
        let keys;
        it('log into second user', async function() {
            // Log into user
            await firebase.auth().signInWithEmailAndPassword(userData.email, userData.password).then(function(data){
                assert.equal(userData.uid,firebase.auth().currentUser.uid);
            }).catch(function(err){
                throw err;
                })
        });
        it('join an existing chat with the tag', async function() {
            const lat = 99.6;
            const long = 99.6;
            // Make sure chat with 'test-tag' does exit
            let chatRef = firebase.database().ref("/chat/");
            await chatRef.once('value', function(snapshot) {
                assert.isTrue(snapshot.hasChild(tag));
            });
            
            // Create chat with tag='test-tag'
            keys = await chat.createOrJoinChat(tag, lat, long);

            // Make sure a chat was created and the user was added to the set of users
            let specificChatRemovalRef = firebase.database().ref("/chat/" + tag + "/" + keys.tag + "/users/");
            await specificChatRemovalRef.once("value").then(function(snapshot){
                var data = snapshot.child(keys.tagRemoval).val();
                assert.equal(data, userData.uid);
            });


            const chatInfoRef = firebase.database().ref("/chat/" + tag + "/" + keys.tag + "/chatInfo/");
            await chatInfoRef.once("value").then(function(snapshot){
                chatLat = snapshot.child("latitude").val();
                chatLong = snapshot.child("longitude").val();
                assert.equal(99.8, chatLat.toFixed(1));
                assert.equal(99.8, chatLong.toFixed(1));
            });

        });
        it('sign out of second user', async function() {
            //Sign out of user
            await firebase.auth().signOut();
            assert.isTrue(!firebase.auth().currentUser);
        });
    });
});