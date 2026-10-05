---
name: Photo Workspace
colors:
  surface: '#faf9fd'
  surface-dim: '#dbd9dd'
  surface-bright: '#faf9fd'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3f7'
  surface-container: '#efedf1'
  surface-container-high: '#e9e7eb'
  surface-container-highest: '#e3e2e6'
  on-surface: '#1a1b1e'
  on-surface-variant: '#424753'
  inverse-surface: '#2f3033'
  inverse-on-surface: '#f1f0f4'
  outline: '#727785'
  outline-variant: '#c2c6d5'
  surface-tint: '#005ac1'
  primary: '#0058bd'
  on-primary: '#ffffff'
  primary-container: '#2771df'
  on-primary-container: '#fefcff'
  inverse-primary: '#adc6ff'
  secondary: '#006e2c'
  on-secondary: '#ffffff'
  secondary-container: '#86f898'
  on-secondary-container: '#00722f'
  tertiary: '#765700'
  on-tertiary: '#ffffff'
  tertiary-container: '#956e00'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a41'
  on-primary-fixed-variant: '#004494'
  secondary-fixed: '#89fa9b'
  secondary-fixed-dim: '#6ddd81'
  on-secondary-fixed: '#002108'
  on-secondary-fixed-variant: '#005320'
  tertiary-fixed: '#ffdfa0'
  tertiary-fixed-dim: '#fbbc05'
  on-tertiary-fixed: '#261a00'
  on-tertiary-fixed-variant: '#5c4300'
  background: '#faf9fd'
  on-background: '#1a1b1e'
  surface-variant: '#e3e2e6'
typography:
  headline-xl:
    fontFamily: Roboto Flex
    fontSize: 36px
    fontWeight: '400'
    lineHeight: 44px
  headline-xl-mobile:
    fontFamily: Roboto Flex
    fontSize: 28px
    fontWeight: '400'
    lineHeight: 36px
  headline-lg:
    fontFamily: Roboto Flex
    fontSize: 28px
    fontWeight: '400'
    lineHeight: 36px
  headline-lg-mobile:
    fontFamily: Roboto Flex
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
  headline-md:
    fontFamily: Roboto Flex
    fontSize: 22px
    fontWeight: '500'
    lineHeight: 28px
  headline-sm:
    fontFamily: Roboto Flex
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 24px
  body-lg:
    fontFamily: Roboto Flex
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Roboto Flex
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Roboto Flex
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-md:
    fontFamily: Roboto Flex
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-dense: 0.25rem
  gutter-normal: 0.5rem
  margin: 1.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style
The design system embodies a calm, photo-forward, utility-focused environment inspired by Google Photos. Content is the primary visual centerpiece, while interface elements step back to minimize distraction and cognitive load. The emotional response is one of reliability, effortless organization, trust, and clarity.

The visual style is pure modern minimalism: clean white canvas foundations, crisp geometric structuring, zero gradients, no glassmorphism or decorative blurs, and deliberate, purposeful semantic color accents. The UI stays strictly in a high-clarity light aesthetic to let natural photographic color, lighting, and composition remain uncompromised.

## Colors
The palette is governed strictly by clean functional roles with zero decorative blending or gradients:

- **Primary Blue (`#4285F4` base, `#E8F0FE` tint):** Reserved for primary interactive controls, search affordances, active selection states, key action buttons, and conversational retrieval highlights.
- **Destructive Red (`#EA4335` base, `#FCE8E6` tint):** Strictly constrained to delete, unpair, and destructive confirmation modals or warning toasts.
- **Attention Yellow (`#FBBC04` base, `#FEF7E0` tint, `#B06000` text):** Applied to AI suggestions, unconfirmed tags, and pending classification states requiring user attention.
- **Success Green (`#34A853` base, `#E6F4EA` tint, `#137333` text):** Applied to confirmed metadata, verified classifications, and resolved curation flows.
- **Neutrals:**
  - `#FFFFFF`: Main application canvas, photo cards, and modal sheets.
  - `#F8F9FA`: Rails, secondary utility toolbars, and inactive container fills.
  - `#202124`: High-contrast primary headings, card titles, and high-emphasis body text.
  - `#5F6368`: Secondary timestamps, metadata labels, helper notes, and inactive icon fills.
  - `#DADCE0`: Hairline separators, borders, and subtle structural frames.

## Typography
Typography is clean, highly legible, and engineered to stay out of the way of imagery. Font rendering falls back through `Google Sans, Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`.

- **Minimum Font Size:** 14px across all contexts, including metadata, chips, timestamps, and tooltips, preserving effortless legibility and accessibility.
- **Hierarchy:**
  - Section headers (`LifeStageSectionHeader`, date cluster dividers) utilize `headline-sm` or `headline-md` at 500 weight.
  - Body text uses 400 weight with tight, comfortable line heights (1.4-1.5×).
  - Chips, search inputs, tabs, and action controls use 500 medium weight for sharp optical clarity on white and tinted containers.

## Layout & Spacing
The layout relies on a fluid grid designed to maximize image density while maintaining order.

