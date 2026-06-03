# GSC + SEO Content Audit — 2026-06-03

Source: live Google Search Console (`sc-domain:instantmed.com.au`, 90-day window via `tools/gsc-mcp-server/gsc-index-audit.mjs`) + PostHog `content_page_viewed` (90d) + 3 codebase audits (cluster/cannibalization, depth, technical/E-E-A-T).

## Headline

The blog (and most of the site) is **not indexed / not ranking** — this is a site-level indexation + authority constraint, not primarily an article-depth problem on the invisible pages. Deepening articles Google hasn't indexed will not move them until indexation improves.

### Indexation crisis (GSC)
- **348 live sitemap URLs; 310 (89%) have zero impressions** in 90 days.
- **Only 18 URLs site-wide have any clicks.** Total ~110 clicks (91 to the homepage).
- Commercial money pages **not indexed**: `/medical-certificate` and `/prescriptions` both report **"Discovered – currently not indexed."** `/online-doctor-australia`, `/telehealth-australia`, `/pricing` same.
- `/consult` → "Duplicate without user-selected canonical" (Google chose the stale `www.` host; last crawl 2026-05-08). **www → non-www 301 is now live** and canonicals are correct, so this should resolve on re-crawl.
- Indexed & healthy: `/` (homepage) and `/our-doctors` only, among inspected priority URLs.
- Programmatic page sets with **0 impressions across the entire set**: `/intent/*` (25), `/compare/*` (10), `/guides/*` (16), `/for/*` (8), `/symptoms/*` (4), plus most `/locations/*` (50) and `/conditions/*` (53 → only 15 with any impressions). ~166 thin programmatic URLs likely diluting crawl budget + site quality signals.

### Blog performance (GSC, 90d) — only 11 of 108 articles have ANY impressions
| Slug | Clicks | Impr | Avg pos |
|---|---|---|---|
| can-you-get-antibiotics-online-australia | 7 | 2,627 | 6.1 |
| pbs-pharmaceutical-benefits-scheme | 1 | 2,281 | 16.0 |
| parents-sick-child-certificate | 5 | 625 | 9.0 |
| work-from-home-sick-certificate | 1 | 558 | 4.7 |
| mental-health-certificate-work | 2 | 482 | 9.0 |
| is-telehealth-bulk-billed-australia | 1 | 480 | 8.0 |
| online-doctor-certificate-for-work | 1 | 120 | 18.6 |
| is-telehealth-safe | 1 | 44 | 6.6 |
| telehealth-safety-screening | 0 | 41 | 5.7 |
| burnout-vs-stress | 0 | 6 | 10.5 |
| ahpra-registered-doctor-meaning | 0 | 6 | 6.7 |

Total blog: **7,270 impressions, 19 clicks** in 90 days. The other **97 articles = 0 impressions** (invisible to Google).

PostHog (90d) corroborates: ~160 total article pageviews; top = `can-you-get-antibiotics-online-australia` (34 views).

## What actually drives leads (priority order)

1. **Win the pages already ranking.** Deepen + fix title/meta CTR on the 11 articles with impressions. Biggest single opportunities:
   - `can-you-get-antibiotics-online-australia` — pos 6.1, 2,627 impr, CTR 0.27%. On page 1 already; depth + CTR could 5–10× clicks.
   - `pbs-pharmaceutical-benefits-scheme` — pos 16, 2,281 impr. Page-2 → page-1 push = large click gain.
   - `work-from-home-sick-certificate` (pos 4.7), `parents-sick-child-certificate` (pos 9), `mental-health-certificate-work` (pos 9), `is-telehealth-bulk-billed-australia` (pos 8).
2. **Get the commercial pages indexed** (`/medical-certificate`, `/prescriptions`) — internal links from indexed pages (homepage, ranking blog posts — neutral contextual links allowed per SEO policy §5), GSC "Request Indexing", reduce thin-page bloat. This is the most direct lever for paid-intent leads.
3. **Consolidate** duplicates → fewer, stronger URLs (crawl efficiency + concentrated authority). Approved.
4. **Prune / noindex thin programmatic bloat** (~166 zero-impression `/intent`, `/compare`, `/guides`, `/for`, `/symptoms`, most `/locations`) to recover crawl budget — *outside the approved blog scope; flagged for decision.*
5. **Then** deepen + expand the 97 invisible articles (in GSC-priority batches) — only valuable once indexation/authority improve.

## Corrected consolidation map (GSC-grounded; ← = redirect into)
Equity-bearing canonicals fixed vs. the original topic-based guesses:
- `mental-health-certificate-work` (482 impr) ← `mental-health-certificate-online` **(FLIPPED)**
- `work-from-home-sick-certificate` (558 impr, pos 4.7) ← `working-from-home-when-sick` **(FLIPPED)**
- `can-you-get-antibiotics-online-australia` (2,627 impr) ← `are-antibiotics-prescription-only-australia` + `antibiotic-prescription-online-australia` (both 0 impr; latter already redirected at next.config.mjs:471 but `.mdx` + visuals entry still live → delete)
- All other pairs (eScripts, repeat-Rx, same-day cert, UTI, employer accept/reject, telehealth-vs-gp, university) — every candidate has 0 impressions, so canonical = better slug/keyword (low risk). Keep `online-doctor-certificate-for-work` (120 impr) — do not merge away.
- City pages (8) — all 0 impressions → safe to collapse to 2 + regional hub.

## E-E-A-T / schema gaps (codebase)
- 5 fabricated author personas (Sarah Chen et al.), empty credentials → retire; attribute to named real Medical Director (small/footnote) + reviewer `Person` schema.
- `author` + `reviewedBy` are `MedicalOrganization`, not credentialed `Person`.
- No `MedicalCondition` schema on condition articles (component exists, unused).
- `HowTo` schema hardcoded to 10 slugs (several being merged away).
- Citations are unlinked name-drops; convert to real linked AU authorities.

## Tooling note
GSC access path: `tools/gsc-mcp-server/` (isolated sub-package; `googleapis` installed there 2026-06-03, separate from root pinned deps). ADC at `~/.config/gcloud/application_default_credentials.json`. Re-run: `node tools/gsc-mcp-server/gsc-index-audit.mjs --inspect-limit=N`.
