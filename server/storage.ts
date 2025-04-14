import { 
  users, messages, chats, chatMembers, statuses,
  User, InsertUser, Chat, InsertChat, 
  ChatMember, InsertChatMember, Message, 
  InsertMessage, Status, InsertStatus 
} from "@shared/schema";

// Storage interface
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByFirebaseUid(uid: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  
  // Chat methods
  getChat(id: number): Promise<Chat | undefined>;
  getUserChats(userId: number): Promise<Chat[]>;
  createChat(chat: InsertChat): Promise<Chat>;
  updateChatLastMessage(chatId: number, message: string, timestamp: Date): Promise<void>;
  
  // Chat member methods
  getChatMembers(chatId: number): Promise<ChatMember[]>;
  addChatMember(member: InsertChatMember): Promise<ChatMember>;
  removeChatMember(chatId: number, userId: number): Promise<void>;
  
  // Message methods
  getMessage(id: number): Promise<Message | undefined>;
  getChatMessages(chatId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Status methods
  getStatus(id: number): Promise<Status | undefined>;
  getStatuses(): Promise<Status[]>;
  getUserStatuses(userId: number): Promise<Status[]>;
  createStatus(status: InsertStatus): Promise<Status>;
  viewStatus(statusId: number, userId: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private chats: Map<number, Chat>;
  private chatMembers: Map<number, ChatMember>;
  private messages: Map<number, Message>;
  private statuses: Map<number, Status>;
  
  private userIdCounter: number;
  private chatIdCounter: number;
  private chatMemberIdCounter: number;
  private messageIdCounter: number;
  private statusIdCounter: number;

  constructor() {
    this.users = new Map();
    this.chats = new Map();
    this.chatMembers = new Map();
    this.messages = new Map();
    this.statuses = new Map();
    
    this.userIdCounter = 1;
    this.chatIdCounter = 1;
    this.chatMemberIdCounter = 1;
    this.messageIdCounter = 1;
    this.statusIdCounter = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }
  
  async getUserByFirebaseUid(uid: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.firebaseUid === uid,
    );
  }
  
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const createdAt = new Date();
    const user: User = { ...insertUser, id, createdAt };
    this.users.set(id, user);
    return user;
  }
  
  // Chat methods
  async getChat(id: number): Promise<Chat | undefined> {
    const chat = this.chats.get(id);
    
    if (chat) {
      // Include members
      const members = await this.getChatMembers(id);
      return { ...chat, members };
    }
    
    return undefined;
  }
  
  async getUserChats(userId: number): Promise<Chat[]> {
    // Find all chat memberships for this user
    const memberships = Array.from(this.chatMembers.values()).filter(
      (member) => member.userId === userId
    );
    
    // Get all chats the user is a member of
    const userChats: Chat[] = [];
    
    for (const membership of memberships) {
      const chat = this.chats.get(membership.chatId);
      
      if (chat) {
        // Include members
        const members = await this.getChatMembers(membership.chatId);
        const membersWithUsers = await Promise.all(
          members.map(async (member) => {
            const user = await this.getUser(member.userId);
            return { ...member, user };
          })
        );
        
        userChats.push({ ...chat, members: membersWithUsers });
      }
    }
    
    return userChats;
  }
  
  async createChat(insertChat: InsertChat): Promise<Chat> {
    const id = this.chatIdCounter++;
    const createdAt = new Date();
    const chat: Chat = { ...insertChat, id, createdAt };
    this.chats.set(id, chat);
    return chat;
  }
  
  async updateChatLastMessage(chatId: number, message: string, timestamp: Date): Promise<void> {
    const chat = this.chats.get(chatId);
    
    if (chat) {
      chat.lastMessage = message;
      chat.lastMessageTime = timestamp;
      this.chats.set(chatId, chat);
    }
  }
  
  // Chat member methods
  async getChatMembers(chatId: number): Promise<ChatMember[]> {
    const members = Array.from(this.chatMembers.values()).filter(
      (member) => member.chatId === chatId
    );
    
    // Include user data for each member
    const membersWithUsers = await Promise.all(
      members.map(async (member) => {
        const user = await this.getUser(member.userId);
        return { ...member, user };
      })
    );
    
    return membersWithUsers;
  }
  
  async addChatMember(insertMember: InsertChatMember): Promise<ChatMember> {
    const id = this.chatMemberIdCounter++;
    const joinedAt = new Date();
    const member: ChatMember = { ...insertMember, id, joinedAt };
    this.chatMembers.set(id, member);
    return member;
  }
  
  async removeChatMember(chatId: number, userId: number): Promise<void> {
    const memberToRemove = Array.from(this.chatMembers.values()).find(
      (member) => member.chatId === chatId && member.userId === userId
    );
    
    if (memberToRemove) {
      this.chatMembers.delete(memberToRemove.id);
    }
  }
  
  // Message methods
  async getMessage(id: number): Promise<Message | undefined> {
    const message = this.messages.get(id);
    
    if (message) {
      // Include sender data
      const sender = await this.getUser(message.senderId);
      return { ...message, sender };
    }
    
    return undefined;
  }
  
  async getChatMessages(chatId: number): Promise<Message[]> {
    const chatMessages = Array.from(this.messages.values())
      .filter((message) => message.chatId === chatId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    // Include sender data for each message
    const messagesWithSenders = await Promise.all(
      chatMessages.map(async (message) => {
        const sender = await this.getUser(message.senderId);
        return { ...message, sender };
      })
    );
    
    return messagesWithSenders;
  }
  
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.messageIdCounter++;
    const timestamp = new Date();
    const message: Message = { 
      ...insertMessage, 
      id, 
      timestamp, 
      readBy: []
    };
    this.messages.set(id, message);
    return message;
  }
  
  // Status methods
  async getStatus(id: number): Promise<Status | undefined> {
    const status = this.statuses.get(id);
    
    if (status) {
      // Include user data
      const user = await this.getUser(status.userId);
      return { ...status, user };
    }
    
    return undefined;
  }
  
  async getStatuses(): Promise<Status[]> {
    // Filter out expired statuses
    const now = new Date();
    const activeStatuses = Array.from(this.statuses.values())
      .filter((status) => new Date(status.expiresAt) > now)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Include user data for each status
    const statusesWithUsers = await Promise.all(
      activeStatuses.map(async (status) => {
        const user = await this.getUser(status.userId);
        return { 
          ...status, 
          user,
          viewCount: Array.isArray(status.viewedBy) ? status.viewedBy.length : 0
        };
      })
    );
    
    return statusesWithUsers;
  }
  
  async getUserStatuses(userId: number): Promise<Status[]> {
    const now = new Date();
    const userStatuses = Array.from(this.statuses.values())
      .filter((status) => status.userId === userId && new Date(status.expiresAt) > now)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return userStatuses;
  }
  
  async createStatus(insertStatus: InsertStatus): Promise<Status> {
    const id = this.statusIdCounter++;
    const timestamp = new Date();
    
    // Ensure expiresAt is a Date object
    const expiresAt = insertStatus.expiresAt instanceof Date 
      ? insertStatus.expiresAt 
      : new Date(insertStatus.expiresAt);
    
    const status: Status = { 
      ...insertStatus, 
      id, 
      timestamp, 
      expiresAt, 
      viewedBy: []
    };
    
    this.statuses.set(id, status);
    return status;
  }
  
  async viewStatus(statusId: number, userId: number): Promise<void> {
    const status = this.statuses.get(statusId);
    
    if (status) {
      // Add user to viewedBy if not already there
      if (!status.viewedBy.includes(userId)) {
        status.viewedBy = [...status.viewedBy, userId];
        this.statuses.set(statusId, status);
      }
    }
  }
}

export const storage = new MemStorage();
