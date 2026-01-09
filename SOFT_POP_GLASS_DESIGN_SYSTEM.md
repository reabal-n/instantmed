# Soft Pop Glass Design System

> A premium, tactile design system for InstantMed's telehealth platform targeting 18-40 demographic.

## Core Philosophy

**"Premium, tactile, and modern — like a high-end productivity app"**

We balance medical trust with consumer-grade delight. Our UI must NOT feel sterile or clinical. Think Linear, Craft.do, or Notion — apps that feel premium and responsive.

---

## 1. The "Glass" Material (Surfaces)

**Never use flat white backgrounds for cards or containers. Use "Glass."**

### Base Glass
```css
/* Light Mode */
.glass-surface {
  background: rgba(255, 255, 255, 0.70);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.40);
}

/* Dark Mode */
.dark .glass-surface {
  background: rgba(17, 17, 27, 0.60);
  border: 1px solid rgba(255, 255, 255, 0.10);
}
```

### Tailwind Classes
```tsx
// Base Glass Card
className="bg-white/70 dark:bg-gray-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10"

// Hovered Glass (interactive cards)
className="hover:bg-white/90 dark:hover:bg-gray-900/80 transition-all duration-300"

// Elevated Glass (modals, dropdowns)
className="bg-white/85 dark:bg-gray-900/80 backdrop-blur-2xl border border-white/50 dark:border-white/15"
```

### Glass Hierarchy
| Level | Use Case | Blur | Opacity |
|-------|----------|------|---------|
| Level 1 | Page backgrounds | `blur-xl` | 70% |
| Level 2 | Cards, containers | `blur-xl` | 75% |
| Level 3 | Modals, popovers | `blur-2xl` | 85% |
| Level 4 | Tooltips, dropdowns | `blur-3xl` | 90% |

---

## 2. The "Glow" (Shadows & Depth)

**DO NOT use standard black drop shadows. Use colored light emissions.**

### Primary Blue Glow
```css
/* Soft glow - default state */
box-shadow: 0 8px 30px rgba(59, 130, 246, 0.15);

/* Medium glow - hover state */
box-shadow: 0 12px 40px rgba(59, 130, 246, 0.25);

/* Intense glow - active/focus state */
box-shadow: 0 16px 50px rgba(59, 130, 246, 0.35);
```

### Tailwind Utilities
```tsx
// Primary button glow
className="shadow-[0_8px_30px_rgb(59,130,246,0.2)]"

// Success glow (green)
className="shadow-[0_8px_30px_rgb(34,197,94,0.2)]"

// Accent glow (purple)
className="shadow-[0_8px_30px_rgb(139,92,246,0.2)]"

// Danger glow (red)
className="shadow-[0_8px_30px_rgb(239,68,68,0.2)]"
```

### Glow Colors by State
| State | Color | Tailwind Shadow |
|-------|-------|-----------------|
| Primary | Blue | `shadow-[0_8px_30px_rgb(59,130,246,0.2)]` |
| Success | Emerald | `shadow-[0_8px_30px_rgb(34,197,94,0.2)]` |
| Warning | Amber | `shadow-[0_8px_30px_rgb(245,158,11,0.2)]` |
| Danger | Red | `shadow-[0_8px_30px_rgb(239,68,68,0.2)]` |
| Accent | Purple | `shadow-[0_8px_30px_rgb(139,92,246,0.2)]` |

---

## 3. Geometry & Shape

**Friendly and approachable. Avoid sharp corners.**

### Border Radius Scale
| Element | Radius | Class |
|---------|--------|-------|
| Buttons (pill) | Full | `rounded-full` |
| Inputs | XL | `rounded-xl` |
| Cards | 2XL | `rounded-2xl` |
| Modals | 3XL | `rounded-3xl` |
| Tooltips | LG | `rounded-lg` |
| Tags/Badges | Full | `rounded-full` |

### Examples
```tsx
// Pill button
<Button className="rounded-full px-6" />

// Card container
<Card className="rounded-2xl" />

// Modal
<Modal className="rounded-3xl" />

// Input field
<Input className="rounded-xl" />
```

---

## 4. Motion & Microinteractions (Linear Style)

**Static UI feels cheap. Every interactive element must respond.**

### Framer Motion Presets

```tsx
// Spring animations (snappy, premium feel)
const springConfig = {
  type: "spring",
  stiffness: 400,
  damping: 30
};

// Hover animation
const hoverVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 }
};

// Modal entrance
const modalVariants = {
  hidden: { 
    opacity: 0, 
    scale: 0.95,
    y: 20 
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: springConfig
  }
};
```

