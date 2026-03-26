# UI Refinements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove AI/template signals across marketing and portal surfaces; make InstantMed feel like a modern, real medical service (loops.so / dub.co / craft.do aesthetic).

**Architecture:** Surgical edits only — no structure changes, no new components. Touch data files, rendering logic, and copy. Each task is isolated and independently deployable.

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind v4, Framer Motion, `lib/marketing/homepage.ts` for centralized content.

**Design doc:** `docs/plans/2026-03-27-ui-refinements-design.md`

---

## Task 1: Hero — Better rotating text copy

**Goal:** Replace generic/salesy hero rotating texts with confident, specific, dry-wit copy.

**Files:**
- Modify: `lib/marketing/homepage.ts:26-32`

**Step 1: Replace `heroRotatingTexts`**

```ts
// lib/marketing/homepage.ts — replace lines 26-32
export const heroRotatingTexts = [
  "A doctor, without the waiting room.",
  "Back at work tomorrow.",
  "Sorted before your next coffee.",
  "No appointment. No waiting room. No drama.",
  "Real GP review, without leaving the couch.",
]
```

Rules applied: no urgency words, no prices in the rotating slot (price lives in the badge), dry wit on lines 2–3, specific on line 4.

**Step 2: Verify**

`pnpm dev` → visit `/` → confirm rotating text cycles through new lines, no console errors.

**Step 3: Commit**

```bash
git add lib/marketing/homepage.ts
git commit -m "copy: update hero rotating text — confident, dry, no hype"
```

---

## Task 2: Hero — Replace icon trust signals with plain inline text

**Goal:** The `CheckCircle2` and `CreditCard` icon + text rows below CTAs are visual noise. Replace with clean `·`-separated inline text (dub.co pattern).

**Files:**
- Modify: `components/marketing/hero.tsx:107-121`

**Step 1: Replace the trust signals block**

Find this block (approximately lines 107–121):
```tsx
{/* Trust signals */}
<motion.div
  className="flex flex-col gap-2"
  initial={prefersReducedMotion ? {} : { opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.5, delay: 0.3 }}
>
  <p className="text-xs sm:text-sm text-muted-foreground flex items-center justify-center lg:justify-start gap-2 flex-wrap">
    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
    <span className="text-center lg:text-left">AHPRA-registered doctors &middot; Accepted by all employers</span>
  </p>
  <p className="text-xs text-muted-foreground flex items-center justify-center lg:justify-start gap-2 flex-wrap">
    <CreditCard className="h-3.5 w-3.5 text-muted-foreground/60 dark:text-muted-foreground shrink-0" />
    <span className="text-center lg:text-left">No account required &middot; Pay only if approved</span>
  </p>
</motion.div>
```

Replace with:
```tsx
{/* Trust signals */}
<motion.div
  initial={prefersReducedMotion ? {} : { opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.5, delay: 0.3 }}
>
  <p className="text-xs sm:text-sm text-muted-foreground text-center lg:text-left">
    AHPRA-registered doctors · Accepted by all employers · Pay only if approved
  </p>
</motion.div>
```

**Step 2: Remove unused imports**

Remove `CheckCircle2` and `CreditCard` from the import at the top of the file if no longer used elsewhere in the component.

**Step 3: Verify**

`pnpm dev` → visit `/` → trust signals should be one clean line of text, no icons.

**Step 4: Commit**

```bash
git add components/marketing/hero.tsx
git commit -m "ui: simplify hero trust signals — plain text, no icons"
```

---

## Task 3: Service Picker — Remove decorative template elements

**Goal:** Remove SparklesPremium badge, AnimatedText wavy underline, gradient accent bars on cards, and background blur blobs. Replace with clean section heading.

**Files:**
- Modify: `components/marketing/service-picker.tsx`

**Step 1: Remove the section header badge (SparklesPremium pill)**

Find and remove this block (~lines 110–118):
```tsx
<motion.div
  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 dark:bg-white/[0.06] border border-border/50 mb-6 cursor-default"
  whileHover={prefersReducedMotion ? undefined : { y: -2 }}
  transition={{ duration: 0.3, ease: "easeOut" }}
>
  <SparklesPremium className="w-4 h-4 text-foreground/40 dark:text-foreground/50" />
  <span className="text-xs font-medium text-foreground/60 dark:text-foreground/50">Pick what you need</span>
</motion.div>
```

**Step 2: Replace AnimatedText with plain h2**

