---
name: Database source verification
description: Verifies which database the app actually uses before any migration.
---

Use Replit-managed databases and preserve current live data when moving from the external connection.

**Why:** The user wants everything managed in one place and explicitly chose to preserve current live data.

Never assume the app uses Replit-managed PostgreSQL just because a Replit SQL query returns its tables. Confirm the database pane and the app’s configured connection. Keep external source data intact until it has been backed up and imported; development and production may have different database connections.

**Why:** The Database pane identified an external `DATABASE_URL` even though a Replit SQL query also returned application tables, so treating the query as proof of the app’s source could have switched it away from live data.

**How to apply:** Verify development and production sources independently, back up each relevant source before changing connection secrets, then validate the managed database before publishing.
