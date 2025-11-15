import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { creators } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  sessionStartSchema,
  eventTrackSchema,
  routeRequestSchema,
  nudgePageFormSchema,
  offerFormSchema,
  automationFormSchema,
  pageContentUpdateSchema,
  type RoutingConditions,
} from "@shared/schema";

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
  const page = await storage.getNudgePage(pageId);
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

  // ===== DEMO DATA =====
  
  // GET /api/demo - Get demo creator and first page for development
  app.get("/api/demo", async (req, res) => {
    try {
      // Get first creator (demo creator)
      const creator = await db.select().from(creators).limit(1);
      if (creator.length === 0) {
        return res.status(404).json({ error: "No creators found" });
      }
      
      // Get first page for this creator
      const pages = await storage.getNudgePagesByCreatorId(creator[0].id);
      const page = pages[0] || null;
      
      return res.json({
        creator: creator[0],
        page,
      });
    } catch (error) {
      console.error("Demo data fetch error:", error);
      return res.status(500).json({ error: "Failed to fetch demo data" });
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
      
      const pages = await storage.getNudgePagesByCreatorId(creatorId);
      return res.json({ pages });
    } catch (error) {
      console.error("Pages fetch error:", error);
      return res.status(500).json({ error: "Failed to fetch pages" });
    }
  });
  
  // GET /api/pages/:slug - Get page by slug
  app.get("/api/pages/:slug", async (req, res) => {
    try {
      const page = await storage.getNudgePageBySlug(req.params.slug);
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
      const validated = nudgePageFormSchema.parse(req.body);
      const page = await storage.createNudgePage(validated);
      return res.json({ page });
    } catch (error) {
      console.error("Page creation error:", error);
      return res.status(400).json({ error: "Failed to create page" });
    }
  });
  
  // PUT /api/pages/:id - Update a page
  app.put("/api/pages/:id", async (req, res) => {
    try {
      const page = await storage.updateNudgePage(req.params.id, req.body);
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
      const page = await storage.updateNudgePage(req.params.id, validated);
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
      const success = await storage.deleteNudgePage(req.params.id);
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
      if (!pageId) {
        return res.status(400).json({ error: "pageId required" });
      }
      
      const offers = await storage.getOffersByPageId(pageId);
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

  // ===== VISITOR TRACKING =====
  
  // POST /api/track/session - Start or update a visitor session
  app.post("/api/track/session", async (req, res) => {
    try {
      const validated = sessionStartSchema.parse(req.body);
      
      // Get the page
      const page = await storage.getNudgePageBySlug(validated.pageSlug);
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
      const page = await storage.getNudgePageBySlug(validated.pageSlug);
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
