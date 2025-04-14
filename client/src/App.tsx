import { Switch, Route } from "wouter";
import { useAuth } from "./hooks/useAuth";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import NotFound from "./pages/not-found";
import { useEffect, useState } from "react";

function App() {
  const { user, loading } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);

  // Debug authentication state
  useEffect(() => {
    console.log("Auth state:", { user, loading });
    if (!loading) {
      setIsInitialized(true);
    }
  }, [loading, user]);

  // Simple loading screen
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-bold text-primary mb-4">NetChat</h1>
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-muted-foreground">Initializing application...</p>
        </div>
      </div>
    );
  }

  // Simple login/register page for debugging
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-full max-w-md p-6 bg-card rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-primary text-center mb-6">NetChat</h1>
          <div className="grid gap-4">
            <a href="/login" className="flex items-center justify-center bg-primary hover:bg-primary/90 text-primary-foreground py-2 px-4 rounded-md">
              Login
            </a>
            <a href="/register" className="flex items-center justify-center bg-secondary hover:bg-secondary/90 text-secondary-foreground py-2 px-4 rounded-md">
              Register
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/login">{!user ? <Login /> : <Home />}</Route>
      <Route path="/register">{!user ? <Register /> : <Home />}</Route>
      <Route path="/">{user ? <Home /> : <Login />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

export default App;
