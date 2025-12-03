import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { db } from "./db";
import { creators, offerViewTracking, visitorEvents } from "@shared/schema";
import { and, eq, inArray } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  sessionStartSchema,
  eventTrackSchema,
  routeRequestSchema,
  nudgPageFormSchema,
  offerFormSchema,
  automationFormSchema,
  experimentFormSchema,
  experimentUpdateSchema,
  pageContentUpdateSchema,
  registerSchema,
  loginSchema,
  type RoutingConditions,
} from "@shared/schema";
import MemoryStore from "memorystore";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.session.userId) {
    next();
  } else {
    res.status(401).json({ message: "Unauthorized" });
  }
};

// Helper function to detect traffic source from referrer
function detectTrafficSource(referrer: string | undefined): string {
  if (!referrer) return 'direct';
  const url = referrer.toLowerCase();
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('youtube.com')) return 'youtube';
  if (url.includes('pinterest.com')) return 'pinterest';
  if (url.includes('facebook.com')) return 'facebook';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
  if (url.includes('t.co')) return 'email';
  return 'other';
}

// Helper function to calculate intent level based on behavior
function calculateIntentLevel(
  trafficSource: string,
  timeOnPage: number,
  scrollDepth: number
): string {
  let score = 0;
  
  // Traffic source contributes
  if (trafficSource === 'youtube') score += 3;
  else if (trafficSource === 'email') score += 3;
  else if (trafficSource === 'pinterest') score += 2;
  else if (trafficSource === 'instagram') score += 1;
  else if (trafficSource === 'tiktok') score += 1;
  
  // Time on page contributes
  if (timeOnPage > 60) score += 3;
  else if (timeOnPage > 30) score += 2;
  else if (timeOnPage > 10) score += 1;
  
  // Scroll depth contributes
  if (scrollDepth > 75) score += 2;
  else if (scrollDepth > 50) score += 1;
  
  if (score >= 7) return 'buyer';
  if (score >= 5) return 'high';
  if (score >= 3) return 'medium';
  return 'low';
}

