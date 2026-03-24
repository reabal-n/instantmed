# Morning Canvas Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the Morning Canvas design system across all InstantMed pages — animated mesh gradient canvas, 12 section components, 4 hero variants, 3D card interactions, word-by-word text reveals, clip-path image animations, enhanced color tokens, and View Transitions API.

**Architecture:** Component library approach. New primitives in `components/ui/morning/`. Section components in `components/sections/`. Hero variants in `components/heroes/`. Each page composes unique combinations from the library. All components respect `prefers-reduced-motion` and degrade gracefully on mobile.

**Tech Stack:** React 19, Framer Motion, Tailwind v4 (CSS-first), Next.js 15 App Router, CSS View Transitions API, IntersectionObserver.

---

## Phase 1: Design Tokens & Motion Primitives

### Task 1: Add Enhanced Color Tokens

**Files:**
- Modify: `app/globals.css`

**Step 1: Add accent tokens to `:root`**

In `app/globals.css`, inside the `:root` block, after the existing `--warning-foreground` line, add:

```css
/* Morning Canvas accent tokens */
--accent-teal: #5DB8C9;
--accent-teal-foreground: #0B1120;
--accent-gold: #D4A853;
--accent-gold-foreground: #0B1120;
--accent-peach: #F0B4A0;
--accent-peach-foreground: #1E293B;
```

**Step 2: Add dark mode accent overrides**

In `app/globals.css`, inside the `.dark` block (the one within `@layer base`), after existing dark overrides, add:

```css
/* Morning Canvas accent tokens — dark */
--accent-teal: #7DD3E1;
--accent-teal-foreground: #0B1120;
--accent-gold: #E5C478;
--accent-gold-foreground: #0B1120;
--accent-peach: #E8A08C;
--accent-peach-foreground: #0B1120;
```

**Step 3: Register tokens with Tailwind**

In `app/globals.css`, inside the `@theme inline` block, add:

```css
--color-accent-teal: var(--accent-teal);
--color-accent-gold: var(--accent-gold);
--color-accent-peach: var(--accent-peach);
```

**Step 4: Verify build**

Run: `pnpm typecheck && pnpm build`
Expected: 0 errors. New `bg-accent-teal`, `text-accent-gold`, `border-accent-peach` classes now available.

**Step 5: Commit**

```bash
git add app/globals.css
git commit -m "feat(tokens): add accent-teal, accent-gold, accent-peach Morning Canvas tokens"
```

---

### Task 2: Extend Motion Presets

**Files:**
- Modify: `components/ui/motion.tsx`

**Step 1: Add new spring presets**

In `components/ui/motion.tsx`, extend `springPresets`:

```typescript
export const springPresets = {
  gentle: { stiffness: 200, damping: 30 },
  calm: { stiffness: 150, damping: 25 },
  smooth: { stiffness: 120, damping: 20 },
  dramatic: { stiffness: 80, damping: 15 },
  bouncy: { stiffness: 300, damping: 20 },
} as const;
```

**Step 2: Add expanded duration tiers**

Extend `motionDurations`:

```typescript
export const motionDurations = {
  micro: 0.15,
  fast: 0.2,
  normal: 0.3,
  slow: 0.4,
  slower: 0.5,
  dramatic: 0.7,
  ambient: 20,
} as const;
```

**Step 3: Add scroll reveal threshold constant**

```typescript
export const scrollRevealConfig = {
  threshold: 0.15,
  once: true,
  margin: "-50px",
} as const;
```

**Step 4: Verify build**

Run: `pnpm typecheck`
Expected: 0 errors.

**Step 5: Commit**

```bash
git add components/ui/motion.tsx
git commit -m "feat(motion): add dramatic/bouncy springs, expanded duration tiers"
```

---

## Phase 2: Canvas & Background

### Task 3: Create MeshGradientCanvas

**Files:**
- Create: `components/ui/morning/mesh-gradient-canvas.tsx`

**Step 1: Create the morning directory**

```bash
mkdir -p components/ui/morning
```

**Step 2: Build MeshGradientCanvas component**

This replaces/layers on top of the existing `SkyBackground`/`NightSkyBackground` approach. Uses the existing `GradientBgMotion` pattern from `components/ui/gradient-bg.tsx` as reference (it already has a mesh variant with animated drift).

```tsx
"use client";

import { motion, useReducedMotion } from "framer-motion";

const LIGHT_BLOBS = [
  { color: "rgba(186, 218, 246, 0.03)", x: "20%", y: "30%", size: "60%" },
  { color: "rgba(240, 180, 160, 0.03)", x: "70%", y: "20%", size: "50%" },
  { color: "rgba(250, 245, 235, 0.03)", x: "40%", y: "70%", size: "55%" },
];

const DARK_BLOBS = [
  { color: "rgba(30, 50, 80, 0.04)", x: "20%", y: "30%", size: "60%" },
  { color: "rgba(50, 40, 70, 0.03)", x: "70%", y: "20%", size: "50%" },
  { color: "rgba(20, 40, 60, 0.04)", x: "40%", y: "70%", size: "55%" },
];

export function MeshGradientCanvas() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden="true"
    >
      {/* Light mode blobs */}
      <div className="absolute inset-0 dark:opacity-0 transition-opacity duration-700">
        {LIGHT_BLOBS.map((blob, i) => (
          <motion.div
            key={`light-${i}`}
            className="absolute rounded-full mix-blend-soft-light"
            style={{
              background: `radial-gradient(circle, ${blob.color} 0%, transparent 70%)`,
              width: blob.size,
              height: blob.size,
              left: blob.x,
              top: blob.y,
              transform: "translate(-50%, -50%)",
            }}
            animate={
              prefersReducedMotion
                ? {}
                : {
                    x: [0, 30, -20, 0],
                    y: [0, -25, 15, 0],
                    scale: [1, 1.1, 0.95, 1],
                  }
            }
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 3,
            }}
          />
        ))}
      </div>

      {/* Dark mode blobs */}
      <div className="absolute inset-0 opacity-0 dark:opacity-100 transition-opacity duration-700">
        {DARK_BLOBS.map((blob, i) => (
          <motion.div
            key={`dark-${i}`}
            className="absolute rounded-full mix-blend-soft-light"
            style={{
              background: `radial-gradient(circle, ${blob.color} 0%, transparent 70%)`,
              width: blob.size,
              height: blob.size,
              left: blob.x,
              top: blob.y,
              transform: "translate(-50%, -50%)",
            }}
            animate={
              prefersReducedMotion
                ? {}
                : {
                    x: [0, 30, -20, 0],
                    y: [0, -25, 15, 0],
                    scale: [1, 1.1, 0.95, 1],
                  }
            }
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 3,
            }}
          />
        ))}
      </div>
    </div>
  );
}
```

**Step 3: Verify build**

Run: `pnpm typecheck`
Expected: 0 errors.

**Step 4: Commit**

```bash
git add components/ui/morning/mesh-gradient-canvas.tsx
git commit -m "feat(canvas): add MeshGradientCanvas with light/dark animated blobs"
```

---

### Task 4: Integrate MeshGradientCanvas into Root Layout

**Files:**
- Modify: `app/layout.tsx`

**Step 1: Read current layout**

Read `app/layout.tsx` to understand current structure.

**Step 2: Add MeshGradientCanvas**

Import and add `<MeshGradientCanvas />` inside the body, before the main content. This sits alongside or replaces `SkyBackground`/`NightSkyBackground` depending on how those are currently scoped (they may be homepage-only).