Find:
```tsx
<div className="mb-4">
  <AnimatedText
    text="What are you here for?"
    textClassName="text-3xl sm:text-4xl lg:text-4xl font-bold text-foreground tracking-tight"
    underlineClassName="text-primary"
    underlinePath="M 0,10 Q 100,0 200,10 Q 300,20 400,10"
    underlineHoverPath="M 0,10 Q 100,20 200,10 Q 300,0 400,10"
    underlineDuration={1.2}
  />
</div>
```

Replace with:
```tsx
<h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-4">
  What do you need?
</h2>
```

**Step 3: Remove gradient accent bars on service cards**

Find and remove this line inside the card layout (~line 199):
```tsx
{/* Gradient accent bar */}
<div className={cn("h-1.5 w-full bg-gradient-to-r rounded-b-sm", colors.gradient)} />
```

**Step 4: Remove background blur blobs**

Find and remove (~lines 97–100):
```tsx
{/* Warm background accent */}
<div className="absolute inset-0 -z-10 overflow-hidden">
  <div className="absolute top-[50%] left-[-100px] w-[500px] h-[400px] bg-[#F0B4A0]/[0.06] dark:bg-[#F0B4A0]/[0.02] rounded-full blur-3xl" />
  <div className="absolute top-[20%] right-[-150px] w-[400px] h-[300px] bg-dawn-200/[0.08] dark:bg-dawn-400/[0.03] rounded-full blur-3xl" />
</div>
```

**Step 5: Remove unused imports**

Remove `SparklesPremium` from imports if unused elsewhere. Remove `AnimatedText` import.

**Step 6: Verify**

`pnpm dev` → visit `/` → scroll to service section. Cards should show without gradient stripe. Section header should be plain bold text. No decorative badge above it.

**Step 7: Commit**

```bash
git add components/marketing/service-picker.tsx
git commit -m "ui: service picker — remove badge, animated underline, gradient bars, blobs"
```

---

## Task 4: How It Works — Remove dotted grid, clean mockups, fix copy

**Goal:** Remove DottedGrid background, remove blink cursor animation from StepOneMockup, update Step 3 copy.

**Files:**
- Modify: `components/marketing/how-it-works.tsx`

**Step 1: Remove DottedGrid**

Find:
```tsx
<section id="how-it-works" className="relative py-20 lg:py-24 scroll-mt-20">
  <DottedGrid />
```

Replace with:
```tsx
<section id="how-it-works" className="py-20 lg:py-24 scroll-mt-20">
```

Remove `DottedGrid` import from the top of the file.

**Step 2: Remove blink cursor in StepOneMockup**

Find in `StepOneMockup` (~line 19):
```tsx
<span className="ml-0.5 w-px h-3.5 bg-primary animate-[blink_1s_ease-in-out_infinite]" />
```

Remove that line entirely. The field still shows text — the blinking cursor is the gimmicky part.

**Step 3: Update Step 3 title and description**

Find the `steps` array at the bottom of the file (~line 200):
```ts
{
  number: "3",
  title: "Sorted",
  description: "Certificate to your inbox, medication to your phone. All sorted.",
},
```

Replace with:
```ts
{
  number: "3",
  title: "Done.",
  description: "Certificate to your inbox. Prescription to your phone. All taken care of.",
},
```

**Step 4: Verify**

`pnpm dev` → scroll to how it works. No dot grid background. No blinking cursor in step 1 mockup. Step 3 reads "Done." not "Sorted".

**Step 5: Commit**

```bash
git add components/marketing/how-it-works.tsx
git commit -m "ui: how it works — remove dotted grid, blink cursor, fix step 3 copy"
```

---

## Task 5: Remove CheckoutActivityBadge (fake social proof in checkout)

**Goal:** Remove the `{count} others completed checkout in the last hour` badge from the payment summary step. It uses `Math.random()` — patients notice, and it destroys trust in a medical context.

**Files:**
- Modify: `components/intake/summary-payment.tsx:176`
- Delete: `components/marketing/social-proof-notifications.tsx`

**Step 1: Remove from summary-payment.tsx**

Open `components/intake/summary-payment.tsx`. Find (~line 13):
```tsx
import { CheckoutActivityBadge } from "@/components/marketing/social-proof-notifications"
```
Remove this import.

Find (~line 176):
```tsx
<CheckoutActivityBadge className="sm:hidden" />
```
Remove this line.

**Step 2: Delete the source file**

```bash
rm components/marketing/social-proof-notifications.tsx
```

**Step 3: Verify build**

```bash
pnpm typecheck
```
Expected: no errors related to `social-proof-notifications`.

