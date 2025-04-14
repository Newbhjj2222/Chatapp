import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getDatabase } from "firebase-admin/database";
import { getStorage } from "firebase-admin/storage";

// Firebase project configuration
const firebaseConfig = {
  projectId: "netchat-81f3f",
  storageBucket: "netchat-81f3f.firebasestorage.app",
};

// Initialize Firebase Admin with minimum configuration
let app;

try {
  // Check if already initialized to prevent duplicate app initialization
  app = admin.app();
  console.log("Using existing Firebase Admin app");
} catch (error) {
  try {
    // Initialize new app
    app = admin.initializeApp({
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket,
      // Using default credential for development
      // In production, you should use a service account
      credential: admin.credential.applicationDefault(),
    });
    console.log("Firebase Admin initialized successfully with project:", firebaseConfig.projectId);
  } catch (initError) {
    console.error("Failed to initialize Firebase Admin:", initError);
    
    // Create minimal mock app for development without credentials
    app = {
      name: "[DEFAULT]",
      options: firebaseConfig,
    } as admin.app.App;
    
    console.warn("Using mock Firebase Admin app for development");
  }
}

export function initializeFirebaseAdmin() {
  return app;
}

export const getFirebaseAdmin = () => {
  return app;
};

export const getFirebaseDb = () => {
  try {
    return getDatabase(app);
  } catch (error) {
    console.error("Error getting Firebase Database:", error);
    return null;
  }
};

export const getFirebaseStorage = () => {
  try {
    return getStorage(app);
  } catch (error) {
    console.error("Error getting Firebase Storage:", error);
    return null;
  }
};

export const getFirebaseFirestore = () => {
  try {
    return getFirestore(app);
  } catch (error) {
    console.error("Error getting Firebase Firestore:", error);
    return null;
  }
};

export default app;
