const test = require("firebase-functions-test")({
    databaseURL: "https://arringtonh-step-2020-d.firebaseio.com",
    storageBucket: "arringtonh-step-2020-d.appspot.com",
    projectId: "arringtonh-step-2020-d",
}, "../../../../keys/admin-service-account.json");

const chai = require('chai');
const assert = cahi.assert;

const sampleFunctions = require("../sample.js");
// const scriptJsFunctions = require("../script.js");

// Test for tests
describe('uselessFunction', () => {
    it('please work', () => {
        const snap = test.database.makeDataSnapshot('Z3yGLQ2rRBS2YnVRZMKmXEbqIlN2', 'users');
        // const wrapped = test.wrap(sampleFunctions.uselessFunction);
        assert.equal(0,0);
        // return wrapped(snap).then(() => {
        //     return admin.database().ref('users').once('value').then((createdSnap) => {
        //         assert.equal(0, 0);
        //     });
        // });
    });
});


//keep at end of tests
test.cleanup();