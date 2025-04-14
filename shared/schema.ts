import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(),
  username: text("username").notNull(),
  email: text("email").notNull().unique(),
  profileImage: text("profile_image"),
  status: text("status"),
  lastSeen: timestamp("last_seen"),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  name: text("name"),
  isGroup: boolean("is_group").default(false),
  groupImage: text("group_image"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: text("created_by").notNull(),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  lastMessage: text("last_message"),
  memberCount: integer("member_count").default(0),
});

export const conversationMembers = pgTable("conversation_members", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  userId: text("user_id").notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
  isAdmin: boolean("is_admin").default(false),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  senderId: text("sender_id").notNull(),
  text: text("text"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  readBy: jsonb("read_by").default([]),
});

export const statuses = pgTable("statuses", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull().default("text"),
  content: text("content"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  viewCount: integer("view_count").default(0),
  viewedBy: jsonb("viewed_by").default([]),
});

export const statusViews = pgTable("status_views", {
  id: serial("id").primaryKey(),
  statusId: integer("status_id").notNull(),
  viewerId: text("viewer_id").notNull(),
  viewedAt: timestamp("viewed_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  uid: true,
  username: true,
  email: true,
  profileImage: true,
});

export const insertConversationSchema = createInsertSchema(conversations).pick({
  name: true,
  isGroup: true,
  groupImage: true,
  createdBy: true,
});

export const insertConversationMemberSchema = createInsertSchema(conversationMembers).pick({
  conversationId: true,
  userId: true,
  isAdmin: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  conversationId: true,
  senderId: true,
  text: true,
  imageUrl: true,
});

export const insertStatusSchema = createInsertSchema(statuses).pick({
  userId: true,
  type: true,
  content: true,
  imageUrl: true,
  expiresAt: true,
});

export const insertStatusViewSchema = createInsertSchema(statusViews).pick({
  statusId: true,
  viewerId: true,
});

// Registration and Login Schema
export const authSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

export const registerSchema = authSchema.extend({
  username: z.string().min(3, { message: "Username must be at least 3 characters" }),
  confirmPassword: z.string().min(6),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type InsertConversationMember = z.infer<typeof insertConversationMemberSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertStatus = z.infer<typeof insertStatusSchema>;
export type InsertStatusView = z.infer<typeof insertStatusViewSchema>;

export type User = typeof users.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type ConversationMember = typeof conversationMembers.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Status = typeof statuses.$inferSelect;
export type StatusView = typeof statusViews.$inferSelect;

export type Auth = z.infer<typeof authSchema>;
export type Register = z.infer<typeof registerSchema>;
