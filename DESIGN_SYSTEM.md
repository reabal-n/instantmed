# Lumen Health Design System

**Version:** 2.1  
**Last Updated:** January 2026  
**Purpose:** Unified design language for calm, radiant, human telehealth experience with subtle solarpunk aesthetic

---

## Philosophy

> **Calm, Radiant, Human**
>
> Every design decision passes the "2am anxiety test" — would this feel reassuring to someone anxious at 2am waiting for medical care? Our solarpunk-inspired aesthetic brings warmth and hope, like sunlight through glass. *Lumen* means light — we illuminate the path to better health.

---

## Typography

### Font Families

```tsx
// Primary (Body & UI)
font-sans → Inter (via --font-sans CSS variable)

// Headings (Optional emphasis)
font-heading → Inter (via --font-heading CSS variable)

// Code/Data
font-mono → JetBrains Mono (via --font-mono CSS variable)

// Handwritten (Signatures only)
font-handwritten → Caveat (via --font-handwritten CSS variable)
```

### Font Sizes & Weights

**Headings:**
```tsx
h1: text-2xl font-bold (24px, 700)     // Page titles
h2: text-xl font-semibold (20px, 600)  // Section headers
h3: text-lg font-semibold (18px, 600)  // Card titles
h4: text-base font-medium (16px, 500)  // Sub-sections
```

**Body:**
```tsx
text-base (16px, 400)     // Default body text
text-sm (14px, 400)       // Secondary text, labels
text-xs (12px, 400)       // Helper text, captions
```

**UI Elements:**
```tsx
Buttons: text-sm font-medium (14px, 500)
Labels: text-sm font-medium (14px, 500)
Input text: text-base (16px, 400)
```

### Line Heights

```tsx
Default: leading-normal (1.5)
Relaxed: leading-relaxed (1.75) // For long-form content
Loose: leading-loose (1.8)      // For maximum readability
Tight: leading-tight (1.25)     // For headings only
```

---

## Color System (Solarpunk Palette)

### Primary Palette

**Amber (Primary)** — Sunlight, warmth, radiant health
```tsx
primary-50:  #fffbeb  // Lightest backgrounds (warm cream)
primary-100: #fef3c7  // Hover states
primary-300: #fcd34d  // Borders, highlights
primary:     #f59e0b  // Primary actions (golden amber)
primary-600: #d97706  // Active states
primary-700: #b45309  // Dark mode
```

**Teal (Secondary)** — Nature, growth, calm
```tsx
secondary:    #14b8a6  // Secondary actions
secondary-50: #f0fdfa  // Light backgrounds
secondary-400: #2dd4bf // Highlights
secondary-600: #0d9488 // Active states
```

**Emerald (Success)** — Verdant life, vitality
```tsx
success: #22c55e  // Confirmations, success states
success-50: #f0fdf4  // Light backgrounds
```

**Orange (Warning)** — Warm attention, not alarm
```tsx
warning: #fb923c  // Warnings (warm, not harsh)
```

**Rose (Danger)** — Soft alert, care needed
```tsx
danger: #fb7185  // Errors, critical actions (warm rose, not harsh red)
```

### Neutrals

**Grays** — Soft, warm neutrals (not cold blue-grays)
```tsx
background:   #F9FAFB  // Page background (off-white)
card:         #FFFFFF  // Card backgrounds
border:       #E5E7EB  // Borders (subtle)
muted:        #F3F4F6  // Muted backgrounds

foreground:   #1a1a1a  // Primary text (slightly soft black)
muted-foreground: #6B7280  // Secondary text
```

### Usage Rules

1. **Never use pure black** (`#000000`) — too harsh
2. **Use off-white** (`#F9FAFB`) not pure white for backgrounds
3. **Borders are subtle** (`#E5E7EB`) — barely there
4. **Text is soft black** (`#1a1a1a`) — easier on eyes

---

## Spacing System

### Standard Scale

```tsx
8px spacing system (multiples of 8):
gap-2  → 8px   // Tight spacing
gap-3  → 12px  // Default spacing
gap-4  → 16px  // Comfortable spacing
gap-6  → 24px  // Section spacing
gap-8  → 32px  // Large sections
gap-12 → 48px  // Page sections
```

### Component Spacing

**Padding:**
```tsx
Buttons: px-4 py-2 (16px/8px)
Cards: p-4 md:p-6 (16px → 24px)
Panels: p-6 (24px)
Page containers: px-4 py-8 (16px/32px)
```

