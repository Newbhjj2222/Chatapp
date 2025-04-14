import { Switch, Route, Link, useLocation, useRoute, Redirect as WouterRedirect } from "wouter";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import NotFound from "./pages/not-found";
import { useState, useEffect } from "react";
import { database, auth, User } from "./lib/firebase";
import { ref, onValue, off } from "firebase/database";
import { useAuth } from "./hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings as SettingsIcon, 
  User as UserIcon, 
  Bell, 
  Shield, 
  LogOut, 
  Edit, 
  Camera
} from "lucide-react";

// Custom redirect component to navigate to login page
const Redirect = () => {
  useEffect(() => {
    window.location.href = "/login";
  }, []);
  
  return null;
};

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

// Settings page component
function Settings() {
  const [location, navigate] = useLocation();
  const { user, signOut } = useAuth();
  
  // Navigate to chat page
  const goToChat = () => {
    navigate("/chat");
  };
  
  // Show loading state if user is not loaded
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Card className="mb-8">
        <CardHeader>
          <div className="flex justify-between items-center mb-4">
            <CardTitle className="text-2xl">Settings</CardTitle>
            <Button variant="outline" size="sm" onClick={goToChat}>
              Back to Chat
            </Button>
          </div>
          <CardDescription>
            Manage your app settings and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-lg font-medium">Account</h3>
            <div className="grid gap-2">
              <div className="flex justify-between items-center p-3 bg-background rounded-md">
                <div>
                  <div className="font-medium">Profile</div>
                  <div className="text-sm text-muted-foreground">Update your profile information</div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate("/profile")}>
                  <UserIcon className="w-4 h-4 mr-2" />
                  View Profile
                </Button>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-background rounded-md">
                <div>
                  <div className="font-medium">Security</div>
                  <div className="text-sm text-muted-foreground">Manage password and account security</div>
                </div>
                <Button variant="ghost" size="sm">
                  <Shield className="w-4 h-4 mr-2" />
                  Manage
                </Button>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <h3 className="text-lg font-medium">Notifications</h3>
            <div className="grid gap-2">
              <div className="flex justify-between items-center p-3 bg-background rounded-md">
                <div>
                  <div className="font-medium">Push Notifications</div>
                  <div className="text-sm text-muted-foreground">Get notified about new messages and updates</div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-muted-foreground">On</span>
                  <div className="w-8 h-4 bg-primary rounded-full relative">
                    <div className="absolute top-0.5 right-0.5 w-3 h-3 bg-white rounded-full"></div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-background rounded-md">
                <div>
                  <div className="font-medium">Email Notifications</div>
                  <div className="text-sm text-muted-foreground">Receive email updates on important activities</div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-muted-foreground">Off</span>
                  <div className="w-8 h-4 bg-muted rounded-full relative">
                    <div className="absolute top-0.5 left-0.5 w-3 h-3 bg-background rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <h3 className="text-lg font-medium">Privacy</h3>
            <div className="grid gap-2">
              <div className="flex justify-between items-center p-3 bg-background rounded-md">
                <div>
                  <div className="font-medium">Online Status</div>
                  <div className="text-sm text-muted-foreground">Show when you're active on NetChat</div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-muted-foreground">On</span>
                  <div className="w-8 h-4 bg-primary rounded-full relative">
                    <div className="absolute top-0.5 right-0.5 w-3 h-3 bg-white rounded-full"></div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-background rounded-md">
                <div>
                  <div className="font-medium">Read Receipts</div>
                  <div className="text-sm text-muted-foreground">Let others know when you've read their messages</div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-muted-foreground">On</span>
                  <div className="w-8 h-4 bg-primary rounded-full relative">
                    <div className="absolute top-0.5 right-0.5 w-3 h-3 bg-white rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <Button variant="destructive" onClick={async () => {
              try {
                await signOut();
                navigate("/login");
              } catch (error) {
                console.error("Failed to logout:", error);
              }
            }}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Profile page component 
