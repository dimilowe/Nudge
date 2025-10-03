# Chrome Extension Overlay Panel - Design Guidelines

## Design Approach
**Reference-Based with Glass-morphism Aesthetic**: Drawing from modern overlay UI patterns like Grammarly, Arc browser sidebar, and Superhuman command palette, combined with glass-morphism trend for floating interfaces.

## Core Design Elements

### A. Color Palette
**Glass Panel Background**
- Base: 0 0% 100% (white) at 8-12% opacity
- Backdrop blur: 24px with saturate(180%)
- Border: 0 0% 100% at 20% opacity, 1px solid

**Dark Mode Support**
- Base: 0 0% 5% at 85% opacity
- Border: 0 0% 100% at 10% opacity

**Accent Colors**
- Primary action: 220 90% 56% (vibrant blue for CTAs)
- Sponsored indicator: 280 65% 60% (subtle purple badge)
- Text primary: 0 0% 10% (light mode) / 0 0% 95% (dark mode)
- Text secondary: 0 0% 45% (light mode) / 0 0% 65% (dark mode)

### B. Typography
**Font Stack**: System fonts for crisp rendering
- Primary: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
- Weights: 400 (body), 500 (labels), 600 (headings)

**Hierarchy**
- Panel title: 14px/600
- Card title: 13px/500
- Body text: 12px/400
- Metadata: 11px/400

### C. Layout System
**Spacing**: Tight, efficient units: 2, 3, 4, 6, 8 (primary: 3, 4)
- Panel padding: p-4
- Card spacing: gap-3
- Internal padding: p-3
- Icon margins: mr-2

### D. Component Library

**Draggable Header**
- Height: h-12, flex with cursor-move
- Collapse icon (left): 16px, rotate-90 transition
- Panel title (center): font-medium
- Close button (right): 16px, opacity-60 hover:opacity-100

**Suggestion Card**
- Background: 0 0% 100% at 5% opacity with 1px border
- Rounded: rounded-lg
- Padding: p-3
- Hover: scale-[1.01] with backdrop-blur increase
- Shadow: soft 0 2px 8px rgba(0,0,0,0.08)

**Card Structure**
- Sponsored badge: Top-right, rounded-full, px-2 py-0.5, 10px text
- Title: mb-1.5, truncate after 2 lines
- Description: text-xs, opacity-80, line-clamp-2
- Action button: mt-3, full-width, h-8, rounded-md

**Collapsed State**
- Width: 48px, height: 48px
- Centered icon with rotation indicator
- Position memory maintained

**Scrollable Area**
- Cards container: flex flex-col gap-3
- Scroll behavior: smooth
- Custom scrollbar: 6px width, glass aesthetic
- Max height: 320px (within 400px panel)

### E. Animations
**Panel Entry**: slide-in-right + fade-in, 300ms ease-out
**Collapse Toggle**: width/height 250ms cubic-bezier(0.4, 0, 0.2, 1)
**Card Hover**: transform 150ms ease
**Dragging**: cursor-grabbing, opacity-90

### F. Glass-morphism Specifics
- Backdrop-filter: blur(24px) saturate(180%)
- Multiple shadow layers: 0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)
- Frosted border treatment on all interactive elements
- Background noise texture: 2% opacity for depth

## Images
**No images required** - Icon-based UI using Heroicons (outline style)
- Suggestion icon: lightbulb-outline
- Sponsored icon: sparkles-outline
- Collapse: chevron-left/right
- Close: x-mark

## Visual Hierarchy
1. **Sponsored cards** render first with purple badge
2. **Organic cards** follow with subtle visual separation
3. Divider line (1px, 10% opacity) between groups
4. Fixed header with drag handle affordance (dots pattern)
5. Floating shadow depth maintains z-index perception

## Interaction States
- **Idle**: Semi-transparent, unobtrusive
- **Hover (cards)**: Slight scale, increased blur
- **Active (dragging)**: Cursor change, reduced opacity
- **Collapsed**: Minimal footprint, persistent glow pulse