**Gaps:**
```tsx
Stack (vertical): space-y-4 (16px)
Grid: gap-4 (16px)
Flex: gap-3 (12px)
```

---

## Border Radius

### Consistent Rounding

```tsx
Small elements:  rounded-lg (10px)  // Buttons, badges
Medium elements: rounded-xl (12px)  // Cards, inputs
Large panels:    rounded-2xl (16px) // Panels, modals
```

**Never use:** `rounded-sm`, `rounded-md`, `rounded-full` for primary UI  
**Exception:** `rounded-full` only for avatars and dot indicators

---

## Shadows & Depth

### Soft Shadows (Never harsh)

```tsx
Elevation 1: shadow-soft     // Subtle hover state
Elevation 2: shadow-soft-md  // Cards, buttons
Elevation 3: shadow-soft-lg  // Panels, dialogs
```

**Custom shadows:**
```tsx
soft: 0 1px 2px rgba(0, 0, 0, 0.04), 0 8px 24px rgba(0, 0, 0, 0.06)
soft-md: 0 4px 6px rgba(0, 0, 0, 0.05), 0 10px 30px rgba(0, 0, 0, 0.08)
soft-lg: 0 8px 12px rgba(0, 0, 0, 0.06), 0 20px 48px rgba(0, 0, 0, 0.1)
```

---

## Motion & Animation

### Timing

```tsx
Fast: 150ms   // Micro-interactions (hover)
Medium: 300ms // Standard transitions (panel open)
Slow: 400ms   // Emphasis animations
```

### Easing

```tsx
Standard: ease-out      // Most animations
Entrance: ease-out      // Elements appearing
Exit: ease-in           // Elements disappearing
Bounce: Custom cubic    // Special emphasis only
```

### Pre-built Animations

```tsx
animate-fade-in    // Fade in elements
animate-slide-up   // Slide up with fade
animate-step-enter // Page transitions (defined in globals.css)
```

**Never:** No snapping, bouncing, or dramatic easing. Everything should feel smooth and deliberate.

---

## Component Patterns

### Buttons

**Hierarchy:**
```tsx
// Primary action
<Button className="bg-primary text-white">Continue</Button>

// Secondary action
<Button variant="outline">Cancel</Button>

// Tertiary action
<Button variant="ghost">Skip</Button>

// Destructive action
<Button variant="destructive">Delete</Button>
```

**Sizing:**
```tsx
Default: h-12 px-4  // 48px height, 16px padding
Small: h-10 px-3    // 40px height, 12px padding
Large: h-14 px-6    // 56px height, 24px padding
```

### Cards

**Standard card:**
```tsx
<div className="bg-white rounded-xl border border-gray-200 p-6">
  <h3 className="text-lg font-semibold mb-2">Title</h3>
  <p className="text-sm text-gray-600">Description</p>
</div>
```

**Interactive card:**
```tsx
<div className="bg-white rounded-xl border border-gray-200 p-6 
                hover:border-primary hover:shadow-soft-md 
                transition-all cursor-pointer">
  {/* Content */}
</div>
```

### Inputs

**Standard input:**
```tsx
<Input 
  className="h-12 rounded-xl border-gray-200 
             focus:border-primary focus:ring-2 focus:ring-primary/20"
  placeholder="Enter text..."
/>
```

**With label:**
```tsx
<div className="space-y-2">
  <label className="text-sm font-medium text-gray-900">Label</label>
  <Input className="h-12 rounded-xl" />
  <p className="text-xs text-gray-500">Helper text</p>
</div>
```

### Badges

```tsx
// Status badges
<span className="px-3 py-1.5 rounded-full text-sm font-medium 
               bg-green-100 text-green-700">
  Approved
</span>

<span className="px-3 py-1.5 rounded-full text-sm font-medium 
               bg-blue-100 text-blue-700">
  New
</span>
```

### Panels

**SessionPanel (for flows):**
```tsx
<SessionPanel>
  <SessionProgress currentStep={1} totalSteps={3} />
  <div className="space-y-6">
    {/* Flow content */}
  </div>
</SessionPanel>
```

**DrawerPanel (for details):**
```tsx
<DrawerPanel title="Details" width={500}>
  <div className="p-6 space-y-4">
    {/* Detail content */}
  </div>
</DrawerPanel>
```

---

## Layout Patterns

### Page Container

```tsx
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  {/* Page content */}
</div>
```

### Two-Column Layout

```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <div>{/* Left column */}</div>
  <div>{/* Right column */}</div>
</div>
```

