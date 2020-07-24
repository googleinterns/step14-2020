const firebase = require('firebase');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
window = (new JSDOM('')).window;
document = window.document
const $ = require('jquery');
const location = require('./location.js');
const chat = require('./chat.js');

// init function for static/signup.html
function initSignUp(){
    initSignUpButtons()
    initializePasswordValidation()
    location.getLocation()
}

function initSignUpButtons(){
    // Elements of sign up container
    const fname = document.getElementById("fname")
    const lname = document.getElementById("lname")
    const txtEmail = document.getElementById("email");
    const txtPassword = document.getElementById("pass");
    const tagStr = document.getElementById("tags");
    const btnSignUp = document.getElementById("btnSignUp");

    // Add sign up event
    if(btnSignUp){
        btnSignUp.addEventListener("click", e => {
            const emailVal = txtEmail.value;
            const passVal = txtPassword.value;
            var tagList = tagStr.value.split(',');
            for(var ii = 0; ii < tagList.length; ii++){
                tagList[ii] = tagList[ii].trim();
            }

            // Initialize auth object
            const auth = firebase.auth();
            auth.useDeviceLanguage();

            auth.createUserWithEmailAndPassword(emailVal, passVal).then(async function(){
                var allTags = {};
                var tagRemovalDict = {};
                for(var ii = 0; ii < tagList.length; ii++){
                    var tag = tagList[ii];                    
                    var keys = await chat.createOrJoinChat(tag);
                    console.log("ARINZE1:",keys)
                    allTags[tag] = keys['tag']
                    tagRemovalDict[tag] = keys['tagRemoval']                    
                }

                const user = auth.currentUser;
                user.updateProfile({
                    displayName: fname.value + " " + lname.value
                    }).then(function(){
                    console.log("display name updated successfully");
                    firebase.database().ref("users/" + user.uid).set({
                        firstName : fname.value,
                        lastName : lname.value,
                        allTags : allTags,
                        tagRemovalDict : tagRemovalDict,
                        bio : "I'm a new user! Say hi!"
                    }).then(function(){
                        window.location.replace("chat.html");
                    });
                }).catch(function(err){
                    console.log("error updating display name:", err);
                });
            });

        });
    }

}

/*
    Password Validation
*/ 
// Check if the password is strong enough 
function meetRequirements(password){
    /* returns true or false so that the sign up button is enables with a 
    strong password and matching confirmation password **/
    let validators = [passwordLength, containsNumber, containsSymbol]
    var goodPassword = true;
    validators.forEach(function(handler){
        goodPassword = handler(password) && goodPassword
    })
    return goodPassword;
}

function passwordLength(password){
    let alertObj = document.getElementById("pwLength");
    return styleAlert(alertObj,password.length > 7)
}

function containsNumber(password){
    let alertObj = document.getElementById("pwNumber");
    var number = /[0-9]/;
    return styleAlert(alertObj, password.match(number))
}

function containsSymbol(password){
    let alertObj = document.getElementById("pwSymbol");
    var symbol = /[$-/:-?{-~!"^_`\[\]]/;
    return styleAlert(alertObj,password.match(symbol))
}

function styleAlert(alertObj, passing){
    if (alertObj) {
        alertObj.hidden = false;
        if(passing){
            alertObj.classList.add('alert-success');
        } else{
            alertObj.classList.remove('alert-success');   
        }
    }
    return passing
}

function initializePasswordValidation(){
    const noMatch = document.getElementById("noMatch");
    const btnSignUp = document.getElementById("btnSignUp");
    const pass = document.getElementById("pass");
    const passconf = document.getElementById("passconf");
    /* Check for password confirmation 
        enable button if and only if the password meets the requiremetns and match **/
    $('#pass, #passconf').on('keyup', function(){
        let passVal = pass.value || '';
        let passconfVal = passconf.value || '';
        if ((passVal.length != 0) && meetRequirements(passVal) && (passconfVal.length != 0)){
            if (passVal == passconfVal){
                btnSignUp.disabled = false;
                pass.classList.remove("non-matching-pass");
                passconf.classList.remove("non-matching-pass");
                noMatch.hidden = true;
            } else{
                // disable sign up button
                btnSignUp.disabled = true;
                // underline the inputs in red
                pass.classList.add("non-matching-pass");
                passconf.classList.add("non-matching-pass");
                noMatch.hidden = false;
            }
        }
    })
}

window.initSignUp = initSignUp