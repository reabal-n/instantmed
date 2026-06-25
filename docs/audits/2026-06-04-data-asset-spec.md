# Data Asset Spec — "The Australian Sick Day Report" (2026-06-04)

## 🚦 VIABILITY GATE — checked 2026-06-04 (SESSION 2): NOT YET VIABLE — DEFERRED
Operator signed off the privacy gate (clause added to privacy policy §3; de-id standard approved) and said "go." On running the **read-only aggregate counts first** (the right order), the sample is far too small to publish:
- **101 paid requests total** (122 incl. unpaid), over ~4 months (2026-01-28 → 2026-06-04). Excludes the seeded E2E patient.
- **Every reportable cell is under the <30 de-id suppression floor:** day-of-week peaks at Wed 22 / Thu 19 / Mon 16 (all <30); states are 85/101 **unknown** (med certs don't collect address/state) then NSW 9 / VIC 3 / QLD 2 / WA 2; **express = 0** (no one bought priority); category = med cert 86 / consult 9 / prescription 6 (only med cert clears 30).
- **Three disqualifiers:** (1) credibility — no outlet cites N≈100, and it broadcasts pre-traction scale to journalists + competitors; (2) the approved <30 suppression would blank almost the entire report; (3) the relatable "Monday sickie" headline is **false on this data** (Wednesday is the peak).

**Decision: do NOT build/publish until volume is sufficient. Threshold ≈ 1,000+ paid requests** (day-of-week + seasonal cells clear suppression there; state-level needs more, or growth in the address-collecting services since `profiles.state` is null for most med-cert patients). Re-run the counts below at that point. The privacy clause was kept (it's correct hygiene regardless + pre-clears the report for when it's viable). **The build plan below stands for the future; it is parked, not cancelled.**

Schema note for the future build: service field is `intakes.category` (text) + `intakes.subtype`; there is **no `service_type` column**. Patient link is `intakes.patient_id` → `profiles.id`. State is `profiles.state`. Exclude seeded patient `e2e00000-0000-0000-0000-000000000002`. Genuine demand = `payment_status in ('paid','refunded','partially_refunded')`.

---


The highest-leverage FREE backlink play (per `docs/audits/2026-06-04-au-backlink-plan.md`, Pillar 2): an original, company-attributed AU data report built from InstantMed's own aggregate request data. Original AU stats are what journalists link to, it needs no personal name (privacy-safe), and it reuses the existing infographic pipeline for genuine charts. Refresh quarterly so it stays citable.

## ⛔ PRIVACY HARD STOP — operator sign-off required BEFORE any data pull or publish
Using clinical intake data for a public marketing report is a **secondary use** under **APP 6** (data collected for clinical care, reused for marketing/PR). I will NOT pull or publish patient-derived figures until you confirm, in writing:
1. **Privacy-policy cover.** Your privacy policy / collection notice permits using service data for **aggregate, de-identified insights and reporting**. (If it doesn't, add a line — most do via a "we may use de-identified/aggregate data to improve and promote our services" clause.)
2. **De-identification standard.** Only **aggregate counts/percentages**, never row-level data. **Suppress any cell < 30** (no small groups that could re-identify). No free-text, no diagnoses, no names, no postcodes (state-level only), no rare combinations.
3. **No re-identification risk.** "30% of med-cert requests land on Mondays" is fine; "the 2 requests from <small town> were both for X" is not — suppression handles this.
This is a legal/policy call only you can make. Once confirmed, I build it end to end.

## Safe aggregate dimensions (de-identified — confirmed against the schema)
All from operational fields, NO PHI: `intakes.created_at`, `intakes.service_type` + `subtype`, `intakes.is_priority`, `profiles.state` (aggregated). NEVER `intake_answers` (clinical/PHI), free-text reasons, names, suburbs, or postcodes.

| Story | Dimension | Example finding |
|---|---|---|
| The busiest sick day | `created_at` day-of-week | "Australians request the most med certs on **Mondays** (X%), then Tuesdays" |
| The after-hours nation | `created_at` hour-of-day | "X% of requests come in **outside 9–5**; the peak hour is N" |
| Sick season | `created_at` month | "Requests spike **+X% in winter** (Jun–Aug); the single biggest week is W" |
| What Australians ask for | `service_type` / `subtype` | "Med certs are X% of requests; repeat scripts Y%" |
| The impatient minority | `is_priority` | "X% pay for express review" |
| State of the nation | `profiles.state` (suppress <30) | "Per-capita, [state] requests the most certs" |

Terminology note added 2026-06-25: this historical spec used the then-current "Express review" label. Current product copy calls the same optional fee "Priority review".

Pick the 4–6 with the strongest, most-quotable, genuinely-newsworthy findings (day-of-week + after-hours + winter spike are the natural headline trio — relatable, surprising, journalist-friendly).

## Report page
- **Placement:** a dedicated indexable page — recommend `content/blog/australian-sick-day-report.mdx` (reuses the blog template + visuals + keep-set/index machinery) OR a `/reports/` route if you want a distinct hub later. Add to `KEEP_INDEXED_BLOG` on publish.
- **Structure:** headline stat up top → 4–6 stat sections each with a chart visual (existing `lib/blog/visuals.ts` pipeline, `kind: "comparison"|"timeline"`) → a short **methodology + de-identification note** (sample size band e.g. "based on N+ requests over [period]", aggregate-only, cells <30 suppressed) → a "for media / cite this" line. Corporate "InstantMed Clinical Team" attribution; no personal name.
- **Compliance:** TGA-safe (no drug/treatment claims — it's demand data, not health advice); no medical advice; no patient identifiers.

## Pitch plan (after publish)
Pitch the report as an original data story (company-attributed) to AU outlets: news.com.au + verticals, ABC, SMH/Nine, HR/payroll/small-business trades (the "Monday sickie" + after-hours angle is perfect for them), and lifestyle/work outlets. A short email: the one-line headline stat + a link + an offer of the full dataset/chart. Combine with HARO/Qwoted answers that cite a stat from the report.

## Build steps (once you sign off the privacy gate)
1. You confirm the 3 privacy points above (+ tweak the privacy policy if needed).
2. I write read-only aggregate SQL for the chosen dimensions (with the <30 suppression baked in) — you run it (or grant me scoped read access), data stays aggregate.
3. I draft the MDX report + the methodology note, generate 3–4 chart visuals, run content:audit + build, add to the keep-set, ship + submit to the Indexing API.
4. I give you the media pitch list + email template.

**Net:** this is the single best free lever to earn DR50+ AU editorial links — but it's gated on the privacy sign-off above, which is non-negotiable for patient-derived data.
