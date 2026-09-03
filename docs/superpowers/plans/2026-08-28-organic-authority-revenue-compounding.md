# Organic Authority Revenue Compounding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Increase free-channel paid orders and rolling net-retained revenue by fixing contradictory search signals, earning credible Australian authority, and deepening only existing pages that prove demand in closed measurement windows.

**Architecture:** Run one evidence loop: public truth and canonical integrity -> production crawl receipt -> one bounded distribution experiment -> closed-window paid-order readout -> one winner-only page session. Search Console and aggregate attribution identify demand; canonical payment truth and operating guardrails decide whether the next lever may start. No traffic metric, search impression, or external listing counts as revenue by itself.

**Tech Stack:** Next.js 15.5 App Router (Webpack), React 18, TypeScript 5.9, Vitest, existing Supabase payment truth, `classifyAttributionSource()`, the read-only Google Search Console audit, PostHog aggregate events, Vercel production receipts, and GitHub protected-branch pull requests.

**Spec:** [`docs/ROADMAP.md`](../../ROADMAP.md) ranks 1, 3, and 6; [`docs/REVENUE_MODEL.md`](../../REVENUE_MODEL.md); [`docs/BUSINESS_PLAN.md`](../../BUSINESS_PLAN.md); [`docs/ADVERTISING_COMPLIANCE.md`](../../ADVERTISING_COMPLIANCE.md); [`docs/SEO_CONTENT_POLICY.md`](../../SEO_CONTENT_POLICY.md); and the shipped experiment contract in [`docs/plans/2026-08-24-free-channel-compounding-and-repeat-rx-conversion.md`](../../plans/2026-08-24-free-channel-compounding-and-repeat-rx-conversion.md).

## Global Constraints

- `docs/ROADMAP.md` remains the only active queue. This plan elaborates rank 1 truth work, rank 3 distribution, and rank 6 compounding without reordering them.
- Use `corepack pnpm`. Do not change the pinned Next.js, React, Tailwind, Framer Motion, Node, or pnpm versions.
- Do not create a new public URL, city page, medication acquisition page, broad general-consult surface, content calendar, or speculative guide batch.
- Do not add testimonials, public rating/review counts, employer-acceptance claims, turnaround guarantees, broad-GP language, medicine names on paid destinations, or unsupported clinical/privacy comparisons.
- Use `getApprovedClaim()` for high-risk timing, privacy, clinical, refund, doctor, and document-scope copy. Do not hardcode near-duplicates.
- Load `instantmed-marketing-compliance-review` before signing off any public-copy diff and `instantmed-ui-browser-verification` before accepting browser proof.
- Never read, export, or persist patient free text. Measurement artifacts are aggregate-only and must not contain names, emails, phone numbers, intake IDs, prescription details, click IDs, or credentials.
- The acquisition leading metric is reportable paid orders by canonical source group and public landing pathname. The economic result is canonical rolling net-retained revenue. Do not allocate refund/dispute cash to a landing page unless the exact cash-event model supports that attribution.
- One on-site material variable may run in a measurement window. For 28 days after deployment, do not churn search signals or public surfaces touched by this candidate while waiting for Google to crawl and reprocess it. Safety, compliance, privacy, payment, and fulfilment fixes always proceed; log other overlapping changes as confounders and rebase only an affected page's observation window when they materially change its search signals.
- Search Console indexing requests, sitemap submissions, external pitches, profile creation, directory edits, customer communication, Ads changes, pull-request merge, and production promotion all require fresh approval for the exact action.
- Google Ads remains rank 4 and follows its immutable approval packet. This plan makes no campaign, keyword, budget, targeting, or asset mutation.
- Stop the next acquisition lever for any patient-safety event, work approaching the 24-hour ceiling, a service refund rate at or above 10%, a chargeback cluster, broken fulfilment, or support load above 5 contacts per 100 paid orders. Queue P95 remains visible under the 2026-08-18 owner decision; it is not silently converted into a new staffing project.
- If Vercel CLI is needed during the deployment task, update the global CLI to 59.9.1 or newer outside this repository first. Do not add or upgrade a Vercel package in `package.json` for this plan.

---

## Dated Evidence That Selects This Work

The 2026-05-26 to 2026-08-24 Search Console receipt showed:

- `/medical-certificate`: 11,175 impressions, 20 clicks, 0.18% CTR, average position 46.96.
- `/telehealth-australia`: 1,290 impressions and 11 clicks.
- `/pricing`: 1,175 impressions and 11 clicks.
- `/locations/brisbane`: 1,081 impressions and 3 clicks; `/locations/canberra`: 524 and 2; `/locations/sydney`: 20 and 1.
- `/prescriptions` was unknown to Google at inspection time. The answer-density session then shipped on 2026-08-25 in PR #496, so it needs a post-ship crawl and two closed windows, not another copy rewrite.
- Search Console cannot reveal the exact rendered sitelink labels or snippets. Those need desktop/mobile browser receipts after Google has crawled the deployed version.

The trailing 30-day payment-truth receipt ending 2026-08-24 recorded 41 AI-attributed paid orders and 27 organic-search paid orders. `/medical-certificate-online` had 21 free-channel paid orders; `/medical-certificate` had 5; `/prescriptions` had 4. These are dated selection facts, not forecasts. Re-pull them before any advance/hold/stop decision.

## Operating Cadence

| Window | Active work | Deliberately inactive |
|---|---|---|
| Days 0-5 | Truth contracts, copy/schema repair, city canonical consolidation, read-only measurement improvements, preview proof | New content and external sends |
| Days 5-33 | Deploy exact SHA, obtain crawl receipts, observe branded SERPs at day 7/14/28, run one approved employer-authority pitch | On-site copy/metadata churn |
| Days 34-60 | Read the distribution window and the two `/prescriptions` post-ship windows | A second prescriptions session or new URLs |
| Day 60+ | Select at most one existing order-proven page for one bounded session | Broad SEO backlog |

The weekly review is evidence collection, not a weekly change cadence.

