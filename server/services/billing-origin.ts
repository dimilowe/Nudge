import type { IncomingHttpHeaders } from "node:http";
import { getClerkProxyHost } from "../middlewares/clerkProxyMiddleware";

export function billingRequestOrigin(
  headers: IncomingHttpHeaders,
  env: Record<string, string | undefined> = process.env,
) {
  const domains = [
    ...(env.REPLIT_DOMAINS || "").split(","),
    env.REPLIT_DEV_DOMAIN || "",
    ...(env.BILLING_ALLOWED_ORIGINS || "").split(","),
  ].filter(Boolean);
  const allowed = new Set(domains.map(domain => {
    const value = domain.trim();
    return new URL(value.includes("://") ? value : `https://${value}`).origin;
  }));
  const host = getClerkProxyHost({ headers });
  if (!host || /[\/\\@?#\s]/.test(host)) throw new Error("Invalid billing host.");
  const origin = new URL(`https://${host}`).origin;
  if (!allowed.has(origin)) throw new Error("Billing host is not configured.");
  // A browser POST must come from the same origin as the authenticated request.
  if (headers.origin && headers.origin !== origin) throw new Error("Billing origin does not match.");
  return origin;
}
