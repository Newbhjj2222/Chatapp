import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getDatabase } from "firebase-admin/database";
import { getStorage } from "firebase-admin/storage";

let app: admin.app.App;

export function initializeFirebaseAdmin() {
  if (!app) {
    app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
  }
  return app;
}

export const getFirebaseAdmin = () => {
  if (!app) {
    initializeFirebaseAdmin();
  }
  return app;
};

export const getFirebaseDb = () => {
  if (!app) {
    initializeFirebaseAdmin();
  }
  return getDatabase(app);
};

export const getFirebaseStorage = () => {
  if (!app) {
    initializeFirebaseAdmin();
  }
  return getStorage(app);
};

export const getFirebaseFirestore = () => {
  if (!app) {
    initializeFirebaseAdmin();
  }
  return getFirestore(app);
};

export default app;
