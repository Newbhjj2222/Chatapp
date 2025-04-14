import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useChat } from "@/contexts/ChatContext";
import ConversationsList from "@/components/chat/ConversationsList";
import ChatArea from "@/components/chat/ChatArea";
import StatusViewer from "@/components/chat/StatusViewer";
import GroupCreationModal from "@/components/chat/GroupCreationModal";
import { useIsMobile as useMobile } from "@/hooks/use-mobile";

const Chat = () => {
  const { user } = useAuth();
  const { initializeChat, activeConversation, setSelectedStatusById } = useChat();
  const [, setLocation] = useLocation();
  const isMobile = useMobile();
  const [showConversations, setShowConversations] = useState(true);
  const [showStatus, setShowStatus] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  useEffect(() => {
    if (!user) {
      setLocation("/");
      return;
    }

    initializeChat();
  }, [user, setLocation, initializeChat]);

  useEffect(() => {
    // On mobile, if active conversation is selected, show chat area
    if (isMobile && activeConversation) {
      setShowConversations(false);
    }
  }, [activeConversation, isMobile]);

  const handleStatusClick = () => {
    setShowStatus(true);
  };

  const handleStatusClose = () => {
    setShowStatus(false);
  };

  const handleCreateGroupClick = () => {
    setShowCreateGroup(true);
  };

  const handleCreateGroupClose = () => {
    setShowCreateGroup(false);
  };

  const handleBackClick = () => {
    setShowConversations(true);
  };

  return (
    <div className="h-screen w-full flex flex-col md:flex-row overflow-hidden">
      {(showConversations || !isMobile) && (
        <ConversationsList
          onStatusClick={handleStatusClick}
          onCreateGroupClick={handleCreateGroupClick}
        />
      )}

      {(!showConversations || !isMobile) && (
        <ChatArea isMobile={isMobile} onBackClick={handleBackClick} />
      )}

      {showStatus && <StatusViewer onClose={handleStatusClose} />}

      <GroupCreationModal
        isOpen={showCreateGroup}
        onClose={handleCreateGroupClose}
      />
    </div>
  );
};

export default Chat;
