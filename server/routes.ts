import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { matchRequestSchema, feedbackRequestSchema } from "@shared/schema";
import { findBestMatch, extractLastWords } from "./services/match";
import * as fs from "fs";
import * as path from "path";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // CORS middleware with security-conscious origin policy
  app.use((req, res, next) => {
    const origin = req.get("origin");
    const path = req.path;
    
    // Extension endpoints - allow all origins (privacy-safe, read-only user data)
    const extensionEndpoints = ['/api/match', '/api/feedback'];
    const isExtensionEndpoint = extensionEndpoints.some(endpoint => path.startsWith(endpoint));
    
    if (origin) {
      if (isExtensionEndpoint) {
        // Allow all origins for extension functionality
        res.header("Access-Control-Allow-Origin", origin);
      } else {
        // Admin endpoints - only allow Replit domain and localhost
        const allowedAdminOrigins = [
          'https://ea5b6803-344d-47e5-8427-a61029737083-00-27nkosr42ci4h.janeway.replit.dev',
          'http://localhost:5000',
          'http://localhost:5173'
        ];
        
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

  // POST /api/match - Match user intent to help cards
  app.post("/api/match", async (req, res) => {
    try {
      const validatedRequest = matchRequestSchema.parse(req.body);
      
      // Extract last 6 words from user input
      const intentPhrase = extractLastWords(validatedRequest.text, 6);
      
      if (!intentPhrase.trim()) {
        return res.json({ matched: false, message: "No intent detected" });
      }
      
      // Get all help cards
      const cards = await storage.getAllHelpCards();
      
      // Find best match
      const matchResult = findBestMatch(intentPhrase, cards);
      
      // Log the match attempt and get the log ID
      const matchLog = await storage.createMatchLog({
        intentText: intentPhrase,
        urlOrigin: new URL(validatedRequest.url).origin,
        cardId: matchResult.cardId || null,
        matchScore: matchResult.score ? Math.round(matchResult.score * 100) : null,
        wasHelpful: null,
        clickedType: null,
        variant: matchResult.variant || null,
      });
      
      // Include logId in response so client can send it back with feedback
      return res.json({ ...matchResult, logId: matchLog.id });
      
    } catch (error) {
      console.error("Match error:", error);
      return res.status(400).json({ 
        matched: false, 
        error: "Invalid request format" 
      });
    }
  });

  // POST /api/feedback - Record user feedback
  app.post("/api/feedback", async (req, res) => {
    try {
      const feedback = feedbackRequestSchema.parse(req.body);
      
      // First, fetch the match log to verify cardId matches
      const logs = await storage.getMatchLogs(1000);
      const matchLog = logs.find(log => log.id === feedback.logId);
      
      if (!matchLog) {
        return res.status(404).json({ 
          success: false, 
          error: "Match log not found" 
        });
      }
      
      // Verify cardId matches to prevent spoofing
      if (matchLog.cardId !== feedback.cardId) {
        return res.status(400).json({ 
          success: false, 
          error: "Card ID mismatch" 
        });
      }
      
      // Update only the feedback-specific fields
      const updatedLog = await storage.updateMatchLog(feedback.logId, {
        wasHelpful: feedback.wasHelpful,
        clickedType: feedback.clicked || null,
      });
      
      if (!updatedLog) {
        return res.status(500).json({ 
          success: false, 
          error: "Failed to update match log" 
        });
      }
      
      return res.json({ 
        success: true, 
        message: "Feedback recorded" 
      });
      
    } catch (error) {
      console.error("Feedback error:", error);
      return res.status(400).json({ 
        success: false, 
        error: "Invalid feedback format" 
      });
    }
  });

  // POST /api/reload - Hot-reload help cards from JSON (dev only)
  app.post("/api/reload", async (req, res) => {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ 
        success: false, 
        error: "Reload not available in production" 
      });
    }
    
    try {
      const cardsLoaded = await storage.reloadHelpCardsFromJSON();
      
      return res.json({
        success: true,
        cardsLoaded,
        message: "Help cards reloaded successfully"
      });
      
    } catch (error) {
      console.error("Reload error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to reload help cards"
      });
    }
  });

  // GET /api/cards - List all help cards (for admin)
  app.get("/api/cards", async (req, res) => {
    try {
      const cards = await storage.getAllHelpCards();
      return res.json({ success: true, cards });
    } catch (error) {
      console.error("Cards list error:", error);
      return res.status(500).json({ 
        success: false, 
        error: "Failed to fetch help cards" 
      });
    }
  });

  // GET /api/logs - Get recent match logs (for admin)
  app.get("/api/logs", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const logs = await storage.getMatchLogs(limit);
      return res.json({ success: true, logs });
    } catch (error) {
      console.error("Logs fetch error:", error);
      return res.status(500).json({ 
        success: false, 
        error: "Failed to fetch logs" 
      });
    }
  });

  // GET /api/analytics - Get analytics data
  app.get("/api/analytics", async (req, res) => {
    try {
      const analytics = await storage.getAnalytics();
      return res.json({ success: true, data: analytics });
    } catch (error) {
      console.error("Analytics fetch error:", error);
      return res.status(500).json({ 
        success: false, 
        error: "Failed to fetch analytics" 
      });
    }
  });

  // GET /api/analytics/variants - Get A/B test variant analytics
  app.get("/api/analytics/variants", async (req, res) => {
    try {
      const variantAnalytics = await storage.getVariantAnalytics();
      return res.json({ success: true, data: variantAnalytics });
    } catch (error) {
      console.error("Variant analytics fetch error:", error);
      return res.status(500).json({ 
        success: false, 
        error: "Failed to fetch variant analytics" 
      });
    }
  });

  // POST /api/cards - Create a new help card
  app.post("/api/cards", async (req, res) => {
    try {
      const card = await storage.createHelpCard(req.body);
      return res.json({ success: true, card });
    } catch (error) {
      console.error("Card creation error:", error);
      return res.status(400).json({ 
        success: false, 
        error: "Failed to create help card" 
      });
    }
  });

  // PUT /api/cards/:id - Update a help card
  app.put("/api/cards/:id", async (req, res) => {
    try {
      const card = await storage.updateHelpCard(req.params.id, req.body);
      if (!card) {
        return res.status(404).json({ 
          success: false, 
          error: "Help card not found" 
        });
      }
      return res.json({ success: true, card });
    } catch (error) {
      console.error("Card update error:", error);
      return res.status(400).json({ 
        success: false, 
        error: "Failed to update help card" 
      });
    }
  });

  // DELETE /api/cards/:id - Delete a help card
  app.delete("/api/cards/:id", async (req, res) => {
    try {
      const success = await storage.deleteHelpCard(req.params.id);
      if (!success) {
        return res.status(404).json({ 
          success: false, 
          error: "Help card not found" 
        });
      }
      return res.json({ success: true, message: "Card deleted successfully" });
    } catch (error) {
      console.error("Card deletion error:", error);
      return res.status(500).json({ 
        success: false, 
        error: "Failed to delete help card" 
      });
    }
  });

  // POST /api/campaigns - Create a new campaign
  app.post("/api/campaigns", async (req, res) => {
    try {
      const campaign = await storage.createCampaign(req.body);
      return res.json({ success: true, campaign });
    } catch (error) {
      console.error("Campaign creation error:", error);
      return res.status(400).json({ 
        success: false, 
        error: "Failed to create campaign" 
      });
    }
  });

  // GET /api/campaigns/advertiser/:advertiserId - Get campaigns by advertiser
  app.get("/api/campaigns/advertiser/:advertiserId", async (req, res) => {
    try {
      const campaigns = await storage.getCampaignsByAdvertiser(req.params.advertiserId);
      return res.json({ success: true, campaigns });
    } catch (error) {
      console.error("Campaigns fetch error:", error);
      return res.status(500).json({ 
        success: false, 
        error: "Failed to fetch campaigns" 
      });
    }
  });

  // PUT /api/campaigns/:id - Update a campaign
  app.put("/api/campaigns/:id", async (req, res) => {
    try {
      const campaign = await storage.updateCampaign(req.params.id, req.body);
      if (!campaign) {
        return res.status(404).json({ 
          success: false, 
          error: "Campaign not found" 
        });
      }
      return res.json({ success: true, campaign });
    } catch (error) {
      console.error("Campaign update error:", error);
      return res.status(400).json({ 
        success: false, 
        error: "Failed to update campaign" 
      });
    }
  });

  // GET /download-extension - Download Chrome extension archive
  app.get("/download-extension", (req, res) => {
    const filePath = path.join(process.cwd(), "intent-assistant-extension.tar.gz");
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Extension file not found" });
    }
    
    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', 'attachment; filename="intent-assistant-extension.tar.gz"');
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  });

  const httpServer = createServer(app);
  return httpServer;
}