---

### Task 1: Lock public city and telehealth truth with failing contracts

**Files:**

- Modify: `lib/__tests__/marketing-copy-contract.test.ts`
- Read for approved strings: `lib/marketing/approved-claims.ts`
- Covers: `app/locations/[city]/page.tsx`
- Covers: `components/marketing/location-page-content.tsx`
- Covers: `app/telehealth-australia/page.tsx`

- [ ] Add source fixtures for the three public surfaces near the other top-level fixtures:

```ts
const locationPageSource = readFileSync(
  join(root, "app/locations/[city]/page.tsx"),
  "utf8",
)
const locationContentSource = readFileSync(
  join(root, "components/marketing/location-page-content.tsx"),
  "utf8",
)
const telehealthAustraliaSource = readFileSync(
  join(root, "app/telehealth-australia/page.tsx"),
  "utf8",
)
```

- [ ] Add the regression contract:

```ts
it("keeps city and telehealth acquisition copy inside approved public truth", () => {
  const combined = [
    locationPageSource,
    locationContentSource,
    telehealthAustraliaSource,
  ].join("\n")

  expect(combined).not.toMatch(/within 45 minutes during business hours/i)
  expect(combined).not.toMatch(/join thousands/i)
  expect(combined).not.toMatch(/google star rating/i)
  expect(combined).not.toMatch(/outcomes are comparable to in-person care/i)
  expect(combined).not.toMatch(/sometimes superior/i)
  expect(combined).not.toMatch(/never shared with.*third party/i)
  expect(combined).not.toMatch(/discuss a symptom or get a treatment plan/i)
  expect(combined).not.toContain("No Medicare card is required")
  expect(combined).not.toContain("without booking an appointment or providing a Medicare card")
  expect(combined).not.toContain('medicalSpecialty: "General Practice"')
  expect(combined).not.toContain("doctor consultations")

  expect(locationPageSource).toContain(
    'getApprovedClaim("med_cert_document_scope")',
  )
  expect(locationPageSource).toContain(
    'getApprovedClaim("trust_doctor_issued_tooltip")',
  )
  expect(telehealthAustraliaSource).toContain(
    'getApprovedClaim("clinical_access_scope")',
  )
  expect(locationPageSource).toContain(
    'getApprovedClaim("prescribing_identity_required")',
  )
  expect(telehealthAustraliaSource).toContain(
    'getApprovedClaim("prescribing_identity_required")',
  )
  expect(locationPageSource).toContain(
    'getApprovedClaim("clinical_review_sequence")',
  )
})
```

- [ ] Run the focused test and confirm it fails on the current prohibited strings:

```bash
corepack pnpm exec vitest run lib/__tests__/marketing-copy-contract.test.ts
```

Expected: FAIL with at least the 45-minute, privacy-absolute, outcome-comparison, broad-consult, and fabricated-social-proof assertions.

- [ ] Do not weaken the regexes to make the current copy pass.

### Task 2: Replace the contradictory copy and schema with code-owned truth

**Files:**

- Modify: `app/locations/[city]/page.tsx`
- Modify: `components/marketing/location-page-content.tsx`
- Modify: `app/telehealth-australia/page.tsx`
- Verify: `lib/__tests__/marketing-copy-contract.test.ts`
- Verify: `lib/__tests__/hours-copy-contract.test.ts`
- Verify: `lib/__tests__/approved-claims-contract.test.ts`

- [ ] In `app/locations/[city]/page.tsx`, bind the existing registry at module scope:

```ts
const AVAILABILITY = getApprovedClaim("availability_24_7")
const CERTIFICATE_SCOPE = getApprovedClaim("med_cert_document_scope")
const EMPLOYER_POLICY_CAVEAT = getApprovedClaim("trust_doctor_issued_tooltip")
const PRESCRIBING_IDENTITY_REQUIRED = getApprovedClaim("prescribing_identity_required")
const CLINICAL_REVIEW_SEQUENCE = getApprovedClaim("clinical_review_sequence")
```

- [ ] Replace every employer-acceptance yes/no answer with document scope plus the policy caveat. Keep the answer conditional on issue; do not say an employer must accept it.

```ts
answer: `${CERTIFICATE_SCOPE} ${EMPLOYER_POLICY_CAVEAT}`,
```

- [ ] Replace the 45-minute/business-hours answer with the approved availability string and conditional delivery:

```ts
answer: `${AVAILABILITY} If approved, the certificate is emailed as a PDF.`,
```

- [ ] Replace the Victoria “No Medicare card is required” answer with `PRESCRIBING_IDENTITY_REQUIRED`. Preserve the approved prescribing-identity alternative: a valid Medicare number plus IRN **or** a valid IHI. Do not imply prescribing or specialty requests can proceed without their required identity details.

- [ ] Narrow the city `Service` schema description to active service-level scope:

```ts
description: `Online medical-certificate requests and repeat medication reviews for ${cityData.name} residents. ${CLINICAL_REVIEW_SEQUENCE}`,
```

- [ ] In `components/marketing/location-page-content.tsx`, remove the “Google star rating” and “Join thousands” strings. Use no replacement count, rating, testimonial, or popularity claim.

- [ ] In `app/telehealth-australia/page.tsx`, bind the approved access claim:

```ts
const CLINICAL_ACCESS_SCOPE = getApprovedClaim("clinical_access_scope")
const AVAILABILITY = getApprovedClaim("availability_24_7")
const PRESCRIBING_IDENTITY_REQUIRED = getApprovedClaim("prescribing_identity_required")
```

- [ ] Replace the clinical-outcomes comparison with a suitability boundary:

```ts
answer:
  "Telehealth suitability depends on what the request needs. Urgent symptoms, a required physical examination, or ongoing complex care need an in-person service. A remote request may fit when the relevant history and safe follow-up can be handled without an examination.",
```

- [ ] Replace the privacy absolute with the code-owned access scope and a `/privacy` link in rendered HTML. Do not claim data is never disclosed to any third party.

