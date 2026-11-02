import type { Express, Request, Response, NextFunction } from "express";
import type Stripe from "stripe";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { users } from "@shared/schema";
import { storage } from "./storage";
import { isAuthenticated } from "./auth/clerk";
import { getUncachableStripeClient } from "./stripeClient";
import { isCreatorBillingRoute, PLAN_AMOUNT, PLAN_LOOKUP_KEY, summarizeBilling, TRIAL_DAYS } from "./services/billing-policy";
import { billingRequestOrigin } from "./services/billing-origin";

async function getPlan(stripe: Stripe) {
  const result = await stripe.prices.list({ active: true, lookup_keys: [PLAN_LOOKUP_KEY], expand: ["data.product"] });
  const price = result.data[0];
  const product = price?.product as Stripe.Product | undefined;
  if (!price || !price.livemode || price.unit_amount !== PLAN_AMOUNT || price.currency !== "usd" ||
      price.recurring?.interval !== "month" || price.recurring.interval_count !== 1 || !product?.active ||
      product.metadata.nudgPlan !== "all_access") {
    throw new Error("The live Nudg $22 monthly plan has not been configured.");
  }
  return price;
}

async function subscriptionsFor(stripe: Stripe, customerId: string | null, userId: string) {
  if (!customerId) return [];
  const subscriptions: Stripe.Subscription[] = [];
  for await (const sub of stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 })) {
    if (sub.metadata.nudgUserId === userId && sub.metadata.nudgPlan === "all_access" && sub.livemode) subscriptions.push(sub);
  }
  return subscriptions;
}

export async function getBillingStatus(userId: string) {
  const user = await storage.getUser(userId);
  if (!user) throw new Error("Account not found.");
  // Authoritative reads also prevent webhook delays/outages from extending trials
  // or locking a customer out immediately after a successful Checkout.
  const stripe = await getUncachableStripeClient();
  return summarizeBilling(await subscriptionsFor(stripe, user.stripeCustomerId, userId), user.stripeCustomerId);
}

export async function guardBilling(req: Request, res: Response, next: NextFunction) {
  if (!isCreatorBillingRoute(req.path, req.method, req.query)) return next();
  if (!req.userId) return res.status(401).json({ error: "Sign in to start your 14-day trial." });
  try {
    const billing = await getBillingStatus(req.userId);
    if (!billing.hasAccess) return res.status(402).json({ error: "A trial or active subscription is required.", code: "billing_required", billingUrl: "/pricing" });
    next();
  } catch {
    res.status(503).json({ error: "Billing access could not be verified. Please retry." });
  }
}

const checkoutRequests = new Map<string, { origin: string; task: Promise<string> }>();

async function startCheckout(userId: string, origin: string) {
  const stripe = await getUncachableStripeClient();
  const price = await getPlan(stripe);
  const user = await storage.getUser(userId);
  if (!user) throw new Error("Account not found.");
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      ...(user.email ? { email: user.email } : {}),
      metadata: { nudgUserId: userId },
    }, { idempotencyKey: `nudg-customer-${userId}` });
    customerId = customer.id;
    await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, userId));
  }
  const subscriptions = await subscriptionsFor(stripe, customerId, userId);
  // Unpaid and incomplete subscriptions must be repaired via the portal rather
  // than creating another recurring charge.
  if (subscriptions.some(s => !["canceled", "incomplete_expired"].includes(s.status))) {
    throw new Error("You already have a subscription. Use Manage billing to update it.");
  }
  const trialEligible = subscriptions.length === 0;
  const open = await stripe.checkout.sessions.list({ customer: customerId, limit: 100 });
  const successUrl = `${origin}/pricing?checkout=success`;
  const cancelUrl = `${origin}/pricing?checkout=canceled`;
  let existing: Stripe.Checkout.Session | undefined;
  for (const session of open.data) {
    if (session.status !== "open" || session.metadata?.nudgUserId !== userId ||
        session.metadata.nudgPlan !== "all_access") continue;
    if (!existing && session.success_url === successUrl && session.cancel_url === cancelUrl &&
        session.metadata.trialEligible === String(trialEligible)) {
      existing = session;
    } else {
      // An old open session may point to the other domain. Expire it before
      // replacing it so it cannot later create a second subscription.
      await stripe.checkout.sessions.expire(session.id);
    }
  }
  if (existing?.url) return existing.url;
  const checkoutVersion = createHash("sha256").update(JSON.stringify({
    origin, subscriptions: subscriptions.map(s => s.id).sort(), previous: open.data[0]?.id || null,
    day: new Date().toISOString().slice(0, 10),
  })).digest("hex");
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: price.id, quantity: 1 }],
    payment_method_types: ["card"],
    payment_method_collection: trialEligible ? "if_required" : "always",
    client_reference_id: userId,
    metadata: { nudgUserId: userId, nudgPlan: "all_access", trialEligible: String(trialEligible) },
    subscription_data: {
      metadata: { nudgUserId: userId, nudgPlan: "all_access" },
      ...(trialEligible ? { trial_period_days: TRIAL_DAYS, trial_settings: { end_behavior: { missing_payment_method: "cancel" as const } } } : {}),
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    custom_text: { submit: { message: trialEligible
      ? "14 days free. No card required. Add a payment method in Manage billing to continue at $22/month; otherwise your trial ends without a charge. Your published links stay live."
      : "Nudg All Access is $22/month. Cancel anytime in Manage billing. Your published links stay live if your subscription ends." } },
  }, { idempotencyKey: `nudg-checkout-v2-${userId}-${checkoutVersion}` });
  if (!session.url) throw new Error("Stripe did not return a Checkout URL.");
  return session.url;
}

