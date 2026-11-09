import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

// ---------------------------------------------------------------------------
// Rescue login: an emergency super-admin door that does not depend on the
// database having a usable users table. Use it when the db file is missing,
// wiped, or half-broken and you need to get back in.
//
// THIS REPOSITORY IS PUBLIC, so the default code below is not a secret. Two
// guards keep that from becoming a backdoor:
//   1. In production the default is never used — BOOTSTRAP_LOGIN_CODE must be
//      set explicitly AND ENABLE_BOOTSTRAP_LOGIN=true.
//   2. Every use is written to the server log.
// For any real deployment, set BOOTSTRAP_LOGIN_CODE to a private value.
// Set BOOTSTRAP_LOGIN_CODE="" to switch the rescue login off entirely.
// ---------------------------------------------------------------------------
const BOOTSTRAP_USER_ID = "bootstrap-super-admin";
const isProduction = process.env.NODE_ENV === "production";
const bootstrapFromEnv = (process.env.BOOTSTRAP_LOGIN_CODE ?? "").trim();
const bootstrapLoginCode = isProduction ? bootstrapFromEnv : bootstrapFromEnv || "RESCUE-2025";
const bootstrapEnabled =
  bootstrapLoginCode.length > 0 &&
  (!isProduction || process.env.ENABLE_BOOTSTRAP_LOGIN === "true");

/** Used only when the database cannot store a row for the rescue admin. */
const syntheticRescueUser: SelectUser = {
  id: BOOTSTRAP_USER_ID,
  name: "Rescue Admin (no database)",
  loginCode: bootstrapLoginCode,
  role: "super_admin",
  isActive: true,
  lastActive: null,
  createdAt: new Date(),
};

function isRescueSession(userId?: string | null): boolean {
  return userId === BOOTSTRAP_USER_ID;
}

function matchesRescueCode(input: unknown): boolean {
  if (!bootstrapEnabled || typeof input !== "string") return false;
  return input.trim().toUpperCase() === bootstrapLoginCode.toUpperCase();
}

/**
 * Resolve the rescue login to a user.
 *
 * Only an operator-supplied code (BOOTSTRAP_LOGIN_CODE) is allowed to create a
 * real users row. The built-in default lives in a public repository, so writing
 * it into the database would leave a permanent, world-known super_admin account
 * behind after the emergency was over. The default therefore always maps to an
 * in-memory super admin: it gets you in, and nothing persists.
 *
 * A real row is preferable when the code is private, because activity_logs has a
 * foreign key to users(id) and the account then shows up in Admin -> Users where
 * it can be deactivated.
 */
async function resolveRescueUser(): Promise<SelectUser> {
  if (!bootstrapFromEnv) {
    return syntheticRescueUser;
  }

  try {
    const existing = await storage.getUserByLoginCode(bootstrapLoginCode);
    if (existing) return existing;

    return await storage.createUser({
      name: "Rescue Admin",
      loginCode: bootstrapLoginCode,
      role: "super_admin",
    });
  } catch (error) {
    console.warn(
      `[auth] database cannot store the rescue admin (${
        (error as Error).message
      }) — continuing with an in-memory super admin`,
    );
    return syntheticRescueUser;
  }
}

// Simple in-memory session store for SQLite
class MemoryStore extends session.Store {
  private sessions: Map<string, any> = new Map();

  get(sid: string, callback: (err?: any, session?: any) => void) {
    const session = this.sessions.get(sid);
    callback(null, session);
  }

  set(sid: string, session: any, callback?: (err?: any) => void) {
    this.sessions.set(sid, session);
    if (callback) callback();
  }

  destroy(sid: string, callback?: (err?: any) => void) {
    this.sessions.delete(sid);
    if (callback) callback();
  }
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  if (!stored || !supplied) return false;
  const parts = stored.split(".");
  if (parts.length !== 2) return false;
  
