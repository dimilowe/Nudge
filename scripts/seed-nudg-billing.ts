import { getUncachableStripeClient } from "../server/stripeClient";
import { PLAN_AMOUNT, PLAN_LOOKUP_KEY } from "../server/services/billing-policy";

export async function seedNudgBilling() {
  const stripe = await getUncachableStripeClient();
  const products = await stripe.products.search({ query: "active:'true' AND metadata['nudgPlan']:'all_access'" });
  let product = products.data[0];
  if (!product) {
    product = await stripe.products.create({
      name: "Nudg All Access",
      description: "All of Nudg: landing pages, offers, routing, automations, split testing and analytics. $22/month with a 14-day free trial.",
      metadata: { nudgPlan: "all_access" },
    }, { idempotencyKey: "nudg-all-access-product" });
  }
  const prices = await stripe.prices.list({ lookup_keys: [PLAN_LOOKUP_KEY], limit: 100 });
  let price = prices.data[0];
  if (!price) {
    price = await stripe.prices.create({
      product: product.id, currency: "usd", unit_amount: PLAN_AMOUNT,
      recurring: { interval: "month" }, lookup_key: PLAN_LOOKUP_KEY,
      metadata: { nudgPlan: "all_access" },
    }, { idempotencyKey: "nudg-all-access-monthly-2200" });
  }
  if (!price.active || !price.livemode || price.unit_amount !== PLAN_AMOUNT || price.product !== product.id ||
    price.currency !== "usd" || price.recurring?.interval !== "month" || price.recurring.interval_count !== 1) {
    throw new Error("Existing Nudg price does not match the live $22/month plan. No pricing was changed.");
  }
  const configs = await stripe.billingPortal.configurations.list({ active: true, limit: 100 });
  if (!configs.data.some(c => c.metadata?.nudgPlan === "all_access")) {
    await stripe.billingPortal.configurations.create({
      business_profile: { headline: "Manage your Nudg subscription" },
      features: {
        payment_method_update: { enabled: true },
        invoice_history: { enabled: true },
        subscription_cancel: { enabled: true, mode: "at_period_end" },
        customer_update: { enabled: true, allowed_updates: ["email", "address"] },
      },
      metadata: { nudgPlan: "all_access" },
    }, { idempotencyKey: "nudg-all-access-portal" });
  }
  console.log(JSON.stringify({ configured: true, live: price.livemode, plan: product.name, monthlyUsd: price.unit_amount! / 100, productId: product.id, priceId: price.id }));
}

seedNudgBilling().catch(() => {
  // Stripe errors can contain credential fragments. Never print raw errors.
  console.error("Live Stripe billing setup failed. Check the live application connection and API permissions.");
  process.exitCode = 1;
});
