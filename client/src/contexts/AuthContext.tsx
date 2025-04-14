import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
} from "firebase/auth";
import { getDatabase, ref, set, onValue } from "firebase/database";
import { LS_KEYS, USERS_REF, DEFAULT_PROFILE_IMAGE } from "@/lib/constants";
import { apiRequest } from "@/lib/queryClient";

type User = {
  uid: string;
  username: string;
  email: string;
  profileImage?: string;
};

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const db = getDatabase();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoading(true);
      if (firebaseUser) {
        // Get user profile from Firebase database
        const userRef = ref(db, `${USERS_REF}/${firebaseUser.uid}`);
        
        onValue(userRef, (snapshot) => {
          const userData = snapshot.val();
          if (userData) {
            const userInfo: User = {
              uid: firebaseUser.uid,
              username: userData.username || firebaseUser.displayName || "User",
              email: userData.email || firebaseUser.email || "",
              profileImage: userData.profileImage || DEFAULT_PROFILE_IMAGE,
            };
            
            setUser(userInfo);
            localStorage.setItem(LS_KEYS.USER, JSON.stringify(userInfo));
          } else {
            // If user data doesn't exist in DB, create it
            const displayName = firebaseUser.displayName || "User";
            const newUser: User = {
              uid: firebaseUser.uid,
              username: displayName,
              email: firebaseUser.email || "",
              profileImage: firebaseUser.photoURL || DEFAULT_PROFILE_IMAGE,
            };
            
            set(userRef, newUser);
            setUser(newUser);
            localStorage.setItem(LS_KEYS.USER, JSON.stringify(newUser));
          }
          setIsLoading(false);
        }, (error) => {
          console.error("Error fetching user data: ", error);
          setIsLoading(false);
        });
        
        // Update user status to online
        const userStatusRef = ref(db, `userStatus/${firebaseUser.uid}`);
        set(userStatusRef, {
          state: "online",
          lastChanged: new Date().toISOString(),
        });
        
        // Add user to server database
        await apiRequest("POST", "/api/users", {
          uid: firebaseUser.uid,
          username: firebaseUser.displayName || "User",
          email: firebaseUser.email,
          profileImage: firebaseUser.photoURL || DEFAULT_PROFILE_IMAGE,
        });
      } else {
        setUser(null);
        localStorage.removeItem(LS_KEYS.USER);
        setIsLoading(false);
      }
    });

    // Clean up the listener when the component unmounts
    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      const auth = getAuth();
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error("Login Error:", error);
      throw new Error(
        error.code === "auth/invalid-credential"
          ? "Invalid email or password"
          : error.message
      );
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    username: string,
    email: string,
    password: string
  ): Promise<void> => {
    try {
      setIsLoading(true);
      const auth = getAuth();
      const db = getDatabase();

      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Update profile with username
      await updateProfile(firebaseUser, {
        displayName: username,
      });

      // Create user in Firebase Realtime Database
      const userData = {
        uid: firebaseUser.uid,
        username,
        email,
        profileImage: DEFAULT_PROFILE_IMAGE,
        createdAt: new Date().toISOString(),
      };

      const userRef = ref(db, `${USERS_REF}/${firebaseUser.uid}`);
      await set(userRef, userData);
      
      // Add user to server database
      await apiRequest("POST", "/api/users", {
        uid: firebaseUser.uid,
        username,
        email,
        profileImage: DEFAULT_PROFILE_IMAGE,
      });
    } catch (error: any) {
      console.error("Registration Error:", error);
      throw new Error(
        error.code === "auth/email-already-in-use"
          ? "Email is already in use"
          : error.message
      );
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const auth = getAuth();
      const db = getDatabase();
      
      if (user) {
        // Update user status to offline
        const userStatusRef = ref(db, `userStatus/${user.uid}`);
        await set(userStatusRef, {
          state: "offline",
          lastChanged: new Date().toISOString(),
        });
      }
      
      await signOut(auth);
      localStorage.removeItem(LS_KEYS.USER);
    } catch (error) {
      console.error("Logout Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const value = useMemo(
    () => ({
      user,
      isLoading,
      login,
      register,
      logout,
    }),
    [user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