// Smart routing: evaluate rules and return best offer
async function evaluateRoutingRules(pageId: string, session: any): Promise<string | null> {
  const rules = await storage.getRoutingRulesByPageId(pageId);
  
  // Filter only active rules
  const activeRules = rules.filter(r => r.isActive);
  
  // Sort by priority (highest first)
  activeRules.sort((a, b) => b.priority - a.priority);
  
  for (const rule of activeRules) {
    const conditions = rule.conditions as RoutingConditions;
    let matches = true;
    
    // Check traffic source
    if (conditions.trafficSource && conditions.trafficSource.length > 0) {
      if (!conditions.trafficSource.includes(session.trafficSource)) {
        matches = false;
      }
    }
    
    // Check device
    if (conditions.device && conditions.device.length > 0) {
      if (!conditions.device.includes(session.device)) {
        matches = false;
      }
    }
    
    // Check intent level
    if (conditions.intentLevel && conditions.intentLevel.length > 0) {
      if (!conditions.intentLevel.includes(session.intentLevel)) {
        matches = false;
      }
    }
    
    // Check returning visitor
    if (conditions.returning !== undefined) {
      if (conditions.returning !== session.isReturning) {
        matches = false;
      }
    }
    
    if (matches) {
      return rule.offerId;
    }
  }
  
  // If no rules matched, try fallback
  const fallback = activeRules.find(r => r.isFallback);
  if (fallback) {
    return fallback.offerId;
  }
  
  // If no fallback, use page's default offer
  const page = await storage.getNudgPage(pageId);
  return page?.defaultOfferId || null;
}

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads', 'images');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Setup session middleware
  const SessionStore = MemoryStore(session);
  app.use(session({
    secret: process.env.SESSION_SECRET || 'nudg-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    store: new SessionStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
      sameSite: 'lax',
    },
  }));
  
  // Serve uploaded images statically
  app.use('/uploads', (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Cache-Control", "public, max-age=31536000"); // Cache for 1 year
    next();
  });
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
  
  // CORS middleware with security-conscious origin policy
  app.use((req, res, next) => {
    const origin = req.get("origin");
    const path = req.path;
    
    // Public endpoints - allow all origins (for public Nudge pages)
    const publicEndpoints = ['/api/track/session', '/api/track/event', '/api/route', '/api/pages/'];
    const isPublicEndpoint = publicEndpoints.some(endpoint => path.startsWith(endpoint));
    
    if (origin) {
      if (isPublicEndpoint) {
        // Allow all origins for public tracking and routing
        res.header("Access-Control-Allow-Origin", origin);
      } else {
        // Admin endpoints - only allow Replit domain and localhost
        const allowedAdminOrigins = [
          process.env.REPLIT_DEV_DOMAIN || '',
          'http://localhost:5000',
          'http://localhost:5173'
        ].filter(Boolean);
        
        if (allowedAdminOrigins.includes(origin)) {
          res.header("Access-Control-Allow-Origin", origin);
        }
      }
      
      res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }
    
    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }
    
    next();
  });

  // ===== FILE UPLOAD =====
  
  // POST /api/upload/image - Upload an image file
  app.post("/api/upload/image", upload.single('image'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      // Return the URL path for the uploaded image
      const imageUrl = `/uploads/images/${req.file.filename}`;
      return res.json({ imageUrl });
    } catch (error) {
      console.error("Image upload error:", error);
      return res.status(500).json({ error: "Failed to upload image" });
    }
  });

  // ===== AUTHENTICATION =====
  
  // POST /api/auth/register - Register a new user
  app.post("/api/auth/register", async (req, res) => {
    try {
      const validation = registerSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }
      
      const { username, password, email } = validation.data;
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already taken" });
      }
      
      // Hash password with bcrypt
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create user
      const user = await storage.createUser({
        username,
        password: hashedPassword,
      });
      
      // Create creator profile automatically
      await storage.createCreator({
        userId: user.id,
        name: username,
      });
      
      // Set session
      req.session.userId = user.id;
      
      res.json({ id: user.id, username: user.username });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });
  
  // POST /api/auth/login - Login user
  app.post("/api/auth/login", async (req, res) => {
    try {
      const validation = loginSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }
      
      const { username, password } = validation.data;
      
      // Find user
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // Verify password against bcrypt hash
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // Set session
      req.session.userId = user.id;
      
      res.json({ id: user.id, username: user.username });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });
  
  // POST /api/auth/logout - Logout user
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie('connect.sid');
      res.json({ message: "Logged out successfully" });
    });
  });
  
  // GET /api/auth/me - Get current user
  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      res.json({ id: user.id, username: user.username });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  
  // ===== PROFILE SETTINGS =====
  
  // PUT /api/profile/username - Update creator name
  app.put("/api/profile/username", isAuthenticated, async (req, res) => {
    try {
      const { username } = req.body;
      if (!username || username.trim().length === 0) {
        return res.status(400).json({ error: "Username is required" });
      }
      
      const userId = req.session.userId!;
      const creator = await storage.getCreatorByUserId(userId);
      if (!creator) {
        return res.status(404).json({ error: "Creator profile not found" });
      }
      
      const updated = await storage.updateCreator(creator.id, { name: username });
      return res.json({ creator: updated });
    } catch (error) {
      console.error("Username update error:", error);
      return res.status(500).json({ error: "Failed to update username" });
    }
  });
  
  // ===== CREATOR DATA =====
  
  // GET /api/demo - Get demo creator for freemium experience (no auth required)
  app.get("/api/demo", async (req, res) => {
    try {
      // Try to get demo creator first (created by seed)
      let demoCreator = await storage.getCreatorByUserId('user-demo');
      
      // If no demo creator, create one for the sandbox experience
      if (!demoCreator) {
        demoCreator = await storage.createCreator({
          userId: 'user-demo',
          name: 'Demo Creator',
          bio: 'Try building your first page!',
        });
      }
      
      // Get demo creator's pages
      const pages = await storage.getNudgPagesByCreatorId(demoCreator.id);
      const page = pages[0] || null;
      
      return res.json({ creator: demoCreator, page });
    } catch (error) {
      console.error("Demo fetch error:", error);
      return res.status(500).json({ error: "Failed to fetch demo data" });
    }
  });
  
  // GET /api/creator - Get authenticated user's creator profile
  app.get("/api/creator", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      let creator = await storage.getCreatorByUserId(userId);
      
      // If no creator profile exists, create one
      if (!creator) {
        const user = await storage.getUser(userId);
        const name = user?.username || 'Creator';
        creator = await storage.createCreator({
          userId,
          name,
        });
      }
      
      // Get first page for this creator
      const pages = await storage.getNudgPagesByCreatorId(creator.id);
      const page = pages[0] || null;
      
      return res.json({ creator, page });
    } catch (error) {
      console.error("Creator fetch error:", error);
      return res.status(500).json({ error: "Failed to fetch creator" });
    }
  });

  // ===== NUDGE PAGES =====
  
  // GET /api/pages - List all pages for a creator
  app.get("/api/pages", async (req, res) => {
    try {
      const creatorId = req.query.creatorId as string;
      if (!creatorId) {
        return res.status(400).json({ error: "creatorId required" });
      }
      
      const pages = await storage.getNudgPagesByCreatorId(creatorId);
      return res.json({ pages });
    } catch (error) {
      console.error("Pages fetch error:", error);
      return res.status(500).json({ error: "Failed to fetch pages" });
    }
  });
  
  // GET /api/pages/:slug - Get page by slug
  app.get("/api/pages/:slug", async (req, res) => {
    try {
      const page = await storage.getNudgPageBySlug(req.params.slug);
      if (!page) {
        return res.status(404).json({ error: "Page not found" });
      }
      return res.json({ page });
    } catch (error) {
      console.error("Page fetch error:", error);
      return res.status(500).json({ error: "Failed to fetch page" });
    }
  });
  
  // POST /api/pages - Create a new page
  app.post("/api/pages", async (req, res) => {
    try {
      const validated = nudgPageFormSchema.parse(req.body);
      
      // Check if slug already exists
      const existingPage = await storage.getNudgPageBySlug(validated.slug);
      if (existingPage) {
        return res.status(400).json({ error: `A page with slug "${validated.slug}" already exists. Please choose a different name.` });
      }
      
      const page = await storage.createNudgPage(validated);
      return res.json({ page });
    } catch (error: any) {
      console.error("Page creation error:", error);
      if (error?.code === '23505') {
        return res.status(400).json({ error: "A page with this slug already exists. Please choose a different name." });
      }
      return res.status(400).json({ error: "Failed to create page" });
    }
  });
  
  // PUT /api/pages/:id - Update a page
  app.put("/api/pages/:id", async (req, res) => {
    try {
      const page = await storage.updateNudgPage(req.params.id, req.body);
      if (!page) {
        return res.status(404).json({ error: "Page not found" });
      }
      return res.json({ page });
    } catch (error) {
      console.error("Page update error:", error);
      return res.status(400).json({ error: "Failed to update page" });
    }
  });
  
  // PATCH /api/pages/:id/content - Update page content/theme
  app.patch("/api/pages/:id/content", async (req, res) => {
    try {
      const validated = pageContentUpdateSchema.parse(req.body);
      const page = await storage.updateNudgPage(req.params.id, validated);
      if (!page) {
        return res.status(404).json({ error: "Page not found" });
      }
      return res.json({ page });
    } catch (error) {
      console.error("Page content update error:", error);
      return res.status(400).json({ error: "Failed to update page content" });
    }
  });
  
  // DELETE /api/pages/:id - Delete a page
  app.delete("/api/pages/:id", async (req, res) => {
    try {
      const success = await storage.deleteNudgPage(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Page not found" });
      }
      return res.json({ success: true });
    } catch (error) {
      console.error("Page deletion error:", error);
      return res.status(500).json({ error: "Failed to delete page" });
    }
  });

  // ===== OFFERS =====
  
  // GET /api/offers - Get offers for a page
  app.get("/api/offers", async (req, res) => {
    try {
      const pageId = req.query.pageId as string;
      const includeHidden = req.query.includeHidden === "true";
      
      if (!pageId) {
        return res.status(400).json({ error: "pageId required" });
      }
      
      let offers = await storage.getOffersByPageId(pageId);
      
      // Filter out hidden offers for public landing page (unless explicitly requested)
      if (!includeHidden) {
        offers = offers.filter(offer => !offer.isHidden);
      }
      
      return res.json({ offers });
    } catch (error) {
      console.error("Offers fetch error:", error);
      return res.status(500).json({ error: "Failed to fetch offers" });
    }
  });
  
  // POST /api/offers - Create a new offer
  app.post("/api/offers", async (req, res) => {
    try {
      const validated = offerFormSchema.parse(req.body);
      const offer = await storage.createOffer({
        ...validated,
        displayOrder: validated.displayOrder || 0,
        isActive: validated.isActive !== undefined ? validated.isActive : true,
      });
      return res.json({ offer });
    } catch (error) {
      console.error("Offer creation error:", error);
      return res.status(400).json({ error: "Failed to create offer" });
    }
  });
  
  // PUT /api/offers/:id - Update an offer
  app.put("/api/offers/:id", async (req, res) => {
    try {
      const offer = await storage.updateOffer(req.params.id, req.body);
      if (!offer) {
        return res.status(404).json({ error: "Offer not found" });
      }
      return res.json({ offer });
    } catch (error) {
      console.error("Offer update error:", error);
      return res.status(400).json({ error: "Failed to update offer" });
    }
  });
  
  // DELETE /api/offers/:id - Delete an offer
  app.delete("/api/offers/:id", async (req, res) => {
    try {
      const success = await storage.deleteOffer(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Offer not found" });
      }
      return res.json({ success: true });
    } catch (error) {
      console.error("Offer deletion error:", error);
      return res.status(500).json({ error: "Failed to delete offer" });
    }
  });

  // ===== ROUTING RULES =====
  
  // GET /api/routing-rules - Get rules for a page
  app.get("/api/routing-rules", async (req, res) => {
    try {
      const pageId = req.query.pageId as string;
      if (!pageId) {
        return res.status(400).json({ error: "pageId required" });
      }
      
      const rules = await storage.getRoutingRulesByPageId(pageId);
      return res.json({ rules });
    } catch (error) {
      console.error("Rules fetch error:", error);
      return res.status(500).json({ error: "Failed to fetch rules" });
    }
  });
  
  // POST /api/routing-rules - Create a routing rule
  app.post("/api/routing-rules", async (req, res) => {
    try {
      const rule = await storage.createRoutingRule(req.body);
      return res.json({ rule });
    } catch (error) {
      console.error("Rule creation error:", error);
      return res.status(400).json({ error: "Failed to create rule" });
    }
  });
  
  // PUT /api/routing-rules/:id - Update a routing rule
  app.put("/api/routing-rules/:id", async (req, res) => {
    try {
      const rule = await storage.updateRoutingRule(req.params.id, req.body);
      if (!rule) {
        return res.status(404).json({ error: "Rule not found" });
      }
      return res.json({ rule });
    } catch (error) {
      console.error("Rule update error:", error);
      return res.status(400).json({ error: "Failed to update rule" });
    }
  });
  
  // DELETE /api/routing-rules/:id - Delete a routing rule
  app.delete("/api/routing-rules/:id", async (req, res) => {
    try {
      const success = await storage.deleteRoutingRule(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Rule not found" });
      }
      return res.json({ success: true });
    } catch (error) {
      console.error("Rule deletion error:", error);
      return res.status(500).json({ error: "Failed to delete rule" });
    }
  });

  // ===== AUTOMATIONS =====
  
  // GET /api/automations - Get automations for a page
  app.get("/api/automations", async (req, res) => {
    try {
      const pageId = req.query.pageId as string;
      if (!pageId) {
        return res.status(400).json({ error: "pageId required" });
      }
      
      const automations = await storage.getAutomationsByPageId(pageId);
      return res.json({ automations });
    } catch (error) {
      console.error("Automations fetch error:", error);
      return res.status(500).json({ error: "Failed to fetch automations" });
    }
  });
  
  // POST /api/automations - Create an automation
  app.post("/api/automations", async (req, res) => {
    try {
      const validated = automationFormSchema.parse(req.body);
      const automation = await storage.createAutomation({
        ...validated,
        isActive: validated.isActive !== undefined ? validated.isActive : true,
      });
      return res.json({ automation });
    } catch (error) {
      console.error("Automation creation error:", error);
      return res.status(400).json({ error: "Failed to create automation" });
    }
  });
  
  // PUT /api/automations/:id - Update an automation
  app.put("/api/automations/:id", async (req, res) => {
    try {
      const automation = await storage.updateAutomation(req.params.id, req.body);
      if (!automation) {
        return res.status(404).json({ error: "Automation not found" });
      }
      return res.json({ automation });
    } catch (error) {
      console.error("Automation update error:", error);
      return res.status(400).json({ error: "Failed to update automation" });
    }
  });
  
  // DELETE /api/automations/:id - Delete an automation
  app.delete("/api/automations/:id", async (req, res) => {
    try {
      const success = await storage.deleteAutomation(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Automation not found" });
      }
      return res.json({ success: true });
    } catch (error) {
      console.error("Automation deletion error:", error);
      return res.status(500).json({ error: "Failed to delete automation" });
    }
  });

  // ===== EXPERIMENTS =====
  
  // GET /api/experiments - Get experiments for a creator
  app.get("/api/experiments", async (req, res) => {
    try {
      const creatorId = req.query.creatorId as string;
      if (!creatorId) {
        return res.status(400).json({ error: "creatorId required" });
      }
      
      const experiments = await storage.getExperimentsByCreatorId(creatorId);
      return res.json({ experiments });
    } catch (error) {
      console.error("Experiments fetch error:", error);
      return res.status(500).json({ error: "Failed to fetch experiments" });
    }
  });
  
  // POST /api/experiments - Create an experiment
  app.post("/api/experiments", async (req, res) => {
    try {
      const validated = experimentFormSchema.parse(req.body);
      const experiment = await storage.createExperiment({
        ...validated,
        status: 'draft',
      });
      return res.json({ experiment });
    } catch (error) {
      console.error("Experiment creation error:", error);
      return res.status(400).json({ error: "Failed to create experiment" });
    }
  });
  
  // PUT /api/experiments/:id - Update an experiment
  app.put("/api/experiments/:id", async (req, res) => {
    try {
      const validated = experimentUpdateSchema.parse(req.body);
      const experiment = await storage.updateExperiment(req.params.id, validated);
      if (!experiment) {
        return res.status(404).json({ error: "Experiment not found" });
      }
      return res.json({ experiment });
    } catch (error) {
      console.error("Experiment update error:", error);
      return res.status(400).json({ error: "Failed to update experiment" });
    }
  });
  
  // DELETE /api/experiments/:id - Delete an experiment
  app.delete("/api/experiments/:id", async (req, res) => {
    try {
      const success = await storage.deleteExperiment(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Experiment not found" });
      }
      return res.json({ success: true });
    } catch (error) {
      console.error("Experiment deletion error:", error);
      return res.status(500).json({ error: "Failed to delete experiment" });
    }
  });

  // GET /api/experiments/:id/resolve - Assign visitor to variant and return redirect info
  app.get("/api/experiments/:id/resolve", async (req, res) => {
    try {
      const experiment = await storage.getExperiment(req.params.id);
      if (!experiment) {
        return res.status(404).json({ error: "Experiment not found" });
      }
      
      // Check if experiment is active
      if (experiment.status !== 'running') {
        return res.status(400).json({ error: "Experiment is not running" });
      }
      
      // Randomly assign to variant based on traffic split
      const split = experiment.trafficSplit as { a: number; b: number; c: number };
      const rand = Math.random() * 100;
      let variantIndex = 0;
      let variantPageId = experiment.variantAPageId;
      
      if (rand < split.a) {
        variantIndex = 0;
        variantPageId = experiment.variantAPageId;
      } else if (rand < split.a + split.b) {
        variantIndex = 1;
        variantPageId = experiment.variantBPageId;
      } else {
        variantIndex = 2;
        variantPageId = experiment.variantCPageId;
      }
      
      // Get the variant page to return its slug
      const variantPage = await storage.getNudgPage(variantPageId);
      if (!variantPage) {
        return res.status(404).json({ error: "Variant page not found" });
      }
      
      return res.json({
        experimentId: experiment.id,
        variantIndex,
        variantPageId,
        pageSlug: variantPage.slug,
      });
    } catch (error) {
      console.error("Experiment resolve error:", error);
      return res.status(500).json({ error: "Failed to resolve experiment" });
    }
  });

  // GET /api/experiments/:id/metrics - Get conversion metrics for experiment
  app.get("/api/experiments/:id/metrics", async (req, res) => {
    try {
      const experiment = await storage.getExperiment(req.params.id);
      if (!experiment) {
        return res.status(404).json({ error: "Experiment not found" });
      }
      
      // Get all sessions for this experiment
      const allSessions = await storage.getSessionsByExperimentId(experiment.id);
      
      // Validate sessions have correct variant/page mapping
      const validateSession = (s: any) => {
        if (s.variantIndex === 0) return s.pageId === experiment.variantAPageId;
        if (s.variantIndex === 1) return s.pageId === experiment.variantBPageId;
        if (s.variantIndex === 2) return s.pageId === experiment.variantCPageId;
        return false; // Invalid variantIndex
      };
      const validSessions = allSessions.filter(validateSession);
      
      // Group sessions by variant
      const variantASessions = validSessions.filter(s => s.variantIndex === 0);
      const variantBSessions = validSessions.filter(s => s.variantIndex === 1);
      const variantCSessions = validSessions.filter(s => s.variantIndex === 2);
      
      // Batch-fetch all events for all sessions at once
      const allSessionIds = validSessions.map(s => s.id);
      let allEvents: any[] = [];
      
      if (allSessionIds.length > 0) {
        // Fetch events in batches to avoid SQL parameter limits
        const batchSize = 100;
        for (let i = 0; i < allSessionIds.length; i += batchSize) {
          const batchIds = allSessionIds.slice(i, i + batchSize);
          const events = await db
            .select()
            .from(visitorEvents)
            .where(
              and(
                inArray(visitorEvents.sessionId, batchIds),
                eq(visitorEvents.eventType, 'offer_click')
              )
            );
          allEvents.push(...events);
        }
      }
      
      // Group events by sessionId for fast lookup
      const conversionSessionIds = new Set(allEvents.map(e => e.sessionId));
      
      // Count conversions per variant
      const variantAConversions = variantASessions.filter(s => conversionSessionIds.has(s.id)).length;
      const variantBConversions = variantBSessions.filter(s => conversionSessionIds.has(s.id)).length;
      const variantCConversions = variantCSessions.filter(s => conversionSessionIds.has(s.id)).length;
      
      // Calculate conversion rates
      const calculateRate = (conversions: number, sessions: number) => {
        return sessions > 0 ? (conversions / sessions) * 100 : 0;
      };
      
      return res.json({
        experiment: {
          id: experiment.id,
          name: experiment.name,
          status: experiment.status,
          targetVisitors: experiment.targetVisitors,
          totalVisitors: validSessions.length,
        },
        variants: {
          a: {
            pageId: experiment.variantAPageId,
            visitors: variantASessions.length,
            conversions: variantAConversions,
            conversionRate: calculateRate(variantAConversions, variantASessions.length),
          },
          b: {
            pageId: experiment.variantBPageId,
            visitors: variantBSessions.length,
            conversions: variantBConversions,
            conversionRate: calculateRate(variantBConversions, variantBSessions.length),
          },
          c: {
            pageId: experiment.variantCPageId,
            visitors: variantCSessions.length,
            conversions: variantCConversions,
            conversionRate: calculateRate(variantCConversions, variantCSessions.length),
          },
        },
      });
    } catch (error) {
      console.error("Experiment metrics error:", error);
      return res.status(500).json({ error: "Failed to fetch experiment metrics" });
    }
  });

  // ===== VISITOR TRACKING =====
  
  // POST /api/track/session - Start or update a visitor session
  app.post("/api/track/session", async (req, res) => {
    try {
      const validated = sessionStartSchema.parse(req.body);
      
      // Get the page
      const page = await storage.getNudgPageBySlug(validated.pageSlug);
      if (!page) {
        return res.status(404).json({ error: "Page not found" });
      }
      
      // Detect traffic source
      const trafficSource = validated.utmSource || detectTrafficSource(validated.referrer);
      
      // Create session
      const session = await storage.createVisitorSession({
        pageId: page.id,
        fingerprint: validated.fingerprint || null,
        trafficSource,
        referrer: validated.referrer || null,
        utmSource: validated.utmSource || null,
        utmMedium: validated.utmMedium || null,
        utmCampaign: validated.utmCampaign || null,
        device: validated.device,
        os: validated.os || null,
        intentLevel: 'low', // will be updated as user behaves
        isReturning: false, // TODO: check if fingerprint exists
        experimentId: validated.experimentId || null,
        variantIndex: validated.variantIndex !== undefined ? validated.variantIndex : null,
      });
      
      return res.json({ sessionId: session.id });
    } catch (error) {
      console.error("Session creation error:", error);
      return res.status(400).json({ error: "Failed to create session" });
    }
  });
  
  // POST /api/track/event - Track a visitor event
  app.post("/api/track/event", async (req, res) => {
    try {
      const validated = eventTrackSchema.parse(req.body);
      
      const event = await storage.createVisitorEvent({
        sessionId: validated.sessionId,
        eventType: validated.eventType,
        meta: validated.meta || null,
      });
      
      // Update session's last seen and intent level
      const session = await storage.getVisitorSession(validated.sessionId);
      if (session) {
        const events = await storage.getEventsBySessionId(validated.sessionId);
        
        // Calculate time on page
        const timeOnPage = (Date.now() - new Date(session.startedAt).getTime()) / 1000;
        
        // Get max scroll depth
        const scrollEvents = events.filter(e => e.eventType === 'scroll' && e.meta);
        const maxScrollDepth = scrollEvents.length > 0
          ? Math.max(...scrollEvents.map(e => (e.meta as any)?.scrollDepth || 0))
          : 0;
        
        // Recalculate intent level
        const intentLevel = calculateIntentLevel(
          session.trafficSource || 'unknown',
          timeOnPage,
          maxScrollDepth
        );
        
        await storage.updateVisitorSession(validated.sessionId, {
          lastSeenAt: new Date(),
          intentLevel,
        });
      }
      
      return res.json({ success: true, eventId: event.id });
    } catch (error) {
      console.error("Event tracking error:", error);
      return res.status(400).json({ error: "Failed to track event" });
    }
  });

  // POST /api/track/offer-view - Increment offer view count for behavioral triggers
  app.post("/api/track/offer-view", async (req, res) => {
    try {
      const { sessionId, offerId } = req.body;
      
      if (!sessionId || !offerId) {
        return res.status(400).json({ error: "sessionId and offerId required" });
      }
      
      const viewCount = await storage.incrementOfferViewCount(sessionId, offerId);
      
      return res.json({ viewCount });
    } catch (error) {
      console.error("Offer view tracking error:", error);
      return res.status(400).json({ error: "Failed to track offer view" });
    }
  });

  // GET /api/track/offer-view - Get offer view count for a session
  app.get("/api/track/offer-view", async (req, res) => {
    try {
      const { sessionId, offerId, timeframeSeconds } = req.query;
      
      if (!sessionId || !offerId) {
        return res.status(400).json({ error: "sessionId and offerId required" });
      }
      
      const result = await db
        .select()
        .from(offerViewTracking)
        .where(
          and(
            eq(offerViewTracking.sessionId, sessionId as string),
            eq(offerViewTracking.offerId, offerId as string)
          )
        );
      
      if (!result[0]) {
        return res.json({ viewCount: 0, withinTimeframe: true });
      }
      
      const record = result[0];
      const now = Date.now();
      const firstViewTime = new Date(record.firstViewAt).getTime();
      const timeSinceFirstView = now - firstViewTime;
      
      // Check if timeframe is specified and if views are within that window
      if (timeframeSeconds) {
        const timeframeMs = parseInt(timeframeSeconds as string) * 1000;
        const withinTimeframe = timeSinceFirstView <= timeframeMs;
        
        // If outside timeframe, return 0 count (window expired, will reset on next increment)
        const viewCount = withinTimeframe ? record.viewCount : 0;
        
        return res.json({ 
          viewCount, 
          withinTimeframe,
          firstViewAt: record.firstViewAt,
          lastViewAt: record.lastViewAt 
        });
      }
      
      // No timeframe specified, return total count (always within timeframe)
      return res.json({ 
        viewCount: record.viewCount, 
        withinTimeframe: true,
        firstViewAt: record.firstViewAt,
        lastViewAt: record.lastViewAt 
      });
    } catch (error) {
      console.error("Offer view count fetch error:", error);
      return res.status(400).json({ error: "Failed to fetch offer view count" });
    }
  });

  // ===== OFFER PERFORMANCE ANALYTICS =====
  
  // GET /api/analytics/offers/:pageId - Get offer performance metrics
  app.get("/api/analytics/offers/:pageId", async (req, res) => {
    try {
      const { pageId } = req.params;
      
      // Get all offers for this page
      const offers = await storage.getOffersByPageId(pageId);
      
      // Get all sessions for this page
      const sessions = await storage.getSessionsByPageId(pageId);
      
      // Get all events in one bulk query (much faster than iterating sessions)
      const allEvents = await storage.getEventsByPageId(pageId);
      
      // Calculate performance metrics for each offer
      const offerMetrics = offers.map(offer => {
        const cardViewStarts = allEvents.filter(
          e => e.eventType === 'card_view_start' && (e.meta as any)?.offerId === offer.id
        );
        const cardViewEnds = allEvents.filter(
          e => e.eventType === 'card_view_end' && (e.meta as any)?.offerId === offer.id
        );
        const clicks = allEvents.filter(
          e => e.eventType === 'offer_click' && (e.meta as any)?.offerId === offer.id
        );
        const swipes = allEvents.filter(
          e => e.eventType === 'card_swipe' && (e.meta as any)?.offerId === offer.id
        );
        
        // Calculate average view duration (only count valid durations from paired events)
        const validDurations = cardViewEnds
          .map(e => (e.meta as any)?.duration)
          .filter(d => typeof d === 'number' && d > 0);
        const avgViewDuration = validDurations.length > 0
          ? validDurations.reduce((sum, d) => sum + d, 0) / validDurations.length
          : 0;
        
        const views = cardViewStarts.length;
        const clickCount = clicks.length;
        const ctr = views > 0 ? (clickCount / views) * 100 : 0;
        const swipeCount = swipes.length;
        
        return {
          offerId: offer.id,
          title: offer.title,
          type: offer.type,
          views,
          clicks: clickCount,
          ctr: Math.round(ctr * 10) / 10, // Round to 1 decimal
          avgViewDuration: Math.round(avgViewDuration / 1000), // Convert to seconds
          swipes: swipeCount,
          neverTouched: views === 0,
        };
      });
      
      // Sort by views descending
      offerMetrics.sort((a, b) => b.views - a.views);
      
      return res.json({
        offers: offerMetrics,
        totalSessions: sessions.length,
      });
    } catch (error) {
      console.error("Offer analytics error:", error);
      return res.status(500).json({ error: "Failed to fetch offer analytics" });
    }
  });

  // ===== SMART ROUTING ENGINE =====
  
  // POST /api/route - Get the best offer for this visitor
  app.post("/api/route", async (req, res) => {
    try {
      const validated = routeRequestSchema.parse(req.body);
      
      // Get session
      const session = await storage.getVisitorSession(validated.sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      // Get page
      const page = await storage.getNudgPageBySlug(validated.pageSlug);
      if (!page) {
        return res.status(404).json({ error: "Page not found" });
      }
      
      // Evaluate routing rules
      const offerId = await evaluateRoutingRules(page.id, session);
      
      // Always get automations, even if no offer is selected
      const automations = await storage.getAutomationsByPageId(page.id);
      const activeAutomations = automations.filter(a => a.isActive);
      
      if (!offerId) {
        return res.json({ offer: null, automations: activeAutomations });
      }
      
      // Get the offer
      const offer = await storage.getOffer(offerId);
      
      return res.json({ 
        offer, 
        automations: activeAutomations 
      });
    } catch (error) {
      console.error("Routing error:", error);
      return res.status(400).json({ error: "Failed to route offer" });
    }
  });

  // ===== ANALYTICS =====
  
  // GET /api/analytics/page/:pageId - Get page analytics
  app.get("/api/analytics/page/:pageId", async (req, res) => {
    try {
      const analytics = await storage.getPageAnalytics(req.params.pageId);
      return res.json({ analytics });
    } catch (error) {
      console.error("Page analytics error:", error);
      return res.status(500).json({ error: "Failed to fetch page analytics" });
    }
  });
  
  // GET /api/analytics/offer/:offerId - Get offer analytics
  app.get("/api/analytics/offer/:offerId", async (req, res) => {
    try {
      const analytics = await storage.getOfferAnalytics(req.params.offerId);
      return res.json({ analytics });
    } catch (error) {
      console.error("Offer analytics error:", error);
      return res.status(500).json({ error: "Failed to fetch offer analytics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