- [ ] Replace “without ... providing a Medicare card” with `PRESCRIBING_IDENTITY_REQUIRED`, preserving the Medicare plus IRN **or** valid IHI identity alternative. Do not imply prescribing or specialty requests can proceed without the required identity details.

- [ ] Remove `medicalSpecialty: "General Practice"`, `isAcceptingNewPatients: true`, generic “consultations,” and “Discuss a symptom or get a treatment plan” from the schema and body. Describe only medical certificates, repeat prescription reviews, and the launched specialty assessment pathways. Use `AVAILABILITY` for the opening-hours description.

- [ ] Run the focused public-copy suite:

```bash
corepack pnpm exec vitest run \
  lib/__tests__/marketing-copy-contract.test.ts \
  lib/__tests__/hours-copy-contract.test.ts \
  lib/__tests__/approved-claims-contract.test.ts
```

Expected: PASS.

- [ ] Run lint for the touched files:

```bash
corepack pnpm exec eslint \
  'app/locations/[city]/page.tsx' \
  components/marketing/location-page-content.tsx \
  app/telehealth-australia/page.tsx \
  lib/marketing/approved-claims.ts \
  lib/__tests__/marketing-copy-contract.test.ts
```

Expected: PASS with zero warnings.

- [ ] Commit the bounded truth repair:

```bash
git add 'app/locations/[city]/page.tsx' \
  components/marketing/location-page-content.tsx \
  app/telehealth-australia/page.tsx \
  lib/marketing/approved-claims.ts \
  lib/__tests__/marketing-copy-contract.test.ts
git commit -m "fix(marketing): align city and telehealth search copy"
```

### Task 3: Consolidate indexed city duplicates without destroying proven local demand

**Files:**

- Modify: `lib/__tests__/seo-indexing-contract.test.ts`
- Modify: `lib/__tests__/commercial-seo-contract.test.ts`
- Modify: `next.config.mjs`
- Modify: `lib/seo/intents.ts`
- Modify: `app/intent/page.tsx`
- Modify: `app/intent/[slug]/page.tsx`
- Modify: `app/sitemap-html/page.tsx`
- Verify: `app/sitemap.ts`
- Verify: `app/locations/sitemap.ts`
- Verify: `lib/seo/sitemap-lastmod.ts`
- Verify: `lib/seo/index-policy.ts`

Canonical ownership for this task:

```text
/locations/{sydney,melbourne,brisbane,perth,adelaide,canberra,newcastle}
/medical-certificate/{parramatta,hobart,darwin}
/medical-certificate/gold-coast -> /medical-certificate
/intent/medical-certificate-online-sydney -> /locations/sydney
/intent/medical-certificate-online-melbourne -> /locations/melbourne
/intent/medical-certificate-online-brisbane -> /locations/brisbane
/intent/medical-certificate-online-perth -> /locations/perth
/intent/medical-certificate-online-adelaide -> /locations/adelaide
/intent/medical-certificate-online-gold-coast -> /medical-certificate
```

Newcastle remains in the location keep-set. Gold Coast remains iceboxed; this task must not manufacture a new indexed Gold Coast winner.

- [ ] Replace the Canberra-only redirect contract and the stale commercial-city contract with a table-driven resolved-owner contract:

```ts
it("gives each indexed city pair one resolved canonical owner", async () => {
  const { default: nextConfig } = await import("../../next.config.mjs")
  const redirects = await nextConfig.redirects?.()
  const redirectBySource = new Map(
    (redirects ?? []).map((redirect) => [redirect.source, redirect]),
  )
  const sitemap = read("app/sitemap.ts")
  const locationPolicy = read("lib/seo/index-policy.ts")
  const medCertLocationBlock = sitemap.match(
    /const medCertLocationSlugs = \[([\s\S]*?)\]/,
  )?.[1]

  for (const city of [
    "sydney",
    "melbourne",
    "brisbane",
    "perth",
    "adelaide",
    "canberra",
  ]) {
    expect(redirectBySource.get(`/medical-certificate/${city}`)).toMatchObject({
      destination: `/locations/${city}`,
      permanent: true,
    })
    expect(medCertLocationBlock).not.toContain(`"${city}"`)
    expect(locationPolicy).toContain(`"${city}"`)
  }

  for (const city of [
    "sydney",
    "melbourne",
    "brisbane",
    "perth",
    "adelaide",
  ]) {
    expect(
      redirectBySource.get(`/intent/medical-certificate-online-${city}`),
    ).toMatchObject({
      destination: `/locations/${city}`,
      permanent: true,
    })
  }

  for (const city of ["parramatta", "hobart", "darwin"]) {
    expect(medCertLocationBlock).toContain(`"${city}"`)
  }

  expect(redirectBySource.get("/medical-certificate/gold-coast")).toMatchObject({
    destination: "/medical-certificate",
    permanent: true,
  })
  expect(
    redirectBySource.get("/intent/medical-certificate-online-gold-coast"),
  ).toMatchObject({
    destination: "/medical-certificate",
    permanent: true,
  })
  expect(
    (redirects ?? []).some(
      (redirect) => redirect.destination === "/intent/medical-certificate-online-:city",
    ),
  ).toBe(false)
})
```

- [ ] Update `lib/__tests__/commercial-seo-contract.test.ts` so it no longer pins the grouped redirect to `/intent/*`. It must assert the same final owners and continue asserting that the duplicate city URLs are absent from the root sitemap.

- [ ] Run the contracts and confirm they fail on the existing grouped redirect plus the missing resolved destinations:

```bash
corepack pnpm exec vitest run \
  lib/__tests__/seo-indexing-contract.test.ts \
  lib/__tests__/commercial-seo-contract.test.ts
```

Expected: FAIL.

- [ ] Remove the existing grouped redirect from `/medical-certificate/:city(...)` to `/intent/medical-certificate-online-:city`. Add exact permanent redirects for both legacy source families to the selected `/locations/*` owner. Move Canberra into the same exact map and remove its later duplicate redirect entry. Route both Gold Coast legacy URLs to `/medical-certificate` so the iceboxed city does not become a new indexed winner.

