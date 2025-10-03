# Overview

This project is an "Intent Assistant" MVP - a privacy-focused Chrome extension that captures user typing intent and provides contextual help through both sponsored (paid) and organic (free) resources. The system matches user keystrokes to a curated database of help cards and displays relevant suggestions in an unobtrusive toast overlay.

The application consists of three main components:
1. **Chrome Extension** - Captures user typing intent and displays results
2. **Backend API** - Matches intent phrases to help cards using fuzzy matching
3. **Demo Web Application** - Tests the matching service in a browser environment

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

### Chrome Extension (Manifest V3)
- **Content Script** (`extension/src/content.ts`) - Monitors text input across all web pages, debounces keystroke capture (500ms), and extracts the last 6 words as intent phrases
- **Background Service Worker** (`extension/src/background.ts`) - Manages context menus and category toggles
- **Popup Interface** (`extension/popup/`) - Provides settings UI for managing enabled categories and suppressed sites
- **Shadow DOM Overlay** (`extension/src/overlay.tsx`) - Renders toast notifications isolated from host page styles to prevent conflicts
- **Local Storage** (`extension/src/storage.ts`) - Persists user preferences (suppressed sites, enabled categories) using Chrome Storage API with localStorage fallback

### Demo Web Application
- **React + Vite** - Single-page application for testing the match API
- **Wouter** - Lightweight client-side routing
- **shadcn/ui Components** - Pre-built UI components with Radix UI primitives
- **Tailwind CSS** - Utility-first styling with custom theme variables
- **TypeScript** - Type-safe development across the entire frontend

**Design Decision**: Shadow DOM isolation prevents the extension overlay from being affected by or affecting the host page's CSS, ensuring consistent appearance across all websites.

## Backend Architecture

### Express Server
- **RESTful API** (`server/routes.ts`) - Handles match requests and feedback logging
- **PostgreSQL Storage** (`server/storage.ts`) - Persists help cards and match logs using Drizzle ORM with Neon serverless PostgreSQL
- **Database Layer** (`server/db.ts`) - Drizzle ORM connection configured with DATABASE_URL environment variable
- **JSON Seed Data** (`server/seed/help-cards.json`) - Pre-populated help cards for 6 demo intents (shopping, food, jobs, SaaS, travel, creator)

### Matching Engine (`server/services/match.ts`)
- **Exact Matching** - Checks for substring inclusion in intent phrases (case-insensitive)
- **Fuzzy Matching** - Implements Jaro-Winkler algorithm for similarity scoring (threshold ≥ 0.6)
- **Best Match Selection** - Returns highest-scoring card, prioritizing sponsored content when available

**Design Decision**: Migrated from in-memory to PostgreSQL database (Oct 3, 2025) to enable analytics, admin panel, and persistent data. The storage interface (`IStorage`) allows seamless swapping between implementations. Database automatically seeds 6 help cards from JSON on first startup.

## Data Models

### Help Card Schema
```typescript
{
  id: string
  intentPhrases: string[]  // Keywords and aliases
  category: "shopping" | "food" | "jobs" | "saas" | "travel" | "creator"
  sponsored?: {
    title: string
    subtitle?: string
    cta: string
    href: string
    brand: string
  }
  organic: {
    title: string
    subtitle?: string
    cta: string
    href: string
    source: string
  }
}
```

### Match Log Schema
```typescript
{
  id: string
  intentText: string
  urlOrigin: string
  cardId?: string
  matchScore?: number
  wasHelpful?: boolean
  clickedType?: "sponsored" | "organic"
  timestamp: Date
}
```

**Design Decision**: Match logs track user engagement without storing full text or personal data, maintaining privacy while enabling analytics.

## Privacy & Security

### Data Minimization
- Only extracts last 6 words from user input
- Sends URL origin (not full URL) to prevent path/query parameter leakage
- No persistent user identification or tracking

### User Control
- Per-site suppression ("Don't show this again for this site")
- Category-level opt-out via extension popup
- 15-second rate limiting between toast displays

### CORS Configuration
- Backend allows `chrome-extension://` origins for extension requests
- Content Security Policy enforced via Manifest V3

**Design Decision**: Privacy-first approach limits data collection to absolute minimum needed for functionality, giving users granular control over when and where suggestions appear.

# External Dependencies

## Database
- **PostgreSQL** - Production database using Drizzle ORM for type-safe queries
- **Neon Serverless** - PostgreSQL driver for serverless environments (@neondatabase/serverless)
- **Connection String** - Uses `DATABASE_URL` environment variable
- **Auto-initialization** - Database seeds from JSON file on first startup if empty
- **Schema Management** - Run `npm run db:push` to sync schema changes (never write manual migrations)

## Third-Party Services
- **Chrome Extension API** - For content scripts, storage, and context menus
- **None Currently Active** - MVP operates entirely client-side and self-hosted

## Build & Development Tools
- **Vite** - Frontend build tool and dev server
- **esbuild** - Server-side bundling
- **TypeScript** - Type checking (strict mode enabled)
- **Drizzle Kit** - Database migration tooling (configured but unused in MVP)

## UI Libraries
- **Radix UI** - Unstyled accessible component primitives (accordion, dialog, dropdown, etc.)
- **shadcn/ui** - Pre-styled component library built on Radix
- **Tailwind CSS** - Utility-first CSS framework
- **class-variance-authority** - Type-safe component variants
- **Lucide React** - Icon library

## State Management
- **TanStack Query** - Server state management and caching
- **React Hook Form** - Form state and validation
- **Zod** - Runtime type validation and schema definition

**Design Decision**: Radix UI + shadcn provides accessible, customizable components without heavy framework lock-in. TanStack Query handles API caching efficiently for the demo app.

## Recent Changes (Oct 3, 2025)
**Phase 1 - Database Migration** (Completed):
- Migrated from MemStorage to DbStorage using PostgreSQL
- All help cards and match logs now persist across server restarts
- Database automatically initializes with 6 seeded help cards from JSON
- Storage interface unchanged - all existing API endpoints work identically
- Match logs now permanently tracked for analytics dashboard

**Phase 2 - Analytics Dashboard** (Completed):
- Created `/analytics` page showing KPIs, top cards, category performance, user intents, timeline
- Calculates real metrics from database: total matches, successful matches, CTR, avg match score
- Charts use Recharts library for visualizations
- All analytics calculated from actual match_logs data

**Phase 3 - Admin Panel** (Completed):
- Created `/admin` page for managing help cards
- Full CRUD operations: create, edit, delete help cards
- Test matching dialog for live testing without extension
- Toast notifications for user feedback
- All operations persist to PostgreSQL via Drizzle ORM

**Phase 4 - A/B Testing Framework** (Completed):
- Added `variant` column to match_logs table
- Match API randomly assigns variants: control, compact, detailed
- Match API returns `logId` for precise feedback tracking
- Feedback API validates both logId and cardId (prevents spoofing/corruption)
- Variant analytics endpoint (`/api/analytics/variants`) calculates per-variant metrics
- Analytics dashboard shows variant comparison: impressions, CTR, feedback rate
- All data integrity bugs fixed (no duplicates, correct log updates, validation)