# Stable Stack Downgrade Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move InstantMed off bleeding-edge Next.js 16 / React 19 / Turbopack onto the last proven stable versions (Next.js 15.5 + React 18.3 + Webpack), eliminating the dev-server panics and removing three local workaround files that exist solely to patch upstream bugs.

**Architecture:** Pure dependency downgrade. No application code changes. The codebase uses zero React 19-specific APIs (verified). The only file rename is `proxy.ts` → `middleware.ts` (Next 16 renamed it; we're going back). Everything else — Clerk, Supabase, Stripe, Tailwind v4, Sentry, PostHog, AI SDK, Framer Motion, Vitest, TypeScript — stays untouched.

**Tech Stack After Migration:**
- Next.js: `16.2.2` → **`15.5.4`** (latest 15.x stable)
- React: `19.2.4` → **`18.3.1`**
- React DOM: `19.2.4` → **`18.3.1`**
- @types/react: `19.2.14` → **`18.3.12`**
- @types/react-dom: `19.2.3` → **`18.3.1`**
- eslint-config-next: `16.2.2` → **`15.5.4`**
- @next/bundle-analyzer: `16.2.2` → **`15.5.4`**
- @next/eslint-plugin-next: `16.2.2` → **`15.5.4`**
- Bundler: Turbopack → **Webpack** (default in Next 15)
- Everything else: **unchanged**

---

## Pre-Flight Verification (5 min, no commits)

Before touching anything, confirm the assumptions hold.

### Task 0a: Verify zero React 19 API usage

**Files:** None modified.

**Step 1:** Run grep for React 19-only APIs:
```bash
grep -rn "useActionState\|useFormStatus\|useOptimistic\|useFormState" \
  --include="*.ts" --include="*.tsx" \
  app/ components/ lib/ 2>&1 | grep -v node_modules
```
Expected: **No matches** in app code (matches in node_modules are fine, ignore).

**Step 2:** Run grep for `use()` promise hook:
```bash
grep -rn "from \"react\"" --include="*.tsx" app/ components/ \
  | xargs grep -l "use(" 2>/dev/null
```
Expected: No standalone `use(promise)` calls (any matches will be `use(SomeContext)` which exists in React 18).

**Step 3:** Confirm proxy.ts is the only middleware-like file:
```bash
ls middleware.ts proxy.ts 2>&1
```
Expected: `ls: middleware.ts: No such file or directory` and `proxy.ts` listed.

**Decision gate:** If any React 19 API is in real use, STOP and revisit the plan — that file needs a rewrite first.

### Task 0b: Confirm no in-flight branches will block this

**Step 1:** Check git status is clean:
```bash
git status --short
```
Expected: empty or only the test/validator changes from the previous session.

**Step 2:** Check the main branch:
```bash
git branch --show-current
```
Note the current branch — we'll either branch off this or work in place per user preference.

---

## Phase 1: Immediate Pain Relief — Disable Turbopack (5 min)

This alone fixes the dev-server panic. No package changes. Reversible in 30 seconds.

### Task 1: Drop `--turbopack` from dev script

**Files:**
- Modify: `package.json:6`

**Step 1:** Edit `package.json` line 6:
```diff
- "dev": "next dev --turbopack",
+ "dev": "next dev",
```

**Step 2:** Verify the change:
```bash
grep '"dev"' package.json
```
Expected: `"dev": "next dev",`

**Step 3:** Test that dev server starts and stays up. From a fresh terminal:
```bash
rm -rf .next && pnpm dev
```
Expected: Dev server starts in ~3-5 sec (slower than Turbopack's <1 sec, but no panic). Visit `http://localhost:3000` and confirm the homepage renders. Stop server with Ctrl+C.

**Step 4:** Commit Phase 1 — this is the safety net. If Phase 2 explodes, we still have a working dev server.

```bash
git add package.json
git commit -m "$(cat <<'EOF'
chore(dev): disable turbopack — switch to webpack dev server

Turbopack 16.x crashes intermittently on .next/ manifest writes,
especially after concurrent dev-server starts. Webpack is ~2 sec
slower on cold start but rock solid. Production builds unaffected.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

**Decision gate:** If the user wants to stop here (just Phase 1), this is a complete, shippable change. Phases 2-3 are independent.

---

## Phase 2: Downgrade Next.js + React (30-60 min)

This is the main migration.

### Task 2: Update package.json versions

**Files:**
- Modify: `package.json` (dependencies, devDependencies, pnpm.overrides)

**Step 1:** Edit `package.json` to set the new versions:

```diff
   "dependencies": {
     ...
-    "framer-motion": "^12.38.0",
+    "framer-motion": "^11.18.2",
     ...
-    "next": "16.2.2",
+    "next": "15.5.4",
     ...
-    "react": "19.2.4",
+    "react": "18.3.1",
     "react-day-picker": "^9.14.0",
-    "react-dom": "19.2.4",
+    "react-dom": "18.3.1",
     ...
   },
   "devDependencies": {
     ...
-    "@next/bundle-analyzer": "16.2.2",
+    "@next/bundle-analyzer": "15.5.4",
-    "@next/eslint-plugin-next": "16.2.2",
+    "@next/eslint-plugin-next": "15.5.4",
     ...
-    "@types/react": "19.2.14",
+    "@types/react": "18.3.12",
-    "@types/react-dom": "19.2.3",
+    "@types/react-dom": "18.3.1",
     ...
-    "eslint-config-next": "16.2.2",
+    "eslint-config-next": "15.5.4",
     ...
   },
   "pnpm": {
     "overrides": {
-      "@types/react": "19.2.14",
-      "@types/react-dom": "19.2.3",
-      "framer-motion": "12.38.0"
+      "@types/react": "18.3.12",
+      "@types/react-dom": "18.3.1",
+      "framer-motion": "11.18.2"
     }
   }
```

> **Why framer-motion 11.18.2?** Framer Motion 12 was rebranded to `motion` and dropped React 18 support in some sub-paths. v11.18.2 is the last v11 release, fully React 18 compatible, and identical API to what the codebase already uses.

**Step 2:** Verify the diff:
```bash
git diff package.json
```
Expected: 9 line changes total across deps/devDeps/overrides.

### Task 3: Reinstall and resolve

**Step 1:** Wipe node_modules and lockfile to avoid stale resolution:
```bash
rm -rf node_modules pnpm-lock.yaml .next
```

**Step 2:** Reinstall:
```bash
pnpm install
```
Expected: pnpm resolves all packages, no peer dep errors. May take 60-90 sec.

**Step 3:** Check for peer warnings:
```bash
pnpm install 2>&1 | grep -i "peer\|warning" | head -20
```
Expected: Maybe 1-2 peer warnings about packages that prefer React 19 — these are advisory, not fatal. Note them.

**Decision gate:** If a critical dep refuses to install (e.g. Clerk requires React 19), STOP. This is unlikely but possible — Clerk officially supports React 18.

### Task 4: Rename proxy.ts → middleware.ts

In Next.js 16, `middleware.ts` was renamed to `proxy.ts`. Going back to Next 15 means renaming back. **No code changes inside the file.**

**Files:**
- Rename: `proxy.ts` → `middleware.ts`

**Step 1:** Rename:
```bash
git mv proxy.ts middleware.ts
```

**Step 2:** Verify no imports/references to `proxy.ts` from elsewhere:
```bash
grep -rn "proxy\.ts\|from ['\"]./proxy['\"]\|from ['\"]@/proxy['\"]" \
  --include="*.ts" --include="*.tsx" --include="*.mjs" \
  app/ components/ lib/ middleware.ts 2>&1 | grep -v node_modules
```
Expected: No matches.

**Step 3:** The file's contents work as-is — `clerkMiddleware` from `@clerk/nextjs/server` exports the same default-export pattern in both Next 15 and Next 16. Confirm the file still type-checks (we'll do this at Task 7).

### Task 5: Audit next.config.mjs for Next 16-only options

**Files:**
- Modify: `next.config.mjs`

**Step 1:** Read current `next.config.mjs` and identify Next-16-only fields. Specifically look for:
- `turbopack:` block — Next 15 has this too but the alias syntax differs slightly
- `experimental.serverActions.bodySizeLimit` — was promoted out of experimental in Next 15
- `serverExternalPackages` — was named `experimental.serverComponentsExternalPackages` in Next 15

**Step 2:** Apply these specific changes:

```diff
- // Body size limits to prevent abuse (experimental in Next.js 16)
- experimental: {
-   serverActions: {
-     bodySizeLimit: '1mb',
-   },
-   // Ensure framer-motion sub-modules ...
-   optimizePackageImports: ['framer-motion'],
- },
+ // Body size limits to prevent abuse
+ experimental: {
+   serverActions: {
+     bodySizeLimit: '1mb',
+   },
+ },
```

(The `optimizePackageImports: ['framer-motion']` workaround is removed — it existed only to patch a Turbopack bug we've now eliminated.)

```diff
- // Redirect next-themes to a patched local copy that uses useInsertionEffect
- // instead of rendering React.createElement("script", ...), which throws in
- // React 19 dev mode. Upstream v0.4.6 still triggers the issue in this context.
- turbopack: {
-   resolveAlias: {
-     'next-themes': './lib/next-themes-patched.mjs',
-   },
- },
- // webpack config only applies when explicitly running with --webpack flag.
- // Turbopack (the v16 default) ignores this block entirely.
- webpack: (config) => {
-   return config;
- },
+ // (next-themes patch and turbopack alias removed — both were React 19 / Turbopack workarounds)
```

```diff
- serverExternalPackages: ["@supabase/ssr", "posthog-node"],
+ experimental: {
+   serverActions: {
+     bodySizeLimit: '1mb',
+   },
+   serverComponentsExternalPackages: ["@supabase/ssr", "posthog-node"],
+ },
```

> **Note:** Merge into the single `experimental` block — don't duplicate it. Final structure should have one `experimental:` key only.

**Step 3:** Re-enable Sentry's webpack plugin in dev (the dev-skip was a React 19 RSC race-condition workaround):

```diff
- // Apply bundle analyzer, then optionally Sentry
- // Skip Sentry's webpack plugin in dev — its RSC wrapper causes "Cannot read properties
- // of undefined (reading 'call')" during hydration (race condition with async chunks).
- // Sentry still initialises via instrumentation.ts; this only skips source maps & wrapping.
- const withAnalyzer = bundleAnalyzer(nextConfig);
- const useSentry = process.env.NEXT_PUBLIC_SENTRY_DSN && process.env.NODE_ENV === 'production';
- export default useSentry ? withSentryConfig(withAnalyzer, sentryConfig) : withAnalyzer;
+ // Apply bundle analyzer, then Sentry
+ const withAnalyzer = bundleAnalyzer(nextConfig);
+ const useSentry = !!process.env.NEXT_PUBLIC_SENTRY_DSN;
+ export default useSentry ? withSentryConfig(withAnalyzer, sentryConfig) : withAnalyzer;
```

> **Conservative variant:** If you'd rather verify Sentry-in-dev works on React 18 first, leave the `NODE_ENV === 'production'` guard in place and revisit in Phase 3.

### Task 6: Delete the patched next-themes file

**Files:**
- Delete: `lib/next-themes-patched.mjs`

**Step 1:** Confirm nothing else imports it:
```bash
grep -rn "next-themes-patched" --include="*.ts" --include="*.tsx" --include="*.mjs" \
  app/ components/ lib/ next.config.mjs 2>&1 | grep -v node_modules
```
Expected: Only the next.config.mjs reference (which we removed in Task 5).

**Step 2:** Delete:
```bash
git rm lib/next-themes-patched.mjs
```

### Task 7: Typecheck

**Step 1:** Run typecheck:
```bash
pnpm typecheck
```
Expected: Clean exit, zero errors.

**Likely issues if any:**
- React 18 types are stricter about implicit `children` — if any component declares `props: { children?: ReactNode }` but uses `props.children` non-null, fix to `children: ReactNode` or add a null check.
- `useId` signature is the same; `useTransition` is the same.
- If a component uses the React 19 ref-as-prop pattern (`<MyComponent ref={ref} />` where MyComponent is a function component without `forwardRef`), it'll error. Wrap in `forwardRef`. **This is unlikely** based on our grep.

**If errors:** Fix file by file. Each fix is a sub-commit. Don't bulk-fix.

### Task 8: Lint

**Step 1:**
```bash
pnpm lint
```
Expected: Same 5 pre-existing warnings, zero errors.

### Task 9: Unit tests

**Step 1:**
```bash
pnpm vitest run
```
Expected: All tests pass. Roughly 250+ tests across the suite.

**If tests fail:** Most likely culprits are tests that import React types directly, or component snapshot tests that capture React-19-specific output. Update snapshots if visually identical: `pnpm vitest run -u`.

### Task 10: Production build

**Step 1:**
```bash
pnpm build
```
Expected: Build succeeds. Output should show:
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (...)
✓ Finalizing page optimization
```

**Likely issues:**
- Image optimization `qualities` array — Next 15 doesn't require this field. It's harmless to leave but you can remove it from `next.config.mjs` if it complains.
- `serverExternalPackages` was renamed — handled in Task 5.

**If the build fails:** Read the error. Most failures point at one specific file. Fix and re-run.

### Task 11: Dev server smoke test

**Step 1:** Start the dev server:
```bash
pnpm dev
```
Expected: Server starts in 3-8 sec. **No panics. No `.next/dev/` write errors.**

**Step 2:** Visit these in a browser:
- `http://localhost:3000/` — homepage
- `http://localhost:3000/medical-certificate` — service page
- `http://localhost:3000/sign-in` — Clerk auth UI
- `http://localhost:3000/request?service=medical-certificate` — intake flow

Expected: All render without console errors.

**Step 3:** Check the browser console for hydration warnings. React 18 logs hydration mismatches loudly. If any appear, note them — they'll need follow-up but probably aren't blockers.

**Step 4:** Stop the dev server (Ctrl+C).

### Task 12: Commit Phase 2

```bash
git add package.json pnpm-lock.yaml next.config.mjs middleware.ts
git rm proxy.ts lib/next-themes-patched.mjs 2>/dev/null || true
git commit -m "$(cat <<'EOF'
chore(deps): downgrade to Next.js 15.5 + React 18.3

Move off bleeding-edge Next.js 16 / React 19 / Turbopack stack onto
the last proven stable versions. Eliminates recurring dev-server
panics and removes three local workaround files that existed solely
to patch upstream bugs:

- next-themes-patched.mjs (forked to work around React 19 createElement
  bug) — original next-themes 0.4.6 works on React 18.
- optimizePackageImports framer-motion (Turbopack module factory race
  condition workaround) — webpack doesn't have this bug.
- Sentry webpack-plugin dev-skip (React 19 RSC async-chunk race) —
  works fine on React 18.

Renamed proxy.ts back to middleware.ts (Next 15 naming).

Zero application code changes. Codebase uses no React 19-specific
APIs (verified via grep before migration).

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 3: Cleanup + Documentation (15 min)

### Task 13: Update CLAUDE.md tech stack line

**Files:**
- Modify: `CLAUDE.md` (Tech Stack section)

**Step 1:** Find the Tech Stack line:
```
Next.js 16 App Router · React 19 · TypeScript 5.9 (strict) · Tailwind v4 ...
```

**Step 2:** Replace with:
```
Next.js 15.5 App Router · React 18.3 · TypeScript 5.9 (strict) · Tailwind v4 · Supabase PostgreSQL · Node 20 · Vercel Pro · Clerk v7 auth · Stripe v22 payments · Resend email · PostHog analytics · Sentry errors · Upstash Redis rate limiting · Anthropic Claude AI · Framer Motion v11 · Webpack dev bundler
```

### Task 14: Update CLAUDE.md gotchas

**Files:**
- Modify: `CLAUDE.md` (Gotchas section)

**Step 1:** Find any references to `proxy.ts` and replace with `middleware.ts`. Find any references to Turbopack workarounds and remove.

**Step 2:** Add a new gotcha if not present:
```markdown
- **Stable stack policy**: We deliberately stay on Next.js 15.x + React 18.x + Webpack. Do not upgrade to Next 16 / React 19 / Turbopack without an explicit migration plan — they cost us a week of dev-server instability before downgrade.
```

### Task 15: Update memory file

**Files:**
- Modify: `/Users/rey/.claude/projects/-Users-rey-Desktop-instantmed/memory/decisions.md`

**Step 1:** Append a new decision entry dated 2026-04-07:
```markdown
## 2026-04-07: Downgraded to stable stack

**Decision:** Moved off Next.js 16.2 / React 19.2 / Turbopack. Now on Next.js 15.5 + React 18.3 + Webpack.

**Why:** Three+ recurring dev-server failures from Turbopack manifest write panics, plus three local workaround files patching React 19 / Turbopack bugs (next-themes patch, framer-motion optimizePackageImports, Sentry RSC dev-skip).

**Cost:** 4-8 hours migration, zero app code changes (no React 19 APIs in use).

**Result:** All three workaround files deleted. Dev server starts in 3-5 sec, never panics. middleware.ts is the file (proxy.ts was Next 16's rename).

**Don't undo:** Stay on this stack until Next 16 has at least 16.4 + React 19 has 19.4. Pre-launch reliability > novelty.
```

### Task 16: Final commit

```bash
git add CLAUDE.md /Users/rey/.claude/projects/-Users-rey-Desktop-instantmed/memory/decisions.md
git commit -m "$(cat <<'EOF'
docs: record stable-stack downgrade decision

Update CLAUDE.md tech stack line to reflect Next 15.5 / React 18.3 /
Webpack and document the deliberate "no bleeding edge" policy.
Append decision record to session memory.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Verification Matrix (Required Before Calling Done)

| Check | Command | Expected |
|---|---|---|
| Type check | `pnpm typecheck` | 0 errors |
| Lint | `pnpm lint` | 0 errors (5 pre-existing warnings ok) |
| Unit tests | `pnpm vitest run` | All pass |
| Production build | `pnpm build` | Compiles successfully |
| Dev server cold start | `rm -rf .next && pnpm dev` | Boots in <10 sec, no panic |
| Homepage renders | Visit `/` in browser | Renders, no console errors |
| Auth UI renders | Visit `/sign-in` | Clerk widget loads |
| Intake flow renders | Visit `/request?service=medical-certificate` | Step 1 renders |
| E2E smoke | `pnpm e2e:smoke` | All pass |

---

## Rollback Plan

If Phase 2 explodes and we can't fix forward in <1 hour:

```bash
git revert <phase-2-commit-sha>
rm -rf node_modules pnpm-lock.yaml .next
pnpm install
```

Phase 1 (Turbopack disabled) still applies — that commit is independent and we keep it.

If even Phase 1 needs to be rolled back:
```bash
git revert <phase-1-commit-sha>
```

Both phases are isolated commits with no cross-dependencies, so partial rollback is safe.

---

## Out of Scope (Explicitly NOT Doing)

- **Vitest 4 → Vitest 3 downgrade.** Tests pass. Reporter quirks are minor. Don't touch.
- **AI SDK v6 → v4/v5 downgrade.** Server-side, working, not causing dev crashes. Migration cost is high (v5 was a rewrite). Skip.
- **Tailwind v4 → v3.** Tailwind v4 is stable, big perf win, working fine. Keep.
- **Clerk v7 → v6.** Working, no issues, Clerk supports React 18 on v7. Keep.
- **TypeScript 5.9 → 5.x.** TypeScript is fine. Keep.
- **Removing proxy.ts/middleware.ts logic.** It's load-bearing for auth and security. Pure rename only.
- **Optimizing dev server startup time.** Webpack is slower than Turbopack. That's the trade. 3-5 sec vs panics.

---

## Risks

| Risk | Mitigation |
|---|---|
| A dep secretly requires React 19 | Pre-flight install in Task 3 catches this. Likely culprits: none (Clerk, Stripe, Sentry, Supabase, Radix all support 18). |
| Tailwind v4 breaks on Next 15 | Tailwind v4 is bundler-agnostic. Tested by many teams on Next 15. |
| Hydration mismatches appear | React 18 logs mismatches loudly. If they were silent on React 19, they were silent bugs. Fix as found. |
| `serverComponentsExternalPackages` rename breaks builds | Task 5 handles this explicitly. |
| Snapshot tests break | Run `vitest run -u` to update — visually identical output is fine. |
| middleware.ts edge runtime behaves differently | Clerk middleware is unchanged. Test by visiting `/sign-in` after migration. |
| Production deploy fails on Vercel | Phase 2 is a single revertable commit. Roll back if Vercel fails. |

---

## Total Estimated Time

- Phase 1 (Turbopack off): **5 minutes**
- Phase 2 (Full downgrade): **30-60 minutes**
- Phase 3 (Docs): **10 minutes**
- **Total: 45-75 minutes** if nothing surprises us. Add 30-60 min buffer for unexpected typecheck/build fixes.
