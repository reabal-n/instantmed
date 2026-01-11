# Component Usage Guide - InstantMed Design System

## Overview
This guide provides clear instructions on when and how to use each component in the InstantMed design system. All components are designed to work seamlessly in both light and dark modes.

## 🎨 Core UI Components

### Button (`components/ui/button.tsx`)
**When to use**: Primary action buttons, CTAs, form submissions
**Variants**:
- `default` - Primary actions (with glow effect)
- `outline` - Secondary actions
- `ghost` - Tertiary actions
- `destructive` - Delete/danger actions
- `link` - Text links styled as buttons

**Example**:
```tsx
import { Button } from "@/components/ui/button"

// Primary CTA
<Button size="lg" variant="default">
  Get Started
</Button>

// Secondary action
<Button variant="outline">Learn More</Button>
```

**Features**:
- ✅ Automatic glow effect on hover
- ✅ Smooth scale animations
- ✅ Dark mode support
- ✅ Accessible focus states

---

### Input (`components/ui/input.tsx`)
**When to use**: Text inputs, form fields
**Features**:
- ✅ Focus glow effect
- ✅ Ring effect on focus
- ✅ Dark mode support
- ✅ Backdrop blur

**Example**:
```tsx
import { Input } from "@/components/ui/input"

<Input 
  placeholder="Enter your email"
  type="email"
/>
```

---

### Card (`components/ui/card.tsx`)
**When to use**: Content containers, dashboard cards
**Features**:
- ✅ Enhanced hover lift effect
- ✅ Smooth transitions
- ✅ Dark mode support

**Example**:
```tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
</Card>
```

---

## 🌟 Enhanced Components

### EnhancedCard (`components/ui/enhanced-card.tsx`)
**When to use**: When you need spotlight/glow effects on cards
**Props**:
- `glowColor`: "blue" | "purple" | "green" | "red" | "orange"
- `useGlowCard`: Use full GlowCard component
- `useSpotlight`: Use spotlight effect
- `hoverable`: Enable hover effects

**Example**:
```tsx
import { EnhancedCard } from "@/components/ui/enhanced-card"

<EnhancedCard glowColor="blue" useSpotlight hoverable>
  Card content with glow effect
</EnhancedCard>
```

---

### GlowCard (`components/ui/glow-card.tsx`)
**When to use**: Interactive cards with spotlight effect that follows mouse
**Props**:
- `glowColor`: "blue" | "purple" | "green" | "red" | "orange"
- `size`: "sm" | "md" | "lg"
- `customSize`: Use custom width/height

**Example**:
```tsx
import { GlowCard } from "@/components/ui/glow-card"

<GlowCard glowColor="purple" size="md">
  Interactive card with mouse-following glow
</GlowCard>
```

---

### ParallaxSection (`components/ui/parallax-section.tsx`)
**When to use**: Wrap sections for floating parallax effect on scroll
**Props**:
- `speed`: 0-1 (higher = more movement)
- `floating`: Enable floating animation

**Example**:
```tsx
import { ParallaxSection } from "@/components/ui/parallax-section"

<ParallaxSection speed={0.25}>
  <YourSectionContent />
</ParallaxSection>
```

**Best Practices**:
- Use different speeds for visual depth (0.15-0.3 recommended)
- Don't wrap every section - use selectively for key content
- Test on low-end devices for performance

---

### CinematicSwitch (`components/ui/cinematic-switch.tsx`)
**When to use**: Yes/No toggles, binary choices (especially safety questions)
**Example**:
```tsx
import CinematicSwitch from "@/components/ui/cinematic-switch"

<CinematicSwitch 
  isOn={value}
  onChange={setValue}
/>
```

---

## 🎭 Background Components

### AuroraBackground (`components/ui/aurora-background.tsx`)
**When to use**: 
- Full-page background (via root layout) ✅ Already applied globally
- Content wrapper mode for specific pages

**Modes**:
- `fullPage={true}` - Fixed position, covers entire viewport (used in root layout)
- `fullPage={false}` - Content wrapper with aurora effect

**Note**: Already applied globally via `app/layout.tsx`. No need to add manually unless creating a special page.

---

## 📐 Layout Components

### TiltCard (`components/shared/tilt-card.tsx`)
**When to use**: Cards that need 3D tilt effect on hover
**Props**:
- `tiltAmount`: Degrees of tilt (default: 10)
- `glareEnabled`: Enable glare effect