```tsx
import { MeshGradientCanvas } from "@/components/ui/morning/mesh-gradient-canvas";
```

Add to the body: `<MeshGradientCanvas />` — as a fixed background, it'll render site-wide.

**Step 3: Verify visually**

Start dev server, check both light and dark mode. Canvas should be subtly visible beneath page content.

**Step 4: Commit**

```bash
git add app/layout.tsx
git commit -m "feat(layout): integrate MeshGradientCanvas site-wide"
```

---

## Phase 3: Text & Image Animation Primitives

### Task 5: Create WordReveal Component

**Files:**
- Create: `components/ui/morning/word-reveal.tsx`

**Step 1: Build component**

Adapt from existing `TextRevealWord` in `components/effects/text-reveal.tsx` (which has `rotateX(-90deg)` + `perspective(1000px)`) but simplified to match spec: opacity + y:12, 60ms stagger, 400ms per word, no 3D rotation.

```tsx
"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import { scrollRevealConfig } from "@/components/ui/motion";

interface WordRevealProps {
  text: string;
  className?: string;
  highlightWords?: string[];
  highlightClassName?: string;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  staggerDelay?: number;
  wordDuration?: number;
}

export function WordReveal({
  text,
  className,
  highlightWords = [],
  highlightClassName = "text-primary",
  as: Tag = "h2",
  staggerDelay = 0.06,
  wordDuration = 0.4,
}: WordRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, {
    once: scrollRevealConfig.once,
    margin: scrollRevealConfig.margin as `${number}px`,
    amount: scrollRevealConfig.threshold,
  });
  const prefersReducedMotion = useReducedMotion();

  const words = text.split(" ");

  if (prefersReducedMotion) {
    return (
      <Tag className={className}>
        {words.map((word, i) => {
          const isHighlighted = highlightWords.some(
            (hw) => hw.toLowerCase() === word.toLowerCase().replace(/[^a-z]/g, "")
          );
          return (
            <span key={i}>
              {isHighlighted ? (
                <span className={highlightClassName}>{word}</span>
              ) : (
                word
              )}
              {i < words.length - 1 ? " " : ""}
            </span>
          );
        })}
      </Tag>
    );
  }

  return (
    <Tag ref={ref} className={cn("flex flex-wrap", className)}>
      {words.map((word, i) => {
        const isHighlighted = highlightWords.some(
          (hw) => hw.toLowerCase() === word.toLowerCase().replace(/[^a-z]/g, "")
        );
        return (
          <motion.span
            key={i}
            className={cn("inline-block mr-[0.25em]", isHighlighted && highlightClassName)}
            initial={{ opacity: 0, y: 12 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            transition={{
              duration: wordDuration,
              delay: i * staggerDelay,
              ease: [0.25, 0.1, 0.25, 1],
            }}
          >
            {word}
          </motion.span>
        );
      })}
    </Tag>
  );
}
```

**Step 2: Verify build**

Run: `pnpm typecheck`
Expected: 0 errors.

**Step 3: Commit**

```bash
git add components/ui/morning/word-reveal.tsx
git commit -m "feat(animation): add WordReveal component with highlight support"
```

---

### Task 6: Create ClipPathImage Component

**Files:**
- Create: `components/ui/morning/clip-path-image.tsx`

**Step 1: Build component**

Scroll-triggered image reveal with clip-path expand + Ken Burns scale.

```tsx
"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { scrollRevealConfig } from "@/components/ui/motion";

interface ClipPathImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
  direction?: "bottom" | "left" | "right" | "top";
}

const clipPaths = {
  bottom: { hidden: "inset(100% 0 0 0)", visible: "inset(0 0 0 0)" },
  top: { hidden: "inset(0 0 100% 0)", visible: "inset(0 0 0 0)" },
  left: { hidden: "inset(0 100% 0 0)", visible: "inset(0 0 0 0)" },
  right: { hidden: "inset(0 0 0 100%)", visible: "inset(0 0 0 0)" },
};

export function ClipPathImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  direction = "bottom",
}: ClipPathImageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, {
    once: scrollRevealConfig.once,
    amount: scrollRevealConfig.threshold,
  });
  const prefersReducedMotion = useReducedMotion();

  const clip = clipPaths[direction];

  return (
    <motion.div
      ref={ref}
      className={cn("overflow-hidden rounded-2xl", className)}
      initial={prefersReducedMotion ? {} : { clipPath: clip.hidden }}
      animate={
        prefersReducedMotion
          ? {}
          : isInView
            ? { clipPath: clip.visible }
            : { clipPath: clip.hidden }
      }
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <motion.div
        initial={prefersReducedMotion ? {} : { scale: 1.05 }}
        animate={
          prefersReducedMotion
            ? {}
            : isInView
              ? { scale: 1 }
              : { scale: 1.05 }
        }
        transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className="w-full h-full object-cover"
          priority={priority}
        />
      </motion.div>
    </motion.div>
  );
}
```

**Step 2: Verify build**

Run: `pnpm typecheck`
Expected: 0 errors.

**Step 3: Commit**

```bash
git add components/ui/morning/clip-path-image.tsx
git commit -m "feat(animation): add ClipPathImage with directional reveal + Ken Burns"
```

---

## Phase 4: Enhanced Card System

### Task 7: Create PerspectiveTiltCard

**Files:**
- Create: `components/ui/morning/perspective-tilt-card.tsx`

**Step 1: Build component**

Extends existing `TiltCard` pattern (CSS perspective) with Framer `useMotionValue`/`useSpring` for smooth interpolation, spotlight radial gradient, and spring-back.

```tsx
"use client";

import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import { type ReactNode, useRef, type MouseEvent } from "react";
import { cn } from "@/lib/utils";
import { springPresets } from "@/components/ui/motion";

interface PerspectiveTiltCardProps {
  children: ReactNode;
  className?: string;
  maxRotation?: number;
  spotlightOpacity?: number;
  variant?: "glass" | "solid" | "gradient" | "outline";
}

const variantStyles = {
  glass:
    "bg-white/75 dark:bg-white/5 backdrop-blur-xl border border-white/50 dark:border-white/10",
  solid:
    "bg-white dark:bg-[#141D30] border border-border shadow-sm",
  gradient:
    "bg-gradient-to-br from-sky-50 to-[#FAF5EB] dark:from-[#141D30] dark:to-[#1A2340] border border-border",
  outline:
    "bg-transparent border border-border hover:bg-white/50 dark:hover:bg-white/5",
};

export function PerspectiveTiltCard({
  children,
  className,
  maxRotation = 6,
  spotlightOpacity = 0.15,
  variant = "glass",
}: PerspectiveTiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const spotlightX = useMotionValue(50);
  const spotlightY = useMotionValue(50);

  const springRotateX = useSpring(rotateX, springPresets.smooth);
  const springRotateY = useSpring(rotateY, springPresets.smooth);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const percentX = (e.clientX - centerX) / (rect.width / 2);
    const percentY = (e.clientY - centerY) / (rect.height / 2);

    rotateX.set(-percentY * maxRotation);
    rotateY.set(percentX * maxRotation);
    spotlightX.set(((e.clientX - rect.left) / rect.width) * 100);
    spotlightY.set(((e.clientY - rect.top) / rect.height) * 100);
  };

  const handleMouseLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
    spotlightX.set(50);
    spotlightY.set(50);
  };

  if (prefersReducedMotion) {
    return (
      <div className={cn("rounded-2xl p-6", variantStyles[variant], className)}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      className={cn("relative rounded-2xl p-6 overflow-hidden", variantStyles[variant], className)}
      style={{
        perspective: 800,
        rotateX: springRotateX,
        rotateY: springRotateY,
        transformStyle: "preserve-3d",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={{
        boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
        borderColor: "rgba(59, 130, 246, 0.3)",
      }}
      transition={{ duration: 0.25 }}
    >
      {/* Spotlight overlay */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{
          background: `radial-gradient(circle at ${spotlightX.get()}% ${spotlightY.get()}%, rgba(255,255,255,${spotlightOpacity}), transparent 60%)`,
        }}
      />
      <div style={{ transform: "translateZ(0)" }}>{children}</div>
    </motion.div>
  );
}
```

