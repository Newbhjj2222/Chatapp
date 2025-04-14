import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "./AuthContext";
import {
  get,
  getDatabase,
  ref,
  set,
  push,
  onChildAdded,
  onChildChanged,
  onValue,
  query,
  orderByChild,
  serverTimestamp,
  update,
} from "firebase/database";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  CONVERSATIONS_REF,
  MESSAGES_REF,
  USERS_REF,
  STATUSES_REF,
  STATUS_EXPIRY_HOURS,
  MAX_GROUP_MEMBERS,
} from "@/lib/constants";
import { apiRequest } from "@/lib/queryClient";
import { Status, User, Message, Conversation } from "@shared/schema";
import { v4 as uuidv4 } from "uuid";

// WebSocket connection
let socket: WebSocket | null = null;

// Enhanced types with additional properties needed for UI
interface EnhancedConversation extends Omit<Conversation, "lastMessageAt"> {
  lastMessageAt?: Date;
  otherUser?: UserWithOnlineStatus;
  lastMessageSender?: string;
  unreadCount: number;
}

interface EnhancedMessage extends Omit<Message, "createdAt"> {
  createdAt?: Date;
  sender?: UserWithOnlineStatus;
}

interface UserWithOnlineStatus extends User {
  isOnline?: boolean;
}

interface StatusWithUser extends Status {
  user?: UserWithOnlineStatus;
}

