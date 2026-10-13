export const PLAN_LOOKUP_KEY = "nudg_all_access_monthly";
export const PLAN_AMOUNT = 2200;
export const TRIAL_DAYS = 14;

export interface SubscriptionSummary {
  id: string;
  status: string;
  created: number;
  trial_start: number | null;
  trial_end: number | null;
  cancel_at_period_end: boolean;
  items: { data: { current_period_end: number }[] };
}

export function summarizeBilling(subscriptions: SubscriptionSummary[], customerId: string | null, now = Date.now() / 1000) {
  const eligible = subscriptions.filter(s =>
    s.status === "active" || (s.status === "trialing" && s.trial_end !== null && s.trial_end > now),
  );
  const latest = [...(eligible.length ? eligible : subscriptions)].sort((a, b) => b.created - a.created)[0];
  return {
    hasAccess: eligible.length > 0,
    status: latest?.status === "trialing" && (latest.trial_end || 0) <= now ? "trial_expired" : latest?.status || "none",
    trialEligible: subscriptions.length === 0,
    trialEnd: latest?.trial_end ?? null,
    customerId,
    cancelAtPeriodEnd: latest?.cancel_at_period_end ?? false,
    periodEnd: latest?.items.data[0]?.current_period_end ?? null,
  };
}

// Only visitor delivery/measurement is public. Creator management requires billing.
export function isCreatorBillingRoute(path: string, method: string, query: Record<string, unknown> = {}) {
  if (path.startsWith("/stripe/") || path.startsWith("/auth/")) return false;
  if (path.startsWith("/profile/")) return true;
  if (path === "/demo" || path === "/creator" || path === "/upload/image") return true;
  if (path.startsWith("/analytics/")) return true;
  if (path.startsWith("/experiments")) return !/^\/experiments\/[^/]+\/resolve$/.test(path);
  if (path.startsWith("/automations") || path.startsWith("/routing-rules")) return true;
  if (path === "/pages") return true;
  if (path.startsWith("/pages/")) return !["GET", "HEAD"].includes(method);
  if (path.startsWith("/offers")) return !["GET", "HEAD"].includes(method) || query.includeHidden === "true";
  return false;
}
