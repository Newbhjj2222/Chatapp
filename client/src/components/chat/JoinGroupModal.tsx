import { useState } from "react";
import { useChat } from "@/contexts/ChatContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, UserPlus } from "lucide-react";

interface JoinGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function JoinGroupModal({ isOpen, onClose }: JoinGroupModalProps) {
  const { user } = useAuth();
  const { joinGroup } = useChat();
  const { toast } = useToast();
  const [groupCode, setGroupCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!groupCode.trim()) {
      setError("Please enter a group invite code");
      return;
    }
    
    setError(null);
    setIsLoading(true);
    
    try {
      await joinGroup(groupCode);
      
      toast({
        title: "Success!",
        description: "You have joined the group successfully.",
        variant: "default",
      });
      
      setGroupCode("");
      onClose();
    } catch (error: any) {
      console.error("Error joining group:", error);
      setError(error.message || "Failed to join group. Please try again.");
      
      toast({
        title: "Error",
        description: error.message || "Failed to join group. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" /> 
            Join a Group
          </DialogTitle>
          <DialogDescription>
            Enter a group invite code to join an existing group.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleJoinGroup} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="groupCode">Group Invite Code</Label>
            <Input 
              id="groupCode"
              value={groupCode}
              onChange={(e) => setGroupCode(e.target.value)}
              placeholder="Enter code (e.g., ABC123)"
              className="w-full"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          
          <div className="pt-4 text-sm text-muted-foreground">
            <p>
              Group codes are usually 6-8 characters long. Ask your friend to share the group's invite code with you.
            </p>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                  Joining...
                </>
              ) : (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  Join Group
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}