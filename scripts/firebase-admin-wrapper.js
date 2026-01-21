// Wrapper to load firebase-admin from functions directory
const path = require("path");
const admin = require(
  path.join(__dirname, "../firebase/functions/node_modules/firebase-admin"),
);

admin.initializeApp();

module.exports = admin;
