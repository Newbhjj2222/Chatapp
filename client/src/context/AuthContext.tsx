import { createContext, useEffect, useState, ReactNode } from "react";
import { auth } from "../lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import { apiRequest } from "../lib/queryClient";

// Define the shape of the auth context
interface AuthContextType {
  user: User | null;
  loading: boolean;
}

// Create context with default values
export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  // Initialize state in the component body
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Setup the Firebase auth listener
  useEffect(() => {
    console.log("Firebase auth setup - starting");
    let unsubscribe = () => {};
    
    try {
      // Listen for auth state changes
      unsubscribe = onAuthStateChanged(auth, 
        // Success callback
        async (firebaseUser) => {
          console.log("Auth state changed:", firebaseUser ? `User: ${firebaseUser.email}` : "No user");
          
          setUser(firebaseUser);
          
          if (firebaseUser) {
            try {
              // Sync with our backend
              await apiRequest("POST", "/api/auth/session", {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
              });
              console.log("User synced with backend successfully");
            } catch (error) {
              console.error("Error syncing user with backend:", error);
            }
          }
          
          setLoading(false);
        },
        // Error callback
        (error) => {
          console.error("Firebase auth error:", error);
          setLoading(false);
        }
      );
    } catch (error) {
      console.error("Error setting up Firebase auth:", error);
      setLoading(false);
    }

    // Cleanup function
    return () => {
      console.log("Auth listener unsubscribed");
      unsubscribe();
    };
  }, []);

  // Debug values whenever they change
  useEffect(() => {
    console.log("Auth context updated:", { user: user?.email || null, loading });
  }, [user, loading]);

  // Provide the auth context to children
  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