**Example**:
```tsx
import { TiltCard } from "@/components/shared/tilt-card"

<TiltCard tiltAmount={10}>
  <div className="p-6">
    Content with 3D tilt
  </div>
</TiltCard>
```

---

## 🎯 Selection Components

### EnhancedSelectionButton (`components/intake/enhanced-selection-button.tsx`)
**When to use**: Selection options in intake flows (services, symptoms, etc.)
**Features**:
- ✅ Gradient backgrounds
- ✅ Smooth transitions
- ✅ Selected state styling

**Example**:
```tsx
import { EnhancedSelectionButton } from "@/components/intake/enhanced-selection-button"

<EnhancedSelectionButton
  selected={isSelected}
  onClick={handleSelect}
>
  Option Text
</EnhancedSelectionButton>
```

---

## 📊 Dashboard Components

### PremiumStatCard (`components/patient/dashboard-cards.tsx`)
**When to use**: Dashboard statistics with spotlight effect
**Variants**: "default" | "warning" | "success" | "danger" | "info"

**Example**:
```tsx
import { PremiumStatCard } from "@/components/patient/dashboard-cards"

<PremiumStatCard
  label="Pending"
  value={5}
  icon={<Clock />}
  variant="warning"
/>
```

---

## 🎨 Design Tokens

### Colors
- `bg-background` - Page background
- `bg-card` - Card background
- `text-foreground` - Primary text
- `text-muted-foreground` - Secondary text
- `border` - Borders
- `primary` - Primary actions (#2563EB)
- `secondary` - Secondary elements
- `accent` - Accent color (#4f46e5)

### Spacing
- Use Tailwind spacing scale: `p-4`, `gap-6`, `mt-8`, etc.
- Consistent padding: `px-4 py-12` for sections

### Border Radius
- `rounded-xl` - Standard cards
- `rounded-2xl` - Large cards
- `rounded-full` - Pills/badges

---

## 🚀 Performance Guidelines

### ParallaxSection
- ✅ Throttled to 60fps
- ✅ Only animates when visible
- ⚠️ Use sparingly (not every section)
- ⚠️ Test on low-end devices

### Animations
- ✅ All animations use `will-change` for performance
- ✅ GPU-accelerated transforms
- ✅ Passive scroll listeners

---

## ♿ Accessibility Guidelines

### Keyboard Navigation
- ✅ All interactive elements are keyboard accessible
- ✅ Focus states visible with ring effects
- ✅ Tab order follows visual flow

### Screen Readers
- ✅ Semantic HTML elements
- ✅ ARIA labels where needed
- ✅ Proper heading hierarchy

### Color Contrast
- ✅ Meets WCAG AA standards
- ✅ Works in both light and dark modes
- ✅ Not relying solely on color for information

---

## 🎨 Dark Mode Support

All components automatically support dark mode via:
- CSS variables (`--background`, `--foreground`, etc.)
- Tailwind `dark:` variants
- Theme provider in root layout

**Testing**: Toggle dark mode to verify all components adapt correctly.

---

## 📝 Migration Guide

### Migrating from old button components:
```tsx
// Old (components/uix/button.tsx)
import { Button } from "@/components/uix"

// New (components/ui/button.tsx)
import { Button } from "@/components/ui/button"
```

### Migrating from old background classes:
```tsx
// Old
<div className="bg-hero">
<div className="bg-mesh">
<div className="bg-gradient-subtle">

// New (AuroraBackground applied globally)
<div className="bg-background">
```

---

## 🔍 Component Decision Tree

**Need a button?**
- Primary action → `Button variant="default"`
- Secondary → `Button variant="outline"`
- Link style → `Button variant="link"`

**Need a card?**
- Standard card → `Card`
- Interactive with glow → `EnhancedCard` or `GlowCard`
- 3D tilt effect → `TiltCard`

**Need selection?**
- Intake flow options → `EnhancedSelectionButton`
- Yes/No toggle → `CinematicSwitch`

**Need parallax?**
- Section wrapper → `ParallaxSection` (use selectively)

---

## 📚 Additional Resources

- Design tokens: `app/globals.css`
- Tailwind config: `tailwind.config.js`
- Component examples: Check existing usage in codebase

---

## ✅ Checklist for New Components

When creating a new component:
- [ ] Uses design tokens (colors, spacing, radius)
- [ ] Supports dark mode
- [ ] Has hover/focus states
- [ ] Is keyboard accessible
- [ ] Uses semantic HTML
- [ ] Has proper TypeScript types
- [ ] Includes JSDoc comments

