import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  loginCode: text("login_code").notNull().unique(),
  role: text("role").notNull().default("user"), // "super_admin" or "user"
  isActive: boolean("is_active").notNull().default(true),
  lastActive: timestamp("last_active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const folders = pgTable("folders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  securityCode: text("security_code"), // Optional security code for folder access
  hasSecurityCode: boolean("has_security_code").default(false),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  originalName: text("original_name").notNull(),
  category: text("category").notNull(), // "press_releases", "memos", "internal_letters", "contracts", "follow_ups"
  fileType: text("file_type").notNull(), // "pdf", "word", "excel", "powerpoint"
  fileSize: integer("file_size").notNull(),
  filePath: text("file_path").notNull(),
  folderId: varchar("folder_id").references(() => folders.id), // Documents must belong to a folder
  uploadedBy: varchar("uploaded_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  metadata: jsonb("metadata"), // for additional document properties
  // New fields for document creation
  documentCode: text("document_code"), // Auto-generated code (e.g., PR-2024-001, MEMO-2024-001)
  isTemplate: boolean("is_template").default(false),
  content: jsonb("content"), // Document content for online editing
  recipientInfo: jsonb("recipient_info"), // For letters: name, address, title
});

export const documentShares = pgTable("document_shares", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").references(() => documents.id).notNull(),
  sharedBy: varchar("shared_by").references(() => users.id).notNull(),
  sharedWith: varchar("shared_with").references(() => users.id).notNull(),
  permission: text("permission").notNull().default("view"), // "view" or "edit"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  action: text("action").notNull(), // "upload", "download", "view", "share", "edit"
  resourceType: text("resource_type").notNull(), // "document", "user", "system"
  resourceId: varchar("resource_id"),
  details: jsonb("details"), // additional action details
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  name: true,
  loginCode: true,
  role: true,
});

export const insertFolderSchema = createInsertSchema(folders).pick({
  name: true,
  description: true,
  securityCode: true,
  hasSecurityCode: true,
});

export const insertDocumentSchema = createInsertSchema(documents).pick({
  name: true,
  originalName: true,
  category: true,
  fileType: true,
  fileSize: true,
  filePath: true,
  folderId: true,
  metadata: true,
  documentCode: true,
  isTemplate: true,
  content: true,
  recipientInfo: true,
});

// Schema for document creation form
export const createDocumentSchema = z.object({
  documentType: z.enum(["press_release", "memo", "internal_letter", "external_letter", "contract", "follow_up", "report"]),
  title: z.string().min(1, "Title is required"),
  fileType: z.enum(["word", "excel", "powerpoint"]),
  recipientName: z.string().optional(),
  recipientAddress: z.string().optional(),
  recipientTitle: z.string().optional(),
  isInternal: z.boolean().default(true),
});

export const insertDocumentShareSchema = createInsertSchema(documentShares).pick({
  documentId: true,
  sharedWith: true,
  permission: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).pick({
  action: true,
  resourceType: true,
  resourceId: true,
  details: true,
  ipAddress: true,
  userAgent: true,
});

// Types
export type User = typeof users.$inferSelect;
export type Folder = typeof folders.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type DocumentShare = typeof documentShares.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertFolder = z.infer<typeof insertFolderSchema>;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type InsertDocumentShare = z.infer<typeof insertDocumentShareSchema>;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type CreateDocument = z.infer<typeof createDocumentSchema>;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type DocumentShare = typeof documentShares.$inferSelect;
export type InsertDocumentShare = z.infer<typeof insertDocumentShareSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type CreateDocument = z.infer<typeof createDocumentSchema>;
