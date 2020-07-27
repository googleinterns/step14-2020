const location = require('./location.js');
const chat = require('./chat.js');

// init function for static/signup.html
function initSignUp(){
    firebase.auth().onAuthStateChanged(async firebaseUser => {
        if(firebaseUser){
            window.location.replace("/static/chat.html");
        } else{
            initSignUpButtons();
            initializePasswordValidation();
            location.getLocation();
        }
    });
}

// if(btnLogin){
//         btnLogin.addEventListener("click", e => {
//             const emailVal = txtEmail.value;
//             const passVal = txtPassword.value;

//             // Initialize auth object
//             const auth = firebase.auth();

//             const promise = auth.signInWithEmailAndPassword(emailVal, passVal).then(function(){
//                 window.location.replace("chat.html");
//             });
//             promise.catch(e => alert(e.message));
//         });
//     }

function initSignUpButtons(){
    const btnSignUp = document.getElementById("btnSignUp");
    // Add sign up event
    if(btnSignUp){
        btnSignUp.addEventListener("click", async function () {
            try {
                // Elements of sign up container
                const fname = document.getElementById("fname");
                const lname = document.getElementById("lname");
                const txtEmail = document.getElementById("email");
                const txtPassword = document.getElementById("pass");
                const tagStr = document.getElementById("tags");
                const isLoc = document.getElementById("loc");
                var lat;
                var long;
                if(isLoc.checked){
                    const coords = location.getLatLong();
                    lat = coords[0];
                    long = coords[1]; 
                }
                else{
                    lat = 999;
                    long = 999;
                }
                await signUp(fname.value, lname.value, txtEmail.value, txtPassword.value, tagStr.value, lat, long);
            }
            catch (e) {
                alert(e.message);
            }
        });
    }
}

async function signUp(fname, lname, email, pass, tagStr, lat, long){
    var tagList = tagStr.split(',');
    for(var ii = 0; ii < tagList.length; ii++){
        tagList[ii] = tagList[ii].trim();
    }

    // Initialize auth object
    const auth = firebase.auth();
    auth.useDeviceLanguage();

    await auth.createUserWithEmailAndPassword(email, pass).then(async function(){
        var allTags = {};
        var tagRemovalDict = {};
        for(var ii = 0; ii < tagList.length; ii++){
            var tag = tagList[ii];                    

            var keys = await chat.createOrJoinChat(tag, lat, long);
            allTags[tag] = keys['tag'];
            tagRemovalDict[tag] = keys['tagRemoval'];                 
        }

        const user = auth.currentUser;
        await user.updateProfile({
            displayName: fname + " " + lname
            }).then(function(){
            firebase.database().ref("users/" + user.uid).set({
                firstName : fname,
                lastName : lname,
                allTags : allTags,
                tagRemovalDict : tagRemovalDict,
                latitude : lat,
                longitude : long,
                bio : "I'm a new user! Say hi!"
            }).then(function(){
                window.location.replace("chat.html");
            });
        }).catch(function(err){
            alert(err);
        });
    });
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
        goodPassword = handler(password) && goodPassword;
    })
    return goodPassword;
}

function passwordLength(password){
    let alertObj = document.getElementById("pwLength");
    return styleAlert(alertObj,password.length > 7);
}

function containsNumber(password){
    let alertObj = document.getElementById("pwNumber");
    var number = /[0-9]/;
    return styleAlert(alertObj, !!password.match(number));
}

function containsSymbol(password){
    let alertObj = document.getElementById("pwSymbol");
    var symbol = /[$-/:-?{-~!"^_`@#\[\]\\]/;
    return styleAlert(alertObj, !!password.match(symbol));
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
    return passing;
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
        if (passVal == passconfVal){
            pass.classList.remove("non-matching-pass");
            passconf.classList.remove("non-matching-pass");
            noMatch.hidden = true;
        } else{
            // underline the inputs in red
            pass.classList.add("non-matching-pass");
            passconf.classList.add("non-matching-pass");
            noMatch.hidden = false;
        }
        if (meetRequirements(passVal) && noMatch.hidden) {
            btnSignUp.disabled = false;
        } else {
            // disable sign up button
            btnSignUp.disabled = true;
        }
    })
}

window.initSignUp = initSignUp;
exports.signUp = signUp;
exports.meetRequirements = meetRequirements;
