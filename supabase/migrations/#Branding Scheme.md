# elevAIte Branding Scheme

## Overview

elevAIte is the ThoughtFox Consulting Platform's intelligence and delivery management system. The branding scheme combines the vibrant ThoughtFox brand identity with modern, accessible design principles focused on delivering an intuitive user experience for consulting engagement workflows.

---

## Color Palette

### Primary Colors

| Color | Hex Code | Usage |
|-------|----------|-------|
| **Fox Orange** | `#FF6B35` | Primary CTAs, highlights, key interactive elements |
| **Burnt Orange** | `#E85D04` | Button hover states, accents, depth effects |
| **Deep Charcoal** | `#2D3748` | Primary text, headings, typography |

### Secondary Colors

| Color | Hex Code | Usage |
|-------|----------|-------|
| **Tech Purple** | `#667EEA` | Innovation elements, AI features, alternative accents |
| **Success Green** | `#48BB78` | Success states, checkmarks, positive indicators |
| **Energetic Blue** | `#4FACFE` | Links, transformation elements, navigation |

### Neutral Colors

| Color | Hex Code | Usage |
|-------|----------|-------|
| **Light Gray** | `#F7FAFC` | Backgrounds, card surfaces |
| **Border Gray** | `#E2E8F0` | Borders, dividers, subtle separators |

### CSS Variables

All colors are available as CSS custom properties:

```css
--fox-orange: #FF6B35
--burnt-orange: #E85D04
--deep-charcoal: #2D3748
--tech-purple: #667EEA
--success-green: #48BB78
--energetic-blue: #4FACFE
--light-gray: #F7FAFC
--border-gray: #E2E8F0
```

---

## Typography

### Font Families

- **Headings**: Montserrat (Bold 700, Semibold 600)
  - All h1-h6 elements
  - Used for emphasis and visual hierarchy

- **Body**: Inter (Regular 400)
  - Default body text and UI elements
  - Clean, modern readability

### Typography Hierarchy

| Element | Font | Weight | Usage |
|---------|------|--------|-------|
| H1 | Montserrat | 700 | Page titles |
| H2 | Montserrat | 700 | Section titles |
| H3-H6 | Montserrat | 600 | Subsections |
| Body | Inter | 400 | Paragraph text |
| Small text | Inter | 400 | Reduced font-size with `text-xs` or `text-sm` |

### Font Loading

Fonts are imported from Google Fonts in the main layout component and registered as CSS variables:
- `--font-inter`
- `--font-montserrat`

Applied via Tailwind classes: `font-sans` (Inter) and `font-heading` (Montserrat)

---

## Component Styling

### Reusable Component Classes

#### Primary Button
```css
.btn-primary
  padding: px-4 py-2
  background: #FF6B35 (Fox Orange)
  text: white, font-semibold
  border-radius: rounded-lg
  hover: #E85D04
```

#### Secondary Button
```css
.btn-secondary
  padding: px-4 py-2
  background: #667EEA (Tech Purple)
  text: white, font-semibold
  border-radius: rounded-lg
  hover: blue-600
```

#### Card Component
```css
.card
  background: white (light), gray-800 (dark)
  padding: p-6
  border-radius: rounded-lg
  border: 1px border-gray-200/border-gray-700
  box-shadow: shadow-md
```

### Common Pattern Styles

#### Header/Navigation
- Sticky positioning with `z-40`
- Bottom border divider
- Shadow: `shadow-sm`
- Padding: `px-4 py-3`

#### Status/Priority Indicators

| Priority | Background | Text |
|----------|------------|------|
| High | `bg-red-100` (dark: `bg-red-900/30`) | `text-red-800` |
| Medium | `bg-yellow-100` (dark: `bg-yellow-900/30`) | `text-yellow-800` |
| Low | `bg-gray-100` (dark: `bg-gray-700`) | `text-gray-800` |

#### Traffic Light System (HOW Framework)
- **Green**: `text-green-600 bg-green-100`
- **Yellow**: `text-yellow-700 bg-yellow-100`
- **Red**: `text-red-700 bg-red-100`

#### Stage Colors (Maturity & Delivery Phases)

| Stage | Color | Styling |
|-------|-------|---------|
| **Assess** | Gray | `bg-gray-100`, `text-gray-600` |
| **Align** | Blue | `bg-blue-100`, `text-blue-600` |
| **Activate** | Indigo | `bg-indigo-100`, `text-indigo-600` |
| **Accelerate** | Purple | `bg-purple-100`, `text-purple-600` |
| **Amplify** | Green | `bg-green-100`, `text-green-600` |

#### Interactive States
- **Hover**: Color changes or background transitions with `transition-colors`
- **Active**: Enhanced border or background highlighting
- **Disabled**: Opacity reduction (`opacity-50`), cursor: `not-allowed`
- **Loading**: Animated spinner in Fox Orange

---

## Dark Mode

### Implementation

Dark mode is managed via:
- **Trigger**: `ThemeProvider.tsx` context
- **Storage**: `localStorage` (key: `'theme'`)
- **Detection**: System preference fallback via `window.matchMedia('(prefers-color-scheme: dark)')`
- **Application**: `dark` class on `<html>` element