**Step 2: Verify build**

Run: `pnpm typecheck`
Expected: 0 errors.

**Step 3: Commit**

```bash
git add components/ui/morning/perspective-tilt-card.tsx
git commit -m "feat(cards): add PerspectiveTiltCard with 3D tilt, spotlight, 4 variants"
```

---

## Phase 5: Section Component Library

All section components go in `components/sections/`. Each is a self-contained, reusable page section with its own scroll-triggered animations.

### Task 8: Create Section Component Barrel + Shared Types

**Files:**
- Create: `components/sections/index.ts`
- Create: `components/sections/types.ts`

**Step 1: Create shared types**

```typescript
// components/sections/types.ts
import type { ReactNode } from "react";

export interface SectionProps {
  className?: string;
  id?: string;
}

export interface SectionHeaderProps {
  pill?: string;
  title: string;
  subtitle?: string;
  highlightWords?: string[];
  align?: "left" | "center";
}

export interface ComparisonItem {
  label: string;
  us: string | boolean;
  them: string | boolean;
}

export interface StatItem {
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
}

export interface TimelineStep {
  title: string;
  description: string;
  icon?: ReactNode;
}

export interface FeatureItem {
  icon: ReactNode;
  title: string;
  description: string;
}

export interface ChecklistItem {
  text: string;
  subtext?: string;
}

export interface ProcessStep {
  number: number;
  title: string;
  description: string;
}
```

**Step 2: Create barrel file**

```typescript
// components/sections/index.ts
export { SectionHeader } from "./section-header";
export { ComparisonTable } from "./comparison-table";
export { FeatureGrid } from "./feature-grid";
export { StatStrip } from "./stat-strip";
export { Timeline } from "./timeline";
export { AccordionSection } from "./accordion-section";
export { ImageTextSplit } from "./image-text-split";
export { IconChecklist } from "./icon-checklist";
export { ProcessSteps } from "./process-steps";
export { CTABanner } from "./cta-banner";
export { LogoBadgeStrip } from "./logo-badge-strip";
export type * from "./types";
```

Note: TestimonialCarousel and PricingCards exist already as `PatientReviews` and pricing components. We'll adapt those in-place rather than duplicate.

**Step 3: Commit**

```bash
git add components/sections/
git commit -m "feat(sections): add types and barrel for section component library"
```

---

### Task 9: Create SectionHeader Component

**Files:**
- Create: `components/sections/section-header.tsx`

**Step 1: Build component**

Every section uses this — pill badge + word-reveal title + subtitle. Adapts the pattern from existing `SectionPill` in `components/ui/section-pill.tsx`.

```tsx
"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import { WordReveal } from "@/components/ui/morning/word-reveal";
import { scrollRevealConfig } from "@/components/ui/motion";

interface SectionHeaderProps {
  pill?: string;
  title: string;
  subtitle?: string;
  highlightWords?: string[];
  align?: "left" | "center";
  className?: string;
  titleAs?: "h1" | "h2" | "h3";
}

export function SectionHeader({
  pill,
  title,
  subtitle,
  highlightWords,
  align = "center",
  className,
  titleAs = "h2",
}: SectionHeaderProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, {
    once: scrollRevealConfig.once,
    amount: scrollRevealConfig.threshold,
  });
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      ref={ref}
      className={cn(
        "mb-12 max-w-3xl",
        align === "center" ? "mx-auto text-center" : "text-left",
        className
      )}
    >
      {pill && (
        <motion.span
          className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-medium tracking-wider text-primary uppercase mb-4"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
          animate={
            prefersReducedMotion
              ? {}
              : isInView
                ? { opacity: 1, y: 0 }
                : {}
          }
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {pill}
        </motion.span>
      )}

      <WordReveal
        text={title}
        as={titleAs}
        highlightWords={highlightWords}
        className={cn(
          "text-3xl font-semibold tracking-tight text-foreground sm:text-4xl",
          align === "center" && "justify-center"
        )}
      />

      {subtitle && (
        <motion.p
          className="mt-4 text-lg text-muted-foreground"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
          animate={
            prefersReducedMotion
              ? {}
              : isInView
                ? { opacity: 1, y: 0 }
                : {}
          }
          transition={{ duration: 0.3, delay: 0.3, ease: "easeOut" }}
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  );
}
```

**Step 2: Verify build**

Run: `pnpm typecheck`
Expected: 0 errors.

**Step 3: Commit**

```bash
git add components/sections/section-header.tsx
git commit -m "feat(sections): add SectionHeader with pill badge + WordReveal title"
```

---

### Task 10: Create ComparisonTable Section

**Files:**
- Create: `components/sections/comparison-table.tsx`

**Step 1: Build component**

Side-by-side comparison with check/x marks, staggered row reveals. For service landing pages (us vs GP visit).

```tsx
"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { Check, X } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { SectionHeader } from "./section-header";
import type { SectionProps, ComparisonItem } from "./types";
import { scrollRevealConfig } from "@/components/ui/motion";

interface ComparisonTableProps extends SectionProps {
  pill?: string;
  title: string;
  subtitle?: string;
  highlightWords?: string[];
  usLabel: string;
  themLabel: string;
  items: ComparisonItem[];
}

export function ComparisonTable({
  pill,
  title,
  subtitle,
  highlightWords,
  usLabel,
  themLabel,
  items,
  className,
  id,
}: ComparisonTableProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, {
    once: scrollRevealConfig.once,
    amount: scrollRevealConfig.threshold,
  });
  const prefersReducedMotion = useReducedMotion();

  return (
    <section id={id} className={cn("py-20 px-4", className)}>
      <SectionHeader
        pill={pill}
        title={title}
        subtitle={subtitle}
        highlightWords={highlightWords}
      />

      <div ref={ref} className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-border bg-white/80 dark:bg-white/5 backdrop-blur-sm">
        {/* Header row */}
        <div className="grid grid-cols-[1fr_120px_120px] gap-0 border-b border-border bg-muted/50 px-6 py-4 text-sm font-medium text-muted-foreground">
          <span />
          <span className="text-center text-primary font-semibold">{usLabel}</span>
          <span className="text-center">{themLabel}</span>
        </div>

        {/* Comparison rows */}
        {items.map((item, i) => (
          <motion.div
            key={item.label}
            className={cn(
              "grid grid-cols-[1fr_120px_120px] gap-0 px-6 py-4 text-sm",
              i < items.length - 1 && "border-b border-border/50"
            )}
            initial={prefersReducedMotion ? {} : { opacity: 0, x: -12 }}
            animate={
              prefersReducedMotion
                ? {}
                : isInView
                  ? { opacity: 1, x: 0 }
                  : {}
            }
            transition={{
              duration: 0.3,
              delay: i * 0.08,
              ease: [0.25, 0.1, 0.25, 1],
            }}
          >
            <span className="text-foreground">{item.label}</span>
            <span className="flex justify-center">
              {typeof item.us === "boolean" ? (
                item.us ? (
                  <Check className="h-5 w-5 text-success" />
                ) : (
                  <X className="h-5 w-5 text-destructive" />
                )
              ) : (
                <span className="text-foreground font-medium">{item.us}</span>
              )}
            </span>
            <span className="flex justify-center">
              {typeof item.them === "boolean" ? (
                item.them ? (
                  <Check className="h-5 w-5 text-success" />
                ) : (
                  <X className="h-5 w-5 text-destructive" />
                )
              ) : (
                <span className="text-muted-foreground">{item.them}</span>
              )}
            </span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
```

