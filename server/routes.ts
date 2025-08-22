import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { insertFolderSchema, insertDocumentSchema, insertDocumentShareSchema, insertActivityLogSchema } from "@shared/schema";
import { grokService } from "./grokService";
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

  // Helper functions for document generation
  function getFileExtension(fileType: string): string {
    switch (fileType) {
      case 'word': return '.docx';
      case 'excel': return '.xlsx';
      case 'powerpoint': return '.pptx';
      case 'pdf': return '.pdf';
      default: return '.txt';
    }
  }

  function getContentType(fileType: string): string {
    switch (fileType) {
      case 'word': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'excel': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'powerpoint': return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      case 'pdf': return 'application/pdf';
      default: return 'text/plain';
    }
  }

  async function generateDocumentContent(document: any): Promise<string> {
    // Generate basic text content for the document
    const header = `ZEOLF TECHNOLOGY
Document Management System

${document.name}
Document Code: ${document.documentCode || 'N/A'}
Category: ${document.category.replace('_', ' ').toUpperCase()}
Created: ${document.createdAt.toLocaleDateString()}

`;

    let content = '';
    if (document.content) {
      if (document.content.title) {
        content += `Title: ${document.content.title}\n\n`;
      }
      if (document.content.body) {
        content += `${document.content.body}\n\n`;
      }
      if (document.content.cells) {
        content += 'Excel Data:\n';
        Object.entries(document.content.cells).forEach(([cell, value]) => {
          content += `${cell}: ${value}\n`;
        });
        content += '\n';
      }
      if (document.content.slides) {
        content += 'PowerPoint Slides:\n';
        document.content.slides.forEach((slide: any, index: number) => {
          content += `Slide ${index + 1}: ${slide.title}\n${slide.content}\n\n`;
        });
      }
    }

    const footer = `
---
ZEOLF Technology - ${document.category.replace('_', ' ').toUpperCase()}
Document Code: ${document.documentCode}
Generated: ${new Date().toLocaleDateString()}
`;

    return header + content + footer;
  }

  // Document routes
  app.post("/api/documents/upload", requireAuth, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { category, name: customName, folderId, description } = req.body;
      
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
        uploadedBy: req.user!.id,
        folderId: folderId || null,
        description: description || null,
        metadata: {
          mimetype: req.file.mimetype,
          uploadedAt: new Date().toISOString(),
        }
      });

      // Log activity
      await storage.createActivityLog({
        userId: req.user!.id,
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
        userId: req.user!.id,
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
        userId: req.user!.id,
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
      
      // Check if file exists (for uploaded documents)
      const fileExists = await fs.access(document.filePath).then(() => true).catch(() => false);
      
      if (!fileExists) {
        // For template-created documents, generate content dynamically
        if (document.filePath.startsWith('templates/')) {
          const content = await generateDocumentContent(document);
          
          // Set appropriate content type and filename
          const extension = getFileExtension(document.fileType);
          const filename = `${document.name}${extension}`;
          
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          res.setHeader('Content-Type', getContentType(document.fileType));
          
          // Log activity
          await storage.createActivityLog({
            userId: req.user!.id,
            action: "download",
            resourceType: "document",
            resourceId: document.id,
            details: { 
              documentName: document.name,
              fileSize: content.length,
              generatedFromTemplate: true,
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
          });
          
          return res.send(content);
        } else {
          return res.status(404).json({ message: "File not found on disk" });
        }
      }
      
      // Log activity for regular file downloads
      await storage.createActivityLog({
        userId: req.user!.id,
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
      console.error('Download error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Update document (same file ID)
  app.put("/api/documents/:id/update", requireAuth, upload.single('file'), async (req, res) => {
    try {
      const documentId = req.params.id;
      const existingDocument = await storage.getDocument(documentId);
      
      if (!existingDocument) {
        return res.status(404).json({ message: "Document not found" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { category, description } = req.body;
      
      // Delete old file
      try {
        await fs.unlink(existingDocument.filePath);
      } catch (error) {
        console.warn('Could not delete old file:', error);
      }

      // Update document with new file
      const updatedDocument = await storage.updateDocument(documentId, {
        name: req.file.originalname.replace(/\.[^/.]+$/, ""), // Remove extension
        originalName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,

        fileType: path.extname(req.file.originalname).toLowerCase().substring(1),
        category: category || existingDocument.category,
        updatedAt: new Date(),
      });

      if (!updatedDocument) {
        return res.status(500).json({ message: "Failed to update document" });
      }

      // Log activity
      await storage.createActivityLog({
        userId: req.user!.id,
        action: "update",
        resourceType: "document",
        resourceId: documentId,
        details: {
          documentName: updatedDocument.name,
          fileSize: req.file.size,
          fileType: updatedDocument.fileType,
          category: updatedDocument.category,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.json(updatedDocument);
    } catch (error: any) {
      console.error('Document update error:', error);
      res.status(500).json({ message: error.message || "Update failed" });
    }
  });

  // Download document as PDF
  app.get("/api/documents/:id/download/pdf", requireAuth, async (req, res) => {
    try {
      const document = await storage.getDocument(req.params.id);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Generate PDF content for any document type
      const pdfBuffer = await storage.generatePDF(document);
      const filename = `${document.name}.pdf`;
      
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/pdf');
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user!.id,
        action: "download_pdf",
        resourceType: "document",
        resourceId: document.id,
        details: { 
          documentName: document.name,
          generatedPdf: true,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });
      
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error('PDF download error:', error);
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
        sharedBy: req.user!.id,
        sharedWith,
        permission: permission || 'view',
      });
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user!.id,
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
      const documents = await storage.getUserSharedDocuments(req.user!.id);
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
        userId: req.user!.id,
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
      const logs = await storage.getUserActivityLogs(req.user!.id, limit);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Folder routes
  app.post("/api/folders", requireAuth, async (req, res) => {
    try {
      const validatedData = insertFolderSchema.parse(req.body);
      
      const folder = await storage.createFolder({
        ...validatedData,
        createdBy: req.user!.id,
      });

      // Log activity
      await storage.createActivityLog({
        userId: req.user!.id,
        action: "create",
        resourceType: "folder",
        resourceId: folder.id,
        details: {
          folderName: folder.name,
          hasSecurityCode: folder.hasSecurityCode,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.status(201).json(folder);
    } catch (error: any) {
      console.error('Create folder error:', error);
      res.status(500).json({ message: error.message || "Failed to create folder" });
    }
  });

  app.get("/api/folders", requireAuth, async (req, res) => {
    try {
      const folders = await storage.getAllFolders();
      res.json(folders);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get individual folder details
  app.get("/api/folders/:id", requireAuth, async (req, res) => {
    try {
      const folder = await storage.getFolder(req.params.id);
      if (!folder) {
        return res.status(404).json({ message: "Folder not found" });
      }
      res.json(folder);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/folders/:id/documents", requireAuth, async (req, res) => {
    try {
      const documents = await storage.getFolderDocuments(req.params.id);
      res.json(documents);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/folders/:id/verify-access", requireAuth, async (req, res) => {
    try {
      const { securityCode } = req.body;
      const folderId = req.params.id;
      
      const folder = await storage.getFolder(folderId);
      if (!folder) {
        return res.status(404).json({ message: "Folder not found" });
      }

      if (!folder.hasSecurityCode) {
        return res.json({ success: true });
      }

      if (folder.securityCode !== securityCode) {
        return res.status(401).json({ message: "Invalid security code" });
      }

      // Log access
      await storage.createActivityLog({
        userId: req.user!.id,
        action: "access",
        resourceType: "folder",
        resourceId: folderId,
        details: { folderName: folder.name },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // AI Assistant routes
  app.post("/api/ai/generate-template", requireAuth, async (req, res) => {
    try {
      const template = await grokService.generateTemplate(req.body);

      // Log activity
      await storage.createActivityLog({
        userId: req.user!.id,
        action: "ai_generate_template",
        resourceType: "ai",
        details: {
          documentType: req.body.documentType,
          title: req.body.title,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.json({ template });
    } catch (error: any) {
      console.error('AI template generation error:', error);
      res.status(500).json({ message: error.message || "Failed to generate template" });
    }
  });

  app.post("/api/ai/research", requireAuth, async (req, res) => {
    try {
      const research = await grokService.performResearch(req.body);

      // Log activity
      await storage.createActivityLog({
        userId: req.user!.id,
        action: "ai_research",
        resourceType: "ai",
        details: {
          topic: req.body.topic,
          documentType: req.body.documentType,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.json({ research });
    } catch (error: any) {
      console.error('AI research error:', error);
      res.status(500).json({ message: error.message || "Failed to perform research" });
    }
  });

  app.post("/api/ai/improve-content", requireAuth, async (req, res) => {
    try {
      const improvedContent = await grokService.improveContent(req.body.content, req.body.documentType);

      // Log activity
      await storage.createActivityLog({
        userId: req.user!.id,
        action: "ai_improve_content",
        resourceType: "ai",
        details: {
          documentType: req.body.documentType,
          contentLength: req.body.content?.length || 0,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.json({ improvedContent });
    } catch (error: any) {
      console.error('AI content improvement error:', error);
      res.status(500).json({ message: error.message || "Failed to improve content" });
    }
  });

  // Create document from template
  app.post("/api/documents/create", requireAuth, async (req, res) => {
    try {
      const { documentType, title, fileType, recipientName, recipientAddress, recipientTitle, isInternal, folderId } = req.body;
      
      // Generate document code
      const year = new Date().getFullYear();
      const typeCode = documentType.toUpperCase().replace('_', '-');
      const count = await storage.getDocumentCount(documentType) + 1;
      const documentCode = `${typeCode}-${year}-${count.toString().padStart(3, '0')}`;
      
      // Create initial content based on file type
      let initialContent = {};
      switch (fileType) {
        case 'word':
          initialContent = {
            title: title,
            body: `This ${documentType.replace('_', ' ')} document was created on ${new Date().toLocaleDateString()}.`
          };
          break;
        case 'excel':
          initialContent = {
            cells: {
              'cell_0': 'Document Title',
              'cell_1': title,
              'cell_4': 'Created Date',
              'cell_5': new Date().toLocaleDateString(),
              'cell_8': 'Document Code',
              'cell_9': documentCode
            }
          };
          break;
        case 'powerpoint':
          initialContent = {
            slides: [
              {
                title: title,
                content: `${documentType.replace('_', ' ').toUpperCase()}\n\nCreated: ${new Date().toLocaleDateString()}\nCode: ${documentCode}`
              }
            ]
          };
          break;
      }
      
      // Prepare recipient info if it's a letter
      let recipientInfo = null;
      if ((documentType === 'internal_letter' || documentType === 'external_letter') && recipientName) {
        recipientInfo = {
          name: recipientName,
          address: recipientAddress,
          title: recipientTitle,
          isInternal: isInternal
        };
      }
      
      const document = await storage.createDocument({
        name: title,
        originalName: title,
        category: documentType,
        fileType: fileType,
        fileSize: 0, // Template documents start with 0 size
        filePath: `templates/${documentCode}`, // Virtual path for templates
        uploadedBy: req.user!.id,
        folderId: folderId || null,
        documentCode: documentCode,
        isTemplate: false,
        content: initialContent,
        recipientInfo: recipientInfo,
        metadata: {
          createdViaTemplate: true,
          documentType: documentType
        }
      });
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user!.id,
        action: "create_document",
        resourceType: "document",
        resourceId: document.id,
        details: { documentType, fileType, documentCode },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });
      
      res.status(201).json(document);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update document content
  app.put("/api/documents/:id/content", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { content } = req.body;
      
      const document = await storage.updateDocumentContent(id, content);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user!.id,
        action: "edit_document",
        resourceType: "document",
        resourceId: id,
        details: { contentUpdated: true },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });
      
      res.json(document);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Export document to PDF
  app.post("/api/documents/:id/export-pdf", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const document = await storage.getDocument(id);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Generate PDF content based on document type and content
      const pdfContent = await storage.generatePDF(document);
      
      // Log activity
      await storage.createActivityLog({
        userId: req.user!.id,
        action: "export_pdf",
        resourceType: "document",
        resourceId: id,
        details: { exportFormat: 'pdf' },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${document.name}.pdf"`);
      res.send(pdfContent);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
