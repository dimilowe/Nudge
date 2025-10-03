import { type User, type InsertUser, type HelpCard, type InsertHelpCard, type MatchLog, type InsertMatchLog } from "@shared/schema";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { db } from "./db";
import { users, helpCards, matchLogs } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface AnalyticsData {
  totalMatches: number;
  successfulMatches: number;
  clickThroughRate: number;
  averageMatchScore: number | null;
  topCards: Array<{ cardId: string; matchCount: number; clickCount: number; ctr: number }>;
  categoryStats: Array<{ category: string; matchCount: number; clickCount: number; ctr: number }>;
  topIntents: Array<{ intent: string; count: number }>;
  matchesByDate: Array<{ date: string; count: number }>;
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getAllHelpCards(): Promise<HelpCard[]>;
  getHelpCard(id: string): Promise<HelpCard | undefined>;
  createHelpCard(card: InsertHelpCard): Promise<HelpCard>;
  updateHelpCard(id: string, updates: Partial<InsertHelpCard>): Promise<HelpCard>;
  deleteHelpCard(id: string): Promise<boolean>;
  
  createMatchLog(log: InsertMatchLog): Promise<MatchLog>;
  getMatchLogs(limit?: number): Promise<MatchLog[]>;
  getAnalytics(): Promise<AnalyticsData>;
  
  reloadHelpCardsFromJSON(): Promise<number>;
}

export class DbStorage implements IStorage {
  constructor() {
    this.initializeHelpCards();
  }

  private async initializeHelpCards() {
    try {
      const existingCards = await db.select().from(helpCards);
      if (existingCards.length === 0) {
        console.log("No help cards found, loading from JSON...");
        await this.reloadHelpCardsFromJSON();
      } else {
        console.log(`Database initialized with ${existingCards.length} help cards`);
      }
    } catch (error) {
      console.error("Failed to initialize help cards:", error);
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async getAllHelpCards(): Promise<HelpCard[]> {
    return await db.select().from(helpCards);
  }

  async getHelpCard(id: string): Promise<HelpCard | undefined> {
    const result = await db.select().from(helpCards).where(eq(helpCards.id, id));
    return result[0];
  }

  async createHelpCard(insertCard: InsertHelpCard): Promise<HelpCard> {
    const result = await db.insert(helpCards).values(insertCard).returning();
    return result[0];
  }

  async updateHelpCard(id: string, updates: Partial<InsertHelpCard>): Promise<HelpCard | undefined> {
    const result = await db
      .update(helpCards)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(helpCards.id, id))
      .returning();
    return result[0];
  }

  async deleteHelpCard(id: string): Promise<boolean> {
    const result = await db.delete(helpCards).where(eq(helpCards.id, id)).returning();
    return result.length > 0;
  }

  async createMatchLog(insertLog: InsertMatchLog): Promise<MatchLog> {
    const result = await db.insert(matchLogs).values(insertLog).returning();
    return result[0];
  }

  async getMatchLogs(limit = 100): Promise<MatchLog[]> {
    return await db
      .select()
      .from(matchLogs)
      .orderBy(desc(matchLogs.timestamp))
      .limit(limit);
  }

  async getAnalytics(): Promise<AnalyticsData> {
    const logs = await db.select().from(matchLogs);
    const cards = await db.select().from(helpCards);
    
    const totalMatches = logs.length;
    const successfulMatches = logs.filter(log => log.cardId !== null).length;
    const logsWithClicks = logs.filter(log => log.clickedType !== null);
    const clickThroughRate = successfulMatches > 0 
      ? (logsWithClicks.length / successfulMatches) * 100 
      : 0;

    const logsWithScores = logs.filter(log => log.matchScore !== null);
    const averageMatchScore = logsWithScores.length > 0
      ? logsWithScores.reduce((sum, log) => sum + (log.matchScore || 0), 0) / logsWithScores.length
      : null;

    const cardStatsMap = new Map<string, { matchCount: number; clickCount: number }>();
    logs.forEach(log => {
      if (log.cardId) {
        const stats = cardStatsMap.get(log.cardId) || { matchCount: 0, clickCount: 0 };
        stats.matchCount++;
        if (log.clickedType) stats.clickCount++;
        cardStatsMap.set(log.cardId, stats);
      }
    });

    const topCards = Array.from(cardStatsMap.entries())
      .map(([cardId, stats]) => ({
        cardId,
        matchCount: stats.matchCount,
        clickCount: stats.clickCount,
        ctr: stats.matchCount > 0 ? (stats.clickCount / stats.matchCount) * 100 : 0
      }))
      .sort((a, b) => b.matchCount - a.matchCount)
      .slice(0, 10);

    const categoryStatsMap = new Map<string, { matchCount: number; clickCount: number }>();
    logs.forEach(log => {
      if (log.cardId) {
        const card = cards.find(c => c.id === log.cardId);
        if (card) {
          const stats = categoryStatsMap.get(card.category) || { matchCount: 0, clickCount: 0 };
          stats.matchCount++;
          if (log.clickedType) stats.clickCount++;
          categoryStatsMap.set(card.category, stats);
        }
      }
    });

    const categoryStats = Array.from(categoryStatsMap.entries())
      .map(([category, stats]) => ({
        category,
        matchCount: stats.matchCount,
        clickCount: stats.clickCount,
        ctr: stats.matchCount > 0 ? (stats.clickCount / stats.matchCount) * 100 : 0
      }))
      .sort((a, b) => b.matchCount - a.matchCount);

    const intentCountMap = new Map<string, number>();
    logs.forEach(log => {
      const intent = log.intentText.toLowerCase().trim();
      intentCountMap.set(intent, (intentCountMap.get(intent) || 0) + 1);
    });

    const topIntents = Array.from(intentCountMap.entries())
      .map(([intent, count]) => ({ intent, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const dateCountMap = new Map<string, number>();
    logs.forEach(log => {
      const date = log.timestamp.toISOString().split('T')[0];
      dateCountMap.set(date, (dateCountMap.get(date) || 0) + 1);
    });

    const matchesByDate = Array.from(dateCountMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalMatches,
      successfulMatches,
      clickThroughRate,
      averageMatchScore,
      topCards,
      categoryStats,
      topIntents,
      matchesByDate
    };
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

    await db.delete(helpCards);
    
    let loadedCount = 0;
    for (const cardData of jsonData) {
      try {
        await db.insert(helpCards).values({
          id: cardData.id,
          intentPhrases: cardData.intentPhrases,
          category: cardData.category,
          sponsored: cardData.sponsored || null,
          organic: cardData.organic,
        });
        loadedCount++;
      } catch (error) {
        console.error(`Failed to load help card: ${cardData.id}`, error);
      }
    }
    
    console.log(`Reloaded ${loadedCount} help cards from JSON`);
    return loadedCount;
  }
}

export const storage = new DbStorage();
