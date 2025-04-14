import { Switch, Route, Link } from "wouter";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import NotFound from "./pages/not-found";
import { useState, useEffect } from "react";
import { database } from "./lib/firebase";
import { ref, onValue, off } from "firebase/database";

// Firebase connection status component
function ConnectionStatus() {
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  
  useEffect(() => {
    // Reference to the Firebase connection status
    const connectedRef = ref(database, '.info/connected');
    
    // Listen for connection changes
    onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('disconnected');
      }
    }, (error) => {
      console.error('Connection check error:', error);
      setConnectionStatus('disconnected');
    });
    
    // Clean up listener
    return () => {
      off(connectedRef);
    };
  }, []);
  
  // Render different indicators based on connection status
  const statusColors = {
    checking: "bg-yellow-500",
    connected: "bg-green-500",
    disconnected: "bg-red-500"
  };
  
  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${statusColors[connectionStatus]} animate-pulse`}></div>
      <span className="text-xs">
        {connectionStatus === 'checking' ? 'Checking connection...' : 
         connectionStatus === 'connected' ? 'Connected to Firebase' : 
         'Disconnected'}
      </span>
    </div>
  );
}

// Simple NetChat landing page
const LandingPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-background to-muted p-4">
      <div className="max-w-xl w-full text-center space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-secondary text-transparent bg-clip-text">
            NetChat
          </h1>
          <p className="text-lg text-muted-foreground">
            A secure messaging app for personal and group conversations
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4 max-w-md mx-auto">
          <Link 
            href="/login" 
            className="flex items-center justify-center bg-primary hover:bg-primary/90 text-primary-foreground py-3 px-4 rounded-md font-medium shadow-sm"
          >
            Sign In
          </Link>
          <Link 
            href="/register" 
            className="flex items-center justify-center bg-secondary hover:bg-secondary/90 text-secondary-foreground py-3 px-4 rounded-md font-medium shadow-sm"
          >
            Create Account
          </Link>
        </div>
        
        <div className="grid gap-6 md:grid-cols-3 mt-12">
          <div className="bg-card p-4 rounded-lg shadow-sm">
            <div className="text-primary text-2xl mb-2">🔒</div>
            <h3 className="text-lg font-medium mb-1">Secure Messaging</h3>
            <p className="text-sm text-muted-foreground">
              End-to-end encryption for your private conversations
            </p>
          </div>
          
          <div className="bg-card p-4 rounded-lg shadow-sm">
            <div className="text-primary text-2xl mb-2">👥</div>
            <h3 className="text-lg font-medium mb-1">Group Chats</h3>
            <p className="text-sm text-muted-foreground">
              Create groups with up to 2000 members
            </p>
          </div>
          
          <div className="bg-card p-4 rounded-lg shadow-sm">
            <div className="text-primary text-2xl mb-2">📱</div>
            <h3 className="text-lg font-medium mb-1">Status Updates</h3>
            <p className="text-sm text-muted-foreground">
              Share updates that disappear after 24 hours
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [showStatusBar, setShowStatusBar] = useState(true);
  
  return (
    <>
      {showStatusBar && (
        <div className="fixed top-0 left-0 right-0 bg-card/90 backdrop-blur-sm border-b text-foreground p-2 text-center z-50">
          <div className="flex items-center justify-between container mx-auto max-w-7xl px-4">
            <div className="flex items-center gap-2">
              <strong className="text-primary">NetChat</strong>
              <span className="text-xs">Connected to Firebase Project: netchat-81f3f</span>
            </div>
            
            <div className="flex items-center gap-4">
              <ConnectionStatus />
              
              <button 
                onClick={() => setShowStatusBar(false)}
                className="bg-secondary/20 hover:bg-secondary/30 text-secondary-foreground text-xs px-2 py-1 rounded"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className={showStatusBar ? "pt-12" : ""}>
        <Switch>
          <Route path="/login"><Login /></Route>
          <Route path="/register"><Register /></Route>
          <Route path="/chat"><Home /></Route>
          <Route path="/"><LandingPage /></Route>
          <Route component={NotFound} />
        </Switch>
      </div>
    </>
  );
}

export default App;
