---
name: Google Photos Guided Memory
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
  surface-variant: '#F8F9FA'
  blue-tint: '#E8F0FE'
  destructive-red: '#EA4335'
  destructive-tint: '#FCE8E6'
  suggested-yellow: '#FBBC04'
  suggested-tint: '#FEF7E0'
  confirmed-green: '#34A853'
  confirmed-tint: '#E6F4EA'
  surface-bg: '#FFFFFF'
  text-primary: '#202124'
  text-secondary: '#5F6368'
  border-divider: '#DADCE0'
typography:
  display-lg:
    fontFamily: Roboto Flex
    fontSize: 32px
    fontWeight: '500'
    lineHeight: 40px
    letterSpacing: -0.5px
  headline-lg:
    fontFamily: Roboto Flex
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
    letterSpacing: 0px
  headline-md:
    fontFamily: Roboto Flex
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
    letterSpacing: 0px
  headline-sm:
    fontFamily: Roboto Flex
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: 0px
  body-lg:
    fontFamily: Roboto Flex
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0.15px
  body-md:
    fontFamily: Roboto Flex
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0.25px
  label-lg:
    fontFamily: Roboto Flex
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.1px
  label-md:
    fontFamily: Roboto Flex
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.1px
  label-sm:
    fontFamily: Roboto Flex
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.1px
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 0.5rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

# Stitch Design Brief: Guided Memory Assistant (Google Photos MVP)

Output target: **Next.js** (Tailwind CSS, mobile app view).

## 1. Global design system
### 1.1 Visual identity — faithful to real Google Photos
Light background `#FFFFFF` / `#F8F9FA`, generous white space, large rounded photo thumbnails (4-6px subtle corner radius), calm and uncluttered.
Exact Google Photos Brand Colors:
- Blue: Base `#4285F4`, Tint `#E8F0FE` (Primary actions, selection, retrieval entry)
- Red: Base `#EA4335`, Tint `#FCE8E6` (Destructive actions)
- Yellow: Base `#FBBC04`, Tint `#FEF7E0` (Suggested tag state - dashed border, yellow tint, 'Suggested' label)
- Green: Base `#34A853`, Tint `#E6F4EA` (Confirmed tag state - solid border, green tint)
- Neutrals: Background `#FFFFFF` / `#F8F9FA`, Primary text `#202124`, Secondary text `#5F6368`, Dividers `#DADCE0`
- Typography: Google Sans / Roboto / system sans-serif. Minimum text size 14px.
- Shape: Pill-shaped search bar, buttons, tag chips. Subtle 4-6px radius on photos. Material Symbols Rounded.

### 1.4 Tag State Pattern
- Suggested: Dashed border #FBBC04, fill #FEF7E0, label "Suggested"
- Confirmed: Solid border #34A853, fill #E6F4EA

### 1.5 Mobile Shell
- Top bar: Google Photos pinwheel logo mark, pill search bar (with guided memory chat entry), profile avatar (Dev Patel).
- Bottom nav: Photos, Search, Life Stages (new), Sharing.
- Floating Chat Assistant bubble button in bottom right for conversational photo retrieval.
