import {
  type User,
  type InsertUser,
  type Creator,
  type InsertCreator,
  type NudgPage,
  type InsertNudgPage,
  type Offer,
  type InsertOffer,
  type RoutingRule,
  type InsertRoutingRule,
  type Automation,
  type InsertAutomation,
  type Experiment,
  type InsertExperiment,
  type VisitorSession,
  type InsertVisitorSession,
  type VisitorEvent,
  type InsertVisitorEvent,
  type OfferPerformance,
  type InsertOfferPerformance,
} from "@shared/schema";
import { db } from "./db";
import {
  users,
  creators,
  nudgPages,
  offers,
  routingRules,
  automations,
  experiments,
  visitorSessions,
  visitorEvents,
  offerPerformance,
  offerViewTracking,
} from "@shared/schema";
import { eq, desc, and, sql, inArray } from "drizzle-orm";

export interface OfferAnalytics {
  offerId: string;
  title: string;
  type: string;
  impressions: number;
  clicks: number;
  ctr: number;
  revenue: number;
  byTrafficSource: Array<{ source: string; impressions: number; clicks: number; ctr: number }>;
  byDevice: Array<{ device: string; impressions: number; clicks: number; ctr: number }>;
}

export interface PageAnalytics {
  pageId: string;
  totalSessions: number;
  totalEvents: number;
  avgTimeOnPage: number;
  topTrafficSources: Array<{ source: string; count: number }>;
  topOffers: Array<{ offerId: string; title: string; clicks: number }>;
  deviceBreakdown: Array<{ device: string; count: number }>;
}

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Creators
  getCreator(id: string): Promise<Creator | undefined>;
  getCreatorByUserId(userId: string): Promise<Creator | undefined>;
  createCreator(creator: InsertCreator): Promise<Creator>;
  updateCreator(id: string, updates: Partial<InsertCreator>): Promise<Creator | undefined>;

  // Nudg Pages
  getNudgPage(id: string): Promise<NudgPage | undefined>;
  getNudgPageBySlug(slug: string): Promise<NudgPage | undefined>;
  getNudgPagesByCreatorId(creatorId: string): Promise<NudgPage[]>;
  createNudgPage(page: InsertNudgPage): Promise<NudgPage>;
  updateNudgPage(id: string, updates: Partial<InsertNudgPage>): Promise<NudgPage | undefined>;
  deleteNudgPage(id: string): Promise<boolean>;

  // Offers
  getOffer(id: string): Promise<Offer | undefined>;
  getOffersByPageId(pageId: string): Promise<Offer[]>;
  createOffer(offer: InsertOffer): Promise<Offer>;
  updateOffer(id: string, updates: Partial<InsertOffer>): Promise<Offer | undefined>;
  deleteOffer(id: string): Promise<boolean>;

  // Routing Rules
  getRoutingRule(id: string): Promise<RoutingRule | undefined>;
  getRoutingRulesByPageId(pageId: string): Promise<RoutingRule[]>;
  createRoutingRule(rule: InsertRoutingRule): Promise<RoutingRule>;
  updateRoutingRule(id: string, updates: Partial<InsertRoutingRule>): Promise<RoutingRule | undefined>;
  deleteRoutingRule(id: string): Promise<boolean>;

  // Automations
  getAutomation(id: string): Promise<Automation | undefined>;
  getAutomationsByPageId(pageId: string): Promise<Automation[]>;
  createAutomation(automation: InsertAutomation): Promise<Automation>;
  updateAutomation(id: string, updates: Partial<InsertAutomation>): Promise<Automation | undefined>;
  deleteAutomation(id: string): Promise<boolean>;

  // Experiments
  getExperiment(id: string): Promise<Experiment | undefined>;
  getExperimentsByCreatorId(creatorId: string): Promise<Experiment[]>;
  createExperiment(experiment: InsertExperiment): Promise<Experiment>;
  updateExperiment(id: string, updates: Partial<InsertExperiment>): Promise<Experiment | undefined>;
  deleteExperiment(id: string): Promise<boolean>;

  // Visitor Sessions
  getVisitorSession(id: string): Promise<VisitorSession | undefined>;
  createVisitorSession(session: InsertVisitorSession): Promise<VisitorSession>;
  updateVisitorSession(id: string, updates: Partial<VisitorSession>): Promise<VisitorSession | undefined>;
  getSessionsByPageId(pageId: string, limit?: number): Promise<VisitorSession[]>;
  getSessionsByExperimentId(experimentId: string): Promise<VisitorSession[]>;

  // Visitor Events
  createVisitorEvent(event: InsertVisitorEvent): Promise<VisitorEvent>;
  getEventsBySessionId(sessionId: string): Promise<VisitorEvent[]>;
  getEventsByPageId(pageId: string, limit?: number): Promise<VisitorEvent[]>;

  // Offer Performance
  recordOfferPerformance(perf: InsertOfferPerformance): Promise<OfferPerformance>;
  getOfferPerformance(offerId: string, startDate?: string, endDate?: string): Promise<OfferPerformance[]>;

  // Analytics
  getPageAnalytics(pageId: string): Promise<PageAnalytics>;
  getOfferAnalytics(offerId: string): Promise<OfferAnalytics>;

  // Offer View Tracking (for behavioral triggers)
  incrementOfferViewCount(sessionId: string, offerId: string): Promise<number>;
  getOfferViewCount(sessionId: string, offerId: string): Promise<number>;
  getOfferViewCounts(sessionId: string): Promise<Map<string, number>>;
}

