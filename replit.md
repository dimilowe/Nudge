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
- **In-Memory Storage** (`server/storage.ts`) - Maintains help cards and match logs in memory for MVP simplicity
- **JSON Seed Data** (`server/seed/help-cards.json`) - Pre-populated help cards for 6 demo intents (shopping, food, jobs, SaaS, travel, creator)

### Matching Engine (`server/services/match.ts`)
- **Exact Matching** - Checks for substring inclusion in intent phrases (case-insensitive)
- **Fuzzy Matching** - Implements Jaro-Winkler algorithm for similarity scoring (threshold ≥ 0.6)
- **Best Match Selection** - Returns highest-scoring card, prioritizing sponsored content when available

**Design Decision**: In-memory storage was chosen for MVP speed and simplicity. The storage interface (`IStorage`) is designed to be easily swapped for a database implementation (Drizzle ORM schema is already defined for PostgreSQL migration).

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

## Database (Future)
- **PostgreSQL** - Configured via Drizzle ORM but currently using in-memory storage
- **Neon Serverless** - PostgreSQL driver for serverless environments
- **Connection String** - Expects `DATABASE_URL` environment variable

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

## Future Database Integration
The codebase is prepared for PostgreSQL integration:
- Drizzle schema defined in `shared/schema.ts`
- Migration directory configured in `drizzle.config.ts`
- Storage interface allows seamless swap from in-memory to database
- Run `npm run db:push` to sync schema when database is provisioned