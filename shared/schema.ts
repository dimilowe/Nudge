import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, integer, timestamp, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table (creators who log in)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Creators table (profile for each creator)
export const creators = pgTable("creators", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  bio: text("bio"),
  avatar: text("avatar"),
  brandColor: text("brand_color").default("#3b82f6"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Nudge Pages (each creator can have multiple pages)
export const nudgePages = pgTable("nudge_pages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  creatorId: varchar("creator_id").notNull(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  theme: jsonb("theme"), // colors, fonts, etc.
  content: jsonb("content"), // landing page content: headline, subheadline, ctaText, heroImage, backgroundColor, etc.
  defaultOfferId: varchar("default_offer_id"),
  isPublished: boolean("is_published").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Offers (digital products, freebies, coaching, etc.)
export const offers = pgTable("offers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pageId: varchar("page_id").notNull(),
  type: text("type").notNull(), // 'freebie' | 'digital_product' | 'coaching' | 'bundle' | 'affiliate' | 'custom'
  title: text("title").notNull(),
  description: text("description"),
  cta: text("cta").notNull(),
  href: text("href").notNull(),
  imageUrl: text("image_url"),
  price: integer("price"), // in cents, nullable for freebies
  funnelStage: text("funnel_stage").notNull(), // 'lead_capture' | 'entry' | 'core' | 'premium' | 'upsell'
  displayOrder: integer("display_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Routing Rules (conditions to determine which offer to show)
export const routingRules = pgTable("routing_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pageId: varchar("page_id").notNull(),
  priority: integer("priority").default(0).notNull(), // higher = evaluated first
  offerId: varchar("offer_id").notNull(),
  conditions: jsonb("conditions").notNull(), // { trafficSource?: string[], device?: string[], intentLevel?: string[], returning?: boolean }
  isFallback: boolean("is_fallback").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Automations (behavior-triggered nudges/overlays)
export const automations = pgTable("automations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pageId: varchar("page_id").notNull(),
  name: text("name").notNull(),
  triggerType: text("trigger_type").notNull(), // 'scroll_depth' | 'time_on_page' | 'exit_intent' | 'section_view' | 'user_hesitation' | 'bottom_proximity'
  triggerConfig: jsonb("trigger_config").notNull(), // { scrollPercent?: number, seconds?: number, sectionId?: string, hesitationSeconds?: number }
  offerId: varchar("offer_id"), // which offer to show in the overlay
  overlayTemplate: text("overlay_template").notNull(), // 'popup' | 'slide_in' | 'banner' | 'toast'
  overlayContent: jsonb("overlay_content"), // custom headline, description overrides
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Visitor Sessions (track each visitor)
export const visitorSessions = pgTable("visitor_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pageId: varchar("page_id").notNull(),
  fingerprint: text("fingerprint"), // browser fingerprint
  trafficSource: text("traffic_source"), // 'tiktok' | 'instagram' | 'youtube' | 'pinterest' | 'direct' | 'email' | 'other'
  referrer: text("referrer"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  device: text("device"), // 'mobile' | 'desktop' | 'tablet'
  os: text("os"), // 'ios' | 'android' | 'windows' | 'macos' | 'other'
  intentLevel: text("intent_level"), // 'low' | 'medium' | 'high' | 'buyer'
  isReturning: boolean("is_returning").default(false).notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
});

// Visitor Events (behavior tracking)
export const visitorEvents = pgTable("visitor_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  eventType: text("event_type").notNull(), // 'page_view' | 'scroll' | 'click' | 'exit_intent' | 'automation_triggered' | 'offer_view' | 'offer_click'
  meta: jsonb("meta"), // { scrollDepth?: number, offerId?: string, automationId?: string, href?: string }
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Offer Performance (analytics aggregation)
export const offerPerformance = pgTable("offer_performance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  offerId: varchar("offer_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  trafficSource: text("traffic_source"),
  device: text("device"),
  impressions: integer("impressions").default(0).notNull(),
  clicks: integer("clicks").default(0).notNull(),
  ctr: real("ctr").default(0).notNull(), // click-through rate
  revenue: integer("revenue").default(0), // in cents
});

// Zod Schemas and Types

// Condition schema for routing rules
export const routingConditionsSchema = z.object({
  trafficSource: z.array(z.string()).optional(),
  device: z.array(z.string()).optional(),
  intentLevel: z.array(z.string()).optional(),
  returning: z.boolean().optional(),
});

// Trigger config schema
export const triggerConfigSchema = z.object({
  scrollPercent: z.number().optional(),
  seconds: z.number().optional(),
  sectionId: z.string().optional(),
  hesitationSeconds: z.number().optional(),
});

// Overlay content schema
export const overlayContentSchema = z.object({
  headline: z.string().optional(),
  description: z.string().optional(),
});

// Page content schemas (versioned layout system)
export const heroSectionSchema = z.object({
  type: z.literal("hero"),
  headline: z.string().default(""),
  subheadline: z.string().default(""),
  ctaText: z.string().default("Get Started"),
  ctaHref: z.string().default(""),
  heroImage: z.string().optional(),
  backgroundColor: z.string().default("gradient"), // 'gradient' | 'solid' | 'image'
  backgroundImage: z.string().optional(),
});

export const pageContentSchema = z.object({
  version: z.number().default(1),
  sections: z.array(z.discriminatedUnion("type", [heroSectionSchema])),
});

export const pageThemeSchema = z.object({
  primaryColor: z.string().default("#9333ea"), // purple
  secondaryColor: z.string().default("#3b82f6"), // blue
  accentColor: z.string().default("#ec4899"), // pink
  fontFamily: z.string().default("system-ui"),
  buttonStyle: z.enum(["rounded", "sharp", "pill"]).default("rounded"),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertCreatorSchema = createInsertSchema(creators).omit({
  id: true,
  createdAt: true,
});

export const insertNudgePageSchema = createInsertSchema(nudgePages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOfferSchema = createInsertSchema(offers).omit({
  id: true,
  createdAt: true,
});

export const insertRoutingRuleSchema = createInsertSchema(routingRules).omit({
  id: true,
  createdAt: true,
});

export const insertAutomationSchema = createInsertSchema(automations).omit({
  id: true,
  createdAt: true,
});

export const insertVisitorSessionSchema = createInsertSchema(visitorSessions).omit({
  id: true,
  startedAt: true,
  lastSeenAt: true,
});

export const insertVisitorEventSchema = createInsertSchema(visitorEvents).omit({
  id: true,
  timestamp: true,
});

export const insertOfferPerformanceSchema = createInsertSchema(offerPerformance).omit({
  id: true,
});

// API request schemas
export const sessionStartSchema = z.object({
  pageSlug: z.string(),
  fingerprint: z.string().optional(),
  referrer: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  device: z.enum(["mobile", "desktop", "tablet"]),
  os: z.string().optional(),
});

export const eventTrackSchema = z.object({
  sessionId: z.string(),
  eventType: z.enum(["page_view", "scroll", "click", "exit_intent", "automation_triggered", "offer_view", "offer_click", "category_selected", "panel_close", "user_hesitation", "bottom_proximity"]),
  meta: z.record(z.any()).optional(),
});

export const routeRequestSchema = z.object({
  sessionId: z.string(),
  pageSlug: z.string(),
});

// Form schemas
export const offerFormSchema = z.object({
  pageId: z.string(),
  type: z.enum(["freebie", "digital_product", "coaching", "bundle", "affiliate", "custom"]),
  title: z.string().min(1).max(100),
  description: z.string().optional(),
  cta: z.string().min(1).max(50),
  href: z.string().url(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  price: z.number().min(0).optional(),
  funnelStage: z.enum(["lead_capture", "entry", "core", "premium", "upsell"]),
  displayOrder: z.number().optional(),
  isActive: z.boolean().optional(),
});

export const automationFormSchema = z.object({
  pageId: z.string(),
  name: z.string().min(1).max(100),
  triggerType: z.enum(["scroll_depth", "time_on_page", "exit_intent", "section_view", "user_hesitation", "bottom_proximity"]),
  triggerConfig: triggerConfigSchema,
  offerId: z.string().optional(),
  overlayTemplate: z.enum(["popup", "slide_in", "banner", "toast"]),
  overlayContent: overlayContentSchema.optional(),
  isActive: z.boolean().optional(),
});

export const nudgePageFormSchema = z.object({
  creatorId: z.string(),
  title: z.string().min(1).max(100),
  description: z.string().optional(),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
});

export const pageContentUpdateSchema = z.object({
  content: pageContentSchema.optional(),
  theme: pageThemeSchema.optional(),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertCreator = z.infer<typeof insertCreatorSchema>;
export type Creator = typeof creators.$inferSelect;

export type InsertNudgePage = z.infer<typeof insertNudgePageSchema>;
export type NudgePage = typeof nudgePages.$inferSelect;

export type InsertOffer = z.infer<typeof insertOfferSchema>;
export type Offer = typeof offers.$inferSelect;

export type InsertRoutingRule = z.infer<typeof insertRoutingRuleSchema>;
export type RoutingRule = typeof routingRules.$inferSelect;

export type InsertAutomation = z.infer<typeof insertAutomationSchema>;
export type Automation = typeof automations.$inferSelect;

export type InsertVisitorSession = z.infer<typeof insertVisitorSessionSchema>;
export type VisitorSession = typeof visitorSessions.$inferSelect;

export type InsertVisitorEvent = z.infer<typeof insertVisitorEventSchema>;
export type VisitorEvent = typeof visitorEvents.$inferSelect;

export type InsertOfferPerformance = z.infer<typeof insertOfferPerformanceSchema>;
export type OfferPerformance = typeof offerPerformance.$inferSelect;

export type SessionStart = z.infer<typeof sessionStartSchema>;
export type EventTrack = z.infer<typeof eventTrackSchema>;
export type RouteRequest = z.infer<typeof routeRequestSchema>;
export type OfferFormData = z.infer<typeof offerFormSchema>;
export type AutomationFormData = z.infer<typeof automationFormSchema>;
export type NudgePageFormData = z.infer<typeof nudgePageFormSchema>;
export type RoutingConditions = z.infer<typeof routingConditionsSchema>;
export type TriggerConfig = z.infer<typeof triggerConfigSchema>;
export type OverlayContent = z.infer<typeof overlayContentSchema>;
export type HeroSection = z.infer<typeof heroSectionSchema>;
export type PageContent = z.infer<typeof pageContentSchema>;
export type PageTheme = z.infer<typeof pageThemeSchema>;
export type PageContentUpdate = z.infer<typeof pageContentUpdateSchema>;