**Step 2: Verify build**

Run: `pnpm typecheck`
Expected: 0 errors.

**Step 3: Commit**

```bash
git add components/sections/comparison-table.tsx
git commit -m "feat(sections): add ComparisonTable with staggered row reveals"
```

---

### Task 11: Create FeatureGrid Section

**Files:**
- Create: `components/sections/feature-grid.tsx`

**Step 1: Build component**

3-4 column grid of icon cards with PerspectiveTiltCard hover. Uses `GridStagger` pattern from existing `components/effects/stagger-container.tsx`.

```tsx
"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import { PerspectiveTiltCard } from "@/components/ui/morning/perspective-tilt-card";
import { SectionHeader } from "./section-header";
import type { SectionProps, FeatureItem } from "./types";
import { scrollRevealConfig } from "@/components/ui/motion";

interface FeatureGridProps extends SectionProps {
  pill?: string;
  title: string;
  subtitle?: string;
  highlightWords?: string[];
  features: FeatureItem[];
  columns?: 2 | 3 | 4;
}

const colsClass = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

export function FeatureGrid({
  pill,
  title,
  subtitle,
  highlightWords,
  features,
  columns = 3,
  className,
  id,
}: FeatureGridProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, {
    once: scrollRevealConfig.once,
    amount: 0.1,
  });
  const prefersReducedMotion = useReducedMotion();

  return (
    <section id={id} className={cn("py-20 px-4", className)}>
      <SectionHeader
        pill={pill}
        title={title}
        subtitle={subtitle}
        highlightWords={highlightWords}
      />

      <div
        ref={ref}
        className={cn("mx-auto max-w-5xl grid gap-6", colsClass[columns])}
      >
        {features.map((feature, i) => (
          <motion.div
            key={feature.title}
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 20, scale: 0.95 }}
            animate={
              prefersReducedMotion
                ? {}
                : isInView
                  ? { opacity: 1, y: 0, scale: 1 }
                  : {}
            }
            transition={{
              duration: 0.4,
              delay: i * 0.08,
              ease: [0.25, 0.1, 0.25, 1],
            }}
          >
            <PerspectiveTiltCard variant="glass" className="h-full">
              <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3 text-primary">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </PerspectiveTiltCard>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
```

**Step 2: Verify build**

Run: `pnpm typecheck`
Expected: 0 errors.

**Step 3: Commit**

```bash
git add components/sections/feature-grid.tsx
git commit -m "feat(sections): add FeatureGrid with PerspectiveTiltCard items"
```

---

### Task 12: Create StatStrip Section

**Files:**
- Create: `components/sections/stat-strip.tsx`

**Step 1: Build component**

Horizontal band of animated counters with spring overshoot. Uses existing `AnimatedCounter` from `components/effects/stagger-container.tsx` (the real count-up one, not the one in premium-effects).

```tsx
"use client";

import { motion, useInView, useReducedMotion, useSpring, useMotionValue } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { springPresets, scrollRevealConfig } from "@/components/ui/motion";
import type { SectionProps, StatItem } from "./types";

function AnimatedNumber({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const prefersReducedMotion = useReducedMotion();
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, springPresets.bouncy);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (isInView && !prefersReducedMotion) {
      motionValue.set(value);
    } else if (isInView) {
      setDisplay(value);
    }
  }, [isInView, value, motionValue, prefersReducedMotion]);

  useEffect(() => {
    const unsubscribe = spring.on("change", (v) => {
      setDisplay(Math.round(v));
    });
    return unsubscribe;
  }, [spring]);

  return (
    <span ref={ref}>
      {prefix}{display.toLocaleString()}{suffix}
    </span>
  );
}

interface StatStripProps extends SectionProps {
  stats: StatItem[];
}

export function StatStrip({ stats, className, id }: StatStripProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, {
    once: scrollRevealConfig.once,
    amount: scrollRevealConfig.threshold,
  });
  const prefersReducedMotion = useReducedMotion();

  return (
    <section
      id={id}
      ref={ref}
      className={cn(
        "py-12 px-4 border-y border-border/50 bg-muted/30",
        className
      )}
    >
      <div className="mx-auto max-w-5xl grid grid-cols-2 gap-8 sm:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            className="text-center"
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
            animate={
              prefersReducedMotion
                ? {}
                : isInView
                  ? { opacity: 1, y: 0 }
                  : {}
            }
            transition={{
              duration: 0.3,
              delay: i * 0.1,
              ease: "easeOut",
            }}
          >
            <div className="text-3xl font-bold text-foreground sm:text-4xl">
              <AnimatedNumber
                value={stat.value}
                prefix={stat.prefix}
                suffix={stat.suffix}
              />
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {stat.label}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
```

**Step 2: Verify build**

Run: `pnpm typecheck`
Expected: 0 errors.

**Step 3: Commit**

```bash
git add components/sections/stat-strip.tsx
git commit -m "feat(sections): add StatStrip with spring-animated counters"
```

---

### Task 13: Create Timeline Section

**Files:**
- Create: `components/sections/timeline.tsx`

**Step 1: Build component**

Vertical stepped timeline with scroll-triggered step reveals and progressive line draw.

```tsx
"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import { SectionHeader } from "./section-header";
import type { SectionProps, TimelineStep } from "./types";
import { scrollRevealConfig } from "@/components/ui/motion";

interface TimelineProps extends SectionProps {
  pill?: string;
  title: string;
  subtitle?: string;
  highlightWords?: string[];
  steps: TimelineStep[];
}

function TimelineItem({ step, index }: { step: TimelineStep; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, {
    once: scrollRevealConfig.once,
    amount: 0.3,
  });
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      className="relative flex gap-6 pb-12 last:pb-0"
      initial={prefersReducedMotion ? {} : { opacity: 0, x: -20 }}
      animate={
        prefersReducedMotion
          ? {}
          : isInView
            ? { opacity: 1, x: 0 }
            : {}
      }
      transition={{
        duration: 0.4,
        delay: 0.1,
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      {/* Line + dot */}
      <div className="relative flex flex-col items-center">
        <motion.div
          className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-white dark:bg-[#141D30] text-primary font-semibold text-sm"
          initial={prefersReducedMotion ? {} : { scale: 0 }}
          animate={
            prefersReducedMotion
              ? {}
              : isInView
                ? { scale: 1 }
                : {}
          }
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 20,
            delay: 0.15,
          }}
        >
          {step.icon ?? index + 1}
        </motion.div>
        {/* Connecting line */}
        <motion.div
          className="w-0.5 flex-1 bg-border"
          initial={prefersReducedMotion ? {} : { scaleY: 0 }}
          animate={
            prefersReducedMotion
              ? {}
              : isInView
                ? { scaleY: 1 }
                : {}
          }
          style={{ transformOrigin: "top" }}
          transition={{
            duration: 0.4,
            delay: 0.3,
            ease: "easeOut",
          }}
        />
      </div>

      {/* Content */}
      <div className="pt-1.5 pb-4">
        <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
          {step.description}
        </p>
      </div>
    </motion.div>
  );
}

export function Timeline({
  pill,
  title,
  subtitle,
  highlightWords,
  steps,
  className,
  id,
}: TimelineProps) {
  return (
    <section id={id} className={cn("py-20 px-4", className)}>
      <SectionHeader
        pill={pill}
        title={title}
        subtitle={subtitle}
        highlightWords={highlightWords}
      />

      <div className="mx-auto max-w-xl">
        {steps.map((step, i) => (
          <TimelineItem key={step.title} step={step} index={i} />
        ))}
      </div>
    </section>
  );
}
```

