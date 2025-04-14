import { Switch, Route } from "wouter";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import NotFound from "./pages/not-found";
import { useState } from "react";

// Simple NetChat landing page that doesn't rely on Firebase or WebSockets
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
          <a 
            href="/login" 
            className="flex items-center justify-center bg-primary hover:bg-primary/90 text-primary-foreground py-3 px-4 rounded-md font-medium shadow-sm"
          >
            Sign In
          </a>
          <a 
            href="/register" 
            className="flex items-center justify-center bg-secondary hover:bg-secondary/90 text-secondary-foreground py-3 px-4 rounded-md font-medium shadow-sm"
          >
            Create Account
          </a>
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
  const [showDemoAlert, setShowDemoAlert] = useState(true);
  
  return (
    <>
      {showDemoAlert && (
        <div className="fixed top-0 left-0 right-0 bg-primary/90 text-primary-foreground p-2 text-center z-50">
          <div className="flex items-center justify-center gap-2">
            <span>Demo Mode: Firebase authentication is configured but not connected</span>
            <button 
              onClick={() => setShowDemoAlert(false)}
              className="bg-primary-foreground text-primary text-xs px-2 py-1 rounded-full"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      
      <Switch>
        <Route path="/login"><Login /></Route>
        <Route path="/register"><Register /></Route>
        <Route path="/chat"><Home /></Route>
        <Route path="/"><LandingPage /></Route>
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

export default App;