function Profile() {
  const [location, navigate] = useLocation();
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState("personal");
  const [isEditing, setIsEditing] = useState(false);
  
  // Handle logout and navigation
  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/login");
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };
  
  // Navigate to chat page
  const goToChat = () => {
    navigate("/chat");
  };
  
  // Show loading state if user is not loaded
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }
  
  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (!user.displayName) return "U";
    return user.displayName
      .split(" ")
      .map(part => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };
  
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Profile header with avatar and basic info */}
      <Card className="mb-8">
        <CardHeader className="pb-2">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="relative">
              <Avatar className="w-24 h-24 border-4 border-background">
                <AvatarImage src={user.photoURL || ""} alt={user.displayName || "User"} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <button 
                className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-1.5 rounded-full"
                aria-label="Change profile picture"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>
            
            <div className="text-center md:text-left">
              <CardTitle className="text-2xl mb-1">{user.displayName || "User"}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
              <div className="flex gap-3 mt-4 justify-center md:justify-start">
                <Button variant="outline" size="sm" onClick={goToChat}>
                  Back to Chat
                </Button>
                <Button variant="destructive" size="sm" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>
      
      {/* Profile tabs for different settings */}
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid grid-cols-3 mb-8">
          <TabsTrigger value="personal" onClick={() => setActiveTab("personal")}>
            <UserIcon className="w-4 h-4 mr-2" />
            Personal Info
          </TabsTrigger>
          <TabsTrigger value="security" onClick={() => setActiveTab("security")}>
            <Shield className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications" onClick={() => setActiveTab("notifications")}>
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
        </TabsList>
        
        {/* Personal Info Tab */}
        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Personal Information</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(!isEditing)}>
                  <Edit className="w-4 h-4 mr-2" />
                  {isEditing ? "Cancel" : "Edit"}
                </Button>
              </div>
              <CardDescription>
                Update your personal details and how others see you in NetChat
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Display Name</div>
                  {isEditing ? (
                    <input 
                      type="text"
                      defaultValue={user.displayName || ""} 
                      className="w-full p-2 bg-background border rounded-md"
                    />
                  ) : (
                    <div className="text-foreground">{user.displayName || "Not set"}</div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm font-medium">Email Address</div>
                  <div className="text-foreground">{user.email}</div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm font-medium">About Me</div>
                  {isEditing ? (
                    <textarea 
                      rows={3}
                      defaultValue="Available for chats and collaboration." 
                      className="w-full p-2 bg-background border rounded-md"
                    />
                  ) : (
                    <div className="text-foreground">Available for chats and collaboration.</div>
                  )}
                </div>
              </div>
            </CardContent>
            
            {isEditing && (
              <CardFooter>
                <Button>Save Changes</Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>
        
        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage your password and account security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Button variant="outline">Change Password</Button>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="text-sm font-medium">Two-Factor Authentication</div>
                    <div className="text-sm text-muted-foreground">Not enabled</div>
                  </div>
                  <Button variant="outline">Setup 2FA</Button>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm font-medium">Account Activity</div>
                  <div className="text-sm p-3 bg-background rounded-md">
                    <div className="flex justify-between mb-1">
                      <span>Last login</span>
                      <span>Today, 10:42 AM</span>
                    </div>
                    <div className="flex justify-between">
                      <span>IP Address</span>
                      <span>192.168.1.x</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Manage how and when NetChat will notify you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2">
                <div>
                  <div className="font-medium">Messages</div>
                  <div className="text-sm text-muted-foreground">Get notified about new messages</div>
                </div>
                <div>
                  <input 
                    type="checkbox" 
                    defaultChecked 
                    className="toggle toggle-primary" 
                  />
                </div>
              </div>
              
              <div className="flex justify-between items-center py-2">
                <div>
                  <div className="font-medium">Group Activities</div>
                  <div className="text-sm text-muted-foreground">Notifications for group updates</div>
                </div>
                <div>
                  <input 
                    type="checkbox" 
                    defaultChecked 
                    className="toggle toggle-primary" 
                  />
                </div>
              </div>
              
              <div className="flex justify-between items-center py-2">
                <div>
                  <div className="font-medium">Status Updates</div>
                  <div className="text-sm text-muted-foreground">Get notified when someone posts a status</div>
                </div>
                <div>
                  <input 
                    type="checkbox" 
                    className="toggle toggle-primary" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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
  const { user } = useAuth();
  
  return (
    <>
      <Switch>
        <Route path="/login"><Login /></Route>
        <Route path="/register"><Register /></Route>
        <Route path="/chat"><Home /></Route>
        <Route path="/profile"><Profile /></Route>
        <Route path="/settings"><Settings /></Route>
        <Route path="/">
          <Redirect />
        </Route>
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

export default App;