- [ ] Treat each `permanent: true` redirect above as an HTTP 308 permanent redirect, not a 301. Assert the final 308 owner for every paired source.

- [ ] Prune the six redirected city intent entries — Sydney, Melbourne, Brisbane, Perth, Adelaide, and Gold Coast — from `lib/seo/intents.ts`; retain Newcastle. Update the exact intent-count contracts and the intent-hub language to describe the remaining intent catalogue accurately. Verify the intent hub, `generateStaticParams`, the intent sitemap, and the HTML sitemap emit no internal link to any redirected `/intent/medical-certificate-online-*` source.

- [ ] Keep `app/sitemap.ts` ownership unchanged: only `parramatta`, `hobart`, and `darwin` belong to the medical-certificate location block.

- [ ] Keep `app/locations/sitemap.ts` filtered through `shouldIndexLocation()` and keep Newcastle plus the six selected metros in `KEEP_INDEXED_LOCATIONS`.

- [ ] Refresh the baked sitemap dates honestly after each material route change: `lib/seo/sitemap-lastmod.ts` owns per-route dates and `app/locations/sitemap.ts` owns its enriched location date. Derive each refresh from the route's material change, not deployment time; deployment does not refresh baked `lastmod` values.

- [ ] Run the focused SEO and route checks:

```bash
corepack pnpm exec vitest run lib/__tests__/seo-indexing-contract.test.ts
corepack pnpm exec vitest run lib/__tests__/commercial-seo-contract.test.ts
bash scripts/check-route-conflicts.sh
```

Expected: PASS; one sitemap owner and one HTTP 308 destination per paired city, with no internal links to redirected intent sources and honest baked `lastmod` owners checked.

- [ ] Commit:

```bash
git add next.config.mjs \
  lib/seo/intents.ts \
  app/intent/page.tsx \
  'app/intent/[slug]/page.tsx' \
  app/sitemap-html/page.tsx \
  lib/seo/sitemap-lastmod.ts \
  app/locations/sitemap.ts \
  lib/__tests__/seo-indexing-contract.test.ts \
  lib/__tests__/commercial-seo-contract.test.ts
git commit -m "fix(seo): consolidate indexed city canonicals"
```

### Task 4: Make the Search Console audit expose redacted branded landing-page drift

**Files:**

- Modify: `tools/gsc-mcp-server/gsc-index-audit.mjs`
- Modify: `lib/__tests__/seo-indexing-contract.test.ts`

This remains read-only. It cannot reveal Google’s rendered sitelink labels or snippet text; it exposes which site pages receive aggregated branded-query impressions/clicks and whether priority URLs have been crawled. Exact query text must never be serialized.

- [ ] Add the failing contract:

```ts
it("reports redacted branded landing pages without adding an indexing mutation", () => {
  const auditScript = read("tools/gsc-mcp-server/gsc-index-audit.mjs")

  expect(auditScript).toContain("getBrandedLandingPages")
  expect(auditScript).toContain('dimensions: ["query", "page"]')
  expect(auditScript).toContain("isBrandedQuery")
  expect(auditScript).toContain("PUBLIC_SITE_HOSTS")
  expect(auditScript).toContain("NON_PUBLIC_PAGE_PREFIXES")
  expect(auditScript).toContain("UUID_PATH_SEGMENT_RE")
  expect(auditScript).toContain('normalizedPath.startsWith("/verify/")')
  expect(auditScript).toContain("brandedLandingPages")
  expect(auditScript).not.toContain("query: row.keys")
  expect(auditScript).not.toContain("indexing.urlNotifications.publish")
})
```

- [ ] Run it and confirm it fails:

```bash
corepack pnpm exec vitest run lib/__tests__/seo-indexing-contract.test.ts
```

- [ ] Add token-aware brand matching, fail-closed public-page canonicalization,
  and a query/page read. Accept only the apex and `www` HTTP(S) hosts, merge
  trailing-slash/root aliases, reject capability/private/UUID-bearing paths,
  and collapse every `/verify/*` credential path to `/verify` before
  aggregation:

```js
const PUBLIC_SITE_HOSTS = new Set(["instantmed.com.au", "www.instantmed.com.au"])
const NON_PUBLIC_PAGE_PREFIXES = [
  "/account", "/admin", "/auth", "/dashboard", "/doctor", "/patient",
  "/resume", "/sign-in", "/sign-up", "/track",
]
const UUID_PATH_SEGMENT_RE = /\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?:\/|$)/i

function isBrandedQuery(value) {
  const tokens = value.toLowerCase().match(/[a-z0-9]+/g) ?? []

  return tokens.some(
    (token, index) =>
      token === "instantmed" ||
      (token === "instant" && tokens[index + 1] === "med"),
  )
}

function isNonPublicPagePath(pathname) {
  return NON_PUBLIC_PAGE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  ) || UUID_PATH_SEGMENT_RE.test(pathname)
}

function publicPage(value) {
  try {
    const url = new URL(value)
    if (
      !PUBLIC_SITE_HOSTS.has(url.hostname) ||
      (url.protocol !== "http:" && url.protocol !== "https:")
    ) return null
    const normalizedPath = url.pathname.replace(/\/+$/, "") || "/"
    if (isNonPublicPagePath(normalizedPath)) return null
    const path = normalizedPath === "/verify" || normalizedPath.startsWith("/verify/")
      ? "/verify"
      : normalizedPath

    return { path, url: `${SITE_ORIGIN}${path}` }
  } catch {
    return null
  }
}

function publicPagePath(value) {
  return publicPage(value)?.path ?? null
}

async function getBrandedLandingPages(searchconsole, startDate, endDate) {
  const response = await searchconsole.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody: {
      startDate,
      endDate,
      dimensions: ["query", "page"],
      rowLimit: 25000,
      dataState: "final",
    },
  })

  const pages = new Map()
  for (const row of response.data.rows ?? []) {
    if (!isBrandedQuery(row.keys?.[0] ?? "")) continue
    const page = publicPagePath(row.keys?.[1] ?? "")
    if (!page) continue
    const current = pages.get(page) ?? { page, clicks: 0, impressions: 0 }
    current.clicks += row.clicks ?? 0
    current.impressions += row.impressions ?? 0
    pages.set(page, current)
  }

  return [...pages.values()]
    .map((row) => ({
      ...row,
      ctr: row.impressions > 0 ? row.clicks / row.impressions : 0,
    }))
    .sort((left, right) => right.clicks - left.clicks || right.impressions - left.impressions)
}
```

