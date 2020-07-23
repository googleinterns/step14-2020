const firebase = require('firebase');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
window = (new JSDOM('')).window;
document = window.document

const location = require('./location.js');

// init function for static/welcome.html
function initWelcome(){
    location.getLocation()
    initLoginButtons()
}

function initLoginButtons(){
    // Elements of login container
    const txtEmail = document.getElementById("email");
    const txtPassword = document.getElementById("pass");
    const btnLogin = document.getElementById("btnLogin");
    const btnLogout = document.getElementById("btnLogout");

    // Add login event
    if(btnLogin){
        btnLogin.addEventListener("click", e => {
            const emailVal = txtEmail.value;
            const passVal = txtPassword.value;

            // Initialize auth object
            const auth = firebase.auth();

            const promise = auth.signInWithEmailAndPassword(emailVal, passVal).then(function(user){
                window.location.replace("chat.html");
            });
            promise.catch(e => console.log(e.message));
        });
    }

    if(btnLogout){
        btnLogout.addEventListener("click", e => {
            firebase.auth().signOut();
            window.location.replace("welcome.html");
            console.log("You logged out")
        });
    }

    firebase.auth().onAuthStateChanged(firebaseUser => {
        if(firebaseUser){
            console.log("logged in");
            if(btnLogout) {
                btnLogout.classList.remove("hidden");
            }
            if (btnLogin){
                btnLogin.classList.add("hidden");
            }
        }
        else{
            console.log("not logged in");
            if(btnLogout){
                btnLogout.classList.add("hidden");
            }
            if (btnLogin){
                btnLogin.classList.remove("hidden");
            }
        }
    });
}


window.initWelcome = initWelcome
