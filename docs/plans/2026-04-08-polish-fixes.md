# Polish Fixes — Post-Commit Audit

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix three post-commit gaps: missing doctor notification for date corrections, silent stale-queue cron, and scroll-reveal animations double-playing under React StrictMode.

**Architecture:** Targeted 1–3 line fixes per file. No new abstractions. WeakSet pattern for StrictMode-safe animations leverages React's guarantee that DOM nodes are preserved across StrictMode's simulated unmount→remount cycle.

**Tech Stack:** Next.js 15 server actions, Sentry, Telegram bot, Framer Motion `useInView`

---

## Status: COMPLETED 2026-04-08

All three fixes applied and typechecked clean.

---

## Fix 1 — Date Correction Notification Gap

**Problem:** `requestDateCorrection` server action had its Telegram alert removed in the PostHog refactor commit. Doctor no longer gets notified when a patient requests a date correction.

**Files modified:**
- `app/actions/request-date-correction.ts`

**Change:** Re-added `sendTelegramAlert` + `escapeMarkdownValue` import. After successful `intake_events` insert, fire-and-forget Telegram message with patient name, intake ref, requested date range, and reason.

---

## Fix 2 — Stale Queue Monitoring Gap

**Problem:** `app/api/cron/stale-queue/route.ts` previously sent a Telegram reminder to the doctor when intakes had been waiting 1h+. That was removed. The replacement (PostHog `queue_backup` metric) is passive — nobody is watching PostHog in real time. An SLA miss would go unnoticed until the doctor manually checked.

**Files modified:**
- `app/api/cron/stale-queue/route.ts`

**Change:** Added `Sentry.captureMessage()` alongside the PostHog metric when `totalStale > 0`. Severity: `warning` for 1–4 stale, `error` for 5+. Ops gets a Sentry alert in real time.

**Note:** The health-check cron (every 5min) already fires Sentry for 60min+ SLA breaches via `checkQueueHealthAndAlert()`. The stale-queue cron (every hour) covers the 2h+ window with a separate Sentry signal.

---

## Fix 3 — StrictMode Double-Animation

**Problem:** `reactStrictMode` was set to `false` in `next.config.mjs` to work around scroll-reveal animations playing twice in dev. Root cause: `useInView(ref, { once: true })` creates a fresh `IntersectionObserver` on each mount. StrictMode's simulated remount triggers it a second time.

**Why WeakSet works:** React 18 StrictMode preserves actual DOM nodes between its simulated unmount→remount cycle. A module-level `WeakSet<Element>` keyed on the DOM node survives the remount — once an element enters view and is added to the set, the second mount finds it there and starts the animation in `"visible"` state.

**Files modified:**
- `components/ui/blur-fade.tsx`
- `components/ui/morning/word-reveal.tsx`
- `components/ui/morning/clip-path-image.tsx`
- `next.config.mjs` — `reactStrictMode` restored to `true`

**Pattern applied to each component:**
```tsx
// Module-level — survives StrictMode remount
const _played = new WeakSet<Element>()

// In component render:
if (isInView && ref.current) _played.add(ref.current)
const alreadyPlayed = ref.current != null && _played.has(ref.current)

// In motion element:
initial={alreadyPlayed ? "visible" : "hidden"}
animate={alreadyPlayed || isInView ? "visible" : "hidden"}
```
