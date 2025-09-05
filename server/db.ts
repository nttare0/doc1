import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from "@shared/schema";
import path from 'path';

const dbPath = process.env.NODE_ENV === 'production' 
  ? path.join(process.cwd(), 'database.sqlite')
  : path.join(process.cwd(), 'database.sqlite');

export const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema });

// Initialize database with tables
export function initializeDatabase() {
  // Enable foreign keys
  sqlite.pragma('foreign_keys = ON');
  
  // Create tables if they don't exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL,
      login_code TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'user',
      is_active INTEGER NOT NULL DEFAULT 1,
      last_active INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL,
      description TEXT,
      security_code TEXT,
      has_security_code INTEGER DEFAULT 0,
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL,
      original_name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      folder_id TEXT REFERENCES folders(id),
      uploaded_by TEXT NOT NULL REFERENCES users(id),
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      metadata TEXT,
      document_code TEXT,
      is_template INTEGER DEFAULT 0,
      content TEXT,
      recipient_info TEXT
    );

    CREATE TABLE IF NOT EXISTS document_shares (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      document_id TEXT NOT NULL REFERENCES documents(id),
      shared_by TEXT NOT NULL REFERENCES users(id),
      shared_with TEXT NOT NULL REFERENCES users(id),
      permission TEXT NOT NULL DEFAULT 'view',
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL REFERENCES users(id),
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE INDEX IF NOT EXISTS idx_users_login_code ON users(login_code);
    CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
    CREATE INDEX IF NOT EXISTS idx_documents_folder_id ON documents(folder_id);
    CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
  `);

  // Insert default admin user if no users exist
  const userCount = sqlite.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  
  if (userCount.count === 0) {
    const adminId = crypto.randomUUID();
    sqlite.prepare(`
      INSERT INTO users (id, name, login_code, role, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(adminId, 'Admin User', 'ADMIN-2025', 'super_admin', 1, Date.now());

    // Create default folder
    const folderId = crypto.randomUUID();
    sqlite.prepare(`
      INSERT INTO folders (id, name, description, has_security_code, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(folderId, 'General Documents', 'Default folder for company documents', 0, adminId, Date.now(), Date.now());

    console.log('✓ Default admin user created with login code: ADMIN-2025');
    console.log('✓ Default folder created');
  }
}