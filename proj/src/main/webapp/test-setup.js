var admin = require("firebase-admin");

var serviceAccount = require("../../../../keys/admin-service-account.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://arringtonh-step-2020-d.firebaseio.com"
});