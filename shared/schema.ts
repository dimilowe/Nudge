import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const helpCards = pgTable("help_cards", {
  id: varchar("id").primaryKey(),
  intentPhrases: text("intent_phrases").array().notNull(),
  category: text("category").notNull(),
  sponsored: jsonb("sponsored"),
  organic: jsonb("organic").notNull(),
  campaignId: varchar("campaign_id"), // nullable for seeded cards
  advertiserId: varchar("advertiser_id"), // nullable for seeded cards
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const matchLogs = pgTable("match_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  intentText: text("intent_text").notNull(),
  urlOrigin: text("url_origin").notNull(),
  cardId: varchar("card_id"),
  matchScore: integer("match_score"),
  wasHelpful: boolean("was_helpful"),
  clickedType: text("clicked_type"), // 'sponsored' | 'organic' | null
  variant: text("variant"), // 'control' | 'compact' | 'detailed' | null
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const campaigns = pgTable("campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  advertiserId: varchar("advertiser_id").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  budget: integer("budget").notNull(), // in cents
  spent: integer("spent").notNull().default(0), // in cents
  status: text("status").notNull().default("draft"), // 'draft' | 'active' | 'paused' | 'completed'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Help Card Types
export const sponsoredSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  cta: z.string(),
  href: z.string().url(),
  brand: z.string(),
});

export const organicSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(), 
  cta: z.string(),
  href: z.string().url(),
  source: z.string(),
});

export const helpCardSchema = z.object({
  id: z.string(),
  intentPhrases: z.array(z.string()),
  category: z.enum(["shopping", "food", "jobs", "saas", "travel", "creator"]),
  sponsored: sponsoredSchema.optional(),
  organic: organicSchema,
});

// Zod schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertHelpCardSchema = createInsertSchema(helpCards).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertMatchLogSchema = createInsertSchema(matchLogs).omit({
  id: true,
  timestamp: true,
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const matchRequestSchema = z.object({
  text: z.string().min(1).max(200),
  url: z.string().url(),
  ts: z.number(),
  locale: z.string().optional().default("en-US"),
});

export const feedbackRequestSchema = z.object({
  logId: z.string(),
  cardId: z.string(),
  wasHelpful: z.boolean(),
  clicked: z.enum(["sponsored", "organic"]).optional(),
});

export const campaignSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.enum(["shopping", "food", "jobs", "saas", "travel", "creator"]),
  budget: z.number().min(100), // minimum $1 in cents
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertHelpCard = z.infer<typeof insertHelpCardSchema>;
export type HelpCard = typeof helpCards.$inferSelect;
export type InsertMatchLog = z.infer<typeof insertMatchLogSchema>;
export type MatchLog = typeof matchLogs.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaigns.$inferSelect;
export type MatchRequest = z.infer<typeof matchRequestSchema>;
export type FeedbackRequest = z.infer<typeof feedbackRequestSchema>;
export type SponsoredContent = z.infer<typeof sponsoredSchema>;
export type OrganicContent = z.infer<typeof organicSchema>;
export type HelpCardData = z.infer<typeof helpCardSchema>;
export type CampaignFormData = z.infer<typeof campaignSchema>;