**Step 4: Commit**

```bash
git add components/intake/summary-payment.tsx
git rm components/marketing/social-proof-notifications.tsx
git commit -m "ui: remove fake checkout activity badge — trust-destroying dark pattern"
```

---

## Task 6: Testimonials — Remove occupation display, improve 4 weakest testimonials

**Goal:** `role` shows occupation in testimonial cards (line 75 of `testimonials-columns-1.tsx`). Remove it from render. Also replace 4 testimonials that sound too polished or end in "Highly recommend!" style.

**Files:**
- Modify: `components/ui/testimonials-columns-1.tsx:16,75`
- Modify: `lib/data/testimonials.ts` (selected entries)
- Modify: `components/ui/testimonials-columns-wrapper.tsx:13`

**Step 1: Make `role` optional in types**

In `components/ui/testimonials-columns-1.tsx`, change:
```ts
type Testimonial = {
  text: string;
  image: string;
  name: string;
  role: string;
  verified?: boolean;
};
```
To:
```ts
type Testimonial = {
  text: string;
  image: string;
  name: string;
  role?: string;
  verified?: boolean;
};
```

In `components/ui/testimonials-columns-wrapper.tsx`, change:
```ts
type Testimonial = {
  text: string;
  image: string;
  name: string;
  role: string;
};
```
To:
```ts
type Testimonial = {
  text: string;
  image: string;
  name: string;
  role?: string;
};
```

**Step 2: Remove role from the rendered card**

In `components/ui/testimonials-columns-1.tsx`, find (~line 74-75):
```tsx
<div className="leading-4 opacity-60 dark:opacity-75 tracking-tight text-xs truncate">{role}</div>
```

Replace with:
```tsx
<div className="leading-4 opacity-60 dark:opacity-75 tracking-tight text-xs truncate">{name.split(" ")[1] ? `${name.split(",")[0].trim()}` : name}</div>
```

Wait — actually the `name` is already shown on the line above. The second line currently shows `role`. Remove it entirely:

```tsx
{/* role line removed — occupation signals fake testimonials */}
```

So the author section becomes just: avatar + name + verified badge. Clean.

**Step 3: Replace 4 testimonials that sound too polished**

In `lib/data/testimonials.ts`, find and replace these specific entries:

Find `id: "t3"`:
```ts
text: "The form was thorough, not just a rubber stamp. Felt properly medical.",
```
Replace with:
```ts
text: "I half expected a rubber stamp. It wasn't. The form asked real questions and a doctor actually engaged with my answers.",
```

Find `id: "t8"`:
```ts
text: "Missed an exam deadline. Sorted in under an hour. The doctor actually asked sensible questions.",
```
Replace with:
```ts
text: "Missed an exam, needed a cert for a special consideration. Was done before my next lecture. Doctor asked follow-up questions which felt legit.",
```

Find `id: "t10"`:
```ts
text: "Took about 2 hours not 1, but still faster than booking a GP. Would use again.",
```
Replace with:
```ts
text: "Took closer to two hours than one — but that's still less time than waiting at a GP walk-in. Got there in the end.",
```

Find `id: "t14"` (shift worker):
```ts
text: "Shift worker here. Being able to do this at 11pm when I felt sick was exactly what I needed.",
```
Replace with:
```ts
text: "Work shifts that don't line up with GP hours. Getting a cert at 11pm on a Wednesday is genuinely useful.",
```

**Step 4: Verify**

`pnpm dev` → scroll to testimonials section. No occupation shown under names. Testimonial copy reads like real people.

**Step 5: Commit**

```bash
git add components/ui/testimonials-columns-1.tsx components/ui/testimonials-columns-wrapper.tsx lib/data/testimonials.ts
git commit -m "ui: testimonials — remove occupation display, rewrite 4 entries for authenticity"
```

---

## Task 7: Patient Dashboard — Quieter status pills + better empty state

**Goal:** The filled rounded status badge on request cards (`px-3 py-1.5 rounded-full`) is loud. Reduce to a small left-border accent + quiet text. Also fix empty state copy if it's generic.

**Files:**
- Modify: `components/patient/panel-dashboard.tsx:463-466`

**Step 1: Replace status badge with quieter treatment**

Find in `IntakeCard` (~lines 462–466):
```tsx
<div className={cn("px-3 py-1.5 rounded-full flex items-center gap-1.5 text-sm font-medium", config.color)}>
  <Icon className="w-4 h-4" />
  {config.label}
</div>
```

