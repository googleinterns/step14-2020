async function createUserIfNotExisting(userData){
    const testEmail = userData.email
    const testPassword = userData.password
    // Try to sign in to user
    userData.uid = await firebase.auth().signInWithEmailAndPassword(testEmail, testPassword).then(function(){
            return firebase.auth().currentUser.uid;
        }).catch(async function(){
            // Create the test user if it doesn't exists
            return firebase.auth().createUserWithEmailAndPassword(testEmail, testPassword).then(function(){
                return firebase.auth().currentUser.uid;
            }).catch(function(err){
                    throw err
                })
            })
}

async function deleteUserIfExists(userData){
    const testEmail = userData.email
    const testPassword = userData.password
    // Try to sign in to user
    await firebase.auth().signInWithEmailAndPassword(testEmail, testPassword).then(function(){
            return firebase.auth().currentUser.delete();
        }).catch(function(err){
        // No user to delete or cannot log in.
    })
}

async function emptyDatabase() {
    await firebase.database().ref("/chat/").remove().catch(function(err){
        throw err
    })
    await firebase.database().ref("/users/").remove().catch(function(err){
        throw err
    })
}

exports.createUserIfNotExisting = createUserIfNotExisting;
exports.deleteUserIfExists = deleteUserIfExists;
exports.emptyDatabase = emptyDatabase;