### Dark Mode Colors

| Element | Light | Dark |
|---------|-------|------|
| Background | `white` | `gray-900` |
| Card Background | `white` | `gray-800` |
| Text | `gray-800` | `gray-100` |
| Borders | `gray-200` | `gray-700` |

All color changes use the `dark:` prefix in Tailwind:
```css
dark:bg-gray-800
dark:text-gray-100
dark:border-gray-700
```

### Theme Toggle

Located at `src/components/layout/ThemeToggle.tsx`:
- Moon icon (switch to dark mode)
- Sun icon (switch to light mode)
- Styling: `p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700`

---

## Spacing Scale

### Padding/Margin Scale

Common values used throughout the application:
- `p-2`, `p-3`, `p-4`, `p-6`
- `px-4`, `py-2`, `py-3`, `py-4`
- `mb-3`, `mb-6`, `mx-auto`
- `gap-3`, `gap-4`

### Border Radius

| Radius | Value | Usage |
|--------|-------|-------|
| `rounded-lg` | 0.5rem | Primary component radius |
| `rounded-xl` | 0.75rem | Larger interactive elements |

### Shadows

| Shadow | Usage |
|--------|-------|
| `shadow-sm` | Subtle elevation |
| `shadow-md` | Card elevation |

### Layout Container

```css
container mx-auto px-4
```

For responsive max-width with horizontal padding.

---

## Brand Assets

### Logo Files

Located in `public/`:

1. **ThoughtFox Logo** (`thoughtfox-logo.svg`)
   - Format: SVG (scalable)
   - Dimensions: 48×48px (typical usage)
   - Used in header navigation

2. **elevAIte Logo** (`elevaite-logo.png`)
   - Format: PNG (raster)
   - Dimensions: 1164×1164 pixels
   - Full branding lock-up

### Logo Implementation

The header displays:
```
[ThoughtFox Logo] elevAIte Intelligence
                  "AI" in Fox Orange (#FF6B35)
                  "ThoughtFox Consulting Platform" (subtitle)
```

---

## Accessibility

### WCAG AA Compliance

All color combinations meet WCAG AA minimum contrast ratios:
- **Normal text**: 4.5:1 minimum
- **Large text**: 3:1 minimum

### Key Accessibility Features

- ✅ Sufficient color contrast in light and dark modes
- ✅ Semantic HTML for screen readers
- ✅ Focus states on interactive elements
- ✅ Alt text for all images and icons
- ✅ Proper heading hierarchy

---

## Tailwind Configuration

### File Location
`tailwind.config.ts`

### Key Settings

```typescript
// Dark mode
darkMode: 'class'

// Content scanning paths
content: [
  './src/pages/**',
  './src/components/**',
  './src/app/**'
]

// Color theme extensions
theme.extend.colors {
  'fox-orange': '#FF6B35',
  'burnt-orange': '#E85D04',
  'deep-charcoal': '#2D3748',
  'tech-purple': '#667EEA',
  'success-green': '#48BB78',
  'energetic-blue': '#4FACFE',
  'light-gray': '#F7FAFC',
  'border-gray': '#E2E8F0',
}
```

---

## Global CSS

### File Location
`src/app/globals.css`

### Core Styles

```css
:root {
  scroll-behavior: smooth;
}

body {
  @apply font-sans text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-900;
}

h1, h2, h3, h4, h5, h6 {
  @apply font-bold;
}
```

---

## Design System Principles

1. **Brand Consistency**: Fox Orange (#FF6B35) as primary CTA throughout
2. **Accessibility First**: WCAG AA compliance across all elements
3. **Dark Mode Support**: Full theme implementation for user preference
4. **Component Reusability**: CSS classes for common patterns
5. **Modern Typography**: Clean sans-serif fonts for readability
6. **Visual Hierarchy**: Color, size, and weight establish importance
7. **Spacing & Rhythm**: Consistent scale for visual harmony
8. **Responsive Design**: Mobile-first approach with Tailwind

---

## Technology Stack

- **Tailwind CSS v4** (`@tailwindcss/postcss`)
- **PostCSS** with Autoprefixer
- **Next.js 14** (App Router)
- **React 18**
- **TypeScript** (type-safe styling)
- **shadcn/ui** (accessible components)

---

## Usage Guidelines

### When to Use Fox Orange

- Primary Call-to-Action buttons
- Important highlights and alerts
- Brand emphasis elements
- Key interactive elements

### When to Use Tech Purple

- Innovation/AI-related features
- Alternative CTAs
- Feature highlights
- Secondary branding

### When to Use Success Green

- Confirmation states
- Positive feedback
- Checkmarks and success indicators
- Completion badges

### When to Use Neutral Colors

- Body text and readability
- Backgrounds and cards
- Borders and dividers
- Subtle UI elements

---

## References

- **Design Document**: `DESIGN_DOCUMENT.md`
- **Tailwind Config**: `tailwind.config.ts`
- **Global CSS**: `src/app/globals.css`
- **Theme Provider**: `src/components/layout/ThemeProvider.tsx`
- **Public Assets**: `public/` directory

---

**Last Updated**: January 2026
**Brand**: elevAIte Intelligence Platform (ThoughtFox Consulting)