### Card Grid

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Cards */}
</div>
```

---

## Responsive Breakpoints

```tsx
sm:  640px   // Mobile landscape
md:  768px   // Tablet portrait
lg:  1024px  // Tablet landscape / Small desktop
xl:  1280px  // Desktop
2xl: 1536px  // Large desktop
```

**Mobile-first approach:**
```tsx
// Base: Mobile
<div className="p-4 md:p-6 lg:p-8">
  // 16px → 24px → 32px padding
</div>
```

---

## Accessibility

### Focus States

```tsx
// Always visible focus rings
focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
```

### Color Contrast

- Text on white: minimum 4.5:1 ratio
- Text on colored backgrounds: minimum 4.5:1 ratio
- Interactive elements: minimum 3:1 ratio

### Touch Targets

- Minimum 44x44px for all interactive elements
- Buttons: h-12 (48px) by default

---

## Error States

### Inline Errors

```tsx
<div className="text-sm text-red-600 mt-1 flex items-center gap-1">
  <AlertCircle className="w-4 h-4" />
  That doesn't look quite right. Mind checking it once more?
</div>
```

### Error Banners

```tsx
<div className="p-4 rounded-xl bg-red-50 border border-red-200">
  <p className="text-sm text-red-800 font-medium">
    That didn't save properly. Give it another go.
  </p>
</div>
```

**Never:** Shouty error messages, blame language, or technical jargon

---

## Loading States

### Inline Spinners

```tsx
<Loader2 className="w-4 h-4 animate-spin" />
```

### Button Loading

```tsx
<Button disabled={isLoading}>
  {isLoading ? (
    <>
      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      Loading...
    </>
  ) : (
    'Continue'
  )}
</Button>
```

### Skeleton States

```tsx
<div className="animate-pulse space-y-3">
  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
</div>
```

---

## Copy Guidelines

### Tone

- **Calm:** "Take your time"
- **Confident:** "We've got it from here"
- **Human:** "That doesn't look quite right"

### Button Copy

Use clear, action-oriented verbs:
- ✅ Continue
- ✅ Review details
- ✅ Submit for review
- ❌ Let's go!
- ❌ Awesome!

### Error Messages

Replace technical with human:
- ❌ "Invalid input"
- ✅ "That doesn't look quite right. Mind checking it once more?"

---

## Implementation Checklist

When building a new page/component:

**Visual:**
- [ ] Uses `text-base` (16px) for body text
- [ ] Uses consistent spacing (8px grid)
- [ ] Uses `rounded-xl` or `rounded-2xl` for cards
- [ ] Uses soft shadows (`shadow-soft-md`)
- [ ] Uses off-white background (`bg-[#F9FAFB]`)
- [ ] Uses soft black text (`text-[#1a1a1a]`)

**Interaction:**
- [ ] Animations are 300-400ms
- [ ] Uses `ease-out` easing
- [ ] Focus states are visible
- [ ] Touch targets are 44px minimum
- [ ] Hover states are subtle

**Copy:**
- [ ] Uses human language
- [ ] Buttons are clear and boring
- [ ] Errors don't blame the user
- [ ] Would feel calm at 2am

---

## Quick Reference

### Common Class Combinations

**Card:**
```tsx
className="bg-white rounded-xl border border-gray-200 p-6 shadow-soft"
```

**Button:**
```tsx
className="h-12 px-4 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors"
```

**Input:**
```tsx
className="h-12 px-4 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20"
```

**Section Spacing:**
```tsx
className="space-y-6"  // Vertical stack with 24px gap
```

---

## Platform Consistency

### All pages should have:

1. **Same typography** — Inter at 16px base
2. **Same colors** — Primary blue, off-white backgrounds
3. **Same spacing** — 8px grid system
4. **Same border radius** — `rounded-xl` or `rounded-2xl`
5. **Same shadows** — Soft, subtle elevation
6. **Same animations** — 300ms ease-out
7. **Same tone** — Calm, competent, human

### Components to reuse:

- `<SessionProgress />` for all flows
- `<DrawerPanel />` for details
- `<FloatingActionBar />` for bulk actions
- `<Button />` from heroui with consistent styling
- `<Input />` from heroui with consistent styling

---

## Maintenance

**When adding new components:**
1. Check this guide first
2. Use existing patterns
3. Don't invent new styles
4. Keep it consistent

**When in doubt:**
- Make it calmer
- Use existing spacing
- Keep borders subtle
- Ask: "Would this feel reassuring at 2am?"

---

**Remember:** This is a clinical operating system, not a marketing site. Every design decision should communicate calm competence.
