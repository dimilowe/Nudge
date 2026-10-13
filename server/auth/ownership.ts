import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { getClerkUserId } from "./clerk";

// The signed-out demo remains usable. It never grants access to real creators.
// Public landing pages, visible offers, routing, and tracking stay public.
export async function guardCreatorResources(req: Request, res: Response, next: NextFunction) {
  const path = req.path;
  const read = req.method === "GET" || req.method === "HEAD";
  const write = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
  const pageIds: string[] = [];
  const creatorIds: string[] = [];
  const text = (value: unknown) => typeof value === "string" ? value : "";
  try {
    if (path === "/pages" && (read || req.method === "POST")) {
      creatorIds.push(text(read ? req.query.creatorId : req.body?.creatorId));
    } else if (/^\/pages\/[^/]+(?:\/content)?$/.test(path) && write) {
      const page = await storage.getNudgPage(decodeURIComponent(path.split("/")[2]));
      if (!page) return res.status(404).json({ error: "Page not found." });
      creatorIds.push(page.creatorId);
      if (req.body?.creatorId !== undefined) creatorIds.push(text(req.body.creatorId));
    } else if (path === "/offers/reorder" && write) {
      if (!Array.isArray(req.body?.offerIds) || req.body.offerIds.length > 500) {
        return res.status(400).json({ error: "A valid offerIds array is required." });
      }
      for (const id of req.body.offerIds) {
        const offer = await storage.getOffer(text(id));
        if (!offer) return res.status(404).json({ error: "Offer not found." });
        pageIds.push(offer.pageId);
      }
    } else if (path === "/offers" && (write || (read && req.query.includeHidden === "true"))) {
      pageIds.push(text(read ? req.query.pageId : req.body?.pageId));
    } else if (/^\/offers\/[^/]+$/.test(path) && write) {
      const offer = await storage.getOffer(decodeURIComponent(path.split("/")[2]));
      if (!offer) return res.status(404).json({ error: "Offer not found." });
      pageIds.push(offer.pageId);
      if (req.body?.pageId !== undefined) pageIds.push(text(req.body.pageId));
    } else if (["/automations", "/routing-rules"].includes(path) && (read || write)) {
      pageIds.push(text(read ? req.query.pageId : req.body?.pageId));
    } else if (/^\/(automations|routing-rules)\/[^/]+$/.test(path) && write) {
      const [, kind, id] = path.split("/");
      const record = kind === "automations"
        ? await storage.getAutomation(decodeURIComponent(id))
        : await storage.getRoutingRule(decodeURIComponent(id));
      if (!record) return res.status(404).json({ error: "Record not found." });
      pageIds.push(record.pageId);
      if (req.body?.pageId !== undefined) pageIds.push(text(req.body.pageId));
    } else if (/^\/analytics\/(page|offers|offer)\/[^/]+$/.test(path) && read) {
      const [, , kind, id] = path.split("/");
      if (kind === "offer") {
        const offer = await storage.getOffer(decodeURIComponent(id));
        if (!offer) return res.status(404).json({ error: "Offer not found." });
        pageIds.push(offer.pageId);
      } else {
        pageIds.push(decodeURIComponent(id));
      }
    } else {
      return next();
    }

    for (const id of Array.from(new Set(pageIds))) {
      if (!id) return res.status(400).json({ error: "pageId is required." });
      const page = await storage.getNudgPage(id);
      if (!page) return res.status(404).json({ error: "Page not found." });
      creatorIds.push(page.creatorId);
    }
    const userId = req.userId || (!getClerkUserId(req) ? "user-demo" : null);
    for (const id of Array.from(new Set(creatorIds))) {
      if (!id) return res.status(400).json({ error: "creatorId is required." });
      const creator = await storage.getCreator(id);
      if (!creator || creator.userId !== userId) {
        return res.status(403).json({ error: "This resource belongs to another creator." });
      }
    }
    next();
  } catch {
    res.status(500).json({ error: "Could not verify access to this resource." });
  }
}
