# Landing Pages Premium Redesign: Heroes and Stage System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every public landing hero's paragraph copy and text-card "mockup" with a short, confident hero and a high-fidelity, coded product scene, so each page reads in three seconds and looks like a category leader.

**Architecture:** One new visual primitive, `DeviceStage`, renders a pixel-sharp phone (pure HTML/CSS, container-query scaled, no images) on a morning-spectrum "sun" backdrop, with an optional single notification that animates in once. Five scene components fill that phone with the real outcome of each service. The shared `Hero` enforces a word budget; everything that is not the promise, the price or the action moves into a new `HeroFitStrip` directly below the hero. Every hero H1 moves onto one preloaded display-font subset generated from a title registry, so first-time visitors stop seeing Arial.

**Tech Stack:** Next.js 15.5 App Router (webpack), React 18.3, Tailwind v4, lucide-react, CSS keyframes (no framer-motion in the hero), Vitest contract tests, Playwright e2e, fontTools via `uvx` for the font subset.

**Spec:** This document is the spec. It argues from:
- Rey's direction, 2026-09-25/26: "too much text across the pages, especially in the hero … the entire subheader is a paragraph … the mockups on the right are atrocious and poor quality … make the page designs/visuals/UI/UX high production class … take liberties."
- Operator decision 2026-09-25 (PR #608): LegitScript and Google certification marks render in every hero.
- Constraints gathered from `DESIGN.md`, `docs/BRAND.md`, `docs/VOICE.md`, `docs/ADVERTISING_COMPLIANCE.md`, `docs/PHOTOGRAPHY_BRIEF.md`, `lib/marketing/approved-claims.ts` and the contract tests listed per task.

---

## 1. Diagnosis (evidence, 2026-09-26)

Measured on production at 1440×900 and 375×812, and from source.

| Problem | Evidence |
|---|---|
| Heroes are paragraphs | Hero copy excluding the visual: home ~28 words, med cert ~60, prescriptions ~73, women's health ~66, ED ~40, hair ~46, weight ~45; bespoke SEO heroes 66–149 words. |
| The "visual" is more text | ED, hair loss and weight show a 4-row fact card of ~80 words. Prescriptions shows a ~49-word message card. Med cert and home show a ~70-word letter. SEO pages show 59–136-word fact panels. **No hero on the site has a real visual.** |
| The display face often fails | `app/layout.tsx:37-49` loads Plus Jakarta with `display: "optional"` and `preload: false`. Only the home and money-page H1s have preloaded subsets. First visits to ED, hair loss, women's health, weight and all SEO pages render the H1 in the Arial fallback (Rey's `/mens-health` screenshot). |
| Photography cannot fix it | All 41 generated photos are unused and should stay unused in heroes: several show garbled on-screen text (`rx-1`, `medcert-1`), `home-1` shows a synthetic person (CLAUDE.md: public surfaces use "abstract clinical or account marks, not fake people"), and they read as AI stock. |
| My #608 specimen styling | Rotated back sheet and gradient band were reverted (commit on `claude/hero-trust-seals`). DESIGN.md forbids rotation ("Never rotate, never elastic, never parallax"). |

## 2. Design direction: "The outcome, in your hand"

The reference class is Stripe, Linear and the better DTC telehealth brands: **the product is the picture.** A patient's real question is "what do I get, and where?" The hero answers it with the thing itself, on a phone, in a quiet morning light.

### 2.1 Hero anatomy (every landing hero)

```
[timing line — optional, live data only]
H1 — ≤ 8 words, display face, closing phrase in primary blue
One sentence — ≤ 16 words, states what it is and who reviews it
[ Primary CTA · $price ]  [quiet secondary link, optional]
✓ Full refund if the doctor declines.
ProductReview ★★★★★  |  LegitScript seal · Google Online Pharmacy Certification
                                                         ┌──────────── DeviceStage ────────────┐
                                                         │  sun disc · phone · one notification │
                                                         └──────────────────────────────────────┘
───────────────────────────── HeroFitStrip (full width, directly below) ─────────────────────────────
 ◎ Australia only   ◎ Ages 18+   ◎ No Medicare needed   ◎ About 3 minutes
 Small print: the compliance sentences that used to sit in the hero, verbatim.
```

Budget, enforced by e2e (Task 9): **≤ 32 words inside `[data-hero]`** excluding the H1, the stage, the timing line and the proof row. That includes CTA labels and the refund line.

### 2.2 The stage

- **Phone:** graphite bezel `#1d1f23` (a device colour, not a page background, so the "no dark navy" rule is unaffected), 9px bezel, 2.6rem outer radius, dynamic-island pill, iOS status bar. Screen designed at true iPhone width (390 CSS px) and scaled with container-query units, so type inside the phone has real iOS proportions at every size and never blurs.
- **Backdrop:** a morning "sun" disc behind the phone: a radial gradient from `--morning-peach` through `--morning-sky` to transparent. `DESIGN.md:808` allows a radial morning gradient in heroes only. There is no blur filter: the floor shadow is also a radial gradient, sky-toned.
- **Tone:** `day` (default) or `dusk` (ED and men's health, per BRAND.md's "dimmer light" direction for ED). Dusk desaturates the sky; it never uses navy.
- **Motion:** the phone rises 12px and fades in over 250ms. The notification follows at 380ms delay over 220ms. Both use the existing strong ease-out `cubic-bezier(0.23, 1, 0.32, 1)`. No loops, no rotation, no parallax. Under reduced motion the full composition renders statically. The H1 and CTA never wait on the stage.
- **Accessibility:** the stage is one `<figure>` with a `<figcaption class="sr-only">` that says what the example shows and that it is a specimen. Everything inside the phone is `aria-hidden`. `data-hero-facsimile` keeps the miniature UI out of the 16px word-share gate.

### 2.3 Scenes (no medicine names, no people, no outcome promises)

| Scene | Screen | Notification | Used on |
|---|---|---|---|
| `CertificateScene` | Mail-attachment PDF viewer showing the specimen certificate (locked PDF wording, SPECIMEN mark, verify reference with QR-style mark) | "InstantMed · now — Your medical certificate is ready" | `/medical-certificate`, `/medical-certificate-online`, `/mental-health-online` |
| `CertificateScene` + eScript notice | Same screen | "Messages · InstantMed — Your eScript is ready" (shows the second service without a second card) | `/`, `/consult` |
| `EScriptScene` | iOS lock screen on a morning-spectrum wallpaper: 9:41, date, one SMS: "Your eScript is ready. Show the token at any Australian pharmacy." | none (the lock screen is the notification) | `/prescriptions`, `/online-prescriptions` |
| `PrivateReviewScene` | `instantmed.com.au` in Safari: "Private assessment", a 3-step tracker (Form submitted ✓ · Doctor review ● · Outcome ○), "Only your doctor sees your answers." | "InstantMed · Your doctor has reviewed your assessment." | `/erectile-dysfunction` (dusk), `/hair-loss` (day), `/mens-health` (dusk) |
| `ChoiceScene` | "Which assessment?" with two option rows; `selected` prop highlights one | none | `/womens-health` (pill selected), `/uti-assessment-online` (UTI), `/contraceptive-pill-assessment-online` (pill) |
| `WeightScene` | "About you": height 172 cm, weight 95 kg, computed chip "BMI 32.1", Continue button | none | `/weight-loss`, `/weight-loss-online` |

### 2.4 Hero copy (final strings)

Compliance-owned constants stay verbatim wherever they appear. Anything removed from a hero moves, verbatim, to that page's `HeroFitStrip` notes, so the page still carries every required statement.

| Page | H1 (accent in blue) | Sentence | CTA | Under CTA |
|---|---|---|---|---|
| `/` | Faster than **your GP.** | Certificates, repeat scripts and private assessments from AHPRA-registered doctors. | Get started | `GUARANTEE` |
| `/medical-certificate` | Your medical certificate. **Without the waiting room.** | `MED_CERT_WEDGE` + " Doctor-issued for work, study or carer's leave." | Get your certificate · From $24.95 | `GUARANTEE` |
| `/prescriptions` | Your regular medication. **A simpler repeat.** | One medicine you already take, reviewed by an Australian doctor. | Get your repeat · $29.95 | `GUARANTEE` |
| `/erectile-dysfunction` | Private ED assessment, **from home.** | A secure form, reviewed by an Australian doctor. One-off fee. | Start private assessment · $49.95 | `GUARANTEE` |
| `/hair-loss` | Private hair loss assessment, **from home.** | A secure form, reviewed by an Australian doctor. One-off fee. | Start assessment · $49.95 | `GUARANTEE` |
| `/womens-health` | UTI or the pill. **Reviewed by a doctor.** | Pick your assessment. Each has its own safety check before payment. | Start assessment · $49.95 | `GUARANTEE` |
| `/weight-loss` | Weight management, **reviewed by a doctor.** | A private assessment for adults with a BMI of 30, or 27 with a related condition. | Start assessment · $89.95 | (none, unchanged) |

The BMI figures come from `WEIGHT_LOSS_BMI_FLOOR_WITHOUT_COMORBIDITY` and `WEIGHT_LOSS_BMI_FLOOR`; never type them.

SEO pages keep their current H1 wording (ranking risk), rendered as a large first line plus a smaller second line (Task 8).

### 2.5 Decisions this plan reverses, on Rey's authority