**Step 2: Verify build**

Run: `pnpm typecheck`
Expected: 0 errors.

**Step 3: Commit**

```bash
git add components/sections/timeline.tsx
git commit -m "feat(sections): add Timeline with scroll-triggered step reveals"
```

---

### Task 14: Create AccordionSection

**Files:**
- Create: `components/sections/accordion-section.tsx`

**Step 1: Build component**

Wraps shadcn Accordion with SectionHeader and stagger animation. Adapts pattern from existing `app/faq/faq-accordion.tsx`.

```tsx
"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SectionHeader } from "./section-header";
import type { SectionProps } from "./types";
import { scrollRevealConfig } from "@/components/ui/motion";

interface AccordionEntry {
  question: string;
  answer: string;
}

interface AccordionCategory {
  category?: string;
  items: AccordionEntry[];
}

interface AccordionSectionProps extends SectionProps {
  pill?: string;
  title: string;
  subtitle?: string;
  highlightWords?: string[];
  groups: AccordionCategory[];
}

export function AccordionSection({
  pill,
  title,
  subtitle,
  highlightWords,
  groups,
  className,
  id,
}: AccordionSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, {
    once: scrollRevealConfig.once,
    amount: 0.1,
  });
  const prefersReducedMotion = useReducedMotion();

  return (
    <section id={id} className={cn("py-20 px-4", className)}>
      <SectionHeader
        pill={pill}
        title={title}
        subtitle={subtitle}
        highlightWords={highlightWords}
      />

      <div ref={ref} className="mx-auto max-w-3xl space-y-10">
        {groups.map((group, gi) => (
          <div key={group.category ?? gi}>
            {group.category && (
              <motion.h3
                className="mb-4 text-lg font-semibold text-foreground"
                initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
                animate={
                  prefersReducedMotion
                    ? {}
                    : isInView
                      ? { opacity: 1, y: 0 }
                      : {}
                }
                transition={{ duration: 0.3, delay: gi * 0.1 }}
              >
                {group.category}
              </motion.h3>
            )}
            <Accordion type="single" collapsible className="space-y-2">
              {group.items.map((item, ii) => (
                <motion.div
                  key={item.question}
                  initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
                  animate={
                    prefersReducedMotion
                      ? {}
                      : isInView
                        ? { opacity: 1, y: 0 }
                        : {}
                  }
                  transition={{
                    duration: 0.3,
                    delay: gi * 0.1 + ii * 0.05,
                  }}
                >
                  <AccordionItem
                    value={`${gi}-${ii}`}
                    className="rounded-xl border border-border/50 bg-white/60 dark:bg-white/5 backdrop-blur-sm px-5"
                  >
                    <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                </motion.div>
              ))}
            </Accordion>
          </div>
        ))}
      </div>
    </section>
  );
}
```

**Step 2: Verify build**

Run: `pnpm typecheck`
Expected: 0 errors.

**Step 3: Commit**

```bash
git add components/sections/accordion-section.tsx
git commit -m "feat(sections): add AccordionSection with categorized groups"
```

---

### Task 15: Create ImageTextSplit Section

**Files:**
- Create: `components/sections/image-text-split.tsx`

**Step 1: Build component**

Two-column text + image with alternating sides. Uses ClipPathImage for the image reveal.

```tsx
"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ClipPathImage } from "@/components/ui/morning/clip-path-image";
import { WordReveal } from "@/components/ui/morning/word-reveal";
import { scrollRevealConfig } from "@/components/ui/motion";
import type { SectionProps } from "./types";

interface ImageTextSplitProps extends SectionProps {
  title: string;
  highlightWords?: string[];
  description: string;
  imageSrc: string;
  imageAlt: string;
  imagePosition?: "left" | "right";
  children?: ReactNode;
}

export function ImageTextSplit({
  title,
  highlightWords,
  description,
  imageSrc,
  imageAlt,
  imagePosition = "right",
  children,
  className,
  id,
}: ImageTextSplitProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, {
    once: scrollRevealConfig.once,
    amount: scrollRevealConfig.threshold,
  });
  const prefersReducedMotion = useReducedMotion();

  return (
    <section id={id} className={cn("py-20 px-4", className)}>
      <div
        ref={ref}
        className={cn(
          "mx-auto max-w-5xl flex flex-col gap-12 items-center",
          "lg:flex-row lg:gap-16",
          imagePosition === "left" && "lg:flex-row-reverse"
        )}
      >
        {/* Text */}
        <div className="flex-1 text-center lg:text-left">
          <WordReveal
            text={title}
            as="h2"
            highlightWords={highlightWords}
            className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:justify-start"
          />
          <motion.p
            className="mt-4 text-muted-foreground leading-relaxed"
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
            animate={
              prefersReducedMotion
                ? {}
                : isInView
                  ? { opacity: 1, y: 0 }
                  : {}
            }
            transition={{ duration: 0.3, delay: 0.3, ease: "easeOut" }}
          >
            {description}
          </motion.p>
          {children && (
            <motion.div
              className="mt-6"
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
              animate={
                prefersReducedMotion
                  ? {}
                  : isInView
                    ? { opacity: 1, y: 0 }
                    : {}
              }
              transition={{ duration: 0.3, delay: 0.4, ease: "easeOut" }}
            >
              {children}
            </motion.div>
          )}
        </div>

        {/* Image */}
        <div className="hidden lg:block w-64 xl:w-80 shrink-0">
          <ClipPathImage
            src={imageSrc}
            alt={imageAlt}
            width={1200}
            height={900}
            className="aspect-[4/3] rounded-2xl shadow-lg ring-1 ring-black/5 dark:ring-white/10"
            direction={imagePosition === "right" ? "left" : "right"}
          />
        </div>
      </div>
    </section>
  );
}
```

**Step 2: Verify build**

Run: `pnpm typecheck`
Expected: 0 errors.

**Step 3: Commit**

```bash
git add components/sections/image-text-split.tsx
git commit -m "feat(sections): add ImageTextSplit with ClipPathImage reveal"
```

---

### Task 16: Create IconChecklist Section

**Files:**
- Create: `components/sections/icon-checklist.tsx`

**Step 1: Build component**