export class DbStorage implements IStorage {
  // Users
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

  // Creators
  async getCreator(id: string): Promise<Creator | undefined> {
    const result = await db.select().from(creators).where(eq(creators.id, id));
    return result[0];
  }

  async getCreatorByUserId(userId: string): Promise<Creator | undefined> {
    const result = await db.select().from(creators).where(eq(creators.userId, userId));
    return result[0];
  }

  async createCreator(insertCreator: InsertCreator): Promise<Creator> {
    const result = await db.insert(creators).values(insertCreator).returning();
    return result[0];
  }

  async updateCreator(id: string, updates: Partial<InsertCreator>): Promise<Creator | undefined> {
    const result = await db
      .update(creators)
      .set(updates)
      .where(eq(creators.id, id))
      .returning();
    return result[0];
  }

  // Nudg Pages
  async getNudgPage(id: string): Promise<NudgPage | undefined> {
    const result = await db.select().from(nudgPages).where(eq(nudgPages.id, id));
    return result[0];
  }

  async getNudgPageBySlug(slug: string): Promise<NudgPage | undefined> {
    const result = await db.select().from(nudgPages).where(eq(nudgPages.slug, slug));
    return result[0];
  }

  async getNudgPagesByCreatorId(creatorId: string): Promise<NudgPage[]> {
    return await db
      .select()
      .from(nudgPages)
      .where(eq(nudgPages.creatorId, creatorId))
      .orderBy(desc(nudgPages.createdAt));
  }

  async createNudgPage(insertPage: InsertNudgPage): Promise<NudgPage> {
    const result = await db.insert(nudgPages).values(insertPage).returning();
    return result[0];
  }

