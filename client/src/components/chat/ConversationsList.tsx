import { useEffect, useState } from "react";
import { 
  Search, 
  MoreVertical, 
  Circle, 
  Plus, 
  UserCog, 
  UsersRound, 
  UserPlus, 
  Share2, 
  LogOut, 
  MessageSquare, 
  Settings as SettingsIcon
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useChat } from "@/contexts/ChatContext";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup
} from "@/components/ui/dropdown-menu";
import { APP_NAME, DEFAULT_PROFILE_IMAGE } from "@/lib/constants";
import { Chat } from "@/types";
import { format } from 'date-fns';

interface ConversationsListProps {
  onStatusClick: () => void;
  onCreateGroupClick: () => void;
}

const ConversationsList = ({ onStatusClick, onCreateGroupClick }: ConversationsListProps) => {
  const { user, logout } = useAuth();
  const { conversations, statuses, selectConversation, activeConversation } = useChat();
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredConversations, setFilteredConversations] = useState<Chat[]>([]);
  const [, navigate] = useLocation();

  useEffect(() => {
    if (conversations) {
      setFilteredConversations(
        conversations.filter((conversation) =>
          conversation.name?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
  }, [searchTerm, conversations]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const formatTime = (timestamp: Date | undefined) => {
    if (!timestamp) return "";
    
    const date = new Date(timestamp);
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
      return format(date, 'h:mm a');
    } else if (date.getFullYear() === now.getFullYear()) {
      return format(date, 'MMM d');
    } else {
      return format(date, 'MM/dd/yy');
    }
  };

  return (
    <div className="w-full md:w-1/3 lg:w-1/4 border-r border-neutral flex flex-col bg-white h-full">
      {/* Header */}
      <div className="p-3 bg-neutral-light flex justify-between items-center border-b border-neutral">
        <div className="flex items-center">
          <img
            src={user?.profileImage || DEFAULT_PROFILE_IMAGE}
            alt="User Profile"
            className="w-10 h-10 rounded-full mr-2"
          />
          <h1 className="text-xl font-semibold">{APP_NAME}</h1>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={onStatusClick} title="Status">
            <Circle className="h-5 w-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Menu</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <UserCog className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={onCreateGroupClick}>
                  <UsersRound className="mr-2 h-4 w-4" />
                  <span>Create New Group</span>
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={() => {}}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  <span>Join Group</span>
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={() => {}}>
                  <Share2 className="mr-2 h-4 w-4" />
                  <span>Share Group Link</span>
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={() => {}}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  <span>New Status Update</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={async () => {
                  try {
                    await logout();
                    navigate("/login");
                  } catch (error) {
                    console.error("Failed to logout:", error);
                  }
                }}
                className="text-red-600 focus:text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Search */}
      <div className="p-3 bg-white">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary h-4 w-4" />
          <Input
            className="pl-9 bg-neutral-light"
            placeholder="Search or start new chat"
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
      </div>

      {/* Status Thumbnails */}
      <div className="px-3 py-2 border-b border-neutral">
        <div className="flex space-x-3 overflow-x-auto no-scrollbar py-1">
          <div className="flex flex-col items-center flex-shrink-0">
            <div className="status-circle relative">
              <img
                src={user?.profileImage || DEFAULT_PROFILE_IMAGE}
                alt="Your Status"
                className="w-full h-full object-cover"
              />
              <div className="status-badge">
                <Plus className="h-3 w-3" />
              </div>
            </div>
            <span className="text-xs mt-1">Your status</span>
          </div>

          {statuses.map((status) => (
            <div key={status.id} className="flex flex-col items-center flex-shrink-0">
              <div className={`status-circle ${status.viewedBy.includes(user?.uid || '') ? 'status-circle-seen' : 'status-circle-unseen'}`}>
                <img
                  src={status.user?.profileImage || DEFAULT_PROFILE_IMAGE}
                  alt={`${status.user?.username}'s Status`}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-xs mt-1">{status.user?.username}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {filteredConversations.map((conversation) => (
          <div
            key={conversation.id}
            className={`hover:bg-neutral-light cursor-pointer border-b border-neutral ${
              activeConversation?.id === conversation.id ? "bg-neutral-light" : ""
            }`}
            onClick={() => selectConversation(conversation.id)}
          >
            <div className="flex items-center p-3">
              {conversation.isGroup ? (
                <div className="w-12 h-12 rounded-full mr-3 bg-primary text-white flex items-center justify-center">
                  <span className="font-medium">
                    {conversation.name
                      ?.split(" ")
                      .map((word) => word[0])
                      .join("")
                      .substring(0, 2)}
                  </span>
                </div>
              ) : (
                <img
                  src={conversation.otherUser?.profileImage || DEFAULT_PROFILE_IMAGE}
                  alt="Contact"
                  className="w-12 h-12 rounded-full mr-3"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between">
                  <h3 className="font-medium truncate">
                    {conversation.isGroup
                      ? conversation.name
                      : conversation.otherUser?.username}
                  </h3>
                  <span className="text-xs text-text-secondary">
                    {formatTime(conversation.lastMessageAt ? new Date(conversation.lastMessageAt) : undefined)}
                  </span>
                </div>
                <div className="flex items-center">
                  {conversation.isGroup && conversation.lastMessageSender && (
                    <span className="text-xs text-text-secondary mr-1">
                      {conversation.lastMessageSender}:
                    </span>
                  )}
                  <p className="text-sm text-text-secondary truncate flex-1">
                    {conversation.lastMessage || "No messages yet"}
                  </p>
                  {conversation.unreadCount > 0 && (
                    <div className="ml-2 flex items-center">
                      <span className="bg-secondary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {conversation.unreadCount}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConversationsList;