  const [hashed, salt] = parts;
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  if (bootstrapEnabled) {
    // Never print an operator-supplied secret; only the public default is shown.
    console.warn(
      `[auth] rescue login ENABLED (${
        bootstrapFromEnv ? "code from BOOTSTRAP_LOGIN_CODE" : `default code "${bootstrapLoginCode}"`
      }) — grants super_admin without a database user`,
    );
  }

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "zeolf-document-management-secret-key-2024",
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore(),
    cookie: {
      secure: false, // Set to false for development
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Custom strategy for login code authentication
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'loginCode',
        passwordField: 'loginCode', // We only use login code, no password
      },
      async (loginCode, password, done) => {
        let user: SelectUser | undefined;
        let dbError: Error | null = null;

        try {
          user = await storage.getUserByLoginCode(loginCode);
        } catch (error) {
          // The database is unusable. Do not fail yet: the rescue code exists
          // precisely for this case.
          dbError = error as Error;
        }

        if (user && user.isActive) {
          return done(null, user);
        }

        if (matchesRescueCode(loginCode)) {
          const rescue = await resolveRescueUser();
          console.warn(
            `[auth] RESCUE LOGIN used by "${rescue.name}" — ${
              dbError
                ? `database error: ${dbError.message}`
                : "no active user matched that login code in the database"
            }`,
          );
          return done(null, rescue);
        }

        // A genuine database failure should surface as an error, not as a
        // misleading "invalid login code".
        if (dbError) return done(dbError);

        return done(null, false, { message: 'Invalid or inactive login code' });
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    // Only the rescue identity may be restored without a database lookup.
    // Falling back for arbitrary ids would let any stale session belonging to a
    // deleted user come back as super_admin.
    if (bootstrapEnabled && isRescueSession(id)) {
      return done(null, syntheticRescueUser);
    }

    try {
      const user = await storage.getUser(id);
      done(null, user || false);
    } catch (error) {
      done(error);
    }
  });

  // Registration route (super admin can create new users)
  app.post("/api/register", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (req.user?.role !== "super_admin") {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const { name, role } = req.body;
      
      // Generate unique login code
      const loginCode = await storage.generateLoginCode();
      
      const user = await storage.createUser({
        name,
        loginCode,
        role: role || "user",
      });

      // Log activity
      await storage.createActivityLog({
        userId: req.user.id,
        action: "create_user",
        resourceType: "user",
        resourceId: user.id,
        details: JSON.stringify({ newUserName: name, newUserRole: role }),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.status(201).json({ ...user, loginCode: user.loginCode });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Login route
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid login code" });
      }
      
      req.logIn(user, async (err) => {
        if (err) {
          return next(err);
        }
        
        // Both writes need a working database, and activity_logs.user_id is a
        // foreign key to users(id) — a rescue session may satisfy neither. A
        // successful authentication must not turn into a 500 because the audit
        // trail could not be written.
        try {
          // Update last active timestamp
          await storage.updateUserLastActive(user.id);

          // Log activity
          await storage.createActivityLog({
            userId: user.id,
            action: isRescueSession(user.id) ? "rescue_login" : "login",
            resourceType: "system",
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
          });
        } catch (error) {
          console.warn(`[auth] login succeeded but could not be recorded for ${user.id}: ${(error as Error).message}`);
        }
        
        res.status(200).json(user);
      });
    })(req, res, next);
  });

  // Logout route
  app.post("/api/logout", (req, res, next) => {
    const userId = req.user?.id;
    
    req.logout(async (err) => {
      if (err) return next(err);
      
      // Log activity. Skipped for rescue sessions (no users row to point the
      // foreign key at) and never allowed to fail the logout itself.
      if (userId && !isRescueSession(userId)) {
        try {
          await storage.createActivityLog({
            userId,
            action: "logout",
            resourceType: "system",
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
          });
        } catch (error) {
          console.warn(`[auth] logout succeeded but could not be recorded for ${userId}: ${(error as Error).message}`);
        }
      }
      
      res.sendStatus(200);
    });
  });

  // Get current user
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    res.json(req.user);
  });
}