- **Desktop Layout:** Fixed-width 256px Left Navigation Rail (or 72px collapsed icon rail on smaller viewports) alongside a fluid multi-column image viewport. Top app bar is fixed at 64px height with integrated search.
- **Photo Grid Spacing:** The candidate grid uses compact `0.25rem` to `0.5rem` gutters (`gutter-dense` / `gutter-normal`) between image tiles, creating continuous visual tapestries without dead whitespace.
- **General Page Margins:** 24px (`1.5rem`) on desktop; reflows to 16px (`1rem`) on mobile.
- **Breakpoints:**
  - Mobile (<600px): Bottom navigation bar replaces the rail; single- or two-column aggregated photo grid.
  - Tablet (600px–1024px): 72px condensed navigation rail; multi-column justified photo layout.
  - Desktop (>1024px): 256px expanded navigation rail with dedicated multi-column browsing and contextual side inspection panel.

## Elevation & Depth
Elevation is maintained using flat structural surfaces and subtle, functional ambient shadows. Glassmorphism, backdrop filters, and heavy dark shadows are strictly prohibited.

- **Canvas & Rails (Level 0):** Pure flat `#FFFFFF` or `#F8F9FA` background. Visual separation is accomplished using crisp 1px borders (`#DADCE0`) rather than drop shadows.
- **Floating Controls & Search Bar (Level 1):** Subtle ambient diffusion: `0 1px 3px rgba(60, 64, 67, 0.12), 0 1px 2px rgba(60, 64, 67, 0.24)`.
- **Active Search Overlay & Menus (Level 2):** `0 2px 6px rgba(60, 64, 67, 0.15), 0 1px 2px rgba(60, 64, 67, 0.30)`.
- **Selection & Interaction State:** Indicated through colored fills (e.g., `#E8F0FE`), solid selection rings (`2px #4285F4`), or checkmark badges, rather than elevation changes.

## Shapes
A dual shape paradigm is deployed:

- **Thumbnails & Cards:** Subtle 4px to 6px corner radii preserve the natural geometric bounds of photos and videos without cutting into photographic detail.
- **Controls, Chips & Search Inputs:** Fully pill-shaped (`9999px` / `rounded-full`) for high touchability and distinct contrast against rectangular media content.
- **Dialogs & Banners:** Clean 8px radii with hairline `#DADCE0` perimeter boundaries.

## Components

### Top Application Bar & Search Bar
- **Top Bar:** 64px height, `#FFFFFF` background, bottom hairline border (`1px solid #DADCE0`). Houses the pinwheel icon, Google Photos wordmark, centralized pill search, and end-aligned profile avatar (32px circular).
- **Search Bar:** Pill-shaped (`rounded-full`), height 48px, max-width 720px, `#F8F9FA` fill with no border in resting state. On focus, transitions to `#FFFFFF` with Level 1 shadow. Contains search magnifying glass at start, conversational sparkle/chat affordance icon at end, and placeholder text at 14px (`#5F6368`).

### Left Navigation Rail
- **Dimensions:** 256px wide, `#FFFFFF` background with right border (`1px solid #DADCE0`).
- **Items:** Photos, Search, Life Stages, Sharing.
- **State Styling:** Inactive items display 14px medium text (`#5F6368`) with matching monochrome icons. Active item features `#E8F0FE` pill background, `#4285F4` icon, and `#4285F4` bold text.

### Buttons & Controls
- **Primary Button:** Pill-shaped, `#4285F4` background, `#FFFFFF` text, 14px medium, 36px height, horizontal padding 20px. Hover: `#3367D6`.
- **Tonal / Secondary Button:** Pill-shaped, `#F8F9FA` or `#E8F0FE` background, `#4285F4` text, no border.
- **Destructive Button:** `#EA4335` background, `#FFFFFF` text (or `#FCE8E6` container with `#EA4335` text for lower emphasis).

### TagChip
- **Height:** 32px, pill-shaped (`rounded-full`), padding 4px 12px, font size 14px, font weight 500.
- **Suggested Tag State:**
  - Border: `1px dashed #FBBC04`
  - Background: `#FEF7E0`
  - Text: `#B06000` (or `#202124`)
  - Content: Must feature an explicit "Suggested" indicator or icon alongside the tag label.
- **Confirmed Tag State:**
  - Border: `1px solid #34A853`
  - Background: `#E6F4EA`
  - Text: `#137333` (or `#202124`)
  - Content: Accompanied by a checkmark icon.

### CandidatePhotoGrid & Thumbnail Card
- **Grid Layout:** Gap of 4px to 8px. Images rendered with `4px` subtle radius, `object-fit: cover`.
- **Selection State:** Top-left circular checkmark indicator. When selected, image displays a 3px inset border of `#4285F4` and a filled blue checkmark badge (`#4285F4` with white tick).
- **Hover State:** Subtle 4% dark scrim overlay exposing the select checkbox and metadata actions.

### CheckInBanner
- Container with `#F8F9FA` fill, `1px solid #DADCE0` perimeter, 8px radius.
- Includes context icon, headline (`headline-sm`, `#202124`), description (`body-md`, `#5F6368`), and actionable pill buttons right-aligned or stacked on mobile.

### LifeStageSectionHeader
- Clean row layout with `margin-bottom: 12px`.
- Section title at `headline-md` (`#202124`), subtitle/date range at `body-md` (`#5F6368`), and right-aligned tertiary action links or overflow menu.

### Multi-Select Toolbar
- Floats horizontally pinned to the top (or bottom on mobile) when items are selected.
- Solid `#FFFFFF` fill with Level 2 shadow and `1px solid #DADCE0` border.
- Displays selected count (`#202124`, 14px medium), dismiss button, and quick-action icon buttons (Share, Delete, Add to Album, Confirm Suggestions).