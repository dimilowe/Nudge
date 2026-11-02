---
name: Billing domains and browser sessions
description: Why checkout and billing return paths must preserve the visitor's starting domain.
---

Keep authentication and billing on the public host the visitor is already using, rather than canonicalizing them to another Nudg host mid-flow.

**Why:** A live trial completed successfully in Stripe but the visitor returned signed out and saw a misleading pending-confirmation screen. Nudg has multiple public hosts; browser sign-in sessions must not be assumed to carry between them. Cross-host return routing was a plausible contributor, not conclusively established from telemetry.

**How to apply:** Preserve the starting host across checkout, cancellation and billing-portal returns, with explicit approved-origin validation. If the visitor returns signed out, restore their sign-in before checking access or offering a new checkout. Never interpret a success query parameter alone as proof of access.