### CSS Motion Utilities
```css
/* Hover lift effect */
.hover-lift {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
              box-shadow 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.hover-lift:hover {
  transform: translateY(-4px) scale(1.02);
}

/* Active press effect */
.press-active:active {
  transform: scale(0.98);
  transition: transform 0.1s ease;
}
```

### Animation Guidelines
| Interaction | Animation | Duration |
|-------------|-----------|----------|
| Button hover | `scale(1.02)` + brighten | 200ms |
| Button click | `scale(0.98)` | 100ms |
| Card hover | `translateY(-4px)` + glow | 300ms |
| Modal open | `scale(0.95→1)` + `opacity(0→1)` | 300ms spring |
| Tab switch | `opacity` crossfade | 200ms |
| Toast enter | `translateY(100%)→0` | 300ms spring |

---

## 5. Implementation with HeroUI

**Use HeroUI as base, but aggressively override styles.**

### Button Overrides
```tsx
<HeroButton
  classNames={{
    base: cn(
      // Glass surface
      "bg-white/70 dark:bg-gray-900/60",
      "backdrop-blur-xl",
      "border border-white/40 dark:border-white/10",
      // Geometry
      "rounded-full",
      // Glow shadow
      "shadow-[0_8px_30px_rgb(59,130,246,0.2)]",
      // Motion
      "transition-all duration-300 ease-out",
      "hover:scale-[1.02] hover:bg-white/90",
      "hover:shadow-[0_12px_40px_rgb(59,130,246,0.3)]",
      "active:scale-[0.98]"
    )
  }}
/>
```

### Card Overrides
```tsx
<HeroCard
  classNames={{
    base: cn(
      // Glass surface
      "bg-white/70 dark:bg-gray-900/60",
      "backdrop-blur-xl",
      "border border-white/40 dark:border-white/10",
      // Geometry
      "rounded-2xl",
      // Soft glow
      "shadow-[0_8px_30px_rgb(0,0,0,0.04)]",
      // Motion
      "transition-all duration-300",
      "hover:bg-white/85 hover:-translate-y-1",
      "hover:shadow-[0_20px_40px_rgb(59,130,246,0.1)]"
    )
  }}
/>
```

### Input Overrides
```tsx
<HeroInput
  classNames={{
    inputWrapper: cn(
      // Glass surface
      "bg-white/60 dark:bg-gray-900/40",
      "backdrop-blur-lg",
      "border border-white/30 dark:border-white/10",
      // Geometry
      "rounded-xl",
      // Focus glow
      "data-[focused=true]:border-primary/50",
      "data-[focused=true]:shadow-[0_0_20px_rgb(59,130,246,0.15)]",
      // Motion
      "transition-all duration-200"
    ),
    input: "placeholder:text-muted-foreground/50"
  }}
/>
```

### Modal Overrides
```tsx
<HeroModal
  classNames={{
    backdrop: "bg-black/40 backdrop-blur-sm",
    base: cn(
      // Elevated glass
      "bg-white/85 dark:bg-gray-900/80",
      "backdrop-blur-2xl",
      "border border-white/50 dark:border-white/15",
      // Geometry
      "rounded-3xl",
      // Intense glow
      "shadow-[0_25px_60px_rgb(0,0,0,0.15)]"
    )
  }}
  motionProps={{
    variants: {
      enter: {
        y: 0,
        opacity: 1,
        scale: 1,
        transition: {
          type: "spring",
          stiffness: 400,
          damping: 30
        }
      },
      exit: {
        y: 20,
        opacity: 0,
        scale: 0.95,
        transition: { duration: 0.2 }
      }
    }
  }}
/>
```

---

## 6. Color Palette

### Primary Colors
```css
:root {
  /* Primary Blue - Trust & Action */
  --primary-50: #eff6ff;
  --primary-100: #dbeafe;
  --primary-500: #3b82f6;
  --primary-600: #2563eb;
  --primary-700: #1d4ed8;
  
  /* Accent Purple - Premium & Delight */
  --accent-400: #a78bfa;
  --accent-500: #8b5cf6;
  --accent-600: #7c3aed;
  
  /* Success Emerald - Positive Actions */
  --success-400: #4ade80;
  --success-500: #22c55e;
  --success-600: #16a34a;
}
```

