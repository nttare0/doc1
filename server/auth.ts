import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);
const PostgresSessionStore = connectPg(session);

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
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "zeolf-document-management-secret-key-2024",
    resave: false,
    saveUninitialized: false,
    store: new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  };

  app.set("trust proxy", 1);
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
        try {
          const user = await storage.getUserByLoginCode(loginCode);
          if (!user || !user.isActive) {
            return done(null, false, { message: 'Invalid or inactive login code' });
          }
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
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
        details: { newUserName: name, newUserRole: role },
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
    passport.authenticate("local", (err, user, info) => {
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
        
        // Update last active timestamp
        await storage.updateUserLastActive(user.id);
        
        // Log activity
        await storage.createActivityLog({
          userId: user.id,
          action: "login",
          resourceType: "system",
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        });
        
        res.status(200).json(user);
      });
    })(req, res, next);
  });

  // Logout route
  app.post("/api/logout", (req, res, next) => {
    const userId = req.user?.id;
    
    req.logout(async (err) => {
      if (err) return next(err);
      
      // Log activity
      if (userId) {
        await storage.createActivityLog({
          userId,
          action: "logout",
          resourceType: "system",
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        });
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
