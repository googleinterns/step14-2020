const functions = require('firebase-functions');

exports.uselessFunction = functions.database.ref('users').onCreate((snapshot, context) => {
    return new Promise(function(){
        resolve(1);
    });
});