import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { Chat } from "../../types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

interface ChatSidebarProps {
  chats: Chat[];
  onChatSelect: (chat: Chat) => void;
  selectedChatId?: number;
  visible?: boolean;
}

export default function ChatSidebar({
  chats,
  onChatSelect,
  selectedChatId,
  visible = true,
}: ChatSidebarProps) {
  const { user, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: currentUser } = useQuery({
    queryKey: ["/api/users/me"],
    enabled: !!user
  });

  const filteredChats = searchQuery
    ? chats.filter((chat) => {
        const chatName = chat.type === "direct" 
          ? chat.members?.find(member => member.id !== currentUser?.id)?.displayName || ""
          : chat.name || "";
        return chatName.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : chats;

  if (!visible) {
    return null;
  }

  return (
    <aside className="flex flex-col border-r bg-white h-full">
      {/* Header */}
      <div className="bg-primary text-white p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">NetChat</h1>
        <div className="flex items-center space-x-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-primary/90"
            aria-label="New chat"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-primary/90"
            aria-label="More options"
            onClick={() => signOut()}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
              />
            </svg>
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="p-3 bg-background">
        <div className="relative">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search or start new chat"
            className="pl-10 pr-4 py-2 bg-white rounded-lg"
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 absolute left-3 top-2.5 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            No chats found
          </div>
        ) : (
          filteredChats.map((chat) => {
            const isGroupChat = chat.type === "group";
            const otherUser = isGroupChat
              ? null
              : chat.members?.find((member) => member.id !== currentUser?.id);
            
            const displayName = isGroupChat 
              ? chat.name 
              : otherUser?.displayName || "Unknown User";
            
            const avatarUrl = isGroupChat 
              ? chat.photoURL 
              : otherUser?.photoURL || "https://ui-avatars.com/api/?name=" + encodeURIComponent(displayName);
            
            const lastMessageTime = chat.lastMessageTime 
              ? new Date(chat.lastMessageTime) 
              : new Date();
            
            const timeDisplay = isToday(lastMessageTime) 
              ? format(lastMessageTime, "p") 
              : format(lastMessageTime, "MMM d");

            return (
              <div
                key={chat.id}
                className={`flex items-center p-3 border-b hover:bg-gray-50 cursor-pointer transition-colors ${
                  selectedChatId === chat.id ? "bg-gray-100" : ""
                }`}
                onClick={() => onChatSelect(chat)}
              >
                <div className="relative">
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  {(otherUser?.isOnline || chat.isOnline) && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
                  )}
                </div>
                <div className="ml-3 flex-1">
                  <div className="flex justify-between items-center">
                    <h2 className="font-medium text-gray-900">
                      {displayName}
                    </h2>
                    <span className="text-xs text-gray-500">
                      {timeDisplay}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-500 truncate pr-10">
                      {chat.lastMessage || "Start a conversation"}
                    </p>
                    {chat.unreadCount ? (
                      <span className="bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {chat.unreadCount}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}
