import { useState, useEffect } from "react";
import { useChat } from "@/contexts/ChatContext";
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
import { 
  Share, 
  Copy, 
  RefreshCw, 
  Check,
  QrCode 
} from "lucide-react";
import { Chat } from "@/types";

interface ShareGroupLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  chat?: Chat;
}

export default function ShareGroupLinkModal({ isOpen, onClose, chat }: ShareGroupLinkModalProps) {
  const { generateGroupLink, regenerateGroupLink } = useChat();
  const { toast } = useToast();
  const [groupLink, setGroupLink] = useState("");
  const [groupCode, setGroupCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    if (isOpen && chat?.id) {
      loadGroupLink();
    }
  }, [isOpen, chat]);

  const loadGroupLink = async () => {
    if (!chat?.id) return;
    
    setIsLoading(true);
    
    try {
      const { link, code } = await generateGroupLink(chat.id);
      setGroupLink(link);
      setGroupCode(code);
    } catch (error) {
      console.error("Error generating group link:", error);
      toast({
        title: "Error",
        description: "Failed to generate group invite link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(groupLink)
      .then(() => {
        setIsCopied(true);
        toast({
          title: "Link copied!",
          description: "Group invite link copied to clipboard.",
          variant: "default",
        });
        
        setTimeout(() => setIsCopied(false), 2000);
      })
      .catch((error) => {
        console.error("Error copying link:", error);
        toast({
          title: "Error",
          description: "Failed to copy link. Please try again.",
          variant: "destructive",
        });
      });
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(groupCode)
      .then(() => {
        toast({
          title: "Code copied!",
          description: "Group invite code copied to clipboard.",
          variant: "default",
        });
      })
      .catch((error) => {
        console.error("Error copying code:", error);
        toast({
          title: "Error",
          description: "Failed to copy code. Please try again.",
          variant: "destructive",
        });
      });
  };

  const handleRegenerateLink = async () => {
    if (!chat?.id) return;
    
    setIsRegenerating(true);
    
    try {
      const { link, code } = await regenerateGroupLink(chat.id);
      setGroupLink(link);
      setGroupCode(code);
      
      toast({
        title: "Link regenerated",
        description: "New group invite link has been generated.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error regenerating group link:", error);
      toast({
        title: "Error",
        description: "Failed to regenerate group invite link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share className="h-5 w-5 text-primary" />
            Share Group Link
          </DialogTitle>
          <DialogDescription>
            {chat?.type === 'group' ? (
              <>Share this link or code to invite others to "<strong>{chat.name}</strong>".</>
            ) : (
              <>Generate and share a group invite link.</>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Invite Link</h3>
                <div className="flex items-center space-x-2">
                  <Input 
                    value={groupLink}
                    readOnly
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    size="icon" 
                    variant="outline"
                    onClick={handleCopyLink}
                  >
                    {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Invite Code</h3>
                <div className="flex items-center space-x-2">
                  <div className="bg-muted px-4 py-2 rounded-md font-mono text-center flex-1">
                    {groupCode}
                  </div>
                  <Button 
                    type="button" 
                    size="icon" 
                    variant="outline"
                    onClick={handleCopyCode}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="py-3 flex justify-center">
                <div className="border rounded-lg p-4 w-48 h-48 flex items-center justify-center">
                  <QrCode className="h-full w-full text-primary opacity-70" />
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex justify-between space-x-2">
          <Button 
            type="button" 
            size="sm"
            variant="outline"
            onClick={handleRegenerateLink}
            disabled={isLoading || isRegenerating}
            className="mr-auto"
          >
            {isRegenerating ? (
              <>
                <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                Regenerating...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-3 w-3" />
                New Link
              </>
            )}
          </Button>
          
          <Button 
            type="button" 
            onClick={onClose} 
            disabled={isLoading}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}