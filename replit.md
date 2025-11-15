# Overview

This project is an "Intent Assistant" MVP – a privacy-focused Chrome extension that captures user typing intent and provides contextual help through both sponsored and organic resources. The system matches user keystrokes to a curated database of help cards and displays relevant suggestions. It also includes a robust backend API and a demo web application for testing. Recent enhancements include an "Offer Deck" with behavioral automation and an image upload system for hero and background images.

The application consists of three main components:
1. **Chrome Extension** - Captures user typing intent and displays results in a persistent, draggable "Offer Deck".
2. **Backend API** - Matches intent phrases to help cards, manages campaigns and automations, and handles image uploads.
3. **Demo Web Application** - Tests the matching service, provides an admin panel for managing help cards, campaigns, and automations, and a page builder for creating automated offers.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

### Chrome Extension (Manifest V3)
- **Content Script**: Monitors text input, extracts intent phrases, and triggers the Offer Deck.
- **Background Service Worker**: Manages context menus and category toggles.
- **Popup Interface**: Provides settings UI for managing enabled categories and suppressed sites.
- **Shadow DOM Overlay**: Renders the "Offer Deck" overlay, isolated from host page styles.
- **Local Storage**: Persists user preferences and panel position using Chrome Storage API.
- **Offer Deck**: A persistent, draggable, swipeable card carousel displaying up to 5 offers, with category filtering and behavioral automation triggers.

### Demo Web Application
- **React + Vite**: Single-page application using TypeScript for type-safe development.
- **shadcn/ui & Tailwind CSS**: UI components built on Radix UI primitives with utility-first styling.
- **TanStack Query**: Server state management and caching.
- **Page Builder**: UI for managing automations (full CRUD), including conditional inputs and form validation.
- **Image Upload Component**: Drag-and-drop image upload with preview, integrated into the Page Builder for hero and background images.

**Design Decisions**:
- Shadow DOM isolation ensures consistent extension overlay appearance.
- Path-based CORS policies secure admin endpoints while allowing extension functionality on any website.
- The persistent "Offer Deck" replaces intrusive toasts, improving user experience and engagement.
- Behavioral automation system triggers the Offer Deck based on user actions (scroll depth, time on page, hesitation, bottom proximity).
- Explicit priority order for background styles (solid, gradient, image) ensures robust visual fallback logic.

## Backend Architecture

### Express Server
- **RESTful API**: Handles match requests, feedback logging, campaign management, automation management, and image uploads.
- **PostgreSQL Storage**: Persists help cards, match logs, campaigns, and automations using Drizzle ORM with Neon serverless PostgreSQL.
- **Matching Engine**: Implements exact and fuzzy matching (Jaro-Winkler) for intent phrases, prioritizing sponsored content.
- **Image Upload System**: Multer middleware handles drag-and-drop image uploads with validation, storing files to a `/uploads` directory.

## Data Models
- **Help Card Schema**: Defines help cards with intent phrases, category, optional sponsored content, and organic content.
- **Match Log Schema**: Tracks user engagement (intent text, URL origin, card ID, score, helpfulness, click type) while minimizing data to ensure privacy.
- **Campaign Schema**: Defines advertising campaigns with advertiser ID, name, category, budget, spent, and status.
- **Automation Schema**: Defines triggers (scroll_depth, time_on_page, user_hesitation, bottom_proximity) with configurable thresholds and target offers.

## Privacy & Security
- **Data Minimization**: Extracts only the last 6 words of user input and URL origin.
- **User Control**: Per-site suppression, category-level opt-out, and rate limiting.
- **CORS Configuration**: Path-based CORS policy allows extension endpoints to accept all origins while restricting admin endpoints to the Replit domain.

# External Dependencies

## Database
- **PostgreSQL**: Production database, managed via Drizzle ORM.
- **Neon Serverless**: PostgreSQL driver for serverless environments.

## Third-Party Services
- **Chrome Extension API**: Core API for extension functionality (content scripts, storage, context menus).

## Build & Development Tools
- **Vite**: Frontend build tool.
- **esbuild**: Server-side bundling and Chrome extension build system.
- **TypeScript**: For type-safe development.

## UI Libraries
- **Radix UI**: Unstyled accessible component primitives.
- **shadcn/ui**: Pre-styled component library built on Radix.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.
- **embla-carousel**: For the swipeable card carousel in the Offer Deck.

## State Management
- **TanStack Query**: For server state management and caching.
- **React Hook Form**: For form state and validation.
- **Zod**: Runtime type validation and schema definition.