import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { AuthProvider } from "./context/AuthContext";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";

// Log app version/build info
console.log("NetChat - Running in", 
  import.meta.env.MODE === "production" ? "production" : "development", 
  "mode"
);

// Check if Firebase config is present
const hasFirebaseConfig = 
  import.meta.env.VITE_FIREBASE_API_KEY && 
  import.meta.env.VITE_FIREBASE_PROJECT_ID && 
  import.meta.env.VITE_FIREBASE_APP_ID;

console.log("Firebase API Keys:", hasFirebaseConfig ? "Found" : "Missing");

// Global error handling for debugging
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Promise Rejection:', event.reason);
});

// Create a standalone error boundary component
function ErrorFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
      <div className="space-y-4 max-w-md">
        <h1 className="text-3xl font-bold text-destructive">NetChat - Error</h1>
        <p className="text-muted-foreground">
          There was a problem loading the application.
        </p>
        <div className="bg-card p-4 rounded-md text-left overflow-auto max-h-48 text-sm">
          <p className="font-medium mb-2">Debug information:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Mode: {import.meta.env.MODE}</li>
            <li>Firebase Config: {hasFirebaseConfig ? "Present" : "Missing"}</li>
            <li>Vite Environment: {import.meta.env.VITE_USER_NODE_ENV || "Not specified"}</li>
          </ul>
        </div>
        <button 
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md"
          onClick={() => window.location.reload()}
        >
          Reload Application
        </button>
      </div>
    </div>
  );
}

// Function to render the app
function renderApp() {
  const rootElement = document.getElementById("root");
  
  if (!rootElement) {
    console.error("Root element not found");
    return;
  }
  
  try {
    const root = createRoot(rootElement);
    
    // Render the application
    root.render(
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <App />
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    );
    
    console.log("Application rendered successfully");
  } catch (error) {
    console.error("Failed to render application:", error);
    
    // Render the error fallback if main app fails
    try {
      const root = createRoot(rootElement);
      root.render(<ErrorFallback />);
    } catch (fallbackError) {
      console.error("Failed to render error fallback:", fallbackError);
      
      // Last resort: plain HTML error message
      rootElement.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column; font-family: system-ui, sans-serif; padding: 20px; text-align: center;">
          <h1 style="color: #e11d48; margin-bottom: 16px;">NetChat - Critical Error</h1>
          <p style="max-width: 400px; margin-bottom: 24px;">The application encountered a critical error and could not be loaded.</p>
          <button style="background: #2563eb; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;" onclick="window.location.reload()">
            Reload Application
          </button>
        </div>
      `;
    }
  }
}

// Start the application
renderApp();
