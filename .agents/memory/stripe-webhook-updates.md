---
name: Stripe managed webhook update safety
description: Signing-secret preservation when changing Stripe webhook event subscriptions.
---

Preserve the existing managed signing-secret record when changing webhook settings. Stripe only returns a webhook signing secret at creation, not on update.

**Why:** The installed stripe-replit-sync update helper tried to upsert an update response without a signing secret, causing a NOT NULL violation after successfully updating the Stripe endpoint.

**How to apply:** Update endpoint settings through the Stripe SDK without rewriting the managed signing-secret record. Reevaluate the helper only after confirming that an upgraded package preserves the original secret. Never log raw webhook/database errors that could expose secrets.
