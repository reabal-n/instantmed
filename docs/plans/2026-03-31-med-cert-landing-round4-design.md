# Med Cert Landing Page — Round 4 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 8 improvements across conversion, performance, and SEO to the medical certificate landing page.

**Architecture:** Inline components in `med-cert-landing.tsx` for conversion features; extract below-fold sections to separate files for lazy-loading; new `BlogCTACard` component for cross-linking; PostHog MCP for CWV dashboard; enhanced location pages for SEO.

**Tech Stack:** Next.js 15 dynamic imports, Framer Motion, PostHog MCP, Tailwind v4

---

### Task 1: Live Activity Ticker

**Files:**
- Modify: `components/marketing/med-cert-landing.tsx`

**Step 1: Add activity data and component**

Add after the `RELATED_ARTICLES` constant (~line 123):

```tsx
const RECENT_ACTIVITY = [
  { name: "Sarah", city: "Melbourne", minutes: 23 },
  { name: "James", city: "Sydney", minutes: 12 },
  { name: "Priya", city: "Brisbane", minutes: 45 },
  { name: "Tom", city: "Perth", minutes: 8 },
  { name: "Emily", city: "Adelaide", minutes: 31 },
  { name: "Liam", city: "Gold Coast", minutes: 17 },
  { name: "Aisha", city: "Canberra", minutes: 52 },
  { name: "Jack", city: "Newcastle", minutes: 6 },
]

function RecentActivityTicker() {
  const [index, setIndex] = useState(0)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % RECENT_ACTIVITY.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const entry = RECENT_ACTIVITY[index]

  return (
    <div className="py-2.5 bg-success/5 border-y border-success/10" aria-live="polite" aria-atomic>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          <motion.p
            key={index}
            className="text-center text-xs text-success/80 font-medium"
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? {} : { opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
          >
            <CheckCircle2 className="inline h-3 w-3 mr-1.5 align-text-bottom" />
            {entry.name} from {entry.city} received their certificate {entry.minutes} min ago
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  )
}
```

**Step 2: Add AnimatePresence import**

`AnimatePresence` is not currently imported. Add it to the framer-motion import:

```tsx
import { motion, AnimatePresence } from "framer-motion"
```

**Step 3: Place in page layout**

In `MedCertLanding`, add between `LiveWaitTime` and `SocialProofStrip`:

```tsx
{/* Recent activity ticker */}
<RecentActivityTicker />
```

**Step 4: Run typecheck**

```bash
pnpm typecheck
```

Expected: PASS

**Step 5: Commit**

```bash
git add components/marketing/med-cert-landing.tsx
git commit -m "feat(landing): add live activity ticker with curated entries"
```

---

### Task 2: Day-of-Week Contextual Hero Messaging

**Files:**
- Modify: `components/marketing/med-cert-landing.tsx`

**Step 1: Add ContextualMessage component**

Add after `ClosingCountdown` component (~line 180):

```tsx
/** Day-of-week contextual message — empathy-driven copy near the CTA */
function ContextualMessage() {
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const now = new Date()
    const aestOffset = 10 * 60
    const utc = now.getTime() + now.getTimezoneOffset() * 60_000
    const aest = new Date(utc + aestOffset * 60_000)
    const day = aest.getDay() // 0=Sun
    const hour = aest.getHours()

    if (day === 1 && hour < 12) {
      setMessage("Calling in sick? Most certificates are delivered before your boss checks email.")
    } else if (day === 0 && hour >= 17) {
      setMessage("Get sorted tonight — certificate ready before Monday morning.")
    } else if (day >= 1 && day <= 5 && hour >= 18) {
      setMessage("Too late for a GP? We're open until 10pm AEST, seven days.")
    } else if (day === 6 || day === 0) {
      setMessage("Weekend and your GP is closed? We're open right now.")
    } else {
      setMessage(null)
    }
  }, [])

  if (!message) return null

  return (
    <p className="text-xs text-muted-foreground/80 italic">
      {message}
    </p>
  )
}
```

**Step 2: Place in HeroSection**

Inside `HeroSection`, add after the `ClosingCountdown` line (after the operating hours + closing countdown block):

```tsx
<ContextualMessage />
```

**Step 3: Run typecheck**

```bash
pnpm typecheck
```

Expected: PASS

**Step 4: Commit**

```bash
git add components/marketing/med-cert-landing.tsx
git commit -m "feat(landing): add day-of-week contextual hero messaging"
```

---

### Task 3: Video Walkthrough Embed Slot

**Files:**
- Modify: `components/marketing/med-cert-landing.tsx`

**Step 1: Add constant and render in HowItWorksSection**

Add constant near the top data section:

```tsx
/** Set to a Loom/YouTube URL when the walkthrough video is ready */
const VIDEO_WALKTHROUGH_URL: string | null = null
```

In `HowItWorksSection`, add after the header `</motion.div>` and before the Timeline grid, conditionally:

```tsx
{VIDEO_WALKTHROUGH_URL && (
  <div className="flex justify-center mb-8">
    <a
      href={VIDEO_WALKTHROUGH_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
    >
      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
        <ArrowRight className="w-4 h-4" />
      </span>
      Watch a 60-second walkthrough
    </a>
  </div>
)}
```

**Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: PASS (null constant means the block never renders, but types are correct)

**Step 3: Commit**

```bash
git add components/marketing/med-cert-landing.tsx
git commit -m "feat(landing): add video walkthrough slot (null until recorded)"
```

---

### Task 4: Lazy-Load Below-Fold Sections

**Files:**
- Create: `components/marketing/sections/how-it-works-section.tsx`
- Create: `components/marketing/sections/certificate-preview-section.tsx`
- Create: `components/marketing/sections/doctor-profile-section.tsx`
- Create: `components/marketing/sections/faq-cta-section.tsx`
- Create: `components/marketing/sections/final-cta-section.tsx`
- Create: `components/marketing/sections/limitations-section.tsx`
- Modify: `components/marketing/med-cert-landing.tsx`

**Step 1: Extract each section component to its own file**

Move each function + its dependencies (constants, helpers) to a new file. Each file should:
- Be `"use client"`
- Import its own dependencies (motion, lucide icons, etc.)
- Export the component as a named export
- Accept the same props the function currently receives

Move these sections:
1. `HowItWorksSection` + `HOW_IT_WORKS_STEPS` + `VIDEO_WALKTHROUGH_URL` → `how-it-works-section.tsx`
2. `CertificatePreviewSection` + `CERTIFICATE_FEATURES` → `certificate-preview-section.tsx`
3. `DoctorProfileSection` → `doctor-profile-section.tsx`
4. `FaqCtaSection` → `faq-cta-section.tsx`
5. `FinalCtaSection` → `final-cta-section.tsx`
6. `LimitationsSection` → `limitations-section.tsx`

**Step 2: Replace inline components with dynamic imports in med-cert-landing.tsx**

```tsx
const HowItWorksSection = dynamic(
  () => import("@/components/marketing/sections/how-it-works-section").then((m) => m.HowItWorksSection),
  { loading: () => <Skeleton className="w-full h-[400px] rounded-xl" /> },
)
const CertificatePreviewSection = dynamic(
  () => import("@/components/marketing/sections/certificate-preview-section").then((m) => m.CertificatePreviewSection),
  { loading: () => <Skeleton className="w-full h-[400px] rounded-xl" /> },
)
const DoctorProfileSection = dynamic(
  () => import("@/components/marketing/sections/doctor-profile-section").then((m) => m.DoctorProfileSection),
  { loading: () => <Skeleton className="w-full h-[200px] rounded-xl" /> },
)
const FaqCtaSection = dynamic(
  () => import("@/components/marketing/sections/faq-cta-section").then((m) => m.FaqCtaSection),
  { loading: () => <Skeleton className="w-full h-[300px] rounded-xl" /> },
)
const FinalCtaSection = dynamic(
  () => import("@/components/marketing/sections/final-cta-section").then((m) => m.FinalCtaSection),
  { loading: () => <Skeleton className="w-full h-[200px] rounded-xl" /> },
)
const LimitationsSection = dynamic(
  () => import("@/components/marketing/sections/limitations-section").then((m) => m.LimitationsSection),
  { loading: () => <Skeleton className="w-full h-[150px] rounded-xl" /> },
)
```

**Step 3: Remove unused imports from med-cert-landing.tsx**

Clean up any imports that were only used by the extracted sections and are no longer needed in the main file.

**Step 4: Run typecheck**

```bash
pnpm typecheck
```

Expected: PASS

**Step 5: Commit**

```bash
git add components/marketing/sections/ components/marketing/med-cert-landing.tsx
git commit -m "perf(landing): lazy-load 6 below-fold sections to reduce initial bundle"
```

---

### Task 5: Add Missing Preconnect Hints

**Files:**
- Modify: `app/layout.tsx`

**Step 1: Add PostHog and DiceBear preconnects**

Currently has: Clerk, Sentry preconnect + Stripe dns-prefetch.
Add after existing preconnect/dns-prefetch lines:

```tsx
<link rel="preconnect" href="https://us.posthog.com" />
<link rel="dns-prefetch" href="https://api.dicebear.com" />
```

**Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: PASS

**Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "perf: add preconnect hints for PostHog and DiceBear"
```

---

### Task 6: Core Web Vitals PostHog Dashboard

**Files:** None (PostHog MCP only)

**Step 1: Create LCP trend insight**

Use `mcp__posthog__query-trends` with:
- Event: `$web_vitals` filtered to `$web_vitals_LCP_value` is_set AND `$current_url` icontains `/medical-certificate`
- Math: `avg` on `$web_vitals_LCP_value`
- Date range: `-30d`, interval: `day`

Run the query first, then save as insight.

**Step 2: Create CLS trend insight**

Same pattern, using `$web_vitals_CLS_value`.

**Step 3: Create INP trend insight**

Same pattern, using `$web_vitals_INP_value`.

**Step 4: Create dashboard**

Use `mcp__posthog__dashboard-create` with name "Core Web Vitals — Med Cert Landing".
Add all 3 insights to the dashboard.

---

### Task 7: Blog Internal Linking CTA Card

**Files:**
- Create: `components/marketing/blog-cta-card.tsx`
- Modify: `components/blog/article-template.tsx`

**Step 1: Create BlogCTACard component**

```tsx
// components/marketing/blog-cta-card.tsx
import Link from "next/link"
import { ArrowRight, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PRICING } from "@/lib/constants"

interface BlogCTACardProps {
  /** Service to link to */
  service?: "med-cert" | "prescription" | "consult"
  className?: string
}

const SERVICE_CONFIG = {
  "med-cert": {
    title: "Need a medical certificate?",
    description: "Reviewed by an AHPRA-registered doctor and delivered to your inbox. No appointment needed.",
    href: "/medical-certificate",
    ctaText: `From $${PRICING.MED_CERT.toFixed(2)}`,
    buttonText: "Get your certificate",
  },
  prescription: {
    title: "Need a repeat prescription?",
    description: "Request a repeat script online. Reviewed by a real doctor, eScript sent to your phone.",
    href: "/prescriptions",
    ctaText: `From $${PRICING.REPEAT_SCRIPT.toFixed(2)}`,
    buttonText: "Get your script",
  },
  consult: {
    title: "Need to see a doctor?",
    description: "General consults reviewed by AHPRA-registered GPs. No video call required.",
    href: "/general-consult",
    ctaText: `From $${PRICING.CONSULT.toFixed(2)}`,
    buttonText: "Start your consult",
  },
}

export function BlogCTACard({ service = "med-cert", className }: BlogCTACardProps) {
  const config = SERVICE_CONFIG[service]

  return (
    <div className={cn(
      "rounded-2xl bg-primary/5 border border-primary/15 p-6 sm:p-8 my-10",
      className
    )}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <p className="text-base font-semibold text-foreground mb-1">
            {config.title}
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {config.description}
          </p>
        </div>
        <div className="shrink-0 flex flex-col items-start sm:items-end gap-1.5">
          <Button asChild size="sm">
            <Link href={config.href}>
              {config.buttonText}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Shield className="h-3 w-3" />
            {config.ctaText}
          </span>
        </div>
      </div>
    </div>
  )
}
```

Note: Import `cn` from `@/lib/utils`.

**Step 2: Add BlogCTACard to ArticleTemplate**

In `components/blog/article-template.tsx`, import and render the card after the main article content (before RelatedArticles or at the bottom of the article body). The card should render for all articles.

```tsx
import { BlogCTACard } from "@/components/marketing/blog-cta-card"
```

Add before `<RelatedArticles>` or at the end of the article content div:

```tsx
<BlogCTACard />
```

**Step 3: Run typecheck**

```bash
pnpm typecheck
```

Expected: PASS

**Step 4: Commit**

```bash
git add components/marketing/blog-cta-card.tsx components/blog/article-template.tsx
git commit -m "feat(blog): add inline service CTA card to all articles"
```

---

### Task 8: Enhanced Location Page Med Cert Section

**Files:**
- Modify: `app/locations/[city]/page.tsx`

**Step 1: Add a prominent med-cert CTA section**

The location pages already have service cards with pricing. Enhance by adding a dedicated med-cert callout section after the hero, with city-specific H2.

Look for where the service cards are rendered. Add a dedicated section above or below them:

```tsx
{/* Med cert specific callout */}
<div className="rounded-2xl bg-primary/5 border border-primary/15 p-6 sm:p-8 mb-8">
  <h2 className="text-xl font-semibold text-foreground mb-2">
    Medical certificates online in {cityData.name}
  </h2>
  <p className="text-sm text-muted-foreground mb-4">
    Skip the {cityData.name} waiting rooms. Get a medical certificate reviewed by an AHPRA-registered
    doctor and delivered to your inbox — from ${PRICING_DISPLAY.MED_CERT}.
  </p>
  <Button asChild size="sm">
    <Link href="/medical-certificate">
      Get your certificate <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
    </Link>
  </Button>
</div>
```

**Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: PASS

**Step 3: Commit**

```bash
git add app/locations/[city]/page.tsx
git commit -m "feat(locations): add prominent med-cert CTA section with city-specific copy"
```

---

## Updated Scope Notes

- **#3a Employer verification page** — ALREADY EXISTS at `/for/employers` with full verification guide. Skipped.
- **#1d Exit intent A/B test** — EXCLUDED per user request.
- **Preconnect hints** — Partially done (Clerk + Sentry + Stripe). Only PostHog and DiceBear need adding.