```tsx
"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { Check } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { SectionHeader } from "./section-header";
import type { SectionProps, ChecklistItem } from "./types";
import { scrollRevealConfig } from "@/components/ui/motion";

interface IconChecklistProps extends SectionProps {
  pill?: string;
  title: string;
  subtitle?: string;
  highlightWords?: string[];
  items: ChecklistItem[];
  columns?: 1 | 2;
}

export function IconChecklist({
  pill,
  title,
  subtitle,
  highlightWords,
  items,
  columns = 1,
  className,
  id,
}: IconChecklistProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, {
    once: scrollRevealConfig.once,
    amount: 0.1,
  });
  const prefersReducedMotion = useReducedMotion();

  return (
    <section id={id} className={cn("py-20 px-4", className)}>
      <SectionHeader
        pill={pill}
        title={title}
        subtitle={subtitle}
        highlightWords={highlightWords}
      />

      <div
        ref={ref}
        className={cn(
          "mx-auto max-w-3xl space-y-4",
          columns === 2 && "sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0"
        )}
      >
        {items.map((item, i) => (
          <motion.div
            key={item.text}
            className="flex gap-3 rounded-xl border border-border/50 bg-white/60 dark:bg-white/5 backdrop-blur-sm p-4"
            initial={prefersReducedMotion ? {} : { opacity: 0, x: -12 }}
            animate={
              prefersReducedMotion
                ? {}
                : isInView
                  ? { opacity: 1, x: 0 }
                  : {}
            }
            transition={{
              duration: 0.3,
              delay: i * 0.05,
              ease: [0.25, 0.1, 0.25, 1],
            }}
          >
            <motion.div
              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/20 text-success"
              initial={prefersReducedMotion ? {} : { scale: 0 }}
              animate={
                prefersReducedMotion
                  ? {}
                  : isInView
                    ? { scale: 1 }
                    : {}
              }
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
                delay: i * 0.05 + 0.15,
              }}
            >
              <Check className="h-3 w-3" />
            </motion.div>
            <div>
              <span className="text-sm font-medium text-foreground">{item.text}</span>
              {item.subtext && (
                <p className="mt-0.5 text-xs text-muted-foreground">{item.subtext}</p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
```

**Step 2: Verify & Commit**

Run: `pnpm typecheck`

```bash
git add components/sections/icon-checklist.tsx
git commit -m "feat(sections): add IconChecklist with animated check marks"
```

---

### Task 17: Create ProcessSteps Section

**Files:**
- Create: `components/sections/process-steps.tsx`

**Step 1: Build component**

Horizontal numbered steps with connecting line.

```tsx
"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import { SectionHeader } from "./section-header";
import type { SectionProps, ProcessStep } from "./types";
import { scrollRevealConfig } from "@/components/ui/motion";

interface ProcessStepsProps extends SectionProps {
  pill?: string;
  title: string;
  subtitle?: string;
  highlightWords?: string[];
  steps: ProcessStep[];
}

export function ProcessSteps({
  pill,
  title,
  subtitle,
  highlightWords,
  steps,
  className,
  id,
}: ProcessStepsProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, {
    once: scrollRevealConfig.once,
    amount: scrollRevealConfig.threshold,
  });
  const prefersReducedMotion = useReducedMotion();

  return (
    <section id={id} className={cn("py-20 px-4", className)}>
      <SectionHeader
        pill={pill}
        title={title}
        subtitle={subtitle}
        highlightWords={highlightWords}
      />

      <div ref={ref} className="mx-auto max-w-4xl">
        {/* Desktop: horizontal */}
        <div className="hidden sm:grid sm:grid-cols-3 sm:gap-0 relative">
          {/* Connecting line */}
          <motion.div
            className="absolute top-5 left-[16.67%] right-[16.67%] h-0.5 bg-border"
            initial={prefersReducedMotion ? {} : { scaleX: 0 }}
            animate={
              prefersReducedMotion
                ? {}
                : isInView
                  ? { scaleX: 1 }
                  : {}
            }
            style={{ transformOrigin: "left" }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          />

          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              className="relative text-center px-4"
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
              animate={
                prefersReducedMotion
                  ? {}
                  : isInView
                    ? { opacity: 1, y: 0 }
                    : {}
              }
              transition={{
                duration: 0.4,
                delay: i * 0.15 + 0.1,
                ease: [0.25, 0.1, 0.25, 1],
              }}
            >
              <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary bg-white dark:bg-[#141D30] text-primary font-semibold text-sm z-10 relative">
                {step.number}
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">
                {step.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Mobile: vertical stack */}
        <div className="sm:hidden space-y-6">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              className="flex gap-4"
              initial={prefersReducedMotion ? {} : { opacity: 0, x: -12 }}
              animate={
                prefersReducedMotion
                  ? {}
                  : isInView
                    ? { opacity: 1, x: 0 }
                    : {}
              }
              transition={{
                duration: 0.3,
                delay: i * 0.1,
              }}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-primary text-primary font-semibold text-xs">
                {step.number}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

**Step 2: Verify & Commit**

Run: `pnpm typecheck`

```bash
git add components/sections/process-steps.tsx
git commit -m "feat(sections): add ProcessSteps with connecting line animation"
```

---

### Task 18: Create CTABanner Section

**Files:**
- Create: `components/sections/cta-banner.tsx`

**Step 1: Build component**

Full-width gradient band. Adapts pattern from existing `components/marketing/cta-section.tsx`.

```tsx
"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { scrollRevealConfig } from "@/components/ui/motion";
import type { SectionProps } from "./types";

interface CTABannerProps extends SectionProps {
  title: string;
  subtitle?: string;
  ctaText: string;
  ctaHref: string;
  secondaryText?: string;
  secondaryHref?: string;
}

export function CTABanner({
  title,
  subtitle,
  ctaText,
  ctaHref,
  secondaryText,
  secondaryHref,
  className,
  id,
}: CTABannerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, {
    once: scrollRevealConfig.once,
    amount: scrollRevealConfig.threshold,
  });
  const prefersReducedMotion = useReducedMotion();

  return (
    <section id={id} className={cn("py-20 px-4", className)}>
      <motion.div
        ref={ref}
        className="mx-auto max-w-4xl rounded-3xl bg-gradient-to-br from-sky-50 via-white to-[#FFF5EB] dark:from-[#141D30] dark:via-[#1A2340] dark:to-[#141D30] border border-border/50 p-12 text-center shadow-lg"
        initial={prefersReducedMotion ? {} : { opacity: 0, y: 20, scale: 0.98 }}
        animate={
          prefersReducedMotion
            ? {}
            : isInView
              ? { opacity: 1, y: 0, scale: 1 }
              : {}
        }
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            {subtitle}
          </p>
        )}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow-md hover:shadow-lg transition-shadow"
          >
            {ctaText}
            <ArrowRight className="h-4 w-4" />
          </Link>
          {secondaryText && secondaryHref && (
            <Link
              href={secondaryHref}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {secondaryText}
            </Link>
          )}
        </div>
      </motion.div>
    </section>
  );
}
```

**Step 2: Verify & Commit**

Run: `pnpm typecheck`

```bash
git add components/sections/cta-banner.tsx
git commit -m "feat(sections): add CTABanner with gradient card"
```

---

### Task 19: Create LogoBadgeStrip Section

**Files:**
- Create: `components/sections/logo-badge-strip.tsx`

**Step 1: Build component**

Row of trust indicators. Adapts from existing `TrustBadges` in `components/marketing/trust-badges.tsx`.

```tsx
"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { scrollRevealConfig } from "@/components/ui/motion";
import type { SectionProps } from "./types";

interface Badge {
  icon: ReactNode;
  label: string;
}

interface LogoBadgeStripProps extends SectionProps {
  badges: Badge[];
}