  async updateNudgPage(id: string, updates: Partial<InsertNudgPage>): Promise<NudgPage | undefined> {
    const result = await db
      .update(nudgPages)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(nudgPages.id, id))
      .returning();
    return result[0];
  }

  async deleteNudgPage(id: string): Promise<boolean> {
    const result = await db.delete(nudgPages).where(eq(nudgPages.id, id)).returning();
    return result.length > 0;
  }

  // Offers
  async getOffer(id: string): Promise<Offer | undefined> {
    const result = await db.select().from(offers).where(eq(offers.id, id));
    return result[0];
  }

  async getOffersByPageId(pageId: string): Promise<Offer[]> {
    return await db
      .select()
      .from(offers)
      .where(eq(offers.pageId, pageId))
      .orderBy(offers.displayOrder);
  }

  async createOffer(insertOffer: InsertOffer): Promise<Offer> {
    const result = await db.insert(offers).values(insertOffer).returning();
    return result[0];
  }

  async updateOffer(id: string, updates: Partial<InsertOffer>): Promise<Offer | undefined> {
    const result = await db
      .update(offers)
      .set(updates)
      .where(eq(offers.id, id))
      .returning();
    return result[0];
  }

  async deleteOffer(id: string): Promise<boolean> {
    const result = await db.delete(offers).where(eq(offers.id, id)).returning();
    return result.length > 0;
  }

  // Routing Rules
  async getRoutingRule(id: string): Promise<RoutingRule | undefined> {
    const result = await db.select().from(routingRules).where(eq(routingRules.id, id));
    return result[0];
  }

  async getRoutingRulesByPageId(pageId: string): Promise<RoutingRule[]> {
    return await db
      .select()
      .from(routingRules)
      .where(eq(routingRules.pageId, pageId))
      .orderBy(desc(routingRules.priority));
  }

  async createRoutingRule(insertRule: InsertRoutingRule): Promise<RoutingRule> {
    const result = await db.insert(routingRules).values(insertRule).returning();
    return result[0];
  }

  async updateRoutingRule(id: string, updates: Partial<InsertRoutingRule>): Promise<RoutingRule | undefined> {
    const result = await db
      .update(routingRules)
      .set(updates)
      .where(eq(routingRules.id, id))
      .returning();
    return result[0];
  }

  async deleteRoutingRule(id: string): Promise<boolean> {
    const result = await db.delete(routingRules).where(eq(routingRules.id, id)).returning();
    return result.length > 0;
  }

  // Automations
  async getAutomation(id: string): Promise<Automation | undefined> {
    const result = await db.select().from(automations).where(eq(automations.id, id));
    return result[0];
  }

  async getAutomationsByPageId(pageId: string): Promise<Automation[]> {
    return await db
      .select()
      .from(automations)
      .where(eq(automations.pageId, pageId));
  }

  async createAutomation(insertAutomation: InsertAutomation): Promise<Automation> {
    const result = await db.insert(automations).values(insertAutomation).returning();
    return result[0];
  }

  async updateAutomation(id: string, updates: Partial<InsertAutomation>): Promise<Automation | undefined> {
    const result = await db
      .update(automations)
      .set(updates)
      .where(eq(automations.id, id))
      .returning();
    return result[0];
  }

  async deleteAutomation(id: string): Promise<boolean> {
    const result = await db.delete(automations).where(eq(automations.id, id)).returning();
    return result.length > 0;
  }

  // Experiments
  async getExperiment(id: string): Promise<Experiment | undefined> {
    const result = await db.select().from(experiments).where(eq(experiments.id, id));
    return result[0];
  }

  async getExperimentsByCreatorId(creatorId: string): Promise<Experiment[]> {
    return await db
      .select()
      .from(experiments)
      .where(eq(experiments.creatorId, creatorId))
      .orderBy(desc(experiments.createdAt));
  }

  async createExperiment(insertExperiment: InsertExperiment): Promise<Experiment> {
    const result = await db.insert(experiments).values(insertExperiment).returning();
    return result[0];
  }

  async updateExperiment(id: string, updates: Partial<InsertExperiment>): Promise<Experiment | undefined> {
    const result = await db
      .update(experiments)
      .set(updates)
      .where(eq(experiments.id, id))
      .returning();
    return result[0];
  }

  async deleteExperiment(id: string): Promise<boolean> {
    const result = await db.delete(experiments).where(eq(experiments.id, id)).returning();
    return result.length > 0;
  }

  // Visitor Sessions
  async getVisitorSession(id: string): Promise<VisitorSession | undefined> {
    const result = await db.select().from(visitorSessions).where(eq(visitorSessions.id, id));
    return result[0];
  }

  async createVisitorSession(insertSession: InsertVisitorSession): Promise<VisitorSession> {
    const result = await db.insert(visitorSessions).values(insertSession).returning();
    return result[0];
  }

  async updateVisitorSession(id: string, updates: Partial<VisitorSession>): Promise<VisitorSession | undefined> {
    const result = await db
      .update(visitorSessions)
      .set(updates)
      .where(eq(visitorSessions.id, id))
      .returning();
    return result[0];
  }

  async getSessionsByPageId(pageId: string, limit = 100): Promise<VisitorSession[]> {
    return await db
      .select()
      .from(visitorSessions)
      .where(eq(visitorSessions.pageId, pageId))
      .orderBy(desc(visitorSessions.startedAt))
      .limit(limit);
  }

  async getSessionsByExperimentId(experimentId: string): Promise<VisitorSession[]> {
    return await db
      .select()
      .from(visitorSessions)
      .where(eq(visitorSessions.experimentId, experimentId))
      .orderBy(desc(visitorSessions.startedAt));
  }

  // Visitor Events
  async createVisitorEvent(insertEvent: InsertVisitorEvent): Promise<VisitorEvent> {
    const result = await db.insert(visitorEvents).values(insertEvent).returning();
    return result[0];
  }

  async getEventsBySessionId(sessionId: string): Promise<VisitorEvent[]> {
    return await db
      .select()
      .from(visitorEvents)
      .where(eq(visitorEvents.sessionId, sessionId))
      .orderBy(visitorEvents.timestamp);
  }

  async getEventsByPageId(pageId: string, limit = 1000): Promise<VisitorEvent[]> {
    const sessions = await db
      .select()
      .from(visitorSessions)
      .where(eq(visitorSessions.pageId, pageId));
    
    const sessionIds = sessions.map(s => s.id);
    
    if (sessionIds.length === 0) return [];
    
    return await db
      .select()
      .from(visitorEvents)
      .where(inArray(visitorEvents.sessionId, sessionIds))
      .orderBy(desc(visitorEvents.timestamp))
      .limit(limit);
  }

  // Offer Performance
  async recordOfferPerformance(insertPerf: InsertOfferPerformance): Promise<OfferPerformance> {
    const result = await db.insert(offerPerformance).values(insertPerf).returning();
    return result[0];
  }

  async getOfferPerformance(offerId: string, startDate?: string, endDate?: string): Promise<OfferPerformance[]> {
    let query = db.select().from(offerPerformance).where(eq(offerPerformance.offerId, offerId));
    
    if (startDate || endDate) {
      const conditions = [eq(offerPerformance.offerId, offerId)];
      if (startDate) {
        conditions.push(sql`${offerPerformance.date} >= ${startDate}`);
      }
      if (endDate) {
        conditions.push(sql`${offerPerformance.date} <= ${endDate}`);
      }
      query = db.select().from(offerPerformance).where(and(...conditions));
    }
    
    return await query;
  }

  // Analytics
  async getPageAnalytics(pageId: string): Promise<PageAnalytics> {
    const sessions = await db
      .select()
      .from(visitorSessions)
      .where(eq(visitorSessions.pageId, pageId));

    const sessionIds = sessions.map(s => s.id);
    const events = sessionIds.length > 0
      ? await db
          .select()
          .from(visitorEvents)
          .where(inArray(visitorEvents.sessionId, sessionIds))
      : [];

    const trafficSourceCounts = new Map<string, number>();
    const deviceCounts = new Map<string, number>();
    sessions.forEach(session => {
      const source = session.trafficSource || 'unknown';
      trafficSourceCounts.set(source, (trafficSourceCounts.get(source) || 0) + 1);
      
      const device = session.device || 'unknown';
      deviceCounts.set(device, (deviceCounts.get(device) || 0) + 1);
    });

    const offerClickMap = new Map<string, number>();
    events.forEach(event => {
      if (event.eventType === 'offer_click' && event.meta) {
        const meta = event.meta as any;
        if (meta.offerId) {
          offerClickMap.set(meta.offerId, (offerClickMap.get(meta.offerId) || 0) + 1);
        }
      }
    });

    const pageOffers = await this.getOffersByPageId(pageId);
    const topOffers = Array.from(offerClickMap.entries())
      .map(([offerId, clicks]) => {
        const offer = pageOffers.find(o => o.id === offerId);
        return {
          offerId,
          title: offer?.title || 'Unknown',
          clicks
        };
      })
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5);

    const avgTimeOnPage = sessions.length > 0
      ? sessions.reduce((sum, session) => {
          const duration = new Date(session.lastSeenAt).getTime() - new Date(session.startedAt).getTime();
          return sum + duration;
        }, 0) / sessions.length / 1000
      : 0;

    return {
      pageId,
      totalSessions: sessions.length,
      totalEvents: events.length,
      avgTimeOnPage,
      topTrafficSources: Array.from(trafficSourceCounts.entries())
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count),
      topOffers,
      deviceBreakdown: Array.from(deviceCounts.entries())
        .map(([device, count]) => ({ device, count }))
        .sort((a, b) => b.count - a.count)
    };
  }

  async getOfferAnalytics(offerId: string): Promise<OfferAnalytics> {
    const offer = await this.getOffer(offerId);
    if (!offer) {
      throw new Error(`Offer not found: ${offerId}`);
    }

    const perfData = await this.getOfferPerformance(offerId);

    const totalImpressions = perfData.reduce((sum, p) => sum + p.impressions, 0);
    const totalClicks = perfData.reduce((sum, p) => sum + p.clicks, 0);
    const totalRevenue = perfData.reduce((sum, p) => sum + (p.revenue || 0), 0);
    const overallCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    const sourceMap = new Map<string, { impressions: number; clicks: number }>();
    const deviceMap = new Map<string, { impressions: number; clicks: number }>();

    perfData.forEach(p => {
      if (p.trafficSource) {
        const stats = sourceMap.get(p.trafficSource) || { impressions: 0, clicks: 0 };
        stats.impressions += p.impressions;
        stats.clicks += p.clicks;
        sourceMap.set(p.trafficSource, stats);
      }

      if (p.device) {
        const stats = deviceMap.get(p.device) || { impressions: 0, clicks: 0 };
        stats.impressions += p.impressions;
        stats.clicks += p.clicks;
        deviceMap.set(p.device, stats);
      }
    });

    const byTrafficSource = Array.from(sourceMap.entries())
      .map(([source, stats]) => ({
        source,
        impressions: stats.impressions,
        clicks: stats.clicks,
        ctr: stats.impressions > 0 ? (stats.clicks / stats.impressions) * 100 : 0
      }))
      .sort((a, b) => b.impressions - a.impressions);

    const byDevice = Array.from(deviceMap.entries())
      .map(([device, stats]) => ({
        device,
        impressions: stats.impressions,
        clicks: stats.clicks,
        ctr: stats.impressions > 0 ? (stats.clicks / stats.impressions) * 100 : 0
      }))
      .sort((a, b) => b.impressions - a.impressions);

    return {
      offerId,
      title: offer.title,
      type: offer.type,
      impressions: totalImpressions,
      clicks: totalClicks,
      ctr: overallCtr,
      revenue: totalRevenue,
      byTrafficSource,
      byDevice
    };
  }

  // Offer View Tracking (for behavioral triggers)
  async incrementOfferViewCount(sessionId: string, offerId: string): Promise<number> {
    // First check if record exists and if it's expired (for timeframe-based tracking)
    const existing = await db
      .select()
      .from(offerViewTracking)
      .where(
        and(
          eq(offerViewTracking.sessionId, sessionId),
          eq(offerViewTracking.offerId, offerId)
        )
      );
    
    const now = new Date();
    
    // If no existing record, create new one
    if (!existing[0]) {
      const result = await db
        .insert(offerViewTracking)
        .values({
          sessionId,
          offerId,
          viewCount: 1,
          firstViewAt: now,
          lastViewAt: now,
        })
        .returning();
      
      return result[0].viewCount;
    }
    
    // Record exists, increment count and update lastViewAt
    const result = await db
      .update(offerViewTracking)
      .set({
        viewCount: sql`${offerViewTracking.viewCount} + 1`,
        lastViewAt: now,
      })
      .where(
        and(
          eq(offerViewTracking.sessionId, sessionId),
          eq(offerViewTracking.offerId, offerId)
        )
      )
      .returning();
    
    return result[0].viewCount;
  }

  async getOfferViewCount(sessionId: string, offerId: string): Promise<number> {
    const result = await db
      .select()
      .from(offerViewTracking)
      .where(
        and(
          eq(offerViewTracking.sessionId, sessionId),
          eq(offerViewTracking.offerId, offerId)
        )
      );
    
    return result[0]?.viewCount || 0;
  }

  async getOfferViewCounts(sessionId: string): Promise<Map<string, number>> {
    const results = await db
      .select()
      .from(offerViewTracking)
      .where(eq(offerViewTracking.sessionId, sessionId));
    
    const counts = new Map<string, number>();
    results.forEach(row => {
      counts.set(row.offerId, row.viewCount);
    });
    
    return counts;
  }
}

export const storage = new DbStorage();
