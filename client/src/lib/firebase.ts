import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Firebase configuration provided by the user
const firebaseConfig = {
  apiKey: "AIzaSyCclVCUXj3ozFuwV5FKq16_zWfG5XQU7Qg",
  authDomain: "netchat-81f3f.firebaseapp.com",
  projectId: "netchat-81f3f",
  storageBucket: "netchat-81f3f.firebasestorage.app",
  messagingSenderId: "508142984280",
  appId: "1:508142984280:web:92571d4d1e20a8a42b3e2d",
  measurementId: "G-E7FVF1NWZF"
};

console.log("Initializing Firebase with provided configuration");

// Initialize Firebase
let app, auth, database, storage, analytics;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  database = getDatabase(app);
  storage = getStorage(app);
  
  // Initialize analytics in browser environment only
  if (typeof window !== 'undefined') {
    try {
      analytics = getAnalytics(app);
      console.log("Firebase Analytics initialized successfully");
    } catch (analyticsError) {
      console.warn("Firebase Analytics initialization skipped:", analyticsError.message);
    }
  }
  
  console.log("Firebase services initialized successfully");
} catch (error) {
  console.error("Error initializing Firebase:", error);
  
  // Create mock services as fallback for demo mode
  const mockApp = { name: "demo-app", options: firebaseConfig };
  const mockAuth = { 
    currentUser: null, 
    onAuthStateChanged: (callback) => { callback(null); return () => {}; },
    signInWithEmailAndPassword: () => Promise.reject(new Error("Firebase authentication not available in demo mode")),
    createUserWithEmailAndPassword: () => Promise.reject(new Error("Firebase authentication not available in demo mode"))
  };
  const mockDatabase = { ref: () => ({ on: () => {}, off: () => {} }) };
  const mockStorage = { ref: () => ({ put: () => Promise.resolve({ ref: { getDownloadURL: () => Promise.resolve("") } }) }) };
  
  app = mockApp;
  auth = mockAuth;
  database = mockDatabase;
  storage = mockStorage;
  
  console.log("Firebase services mocked for demo mode");
}

// Export Firebase services
export { auth, database, storage };
export default app;
