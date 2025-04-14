import { createContext, useEffect, useState, ReactNode } from "react";
import { auth } from "../lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { apiRequest } from "../lib/queryClient";

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("Firebase auth setup - starting");
    
    try {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
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
      }, (error) => {
        console.error("Firebase auth error:", error);
        setLoading(false);
      });

      // Clean up function
      return () => {
        console.log("Auth listener unsubscribed");
        unsubscribe();
      };
    } catch (error) {
      console.error("Error setting up Firebase auth:", error);
      setLoading(false);
    }
  }, []);

  // Debug values whenever they change
  useEffect(() => {
    console.log("Auth context updated:", { user: user?.email || null, loading });
  }, [user, loading]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
