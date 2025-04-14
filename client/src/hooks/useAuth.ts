import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  updateProfile
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { auth } from "../lib/firebase";
import { useToast } from "@/hooks/use-toast";

export function useAuth() {
  const context = useContext(AuthContext);
  const { toast } = useToast();

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  // Helper to format Firebase error messages
  const getFirebaseErrorMessage = (error: any): string => {
    if (error instanceof FirebaseError) {
      const errorCode = error.code;
      
      // Provide more user-friendly error messages
      switch (errorCode) {
        case 'auth/email-already-in-use':
          return 'This email is already registered. Please use a different email or try logging in.';
        case 'auth/invalid-email':
          return 'Please enter a valid email address.';
        case 'auth/weak-password':
          return 'Password is too weak. Please use at least 6 characters.';
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          return 'Invalid email or password. Please try again.';
        case 'auth/too-many-requests':
          return 'Too many failed attempts. Please try again later.';
        case 'auth/network-request-failed':
          return 'Network error. Please check your internet connection.';
        default:
          return error.message || 'An error occurred. Please try again.';
      }
    }
    
    return error?.message || 'An unexpected error occurred';
  };

  const register = async (email: string, password: string, displayName: string) => {
    console.log(`Attempting to register user: ${email}`);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log("User registration successful, updating profile...");
      
      // Update profile with display name
      await updateProfile(userCredential.user, {
        displayName: displayName
      });
      
      console.log("User profile updated successfully");
      
      toast({
        title: "Account created!",
        description: "Your account has been created successfully.",
      });
      
      return userCredential.user;
    } catch (error: any) {
      console.error("Registration error:", error);
      
      const errorMessage = getFirebaseErrorMessage(error);
      
      toast({
        title: "Registration failed",
        description: errorMessage,
        variant: "destructive"
      });
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    console.log(`Attempting to log in user: ${email}`);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Login successful");
      
      toast({
        title: "Welcome back!",
        description: "You have been logged in successfully.",
      });
      
      return userCredential.user;
    } catch (error: any) {
      console.error("Login error:", error);
      
      const errorMessage = getFirebaseErrorMessage(error);
      
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive"
      });
      throw error;
    }
  };

  const signOut = async () => {
    console.log("Attempting to sign out");
    try {
      await firebaseSignOut(auth);
      console.log("Sign out successful");
      
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
    } catch (error: any) {
      console.error("Sign out error:", error);
      
      toast({
        title: "Sign out failed",
        description: error.message || "An error occurred while signing out",
        variant: "destructive"
      });
      throw error;
    }
  };

  return {
    ...context,
    register,
    login,
    signOut
  };
}