### Gradient Presets
```css
/* Primary gradient (buttons, accents) */
.gradient-primary {
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
}

/* Glass gradient (subtle depth) */
.gradient-glass {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.9) 0%,
    rgba(255, 255, 255, 0.6) 100%
  );
}

/* Mesh gradient (backgrounds) */
.gradient-mesh {
  background: 
    radial-gradient(at 20% 30%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
    radial-gradient(at 80% 70%, rgba(139, 92, 246, 0.08) 0%, transparent 50%);
}
```

---

## 7. Component Quick Reference

### Glass Card
```tsx
<div className="
  bg-white/70 dark:bg-gray-900/60 
  backdrop-blur-xl 
  border border-white/40 dark:border-white/10 
  rounded-2xl 
  shadow-[0_8px_30px_rgb(0,0,0,0.06)]
  hover:bg-white/85 
  hover:shadow-[0_20px_40px_rgb(59,130,246,0.1)]
  hover:-translate-y-1
  transition-all duration-300
">
  {/* Content */}
</div>
```

### Glow Button (Primary)
```tsx
<button className="
  bg-gradient-to-r from-primary-500 to-primary-600
  text-white font-semibold
  rounded-full px-6 py-3
  shadow-[0_8px_30px_rgb(59,130,246,0.3)]
  hover:shadow-[0_12px_40px_rgb(59,130,246,0.4)]
  hover:scale-[1.02]
  active:scale-[0.98]
  transition-all duration-200
">
  Get Started
</button>
```

### Glass Input
```tsx
<input className="
  bg-white/60 dark:bg-gray-900/40
  backdrop-blur-lg
  border border-white/30 dark:border-white/10
  rounded-xl px-4 py-3
  placeholder:text-muted-foreground/50
  focus:border-primary/50
  focus:shadow-[0_0_20px_rgb(59,130,246,0.15)]
  focus:outline-none
  transition-all duration-200
"/>
```

### Glass Modal
```tsx
<div className="
  bg-white/85 dark:bg-gray-900/80
  backdrop-blur-2xl
  border border-white/50 dark:border-white/15
  rounded-3xl
  shadow-[0_25px_60px_rgb(0,0,0,0.15)]
">
  {/* Modal content */}
</div>
```

---

## 8. Accessibility

All glass effects maintain WCAG 2.1 AA compliance:
- Minimum contrast ratios preserved
- Focus states clearly visible
- Motion respects `prefers-reduced-motion`
- Touch targets minimum 44x44px

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 9. File Structure

```
components/
├── ui/
│   ├── glass-card.tsx      # Glass card component
│   ├── glass-button.tsx    # Button with glow effects
│   ├── glass-input.tsx     # Glass input field
│   └── motion.tsx          # Framer motion presets
├── heroui/
│   ├── button.tsx          # HeroUI button override
│   ├── card.tsx            # HeroUI card override
│   ├── input.tsx           # HeroUI input override
│   └── modal.tsx           # HeroUI modal override
```

---

## 10. Do's and Don'ts

### ✅ Do
- Use glass surfaces for all containers
- Add colored glow shadows, not black
- Round corners generously (`rounded-xl` minimum)
- Animate all interactive elements
- Use spring physics for modals/transitions
- Layer glass effects for depth

### ❌ Don't
- Use flat white/gray backgrounds
- Use standard `shadow-lg` (black shadows)
- Use sharp corners on interactive elements
- Leave buttons/cards static on hover
- Use linear easing for state changes
- Forget dark mode variants

---

## Quick Copy-Paste Snippets

### Standard Glass Card
```tsx
className="bg-white/70 dark:bg-gray-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:bg-white/85 hover:shadow-[0_20px_40px_rgb(59,130,246,0.1)] hover:-translate-y-1 transition-all duration-300"
```

### Primary Glow Button
```tsx
className="bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-full shadow-[0_8px_30px_rgb(59,130,246,0.3)] hover:shadow-[0_12px_40px_rgb(59,130,246,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
```

### Glass Input
```tsx
className="bg-white/60 dark:bg-gray-900/40 backdrop-blur-lg border border-white/30 dark:border-white/10 rounded-xl focus:border-primary/50 focus:shadow-[0_0_20px_rgb(59,130,246,0.15)] transition-all duration-200"
```

### Glass Modal Backdrop
```tsx
className="bg-black/40 backdrop-blur-sm"
```

---

*Last updated: January 2026*
*Design System Version: 2.0 - Soft Pop Glass*

