// init function for static/welcome.html
async function initWelcome(){
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            // User is already signed in.
            window.location.replace("chat.html");
        } else {
            // No user is signed in.
            initLoginButtons() 
        }
    });
}

function initLoginButtons(){
    // Elements of login container
    const txtEmail = document.getElementById("email");
    const txtPassword = document.getElementById("pass");
    const btnLogin = document.getElementById("btnLogin");
    
    // Add login event
    if(btnLogin){
        btnLogin.addEventListener("click", e => {
            const emailVal = txtEmail.value;
            const passVal = txtPassword.value;

            // Initialize auth object
            const auth = firebase.auth();

            const promise = auth.signInWithEmailAndPassword(emailVal, passVal).then(function(){
                window.location.replace("chat.html");
            });
            promise.catch(e => alert(e.message));
        });
    }
}

window.initWelcome = initWelcome
exports.initWelcome = initWelcome
