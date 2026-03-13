# Trust Page Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Gut the generic, AI-looking trust page and rebuild it as a modern, premium page that feels like evidence — not a brochure. Add an animated patient counter that ticks from 2,400 → 100,000 by end of 2026.

**Architecture:** Replace the 1,011-line monolith `trust-client.tsx` with a clean rewrite using the existing component patterns from the homepage. Create a centralized `lib/social-proof.ts` module for the standardized patient counter (used sitewide). Update all social proof stats to: 4.9 rating, 34min avg response.

**Tech Stack:** Next.js 15 App Router · React 19 · Tailwind v4 · Framer Motion · NumberFlow · shadcn/ui

---

## Counter Math

- **Anchor:** March 4, 2026 = 2,400 patients
- **Target:** December 31, 2026 = 100,000 patients
- **Duration:** 302 days
- **Growth:** 97,600 patients over 302 days
- **Rate:** ~323.18 patients/day → ~0.2244/minute → ~0.003741/second
- **Implementation:** Linear interpolation from anchor. `count = 2400 + (millisSinceAnchor / totalMillis) * 97600`. Clamp at 100,000 after Dec 31.

---

### Task 1: Create `lib/social-proof.ts` — Centralized Counter

**Files:**
- Create: `lib/social-proof.ts`

**What:** Single source of truth for patient count, rating, response time. Used by trust page, homepage StatsStrip, total-patients-counter, and any future social proof.

**Constants:**
```ts
ANCHOR_DATE = new Date('2026-03-04T00:00:00+11:00') // AEST
ANCHOR_COUNT = 2400
TARGET_DATE = new Date('2026-12-31T23:59:59+11:00')
TARGET_COUNT = 100000
AVERAGE_RATING = 4.9
AVERAGE_RESPONSE_MINUTES = 34
```

**Function:** `getPatientCount(): number` — returns interpolated count based on current time. Before anchor returns 2400. After target returns 100000. Between: linear interp.

**Hook:** `usePatientCount(): number` — calls `getPatientCount()` on mount, then updates every 15 seconds via `setInterval`. Uses `useSyncExternalStore` for hydration safety.

**Commit:** `feat: add centralized social proof counter`

---

### Task 2: Update `lib/data/testimonials.ts` — Fix Stats

**Files:**
- Modify: `lib/data/testimonials.ts` (lines 553-559)

**What:** Update `PLATFORM_STATS` to use the user-specified values:
```ts
export const PLATFORM_STATS = {
  averageRating: 4.9,        // unchanged
  averageResponseMinutes: 34, // was 42
  doctorCount: 4,             // unchanged
  availableHoursStart: 8,     // unchanged
  availableHoursEnd: 22,      // unchanged
} as const
```

**Commit:** `fix: update average response time to 34 minutes`

---

### Task 3: Update `total-patients-counter.tsx` — Use Centralized Counter

**Files:**
- Modify: `components/marketing/total-patients-counter.tsx`

**What:** Replace the old `calculateTotalPatients()` function and inline growth logic with imports from `lib/social-proof.ts`. Both `TotalPatientsCounter` and `StatsStrip` should use `usePatientCount()` and `SOCIAL_PROOF_STATS`.

**Commit:** `refactor: use centralized counter in total-patients-counter`

---

### Task 4: Rewrite Trust Page

**Files:**
- Rewrite: `app/trust/trust-client.tsx`
- Modify: `app/trust/layout.tsx` (update metadata if needed)

**New page structure (top to bottom):**

#### Section 1: Hero
- Badge: "Trust & Safety" (keep, it's clean)
- Heading: "Your health. Our responsibility."
- Subtitle: One line, calm confidence
- NO rotating text, NO quick-link buttons, NO trust pills

#### Section 2: Animated Stats Strip
- Full-width, 4 metrics in a row
- Uses `usePatientCount()` from `lib/social-proof.ts`
- Metrics: patients served | avg rating | avg response | AHPRA verified
- Numbers animate from 0 on scroll into view using Framer Motion `useSpring` + `useInView`
- Big bold numbers, small muted labels below
- Subtle gradient background (sky-50 → white)

#### Section 3: Trust Pillars — Alternating Narrative
- 3 sections (not 6 cards), alternating left/right layout
- **Real Doctors** — AHPRA-registered, human-reviewed, no automated approvals
- **Your Data Protected** — AES-256, Australian servers, Privacy Act compliant
- **Clear Process** — transparent timeline, complaints process, refund policy
- Each section: heading + 2-3 sentence paragraph + 3-4 bullet points with check icons
- NO stock photos. Use subtle icon/illustration treatment or abstract gradient backgrounds
- Clean divider between sections

#### Section 4: Process Timeline
- 5 steps, horizontal on desktop, vertical on mobile
- Connecting line with numbered dots
- Each step: number, title, subtitle, time estimate
- Uses existing `processSteps` data (cleaned up)

#### Section 5: Testimonials
- Staggered/masonry grid (2 cols desktop, 1 mobile)
- 6 featured testimonials from existing data
- Varying card heights for organic feel
- Quote text, name, location, role. No "Verified Patient" badges
- Star rating shown subtly

#### Section 6: FAQ
- Clean accordion, wider max-width
- 6 trust-specific FAQs
- Link to contact support at bottom

#### Section 7: CTA
- "Ready to get started?" + single button
- Minimal, no redundant badges

**Kill list:**
- RotatingText in hero
- Section quick-link buttons
- Certification badge grid (6 logos)
- Comparison table
- AHPRA verification CTA section
- Contact CTA section
- MediaMentions
- Sticky mobile CTA
- "Verified Patient" badges on testimonials

**Commit:** `feat: redesign trust page — modern, premium, authentic`

---

## Execution Notes

- Keep the existing `layout.tsx` SEO metadata (it's well-optimized)
- Respect `useReducedMotion()` for all animations
- Use `cn()` for all conditional classes
- Use existing shadcn components (Accordion, Button)
- Use NumberFlow for the animated counter
- All animations 200-500ms, ease-out, no bounce
- Dark mode support throughout
- Mobile-first responsive design
