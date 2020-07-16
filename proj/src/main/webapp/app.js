var firebaseConfig = {
    apiKey: "AIzaSyAcpxnpwrTCO4XTymTcneRscMBzJBne2Qg",
    authDomain: "arringtonh-step-2020-d.firebaseapp.com",
    databaseURL: "https://arringtonh-step-2020-d.firebaseio.com",
    projectId: "arringtonh-step-2020-d",
    storageBucket: "arringtonh-step-2020-d.appspot.com",
    messagingSenderId: "336825043126",
    appId: "1:336825043126:web:1256d7b08f1c8daa93be17",
    measurementId: "G-VJQS6TEYGV"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);


var admin = require("firebase-admin");

var serviceAccount = require("path/to/serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://arringtonh-step-2020-d.firebaseio.com"
});