- [ ] Fetch it alongside page performance and write only the aggregate rows to
  `report.brandedLandingPages`. Contract-test generic `instant medical...`
  false positives, external/staging/non-HTTP hosts, query/fragment stripping,
  root/trailing-slash merging, capability/private/UUID rejection, and
  `/verify/*` credential redaction. Do not write exact Search Console query
  strings, even when they contain the brand token.

- [ ] Preserve the `webmasters.readonly` scope and absence of `urlNotifications.publish` or any submit script.

- [ ] Run:

```bash
corepack pnpm exec vitest run lib/__tests__/seo-indexing-contract.test.ts
corepack pnpm seo:gsc-index-audit -- --inspect-limit=1
```

Expected: tests PASS; the live command returns JSON with `brandedLandingPages`, no exact query strings, and no mutation receipt.

- [ ] Commit:

```bash
git add tools/gsc-mcp-server/gsc-index-audit.mjs lib/__tests__/seo-indexing-contract.test.ts
git commit -m "feat(seo): report branded Search Console landings"
```

### Task 5: Add a PHI-safe free-channel paid-order breakdown to the existing growth audit

**Files:**

- Modify: `lib/data/customer-growth-baseline.ts`
- Create: `lib/data/customer-growth-revenue-read.ts`
- Modify: `scripts/customer-growth-baseline.ts`
- Modify: `lib/__tests__/customer-growth-baseline.test.ts`

Do not invent landing-page revenue. This task reports paid-order counts by source group and public pathname; total net-retained revenue remains the canonical economic read.

- [ ] Add `lib/data/customer-growth-revenue-read.ts` as the single audit reader for canonical revenue evidence. Read reportable paid orders by `paid_at`, exact live-AUD refund debit/reversal movements from `stripe_refund_cash_movements`, refund-ledger health, and live-AUD dispute withdrawals/reinstatements from `stripe_disputes`. Do not use cumulative `intakes.refund_amount_cents` or `refunded_at` snapshots as window cash events.

- [ ] Fail closed when a revenue query fails, exact row counts are missing, a count exceeds the fetched rows/5,000-row bound, a refund movement is incomplete, or refund-ledger health reports conflicting, unlinked, unsupported-currency, unknown-mode, or otherwise incomplete evidence. Never silently calculate from truncated rows.

- [ ] Reduce that evidence through `buildNetRetainedPurchaseValue()`: purchases enter at `paid_at`; refund debits and reversals use their exact balance-transaction times; dispute withdrawals and reinstatements use their durable cash-event times. Cap the combined outstanding refund and dispute loss at the captured order amount so one payment cannot be removed twice.

- [ ] Apply the canonical reportable-intake and seeded-E2E exclusions to paid orders and every linked refund/dispute row before aggregation. Test-mode or excluded evidence must not satisfy production revenue health.

- [ ] Build the free-channel paid-order breakdown from the canonical attribution classifier for `organic_nonbrand`, `organic_brand`, `ai_referral`, and `referral`. Accept only HTTP(S) landings on `instantmed.com.au` or `www.instantmed.com.au`; emit the canonical pathname with query, fragment, credentials, and non-root trailing slashes removed, and collapse external, malformed, or unsafe values to `/unknown`.

- [ ] Add only `freeChannelLandingPages: FreeChannelLandingRow[]` to `CustomerGrowthSupabaseBaseline`; never persist raw attribution rows, referrers, query strings, click IDs, payment IDs, patient IDs, or credentials. Keep `assertNoSensitiveBaselineText()` on every generated artifact.

- [ ] Derive recovery orders with the same canonical `recovery_email` classifier and calculate recovery gross/net revenue from the same exact cash-event evidence. Include later in-window refund or dispute losses/reinstatements linked to older recovery orders even when their original payment predates the window; attribution time must not hide a current cash loss.

- [ ] Count abandoned-checkout delivery only from `email_outbox` rows whose status is exactly `sent`. Do not count queued, failed, or `skipped_e2e` rows as delivered recovery emails.

- [ ] State beside the free-channel table that paid-order counts are acquisition evidence and total rolling net-retained revenue is the economic result. Keep revenue unallocated to individual landing pages.

- [ ] Cover canonical public-path grouping/redaction, exact AUD refund/dispute math, double-loss capping, refund reversals, dispute reinstatements, incomplete/truncated evidence fail-closed behavior, reportable/seed exclusions, older recovery-order cash events, sent-only abandoned-checkout delivery, and sensitive-output rejection in the focused tests.

- [ ] Run:

```bash
corepack pnpm exec vitest run \
  lib/__tests__/customer-growth-baseline.test.ts \
  lib/__tests__/attribution-source-classification.test.ts \
  lib/__tests__/net-retained-purchase-value.test.ts \
  lib/__tests__/revenue-dashboard.test.ts
corepack pnpm audit:customer-growth -- --days 30 --out-dir output/revenue-compounding/pre-deploy
```

Expected: PASS; aggregate output only; no patient, payment, click, or credential identifiers.

- [ ] Commit:

```bash
git add lib/data/customer-growth-baseline.ts \
  lib/data/customer-growth-revenue-read.ts \
  scripts/customer-growth-baseline.ts \
  lib/__tests__/customer-growth-baseline.test.ts
git commit -m "feat(growth): report free-channel paid landings"
```

### Task 6: Verify the complete candidate before any production action

