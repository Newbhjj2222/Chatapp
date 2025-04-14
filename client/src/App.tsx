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

  useEffect(() => {
    if (!loading) {
      setIsInitialized(true);
    }
  }, [loading]);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-bold text-primary mb-4">NetChat</h1>
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
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
