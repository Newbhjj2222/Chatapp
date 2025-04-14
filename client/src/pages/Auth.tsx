import { useEffect } from "react";
import { useLocation } from "wouter";
import AuthForm from "@/components/auth/AuthForm";
import { useAuth } from "@/contexts/AuthContext";

const Auth = () => {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) {
      setLocation("/chat");
    }
  }, [user, setLocation]);

  return (
    <div className="min-h-screen bg-neutral">
      <AuthForm />
    </div>
  );
};

export default Auth;