**Files:**

- Verify: all files changed in Tasks 1-5
- Evidence only: `output/revenue-compounding/pre-deploy/`

- [x] Run the focused contract set:

```bash
corepack pnpm exec vitest run \
  lib/__tests__/marketing-copy-contract.test.ts \
  lib/__tests__/hours-copy-contract.test.ts \
  lib/__tests__/approved-claims-contract.test.ts \
  lib/__tests__/seo-indexing-contract.test.ts \
  lib/__tests__/commercial-seo-contract.test.ts \
  lib/__tests__/customer-growth-baseline.test.ts \
  lib/__tests__/attribution-source-classification.test.ts \
  lib/__tests__/net-retained-purchase-value.test.ts \
  lib/__tests__/revenue-dashboard.test.ts
```

- [x] Run documentation and route checks:

```bash
corepack pnpm doc:audit
bash scripts/check-route-conflicts.sh
```

- [x] Run repository gates:

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test run
SENTRY_AUTH_TOKEN= corepack pnpm build
git diff --check
```

Expected: every command PASS. A green focused suite without the full unit/build receipt is not release proof.

Authenticated Sentry release/source-map uploads are authorised only in deployment or CI. Local candidate builds must clear `SENTRY_AUTH_TOKEN` as above so verification cannot create external release artifacts.

- [x] Confirm `lib/seo/sitemap-lastmod.ts` and `app/locations/sitemap.ts` have an explicit, honest `lastmod` refresh for every materially changed route. Record the route/date evidence with the candidate receipt; do not treat deployment as a `lastmod` refresh.

- [x] Start the approved InstantMed dev server on port 3060 and inspect at 1440x900 and 390x844:

```bash
corepack pnpm dev
```

- [x] Browser-verify `/`, `/medical-certificate`, `/locations/canberra`, `/locations/brisbane`, `/telehealth-australia`, and `/prescriptions` for rendered copy, canonical, JSON-LD, footer `data-nosnippet`, links, mobile overflow, console errors, and failed network requests.

- [x] Verify HTTP 308 redirect responses for all six paired city routes and Gold Coast against the candidate server, and confirm the intent hub, static params, intent sitemap, and HTML sitemap contain no links to the redirect sources.

- [x] Record the exact candidate SHA and test receipts in this plan’s execution log. Do not claim production proof.

### Task 7: Open the protected-branch PR and stop at the production approval gate

**Files:**

- No additional product files unless verification finds a defect
- Update after approval/merge: this plan’s execution log

- [ ] Confirm the worktree contains no unrelated staged files and leave the existing `output/` evidence untracked:

```bash
git status --short
git diff --cached --stat
```

- [ ] Push the `codex/` branch and open a draft PR. The PR body must include Problem, Changes, Verification, Risk/Rollback, Compliance/Privacy impact, and Env/Migration changes.

- [ ] Keep the PR draft until hosted checks pass. Do not mark ready based only on local tests.

- [ ] The candidate starts from current `main`; record the candidate bundle/SHA for comparison but do not prescribe historical branch SHAs as ancestors or claim that an individual commit caused a Google result.

- [ ] Present the exact PR, candidate SHA, hosted checks, and rollback (`revert` the merge plus preserve permanent redirects if already crawled) for fresh operator approval.

- [ ] Stop. Do not merge or promote production without that approval.

- [ ] After approval, merge through the protected branch and verify the exact SHA deployed. Do not infer production from a green PR.

- [ ] Commit only the aggregate deployment receipt update:

```bash
git add docs/superpowers/plans/2026-08-28-organic-authority-revenue-compounding.md
git commit -m "docs(growth): record search candidate deployment"
```

### Task 8: Obtain one crawl receipt, then hold on-site changes for 28 days

**External mutation gate:** Search Console actions require fresh approval immediately before use.

- [ ] Verify production raw HTML and browser rendering first for `/` and `/medical-certificate`: title, description, canonical, intended internal links, and `footer[data-nosnippet]`.

- [ ] Preserve the frozen 2026-05-26 to 2026-08-24 data as the pre-deploy baseline only:

```bash
corepack pnpm seo:gsc-index-audit -- \
  --start-date=2026-05-26 \
  --end-date=2026-08-24 \
  > output/revenue-compounding/pre-deploy-gsc-baseline.json
