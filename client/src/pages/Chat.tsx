import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useChat } from "@/contexts/ChatContext";
import ConversationsList from "@/components/chat/ConversationsList";
import ChatArea from "@/components/chat/ChatArea";
import StatusViewer from "@/components/chat/StatusViewer";
import GroupCreationModal from "@/components/chat/GroupCreationModal";
import JoinGroupModal from "@/components/chat/JoinGroupModal";
import ShareGroupLinkModal from "@/components/chat/ShareGroupLinkModal";
import CreateStatusModal from "@/components/chat/CreateStatusModal";
import { useIsMobile as useMobile } from "@/hooks/use-mobile";
import { Chat as ChatType } from "@/types"; 

const Chat = () => {
  const { user } = useAuth();
  const { initializeChat, activeConversation, setSelectedStatusById } = useChat();
  const [, setLocation] = useLocation();
  const isMobile = useMobile();
  const [showConversations, setShowConversations] = useState(true);
  const [showStatus, setShowStatus] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [showShareLink, setShowShareLink] = useState(false);
  const [showCreateStatus, setShowCreateStatus] = useState(false);

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

  // Status handlers
  const handleStatusClick = () => {
    setShowStatus(true);
  };

  const handleStatusClose = () => {
    setShowStatus(false);
  };
  
  const handleCreateStatusClick = () => {
    setShowCreateStatus(true);
  };
  
  const handleCreateStatusClose = () => {
    setShowCreateStatus(false);
  };

  // Group handlers
  const handleCreateGroupClick = () => {
    setShowCreateGroup(true);
  };

  const handleCreateGroupClose = () => {
    setShowCreateGroup(false);
  };
  
  const handleJoinGroupClick = () => {
    setShowJoinGroup(true);
  };
  
  const handleJoinGroupClose = () => {
    setShowJoinGroup(false);
  };
  
  const handleShareGroupLinkClick = () => {
    setShowShareLink(true);
  };
  
  const handleShareGroupLinkClose = () => {
    setShowShareLink(false);
  };

  // Navigation handlers
  const handleBackClick = () => {
    setShowConversations(true);
  };

  return (
    <div className="h-screen w-full flex flex-col md:flex-row overflow-hidden">
      {(showConversations || !isMobile) && (
        <ConversationsList
          onStatusClick={handleStatusClick}
          onCreateGroupClick={handleCreateGroupClick}
          onJoinGroupClick={handleJoinGroupClick}
          onShareGroupLinkClick={handleShareGroupLinkClick}
          onCreateStatusClick={handleCreateStatusClick}
        />
      )}

      {(!showConversations || !isMobile) && (
        <ChatArea isMobile={isMobile} onBackClick={handleBackClick} />
      )}

      {/* Status Modals */}
      {showStatus && <StatusViewer onClose={handleStatusClose} />}
      
      <CreateStatusModal 
        isOpen={showCreateStatus}
        onClose={handleCreateStatusClose}
      />

      {/* Group Modals */}
      <GroupCreationModal
        isOpen={showCreateGroup}
        onClose={handleCreateGroupClose}
      />
      
      <JoinGroupModal
        isOpen={showJoinGroup}
        onClose={handleJoinGroupClose}
      />
      
      <ShareGroupLinkModal
        isOpen={showShareLink}
        onClose={handleShareGroupLinkClose}
        chat={activeConversation as ChatType}
      />
    </div>
  );
};

export default Chat;
