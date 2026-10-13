import type { Express, Request, Response, NextFunction } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { storage } from "../storage";
import { getClerkLocalUser, createClerkLocalUser } from "../services/clerk-accounts";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function getClerkUserId(req: Request): string | null {
  return getAuth(req).userId || null;
}

export async function attachLocalClerkUser(req: Request, res: Response, next: NextFunction) {
  try {
    const subject = getClerkUserId(req);
    if (subject) {
      let user = await getClerkLocalUser(subject);
      if (!user) {
        const profile = await clerkClient.users.getUser(subject);
        const email = profile.emailAddresses.find(
          (address) => address.id === profile.primaryEmailAddressId && address.verification?.status === "verified",
        )?.emailAddress;
        const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
          profile.username || email?.split("@")[0] || "Creator";
        user = await createClerkLocalUser(subject, { name, email });
      }
      req.userId = user.id;
    }
    next();
  } catch {
    res.status(503).json({ error: "Account setup is temporarily unavailable. Please try again." });
  }
}

export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (!getClerkUserId(req) || !req.userId) {
    return res.status(401).json({ error: "Sign in with Clerk to continue." });
  }
  next();
}

export function registerClerkAuthRoutes(app: Express) {
  app.get("/api/auth/me", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.userId!);
      const creator = await storage.getCreatorByUserId(req.userId!);
      if (!user) return res.status(401).json({ error: "Account not found." });
      res.setHeader("Cache-Control", "no-store");
      res.json({ id: user.id, username: creator?.name || "Creator", email: user.email });
    } catch {
      res.status(500).json({ error: "Could not load your account." });
    }
  });

  // These endpoints cannot establish a session anymore.
  app.post(["/api/auth/login", "/api/auth/register"], (_req, res) => {
    res.status(410).json({ error: "Sign-in has moved to Clerk. Use /sign-in or /sign-up." });
  });
}
