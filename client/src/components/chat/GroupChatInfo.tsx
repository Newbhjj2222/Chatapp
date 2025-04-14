import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Chat, ChatMember } from "../../types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface GroupChatInfoProps {
  isOpen: boolean;
  onClose: () => void;
  chat: Chat;
  currentUser: User;
}

export default function GroupChatInfo({
  isOpen,
  onClose,
  chat,
  currentUser,
}: GroupChatInfoProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [groupName, setGroupName] = useState(chat.name || "");
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if current user is admin
  const isAdmin = chat.members?.some(
    (member) => member.userId === currentUser.id && member.isAdmin
  );

  // Filter members based on search
  const filteredMembers = chat.members?.filter((member) =>
    member.user?.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Update group name mutation
  const updateGroupNameMutation = useMutation({
    mutationFn: (name: string) =>
      apiRequest("PATCH", `/api/chats/${chat.id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chats", chat.id] });
      toast({
        title: "Success",
        description: "Group name updated successfully",
      });
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update group name",
        variant: "destructive",
      });
      console.error("Error updating group name:", error);
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: (userId: number) =>
      apiRequest("DELETE", `/api/chats/${chat.id}/members/${userId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chats", chat.id] });
      toast({
        title: "Success",
        description: "Member removed successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to remove member",
        variant: "destructive",
      });
      console.error("Error removing member:", error);
    },
  });

  // Toggle admin status mutation
  const toggleAdminMutation = useMutation({
    mutationFn: ({ userId, isAdmin }: { userId: number; isAdmin: boolean }) =>
      apiRequest("PATCH", `/api/chats/${chat.id}/members/${userId}`, {
        isAdmin,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chats", chat.id] });
      toast({
        title: "Success",
        description: "Admin status updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update admin status",
        variant: "destructive",
      });
      console.error("Error updating admin status:", error);
    },
  });

  // Leave group mutation
  const leaveGroupMutation = useMutation({
    mutationFn: () =>
      apiRequest("DELETE", `/api/chats/${chat.id}/members/${currentUser.id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      toast({
        title: "Success",
        description: "You have left the group",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to leave group",
        variant: "destructive",
      });
      console.error("Error leaving group:", error);
    },
  });

  // Handle group name update
  const handleUpdateGroupName = () => {
    if (groupName.trim() === "") {
      toast({
        title: "Error",
        description: "Group name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    updateGroupNameMutation.mutate(groupName);
  };

  // Handle member removal
  const handleRemoveMember = (userId: number) => {
    if (userId === currentUser.id) {
      // If removing self (leaving group)
      if (window.confirm("Are you sure you want to leave this group?")) {
        leaveGroupMutation.mutate();
      }
    } else if (isAdmin) {
      // If admin is removing someone else
      if (window.confirm("Remove this member from the group?")) {
        removeMemberMutation.mutate(userId);
      }
    }
  };

  // Handle admin toggle
  const handleAdminToggle = (member: ChatMember) => {
    if (!isAdmin) return;

    toggleAdminMutation.mutate({
      userId: member.userId,
      isAdmin: !member.isAdmin,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Group Information</DialogTitle>
          <DialogDescription>
            {chat.members?.length} members
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col space-y-4">
          {/* Group photo and name */}
          <div className="flex flex-col items-center space-y-3">
            <Avatar className="h-24 w-24">
              <AvatarImage
                src={chat.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.name || "Group")}`}
                alt={chat.name || "Group"}
              />
              <AvatarFallback>{(chat.name || "Group").charAt(0)}</AvatarFallback>
            </Avatar>

            {isEditing ? (
              <div className="space-y-2 w-full">
                <Label htmlFor="group-name">Group Name</Label>
                <div className="flex space-x-2">
                  <Input
                    id="group-name"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Enter group name"
                  />
                  <Button
                    size="sm"
                    onClick={handleUpdateGroupName}
                    disabled={updateGroupNameMutation.isPending}
                  >
                    {updateGroupNameMutation.isPending ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      "Save"
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsEditing(false);
                      setGroupName(chat.name || "");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-semibold">{chat.name}</h2>
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => setIsEditing(true)}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Search members */}
          <div>
            <Label htmlFor="search-members">Search Members</Label>
            <Input
              id="search-members"
              placeholder="Search by name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Members list */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium">Members</h3>
              <span className="text-sm text-muted-foreground">
                {chat.members?.length} / 2000
              </span>
            </div>

            <ScrollArea className="h-64">
              <div className="space-y-2">
                {filteredMembers?.map((member) => (
                  <div
                    key={member.userId}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted"
                  >
                    <div className="flex items-center">
                      <Avatar className="h-8 w-8 mr-3">
                        <AvatarImage
                          src={member.user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.user?.displayName || "User")}`}
                          alt={member.user?.displayName}
                        />
                        <AvatarFallback>
                          {member.user?.displayName?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {member.user?.displayName}{" "}
                          {member.userId === currentUser.id && "(You)"}
                        </p>
                        {member.isAdmin && (
                          <p className="text-xs text-primary">Group Admin</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {isAdmin && member.userId !== currentUser.id && (
                        <>
                          <div className="flex items-center space-x-1">
                            <span className="text-xs">Admin</span>
                            <Switch
                              checked={member.isAdmin}
                              onCheckedChange={() => handleAdminToggle(member)}
                              disabled={toggleAdminMutation.isPending}
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500"
                            onClick={() => handleRemoveMember(member.userId)}
                            disabled={removeMemberMutation.isPending}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </Button>
                        </>
                      )}

                      {member.userId === currentUser.id && !isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500"
                          onClick={() => handleRemoveMember(currentUser.id)}
                          disabled={leaveGroupMutation.isPending}
                        >
                          {leaveGroupMutation.isPending ? (
                            <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            "Leave Group"
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          {isAdmin && (
            <Button
              variant="outline"
              onClick={() => setShowAddMembers(true)}
              className="mr-auto"
            >
              Add Members
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>

          {currentUser.id === chat.createdBy && (
            <Button variant="destructive">Delete Group</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
