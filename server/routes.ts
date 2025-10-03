import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { matchRequestSchema, feedbackRequestSchema } from "@shared/schema";
import { findBestMatch, extractLastWords } from "./services/match";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // CORS middleware for chrome extension
  app.use((req, res, next) => {
    const origin = req.get("origin");
    if (origin && origin.startsWith("chrome-extension://")) {
      res.header("Access-Control-Allow-Origin", origin);
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
      
      // Log the match attempt
      await storage.createMatchLog({
        intentText: intentPhrase,
        urlOrigin: new URL(validatedRequest.url).origin,
        cardId: matchResult.cardId || null,
        matchScore: matchResult.score ? Math.round(matchResult.score * 100) : null,
        wasHelpful: null,
        clickedType: null,
      });
      
      return res.json(matchResult);
      
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
      
      // Find the most recent match log for this card
      const recentLogs = await storage.getMatchLogs(50);
      const matchLog = recentLogs.find(log => 
        log.cardId === feedback.cardId && 
        log.wasHelpful === null
      );
      
      if (matchLog) {
        await storage.createMatchLog({
          intentText: matchLog.intentText,
          urlOrigin: matchLog.urlOrigin,
          cardId: matchLog.cardId,
          matchScore: matchLog.matchScore,
          wasHelpful: feedback.wasHelpful,
          clickedType: feedback.clicked || null,
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

  const httpServer = createServer(app);
  return httpServer;
}
