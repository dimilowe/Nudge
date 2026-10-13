import Stripe from 'stripe';

async function credentials() {
  if (process.env.STRIPE_SECRET_KEY) {
    return { secretKey: process.env.STRIPE_SECRET_KEY, publishableKey: process.env.VITE_STRIPE_PUBLIC_KEY };
  }
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const token = process.env.REPL_IDENTITY
    ? `repl ${process.env.REPL_IDENTITY}`
    : process.env.WEB_REPL_RENEWAL ? `depl ${process.env.WEB_REPL_RENEWAL}` : null;
  if (!hostname || !token) throw new Error("Stripe application connection is unavailable.");
  const response = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=stripe`,
    { headers: { Accept: "application/json", X_REPLIT_TOKEN: token }, signal: AbortSignal.timeout(10000) },
  );
  if (!response.ok) throw new Error("Could not load Stripe application connection.");
  const data = await response.json();
  const settings = data.items?.[0]?.settings;
  if (!settings?.secret_key) throw new Error("Stripe application connection has no API credential.");
  return { secretKey: settings.secret_key as string, publishableKey: settings.publishable_key as string | undefined };
}

export async function getUncachableStripeClient() {
  const secretKey = await getStripeSecretKey();
  return new Stripe(secretKey, {
    apiVersion: '2025-08-27.basil',
    maxNetworkRetries: 1,
    timeout: 10000,
  });
}

export async function getStripePublishableKey() {
  const { publishableKey } = await credentials();
  
  if (!publishableKey) {
    throw new Error('VITE_STRIPE_PUBLIC_KEY environment variable is not set');
  }
  
  return publishableKey;
}

export async function getStripeSecretKey() {
  const { secretKey } = await credentials();
  // Live billing was explicitly requested. Never silently use a test account.
  if (!secretKey.startsWith("sk_live_") && !secretKey.startsWith("rk_live_")) {
    throw new Error("Live Stripe credentials are required for Nudg billing.");
  }
  return secretKey;
}

let stripeSync: any = null;

export async function getStripeSync() {
  if (!stripeSync) {
    const { StripeSync } = await import('stripe-replit-sync');
    const secretKey = await getStripeSecretKey();

    stripeSync = new StripeSync({
      poolConfig: {
        connectionString: process.env.DATABASE_URL!,
        max: 2,
      },
      stripeSecretKey: secretKey,
    });
  }
  return stripeSync;
}