1. **"Hero visual is a readable document specimen"** (DESIGN.md §6, 2026-09-23 plan). Replaced by the device stage. The certificate is still the synthetic, SPECIMEN-labelled, locked-wording document, now shown where patients actually see it: on their phone.
2. **"No highlighted keyword"** in hero headlines. The blue closing phrase becomes the hero signature.
3. **Text fact panels as hero visuals** (ED, hair loss, weight, SEO pages). Their facts move to `HeroFitStrip`.
4. **Bespoke SEO heroes.** All seven bespoke heroes move onto the shared `Hero`, as DESIGN.md already requires for the main pages.

Kept: price in the CTA, refund line once near the action, ProductReview (logo and stars only), certification marks (#608), timing line from live data only, no photography, no people, no medicine names, 250ms motion cap, the 120px hero-to-section rhythm, and the phone page-length budgets (ratchet down only).

## 3. Decisions for Rey

1. **Release timing (recommended: split).** Google Ads checkpoints read `/prescriptions` on October 1 and 3, and `/medical-certificate` and `/womens-health` on October 7 (`docs/plans/2026-09-23-google-ads-cashflow-30k-review-plan.md:106-114`). A new hero mid-window confounds those reads. Recommendation: ship the foundation, home, ED, hair loss, weight and SEO pages as soon as they pass review, and ship `/prescriptions`, `/medical-certificate` and `/womens-health` on **October 8**, annotated in Ads. The build takes about that long anyway.
2. **Direction gate.** Task 3 ends with desktop and phone screenshots of the new `/medical-certificate` hero. Nothing else is built until Rey approves the look.

## Global Constraints

- Stack pins: no dependency adds or upgrades; webpack only; React 18 `RefObject<T>` typing; no framer-motion in hero or stage files.
- Colours: tokens from DESIGN.md only; no purple/violet, neon or dark-navy page backgrounds; sky-toned shadows only (`shadow-primary/…`); brand coral never in the hero.
- Surfaces: no `backdrop-blur`, no `blur()` filters, no rotation transforms, no parallax, no looping animation. Durations ≤ 250ms.
- Type: display face on hero H1 only, weight 300; body Source Sans 3; sentence case; no em dashes (`—`) in any string.
- Copy: approved claims come from `getApprovedClaim()` or `lib/marketing/voice.ts` constants, never retyped. No medicine names, brands or drug classes in any scene or hero string. No testimonials, review counts or numeric ratings. No doctor names or counts. "24/7" only; never a review-hours window or turnaround promise.
- Price separator in CTAs is " · ".
- Phone gates: primary CTA fully inside 375×812; no horizontal overflow at 320px; page length ≤ current budget per route.
- Every string removed from a hero appears verbatim in that page's `HeroFitStrip` notes or an existing section.
- Every hero keeps `data-hero`, `data-hero-reviews`, `data-hero-trust-row`, and exactly one `<h1>`.

## Review Focus

1. **320px phones.** The stage and fit strip must not overflow, and the CTA must stay above the 812px fold at 375px. Owned by Task 9 (adds a 320px overflow assertion).
2. **Service disabled or maintenance.** The hero already swaps the CTA for "Contact us" and hides reassurance and reviews. The fit strip must hide its price item under the same gate, and the stage must still render. Owned by Task 4 (unit) and Task 9 (e2e with `disable_med_cert: true`).
3. **Reduced motion.** With `prefers-reduced-motion: reduce`, the phone and notification are fully visible at first paint with `animation-name: none`. Owned by Task 2 (contract) and Task 9 (e2e).
4. **Screen readers.** A hero stage must announce as one labelled figure. It must not read out 60 words of miniature UI. Owned by Task 2 (contract: all inner content `aria-hidden`) and Task 9 (axe run already in `landing-pages.spec.ts`).
5. **First-visit font.** With a cold cache, every hero H1 renders in Plus Jakarta, not Arial, and every H1 glyph exists in the subset. Owned by Task 1 (registry and glyph-file contract) and Task 9 (extends the CDP glyph test in `front-door.spec.ts` to every hero route).

---

## File structure

| File | Responsibility |
|---|---|
| `lib/marketing/hero-titles.ts` (create) | Single registry of every hero H1: text, optional accent suffix, optional SEO subline. Feeds pages, the font subset and tests. |
| `scripts/fonts/build-hero-display-font.mjs` (create) | Builds `lib/fonts/plus-jakarta-hero.woff2` and `lib/fonts/plus-jakarta-hero.glyphs.txt` from the registry. |
| `lib/fonts/hero-display.ts` (create) | `heroDisplayFont`, a preloaded swap subset. Replaces `money-h1.ts` and `home-h1.ts`. |
| `components/marketing/hero-title.tsx` (create) | Renders a registry entry into H1 content (accent span, SEO subline). |
| `components/marketing/stage/phone-frame.tsx` (create) | Device bezel, island, status bar, container-query screen. |
| `components/marketing/stage/device-stage.tsx` (create) | Figure, sun backdrop, floor, phone slot, notification slot, entrance classes. |
| `components/marketing/stage/stage-notification.tsx` (create) | iOS-style notification card. |
| `components/marketing/stage/scenes/*.tsx` (create) | Five scenes (Section 2.3). |
| `components/marketing/hero-fit-strip.tsx` (create) | Icon items plus verbatim small-print notes, directly under the hero. |
| `components/marketing/hero.tsx` (modify) | Uses `HeroTitle` and the display font; exposes `fitStrip` slot rendered after the hero section. |
| `app/globals.css` (modify) | Stage keyframes, sun/floor gradients, `.phone-ui` type scale. |
| Landing pages (modify) | New copy, stage scene, fit strip. |
| `e2e/landing-hero-budget.spec.ts` (create) | Word budget, 320px overflow, reduced motion and font checks for every hero route. |
| `DESIGN.md`, `docs/DESIGN_SYSTEM_CHANGELOG.md` (modify) | §6 rewritten for the stage system. |

---

## Phase 0 — Foundations and the direction proof

### Task 1: Hero title registry and one preloaded display subset

**Files:**
- Create: `lib/marketing/hero-titles.ts`
- Create: `scripts/fonts/build-hero-display-font.mjs`
- Create: `lib/fonts/hero-display.ts`, `lib/fonts/plus-jakarta-hero.woff2`, `lib/fonts/plus-jakarta-hero.glyphs.txt`
- Create: `components/marketing/hero-title.tsx`
- Test: `lib/__tests__/hero-titles-contract.test.ts`

**Interfaces:**
- Produces: `HERO_TITLES: Record<HeroTitleKey, HeroTitleEntry>`, where `HeroTitleEntry = { text: string; accent?: string; subline?: string }`. Produces `heroTitleText(entry): string` (the full plain text), `heroDisplayFont` (next/font object) and `<HeroTitle entry={…} />`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/hero-titles-contract.test.ts
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { HERO_TITLES, heroTitleText } from "@/lib/marketing/hero-titles"

const root = process.cwd()
const read = (p: string) => readFileSync(join(root, p), "utf8")

describe("hero title registry", () => {
  it("keeps accents as a true suffix of their title", () => {
    for (const [key, entry] of Object.entries(HERO_TITLES)) {
      if (entry.accent) expect(entry.text.endsWith(entry.accent), key).toBe(true)
    }
  })

  it("keeps headlines short and free of em dashes", () => {
    for (const [key, entry] of Object.entries(HERO_TITLES)) {
      expect(heroTitleText(entry), key).not.toContain("—")
      if (!entry.subline) expect(entry.text.split(/\s+/).length, key).toBeLessThanOrEqual(8)
    }
  })

  it("ships a font subset that covers every hero glyph", () => {
    const glyphs = new Set([...read("lib/fonts/plus-jakarta-hero.glyphs.txt")])
    for (const entry of Object.values(HERO_TITLES)) {
      for (const ch of heroTitleText(entry)) expect(glyphs.has(ch), `missing "${ch}"`).toBe(true)
    }
  })

  it("preloads the subset with swap so first visits never fall back to Arial", () => {
    const font = read("lib/fonts/hero-display.ts")
    expect(font).toContain('display: "swap"')
    expect(font).toContain("preload: true")
    expect(read("components/marketing/hero.tsx")).toContain("heroDisplayFont.className")
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm exec vitest run lib/__tests__/hero-titles-contract.test.ts`
Expected: FAIL, "Cannot find module '@/lib/marketing/hero-titles'".

- [ ] **Step 3: Create the registry**

```ts
// lib/marketing/hero-titles.ts
import { TAGLINE } from "@/lib/marketing/voice"

export interface HeroTitleEntry {
  /** Full visible headline (first line for SEO entries). */
  text: string
  /** Suffix of `text` rendered in primary blue. */
  accent?: string
  /** SEO pages only: smaller second line that keeps the ranking H1 wording. */
  subline?: string
}

export const HERO_TITLES = {
  home: { text: TAGLINE, accent: "your GP." },
  medCert: { text: "Your medical certificate. Without the waiting room.", accent: "Without the waiting room." },
  prescriptions: { text: "Your regular medication. A simpler repeat.", accent: "A simpler repeat." },
  ed: { text: "Private ED assessment, from home.", accent: "from home." },
  hairLoss: { text: "Private hair loss assessment, from home.", accent: "from home." },
  womensHealth: { text: "UTI or the pill. Reviewed by a doctor.", accent: "Reviewed by a doctor." },
  weightLoss: { text: "Weight management, reviewed by a doctor.", accent: "reviewed by a doctor." },
  consult: { text: "Choose a focused online service", accent: "online service" },
  medCertOnline: { text: "Medical certificate online Australia" },
  mensHealth: { text: "Men's health online Australia", subline: "ED and hair loss doctor review" },
  mentalHealthOnline: { text: "Mental health online Australia", subline: "what can wait, and what cannot" },
  onlinePrescriptions: { text: "How online prescriptions work in Australia" },
  utiAssessment: { text: "UTI assessment online Australia" },
  weightLossOnline: { text: "Weight loss online Australia", subline: "what safe review really needs" },
  contraceptivePill: { text: "Contraceptive pill assessment online" },
} as const satisfies Record<string, HeroTitleEntry>

export type HeroTitleKey = keyof typeof HERO_TITLES

/** Plain text a crawler and screen reader see; SEO sublines keep their original " - " join. */
export function heroTitleText(entry: HeroTitleEntry): string {
  return entry.subline ? `${entry.text} - ${entry.subline}` : entry.text
}
```

Check before continuing: `consult` keeps "Choose a focused online service" because `e2e/intake-flows.spec.ts:470` and `consult-services-index-contract` pin it. `/consult` is not a `LANDING_SURFACES` file, so "focused" is allowed there.

- [ ] **Step 4: Write the subset build script**

```js
// scripts/fonts/build-hero-display-font.mjs
// Usage: node scripts/fonts/build-hero-display-font.mjs --source /path/PlusJakartaSans[wght].ttf
// Source (OFL, not committed): https://github.com/google/fonts/raw/main/ofl/plusjakartasans/PlusJakartaSans%5Bwght%5D.ttf
import { execFileSync } from "node:child_process"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const sourceIndex = process.argv.indexOf("--source")
if (sourceIndex === -1) throw new Error("Pass --source <PlusJakartaSans[wght].ttf>")
const source = process.argv[sourceIndex + 1]

const { HERO_TITLES, heroTitleText } = await import("../../lib/marketing/hero-titles.ts")
const chars = new Set(" .,'’-:?!")
for (const entry of Object.values(HERO_TITLES)) for (const ch of heroTitleText(entry)) chars.add(ch)
const text = [...chars].sort().join("")

const dir = mkdtempSync(join(tmpdir(), "hero-font-"))
const textFile = join(dir, "glyphs.txt")
writeFileSync(textFile, text)
execFileSync("uvx", [
  "--from", "fonttools[woff]", "pyftsubset", source,
  `--text-file=${textFile}`, "--flavor=woff2", "--layout-features=*",
  "--output-file=lib/fonts/plus-jakarta-hero.woff2",
], { stdio: "inherit" })
writeFileSync("lib/fonts/plus-jakarta-hero.glyphs.txt", text)
console.log(`Subset ${chars.size} glyphs`)
```

Run it with `pnpm exec tsx`, the runner the repo's other scripts use; tsx resolves the `@/` path aliases in `voice.ts` from `tsconfig.json`.

- [ ] **Step 5: Download the source face and build the subset**

```bash
curl -fsSL -o "$TMPDIR/PlusJakartaSans.ttf" "https://github.com/google/fonts/raw/main/ofl/plusjakartasans/PlusJakartaSans%5Bwght%5D.ttf"
pnpm exec tsx scripts/fonts/build-hero-display-font.mjs --source "$TMPDIR/PlusJakartaSans.ttf"
ls -la lib/fonts/plus-jakarta-hero.woff2
```
Expected: the woff2 is under 12 KB.

- [ ] **Step 6: Create the font module and the title renderer**

```ts
// lib/fonts/hero-display.ts
import localFont from "next/font/local"

/**
 * Plus Jakarta Sans subset covering every hero H1 in lib/marketing/hero-titles.ts.
 * Rebuild with scripts/fonts/build-hero-display-font.mjs whenever a title changes;
 * lib/__tests__/hero-titles-contract.test.ts fails on a missing glyph.
 */
export const heroDisplayFont = localFont({
  src: "./plus-jakarta-hero.woff2",
  display: "swap",
  weight: "200 800",
  style: "normal",
  preload: true,
  fallback: ["heroDisplayFont Fallback Liberation", "Plus Jakarta Sans", "Arial", "sans-serif"],
})
```

```tsx
// components/marketing/hero-title.tsx
import { type HeroTitleEntry } from "@/lib/marketing/hero-titles"

/** Headline content for <Heading level="display">; the accent is always a suffix. */
export function HeroTitle({ entry }: { entry: HeroTitleEntry }) {
  const lead = entry.accent ? entry.text.slice(0, -entry.accent.length) : entry.text
  return (
    <>
      {lead}
      {entry.accent && <span className="text-primary">{entry.accent}</span>}
      {entry.subline && (
        <>
          <span className="sr-only"> - </span>
          <span className="mt-2 block text-[0.52em] leading-tight text-muted-foreground">{entry.subline}</span>
        </>
      )}
    </>
  )
}
```

- [ ] **Step 7: Wire the font into `Hero`**

In `components/marketing/hero.tsx`, import `heroDisplayFont` and add `heroDisplayFont.className` to the `Heading` className before `titleClassName`. Remove the `moneyH1Font` and `homeH1Font` imports and props from `app/(marketing)/page.tsx`, `med-cert-landing.tsx` and `prescriptions-landing.tsx`. Delete `lib/fonts/money-h1.ts`, `lib/fonts/home-h1.ts` and their woff2 files.

Update the pins that referenced the old fonts:
- `lib/__tests__/money-page-lcp-critical-path.test.ts`: replace the `moneyH1Font` / `weight: "200 800"` assertions with `expect(source("lib/fonts/hero-display.ts")).toContain("preload: true")`, and replace the exact-title regex with `expect(medCertLanding).toContain("HERO_TITLES.medCert")`.
- `e2e/front-door.spec.ts:13-32`: point the glyph probe at `lib/fonts/plus-jakarta-hero.woff2` (Task 9 extends it to every route).

- [ ] **Step 8: Run the tests**

Run: `pnpm exec vitest run lib/__tests__/hero-titles-contract.test.ts lib/__tests__/money-page-lcp-critical-path.test.ts && pnpm typecheck`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add lib/marketing/hero-titles.ts scripts/fonts lib/fonts components/marketing/hero-title.tsx components/marketing/hero.tsx "app/(marketing)/page.tsx" components/marketing/med-cert-landing.tsx components/marketing/prescriptions-landing.tsx lib/__tests__/hero-titles-contract.test.ts lib/__tests__/money-page-lcp-critical-path.test.ts e2e/front-door.spec.ts
git commit -m "Preload one display subset for every hero H1 from a title registry"
```

### Task 2: `DeviceStage`, `PhoneFrame` and `StageNotification`

**Files:**
- Create: `components/marketing/stage/phone-frame.tsx`, `components/marketing/stage/device-stage.tsx`, `components/marketing/stage/stage-notification.tsx`, `components/marketing/stage/index.ts`
- Modify: `app/globals.css` (append a `/* Hero device stage */` block after `.hero-delivery-enter` at line 3515)
- Test: `lib/__tests__/device-stage-contract.test.ts`

**Interfaces:**
- Produces: `<DeviceStage label: string; screen: ReactNode; notification?: ReactNode; tone?: "day" | "dusk"; className?: string />`, `<PhoneFrame>{screen}</PhoneFrame>`, `<StageNotification app: string; title: string; body?: string; time?: string />`. CSS classes `.phone-ui`, `.ph-12`, `.ph-13`, `.ph-15`, `.ph-17`, `.ph-22`, `.ph-34`, `.stage-sun-day`, `.stage-sun-dusk`, `.stage-floor`, `.stage-phone-enter`, `.stage-notice-enter`.

- [ ] **Step 1: Write the failing contract test**

```ts
// lib/__tests__/device-stage-contract.test.ts
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()
const read = (p: string) => readFileSync(join(root, p), "utf8")
const stageDir = "components/marketing/stage"
const sceneDir = `${stageDir}/scenes`
const files = [
  ...readdirSync(join(root, stageDir)).filter((f) => f.endsWith(".tsx")).map((f) => `${stageDir}/${f}`),
  ...(() => { try { return readdirSync(join(root, sceneDir)).map((f) => `${sceneDir}/${f}`) } catch { return [] } })(),
]

describe("hero device stage", () => {
  it("renders one labelled figure with aria-hidden internals", () => {
    const stage = read(`${stageDir}/device-stage.tsx`)
    expect(stage).toContain("<figure")
    expect(stage).toContain('data-hero-facsimile=""')
    expect(stage).toContain('<figcaption className="sr-only">')
    expect(stage.match(/aria-hidden="true"/g)?.length).toBeGreaterThanOrEqual(4)
  })

  it("never uses blur, rotation, framer-motion, images or brand coral", () => {
    for (const file of files) {
      const src = read(file)
      expect(src, file).not.toMatch(/blur|rotate-|rotate\(|framer-motion|<img|next\/image|brand-coral|backdrop-/)
    }
  })

  it("never names a medicine inside a scene", () => {
    const banned = /sildenafil|tadalafil|viagra|cialis|finasteride|minoxidil|semaglutide|tirzepatide|ozempic|wegovy|mounjaro|trimethoprim|nitrofurantoin|levonorgestrel|drospirenone/i
    for (const file of files) expect(read(file), file).not.toMatch(banned)
  })

  it("respects reduced motion and the 250ms cap", () => {
    const css = read("app/globals.css")
    const block = css.slice(css.indexOf("/* Hero device stage */"))
    expect(block).toMatch(/prefers-reduced-motion: reduce[\s\S]*stage-phone-enter[\s\S]*animation: none/)
    for (const ms of block.matchAll(/animation:[^;]*?(\d+)ms/g)) expect(Number(ms[1])).toBeLessThanOrEqual(250)
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm exec vitest run lib/__tests__/device-stage-contract.test.ts`
Expected: FAIL, ENOENT for `device-stage.tsx`.

- [ ] **Step 3: Add the CSS**

Append to `app/globals.css` after line 3515:

```css
/* Hero device stage */
.phone-ui { container-type: inline-size; --u: calc(100cqw / 390); font-family: var(--font-sans); -webkit-font-smoothing: antialiased; }
.phone-ui .ph-12 { font-size: calc(var(--u) * 12); line-height: 1.35; }
.phone-ui .ph-13 { font-size: calc(var(--u) * 13); line-height: 1.35; }
.phone-ui .ph-15 { font-size: calc(var(--u) * 15); line-height: 1.4; }
.phone-ui .ph-17 { font-size: calc(var(--u) * 17); line-height: 1.35; }
.phone-ui .ph-22 { font-size: calc(var(--u) * 22); line-height: 1.2; letter-spacing: -0.01em; }
.phone-ui .ph-34 { font-size: calc(var(--u) * 34); line-height: 1.1; letter-spacing: -0.02em; }
.phone-ui .ph-lock { font-size: calc(var(--u) * 82); line-height: 1; letter-spacing: -0.03em; font-weight: 300; }

.stage-sun-day { background: radial-gradient(circle at 50% 42%, var(--morning-peach) 0%, color-mix(in srgb, var(--morning-sky) 80%, white) 42%, transparent 70%); opacity: 0.9; }
.stage-sun-dusk { background: radial-gradient(circle at 50% 42%, color-mix(in srgb, var(--morning-sky) 55%, #64748b) 0%, color-mix(in srgb, var(--morning-sky) 30%, transparent) 48%, transparent 72%); opacity: 0.85; }
.stage-floor { background: radial-gradient(ellipse at center, rgb(59 130 246 / 0.18) 0%, transparent 70%); }
.dark .stage-sun-day, .dark .stage-sun-dusk { opacity: 0.35; }

@keyframes stage-rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
.stage-phone-enter { animation: stage-rise 250ms cubic-bezier(0.23, 1, 0.32, 1) both; }
.stage-notice-enter { animation: stage-rise 220ms cubic-bezier(0.23, 1, 0.32, 1) 380ms both; }
@media (prefers-reduced-motion: reduce) {
  .stage-phone-enter, .stage-notice-enter { animation: none; }
}
```

Check before continuing: the project's dark-mode selector. `grep -n "^\.dark\|:root\[data-theme" app/globals.css | head`. Use whichever selector the file already uses for dark overrides.

- [ ] **Step 4: Create the components**

```tsx
// components/marketing/stage/phone-frame.tsx
import { BatteryFull, Signal, Wifi } from "lucide-react"
import type { ReactNode } from "react"

/** Pixel-sharp phone; the screen is laid out at 390px iPhone width and scaled with container units. */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative rounded-[2.6rem] bg-[#1d1f23] p-[9px] shadow-2xl shadow-primary/20 ring-1 ring-black/5 dark:ring-white/10">
      <div className="phone-ui relative aspect-[390/844] overflow-hidden rounded-[2.1rem] bg-white text-slate-900 dark:bg-[#0f1115] dark:text-slate-100">
        <div className="absolute left-1/2 top-[1.4%] z-20 h-[4%] w-[31%] -translate-x-1/2 rounded-full bg-[#1d1f23]" />
        <div className="ph-15 relative z-10 flex items-center justify-between px-[8%] pt-[4.2%] font-semibold">
          <span>9:41</span>
          <span className="flex items-center gap-[1.5cqw]">
            <Signal className="h-[4cqw] w-[4cqw]" />
            <Wifi className="h-[4cqw] w-[4cqw]" />
            <BatteryFull className="h-[4.6cqw] w-[4.6cqw]" />
          </span>
        </div>
        {children}
      </div>
    </div>
  )
}
```

```tsx
// components/marketing/stage/stage-notification.tsx
import { Plus } from "lucide-react"

/** One iOS-style notice. The icon is the InstantMed cross mark, never a person. */
export function StageNotification({ app, title, body, time = "now" }: { app: string; title: string; body?: string; time?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/70 bg-white/95 px-4 py-3 shadow-lg shadow-primary/15 dark:border-white/10 dark:bg-card">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.6rem] bg-primary text-primary-foreground">
        <Plus className="h-5 w-5" strokeWidth={3} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2 text-sm text-muted-foreground">
          <span className="font-medium uppercase tracking-wide">{app}</span>
          <span>{time}</span>
        </div>
        <p className="mt-0.5 text-base font-semibold leading-snug text-foreground">{title}</p>
        {body && <p className="text-sm leading-snug text-muted-foreground">{body}</p>}
      </div>
    </div>
  )
}
```

```tsx
// components/marketing/stage/device-stage.tsx
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

import { PhoneFrame } from "./phone-frame"

export type StageTone = "day" | "dusk"

interface DeviceStageProps {
  /** Announced by screen readers. Must say it is an example or specimen. */
  label: string
  screen: ReactNode
  notification?: ReactNode
  tone?: StageTone
  className?: string
}

export function DeviceStage({ label, screen, notification, tone = "day", className }: DeviceStageProps) {
  return (
    <figure data-hero-facsimile="" data-stage-tone={tone} className={cn("relative mx-auto w-full max-w-[25rem] pb-6 pt-4", className)}>
      <div aria-hidden="true" className={cn("pointer-events-none absolute left-1/2 top-0 aspect-square w-[95%] -translate-x-1/2 rounded-full", tone === "dusk" ? "stage-sun-dusk" : "stage-sun-day")} />
      <div aria-hidden="true" className="stage-floor pointer-events-none absolute inset-x-[16%] bottom-0 h-10 rounded-[50%]" />
      <div aria-hidden="true" className="stage-phone-enter relative mx-auto w-[64%] max-w-[16.5rem]">
        <PhoneFrame>{screen}</PhoneFrame>
      </div>
      {notification && (
        <div aria-hidden="true" className="stage-notice-enter absolute inset-x-2 top-[18%] sm:-left-8 sm:right-auto sm:w-[80%]">
          {notification}
        </div>
      )}
      <figcaption className="sr-only">{label}</figcaption>
    </figure>
  )
}
```

```ts
// components/marketing/stage/index.ts
export { DeviceStage, type StageTone } from "./device-stage"
export { PhoneFrame } from "./phone-frame"
export { StageNotification } from "./stage-notification"
```

- [ ] **Step 5: Run the tests**

Run: `pnpm exec vitest run lib/__tests__/device-stage-contract.test.ts && pnpm typecheck && pnpm exec eslint components/marketing/stage`
Expected: PASS. The four `aria-hidden` wrappers are the sun, the floor, the phone and the notification.

- [ ] **Step 6: Commit**

```bash
git add components/marketing/stage app/globals.css lib/__tests__/device-stage-contract.test.ts
git commit -m "Add the hero device stage: sharp coded phone, morning sun backdrop, one notice entrance"
```

### Task 3: `CertificateScene` and the `/medical-certificate` direction proof (Rey review gate)

**Files:**
- Create: `components/marketing/stage/scenes/certificate-scene.tsx`
- Create: `components/marketing/hero-fit-strip.tsx`
- Modify: `components/marketing/hero.tsx`, `components/marketing/med-cert-landing.tsx`
- Modify: `lib/__tests__/advertising-compliance-guard.test.ts` (add the scene to `MED_CERT_VISIBLE_CERTIFICATE_MOCKUP_SURFACES`)
- Test: `lib/__tests__/hero-fit-strip-contract.test.ts`

**Interfaces:**
- Consumes: `DeviceStage`, `StageNotification` (Task 2); `HERO_TITLES`, `HeroTitle`, `heroDisplayFont` (Task 1).
- Produces: `<CertificateScene notice?: "certificate" | "escript" />` (default `"certificate"`), and `<HeroFitStrip items: { icon: LucideIcon; label: string; priced?: boolean }[]; notes?: string[]; availabilityServiceId?: ServiceId />`. `Hero` gains `titleEntry?: HeroTitleEntry` (preferred over `title`) and `fitStrip?: ReactNode` rendered as the next sibling after `</section>`.

- [ ] **Step 1: Write the failing fit-strip test**

```ts
// lib/__tests__/hero-fit-strip-contract.test.ts
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8")

describe("hero fit strip", () => {
  const strip = read("components/marketing/hero-fit-strip.tsx")

  it("renders directly after the hero section", () => {
    const hero = read("components/marketing/hero.tsx")
    expect(hero).toMatch(/<\/section>\s*\{fitStrip\}/)
    expect(strip).toContain('data-hero-fit=""')
  })

  it("hides priced items behind the same availability gate as the CTA", () => {
    expect(strip).toContain("ServiceAvailabilityGate")
    expect(strip).toMatch(/priced[\s\S]*ServiceAvailabilityGate/)
  })

  it("keeps medical-certificate small print verbatim", () => {
    const page = read("components/marketing/med-cert-landing.tsx")
    expect(page).toContain("Employer and institution policies may vary.")
    expect(page).toContain("<HeroFitStrip")
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm exec vitest run lib/__tests__/hero-fit-strip-contract.test.ts`
Expected: FAIL, ENOENT for `hero-fit-strip.tsx`.

- [ ] **Step 3: Build `HeroFitStrip`**

```tsx
// components/marketing/hero-fit-strip.tsx
import type { LucideIcon } from "lucide-react"

import { ServiceAvailabilityGate, type ServiceId } from "@/components/providers/service-availability-provider"

export interface FitItem { icon: LucideIcon; label: string; /** Hidden when the service is unavailable. */ priced?: boolean }

/** The facts that decide "is this for me?", lifted out of the hero so the hero can breathe. */
export function HeroFitStrip({ items, notes = [], availabilityServiceId }: { items: FitItem[]; notes?: string[]; availabilityServiceId?: ServiceId }) {
  const renderItem = ({ icon: Icon, label }: FitItem) => (
    <li key={label} className="flex items-center gap-3 text-base font-medium text-foreground">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      {label}
    </li>
  )
  return (
    <section data-hero-fit="" aria-label="Who this is for" className="px-4 pb-6 sm:px-6 lg:pb-10">
      <div className="mx-auto max-w-5xl rounded-2xl border border-border/50 bg-white px-5 py-5 shadow-md shadow-primary/[0.06] dark:border-white/10 dark:bg-card sm:px-7">
        <ul className="grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-4">
          {items.map((item) => item.priced
            ? <ServiceAvailabilityGate key={item.label} serviceId={availabilityServiceId}>{renderItem(item)}</ServiceAvailabilityGate>
            : renderItem(item))}
        </ul>
        {notes.length > 0 && (
          <div className="mt-5 space-y-1 border-t border-border/50 pt-4 text-sm leading-relaxed text-muted-foreground dark:border-white/10">
            {notes.map((note) => <p key={note}>{note}</p>)}
          </div>
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Build `CertificateScene`**

Wording rule: the certificate body sentence must match the locked PDF wording already used in `components/marketing/mockups/med-cert-hero-mockup.tsx`. Copy it exactly; `advertising-compliance-guard` checks it.

```tsx
// components/marketing/stage/scenes/certificate-scene.tsx
import { ChevronLeft, Share } from "lucide-react"

import { DeviceStage } from "../device-stage"
import { StageNotification } from "../stage-notification"

const QR_CELLS = "1110111010011011000110101101110110010111011010110100011101101011101101100101110101101101101".split("")

function VerifyMark() {
  return (
    <div className="grid aspect-square w-[16cqw] grid-cols-[repeat(9,1fr)] gap-[0.4cqw]">
      {QR_CELLS.slice(0, 81).map((cell, i) => <span key={i} className={cell === "1" ? "bg-slate-900 dark:bg-slate-100" : ""} />)}
    </div>
  )
}

function CertificateScreen() {
  return (
    <div className="flex h-full flex-col">
      <div className="ph-15 flex items-center justify-between px-[5%] pb-[3%] pt-[4%] text-primary">
        <span className="flex items-center"><ChevronLeft className="h-[5cqw] w-[5cqw]" />Mail</span>
        <span className="ph-15 font-semibold text-slate-900 dark:text-slate-100">Certificate.pdf</span>
        <Share className="h-[4.6cqw] w-[4.6cqw]" />
      </div>
      <div className="flex-1 bg-slate-100 px-[4%] pt-[4%] dark:bg-slate-900">
        <div className="rounded-[2cqw] bg-white px-[7%] py-[7%] shadow-sm dark:bg-[#15181d]">
          <div className="flex items-center justify-between border-b border-slate-200 pb-[4%] dark:border-slate-700">
            <span className="ph-17 font-semibold tracking-tight text-primary">InstantMed</span>
            <span className="ph-12 font-semibold uppercase tracking-[0.2em] text-slate-500">Specimen</span>
          </div>
          <p className="ph-13 mt-[5%] text-slate-500">23 September 2026</p>
          <p className="ph-22 mt-[2%] font-semibold">Medical certificate</p>
          <p className="ph-13 mt-[5%] text-slate-700 dark:text-slate-300">
            I certify that <strong>Alex Taylor</strong> consulted me on 23 September 2026. Based on my assessment, they were unable to attend their usual work duties on 23 September 2026.
          </p>
          <div className="mt-[7%] border-t border-slate-200 pt-[4%] dark:border-slate-700">
            <p className="ph-13 font-semibold">AHPRA-registered medical practitioner</p>
          </div>
          <div className="mt-[6%] flex items-center gap-[4%] rounded-[2cqw] bg-primary/[0.06] p-[4%]">
            <VerifyMark />
            <div>
              <p className="ph-13 font-semibold">Ref SPECIMEN</p>
              <p className="ph-12 text-primary">instantmed.com.au/verify</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function CertificateScene({ notice = "certificate" }: { notice?: "certificate" | "escript" }) {
  return (
    <DeviceStage
      label={notice === "escript"
        ? "Example: a specimen medical certificate on a phone, with an eScript text message arriving."
        : "Example: a specimen medical certificate open on a phone after its email arrives."}
      screen={<CertificateScreen />}
      notification={notice === "escript"
        ? <StageNotification app="Messages" title="InstantMed" body="Your eScript is ready." />
        : <StageNotification app="InstantMed" title="Your medical certificate is ready" body="Open the secure link in your email." />}
    />
  )
}
```

- [ ] **Step 5: Extend `Hero` for `titleEntry` and `fitStrip`**

In `components/marketing/hero.tsx`:
1. Add props `titleEntry?: HeroTitleEntry` and `fitStrip?: ReactNode`.
2. Render the heading content as `titleEntry ? <HeroTitle entry={titleEntry} /> : title`.
3. Wrap the return in a fragment: `<>` + the existing `<section …>` + `{fitStrip}` + `</>`.
4. Change the mockup wrapper class from `max-w-md` to `max-w-[26rem]`, and give the grid `lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]` so the stage gets more width.

- [ ] **Step 6: Rebuild the `/medical-certificate` hero**

In `components/marketing/med-cert-landing.tsx`:
1. Replace `title={…}` and `titleClassName={moneyH1Font.className}` with `titleEntry={HERO_TITLES.medCert}`.
2. Replace the `children` paragraph with `<p className="mb-7 max-w-md text-balance text-lg leading-relaxed text-muted-foreground">{MED_CERT_WEDGE} Doctor-issued for work, study or carer&apos;s leave.</p>`.
3. Delete the `beforeCta` prop and the `ELIGIBILITY_CHIPS` constant.
4. Set `mockup={<CertificateScene />}` and remove the `MedCertHeroMockup` import.
5. Import `MapPin`, `UserRound`, `IdCard` and `Timer` from `lucide-react`, plus `HeroFitStrip`, `CertificateScene` and `HERO_TITLES`. Then add:

```tsx
fitStrip={(
  <HeroFitStrip
    availabilityServiceId="med-cert"
    items={[
      { icon: MapPin, label: "Australia only" },
      { icon: UserRound, label: "Ages 18+" },
      { icon: IdCard, label: "No Medicare needed" },
      { icon: Timer, label: "About 3 minutes" },
    ]}
    notes={["Issued by AHPRA-registered Australian doctors. Employer and institution policies may vary."]}
  />
)}
```

Update pins:
- `money-page-narrative-contract.test.ts`: the subheading assertion now reads `{MED_CERT_WEDGE} Doctor-issued for work`.
- `code-clean-retirement-contract.test.ts:209`: med cert now imports `CertificateScene`.
- `money-page-narrative-compression-contract.test.ts`: med-cert section order is unchanged; the fit strip lives inside the `<Hero` element.
- `canonical-trust-copy-contract`: "about 3 minutes" is satisfied by the fit strip label.

- [ ] **Step 7: Verify in a production build**

```bash
cp ../../instantmed/.env.local . && pnpm build && PLAYWRIGHT=1 pnpm start -p 3061
```

Then, in the browser pane at `http://localhost:3061/medical-certificate`:
- Screenshot at 1440×900 and 375×812, light theme.
- Repeat with reduced motion.
- Confirm no console errors.

Run the geometry gate: `PLAYWRIGHT=1 PLAYWRIGHT_SERVER_MODE=production PLAYWRIGHT_PORT=3071 pnpm exec playwright test e2e/landing-pages.spec.ts --project=chromium -g "medical-certificate"`.
Expected: all pass. Page length stays ≤ 10.0 screens.

- [ ] **Step 8: Commit, open the PR as draft, and STOP for Rey's review**

```bash
git add -A && git commit -m "Direction proof: certificate stage and fit strip on /medical-certificate"
```

Send Rey the two screenshots. **Do not start Task 4 until Rey approves the direction.** Record any adjustments he asks for in Section 2 of this plan before continuing.

---

## Phase 1 — Scenes

Each scene task follows the same cycle:
1. Extend `device-stage-contract.test.ts` with a render assertion (the scene file exists and exports its component).
2. Run it and confirm it fails.
3. Build the scene.
4. Run the contract, typecheck and lint.
5. Commit.

The component code is given in full.

### Task 4: `EScriptScene` (lock screen)

**Files:** Create `components/marketing/stage/scenes/escript-scene.tsx`. Test: add `it("exports EScriptScene", …)` to `lib/__tests__/device-stage-contract.test.ts`, asserting that the file contains `export function EScriptScene` and the string `any Australian pharmacy`.

- [ ] **Step 1: Add the failing assertion and run it**

```ts
it("exports EScriptScene with pharmacy-neutral wording", () => {
  const src = read(`${sceneDir}/escript-scene.tsx`)
  expect(src).toContain("export function EScriptScene")
  expect(src).toContain("any Australian pharmacy")
})
```

Run: `pnpm exec vitest run lib/__tests__/device-stage-contract.test.ts`. Expected: FAIL.

- [ ] **Step 2: Implement**

```tsx
// components/marketing/stage/scenes/escript-scene.tsx
import { MessageCircle } from "lucide-react"

import { DeviceStage } from "../device-stage"

function LockScreen() {
  return (
    <div className="absolute inset-0 flex flex-col items-center bg-[linear-gradient(180deg,var(--morning-sky)_0%,color-mix(in_srgb,var(--morning-sky)_40%,var(--morning-peach))_55%,var(--morning-ivory)_100%)] pt-[20%]">
      <p className="ph-17 font-medium text-slate-700/80">Thursday 25 September</p>
      <p className="ph-lock mt-[1%] text-slate-800/90">9:41</p>
      <div className="mt-auto mb-[26%] w-[92%] rounded-[5cqw] bg-white/85 px-[5%] py-[4%] text-slate-900 shadow-sm">
        <div className="ph-13 flex items-center justify-between text-slate-500">
          <span className="flex items-center gap-[2cqw] font-medium uppercase"><MessageCircle className="h-[4cqw] w-[4cqw] text-emerald-500" />Messages</span>
          <span>now</span>
        </div>
        <p className="ph-15 mt-[2%] font-semibold">InstantMed</p>
        <p className="ph-15 text-slate-700">Your eScript is ready. Show the token at any Australian pharmacy.</p>
      </div>
    </div>
  )
}

export function EScriptScene() {
  return (
    <DeviceStage
      label="Example: an eScript text message from InstantMed on a phone lock screen. Sent only if the doctor prescribes."
      screen={<LockScreen />}
    />
  )
}
```

The lock-screen wallpaper gradient is the morning spectrum inside the device, which keeps the brand light without a second page canvas. The status bar keeps its dark text and paints above the wallpaper because it is `z-10`.

- [ ] **Step 3: Verify and commit**

Run: `pnpm exec vitest run lib/__tests__/device-stage-contract.test.ts && pnpm typecheck`. Expected: PASS.

```bash
git add components/marketing/stage/scenes/escript-scene.tsx lib/__tests__/device-stage-contract.test.ts
git commit -m "Add eScript lock-screen scene"
```

### Task 5: `PrivateReviewScene`

**Files:** Create `components/marketing/stage/scenes/private-review-scene.tsx`. Test: the contract asserts the file exports `PrivateReviewScene` and contains `Only your doctor sees your answers.`

- [ ] **Step 1: Add the failing assertion and run it**

```ts
it("exports PrivateReviewScene with the privacy line and no outcome promise", () => {
  const src = read(`${sceneDir}/private-review-scene.tsx`)
  expect(src).toContain("export function PrivateReviewScene")
  expect(src).toContain("Only your doctor sees your answers.")
  expect(src).not.toMatch(/approved|prescribed|treatment plan/i)
})
```

- [ ] **Step 2: Implement**

```tsx
// components/marketing/stage/scenes/private-review-scene.tsx
import { Check, Lock } from "lucide-react"

import { DeviceStage, type StageTone } from "../device-stage"
import { StageNotification } from "../stage-notification"

const STEPS = [
  { label: "Form submitted", state: "done" },
  { label: "Doctor review", state: "current" },
  { label: "Outcome", state: "next" },
] as const

function ReviewScreen({ service }: { service: string }) {
  return (
    <div className="flex h-full flex-col">
      <div className="mx-[4%] mt-[3%] flex items-center justify-center gap-[1.5cqw] rounded-[3cqw] bg-slate-100 py-[2.5%] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <Lock className="h-[3.4cqw] w-[3.4cqw]" /><span className="ph-13">instantmed.com.au</span>
      </div>
      <div className="px-[7%] pt-[9%]">
        <p className="ph-13 font-semibold uppercase tracking-[0.14em] text-primary">{service}</p>
        <p className="ph-34 mt-[2%] font-semibold">Private assessment</p>
        <ol className="mt-[9%] space-y-[6%]">
          {STEPS.map((step) => (
            <li key={step.label} className="flex items-center gap-[4%]">
              <span className={
                step.state === "done" ? "flex h-[8cqw] w-[8cqw] items-center justify-center rounded-full bg-emerald-500 text-white"
                : step.state === "current" ? "h-[8cqw] w-[8cqw] rounded-full border-[1.2cqw] border-primary bg-primary/10"
                : "h-[8cqw] w-[8cqw] rounded-full border-[0.6cqw] border-slate-300 dark:border-slate-600"}>
                {step.state === "done" && <Check className="h-[4.4cqw] w-[4.4cqw]" strokeWidth={3} />}
              </span>
              <span className={`ph-17 ${step.state === "next" ? "text-slate-400" : "font-medium"}`}>{step.label}</span>
            </li>
          ))}
        </ol>
        <div className="mt-[11%] flex items-start gap-[3%] rounded-[4cqw] bg-slate-50 p-[5%] dark:bg-slate-800/60">
          <Lock className="mt-[0.5cqw] h-[4.4cqw] w-[4.4cqw] shrink-0 text-primary" />
          <p className="ph-15 text-slate-600 dark:text-slate-300">Only your doctor sees your answers.</p>
        </div>
      </div>
    </div>
  )
}

export function PrivateReviewScene({ service, tone = "day" }: { service: string; tone?: StageTone }) {
  return (
    <DeviceStage
      tone={tone}
      label={`Example: a private ${service.toLowerCase()} assessment in progress on a phone, with a notice that the doctor has reviewed it.`}
      screen={<ReviewScreen service={service} />}
      notification={<StageNotification app="InstantMed" title="Your doctor has reviewed your assessment" body="Sign in to see the outcome." />}
    />
  )
}
```

`service` values: `"ED assessment"`, `"Hair loss assessment"`, `"Men's health"`.

- [ ] **Step 3: Verify and commit**

Run the contract, typecheck and lint, then:

```bash
git add components/marketing/stage/scenes/private-review-scene.tsx lib/__tests__/device-stage-contract.test.ts
git commit -m "Add private assessment scene"
```

### Task 6: `ChoiceScene` and `WeightScene`

**Files:** Create `components/marketing/stage/scenes/choice-scene.tsx` and `components/marketing/stage/scenes/weight-scene.tsx`. Test: the contract asserts both exports, and that `weight-scene.tsx` imports its BMI floors from `@/lib/clinical/weight-loss-eligibility` rather than inlining `27` or `30`.

- [ ] **Step 1: Add the failing assertions and run them**

```ts
it("exports ChoiceScene and WeightScene", () => {
  expect(read(`${sceneDir}/choice-scene.tsx`)).toContain("export function ChoiceScene")
  const weight = read(`${sceneDir}/weight-scene.tsx`)
  expect(weight).toContain("export function WeightScene")
  expect(weight).not.toMatch(/\b(27|30)\b/)
})
```

- [ ] **Step 2: Implement `ChoiceScene`**

```tsx
// components/marketing/stage/scenes/choice-scene.tsx
import { Check, ChevronRight } from "lucide-react"

import { DeviceStage } from "../device-stage"

const OPTIONS = {
  uti: { title: "UTI symptoms", body: "Burning, urgency, frequency" },
  pill: { title: "The contraceptive pill", body: "Start, switch or continue" },
} as const

function ChoiceScreen({ selected }: { selected: keyof typeof OPTIONS }) {
  return (
    <div className="px-[7%] pt-[12%]">
      <p className="ph-13 font-semibold uppercase tracking-[0.14em] text-primary">Women&apos;s health</p>
      <p className="ph-34 mt-[2%] font-semibold">Which assessment?</p>
      <div className="mt-[9%] space-y-[4%]">
        {(Object.keys(OPTIONS) as (keyof typeof OPTIONS)[]).map((key) => {
          const active = key === selected
          return (
            <div key={key} className={`flex items-center gap-[4%] rounded-[4cqw] border-[0.5cqw] p-[5%] ${active ? "border-primary bg-primary/[0.06]" : "border-slate-200 dark:border-slate-700"}`}>
              <div className="min-w-0 flex-1">
                <p className="ph-17 font-semibold">{OPTIONS[key].title}</p>
                <p className="ph-13 text-slate-500">{OPTIONS[key].body}</p>
              </div>
              {active
                ? <span className="flex h-[7cqw] w-[7cqw] items-center justify-center rounded-full bg-primary text-white"><Check className="h-[4cqw] w-[4cqw]" strokeWidth={3} /></span>
                : <ChevronRight className="h-[5cqw] w-[5cqw] text-slate-400" />}
            </div>
          )
        })}
      </div>
      <div className="ph-17 mt-[12%] rounded-[4cqw] bg-primary py-[4.5%] text-center font-semibold text-white">Continue</div>
    </div>
  )
}

export function ChoiceScene({ selected }: { selected: keyof typeof OPTIONS }) {
  return (
    <DeviceStage
      label={`Example: choosing the ${OPTIONS[selected].title.toLowerCase()} assessment on a phone.`}
      screen={<ChoiceScreen selected={selected} />}
    />
  )
}
```

- [ ] **Step 3: Implement `WeightScene`**

```tsx
// components/marketing/stage/scenes/weight-scene.tsx
import { DeviceStage } from "../device-stage"

const HEIGHT_CM = 172
const WEIGHT_KG = 95
const BMI = (WEIGHT_KG / (HEIGHT_CM / 100) ** 2).toFixed(1)

function Field({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="rounded-[4cqw] border-[0.5cqw] border-slate-200 px-[5%] py-[4%] dark:border-slate-700">
      <p className="ph-13 text-slate-500">{label}</p>
      <p className="ph-22 font-semibold">{value} <span className="ph-15 font-normal text-slate-500">{unit}</span></p>
    </div>
  )
}

function AboutYouScreen() {
  return (
    <div className="px-[7%] pt-[12%]">
      <p className="ph-13 font-semibold uppercase tracking-[0.14em] text-primary">Weight management</p>
      <p className="ph-34 mt-[2%] font-semibold">About you</p>
      <div className="mt-[9%] space-y-[4%]">
        <Field label="Height" value={HEIGHT_CM} unit="cm" />
        <Field label="Weight" value={WEIGHT_KG} unit="kg" />
      </div>
      <div className="mt-[6%] inline-flex items-center gap-[2cqw] rounded-full bg-primary/10 px-[4%] py-[2%]">
        <span className="ph-15 font-semibold text-primary">BMI {BMI}</span>
      </div>
      <div className="ph-17 mt-[14%] rounded-[4cqw] bg-primary py-[4.5%] text-center font-semibold text-white">Continue</div>
    </div>
  )
}

export function WeightScene() {
  return (
    <DeviceStage
      label="Example: entering height and weight in the weight management assessment on a phone."
      screen={<AboutYouScreen />}
    />
  )
}
```

The scene shows a computed BMI and no eligibility verdict, so it cannot read as an outcome.

- [ ] **Step 4: Verify and commit**

Run the contract, typecheck and lint, then:

```bash
git add components/marketing/stage/scenes lib/__tests__/device-stage-contract.test.ts
git commit -m "Add choice and weight scenes"
```

---

## Phase 2 — Page integration

Each page task:
1. Update or add the pins listed.
2. Apply the edits.
3. Run `pnpm exec vitest run` on the named tests plus `landing-vocabulary-contract`, `landing-type-floor-contract`, `advertising-compliance-guard`, `canonical-trust-copy-contract` and `marketing-copy-contract`.
4. Typecheck.
5. Commit.

Browser proof happens once per phase in Task 9.

### Task 7: Main pages (home, prescriptions, ED, hair loss, women's health, weight)

**Files:** `app/(marketing)/page.tsx`, `components/marketing/prescriptions-landing.tsx`, `prescriptions-client-controls.tsx`, `erectile-dysfunction-landing.tsx`, `hair-loss-landing.tsx`, `womens-health-landing.tsx`, `weight-loss-landing.tsx`, and the tests named per step.

- [ ] **Step 1: Home**
- Set `titleEntry={HERO_TITLES.home}` and delete the `HOME_HERO_TITLE` constant added in PR #608.
- Sentence: `Certificates, repeat scripts and private assessments from AHPRA-registered doctors.`
- `mockup={<CertificateScene notice="escript" />}`.
- `fitStrip` items: `Australia only` (MapPin), `Adults 18+` (UserRound), `From {PRICING_DISPLAY.MED_CERT}` (priced, Tag), `Requests 24/7` (Clock).
- Delete `hero-doctor-review-mockup.tsx`, and repoint `/consult` in Task 8.
- Update `portfolio-art-direction-contract.test.ts`: replace the "Australian adults 18+" assertion with one that expects "Adults 18+" in the fit strip items; keep `secondaryCta={null}` and the no-`next/image` assertions.
- Update `money-page-lcp-critical-path.test.ts`: "home imports `HeroDoctorReviewMockup`" becomes "home imports `CertificateScene`".
- Update `e2e/money-pages-foundations.spec.ts:1548-1553`: the home specimen check now looks for `figure[data-hero-facsimile] figcaption` containing "specimen".

- [ ] **Step 2: Prescriptions**
- `titleEntry={HERO_TITLES.prescriptions}`.
- Sentence: `One medicine you already take, reviewed by an Australian doctor.`
- Remove `beforeCta`, and set the reassurance to the default `GUARANTEE`.
- `mockup={<EScriptScene />}`.
- `fitStrip` items: `Australia only`, `Ages 18+`, `One regular medicine` (Pill icon is banned imagery; use `RefreshCw`), `eScript by SMS` (MessageSquare).
- Notes: `getApprovedClaim("form_first_wedge")` and `getApprovedClaim("prescribing_identity_required")`, both verbatim.
- Delete `mockups/escript-hero-mockup.tsx`.
- Update `code-clean-retirement-contract.test.ts:210`: the page imports `EScriptScene`.
- Update the `marketing-reduced-motion-contract` eScript assertion to target `escript-scene.tsx`.

- [ ] **Step 3: ED**
- `titleEntry={HERO_TITLES.ed}`.
- Sentence: `A secure form, reviewed by an Australian doctor. One-off fee.`
- Keep the CTA and "See how it works".
- `mockup={<PrivateReviewScene service="ED assessment" tone="dusk" />}`.
- Delete `EdHeroFacts` and move `HERO_FACTS` into the fit strip:
  - `Australia only · Ages 18+` becomes two items.
  - `{ED_SERVICE.effort} form` (Timer).
  - `One-off {PRICING_DISPLAY.MENS_HEALTH}` (priced).
  - Notes: `prescribing_identity_required`, then `prescription_if_approved`, verbatim.
- Update `money-page-narrative-contract.test.ts`: "The practical facts appears once" is replaced by an assertion that the ED page renders `<HeroFitStrip` and contains `getApprovedClaim("prescribing_identity_required")`.
- Update `e2e/money-pages-foundations.spec.ts`: the ED hero-facts `aside` / 4-`dt` test becomes "`[data-hero-fit] li` has 4 items in order: Australia only, Ages 18+, ~4 min form, One-off $49.95".

- [ ] **Step 4: Hair loss**
- Same pattern as ED, with `HERO_TITLES.hairLoss` and `PrivateReviewScene service="Hair loss assessment"` in the default day tone.
- Keep the "Prescription is not guaranteed" and "The doctor decides whether to prescribe" strings where `marketing-copy-contract` pins them. They are outside the hero; check with `grep -n "not guaranteed" components/marketing/hair-loss-landing.tsx`.
- Delete `HairHeroFacts`.
- Update `money-page-art-direction-contract.test.ts` for the removed fact figure. Keep its bans on `next/image`, the `hairloss-*.webp` photos and drug names.
- Note: that contract bans `<svg>` in hair-loss files. The scene uses lucide icons and lives outside that file set, so confirm the assertion is scoped to `hair-loss-landing.tsx` only.

- [ ] **Step 5: Women's health**
- `titleEntry={HERO_TITLES.womensHealth}`.
- Sentence: `Pick your assessment. Each has its own safety check before payment.`
- `mockup={<ChoiceScene selected="pill" />}`.
- Remove `beforeCta`.
- Move `WomensHealthDecisionFork` out of the hero and render it as the first section after the hero: it is the functional chooser and keeps its links and its `FORM_FIRST_WEDGE` line.
- `fitStrip`: `Australia only`, `Ages 18+`, `About 3 minutes`, `One-off {PRICING_DISPLAY.WOMENS_HEALTH}` (priced).
- Update `money-page-narrative-compression-contract.test.ts` for women's health: the section order starts `<Hero` → `WomensHealthDecisionFork` → `WomensHealthCommonFacts` …
- Update `portfolio-art-direction-contract` for the fork's new position.

- [ ] **Step 6: Weight**
- `titleEntry={HERO_TITLES.weightLoss}`.
- Sentence: `` `A private assessment for adults with a BMI of ${WEIGHT_LOSS_BMI_FLOOR_WITHOUT_COMORBIDITY}, or ${WEIGHT_LOSS_BMI_FLOOR} with a related condition.` ``
- `mockup={<WeightScene />}`. Delete `WeightHeroFacts`.
- `fitStrip`: `Australia only`, `Ages 18+`, `{WEIGHT_SERVICE.effort} form`, `One-off {PRICING_DISPLAY.WEIGHT_LOSS}` (priced).
- Notes: `form_first_wedge`, then `prescribing_identity_required`, verbatim.

- [ ] **Step 7: Run tests and commit**

```bash
pnpm exec vitest run lib/__tests__/ && pnpm typecheck && pnpm lint
git add -A && git commit -m "Move main landing heroes onto the stage system with fit strips"
```

Expected: the full Vitest suite passes. Fix each red pin by updating it to the new structure, never by weakening a compliance assertion.

### Task 8: `/consult` and the seven bespoke SEO heroes

**Files:** `app/consult/page.tsx`, `components/marketing/{medical-certificate-online,mens-health,mental-health-online,online-prescriptions,uti-assessment,weight-loss-online,contraceptive-pill-assessment}-landing.tsx`, and `components/marketing/hero-certifications.tsx` (the bespoke insertions from #608 are removed because the shared Hero now renders them).

- [ ] **Step 1: Migrate each bespoke hero to `<Hero>`**

For each page:
1. Delete the hand-built hero `<section>`, the `SectionPill`, and the fact panel or "practical answer" card from the hero.
2. Render `<Hero titleEntry={HERO_TITLES.<key>} mockup={<Scene />} fitStrip={…}>` with a sentence of ≤ 16 words. Keep each page's existing primary and secondary CTA labels and hrefs.
3. Move the fact panel and practical-answer text into the page's first `SectionShell`, verbatim, under the heading "The short answer".

| Page | Scene | Sentence | Fit strip notes (verbatim constants) |
|---|---|---|---|
| medical-certificate-online | `CertificateScene` | `MED_CERT_WEDGE` + " Reviewed by an Australian doctor." | `GUARANTEE`, "Employer and institution policies may vary." |
| mens-health | `PrivateReviewScene service="Men's health" tone="dusk"` | "ED and hair loss assessments, reviewed by an Australian doctor." | `FORM_FIRST_WEDGE` |
| mental-health-online | `CertificateScene` | "Short certificates when suitable. Crisis support first." | Keep the crisis line **in the hero** as `reassuranceRow`: "For immediate danger, call 000. For crisis support, call Lifeline on 13 11 14." (clinical safety; route through `instantmed-clinical-safety-review`) |
| online-prescriptions | `EScriptScene` | "Repeat prescriptions from an Australian doctor, explained." | `FORM_FIRST_WEDGE`, then the existing 16-word caveat |
| uti-assessment | `ChoiceScene selected="uti"` | "A private UTI assessment, reviewed by an Australian doctor." | `FORM_FIRST_WEDGE`, `prescribing_identity_required`, "Treatment is not guaranteed." |
| weight-loss-online | `WeightScene` | "What an online weight review can and cannot safely do." | the existing 23-word caveat |
| contraceptive-pill-assessment | `ChoiceScene selected="pill"` | "Start, switch or continue the pill, reviewed by an Australian doctor." | "Safety checks come before payment. Full refund if the doctor declines. Prescription is not guaranteed." |

- [ ] **Step 2: `/consult`**
- `titleEntry={HERO_TITLES.consult}` and `mockup={<CertificateScene notice="escript" />}`.
- Keep `mockupClassName="hidden lg:block"` and `showReviews={false}`.
- Move `beforeCta` into a fit strip with notes `prescribing_identity_required` and "Medical certificates do not require Medicare."
- Update `consult-services-index-contract.test.ts`, keeping its "InstantMed does not offer a broad general consult" and "Requests and review 24/7" pins.

- [ ] **Step 3: Remove the #608 bespoke insertions**

Delete `<HeroCertifications className="mt-5" />` from the six bespoke files (the shared Hero renders it now). In `landing-hero-contract.test.ts`, change the bespoke-page loop to assert that each file contains `<Hero`.

- [ ] **Step 4: Run tests and commit**

```bash
pnpm exec vitest run lib/__tests__/ && pnpm typecheck && pnpm lint
git add -A && git commit -m "Move every bespoke SEO hero onto the shared hero and stage system"
```

---

## Phase 3 — Proof, docs and release

### Task 9: Hero budget e2e, full browser proof

**Files:** Create `e2e/landing-hero-budget.spec.ts`. Modify `e2e/front-door.spec.ts` and `e2e/landing-pages.spec.ts` (ratchet the page budgets down to the new measured values rounded up to 0.25).

- [ ] **Step 1: Write the spec**

```ts
// e2e/landing-hero-budget.spec.ts
import { expect, test } from "@playwright/test"

import { gotoPublicRoute, seedMoneyPageState } from "./helpers/money-pages"

const HERO_ROUTES = [
  "/", "/medical-certificate", "/prescriptions", "/erectile-dysfunction", "/hair-loss", "/womens-health", "/weight-loss",
  "/consult", "/medical-certificate-online", "/mens-health", "/mental-health-online", "/online-prescriptions",
  "/uti-assessment-online", "/weight-loss-online", "/contraceptive-pill-assessment-online",
] as const

const EXCLUDE = "h1, [data-hero-facsimile], [data-hero-status], [data-hero-reviews], [data-hero-trust-row], .sr-only"

for (const path of HERO_ROUTES) {
  test.describe(path, () => {
    test("hero copy stays within 32 words", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 })
      await seedMoneyPageState(page, "light")
      await gotoPublicRoute(page, path)
      const words = await page.evaluate((exclude) => {
        const hero = document.querySelector("[data-hero]")!.cloneNode(true) as HTMLElement
        hero.querySelectorAll(exclude).forEach((node) => node.remove())
        return hero.innerText.split(/\s+/).filter((w) => /[A-Za-z0-9$]/.test(w)).length
      }, EXCLUDE)
      expect(words, `${path} hero words`).toBeLessThanOrEqual(32)
    })

    test("no horizontal overflow at 320px", async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 720 })
      await seedMoneyPageState(page, "light")
      await gotoPublicRoute(page, path)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
      expect(overflow).toBe(false)
    })

    test("stage renders fully under reduced motion", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" })
      await seedMoneyPageState(page, "light")
      await gotoPublicRoute(page, path)
      const phone = page.locator("[data-hero] .stage-phone-enter").first()
      if (await phone.count()) {
        await expect(phone).toHaveCSS("animation-name", "none")
        await expect(phone).toHaveCSS("opacity", "1")
      }
    })
  })
}

test("med-cert fit strip hides the price when the service is disabled", async ({ page }) => {
  await page.route("**/api/availability", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ maintenance_mode: false, disable_med_cert: true, disable_repeat_scripts: false, disable_consults: false, disable_weight_loss: false, urgent_notice_enabled: false, urgent_notice_message: "", business_hours_open: 8, business_hours_close: 22, business_hours_timezone: "Australia/Sydney", business_hours_enabled: true }) }))
  await seedMoneyPageState(page, "light")
  await gotoPublicRoute(page, "/")
  await expect(page.locator("[data-hero-fit]")).not.toContainText("$")
  await expect(page.locator("[data-hero] figure[data-hero-facsimile]")).toBeVisible()
})
```

- [ ] **Step 2: Extend the glyph test to every hero route**

In `e2e/front-door.spec.ts:13`, loop the existing CDP glyph probe over the `HERO_ROUTES` list above and load `lib/fonts/plus-jakarta-hero.woff2`.

- [ ] **Step 3: Run everything on a production build**

```bash
pnpm build
PLAYWRIGHT=1 PLAYWRIGHT_SERVER_MODE=production PLAYWRIGHT_PORT=3071 pnpm exec playwright test e2e/landing-hero-budget.spec.ts e2e/landing-pages.spec.ts e2e/front-door.spec.ts e2e/money-pages-foundations.spec.ts --project=chromium
```

Expected: all pass. Then ratchet `LANDING_PAGES[].maxPhoneScreens` in `e2e/landing-pages.spec.ts` down to the measured values, rounded up to the nearest 0.25.

- [ ] **Step 4: Visual proof**

In the browser pane, capture every hero route at 1440×900 and 375×812 in light mode, plus dark mode and reduced motion for `/`, `/medical-certificate` and `/erectile-dysfunction`. Check against the Global Constraints list by eye:
- One entrance only.
- No clipped notification at 375px.
- The ED dusk stage reads calm, not dark.
- The sun disc never competes with the H1.

Assemble the screenshots into one contact sheet for Rey.

- [ ] **Step 5: Commit**

```bash
git add e2e && git commit -m "Gate hero word budget, 320px overflow, reduced motion and display glyphs on every hero"
```

### Task 10: Docs, compliance sign-off and release

**Files:** `DESIGN.md` §6 and the Trust Logos note; `docs/DESIGN_SYSTEM_CHANGELOG.md`; `docs/PHOTOGRAPHY_BRIEF.md` (a line stating heroes use coded stages, not photography); `docs/superpowers/plans/2026-09-23-public-navigation-support-and-trust.md` (a superseded note at the Hero visuals section); `wiki/architecture.md` component count.

- [ ] **Step 1:** Rewrite DESIGN.md §6 Hero Rules to Section 2 of this plan: the anatomy, the 32-word budget, the stage, the scene table, the tones, the motion and the fit strip. Bump `DESIGN_SYSTEM_VERSION` minor in `lib/design-system/version.ts` and add a changelog entry, because the hero contract changed.
- [ ] **Step 2:** Run `instantmed-marketing-compliance-review` over every changed hero string and scene string. Record keep/revise/block results in the PR body.
- [ ] **Step 3:** Run `instantmed-clinical-safety-review` for `/mental-health-online` (crisis line placement) and the ED, hair loss, women's health and weight fact moves.
- [ ] **Step 4:** Run `pnpm exec vitest run lib/__tests__/project-docs-drift-contract.test.ts` and fix the counts.
- [ ] **Step 5: Release in two PRs**, per Decision 1:
  - **PR A:** Tasks 1–6 plus home, ED, hair loss, weight and all Task 8 pages.
  - **PR B (October 8):** `/medical-certificate`, `/prescriptions` and `/womens-health`.
  - Annotate both merge dates in Google Ads and in the funnel notes.

## Measuring whether it worked

Compare 14 days before and after each release, excluding `is_e2e=true`:
- **Hero CTA click-through:** `data-*-cta="hero"` clicks divided by landing pageviews, per route.
- **Canonical `intake_started` per landing session:** use `lib/analytics/posthog-canonical-intake-funnel.ts` conventions.
- **Mobile scroll depth to the fit strip** (a new `data-track-section="fit"`).
- **LCP and CLS on the seven main routes:** from the Vercel Speed Insights or Lighthouse jobs already scheduled Monday/Thursday. The font subset must not move LCP by more than 100ms.

A drop in hero CTA rate of more than 15% on a route with at least 300 pageviews in the window reopens that route's copy.

## Out of scope (next plan)

Below-the-hero body text. The main pages still carry 500–665 words and the SEO pages 1,150–2,370. That needs its own plan, written after this one ships, so that the stage system and scenes can be reused as section anchors (How it works with three mini phones, a single price card, and FAQs kept). Draft budget for that plan: ≤ 350 visible words on the seven main pages excluding FAQ answers. SEO pages keep their depth for ranking, but get the same visual system.
