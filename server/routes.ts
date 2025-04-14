import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { WebSocketServer, WebSocket } from "ws";
import { 
  insertUserSchema, 
  insertChatSchema, 
  insertMessageSchema, 
  insertStatusSchema 
} from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import admin from "firebase-admin";

// Initialize Firebase Admin with application default credentials
// This works for Replit without requiring a service account
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  });
}

// Setup multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// WebSocket connections store
const clients = new Map<string, WebSocket>();

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Setup WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws) => {
    let userId: string | null = null;
    
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        
        // Handle authentication
        if (data.type === 'auth' && data.userId) {
          userId = data.userId;
          clients.set(userId, ws);
          console.log(`WebSocket client authenticated: ${userId}`);
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    });
    
    ws.on('close', () => {
      if (userId) {
        clients.delete(userId);
        console.log(`WebSocket client disconnected: ${userId}`);
      }
    });
  });
  
  // Firebase Auth session sync
  app.post('/api/auth/session', async (req: Request, res: Response) => {
    try {
      const { uid, email, displayName, photoURL } = req.body;
      
      // Find or create user in our DB
      let user = await storage.getUserByFirebaseUid(uid);
      
      if (!user) {
        // Create new user
        user = await storage.createUser({
          username: email,
          email,
          password: '', // Not used with Firebase auth
          displayName: displayName || email.split('@')[0],
          photoURL,
          firebaseUid: uid
        });
      }
      
      res.status(200).json({ success: true, user });
    } catch (error) {
      console.error('Error syncing auth session:', error);
      res.status(500).json({ message: 'Failed to sync authentication session' });
    }
  });
  
  // Get current user
  app.get('/api/users/me', async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const token = authHeader.split(' ')[1];
      
      try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        const user = await storage.getUserByFirebaseUid(decodedToken.uid);
        
        if (!user) {
          return res.status(404).json({ message: 'User not found' });
        }
        
        res.json(user);
      } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get all users
  app.get('/api/users', async (req: Request, res: Response) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });
  
  // Get all chats for current user
  app.get('/api/chats', async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const token = authHeader.split(' ')[1];
      const decodedToken = await admin.auth().verifyIdToken(token);
      const user = await storage.getUserByFirebaseUid(decodedToken.uid);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const chats = await storage.getUserChats(user.id);
      res.json(chats);
    } catch (error) {
      console.error('Error fetching chats:', error);
      res.status(500).json({ message: 'Failed to fetch chats' });
    }
  });
  
  // Create a new chat
  app.post('/api/chats', async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const token = authHeader.split(' ')[1];
      const decodedToken = await admin.auth().verifyIdToken(token);
      const user = await storage.getUserByFirebaseUid(decodedToken.uid);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const validatedData = insertChatSchema.parse({
        ...req.body,
        createdBy: user.id
      });
      
      const chat = await storage.createChat(validatedData);
      
      // Add creator as member automatically
      await storage.addChatMember({
        chatId: chat.id,
        userId: user.id,
        isAdmin: true
      });
      
      res.status(201).json(chat);
    } catch (error) {
      console.error('Error creating chat:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid chat data', errors: error.errors });
      }
      
      res.status(500).json({ message: 'Failed to create chat' });
    }
  });
  
  // Get a specific chat
  app.get('/api/chats/:id', async (req: Request, res: Response) => {
    try {
      const chatId = parseInt(req.params.id);
      const chat = await storage.getChat(chatId);
      
      if (!chat) {
        return res.status(404).json({ message: 'Chat not found' });
      }
      
      res.json(chat);
    } catch (error) {
      console.error(`Error fetching chat ${req.params.id}:`, error);
      res.status(500).json({ message: 'Failed to fetch chat' });
    }
  });
  
  // Add a member to a chat
  app.post('/api/chats/:id/members', async (req: Request, res: Response) => {
    try {
      const chatId = parseInt(req.params.id);
      const { userId, isAdmin = false } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: 'userId is required' });
      }
      
      const chat = await storage.getChat(chatId);
      
      if (!chat) {
        return res.status(404).json({ message: 'Chat not found' });
      }
      
      // Check if chat is a group and has less than 2000 members
      if (chat.type === 'group') {
        const members = await storage.getChatMembers(chatId);
        
        if (members.length >= 2000) {
          return res.status(400).json({ 
            message: 'This group has reached the maximum number of members (2000)' 
          });
        }
      }
      
      const member = await storage.addChatMember({
        chatId,
        userId,
        isAdmin
      });
      
      res.status(201).json(member);
    } catch (error) {
      console.error(`Error adding member to chat ${req.params.id}:`, error);
      res.status(500).json({ message: 'Failed to add member to chat' });
    }
  });
  
  // Get messages for a chat
  app.get('/api/messages', async (req: Request, res: Response) => {
    try {
      const chatId = parseInt(req.query.chatId as string);
      
      if (!chatId) {
        return res.status(400).json({ message: 'chatId query parameter is required' });
      }
      
      const messages = await storage.getChatMessages(chatId);
      res.json(messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ message: 'Failed to fetch messages' });
    }
  });
  
  // Send a message
  app.post('/api/messages', async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const token = authHeader.split(' ')[1];
      const decodedToken = await admin.auth().verifyIdToken(token);
      const user = await storage.getUserByFirebaseUid(decodedToken.uid);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const validatedData = insertMessageSchema.parse({
        ...req.body,
        senderId: user.id
      });
      
      const message = await storage.createMessage(validatedData);
      
      // Update chat's last message
      await storage.updateChatLastMessage(
        validatedData.chatId, 
        validatedData.content, 
        new Date()
      );
      
      // Notify via WebSocket
      const chatMembers = await storage.getChatMembers(validatedData.chatId);
      
      chatMembers.forEach(member => {
        const ws = clients.get(member.user?.firebaseUid || '');
        
        if (ws && ws.readyState === WebSocket.OPEN && member.userId !== user.id) {
          ws.send(JSON.stringify({
            type: 'new_message',
            chatId: validatedData.chatId,
            message
          }));
        }
      });
      
      res.status(201).json(message);
    } catch (error) {
      console.error('Error sending message:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid message data', errors: error.errors });
      }
      
      res.status(500).json({ message: 'Failed to send message' });
    }
  });
  
  // Upload image for message
  app.post('/api/upload/image', upload.single('image'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No image file provided' });
      }
      
      const chatId = req.body.chatId;
      if (!chatId) {
        return res.status(400).json({ message: 'chatId is required' });
      }
      
      // Upload image to Firebase Storage
      const bucket = admin.storage().bucket();
      const fileName = `chats/${chatId}/images/${Date.now()}_${req.file.originalname}`;
      const fileBuffer = req.file.buffer;
      
      const file = bucket.file(fileName);
      await file.save(fileBuffer, {
        metadata: {
          contentType: req.file.mimetype
        }
      });
      
      // Get public URL
      await file.makePublic();
      const imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      
      res.status(201).json({ imageUrl });
    } catch (error) {
      console.error('Error uploading image:', error);
      res.status(500).json({ message: 'Failed to upload image' });
    }
  });
  
  // Get all statuses
  app.get('/api/statuses', async (req: Request, res: Response) => {
    try {
      const statuses = await storage.getStatuses();
      res.json(statuses);
    } catch (error) {
      console.error('Error fetching statuses:', error);
      res.status(500).json({ message: 'Failed to fetch statuses' });
    }
  });
  
  // Create a status
  app.post('/api/statuses', async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const token = authHeader.split(' ')[1];
      const decodedToken = await admin.auth().verifyIdToken(token);
      const user = await storage.getUserByFirebaseUid(decodedToken.uid);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Status expires after 24 hours
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      
      const validatedData = insertStatusSchema.parse({
        ...req.body,
        userId: user.id,
        expiresAt
      });
      
      const status = await storage.createStatus(validatedData);
      res.status(201).json(status);
    } catch (error) {
      console.error('Error creating status:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid status data', errors: error.errors });
      }
      
      res.status(500).json({ message: 'Failed to create status' });
    }
  });
  
  // Upload image for status
  app.post('/api/upload/status-image', upload.single('image'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No image file provided' });
      }
      
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const token = authHeader.split(' ')[1];
      const decodedToken = await admin.auth().verifyIdToken(token);
      const user = await storage.getUserByFirebaseUid(decodedToken.uid);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Upload image to Firebase Storage
      const bucket = admin.storage().bucket();
      const fileName = `statuses/${user.id}/images/${Date.now()}_${req.file.originalname}`;
      const fileBuffer = req.file.buffer;
      
      const file = bucket.file(fileName);
      await file.save(fileBuffer, {
        metadata: {
          contentType: req.file.mimetype
        }
      });
      
      // Get public URL
      await file.makePublic();
      const imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      
      res.status(201).json({ imageUrl });
    } catch (error) {
      console.error('Error uploading status image:', error);
      res.status(500).json({ message: 'Failed to upload status image' });
    }
  });
  
  // Mark a status as viewed
  app.post('/api/statuses/:id/view', async (req: Request, res: Response) => {
    try {
      const statusId = parseInt(req.params.id);
      
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const token = authHeader.split(' ')[1];
      const decodedToken = await admin.auth().verifyIdToken(token);
      const user = await storage.getUserByFirebaseUid(decodedToken.uid);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      await storage.viewStatus(statusId, user.id);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error(`Error marking status ${req.params.id} as viewed:`, error);
      res.status(500).json({ message: 'Failed to mark status as viewed' });
    }
  });

  return httpServer;
}