```

- [ ] At each day 7, 14, and 28 checkpoint, run a new read-only audit whose `--start-date` is the exact production deployment date recorded in Task 7 and whose `--end-date` is the latest Search Console final-data date. Save each aggregate result separately at candidate bundle/SHA level. Do not relabel the frozen baseline as post-deploy evidence or attribute a Google result to an individual commit.

- [ ] In Search Console, use **Test live URL** and then request indexing once for the homepage and `/medical-certificate`. Resubmit the existing sitemap once only if the live `lastmod` values are correct. Do not use Removals and do not repeatedly request indexing.

- [ ] Record the URL Inspection verdict, user canonical, Google canonical, and `lastCrawlTime` for `/`, `/medical-certificate`, `/prescriptions`, `/pricing`, `/how-it-works`, `/verify`, and `/contact`.

- [ ] At days 7, 14, and 28, capture desktop and mobile Google results for `instantmed` and `instant med`. Record the snippet and sitelink labels exactly; Search Console does not provide these fields.

- [ ] Do not judge the branch until URL Inspection shows a successful post-deployment crawl. If no post-deploy crawl exists, hold.

- [ ] At day 28, apply this candidate bundle/SHA-level decision. Consider logged confounders: safety, compliance, privacy, payment, and fulfilment fixes proceed; other overlapping changes rebase only the materially affected page's search observation window.

```text
ADVANCE: post-deploy crawl confirmed and the boilerplate snippet/unhelpful sitelink pattern is materially reduced.
HOLD: Google has not recrawled or is still reprocessing; make no second change.
REVISE: post-deploy crawl confirmed, 28 days elapsed, and the same defect persists; identify one exact remaining source before proposing one correction.
```

- [ ] A location page with real non-brand demand does not become `noindex` solely because Google once used it as a branded sitelink. A noindex/redirect proposal requires two fresh closed windows with no useful non-brand demand and a separate reviewed change.

### Task 9: Run one employer-authority distribution experiment, not an outreach campaign

**Files:**

- Read: `docs/audits/2026-06-06-authority-distribution-execution.md`
- Read: `docs/plans/2026-07-30-p0-1-outreach-drafts.md`
- Read: `lib/marketing/approved-claims.ts`
- Update after execution: this plan’s execution log only

Fresh research on 2026-08-28 confirms the Australian HR Institute still publishes workplace resources and HRM contributor guidance, while SourceBottle still offers source call-outs and expert profiles. The first experiment is one HRM/AHRI employer-evidence pitch; SourceBottle remains a separately approved follow-up, not a simultaneous second channel.

- [ ] Re-open the current [AHRI resources page](https://www.ahri.com.au/resources) and current HRM contributor guidance on the day of execution. Verify the active editorial route and requirements; do not rely on a stale email address from an old PDF.

- [ ] Prepare one short editorial pitch around a neutral employer question: how to verify an online medical certificate without requesting a diagnosis. Ground it in `/resources/online-medical-certificate-verification`, `/resources/medical-certificate-employer-policy`, Fair Work public guidance, and the code-owned employer claims.

- [ ] Keep the pitch educational. Do not claim universal acceptance, legal superiority, a review count/rating, fastest service, or exclusive verification. Do not ask for exact-match anchor text.

- [ ] If the destination link is accepted, use a non-clinical campaign tag such as:

```text
utm_source=hrm&utm_medium=referral&utm_campaign=employer_verification_2026q3
```

- [ ] Run the mandatory marketing-compliance review on the exact payload and reverify entity, pricing, certification, availability, refund, and clinical-process facts at send time.

- [ ] Present the exact recipient, subject, body, linked sources, and tracking parameters for fresh operator approval. Stop before sending.

- [ ] After approval, send once. Wait at least 10 business days before one follow-up. Do not add recipients or turn the pitch into a blast.

- [ ] Record only non-sensitive receipts: sent date, recipient organisation, response state, publication URL if any, aggregate referral sessions, reportable paid orders, and source group. Do not store correspondence bodies in the app or plan.

- [ ] At the 30-day checkpoint:

```text
ADVANCE: accepted/published contribution, or attributable referral traffic/orders with a real receipt.
HOLD: a specific editorial decision or publication date is pending.
STOP: no response after one follow-up, no publication, and no attributable traffic. Do not widen the list.
```

- [ ] A SourceBottle company/source profile is a new experiment. Before proposing it, verify that company attribution is allowed without publicly disclosing an individual doctor’s name; if a personal expert identity is mandatory, stop for an operator decision.

### Task 10: Read the shipped `/prescriptions` experiment instead of rewriting it

**Files:**

- Read: `docs/plans/2026-08-24-free-channel-compounding-and-repeat-rx-conversion.md`
- Evidence only: `output/revenue-compounding/`
- Update after readout: the existing plan addendum and `docs/ROADMAP.md`

- [ ] At day 14 after the candidate deployment, inspect `/prescriptions`. If it is still unknown to Google, verify the live canonical, sitemap membership, internal links, rendered FAQ HTML, and post-deploy `lastCrawlTime` before proposing an indexing request.

- [ ] If the live page is correct and remains unknown, present one `/prescriptions` indexing request for fresh approval. Request it once; do not change the page to manufacture crawl activity.

- [ ] Re-run the aggregate growth audit at the first and second closed 30-day post-ship checkpoints:

```bash
corepack pnpm audit:customer-growth -- \
  --days 30 \
  --out-dir output/revenue-compounding/prescriptions-window-1

corepack pnpm audit:customer-growth -- \
  --days 30 \
  --out-dir output/revenue-compounding/prescriptions-window-2
