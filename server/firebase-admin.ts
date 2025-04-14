import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getDatabase } from "firebase-admin/database";
import { getStorage } from "firebase-admin/storage";

// Initialize Firebase Admin with minimum configuration
const app = admin.initializeApp({
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
});

export function initializeFirebaseAdmin() {
  return app;
}

export const getFirebaseAdmin = () => {
  return app;
};

export const getFirebaseDb = () => {
  return getDatabase(app);
};

export const getFirebaseStorage = () => {
  return getStorage(app);
};

export const getFirebaseFirestore = () => {
  return getFirestore(app);
};

export default app;
