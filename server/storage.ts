import { users, folders, documents, documentShares, activityLogs, type User, type InsertUser, type Folder, type InsertFolder, type Document, type InsertDocument, type DocumentShare, type InsertDocumentShare, type ActivityLog, type InsertActivityLog } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, count, like } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByLoginCode(loginCode: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserLastActive(id: string): Promise<void>;
  generateLoginCode(): Promise<string>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  
  // Folder operations
  createFolder(folder: InsertFolder): Promise<Folder>;
  getFolder(id: string): Promise<Folder | undefined>;
  getFolderByName(name: string): Promise<Folder | undefined>;
  getUserFolders(userId: string): Promise<Folder[]>;
  getAllFolders(): Promise<Folder[]>;
  updateFolder(id: string, updates: Partial<Folder>): Promise<Folder | undefined>;
  deleteFolder(id: string): Promise<boolean>;
  verifyFolderAccess(folderId: string, securityCode?: string): Promise<boolean>;
  
  // Document operations
  createDocument(document: InsertDocument): Promise<Document>;
  getDocument(id: string): Promise<Document | undefined>;
  getUserDocuments(userId: string): Promise<Document[]>;
  getFolderDocuments(folderId: string): Promise<Document[]>;
  getAllDocuments(): Promise<Document[]>;
  getDocumentsByCategory(category: string): Promise<Document[]>;
  searchDocuments(query: string): Promise<Document[]>;
  updateDocument(id: string, updates: Partial<Document>): Promise<Document | undefined>;
  deleteDocument(id: string): Promise<boolean>;
  getDocumentCount(documentType: string): Promise<number>;
  getDocumentCountByTypeAndYear(documentType: string, year: number): Promise<number>;
  updateDocumentContent(id: string, content: any): Promise<Document | undefined>;
  generatePDF(document: Document): Promise<Buffer>;
  
  // Document sharing
  shareDocument(share: InsertDocumentShare): Promise<DocumentShare>;
  getDocumentShares(documentId: string): Promise<DocumentShare[]>;
  getUserSharedDocuments(userId: string): Promise<Document[]>;
  removeDocumentShare(id: string): Promise<boolean>;
  
  // Activity logging
  createActivityLog(log: InsertActivityLog & { userId: string }): Promise<ActivityLog>;
  getActivityLogs(limit?: number): Promise<ActivityLog[]>;
  getUserActivityLogs(userId: string, limit?: number): Promise<ActivityLog[]>;
  
  // Statistics
  getDocumentStats(): Promise<{
    pressReleases: number;
    memos: number;
    letters: number;
    contracts: number;
    followups: number;
    total: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByLoginCode(loginCode: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.loginCode, loginCode));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserLastActive(id: string): Promise<void> {
    await db
      .update(users)
      .set({ lastActive: new Date() })
      .where(eq(users.id, id));
  }

  // Folder operations implementation
  async createFolder(insertFolder: InsertFolder & { createdBy: string }): Promise<Folder> {
    const [folder] = await db
      .insert(folders)
      .values(insertFolder)
      .returning();
    return folder;
  }

  async getFolder(id: string): Promise<Folder | undefined> {
    const [folder] = await db.select().from(folders).where(eq(folders.id, id));
    return folder || undefined;
  }

  async getFolderByName(name: string): Promise<Folder | undefined> {
    const [folder] = await db.select().from(folders).where(eq(folders.name, name));
    return folder || undefined;
  }

  async getUserFolders(userId: string): Promise<Folder[]> {
    return await db.select().from(folders).where(eq(folders.createdBy, userId)).orderBy(desc(folders.createdAt));
  }

  async getAllFolders(): Promise<Folder[]> {
    return await db.select().from(folders).orderBy(desc(folders.createdAt));
  }

  async updateFolder(id: string, updates: Partial<Folder>): Promise<Folder | undefined> {
    const [folder] = await db
      .update(folders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(folders.id, id))
      .returning();
    return folder || undefined;
  }

  async deleteFolder(id: string): Promise<boolean> {
    const result = await db.delete(folders).where(eq(folders.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async verifyFolderAccess(folderId: string, securityCode?: string): Promise<boolean> {
    const folder = await this.getFolder(folderId);
    if (!folder) return false;
    
    if (!folder.hasSecurityCode) return true;
    
    return folder.securityCode === securityCode;
  }

  async getFolderDocuments(folderId: string): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.folderId, folderId)).orderBy(desc(documents.createdAt));
  }

  async generateLoginCode(): Promise<string> {
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      const code = `ZT-${Math.random().toString(36).substr(2, 3).toUpperCase()}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
      const existing = await this.getUserByLoginCode(code);
      
      if (!existing) {
        return code;
      }
      attempts++;
    }
    
    // Fallback to UUID-based code
    return `ZT-${randomUUID().substr(0, 8).toUpperCase()}`;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async createDocument(insertDocument: InsertDocument & { uploadedBy: string }): Promise<Document> {
    const [document] = await db
      .insert(documents)
      .values(insertDocument)
      .returning();
    return document;
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document || undefined;
  }

  async getUserDocuments(userId: string): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.uploadedBy, userId))
      .orderBy(desc(documents.updatedAt));
  }

  async getAllDocuments(): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .orderBy(desc(documents.updatedAt));
  }

  async getDocumentsByCategory(category: string): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.category, category))
      .orderBy(desc(documents.updatedAt));
  }

  async searchDocuments(query: string): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(
        or(
          like(documents.name, `%${query}%`),
          like(documents.originalName, `%${query}%`)
        )
      )
      .orderBy(desc(documents.updatedAt));
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<Document | undefined> {
    const [document] = await db
      .update(documents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(documents.id, id))
      .returning();
    return document || undefined;
  }

  async deleteDocument(id: string): Promise<boolean> {
    const result = await db.delete(documents).where(eq(documents.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async shareDocument(insertShare: InsertDocumentShare & { sharedBy: string }): Promise<DocumentShare> {
    const [share] = await db
      .insert(documentShares)
      .values(insertShare)
      .returning();
    return share;
  }

  async getDocumentShares(documentId: string): Promise<DocumentShare[]> {
    return await db
      .select()
      .from(documentShares)
      .where(eq(documentShares.documentId, documentId));
  }

  async getUserSharedDocuments(userId: string): Promise<Document[]> {
    const sharedDocs = await db
      .select({ document: documents })
      .from(documents)
      .innerJoin(documentShares, eq(documents.id, documentShares.documentId))
      .where(eq(documentShares.sharedWith, userId))
      .orderBy(desc(documents.updatedAt));
    
    return sharedDocs.map(item => item.document);
  }

  async removeDocumentShare(id: string): Promise<boolean> {
    const result = await db.delete(documentShares).where(eq(documentShares.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async createActivityLog(insertLog: InsertActivityLog & { userId: string }): Promise<ActivityLog> {
    const [log] = await db
      .insert(activityLogs)
      .values(insertLog)
      .returning();
    return log;
  }

  async getActivityLogs(limit: number = 50): Promise<ActivityLog[]> {
    return await db
      .select()
      .from(activityLogs)
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);
  }

  async getUserActivityLogs(userId: string, limit: number = 50): Promise<ActivityLog[]> {
    return await db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.userId, userId))
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);
  }

  async getDocumentStats() {
    const [stats] = await db
      .select({
        pressReleases: count(eq(documents.category, 'press_releases')),
        memos: count(eq(documents.category, 'memos')),
        letters: count(eq(documents.category, 'internal_letters')),
        contracts: count(eq(documents.category, 'contracts')),
        followups: count(eq(documents.category, 'follow_ups')),
        total: count(),
      })
      .from(documents);
    
    return {
      pressReleases: Number(stats.pressReleases) || 0,
      memos: Number(stats.memos) || 0,
      letters: Number(stats.letters) || 0,
      contracts: Number(stats.contracts) || 0,
      followups: Number(stats.followups) || 0,
      total: Number(stats.total) || 0,
    };
  }

  async getDocumentCount(documentType: string): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(documents)
      .where(eq(documents.category, documentType));
    return Number(result.count) || 0;
  }

  async getDocumentCountByTypeAndYear(documentType: string, year: number): Promise<number> {
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year + 1, 0, 1);
    
    const [result] = await db
      .select({ count: count() })
      .from(documents)
      .where(
        and(
          eq(documents.category, documentType),
          and(
            db.sql`${documents.createdAt} >= ${yearStart}`,
            db.sql`${documents.createdAt} < ${yearEnd}`
          )
        )
      );
    return Number(result.count) || 0;
  }

  async updateDocumentContent(id: string, content: any): Promise<Document | undefined> {
    const [document] = await db
      .update(documents)
      .set({ 
        content,
        updatedAt: new Date() 
      })
      .where(eq(documents.id, id))
      .returning();
    return document || undefined;
  }

  async generatePDF(document: Document): Promise<Buffer> {
    // Simple PDF generation - in a real application, you'd use a proper PDF library
    const pdfContent = `
ZEOLF TECHNOLOGY
Document Management System

${document.name}
Document Code: ${document.documentCode || 'N/A'}
Category: ${document.category.replace('_', ' ').toUpperCase()}
Created: ${document.createdAt.toLocaleDateString()}

Content:
${JSON.stringify(document.content, null, 2)}

---
ZEOLF Technology - ${document.category.replace('_', ' ').toUpperCase()}
Document Code: ${document.documentCode}
Generated: ${new Date().toLocaleDateString()}
    `;
    
    // Return as buffer for now - in production, use a proper PDF library like PDFKit or Puppeteer
    return Buffer.from(pdfContent, 'utf-8');
  }
}

export const storage = new DatabaseStorage();
