import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { seedNudgeData } from "./seed/nudge-seed";
import { runMigrations } from 'stripe-replit-sync';
import { getStripeSync, getUncachableStripeClient } from "./stripeClient";
import type Stripe from "stripe";
import { WebhookHandlers } from "./webhookHandlers";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import { CLERK_PROXY_PATH, clerkProxyMiddleware, getClerkProxyHost } from "./middlewares/clerkProxyMiddleware";
import { attachLocalClerkUser } from "./auth/clerk";
import { guardCreatorResources } from "./auth/ownership";
import { guardBilling } from "./billing";
import { ensureClerkIdentitySchema } from "./services/clerk-accounts";

const app = express();
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
app.use(cors({ credentials: true, origin: true }));

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log('DATABASE_URL not set, skipping Stripe initialization');
    return;
  }

  try {
    console.log('Initializing Stripe schema...');
    await runMigrations({ databaseUrl });
    console.log('Stripe schema ready');

    const stripeSync = await getStripeSync();

    console.log('Setting up managed webhook...');
    const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
    // Subscribe only to events supported by the sync handler. A wildcard also
    // delivers portal/configuration events that it cannot process.
    const enabledEvents: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
      "checkout.session.completed", "checkout.session.expired",
      "customer.created", "customer.updated", "customer.deleted",
      "customer.subscription.created", "customer.subscription.updated",
      "customer.subscription.deleted", "customer.subscription.trial_will_end",
      "invoice.created", "invoice.updated", "invoice.paid", "invoice.payment_failed",
      "product.created", "product.updated", "product.deleted",
      "price.created", "price.updated", "price.deleted",
      "payment_method.attached", "payment_method.updated", "payment_method.detached",
    ];
    const { webhook, uuid } = await stripeSync.findOrCreateManagedWebhook(
      `${webhookBaseUrl}/api/stripe/webhook`,
      { enabled_events: enabledEvents, description: 'Managed Nudg billing webhook' }
    );
    if (webhook.enabled_events.length !== enabledEvents.length ||
        enabledEvents.some(event => !webhook.enabled_events.includes(event))) {
      // The sync package's update helper upserts a missing signing secret.
      // Stripe only returns that secret on creation; update through the SDK so
      // the existing managed signing-secret record remains untouched.
      const stripe = await getUncachableStripeClient();
      await stripe.webhookEndpoints.update(webhook.id, { enabled_events: enabledEvents });
    }
    console.log(`Webhook configured: ${webhook.url} (UUID: ${uuid})`);

    console.log('Syncing Stripe data...');
    stripeSync.syncBackfill()
      .then(() => console.log('Stripe data synced'))
      .catch(() => console.error('Stripe data sync failed; billing access still uses authoritative Stripe API reads.'));
  } catch (error) {
    // Raw Stripe/database errors can contain credentials or webhook secrets.
    console.error('Failed to initialize Stripe billing.', { name: error instanceof Error ? error.name : "UnknownError" });
  }
}

app.post(
  '/api/stripe/webhook/:uuid',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature' });
    }

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      if (!Buffer.isBuffer(req.body)) {
        console.error('STRIPE WEBHOOK ERROR: req.body is not a Buffer');
        return res.status(500).json({ error: 'Webhook processing error' });
      }

      const { uuid } = req.params;
      await WebhookHandlers.processWebhook(req.body as Buffer, sig, uuid);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error.message);
      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));
app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);
app.use("/api", attachLocalClerkUser, guardBilling, guardCreatorResources);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await ensureClerkIdentitySchema();
  // Initialize Stripe
  await initStripe();

  // Seed demo data
  try {
    await seedNudgeData();
  } catch (error) {
    console.error('Warning: Failed to seed data:', error);
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
