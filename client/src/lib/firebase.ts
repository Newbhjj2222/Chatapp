import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

// Check if Firebase environment variables are present
const hasFirebaseConfig = 
  import.meta.env.VITE_FIREBASE_API_KEY && 
  import.meta.env.VITE_FIREBASE_PROJECT_ID && 
  import.meta.env.VITE_FIREBASE_APP_ID;

// Configure Firebase with environment variables or fallback values for demo mode
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project"}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project"}.appspot.com`,
  messagingSenderId: "000000000000",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "demo-app-id"
};

// Log Firebase config status
console.log(
  hasFirebaseConfig 
    ? "Firebase initialized with environment variables" 
    : "Firebase initialized with DEMO configuration (non-functional)"
);

// Initialize Firebase
let app, auth, database, storage;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  database = getDatabase(app);
  storage = getStorage(app);
  
  console.log("Firebase services initialized successfully");
} catch (error) {
  console.error("Error initializing Firebase:", error);
  
  // Create mock services for demo mode
  const mockApp = { name: "demo-app", options: firebaseConfig };
  const mockAuth = { currentUser: null, onAuthStateChanged: (callback) => { callback(null); return () => {}; } };
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
