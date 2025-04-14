import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  type User, 
  type Auth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import { getDatabase, type Database } from "firebase/database";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getAnalytics, type Analytics } from "firebase/analytics";

// Firebase configuration provided by the user
const firebaseConfig = {
  apiKey: "AIzaSyCclVCUXj3ozFuwV5FKq16_zWfG5XQU7Qg",
  authDomain: "netchat-81f3f.firebaseapp.com",
  projectId: "netchat-81f3f",
  storageBucket: "netchat-81f3f.firebasestorage.app",
  messagingSenderId: "508142984280",
  appId: "1:508142984280:web:92571d4d1e20a8a42b3e2d",
  measurementId: "G-E7FVF1NWZF",
  databaseURL: "https://netchat-81f3f-default-rtdb.firebaseio.com" // Add the database URL for Realtime Database
};

console.log("Initializing Firebase with provided configuration");

// Initialize Firebase with proper typing
let app;
let auth: Auth;
let database: Database;
let storage: FirebaseStorage;
let analytics: Analytics | undefined;

try {
  // Initialize Firebase app
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  
  // Connect to Realtime Database
  database = getDatabase(app);
  console.log("Firebase Realtime Database connected");
  
  // Initialize Storage
  storage = getStorage(app);
  
  // Initialize analytics in browser environment only
  if (typeof window !== 'undefined') {
    try {
      analytics = getAnalytics(app);
      console.log("Firebase Analytics initialized successfully");
    } catch (error: any) {
      console.warn("Firebase Analytics initialization skipped:", error.message);
    }
  }
  
  console.log("Firebase services initialized successfully");
} catch (error: any) {
  console.error("Error initializing Firebase:", error);
  
  // Create fully typed mock services for fallback mode
  const mockAuth = {
    currentUser: null,
    onAuthStateChanged: (callback: (user: User | null) => void) => { 
      callback(null); 
      return () => {}; 
    },
    signInWithEmailAndPassword: () => Promise.reject(new Error("Firebase auth not available")),
    createUserWithEmailAndPassword: () => Promise.reject(new Error("Firebase auth not available")),
    signOut: () => Promise.reject(new Error("Firebase auth not available"))
  } as unknown as Auth;
  
  const mockDatabase = { 
    ref: () => ({ 
      on: () => {}, 
      off: () => {},
      push: () => ({ key: 'mock-key' }),
      set: () => Promise.resolve(),
      update: () => Promise.resolve()
    }) 
  } as unknown as Database;
  
  const mockStorage = { 
    ref: () => ({ 
      put: () => Promise.resolve({ 
        ref: { 
          getDownloadURL: () => Promise.resolve("https://example.com/mock-image.jpg") 
        } 
      }) 
    }) 
  } as unknown as FirebaseStorage;
  
  auth = mockAuth;
  database = mockDatabase;
  storage = mockStorage;
  
  console.log("Firebase services mocked for demo mode");
}

// Export Firebase services
export { auth, database, storage, analytics };
export type { User };
export default app;
