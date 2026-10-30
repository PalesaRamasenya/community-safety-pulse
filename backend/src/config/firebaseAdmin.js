const admin = require('firebase-admin');
require('dotenv').config();

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
// .env stores the private key with literal \n sequences - convert back to real newlines
const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

let initialized = false;

if (projectId && clientEmail && privateKey) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey
    })
  });
  initialized = true;
} else {
  console.warn(
    '[firebaseAdmin] Missing Firebase Admin credentials in .env - ' +
    'token verification and Firestore sync will be disabled until configured.'
  );
}

const firestore = initialized ? admin.firestore() : null;

module.exports = { admin, firestore, isInitialized: initialized };