export function LogoBadgeStrip({
  badges,
  className,
  id,
}: LogoBadgeStripProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, {
    once: scrollRevealConfig.once,
    amount: scrollRevealConfig.threshold,
  });
  const prefersReducedMotion = useReducedMotion();

  return (
    <section id={id} className={cn("py-10 px-4", className)}>
      <div
        ref={ref}
        className="mx-auto max-w-4xl flex flex-wrap items-center justify-center gap-6"
      >
        {badges.map((badge, i) => (
          <motion.div
            key={badge.label}
            className="flex items-center gap-2 rounded-full border border-border/50 bg-white/60 dark:bg-white/5 backdrop-blur-sm px-4 py-2 text-xs text-muted-foreground"
            initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.9 }}
            animate={
              prefersReducedMotion
                ? {}
                : isInView
                  ? { opacity: 1, scale: 1 }
                  : {}
            }
            transition={{
              duration: 0.3,
              delay: i * 0.06,
              ease: "easeOut",
            }}
          >
            <span className="text-primary">{badge.icon}</span>
            <span>{badge.label}</span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
```

**Step 2: Update barrel, verify & commit**

Ensure `components/sections/index.ts` exports all components (created in Task 8).

Run: `pnpm typecheck`

```bash
git add components/sections/logo-badge-strip.tsx components/sections/index.ts
git commit -m "feat(sections): add LogoBadgeStrip, complete section library barrel"
```

---

## Phase 6: Hero Variants

### Task 20: Create Hero Variants

**Files:**
- Create: `components/heroes/split-hero.tsx`
- Create: `components/heroes/centered-hero.tsx`
- Create: `components/heroes/stats-hero.tsx`
- Create: `components/heroes/full-bleed-hero.tsx`
- Create: `components/heroes/index.ts`

Each hero variant shares: WordReveal title, motion entrance, reduced motion support. They differ in layout. Follow the pattern from the existing `components/marketing/hero.tsx` (two-column, staggered mount animations).

**Step 1: Create heroes directory and barrel**

```bash
mkdir -p components/heroes
```

```typescript
// components/heroes/index.ts
export { SplitHero } from "./split-hero";
export { CenteredHero } from "./centered-hero";
export { StatsHero } from "./stats-hero";
export { FullBleedHero } from "./full-bleed-hero";
```

**Step 2: Build SplitHero**

Two-column: text left, image right (desktop). Follows existing `Hero` pattern. Accepts `imageSrc`, `imageAlt`, children for CTA buttons.

```tsx
// components/heroes/split-hero.tsx
"use client";

import { motion, useReducedMotion } from "framer-motion";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { WordReveal } from "@/components/ui/morning/word-reveal";
import { ClipPathImage } from "@/components/ui/morning/clip-path-image";

interface SplitHeroProps {
  pill?: string;
  title: string;
  highlightWords?: string[];
  subtitle: string;
  imageSrc: string;
  imageAlt: string;
  children?: ReactNode;
  className?: string;
}

export function SplitHero({
  pill,
  title,
  highlightWords,
  subtitle,
  imageSrc,
  imageAlt,
  children,
  className,
}: SplitHeroProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className={cn("relative py-20 px-4 lg:py-28", className)}>
      <div className="mx-auto max-w-5xl flex flex-col items-center gap-12 lg:flex-row lg:gap-16">
        {/* Text */}
        <div className="flex-1 text-center lg:text-left">
          {pill && (
            <motion.span
              className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-medium tracking-wider text-primary uppercase mb-6"
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {pill}
            </motion.span>
          )}
          <WordReveal
            text={title}
            as="h1"
            highlightWords={highlightWords}
            className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl lg:justify-start"
          />
          <motion.p
            className="mt-6 text-lg text-muted-foreground max-w-lg mx-auto lg:mx-0"
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            {subtitle}
          </motion.p>
          {children && (
            <motion.div
              className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.5 }}
            >
              {children}
            </motion.div>
          )}
        </div>

        {/* Image */}
        <div className="hidden lg:block w-72 xl:w-80 shrink-0">
          <ClipPathImage
            src={imageSrc}
            alt={imageAlt}
            width={1200}
            height={1500}
            className="aspect-[4/5] rounded-3xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10"
            direction="right"
            priority
          />
        </div>
      </div>
    </section>
  );
}
```

**Step 3: Build CenteredHero**

```tsx
// components/heroes/centered-hero.tsx
"use client";

import { motion, useReducedMotion } from "framer-motion";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { WordReveal } from "@/components/ui/morning/word-reveal";

interface CenteredHeroProps {
  pill?: string;
  title: string;
  highlightWords?: string[];
  subtitle?: string;
  children?: ReactNode;
  className?: string;
}

export function CenteredHero({
  pill,
  title,
  highlightWords,
  subtitle,
  children,
  className,
}: CenteredHeroProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className={cn("relative py-20 px-4 lg:py-28", className)}>
      <div className="mx-auto max-w-3xl text-center">
        {pill && (
          <motion.span
            className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-medium tracking-wider text-primary uppercase mb-6"
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {pill}
          </motion.span>
        )}
        <WordReveal
          text={title}
          as="h1"
          highlightWords={highlightWords}
          className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl justify-center"
        />
        {subtitle && (
          <motion.p
            className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto"
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            {subtitle}
          </motion.p>
        )}
        {children && (
          <motion.div
            className="mt-8"
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.5 }}
          >
            {children}
          </motion.div>
        )}
      </div>
    </section>
  );
}
```

**Step 4: Build StatsHero**

```tsx
// components/heroes/stats-hero.tsx
"use client";

import { motion, useReducedMotion } from "framer-motion";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { WordReveal } from "@/components/ui/morning/word-reveal";
import { StatStrip } from "@/components/sections/stat-strip";
import type { StatItem } from "@/components/sections/types";

interface StatsHeroProps {
  pill?: string;
  title: string;
  highlightWords?: string[];
  subtitle?: string;
  stats: StatItem[];
  children?: ReactNode;
  className?: string;
}

export function StatsHero({
  pill,
  title,
  highlightWords,
  subtitle,
  stats,
  children,
  className,
}: StatsHeroProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className={cn("relative pt-20 lg:pt-28", className)}>
      <div className="mx-auto max-w-3xl text-center px-4">
        {pill && (
          <motion.span
            className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-medium tracking-wider text-primary uppercase mb-6"
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {pill}
          </motion.span>
        )}
        <WordReveal
          text={title}
          as="h1"
          highlightWords={highlightWords}
          className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl justify-center"
        />
        {subtitle && (
          <motion.p
            className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto"
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            {subtitle}
          </motion.p>
        )}
        {children && (
          <motion.div
            className="mt-8"
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.5 }}
          >
            {children}
          </motion.div>
        )}
      </div>
      <div className="mt-12">
        <StatStrip stats={stats} />
      </div>
    </section>
  );
}
```

**Step 5: Build FullBleedHero**

```tsx
// components/heroes/full-bleed-hero.tsx
"use client";

import { motion, useReducedMotion } from "framer-motion";
import { type ReactNode } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { WordReveal } from "@/components/ui/morning/word-reveal";

interface FullBleedHeroProps {
  pill?: string;
  title: string;
  highlightWords?: string[];
  subtitle?: string;
  imageSrc: string;
  imageAlt: string;
  children?: ReactNode;
  className?: string;
}

