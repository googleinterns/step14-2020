// Chai is a commonly used library for creating unit test suites. It is easily extended with plugins.
const chai = require('chai');
const assert = chai.assert;
const expect = chai.expect

//  To test DOM
//  npm install chai-dom
chai.use(require('chai-dom'))

// For Test Clean Up
const test = require('firebase-functions-test')();

// Set up the app
const appconfig = require("../appconfig.js");
const testconfig = require("./test-appconfig.js");
appconfig.firebaseConfig = testconfig.firebaseTestConfig
require("../app.js");

let testHelper = require('./test-helper-functions.js');
let signup = require('../signup.js');

describe('Create a user using page methods', function() {
    this.timeout(10000);
    let userData = {
        fname:'John',
        lname:'Doe',
        lat:123,
        long:456,
        email:'johndoe@test.com',
        password:'test123!',
        tagStr:' music, jumping ,running , dancing,singing,walking '
    };
    let mockLocation;
    let originalWindow;

    before(async function() {
        originalWindow = global.window;
    });

    after(async function() {
        if (testconfig.shouldCleanUp) {
            // Delete the user
            await testHelper.deleteUserIfExists(userData);
            // Remove nodes created
            await testHelper.emptyDatabase();
        }
        global.window = originalWindow;
        // Do cleanup tasks.
        test.cleanup();
    });

    describe('Create the user and check if they were added to the chats', function() {
        it('create the user', async function() {
            global.window = {location:{replace: function(newPath){
                return assert.equal(newPath,'chat.html')
            }}}
            await signup.signUp(userData.fname, userData.lname, userData.email, userData.password, userData.tagStr, userData.lat, userData.long);
            const uid = firebase.auth().currentUser.uid;

            // Make sure the user was created with the correct user data
            let allTags;
            let tagRemovalDict;
            const userInfoRef = firebase.database().ref("/users/" + uid + "/");
            await userInfoRef.once("value").then(function(snapshot){
                allTags = snapshot.child("allTags").val();
                tagRemovalDict = snapshot.child("tagRemovalDict").val();
                assert.equal(snapshot.child("firstName").val(), userData.fname);
                assert.equal(snapshot.child("lastName").val(), userData.lname);
            });

            //Make sure each of the chats were created.
            expectedChats = ['music', 'jumping', 'running', 'dancing', 'singing', 'walking']
            for (var i=0; i<expectedChats.length; i++) {
                const tag = expectedChats[i];
                const key = allTags[tag];
                const removalKey = tagRemovalDict[tag];

                const chatInfoRef = firebase.database().ref("/chat/" + tag + "/" + key + "/chatInfo/");
                await chatInfoRef.once("value").then(function(snapshot){
                    assert.equal(snapshot.child("tag").val(), tag);
                    assert.equal(snapshot.child("name").val(), tag);
                    assert.equal(snapshot.child("latitude").val(), userData.lat);
                    assert.equal(snapshot.child("longitude").val(), userData.long);
                })
                const chatUserRef = firebase.database().ref("/chat/" + tag + "/" + key + "/users/"+removalKey+"/");
                await chatUserRef.once("value").then(function(snapshot){
                    assert.equal(snapshot.val(), uid)
                })
            }
        });
    });
});

describe('Test password validations', function() {
    before(async function() {
    });

    after(async function() {
        // Do cleanup tasks.
        test.cleanup();
    });

    it('password ok', async function() {
        assert.isTrue(signup.meetRequirements('testing1!'));
    });
    it('password too short', async function() {
        assert.isFalse(signup.meetRequirements('test1!'));
    });
    it('password missing number', async function() {
        assert.isFalse(signup.meetRequirements('testing!'));
    });
    it('password missing symbol', async function() {
        assert.isFalse(signup.meetRequirements('testing1'));
    });

    // TODO: connect window to HTML to test page element
    // it('user must have at least one tag', function(){
    //     global.window = {location:{replace: function(newPath){
    //         return assert.equal(newPath,'signup.html')}}}
    //     expect(document.querySelector("#sign-in-title").to.have.text("Sign up"));
    // });
});