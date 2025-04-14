import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User } from "../../types";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface NewChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onChatCreated: (chatId: number) => void;
}

export default function NewChatDialog({
  isOpen,
  onClose,
  onChatCreated,
}: NewChatDialogProps) {
  const [activeTab, setActiveTab] = useState<"direct" | "group">("direct");
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [groupName, setGroupName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all users
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Get current user
  const { data: currentUser } = useQuery({
    queryKey: ["/api/users/me"],
  });

  // Filter out current user and search
  const filteredUsers = users.filter(
    (user) =>
      user.id !== currentUser?.id &&
      (user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Create direct chat mutation
  const createDirectChatMutation = useMutation({
    mutationFn: (userId: number) =>
      apiRequest("POST", "/api/chats", {
        type: "direct",
        name: null,
        photoURL: null,
      }).then((res) => res.json()),
    onSuccess: async (data) => {
      // Add selected user to the chat
      if (selectedUsers.length > 0) {
        await apiRequest("POST", `/api/chats/${data.id}/members`, {
          userId: selectedUsers[0].id,
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      toast({
        title: "Success",
        description: "Chat created successfully",
      });
      onChatCreated(data.id);
      resetForm();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create chat",
        variant: "destructive",
      });
      console.error("Error creating chat:", error);
    },
  });

  // Create group chat mutation
  const createGroupChatMutation = useMutation({
    mutationFn: (data: { name: string; selectedUsers: User[] }) =>
      apiRequest("POST", "/api/chats", {
        type: "group",
        name: data.name,
        photoURL: null,
      }).then((res) => res.json()),
    onSuccess: async (data) => {
      // Add all selected users to the group
      for (const user of selectedUsers) {
        await apiRequest("POST", `/api/chats/${data.id}/members`, {
          userId: user.id,
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      toast({
        title: "Success",
        description: "Group created successfully",
      });
      onChatCreated(data.id);
      resetForm();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create group",
        variant: "destructive",
      });
      console.error("Error creating group:", error);
    },
  });

  // Handle user selection
  const handleUserSelect = (user: User) => {
    if (activeTab === "direct") {
      setSelectedUsers([user]);
    } else {
      // For group chats, toggle selection
      if (selectedUsers.some((u) => u.id === user.id)) {
        setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id));
      } else {
        // Check group member limit (2000)
        if (selectedUsers.length < 2000) {
          setSelectedUsers([...selectedUsers, user]);
        } else {
          toast({
            title: "Member limit reached",
            description: "Groups can have a maximum of 2000 members",
            variant: "destructive",
          });
        }
      }
    }
  };

  // Create chat
  const handleCreateChat = () => {
    if (activeTab === "direct") {
      if (selectedUsers.length === 0) {
        toast({
          title: "Error",
          description: "Please select a user to chat with",
          variant: "destructive",
        });
        return;
      }
      
      createDirectChatMutation.mutate(selectedUsers[0].id);
    } else {
      // Group chat validation
      if (groupName.trim() === "") {
        toast({
          title: "Error",
          description: "Please enter a group name",
          variant: "destructive",
        });
        return;
      }
      
      if (selectedUsers.length === 0) {
        toast({
          title: "Error",
          description: "Please select at least one user for the group",
          variant: "destructive",
        });
        return;
      }
      
      createGroupChatMutation.mutate({
        name: groupName,
        selectedUsers,
      });
    }
  };

  // Reset form on close
  const resetForm = () => {
    setSelectedUsers([]);
    setSearchQuery("");
    setGroupName("");
    setActiveTab("direct");
  };

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "direct" | "group")}>
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="direct">Direct Message</TabsTrigger>
            <TabsTrigger value="group">Group Chat</TabsTrigger>
          </TabsList>
          
          <TabsContent value="direct" className="space-y-4">
            <div>
              <Label htmlFor="search-users">Search Users</Label>
              <Input
                id="search-users"
                placeholder="Search by name or email"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <ScrollArea className="h-72">
              {isLoading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No users found
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors ${
                        selectedUsers.some((u) => u.id === user.id)
                          ? "bg-primary/10"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => handleUserSelect(user)}
                    >
                      <Avatar className="h-10 w-10 mr-3">
                        <AvatarImage
                          src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}`}
                          alt={user.displayName}
                        />
                        <AvatarFallback>{user.displayName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{user.displayName}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                      {selectedUsers.some((u) => u.id === user.id) && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-primary"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="group" className="space-y-4">
            <div>
              <Label htmlFor="group-name">Group Name</Label>
              <Input
                id="group-name"
                placeholder="Enter group name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="search-members">Add Members</Label>
              <Input
                id="search-members"
                placeholder="Search by name or email"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center bg-primary/10 text-primary rounded-full px-3 py-1"
                >
                  <span className="text-sm">{user.displayName}</span>
                  <button
                    type="button"
                    className="ml-2 focus:outline-none"
                    onClick={() => setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id))}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            
            <ScrollArea className="h-60">
              {isLoading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No users found
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center p-2 rounded-lg hover:bg-muted cursor-pointer"
                      onClick={() => handleUserSelect(user)}
                    >
                      <Avatar className="h-10 w-10 mr-3">
                        <AvatarImage
                          src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}`}
                          alt={user.displayName}
                        />
                        <AvatarFallback>{user.displayName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{user.displayName}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                      <Checkbox
                        checked={selectedUsers.some((u) => u.id === user.id)}
                        onCheckedChange={() => handleUserSelect(user)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            
            <div className="text-sm text-muted-foreground">
              Selected: {selectedUsers.length} {selectedUsers.length === 1 ? "user" : "users"}
              {selectedUsers.length > 0 && " (max 2000)"}
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateChat}
            disabled={
              (activeTab === "direct" && selectedUsers.length === 0) ||
              (activeTab === "group" && (groupName.trim() === "" || selectedUsers.length === 0)) ||
              createDirectChatMutation.isPending ||
              createGroupChatMutation.isPending
            }
          >
            {createDirectChatMutation.isPending || createGroupChatMutation.isPending ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Creating...</span>
              </div>
            ) : (
              "Create Chat"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
