import { useState, useRef } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  CirclePlay,
  Image as ImageIcon,
  X,
  Send
} from "lucide-react";
import { compressImage } from "@/lib/chatUtils";

interface CreateStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateStatusModal({ isOpen, onClose }: CreateStatusModalProps) {
  const { user } = useAuth();
  const { createStatus } = useChat();
  const { toast } = useToast();
  const [statusText, setStatusText] = useState("");
  const [statusImage, setStatusImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      // Simple validation for image type and size
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file (JPEG, PNG, etc.).",
          variant: "destructive",
        });
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: "Image size should be less than 5MB.",
          variant: "destructive",
        });
        return;
      }
      
      // Compress image if needed
      const compressedFile = await compressImage(file, 1200, 1200, 0.8);
      setStatusImage(compressedFile);
      
      // Generate preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error("Error processing image:", error);
      toast({
        title: "Error",
        description: "Failed to process image. Please try another one.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveImage = () => {
    setStatusImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCreateStatus = async () => {
    if (!statusText.trim() && !statusImage) {
      toast({
        title: "Empty status",
        description: "Please add text or an image to your status.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      await createStatus(statusText, statusImage || undefined);
      
      toast({
        title: "Status updated!",
        description: "Your status has been posted successfully.",
        variant: "default",
      });
      
      // Reset form
      setStatusText("");
      setStatusImage(null);
      setImagePreview(null);
      
      onClose();
    } catch (error: any) {
      console.error("Error creating status:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to post status. Please try again.",
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
            <CirclePlay className="h-5 w-5 text-primary" />
            Create Status Update
          </DialogTitle>
          <DialogDescription>
            Share a text or photo status that disappears after 24 hours.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="statusText">Status Text</Label>
            <Textarea
              id="statusText"
              value={statusText}
              onChange={(e) => setStatusText(e.target.value)}
              placeholder="What's on your mind?"
              className="resize-none"
              rows={3}
            />
          </div>
          
          {imagePreview ? (
            <div className="relative rounded-md overflow-hidden">
              <img
                src={imagePreview}
                alt="Status Preview"
                className="w-full h-auto max-h-64 object-contain"
              />
              <Button
                type="button"
                size="icon"
                variant="destructive"
                className="absolute top-2 right-2 h-8 w-8 rounded-full"
                onClick={handleRemoveImage}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div>
              <Label htmlFor="statusImage" className="block mb-2">Add Photo</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Select Image
                </Button>
                <input
                  type="file"
                  id="statusImage"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </div>
          )}
          
          <div className="pt-2 text-sm text-muted-foreground">
            <p>
              Your status will be visible to all your contacts and will expire after 24 hours.
            </p>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleCreateStatus}
            disabled={isLoading || (!statusText.trim() && !statusImage)}
          >
            {isLoading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                Posting...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Post Status
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}