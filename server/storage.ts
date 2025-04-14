import { 
  User, 
  InsertUser, 
  Conversation, 
  InsertConversation, 
  ConversationMember, 
  InsertConversationMember, 
  Message, 
  InsertMessage, 
  Status, 
  InsertStatus, 
  StatusView, 
  InsertStatusView 
} from "@shared/schema";

// Storage interface
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUid(uid: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  // Conversation operations
  getConversation(id: number): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation, memberIds: string[]): Promise<Conversation>;
  updateConversation(id: number, updates: Partial<Conversation>): Promise<Conversation>;
  getUserConversations(userId: string): Promise<Conversation[]>;
  getConversationMembers(conversationId: number): Promise<ConversationMember[]>;
  addMemberToConversation(member: InsertConversationMember): Promise<ConversationMember>;
  removeMemberFromConversation(conversationId: number, userId: string): Promise<void>;
  markConversationAsRead(conversationId: number, userId: string): Promise<void>;
  
  // Message operations
  getMessage(id: number): Promise<Message | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  getConversationMessages(conversationId: number): Promise<Message[]>;
  markMessageAsRead(messageId: number, userId: string): Promise<void>;
  
  // Status operations
  getStatus(id: number): Promise<Status | undefined>;
  createStatus(status: InsertStatus): Promise<Status>;
  getUserStatuses(userId: string): Promise<Status[]>;
  getAllStatuses(): Promise<Status[]>;
  viewStatus(statusId: number, viewerId: string): Promise<void>;
}

// Memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private usersByUid: Map<string, User>;
  private conversations: Map<number, Conversation>;
  private conversationMembers: Map<number, ConversationMember[]>;
  private messages: Map<number, Message>;
  private messagesByConversation: Map<number, Message[]>;
  private statuses: Map<number, Status>;
  private statusesByUser: Map<string, Status[]>;
  private statusViews: Map<number, StatusView[]>;
  
  private userId: number = 1;
  private conversationId: number = 1;
  private conversationMemberId: number = 1;
  private messageId: number = 1;
  private statusId: number = 1;
  private statusViewId: number = 1;
  
  constructor() {
    this.users = new Map();
    this.usersByUid = new Map();
    this.conversations = new Map();
    this.conversationMembers = new Map();
    this.messages = new Map();
    this.messagesByConversation = new Map();
    this.statuses = new Map();
    this.statusesByUser = new Map();
    this.statusViews = new Map();
  }
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUid(uid: string): Promise<User | undefined> {
    return this.usersByUid.get(uid);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }
  
  async createUser(userData: InsertUser): Promise<User> {
    // Check if user already exists
    const existingUser = await this.getUserByUid(userData.uid);
    if (existingUser) {
      return existingUser;
    }
    
    const id = this.userId++;
    const user: User = { ...userData, id };
    
    this.users.set(id, user);
    this.usersByUid.set(userData.uid, user);
    
    return user;
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  // Conversation operations
  async getConversation(id: number): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }
  
  async createConversation(conversationData: InsertConversation, memberIds: string[]): Promise<Conversation> {
    const id = this.conversationId++;
    const conversation: Conversation = { 
      ...conversationData, 
      id,
      memberCount: memberIds.length
    };
    
    this.conversations.set(id, conversation);
    this.conversationMembers.set(id, []);
    
    // Add all members to the conversation
    for (const userId of memberIds) {
      await this.addMemberToConversation({
        conversationId: id,
        userId,
        isAdmin: userId === conversationData.createdBy
      });
    }
    
    return conversation;
  }
  
  async updateConversation(id: number, updates: Partial<Conversation>): Promise<Conversation> {
    const conversation = await this.getConversation(id);
    if (!conversation) {
      throw new Error(`Conversation with ID ${id} not found`);
    }
    
    const updatedConversation = { ...conversation, ...updates };
    this.conversations.set(id, updatedConversation);
    
    return updatedConversation;
  }
  
  async getUserConversations(userId: string): Promise<Conversation[]> {
    const result: Conversation[] = [];
    
    // Check all conversation members to find the user's conversations
    for (const [conversationId, members] of this.conversationMembers.entries()) {
      if (members.some(member => member.userId === userId)) {
        const conversation = await this.getConversation(conversationId);
        if (conversation) {
          result.push(conversation);
        }
      }
    }
    
    return result;
  }
  
  async getConversationMembers(conversationId: number): Promise<ConversationMember[]> {
    return this.conversationMembers.get(conversationId) || [];
  }
  
  async addMemberToConversation(memberData: InsertConversationMember): Promise<ConversationMember> {
    const id = this.conversationMemberId++;
    const member: ConversationMember = { ...memberData, id, joinedAt: new Date() };
    
    const members = this.conversationMembers.get(memberData.conversationId) || [];
    members.push(member);
    this.conversationMembers.set(memberData.conversationId, members);
    
    // Update the member count in the conversation
    const conversation = await this.getConversation(memberData.conversationId);
    if (conversation) {
      await this.updateConversation(memberData.conversationId, {
        memberCount: members.length
      });
    }
    
    return member;
  }
  
  async removeMemberFromConversation(conversationId: number, userId: string): Promise<void> {
    const members = this.conversationMembers.get(conversationId) || [];
    const updatedMembers = members.filter(member => member.userId !== userId);
    this.conversationMembers.set(conversationId, updatedMembers);
    
    // Update the member count in the conversation
    const conversation = await this.getConversation(conversationId);
    if (conversation) {
      await this.updateConversation(conversationId, {
        memberCount: updatedMembers.length
      });
    }
  }
  
  async markConversationAsRead(conversationId: number, userId: string): Promise<void> {
    const messages = await this.getConversationMessages(conversationId);
    
    for (const message of messages) {
      await this.markMessageAsRead(message.id, userId);
    }
  }
  
  // Message operations
  async getMessage(id: number): Promise<Message | undefined> {
    return this.messages.get(id);
  }
  
  async createMessage(messageData: InsertMessage): Promise<Message> {
    const id = this.messageId++;
    const message: Message = { 
      ...messageData, 
      id,
      createdAt: new Date(),
      readBy: messageData.senderId ? [messageData.senderId] : []
    };
    
    this.messages.set(id, message);
    
    // Add to conversation messages
    const conversationMessages = this.messagesByConversation.get(messageData.conversationId) || [];
    conversationMessages.push(message);
    this.messagesByConversation.set(messageData.conversationId, conversationMessages);
    
    // Update last message in conversation
    await this.updateConversation(messageData.conversationId, {
      lastMessage: message.text || "Image",
      lastMessageAt: message.createdAt
    });
    
    return message;
  }
  
  async getConversationMessages(conversationId: number): Promise<Message[]> {
    return this.messagesByConversation.get(conversationId) || [];
  }
  
  async markMessageAsRead(messageId: number, userId: string): Promise<void> {
    const message = await this.getMessage(messageId);
    if (!message) {
      throw new Error(`Message with ID ${messageId} not found`);
    }
    
    if (message.readBy?.includes(userId)) {
      return; // Already read
    }
    
    const readBy = [...(message.readBy || []), userId];
    const updatedMessage = { ...message, readBy };
    
    this.messages.set(messageId, updatedMessage);
    
    // Also update in the conversation messages
    const conversationMessages = this.messagesByConversation.get(message.conversationId) || [];
    const updatedMessages = conversationMessages.map(msg => 
      msg.id === messageId ? updatedMessage : msg
    );
    this.messagesByConversation.set(message.conversationId, updatedMessages);
  }
  
  // Status operations
  async getStatus(id: number): Promise<Status | undefined> {
    return this.statuses.get(id);
  }
  
  async createStatus(statusData: InsertStatus): Promise<Status> {
    const id = this.statusId++;
    const status: Status = { 
      ...statusData, 
      id,
      createdAt: new Date(),
      viewCount: 0,
      viewedBy: [] 
    };
    
    this.statuses.set(id, status);
    
    // Add to user statuses
    const userStatuses = this.statusesByUser.get(statusData.userId) || [];
    userStatuses.push(status);
    this.statusesByUser.set(statusData.userId, userStatuses);
    
    return status;
  }
  
  async getUserStatuses(userId: string): Promise<Status[]> {
    return this.statusesByUser.get(userId) || [];
  }
  
  async getAllStatuses(): Promise<Status[]> {
    return Array.from(this.statuses.values());
  }
  
  async viewStatus(statusId: number, viewerId: string): Promise<void> {
    const status = await this.getStatus(statusId);
    if (!status) {
      throw new Error(`Status with ID ${statusId} not found`);
    }
    
    if (status.viewedBy?.includes(viewerId)) {
      return; // Already viewed
    }
    
    // Create a status view
    const statusView: StatusView = {
      id: this.statusViewId++,
      statusId,
      viewerId,
      viewedAt: new Date()
    };
    
    const statusViews = this.statusViews.get(statusId) || [];
    statusViews.push(statusView);
    this.statusViews.set(statusId, statusViews);
    
    // Update the status
    const viewedBy = [...(status.viewedBy || []), viewerId];
    const viewCount = (status.viewCount || 0) + 1;
    const updatedStatus = { ...status, viewCount, viewedBy };
    
    this.statuses.set(statusId, updatedStatus);
    
    // Also update in the user statuses
    const userStatuses = this.statusesByUser.get(status.userId) || [];
    const updatedStatuses = userStatuses.map(s => 
      s.id === statusId ? updatedStatus : s
    );
    this.statusesByUser.set(status.userId, updatedStatuses);
  }
}

// Export a singleton instance
export const storage = new MemStorage();
