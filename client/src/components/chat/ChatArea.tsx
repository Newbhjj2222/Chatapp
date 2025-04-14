import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Search, MoreHorizontal, Smile, Paperclip, Send } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useChat } from "@/contexts/ChatContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DEFAULT_PROFILE_IMAGE } from "@/lib/constants";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface ChatAreaProps {
  isMobile: boolean;
  onBackClick: () => void;
}

const ChatArea = ({ isMobile, onBackClick }: ChatAreaProps) => {
  const { user } = useAuth();
  const { activeConversation, sendMessage, sendImageMessage, messages } = useChat();
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = () => {
    if (messageText.trim() && activeConversation) {
      sendMessage(activeConversation.id, messageText.trim());
      setMessageText("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  const handleAttachFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversation) return;

    // Check if file is an image
    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Only image files are supported.",
      });
      return;
    }

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please select an image less than 5MB in size.",
      });
      return;
    }

    try {
      await sendImageMessage(activeConversation.id, file);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to send image",
        description: error.message || "An error occurred while sending the image.",
      });
    }

    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const groupMessagesByDate = () => {
    const groups: { [date: string]: typeof messages } = {};
    
    messages.forEach(message => {
      const date = new Date(message.createdAt || Date.now()).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    
    return groups;
  };

  const getDateLabel = (dateStr: string) => {
    const messageDate = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    
    if (messageDate.toDateString() === today.toDateString()) {
      return "Today";
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return format(messageDate, "MMMM d, yyyy");
    }
  };

  // If no active conversation, show empty state
  if (!activeConversation) {
    return (
      <div className="hidden md:flex w-full md:w-2/3 lg:w-3/4 flex-col bg-[#E5DDD5] h-full relative">
        <div className="h-full flex items-center justify-center flex-col p-6 text-center">
          <div className="w-64 h-64 bg-neutral rounded-full flex items-center justify-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold mb-2">Welcome to NetChat</h2>
          <p className="text-text-secondary max-w-md">
            Select a conversation to start chatting or click the new chat icon to start a new
            conversation.
          </p>
        </div>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate();

  return (
    <div className={`${isMobile ? "w-full" : "hidden md:flex w-full md:w-2/3 lg:w-3/4"} flex-col bg-[#E5DDD5] h-full relative`}>
      {/* Chat Header */}
      <div className="bg-neutral-light p-3 flex justify-between items-center border-b border-neutral">
        <div className="flex items-center">
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={onBackClick} className="mr-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          {activeConversation.isGroup ? (
            <div className="w-10 h-10 rounded-full mr-3 bg-primary text-white flex items-center justify-center">
              <span className="font-medium">
                {activeConversation.name
                  ?.split(" ")
                  .map((word) => word[0])
                  .join("")
                  .substring(0, 2)}
              </span>
            </div>
          ) : (
            <img
              src={activeConversation.otherUser?.profileImage || DEFAULT_PROFILE_IMAGE}
              alt="Contact"
              className="w-10 h-10 rounded-full mr-3"
            />
          )}
          <div>
            <h2 className="font-medium">
              {activeConversation.isGroup
                ? activeConversation.name
                : activeConversation.otherUser?.username}
            </h2>
            <p className="text-xs text-text-secondary">
              {activeConversation.isGroup
                ? `${activeConversation.memberCount || 0} members`
                : activeConversation.otherUser?.isOnline
                ? "Online"
                : "Offline"}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon">
            <Search className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {Object.entries(messageGroups).map(([date, messagesGroup]) => (
          <div key={date} className="space-y-3">
            {/* Date Divider */}
            <div className="flex justify-center">
              <span className="bg-white text-xs text-text-secondary px-3 py-1 rounded-full">
                {getDateLabel(date)}
              </span>
            </div>

            {/* Messages */}
            {messagesGroup.map((message) => {
              const isSent = message.senderId === user?.uid;
              const timestamp = message.createdAt
                ? format(new Date(message.createdAt), "h:mm a")
                : "";

              const isRead = message.readBy?.includes(
                activeConversation.otherUser?.uid || ""
              );

              return (
                <div
                  key={message.id}
                  className={`flex items-end ${
                    isSent ? "justify-end max-w-3/4 w-fit ml-auto" : "max-w-3/4 w-fit"
                  }`}
                >
                  <div className={`p-3 shadow-sm ${isSent ? "chat-bubble-sent" : "chat-bubble-received"}`}>
                    {message.imageUrl && (
                      <div className="relative mb-1">
                        <img
                          src={message.imageUrl}
                          alt="Shared image"
                          className="rounded-md max-h-60 object-cover"
                        />
                      </div>
                    )}
                    {message.text && <p className="text-sm">{message.text}</p>}
                    <div className="flex justify-end items-center mt-1">
                      <span className="text-xs text-text-secondary mr-1">{timestamp}</span>
                      {isSent && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className={`h-3 w-3 ${
                            isRead ? "text-success" : "text-text-secondary"
                          }`}
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-neutral-light p-3 border-t border-neutral">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="text-text-secondary">
            <Smile className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-text-secondary" onClick={handleAttachFile}>
            <Paperclip className="h-5 w-5" />
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
            />
          </Button>
          <Input
            className="flex-1 mx-2 bg-white"
            placeholder="Type a message"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyPress}
          />
          <Button
            size="icon"
            className="bg-primary text-white rounded-full ml-2"
            onClick={handleSendMessage}
            disabled={!messageText.trim()}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatArea;
