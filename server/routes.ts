import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { WebSocketServer, WebSocket } from "ws";
import { z } from "zod";
import { 
  authSchema, 
  insertUserSchema, 
  insertConversationSchema, 
  insertMessageSchema, 
  insertStatusSchema 
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Create WebSocket server for real-time communication
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store connected clients
  const clients: Map<string, WebSocket> = new Map();
  
  wss.on('connection', (ws) => {
    let userId: string | null = null;
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'authenticate') {
          userId = data.uid;
          clients.set(userId, ws);
          console.log(`Client authenticated: ${userId}`);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      if (userId) {
        clients.delete(userId);
        console.log(`Client disconnected: ${userId}`);
      }
    });
  });
  
  // Helper function to send WebSocket messages to users
  const notifyUsers = (userIds: string[], data: any) => {
    userIds.forEach(userId => {
      const client = clients.get(userId);
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  };
  
  // User routes
  app.post('/api/users', async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  app.get('/api/users/:uid', async (req: Request, res: Response) => {
    try {
      const user = await storage.getUserByUid(req.params.uid);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get('/api/users', async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Conversation routes
  app.post('/api/conversations', async (req: Request, res: Response) => {
    try {
      const conversationData = insertConversationSchema.parse(req.body);
      const memberIds = req.body.memberIds || [];
      
      if (!memberIds.length) {
        return res.status(400).json({ error: 'At least one member is required' });
      }
      
      const conversation = await storage.createConversation(conversationData, memberIds);
      res.status(201).json(conversation);
      
      // Notify all members about the new conversation
      notifyUsers(memberIds, {
        type: 'new_conversation',
        conversationId: conversation.id
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  app.get('/api/conversations/:id', async (req: Request, res: Response) => {
    try {
      const conversation = await storage.getConversation(parseInt(req.params.id));
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      res.json(conversation);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.patch('/api/conversations/:id', async (req: Request, res: Response) => {
    try {
      const conversation = await storage.updateConversation(
        parseInt(req.params.id),
        req.body
      );
      res.json(conversation);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get('/api/users/:uid/conversations', async (req: Request, res: Response) => {
    try {
      const conversations = await storage.getUserConversations(req.params.uid);
      res.json(conversations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get('/api/conversations/:id/members', async (req: Request, res: Response) => {
    try {
      const members = await storage.getConversationMembers(parseInt(req.params.id));
      res.json(members);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post('/api/conversations/:id/read', async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;
      await storage.markConversationAsRead(parseInt(req.params.id), userId);
      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Message routes
  app.post('/api/conversations/:id/messages', async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);
      const messageData = insertMessageSchema.parse({
        ...req.body,
        conversationId
      });
      
      const message = await storage.createMessage(messageData);
      res.status(201).json(message);
      
      // Get all members of the conversation to notify
      const members = await storage.getConversationMembers(conversationId);
      const memberIds = members.map(member => member.userId);
      
      // Notify all members except the sender
      const otherMembers = memberIds.filter(id => id !== messageData.senderId);
      notifyUsers(otherMembers, {
        type: 'new_message',
        conversationId,
        messageId: message.id,
        senderId: messageData.senderId
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  app.get('/api/conversations/:id/messages', async (req: Request, res: Response) => {
    try {
      const messages = await storage.getConversationMessages(parseInt(req.params.id));
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post('/api/messages/:id/read', async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;
      await storage.markMessageAsRead(parseInt(req.params.id), userId);
      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Status routes
  app.post('/api/statuses', async (req: Request, res: Response) => {
    try {
      const statusData = insertStatusSchema.parse(req.body);
      const status = await storage.createStatus(statusData);
      res.status(201).json(status);
      
      // Notify all users about the new status
      const users = await storage.getAllUsers();
      const userIds = users.map(user => user.uid);
      notifyUsers(userIds, {
        type: 'status_update',
        statusId: status.id,
        userId: statusData.userId
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  app.get('/api/statuses', async (req: Request, res: Response) => {
    try {
      const statuses = await storage.getAllStatuses();
      res.json(statuses);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get('/api/users/:uid/statuses', async (req: Request, res: Response) => {
    try {
      const statuses = await storage.getUserStatuses(req.params.uid);
      res.json(statuses);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post('/api/statuses/:id/view', async (req: Request, res: Response) => {
    try {
      const { viewerId } = req.body;
      await storage.viewStatus(parseInt(req.params.id), viewerId);
      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
