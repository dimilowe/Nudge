---
name: Page publication compatibility
description: Preserve existing public URLs when changing page publication or draft visibility.
---

Do not use the published-status flag as a new public-access gate without an explicit legacy transition.

**Why:** The original Publish button only opened an informational dialog; pages were publicly accessible even when their saved published flag was false. Blocking those records would take existing creator links offline.

**How to apply:** Publication may record a confirmed status and show a clear live/share screen. Making drafts private is separate work that must preserve already-accessible pages.