export function registerBillingRoutes(app: Express) {
  app.get("/api/stripe/products", async (_req, res) => {
    try {
      const stripe = await getUncachableStripeClient();
      const price = await getPlan(stripe);
      const product = price.product as Stripe.Product;
      res.json({ products: [{ id: product.id, name: product.name, description: product.description,
        prices: [{ id: price.id, unit_amount: price.unit_amount, currency: price.currency, recurring: price.recurring }] }] });
    } catch {
      res.status(503).json({ error: "Live pricing is not configured yet." });
    }
  });
  app.get("/api/stripe/subscription", isAuthenticated, async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    try { res.json(await getBillingStatus(req.userId!)); }
    catch { res.status(503).json({ error: "Billing is temporarily unavailable. Please retry." }); }
  });
  app.post("/api/stripe/create-checkout", isAuthenticated, async (req, res) => {
    let request: { origin: string; task: Promise<string> } | undefined;
    let awaitingRequest = false;
    try {
      const origin = billingRequestOrigin(req.headers);
      request = checkoutRequests.get(req.userId!);
      if (request && request.origin !== origin) {
        return res.status(409).json({ error: "Checkout is already opening on another Nudg domain. Please retry here in a moment." });
      }
      if (!request) {
        request = { origin, task: startCheckout(req.userId!, origin) };
        checkoutRequests.set(req.userId!, request);
      }
      awaitingRequest = true;
      res.json({ url: await request.task });
    } catch (error) {
      const message = error instanceof Error && error.message.startsWith("You already")
        ? error.message : "Live checkout is unavailable. Please retry or contact Nudg support.";
      res.status(message.startsWith("You already") ? 409 : 503).json({ error: message });
    } finally {
      if (awaitingRequest && checkoutRequests.get(req.userId!) === request) {
        checkoutRequests.delete(req.userId!);
      }
    }
  });
  app.post("/api/stripe/portal", isAuthenticated, async (req, res) => {
    try {
      const origin = billingRequestOrigin(req.headers);
      const user = await storage.getUser(req.userId!);
      if (!user?.stripeCustomerId) return res.status(400).json({ error: "Start your trial before managing billing." });
      const stripe = await getUncachableStripeClient();
      const configurations = await stripe.billingPortal.configurations.list({ active: true, limit: 100 });
      const configuration = configurations.data.find(c => c.metadata?.nudgPlan === "all_access");
      if (!configuration) throw new Error("Nudg billing portal is not configured.");
      const session = await stripe.billingPortal.sessions.create({ customer: user.stripeCustomerId, configuration: configuration.id, return_url: `${origin}/pricing` });
      res.json({ url: session.url });
    } catch { res.status(503).json({ error: "Billing management is temporarily unavailable." }); }
  });
}
