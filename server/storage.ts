import { type User, type InsertUser, type HelpCard, type InsertHelpCard, type MatchLog, type InsertMatchLog, type HelpCardData } from "@shared/schema";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Help Cards
  getAllHelpCards(): Promise<HelpCard[]>;
  getHelpCard(id: string): Promise<HelpCard | undefined>;
  createHelpCard(card: InsertHelpCard): Promise<HelpCard>;
  updateHelpCard(id: string, updates: Partial<InsertHelpCard>): Promise<HelpCard | undefined>;
  deleteHelpCard(id: string): Promise<boolean>;
  
  // Match Logs
  createMatchLog(log: InsertMatchLog): Promise<MatchLog>;
  getMatchLogs(limit?: number): Promise<MatchLog[]>;
  
  // JSON Management
  reloadHelpCardsFromJSON(): Promise<number>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private helpCards: Map<string, HelpCard>;
  private matchLogs: MatchLog[];

  constructor() {
    this.users = new Map();
    this.helpCards = new Map();
    this.matchLogs = [];
    
    // Load initial help cards from JSON
    this.loadInitialHelpCards();
  }

  private async loadInitialHelpCards() {
    try {
      await this.reloadHelpCardsFromJSON();
    } catch (error) {
      console.error("Failed to load initial help cards:", error);
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAllHelpCards(): Promise<HelpCard[]> {
    return Array.from(this.helpCards.values());
  }

  async getHelpCard(id: string): Promise<HelpCard | undefined> {
    return this.helpCards.get(id);
  }

  async createHelpCard(insertCard: InsertHelpCard): Promise<HelpCard> {
    const now = new Date();
    const card: HelpCard = {
      ...insertCard,
      sponsored: insertCard.sponsored ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.helpCards.set(card.id, card);
    return card;
  }

  async updateHelpCard(id: string, updates: Partial<InsertHelpCard>): Promise<HelpCard | undefined> {
    const existing = this.helpCards.get(id);
    if (!existing) return undefined;
    
    const updated: HelpCard = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.helpCards.set(id, updated);
    return updated;
  }

  async deleteHelpCard(id: string): Promise<boolean> {
    return this.helpCards.delete(id);
  }

  async createMatchLog(insertLog: InsertMatchLog): Promise<MatchLog> {
    const log: MatchLog = {
      ...insertLog,
      cardId: insertLog.cardId ?? null,
      matchScore: insertLog.matchScore ?? null,
      wasHelpful: insertLog.wasHelpful ?? null,
      clickedType: insertLog.clickedType ?? null,
      id: randomUUID(),
      timestamp: new Date(),
    };
    this.matchLogs.push(log);
    
    // Keep only last 1000 logs to prevent memory bloat
    if (this.matchLogs.length > 1000) {
      this.matchLogs = this.matchLogs.slice(-1000);
    }
    
    return log;
  }

  async getMatchLogs(limit = 100): Promise<MatchLog[]> {
    return this.matchLogs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async reloadHelpCardsFromJSON(): Promise<number> {
    const seedPath = path.join(import.meta.dirname, "seed", "help-cards.json");
    
    if (!fs.existsSync(seedPath)) {
      throw new Error(`Help cards seed file not found: ${seedPath}`);
    }

    const jsonData = JSON.parse(fs.readFileSync(seedPath, "utf-8"));
    
    if (!Array.isArray(jsonData)) {
      throw new Error("Help cards JSON must be an array");
    }

    // Clear existing cards
    this.helpCards.clear();
    
    // Load new cards
    let loadedCount = 0;
    for (const cardData of jsonData) {
      try {
        const card: HelpCard = {
          id: cardData.id,
          intentPhrases: cardData.intentPhrases,
          category: cardData.category,
          sponsored: cardData.sponsored || null,
          organic: cardData.organic,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        this.helpCards.set(card.id, card);
        loadedCount++;
      } catch (error) {
        console.error(`Failed to load help card: ${cardData.id}`, error);
      }
    }
    
    console.log(`Reloaded ${loadedCount} help cards from JSON`);
    return loadedCount;
  }
}

export const storage = new MemStorage();
