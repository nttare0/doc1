import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { insertDocumentSchema, insertDocumentShareSchema, insertActivityLogSchema } from "@shared/schema";
import { z } from "zod";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");

// Ensure upload directory exists
(async () => {
  try {
    await fs.access(uploadDir);
  } catch {
    await fs.mkdir(uploadDir, { recursive: true });
  }
})();

const storage_multer = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage_multer,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, Word, Excel, and PowerPoint files are allowed.'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  setupAuth(app);

  // Middleware to check authentication
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  // Middleware to check super admin role
  const requireSuperAdmin = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated() || req.user?.role !== "super_admin") {
      return res.status(403).json({ message: "Super admin access required" });
    }
    next();
  };

  // Document routes
  app.post("/api/documents/upload", requireAuth, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { category, name: customName } = req.body;
      
      // Determine file type
      const getFileType = (mimetype: string) => {
        if (mimetype.includes('pdf')) return 'pdf';
        if (mimetype.includes('word')) return 'word';
        if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return 'excel';
        if (mimetype.includes('powerpoint') || mimetype.includes('presentation')) return 'powerpoint';
        return 'unknown';
      };

      const fileType = getFileType(req.file.mimetype);
      const documentName = customName || req.file.originalname;

      const document = await storage.createDocument({
        name: documentName,
        originalName: req.file.originalname,
        category: category || 'memos',
        fileType,
        fileSize: req.file.size,
        filePath: req.file.path,
        uploadedBy: req.user.id,
        metadata: {
          mimetype: req.file.mimetype,
          uploadedAt: new Date().toISOString(),
        }
      });

      // Log activity
      await storage.createActivityLog({
        userId: req.user.id,
        action: "upload",
        resourceType: "document",
        resourceId: document.id,
        details: {
          documentName: document.name,
          fileSize: document.fileSize,
          category: document.category,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.status(201).json(document);
    } catch (error: any) {
      console.error('Upload error:', error);
      res.status(500).json({ message: error.message || "Upload failed" });
    }
  });

  // Get all documents
  app.get("/api/documents", requireAuth, async (req, res) => {
    try {
      const { category, search } = req.query;
      
      let documents;
      
      if (search) {
        documents = await storage.searchDocuments(search as string);
      } else if (category) {
        documents = await storage.getDocumentsByCategory(category as string);
      } else {
        documents = await storage.getAllDocuments();
      }
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user.id,
        action: "view",
        resourceType: "document",
        details: { category, search },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });
      
      res.json(documents);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get single document
  app.get("/api/documents/:id", requireAuth, async (req, res) => {
    try {
      const document = await storage.getDocument(req.params.id);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user.id,
        action: "view",
        resourceType: "document",
        resourceId: document.id,
        details: { documentName: document.name },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });
      
      res.json(document);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Download document
  app.get("/api/documents/:id/download", requireAuth, async (req, res) => {
    try {
      const document = await storage.getDocument(req.params.id);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user.id,
        action: "download",
        resourceType: "document",
        resourceId: document.id,
        details: { 
          documentName: document.name,
          fileSize: document.fileSize,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });
      
      res.download(document.filePath, document.originalName);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Share document
  app.post("/api/documents/:id/share", requireAuth, async (req, res) => {
    try {
      const { sharedWith, permission } = req.body;
      const documentId = req.params.id;
      
      const document = await storage.getDocument(documentId);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      const share = await storage.shareDocument({
        documentId,
        sharedBy: req.user.id,
        sharedWith,
        permission: permission || 'view',
      });
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user.id,
        action: "share",
        resourceType: "document",
        resourceId: documentId,
        details: {
          documentName: document.name,
          sharedWith,
          permission,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });
      
      res.status(201).json(share);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get shared documents
  app.get("/api/documents/shared/with-me", requireAuth, async (req, res) => {
    try {
      const documents = await storage.getUserSharedDocuments(req.user.id);
      res.json(documents);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get document statistics
  app.get("/api/documents/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getDocumentStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // User management routes (Super Admin only)
  app.get("/api/admin/users", requireSuperAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/admin/users/:id", requireSuperAdmin, async (req, res) => {
    try {
      const { isActive, name, role } = req.body;
      const user = await storage.updateUser(req.params.id, {
        isActive,
        name,
        role,
      });
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user.id,
        action: "update_user",
        resourceType: "user",
        resourceId: user.id,
        details: { changes: { isActive, name, role } },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });
      
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Activity logs (Super Admin only)
  app.get("/api/admin/activity-logs", requireSuperAdmin, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const logs = await storage.getActivityLogs(limit);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get user activity logs
  app.get("/api/activity-logs", requireAuth, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const logs = await storage.getUserActivityLogs(req.user.id, limit);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
