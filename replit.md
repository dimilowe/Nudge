# Overview

This project is "Nudge" - a modern link-in-bio platform with AI-powered smart routing, behavioral triggers, and A/B/C testing. The platform enables creators to build customizable landing pages with intelligent offer management, visitor tracking, and experiment-based optimization.

The application consists of:
1. **Landing Page System** - Public-facing pages with customizable themes, glass-morphism Offer Deck overlay, and smart routing.
2. **Page Builder** - Admin interface for managing pages, offers, automations, and experiments.
3. **Analytics & Tracking** - Visitor session tracking, behavioral event monitoring, and conversion analytics.
4. **Experiments Platform** - A/B/C split testing with weighted traffic assignment and real-time metrics.

# Recent Changes (December 3, 2025)

## Username/Password Authentication
- Replaced OAuth with simple username/password authentication per user request
- Users table now has `username` (unique) and `password` (bcrypt hash) fields
- Auth API routes: /api/auth/register, /api/auth/login, /api/auth/logout, /api/auth/me
- Session-based authentication using express-session with httpOnly cookies
- Passwords hashed with bcrypt (10 salt rounds) before database storage
- Landing page shows login/register forms for unauthenticated users
- Protected routes accessible only when logged in

## Previous Changes (November 17, 2025)

### Experiments Feature Implementation
- Added experiments schema with variant tracking (A/B/C), traffic split percentages, target visitors, and status management
- Implemented comprehensive experiment CRUD storage methods (create, get, getByCreatorId, update, delete)
- Added experiment API routes with robust traffic split validation:
  - GET/POST/PUT/DELETE /api/experiments for CRUD operations
  - GET /api/experiments/:id/resolve for weighted traffic assignment
- Created dedicated trafficSplitSchema with validation ensuring percentages sum to 100 and are within 0-100 bounds
- Added experimentId and variantIndex to visitorSessions table for tracking experiment participation

### Previous Enhancements
- Hidden offers feature with offer_repeat_view automation trigger
- Timeframe-aware view tracking with composite unique constraints
- Image upload system for hero and background images
- Behavioral automation triggers (scroll depth, time on page, hesitation, bottom proximity)

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

### Landing Pages (Public)
- **React + Vite**: TypeScript-based single-page application with Wouter routing.
- **Glass-Morphism Offer Deck**: Persistent, draggable, swipeable card carousel overlay displaying contextual offers.
- **Smart Routing**: AI-powered visitor routing based on traffic source, device type, and behavioral patterns.
- **Behavioral Triggers**: Automated offer display based on scroll depth, time on page, user hesitation, and bottom proximity.
- **Hidden Offers**: Offers that only appear after meeting view count thresholds within configurable timeframes.

### Page Builder (Admin)
- **shadcn/ui & Tailwind CSS**: UI components built on Radix UI primitives with utility-first styling.
- **TanStack Query**: Server state management and caching.
- **Multi-Tab Interface**: Separate tabs for Settings, Offers, Automations, and Experiments.
- **Form Validation**: React Hook Form with Zod schema validation.
- **Image Upload**: Drag-and-drop component with preview for hero and background images.

**Design Decisions**:
- Glass-morphism overlay creates modern, non-intrusive user experience.
- Behavioral automation system enables intelligent, context-aware offer presentation.
- Explicit priority order for background styles (solid, gradient, image) ensures robust visual fallback logic.
- Experiments use weighted random assignment at session creation for consistent visitor experience.

## Backend Architecture

### Express Server
- **RESTful API**: Handles page management, offer CRUD, visitor tracking, automations, experiments, and image uploads.
- **PostgreSQL Storage**: Persists all data using Drizzle ORM with Neon serverless PostgreSQL.
- **Smart Routing Engine**: Evaluates visitor attributes against routing conditions to determine optimal page variant.
- **Experiment Assignment**: Weighted random traffic distribution with variant tracking per session.
- **Image Upload System**: Multer middleware handles drag-and-drop uploads with validation.

## Data Models

### Core Entities
- **Nudge Pages**: Landing pages with slug, theme, content (hero, subheading, bio, CTAs), background styles.
- **Offers**: Cards with title, URL, image, category, hidden status, display order.
- **Automations**: Behavioral triggers (scroll_depth, time_on_page, user_hesitation, bottom_proximity, offer_repeat_view) with configurable thresholds and target offers.
- **Experiments**: A/B/C split tests with variant page IDs, traffic split percentages, target visitors, status tracking, winner selection.

### Tracking & Analytics
- **Visitor Sessions**: Tracks pageId, fingerprint, trafficSource, device, OS, intentLevel, experimentId, variantIndex.
- **Visitor Events**: Records behavioral events (page_view, offer_click, offer_dismiss, scroll, etc.) with metadata.
- **Offer View Tracking**: Composite unique constraint on (sessionId, offerId) with timeframe-aware view counting and reset logic.

### Validation & Constraints
- **Traffic Split Validation**: Dedicated trafficSplitSchema ensures each percentage is 0-100 and sum equals 100.
- **Experiment Status**: draft → running → completed, with auto-completion at target visitors.
- **Timeframe Logic**: View tracking supports timeframe-aware thresholds (e.g., "3 views in 7 days") with automatic reset on firstViewAt expiry.

## Privacy & Security
- **Minimal Data Collection**: Only essential visitor attributes (fingerprint, device, OS, traffic source).
- **Session-Based Tracking**: No personally identifiable information stored.
- **CORS Configuration**: Path-based policy allows public endpoints while restricting admin routes.

# External Dependencies

## Database
- **PostgreSQL**: Production database via Drizzle ORM.
- **Neon Serverless**: PostgreSQL driver for serverless environments.

## Build & Development Tools
- **Vite**: Frontend build tool.
- **esbuild**: Server-side bundling.
- **TypeScript**: For type-safe development.

## UI Libraries
- **Radix UI**: Unstyled accessible component primitives.
- **shadcn/ui**: Pre-styled component library built on Radix.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.
- **embla-carousel**: For swipeable card carousel in Offer Deck.

## State Management
- **TanStack Query**: Server state management and caching.
- **React Hook Form**: Form state and validation.
- **Zod**: Runtime type validation and schema definition.

# Key Implementation Patterns

## Experiments Workflow
1. Creator creates experiment with 3 variant pages and traffic split percentages
2. Experiment status set to "draft"
3. When ready, status changed to "running"
4. Visitor requests /api/experiments/:id/resolve
5. Backend assigns visitor to variant using weighted random selection
6. Returns experimentId, variantIndex, pageSlug for redirect
7. Session creation persists experimentId and variantIndex
8. Conversion tracking via offer_click events
9. Auto-completion when targetVisitors reached
10. Winner determination based on conversion metrics

## Hidden Offers Flow
1. Offer marked as isHidden=true
2. Filtered from initial page load
3. offer_repeat_view automation trigger created with threshold (e.g., 3 views in 7 days)
4. offer_view events tracked in offerViewTracking table
5. When threshold met, automation displays hidden offer
6. View count resets after timeframe expires

## Behavioral Automation
1. Client tracks behavioral events (scroll, time, hesitation)
2. Events sent to /api/track/event
3. Backend evaluates automation trigger conditions
4. Returns array of offers to display when thresholds met
5. Offer Deck overlay displays triggered offers
