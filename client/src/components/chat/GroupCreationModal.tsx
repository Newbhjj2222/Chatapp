import { useState } from "react";
import { Search, X } from "lucide-react";
import { useChat } from "@/contexts/ChatContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { MAX_GROUP_MEMBERS, DEFAULT_PROFILE_IMAGE } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";

interface GroupCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GroupCreationModal = ({ isOpen, onClose }: GroupCreationModalProps) => {
  const { user } = useAuth();
  const { users, createGroup } = useChat();
  const { toast } = useToast();
  const [groupName, setGroupName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<{ [key: string]: boolean }>({});
  const [isCreating, setIsCreating] = useState(false);

  const filteredUsers = users.filter(
    (u) =>
      u.uid !== user?.uid &&
      u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedCount = Object.values(selectedUsers).filter(Boolean).length;

  const handleToggleUser = (userId: string) => {
    setSelectedUsers((prev) => {
      const isCurrentlySelected = !!prev[userId];
      
      // If trying to select and already at max, show error
      if (!isCurrentlySelected && selectedCount >= MAX_GROUP_MEMBERS) {
        toast({
          variant: "destructive",
          title: "Maximum members reached",
          description: `Groups can have a maximum of ${MAX_GROUP_MEMBERS} members.`
        });
        return prev;
      }
      
      return {
        ...prev,
        [userId]: !isCurrentlySelected,
      };
    });
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast({
        variant: "destructive",
        title: "Group name required",
        description: "Please enter a name for your group.",
      });
      return;
    }

    const selectedUserIds = Object.entries(selectedUsers)
      .filter(([_, isSelected]) => isSelected)
      .map(([userId]) => userId);

    if (selectedUserIds.length === 0) {
      toast({
        variant: "destructive",
        title: "No members selected",
        description: "Please select at least one member for your group.",
      });
      return;
    }

    try {
      setIsCreating(true);
      await createGroup(groupName.trim(), selectedUserIds);
      toast({
        title: "Group created",
        description: `Your group "${groupName}" has been created successfully.`,
      });
      handleClose();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to create group",
        description: error.message || "An error occurred while creating the group.",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset form state
    setGroupName("");
    setSearchTerm("");
    setSelectedUsers({});
  };

  return (
    <Dialog open={isOpen} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div>
            <Label htmlFor="group-name">Group Name</Label>
            <Input
              id="group-name"
              placeholder="Family, Friends, Work, etc."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>

          <div>
            <Label>Group Icon</Label>
            <div className="flex items-center space-x-4 mt-1">
              <div className="w-16 h-16 rounded-full bg-neutral-light flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-text-secondary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <Button variant="link" className="text-primary p-0">
                Choose icon
              </Button>
            </div>
          </div>

          <div>
            <Label>Add Participants ({MAX_GROUP_MEMBERS} max)</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary h-4 w-4" />
              <Input
                className="pl-9"
                placeholder="Search contacts"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="mt-3 max-h-48 overflow-y-auto border border-neutral rounded-md">
              {filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-text-secondary">No contacts found</div>
              ) : (
                filteredUsers.map((contact) => (
                  <div key={contact.uid} className="flex items-center p-2 hover:bg-neutral-light">
                    <Checkbox
                      id={`contact-${contact.uid}`}
                      checked={!!selectedUsers[contact.uid]}
                      onCheckedChange={() => handleToggleUser(contact.uid)}
                      className="mr-3"
                    />
                    <img
                      src={contact.profileImage || DEFAULT_PROFILE_IMAGE}
                      alt={contact.username}
                      className="w-10 h-10 rounded-full mr-2"
                    />
                    <Label
                      htmlFor={`contact-${contact.uid}`}
                      className="flex-1 cursor-pointer"
                    >
                      {contact.username}
                    </Label>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center mt-2 text-sm text-text-secondary">
              <span>{selectedCount}</span> of <span>{users.length - 1}</span> selected
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleCreateGroup} disabled={isCreating}>
            {isCreating ? (
              <div className="flex items-center">
                <div className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full"></div>
                <span>Creating...</span>
              </div>
            ) : (
              "Create Group"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GroupCreationModal;
