---
name: Persistent page media
description: Storage and delivery constraints for images shown on public creator pages.
---

Store creator-uploaded image bytes in Replit App Storage and serve them through an app-controlled route, preserving stable image URLs in page and offer records.

**Why:** App Storage buckets are private by default, while public creator pages need to load their images without making the bucket publicly accessible.

**How to apply:** Keep the app's upload URLs stable when changing storage backends. The app route should deliver public page media and preserve legacy references during migration.