```

- [ ] Use the shipped Item 2 rule without reinterpretation:

```text
CONTINUE: after two closed 30-day windows, >=8 free-channel paid orders permits one second bounded session only, with fresh GSC corroboration and the operating guardrails clear.
HOLD: 6-7 free-channel paid orders.
STOP: <=5 after two closed 30-day windows.
```

- [ ] Check overall rolling net-retained revenue and the service refund, fulfilment, support, and queue guardrails before any continuation.

- [ ] Do not run a second prescription copy session before this readout. Indexing, impressions, or clicks without paid orders do not clear the continuation gate.

- [ ] Record the result in the existing plan addendum and refresh the ROADMAP status without changing rank order.

### Task 11: Select exactly one next compounding session from closed-window evidence

**Files:**

- Read: output from Tasks 4, 5, 8, 9, and 10
- Update: `docs/ROADMAP.md`
- Create only after selection: one new bounded implementation plan for the chosen existing page

`/prescriptions` is excluded from these generic tiers while the shipped Item 2 rule remains active; Task 10 owns its specialised two-window threshold and possible second bounded session.

- [ ] Rank existing public landing pages using reportable free-channel paid orders from one closed 30-day window:

```text
DEEPEN: >=10 paid orders; one answer-density/clarity session on one existing page only may be planned.
MAINTAIN: 3-9 paid orders; accuracy and freshness only.
DO NOTHING: <3 paid orders; no dedicated session.
```

- [ ] Require fresh corroborating page/query evidence from Search Console for every rank-6 page session, including pages whose paid orders currently arrive through AI or referral sources. Paid-order evidence selects candidates; the ROADMAP’s GSC gate decides whether rank-6 on-site work may start.

- [ ] Exclude `/` brand landings from rank-6 content work. Homepage changes remain brand/design canon work.

- [ ] Prefer the highest-retained, lowest-friction active service only after checking refunds, unsuitable cases, fulfilment, support load, and queue impact. Do not optimize approval rate.

- [ ] If no page reaches a gate, stop. Continue rank 3 distribution and existing rank 4 operations; do not create work to fill a calendar.

- [ ] If one page qualifies, write one page-specific plan with one hypothesis, one material change, one closed-window success/stop rule, focused tests, and no new URL. `DEEPEN` cannot authorise a new URL, content wave, or the locked v4 programme; v4 scaling still requires both Phase 2 Outcome A and the P3.1 cohort beating its holdout.

- [ ] Refresh `docs/ROADMAP.md`, run `corepack pnpm doc:audit`, and commit the dated decision receipt.

---

## 60-Day Scorecard

The plan is successful only if the receipts support the claim. Fill this from closed windows; do not pre-fill a forecast.

| Signal | Baseline | Checkpoint | Decision use |
|---|---:|---:|---|
| Rolling 30-day net-retained revenue | Live dashboard at execution start | Day 30 and day 60 | Economic outcome; never replace with traffic |
| Free-channel paid orders by source + landing | Re-pull with Task 5 | Day 30 and day 60 | Select or stop page work |
| `/prescriptions` free-channel paid orders | 4 in the dated 2026-08-24 receipt | Two closed post-ship windows | Continue >=8; hold 6-7; stop <=5 |
| Branded snippet/sitelinks | Desktop + mobile pre-deploy receipt | Day 7/14/28 after post-deploy crawl | Hold or one exact repair |
| Employer-authority receipt | None for this experiment | Day 30 | Advance, hold, or stop distribution wave |
| Refunds / disputes / fulfilment | Live service scorecard | Weekly | Blocks next lever on breach |
| Support contacts per 100 orders | 5.3 proxy in the dated ROADMAP checkpoint | Weekly | Must be below 5 to certify the $5k rung |
| Work approaching 24-hour ceiling | Live queue | Immediate | Stops next acquisition lever |

## Execution Log

| Date | Task | SHA / external receipt | Result | Next gate |
|---|---|---|---|---|
| 2026-08-28 | Plan adopted | Local documentation commit | Pending implementation | Task 1 |
| 2026-08-28 | Task 0 reconciliation | Reconciled against current `main`; `b587df12aec7eb70b7d9ff716e0ccc3beed98255` | Tasks 1-11 aligned to current claim, redirect, sitemap, observation, and compounding gates; product implementation is not complete | Run Task 1 locally |
| 2026-09-03 | Definitive exact-SHA Task 6 verification | Tested pre-receipt implementation `aa6964e292b760196ec790fa81f2639fa40a2fa5`; replaces every earlier Task 6 receipt | PASS: the first independent review found one material universal-doctor-review copy defect; the implementation now uses the code-owned branch-aware clinical-review claim or neutral clinical-assessment wording on the affected location and telehealth surfaces, with a 22/22 focused regression. Exact-tree gates passed: 9 focused files / 113 tests, 10 documentation specs / 121 tests / 123 Markdown docs, route-conflict check, lint, typecheck, `git diff --check`, full 702 files / 6,494 tests, and upload-disabled 482/482-route production build. The refreshed 2026-05-26 to 2026-08-24 read-only GSC audit generated at 2026-09-03T08:21:28.216Z found 151 unique live-sitemap URLs, 79 performance pages, 33 pages with clicks, six healthy live sitemaps, 21 branded landing pages, and one inspected `/medical-certificate` URL with submitted-and-indexed / allowed / successful verdicts. The refreshed rolling window 2026-08-04T08:21:32.756Z to 2026-09-03T08:21:32.756Z found 305 reportable intakes, 283 paid, $9,313.60 gross, $304.25 refunds, and $9,009.35 net retained; 25 recovery sends produced 5 paid orders and $144.75 recovered net. PostHog returned HTTP 200 with 765 intake starts, 468 checkout views, and 284 server purchase completions; the protected Google Ads source returned HTTP 200 with $3,185.75 spend, 744 clicks, 153 local orders, $5,156.25 local net revenue, $20.82 local CAC, and 1.619 local ROAS. The exact production artifact passed all seven indexed deep-city DOM/schema and branch-aware-copy checks, seven exact location-sitemap owners with no Gold Coast owner, all 13 exact HTTP 308 redirects, and all three pruned-surface checks. A 24-view six-route desktop/mobile light/dark DOM/network matrix passed with exact canonical, valid JSON-LD, footer `data-nosnippet`, actual theme class, internal links, and zero page errors, console errors, unexpected failed requests, HTTP >=400 responses, or horizontal overflow; an independent visual reviewer passed the 24 scroll-revealed full-page captures plus 8 paired hero-viewport captures with no material missing content, clipping, overlap, readability, layout, or trust defect. `lastmod` evidence is 2026-08-28 for `/`, `/medical-certificate`, `/medical-certificate-online`, `/about`, and `/contact`, and 2026-08-29 for `/telehealth-australia` plus all seven indexed location pages. All four generated aggregate audit artifacts passed a zero-match privacy scan for raw query keys, UUIDs, email addresses, click identifiers, certificate credentials, and auth-token keys, then were removed with the temporary env link; port 3060 and all browser sessions were closed. This gate used only `SENTRY_AUTH_TOKEN= corepack pnpm build`; no Sentry release/source-map upload, push, or deployment occurred. Hosted exact-SHA behaviour, a fresh Google recrawl/index change, actual Google snippet/sitelink or SERP movement, and post-deploy revenue impact or causality remain unverified. | Independent base-to-receipt review before any PR or production action |

## Self-Review Checklist

- [x] Every active task maps to ROADMAP rank 1, 3, or 6 and inherits its stop checkpoint.
- [x] No task silently changes clinical policy, service scope, pricing, stack pins, Ads, or staffing.
- [x] Every public-copy task names the approved-claim owner and a focused failing test.
- [x] Every external action has a fresh exact-payload approval stop.
- [x] Every measurement output is aggregate-only and strips query strings and identifiers.
- [x] No drafting placeholders or invented performance numbers remain.
- [x] Commands, paths, types, source-group names, and plan links match the repository.
- [x] A losing or inconclusive lever can stop without forcing a replacement project.