export function FullBleedHero({
  pill,
  title,
  highlightWords,
  subtitle,
  imageSrc,
  imageAlt,
  children,
  className,
}: FullBleedHeroProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className={cn("relative overflow-hidden", className)}>
      {/* Background image */}
      <div className="absolute inset-0">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          className="object-cover"
          priority
        />
        {/* Gradient scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
      </div>

      {/* Content */}
      <div className="relative py-28 px-4 lg:py-36">
        <div className="mx-auto max-w-3xl text-center">
          {pill && (
            <motion.span
              className="inline-block rounded-full bg-white/20 dark:bg-white/10 backdrop-blur-sm px-4 py-1.5 text-xs font-medium tracking-wider text-foreground uppercase mb-6 border border-white/30"
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {pill}
            </motion.span>
          )}
          <WordReveal
            text={title}
            as="h1"
            highlightWords={highlightWords}
            className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl justify-center"
          />
          {subtitle && (
            <motion.p
              className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto"
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
            >
              {subtitle}
            </motion.p>
          )}
          {children && (
            <motion.div
              className="mt-8"
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.5 }}
            >
              {children}
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
```

**Step 6: Verify & Commit**

Run: `pnpm typecheck`
Expected: 0 errors.

```bash
git add components/heroes/
git commit -m "feat(heroes): add SplitHero, CenteredHero, StatsHero, FullBleedHero variants"
```

---

## Phase 7: View Transitions API

### Task 21: Add View Transitions Crossfade

**Files:**
- Modify: `components/shared/page-transition-provider.tsx`

**Step 1: Read current implementation**

Read `components/shared/page-transition-provider.tsx` to understand existing AnimatePresence setup.

**Step 2: Layer View Transitions API**

The existing provider uses Framer's `AnimatePresence`. We add the native View Transitions API as a progressive enhancement on top. This requires hooking into Next.js navigation.

Create a small hook that wraps `router.push` with `document.startViewTransition()`:

```tsx
// Add CSS for View Transitions to globals.css:
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 250ms;
  animation-timing-function: ease-out;
}
```

The implementation depends on what the current `page-transition-provider.tsx` does — read it first and adapt.

**Step 3: Add loading progress bar**

Create a thin teal progress bar component that shows during navigation:

```tsx
// components/ui/morning/navigation-progress.tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export function NavigationProgress() {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  // Hook into link clicks to detect navigation start
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (target?.href && target.origin === window.location.origin && target.pathname !== pathname) {
        setIsNavigating(true);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [pathname]);

  return (
    <AnimatePresence>
      {isNavigating && (
        <motion.div
          className="fixed top-0 left-0 right-0 z-[100] h-0.5 bg-accent-teal"
          initial={{ scaleX: 0, transformOrigin: "left" }}
          animate={{ scaleX: 0.7 }}
          exit={{ scaleX: 1, opacity: 0 }}
          transition={{
            scaleX: { duration: 2, ease: "easeOut" },
            opacity: { duration: 0.15, delay: 0 },
          }}
        />
      )}
    </AnimatePresence>
  );
}
```

**Step 4: Add to layout**

Add `<NavigationProgress />` to root layout.

**Step 5: Verify & Commit**

Run: `pnpm typecheck`

```bash
git add components/ui/morning/navigation-progress.tsx components/shared/page-transition-provider.tsx app/globals.css app/layout.tsx
git commit -m "feat(transitions): add View Transitions API crossfade + navigation progress bar"
```

---

## Phase 8: Page Rebuilds

Each page rebuild follows the same pattern:
1. Read the existing page file
2. Replace with composition of hero variant + section components from the library
3. Verify build + visual check
4. Commit

### Task 22: Rebuild Trust Page with Morning Canvas Components

**Files:**
- Modify: `app/trust/trust-client.tsx`

Replace the existing trust page content with Morning Canvas components:
- `SplitHero` (keep current hero image)
- `StatStrip` (doctor stats)
- `ImageTextSplit` (doctor verification + image)
- `FeatureGrid` (security features)
- `ImageTextSplit` (accountability + image)
- `LogoBadgeStrip` (trust indicators)
- `CTABanner`

Read the current `trust-client.tsx` first to preserve all content/copy, then restructure using the new components.

**Commit:**
```bash
git commit -m "refactor(trust): rebuild with Morning Canvas section components"
```

---

### Task 23: Rebuild FAQ Page

**Files:**
- Modify: `app/faq/faq-page-client.tsx`

Use:
- `CenteredHero`
- `AccordionSection` (5 FAQ categories)
- `CTABanner`

Read existing FAQ data structure first.

**Commit:**
```bash
git commit -m "refactor(faq): rebuild with CenteredHero + AccordionSection"
```

---

### Task 24: Rebuild Clinical Governance Page

**Files:**
- Modify: `app/clinical-governance/page.tsx`

Use:
- `StatsHero` (compliance stats)
- `IconChecklist` (standards)
- `Timeline` (review process)
- `FeatureGrid` (safeguards)
- `CTABanner`

Read existing content first.

**Commit:**
```bash
git commit -m "refactor(clinical-governance): rebuild with Morning Canvas components"
```

---

### Task 25: Rebuild Pricing Page

**Files:**
- Modify: `app/pricing/pricing-client.tsx`

Use:
- `StatsHero` (value props)
- Keep existing pricing cards (adapt styling to match)
- `ComparisonTable` (plan features comparison)
- `AccordionSection` (pricing FAQ)
- `CTABanner`

**Commit:**
```bash
git commit -m "refactor(pricing): rebuild with StatsHero + ComparisonTable"
```

---

### Task 26: Rebuild How It Works Page

**Files:**
- Modify: `app/how-it-works/page.tsx`

Use:
- `FullBleedHero` (need to source a background image)
- `Timeline` (3-step process)
- `FeatureGrid` (what you get)
- `CTABanner`

**Commit:**
```bash
git commit -m "refactor(how-it-works): rebuild with FullBleedHero + Timeline"
```

---

## Phase 9: Final Verification

### Task 27: Full Visual & Build Verification

**Step 1: TypeScript check**

Run: `pnpm typecheck`
Expected: 0 errors.

**Step 2: Lint check**

Run: `pnpm lint`
Expected: 0 new errors.

**Step 3: Build check**

Run: `pnpm build`
Expected: Successful build.

**Step 4: Visual verification**

For each rebuilt page, verify:
- Desktop (1280px) light mode
- Desktop (1280px) dark mode
- Mobile (375px) light mode
- Mobile (375px) dark mode
- Reduced motion: all animations respect `prefers-reduced-motion`
- Page transitions: navigate between pages, verify crossfade
- Navigation progress bar: visible during navigation

**Step 5: Commit any fixes**

```bash
git commit -m "fix: visual polish and cross-browser fixes for Morning Canvas"
```

---

## Summary

| Phase | Tasks | Components Built |
|-------|-------|-----------------|
| 1. Tokens & Motion | 1-2 | Color tokens, spring/duration presets |
| 2. Canvas | 3-4 | MeshGradientCanvas |
| 3. Animation Primitives | 5-6 | WordReveal, ClipPathImage |
| 4. Cards | 7 | PerspectiveTiltCard (4 variants) |
| 5. Section Library | 8-19 | SectionHeader, ComparisonTable, FeatureGrid, StatStrip, Timeline, AccordionSection, ImageTextSplit, IconChecklist, ProcessSteps, CTABanner, LogoBadgeStrip |
| 6. Heroes | 20 | SplitHero, CenteredHero, StatsHero, FullBleedHero |
| 7. Transitions | 21 | View Transitions CSS, NavigationProgress |
| 8. Page Rebuilds | 22-26 | Trust, FAQ, Clinical Governance, Pricing, How It Works |
| 9. Verification | 27 | Full visual + build check |

**Total: 27 tasks, ~18 new components, 5 page rebuilds.**