interface ChatContextType {
  conversations: EnhancedConversation[];
  messages: EnhancedMessage[];
  users: UserWithOnlineStatus[];
  statuses: StatusWithUser[];
  statusList: StatusWithUser[];
  selectedStatus: StatusWithUser | null;
  activeConversation: EnhancedConversation | null;
  initializeChat: () => void;
  selectConversation: (conversationId: number) => void;
  sendMessage: (conversationId: number, text: string) => Promise<void>;
  sendImageMessage: (conversationId: number, file: File) => Promise<void>;
  createGroup: (name: string, memberIds: string[]) => Promise<void>;
  joinGroup: (groupCode: string) => Promise<void>;
  generateGroupLink: (chatId: number) => Promise<{link: string, code: string}>;
  regenerateGroupLink: (chatId: number) => Promise<{link: string, code: string}>;
  createStatus: (content: string, imageFile?: File) => Promise<void>;
  viewStatus: (statusId: number, viewerId: string) => Promise<void>;
  setSelectedStatusById: (statusId: number) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<EnhancedConversation[]>([]);
  const [messages, setMessages] = useState<EnhancedMessage[]>([]);
  const [users, setUsers] = useState<UserWithOnlineStatus[]>([]);
  const [statuses, setStatuses] = useState<StatusWithUser[]>([]);
  const [statusList, setStatusList] = useState<StatusWithUser[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<StatusWithUser | null>(null);
  const [activeConversation, setActiveConversation] = useState<EnhancedConversation | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize WebSocket connection
  const initializeWebSocket = useCallback(() => {
    if (!user || socket) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      console.log("WebSocket connection established");
      if (socket && socket.readyState === WebSocket.OPEN && user) {
        socket.send(JSON.stringify({ type: "authenticate", uid: user.uid }));
      }
    };
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === "new_message") {
          // Handle new message notification
          if (data.conversationId === activeConversation?.id) {
            // If the message is for the active conversation, mark it as read
            apiRequest("POST", `/api/messages/${data.messageId}/read`, { userId: user?.uid });
          } else {
            // Otherwise, update the unread count for the conversation
            setConversations(prevConversations => 
              prevConversations.map(conv => 
                conv.id === data.conversationId 
                  ? { ...conv, unreadCount: (conv.unreadCount || 0) + 1 }
                  : conv
              )
            );
          }
        } else if (data.type === "status_update") {
          // Refresh statuses when a new status is posted
          fetchStatuses();
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };
    
    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
    
    socket.onclose = () => {
      console.log("WebSocket connection closed");
      socket = null;
    };
    
    return () => {
      if (socket) {
        socket.close();
        socket = null;
      }
    };
  }, [user]);

  // Function to fetch all users
  const fetchUsers = useCallback(async () => {
    if (!user) return;
    
    try {
      const db = getDatabase();
      const usersRef = ref(db, USERS_REF);
      
      onValue(usersRef, (snapshot) => {
        const usersData: UserWithOnlineStatus[] = [];
        snapshot.forEach((childSnapshot) => {
          const userData = childSnapshot.val();
          usersData.push({
            ...userData,
            id: parseInt(userData.id || 0),
            uid: userData.uid,
            isOnline: false,
          });
        });
        
        setUsers(usersData);
        
        // Now fetch online status for all users
        const statusRef = ref(db, "userStatus");
        onValue(statusRef, (statusSnapshot) => {
          const statusData = statusSnapshot.val() || {};
          
          setUsers(prevUsers => 
            prevUsers.map(u => ({
              ...u,
              isOnline: statusData[u.uid]?.state === "online"
            }))
          );
        });
      });
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }, [user]);

  // Function to fetch all conversations for the current user
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    
    try {
      // Get conversations from API
      const response = await apiRequest("GET", `/api/users/${user.uid}/conversations`, undefined);
      const conversationsData = await response.json();
      
      // Enhance conversations with UI-specific properties
      const enhancedConversations: EnhancedConversation[] = await Promise.all(
        conversationsData.map(async (conv: Conversation) => {
          let otherUser: UserWithOnlineStatus | undefined;
          let lastMessageSender: string | undefined;
          
          if (!conv.isGroup) {
            // For 1-on-1 conversations, find the other user
            const membersResponse = await apiRequest("GET", `/api/conversations/${conv.id}/members`, undefined);
            const members = await membersResponse.json();
            
            const otherMember = members.find((member: any) => member.userId !== user.uid);
            if (otherMember) {
              const userResponse = await apiRequest("GET", `/api/users/${otherMember.userId}`, undefined);
              otherUser = await userResponse.json();
            }
          }
          
          // Get the last message sender's name if it's a group
          if (conv.isGroup && conv.lastMessage) {
            const db = getDatabase();
            const messagesRef = query(
              ref(db, `${MESSAGES_REF}/${conv.id}`),
              orderByChild("createdAt")
            );
            
            const snapshot = await get(messagesRef);
            let lastMsg: any = null;
            
            snapshot.forEach((childSnapshot) => {
              lastMsg = childSnapshot.val();
            });
            
            if (lastMsg && lastMsg.senderId) {
              if (lastMsg.senderId === user.uid) {
                lastMessageSender = "You";
              } else {
                const senderSnapshot = await get(ref(db, `${USERS_REF}/${lastMsg.senderId}`));
                const sender = senderSnapshot.val();
                lastMessageSender = sender?.username || "Unknown";
              }
            }
          }
          
          return {
            ...conv,
            lastMessageAt: conv.lastMessageAt ? new Date(conv.lastMessageAt) : undefined,
            otherUser,
            lastMessageSender,
            unreadCount: 0, // Will be updated from WebSocket
          };
        })
      );
      
      // Sort conversations by last message time (newest first)
      enhancedConversations.sort((a, b) => {
        if (!a.lastMessageAt) return 1;
        if (!b.lastMessageAt) return -1;
        return b.lastMessageAt.getTime() - a.lastMessageAt.getTime();
      });
      
      setConversations(enhancedConversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  }, [user]);

  // Function to fetch all statuses
  const fetchStatuses = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await apiRequest("GET", "/api/statuses", undefined);
      const statusesData = await response.json();
      
      // Enhance statuses with user data
      const enhancedStatuses: StatusWithUser[] = await Promise.all(
        statusesData.map(async (status: Status) => {
          try {
            const userResponse = await apiRequest("GET", `/api/users/${status.userId}`, undefined);
            const userData = await userResponse.json();
            
            return {
              ...status,
              user: userData,
              viewedBy: status.viewedBy || [],
            };
          } catch (error) {
            console.error(`Error fetching user for status ${status.id}:`, error);
            return status;
          }
        })
      );
      
      // Group statuses by user (get latest status for each user)
      const statusesByUser = enhancedStatuses.reduce((acc, status) => {
        const userId = status.userId;
        if (!acc[userId] || new Date(status.createdAt || 0) > new Date(acc[userId].createdAt || 0)) {
          acc[userId] = status;
        }
        return acc;
      }, {} as Record<string, StatusWithUser>);
      
      const userStatuses = Object.values(statusesByUser).filter(
        (status) => !status.expiresAt || new Date(status.expiresAt) > new Date()
      );
      
      // Put current user's status first, then sort by viewed (unviewed first)
      userStatuses.sort((a, b) => {
        if (a.userId === user.uid) return -1;
        if (b.userId === user.uid) return 1;
        
        const aViewed = a.viewedBy?.includes(user.uid) || false;
        const bViewed = b.viewedBy?.includes(user.uid) || false;
        
        if (aViewed === bViewed) return 0;
        return aViewed ? 1 : -1;
      });
      
      setStatuses(userStatuses);
      
      // Set the full list of statuses for status viewer
      const allStatuses = enhancedStatuses.filter(
        (status) => !status.expiresAt || new Date(status.expiresAt) > new Date()
      );
      setStatusList(allStatuses);
    } catch (error) {
      console.error("Error fetching statuses:", error);
    }
  }, [user]);

  // Initialize chat data
  const initializeChat = useCallback(() => {
    if (!user || isInitialized) return;
    
    fetchUsers();
    fetchConversations();
    fetchStatuses();
    initializeWebSocket();
    
    setIsInitialized(true);
  }, [user, isInitialized, fetchUsers, fetchConversations, fetchStatuses, initializeWebSocket]);

  // Clean up WebSocket connection on unmount
  useEffect(() => {
    return () => {
      if (socket) {
        socket.close();
        socket = null;
      }
    };
  }, []);

  // Select a conversation and load its messages
  const selectConversation = useCallback(
    async (conversationId: number) => {
      if (!user) return;
      
      const selectedConversation = conversations.find((c) => c.id === conversationId);
      if (!selectedConversation) return;
      
      setActiveConversation(selectedConversation);
      
      try {
        // Mark all messages in this conversation as read
        await apiRequest("POST", `/api/conversations/${conversationId}/read`, { userId: user.uid });
        
        // Update unread count for the selected conversation
        setConversations(prevConversations =>
          prevConversations.map(conv =>
            conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
          )
        );
        
        // Fetch messages for the selected conversation
        const response = await apiRequest("GET", `/api/conversations/${conversationId}/messages`, undefined);
        const messagesData = await response.json();
        
        // Enhance messages with sender data
        const enhancedMessages: EnhancedMessage[] = await Promise.all(
          messagesData.map(async (message: Message) => {
            try {
              const userResponse = await apiRequest("GET", `/api/users/${message.senderId}`, undefined);
              const userData = await userResponse.json();
              
              return {
                ...message,
                createdAt: message.createdAt ? new Date(message.createdAt) : undefined,
                sender: userData,
                readBy: message.readBy || [],
              };
            } catch (error) {
              console.error(`Error fetching user for message ${message.id}:`, error);
              return {
                ...message,
                createdAt: message.createdAt ? new Date(message.createdAt) : undefined,
                readBy: message.readBy || [],
              };
            }
          })
        );
        
        // Sort messages by creation time
        enhancedMessages.sort((a, b) => {
          if (!a.createdAt) return -1;
          if (!b.createdAt) return 1;
          return a.createdAt.getTime() - b.createdAt.getTime();
        });
        
        setMessages(enhancedMessages);
        
        // Listen for new messages in this conversation
        const db = getDatabase();
        const messagesRef = ref(db, `${MESSAGES_REF}/${conversationId}`);
        
        const newMessageHandler = onChildAdded(messagesRef, async (snapshot) => {
          const newMessage = snapshot.val();
          
          // Skip if the message is already in our list
          if (messages.some((m) => m.id === newMessage.id)) {
            return;
          }
          
          try {
            const userResponse = await apiRequest("GET", `/api/users/${newMessage.senderId}`, undefined);
            const userData = await userResponse.json();
            
            const enhancedMessage: EnhancedMessage = {
              ...newMessage,
              createdAt: newMessage.createdAt ? new Date(newMessage.createdAt) : undefined,
              sender: userData,
              readBy: newMessage.readBy || [],
            };
            
            setMessages((prevMessages) => [...prevMessages, enhancedMessage]);
            
            // If the message is from another user, mark it as read
            if (newMessage.senderId !== user.uid) {
              await apiRequest("POST", `/api/messages/${newMessage.id}/read`, { userId: user.uid });
            }
          } catch (error) {
            console.error("Error processing new message:", error);
          }
        });
        
        return () => {
          newMessageHandler();
        };
      } catch (error) {
        console.error("Error selecting conversation:", error);
      }
    },
    [conversations, messages, user]
  );

  // Send a text message
  const sendMessage = useCallback(
    async (conversationId: number, text: string) => {
      if (!user || !conversationId) return;
      
      try {
        const newMessage = {
          conversationId,
          senderId: user.uid,
          text,
          createdAt: new Date().toISOString(),
        };
        
        // Save message to server
        await apiRequest("POST", `/api/conversations/${conversationId}/messages`, newMessage);
        
        // Update last message in conversation
        const conversationUpdate = {
          lastMessage: text,
          lastMessageAt: new Date().toISOString(),
        };
        
        await apiRequest("PATCH", `/api/conversations/${conversationId}`, conversationUpdate);
        
        // Update conversations list to show the latest message
        setConversations((prevConversations) =>
          prevConversations.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  lastMessage: text,
                  lastMessageAt: new Date(),
                  lastMessageSender: "You",
                }
              : conv
          )
        );
      } catch (error) {
        console.error("Error sending message:", error);
        throw error;
      }
    },
    [user]
  );

  // Send an image message
  const sendImageMessage = useCallback(
    async (conversationId: number, file: File) => {
      if (!user || !conversationId) return;
      
      try {
        // Upload the image to Firebase Storage
        const storage = getStorage();
        const imageId = uuidv4();
        const imageRef = storageRef(storage, `chat_images/${conversationId}/${imageId}`);
        
        await uploadBytes(imageRef, file);
        const imageUrl = await getDownloadURL(imageRef);
        
        // Create a message with the image URL
        const newMessage = {
          conversationId,
          senderId: user.uid,
          text: "📷 Image",
          imageUrl,
          createdAt: new Date().toISOString(),
        };
        
        // Save message to server
        await apiRequest("POST", `/api/conversations/${conversationId}/messages`, newMessage);
        
        // Update last message in conversation
        const conversationUpdate = {
          lastMessage: "📷 Image",
          lastMessageAt: new Date().toISOString(),
        };
        
        await apiRequest("PATCH", `/api/conversations/${conversationId}`, conversationUpdate);
        
        // Update conversations list to show the latest message
        setConversations((prevConversations) =>
          prevConversations.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  lastMessage: "📷 Image",
                  lastMessageAt: new Date(),
                  lastMessageSender: "You",
                }
              : conv
          )
        );
      } catch (error) {
        console.error("Error sending image message:", error);
        throw error;
      }
    },
    [user]
  );

  // Create a new group conversation
  const createGroup = useCallback(
    async (name: string, memberIds: string[]) => {
      if (!user) return;
      
      try {
        // Create a new group conversation
        const newGroup = {
          name,
          isGroup: true,
          createdBy: user.uid,
          memberIds: [user.uid, ...memberIds],
        };
        
        const response = await apiRequest("POST", "/api/conversations", newGroup);
        const createdGroup = await response.json();
        
        // Fetch the new conversation to add it to the list
        await fetchConversations();
        
        return createdGroup;
      } catch (error) {
        console.error("Error creating group:", error);
        throw error;
      }
    },
    [user, fetchConversations]
  );

  // Create a new status
  const createStatus = useCallback(
    async (content: string, imageFile?: File) => {
      if (!user) return;
      
      try {
        let imageUrl = undefined;
        
        // If there's an image file, upload it to Firebase Storage
        if (imageFile) {
          const storage = getStorage();
          const statusId = uuidv4();
          const statusRef = storageRef(storage, `status_images/${user.uid}/${statusId}`);
          
          await uploadBytes(statusRef, imageFile);
          imageUrl = await getDownloadURL(statusRef);
        }
        
        // Calculate expiry time (24 hours from now)
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + STATUS_EXPIRY_HOURS);
        
        // Create a new status
        const newStatus = {
          userId: user.uid,
          type: imageUrl ? "image" : "text",
          content: imageUrl ? undefined : content,
          imageUrl,
          createdAt: new Date().toISOString(),
          expiresAt: expiresAt.toISOString(),
          viewCount: 0,
          viewedBy: [],
        };
        
        await apiRequest("POST", "/api/statuses", newStatus);
        
        // Refresh statuses
        await fetchStatuses();
      } catch (error) {
        console.error("Error creating status:", error);
        throw error;
      }
    },
    [user, fetchStatuses]
  );

  // View a status
  const viewStatus = useCallback(
    async (statusId: number, viewerId: string) => {
      if (!viewerId) return;
      
      try {
        await apiRequest("POST", `/api/statuses/${statusId}/view`, { viewerId });
        
        // Update status in state
        setStatusList((prevStatusList) =>
          prevStatusList.map((status) =>
            status.id === statusId
              ? {
                  ...status,
                  viewCount: (status.viewCount || 0) + 1,
                  viewedBy: [...(status.viewedBy || []), viewerId],
                }
              : status
          )
        );
        
        // Update in statuses array too
        setStatuses((prevStatuses) =>
          prevStatuses.map((status) =>
            status.id === statusId
              ? {
                  ...status,
                  viewCount: (status.viewCount || 0) + 1,
                  viewedBy: [...(status.viewedBy || []), viewerId],
                }
              : status
          )
        );
      } catch (error) {
        console.error("Error viewing status:", error);
      }
    },
    []
  );

  // Set selected status by ID
  const setSelectedStatusById = useCallback(
    (statusId: number) => {
      const status = statusList.find((s) => s.id === statusId);
      if (status) {
        setSelectedStatus(status);
      }
    },
    [statusList]
  );

  const value = useMemo(
    () => ({
      conversations,
      messages,
      users,
      statuses,
      statusList,
      selectedStatus,
      activeConversation,
      initializeChat,
      selectConversation,
      sendMessage,
      sendImageMessage,
      createGroup,
      createStatus,
      viewStatus,
      setSelectedStatusById,
    }),
    [
      conversations,
      messages,
      users,
      statuses,
      statusList,
      selectedStatus,
      activeConversation,
      initializeChat,
      selectConversation,
      sendMessage,
      sendImageMessage,
      createGroup,
      createStatus,
      viewStatus,
      setSelectedStatusById,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