Replace with:
```tsx
<div className={cn("flex items-center gap-1.5 text-xs font-medium", config.color)}>
  <Icon className="w-3 h-3" />
  {config.label}
</div>
```

This keeps status visible and colour-coded but removes the pill shape that makes it shout. The icon also shrinks from `w-4 h-4` to `w-3 h-3`.

**Step 2: Find and improve empty state copy**

Grep for the empty state text:
```bash
grep -n "empty\|Nothing\|no requests\|haven't" components/patient/panel-dashboard.tsx
```

If it uses a generic `<EmptyState>` component with a default message, find the prop and update it to:
```tsx
<EmptyState
  title="Nothing here yet"
  description="When you submit a request, it'll show up here."
/>
```
No illustration, no CTA button in empty state — just the two lines.

**Step 3: Verify**

`pnpm dev` → log in as test patient with no intakes → dashboard shows clean empty state. Patient with intakes shows quieter status indicators.

**Step 4: Commit**

```bash
git add components/patient/panel-dashboard.tsx
git commit -m "ui: patient dashboard — quieter status pills, cleaner empty state copy"
```

---

## Task 8: Doctor Portal — Solid approval/decline buttons + AI draft label

**Goal:** Ensure approve = solid green, decline = solid red. Add visible "AI draft — review before approving" label so it's clear the content is AI-generated.

**Files:**
- Modify: `components/doctor/review/intake-action-buttons.tsx` (check button variants)
- Modify: `components/doctor/draft-review-panel.tsx` (add AI label)

**Step 1: Check approval button variants**

Read `components/doctor/review/intake-action-buttons.tsx` and find the approve and decline buttons. If they use `variant="outline"`, change to solid:

Approve button should be:
```tsx
<Button variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white">
  Approve
</Button>
```

Decline button should be:
```tsx
<Button variant="destructive">
  Decline
</Button>
```

If they're already solid, no change needed.

**Step 2: Add AI draft label in DraftReviewPanel**

In `components/doctor/draft-review-panel.tsx`, find the card title for the draft panel (look for `CardTitle` or the heading of the draft section).

Add a visible label beneath or next to the heading:
```tsx
<div className="flex items-center gap-2 mb-1">
  <Bot className="w-4 h-4 text-muted-foreground" />
  <span className="text-xs text-muted-foreground font-medium">AI draft — review before approving</span>
</div>
```

`Bot` is already imported in this file.

**Step 3: Verify**

`pnpm dev` → log in as test doctor → open an intake → confirm Approve is green, Decline is red. AI draft panel has the label visible.

**Step 4: Commit**

```bash
git add components/doctor/review/intake-action-buttons.tsx components/doctor/draft-review-panel.tsx
git commit -m "ui: doctor portal — solid approve/decline buttons, AI draft label"
```

---

## Task 9: Final — Typecheck, lint, smoke test

**Step 1: Run type check**
```bash
pnpm typecheck
```
Expected: 0 errors.

**Step 2: Run lint**
```bash
pnpm lint
```
Expected: 0 errors.

**Step 3: Run unit tests**
```bash
pnpm test
```
Expected: all pass (268 tests).

**Step 4: Smoke test in browser**

Visit these routes and confirm no visual regressions:
- `/` — hero, service picker, how-it-works, testimonials
- `/request?service=med-cert` — intake flow, payment summary (no activity badge)
- `/patient` — dashboard empty state and/or request cards
- `/doctor` — queue and intake review panel (if test data available)

**Step 5: Final commit**

```bash
git commit -m "chore: post-refinement typecheck and lint pass"
```

---

## Summary of Changes

| Task | Files | Impact |
|------|-------|--------|
| 1 | `lib/marketing/homepage.ts` | Better hero copy |
| 2 | `components/marketing/hero.tsx` | Clean trust signals |
| 3 | `components/marketing/service-picker.tsx` | Remove 4 template decorations |
| 4 | `components/marketing/how-it-works.tsx` | Remove dotgrid, blink, fix copy |
| 5 | `components/intake/summary-payment.tsx`, delete `social-proof-notifications.tsx` | Remove dark pattern |
| 6 | `components/ui/testimonials-columns-1.tsx`, `testimonials-columns-wrapper.tsx`, `lib/data/testimonials.ts` | No occupation, better copy |
| 7 | `components/patient/panel-dashboard.tsx` | Quieter status, better empty state |
| 8 | `components/doctor/review/intake-action-buttons.tsx`, `draft-review-panel.tsx` | Solid buttons, AI label |
| 9 | — | Final verification |
