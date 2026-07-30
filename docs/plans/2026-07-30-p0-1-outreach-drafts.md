# P0.1 outreach + listing drafts — held for individual send approval

> **Status: drafts only. Nothing here has been sent, submitted, published, or edited on any external property.**
>
> **Parent:** `docs/plans/2026-07-30-ai-organic-growth-plan.md` §3 P0.1. **Authority:** Reference only. `docs/ROADMAP.md` is the sole active priority queue (rank 3, external reputation and distribution).
>
> **Binding authority boundary:** Phase 0 approval covers drafting. **Each item below requires its own explicit operator approval immediately before it goes out.** Approving this document is not approval to send. Agents must not submit, publish, or edit any external property listed here.
>
> Source of truth for facts: `PRICING` (`lib/constants/index.ts`), `getApprovedClaim()` / `APPROVED_CLAIMS` (`lib/marketing/approved-claims.ts`), `MAX_MED_CERT_DURATION_DAYS` (`lib/clinical/intake-validation.ts`). **Re-verify every price and claim against those owners at send time**, a stale figure in an external listing becomes a source-conflict that costs citations (see the parent plan's consistency rationale).

---

## Shared fact sheet (verify before every send)

| Field | Value | Owner |
|---|---|---|
| Entity | InstantMed Pty Ltd, ABN 64 694 559 334 | `CLAUDE.md` platform identity |
| Address | Level 1/457-459 Elizabeth Street, Surry Hills NSW 2010 | same |
| Service area | Australia-wide telehealth, 18+ | same |
| Medical certificate | From **$24.95**; maximum **3 days** | `PRICING`, `MAX_MED_CERT_DURATION_DAYS` |
| Repeat prescription | **$29.95** | `PRICING` |
| Specialty consults (ED, hair loss, women's health) | **$49.95** | `PRICING` |
| Priority review add-on | **$9.95**, optional | `PRICING` |
| Availability | **Use `getApprovedClaim("availability_24_7")` verbatim:** "Requests can be submitted and reviewed 24/7. Review timing varies with clinical complexity, follow-up questions, and queue volume." | `lib/marketing/approved-claims.ts` |
| Refund | **Use `getApprovedClaim("refund_guarantee")` verbatim:** "Full refund if the doctor declines." Compact alias `refund_guarantee_label` = "Refund if declined" is approved for table cells | `lib/marketing/approved-claims.ts` |
| Clinical review sequence | **Use `getApprovedClaim("clinical_review_sequence")` verbatim** (see below) | `lib/marketing/approved-claims.ts` |
| Certificate verification | Public verification endpoint for employers and institutions | `/verify` |
| LegitScript certification | **Reverify status immediately before any publication** | LegitScript directory |
| Health services directory listing | **Separate fact from certification. Reverify immediately before any publication** | NHSD/PCA portal |

### The clinical review sequence — approved text, use verbatim

> "Prescribing requests receive doctor review before any prescription is issued. Eligible low-risk certificate requests may follow a doctor-owned protocol and are individually reviewed afterward."

**Do not paraphrase this and do not shorten it.** The approved-claim notes are explicit: *"Do not imply every certificate is doctor-reviewed before issue or that protocol issuance applies to prescribing."*

An earlier version of these drafts said "an AHPRA-registered doctor reviews it and decides what is clinically appropriate" for all services. **That is false for eligible protocol-based certificate issuance** and has been removed everywhere.

**LegitScript certification and the health services directory listing are two separate facts.** Never merge them into one credential phrase, and reverify both immediately before any approved publication. A stale credential claim on an external surface is worse than no claim.

**Never state in any of these:** doctor count · individual doctor names · FRACGP or fellowship claims · peer-review or team-training claims · guaranteed turnaround times · review counts or star ratings · any prescription-medicine brand name · any claim that a certificate will be accepted by a specific employer or institution · any category-superiority claim (notably **not** "the only provider with verification", since Qoctor, Updoc, and Doccy all publish verification surfaces).

**Em dashes are banned in all send-ready copy** (`lib/marketing/voice.ts`). The copy blocks below comply; keep them compliant if edited.

> **Verification status for this document is MANUAL.** Neither existing contract test covers it: `lib/__tests__/voice-guard.test.ts` scans `components/marketing`, `lib/marketing`, and `lib/email` — **not `docs/`** — and `lib/__tests__/approved-claims-contract.test.ts` reads only `docs/BUSINESS_PLAN.md`, `docs/VOICE.md`, `docs/ADVERTISING_COMPLIANCE.md`, and `docs/PRIMITIVES.md`. Their passing does **not** validate this draft. Any earlier statement that these tests verified this document was wrong. Before each approved send, the operator or an agent must manually check: em dashes, the complete branch-aware clinical claim (or none), prices against `PRICING`, and the certification/listing split. A focused draft-copy contract test is a reasonable follow-up but is not in scope here.

---

## Draft 1 · MediCompare listing request

**Channel:** email to `info@medicompare.com.au` · **Approval required before sending.**
**Context:** `medicompare.com.au/instantmed/` currently 404s while ~34 AU providers have staff-written profiles. Inclusion bar is low; absence is the anomaly.

> **BLOCKER before this or any Draft 2 send.** The referenced kit `docs/audits/2026-07-09-comparison-surface-submission-kit.md` and the runbook `docs/runbooks/NHSD_REGISTRATION.md` both still assert **universal pre-issue doctor review** (kit "Review model": *"Doctor review before issue"*; runbook: *"an AHPRA-registered doctor reviews"*). **That is clinically false for eligible protocol-based certificate issuance.** Repair both to the approved `clinical_review_sequence` wording, or retire them, **before** any send that draws on them. The drafts below are already corrected; the referenced source material is not.

> **Subject:** Provider listing request, InstantMed (Australian telehealth, ABN 64 694 559 334)
>
> Hello,
>
> I'm writing from InstantMed Pty Ltd, an Australian telehealth provider, to ask about being listed in your provider comparisons. We don't currently appear on MediCompare and I'd like to supply whatever you need to assess us.
>
> The essentials:
>
> - **Entity:** InstantMed Pty Ltd, ABN 64 694 559 334, Level 1/457-459 Elizabeth Street, Surry Hills NSW 2010
> - **Services:** medical certificates (from $24.95, up to 3 days), repeat prescriptions ($29.95), and consultations for erectile dysfunction, hair loss, and women's health ($49.95)
> - **Clinical process:** patients complete a structured clinical form. Prescribing requests receive doctor review before any prescription is issued. Eligible low-risk certificate requests may follow a doctor-owned protocol and are individually reviewed afterward.
> - **Availability:** requests can be submitted and reviewed 24/7. Review timing varies with clinical complexity, follow-up questions, and queue volume.
> - **Refunds:** full refund if the doctor declines.
> - **Verification:** employers and institutions can verify any certificate we issue at https://instantmed.com.au/verify
> - **Certification:** LegitScript certified
> - **Directory:** listed in the national health services directory
>
> Two of those may be worth columns in their own right, since I don't think your current comparisons capture them: **refund on decline**, and **whether a provider's certificates can be independently verified by an employer**. Both are objective yes/no facts across providers and both are things readers ask about. Happy to supply our data either way.
>
> I'm glad to fill in a form, answer follow-up questions, or provide anything else you need for verification.
>
> Kind regards,
> InstantMed Pty Ltd
> support@instantmed.com.au · instantmed.com.au

*Note: company attribution only, no named founder. Compliant per `docs/ADVERTISING_COMPLIANCE.md` — factual, sourced, no review counts, no superiority claim.*

---

## Draft 2 · Finder partner submission

**Channel:** Finder partner/listing form · **Approval required before submitting.**

Short description (≈50 words):

> InstantMed is an Australian telehealth service for medical certificates, repeat prescriptions, and treatment requests for erectile dysfunction, hair loss, and women's health. Patients complete a structured clinical form. Requests can be submitted and reviewed 24/7. Australia-wide, 18+. Full refund if the doctor declines.

**The process claim is deliberately absent from this short description.** The approved `clinical_review_sequence` claim is two sentences and does not fit a 50-word field, and **including only its prescribing half is a false claim** because it implies universal pre-issue certificate review. The rule for every short field: **carry the complete branch-aware claim, or carry no process claim at all.** An earlier draft carried only the prescribing sentence here, and Trustpilot and GBP then reused it, propagating the error to three surfaces.

If a longer field is available, use the full claim verbatim:

> Prescribing requests receive doctor review before any prescription is issued. Eligible low-risk certificate requests may follow a doctor-owned protocol and are individually reviewed afterward.

Structured fields:

| Field | Value |
|---|---|
| Legal entity / ABN | InstantMed Pty Ltd / 64 694 559 334 |
| Category | Telehealth: medical certificates, prescriptions, men's and women's health |
| Entry price | $24.95 (medical certificate, 1 day) |
| Prescription | $29.95 |
| Consultations | $49.95 |
| Optional add-on | $9.95 priority review |
| Availability | Requests can be submitted and reviewed 24/7. Australia-wide, 18+ |
| Turnaround | Reviewed around the clock. **No guaranteed timeframe** |
| Refund policy | Refund if declined (approved compact alias) |
| Bulk billing | Not available |
| App | No app, mobile web |
| Certificate verification | Yes, public endpoint at /verify |
| LegitScript certification | Certified (**reverify before submitting**) |
| Directory listing | Listed in the national health services directory (**reverify before submitting**) |

*If the form has a free-text "why choose us" field, use the description above verbatim. Do not add comparative or superlative language.*

---

## Draft 3 · Trustpilot profile claim

**Channel:** Trustpilot free business profile claim · **Operator account action — agent cannot perform this.**

No business profile currently exists. This is **claim-and-hold**: ProductReview remains the active review destination until roughly 15 reviews accrue there (parent plan W-F / P0.4 sequencing). Claiming now prevents someone else holding the namespace and gives the profile time to age.

Profile fields: entity **InstantMed Pty Ltd**; domain **instantmed.com.au**; category **Telehealth / Medical service**; description: reuse Draft 2's 50-word text verbatim (which deliberately carries **no** process claim) so the two surfaces cannot contradict each other. **Do not add a shortened review-sequence sentence here.**

**Do not** enable review invitations on Trustpilot yet — splitting the ask across two destinations before either has mass would slow both.

---

## Draft 4 · Wikidata organisation entity — **HELD, not creation-ready**

**Channel:** Wikidata · **HELD. Do not create. Agent must not create or edit this, and operator approval alone is not sufficient until the gate below passes.**

Purpose would be a machine-readable entity anchor that assistants and knowledge graphs can resolve. **But this item is not ready and is held for two reasons:**

1. **Sourcing.** Wikidata notability requires a serious, publicly available reference. Of the properties below, only the ABN has a real external receipt (the ABR). Label, description, `instance of`, `country`, and `industry` are self-asserted, and `official website` is self-referential. That is a thin item.
2. **Conflict of interest.** [`Wikidata:SELF`](https://www.wikidata.org/wiki/Wikidata:SELF) discourages creating an item about your own organisation, and [`Help:Notability`](https://www.wikidata.org/wiki/Help:Notability) sets the reference bar. A self-created, thinly-sourced company item risks deletion and reads as promotion, which is a worse outcome than absence.

**Gate before this is reconsidered — all three:** (a) at least two independent, publicly available references about InstantMed exist that are not our own site; (b) the conflict-of-interest disclosure approach is decided; (c) the operator explicitly accepts the deletion risk. **Until then this item stays held**, and the entity-anchor goal is served by the `sameAs` markup already live on-site plus the third-party listings in Drafts 1 and 2.

Retained below only as a record of what *would* be asserted, with sourcing honestly marked:

| Property | Value | Source |
|---|---|---|
| Label | InstantMed | **self-asserted** |
| Description | Australian telehealth company | **self-asserted** |
| instance of (P31) | business (Q4830453) | **self-asserted** |
| country (P17) | Australia (Q408) | ABR (registered in AU) |
| official website (P856) | https://instantmed.com.au | **self-referential** |
| industry (P452) | telehealth (Q1191860) | **self-asserted** |
| Australian Business Number (P3548) | 64694559334 | **ABR — the only strong external receipt** |

**Excluded deliberately:** headquarters location (a registered office is not a sourced headquarters; needs a direct receipt before it is asserted), inception date (not independently sourceable), employee or doctor count (**prohibited**), founder (**prohibited, no named founder**), revenue, any subjective descriptor.

**Do not create a Wikipedia article.** Notability is not established, and a deleted article is worse than no article.

---

## Draft 5 · NHSD / PCA `.gov.au` listing refresh

**Channel:** national health services directory provider portal · **Operator credentials required. Approval required before publishing.**

The 2026-07-08 audit found this listing stale. It matters disproportionately: health prompts route heavily to institutional sources, and a current government-adjacent entry is the corroboration an assistant can use to justify naming us.

Refresh checklist — every field reconciled against the shared fact sheet above:

- [ ] Service list matches live services exactly: medical certificates, repeat prescriptions, ED, hair loss, women's health (UTI + contraceptive pill). **Weight management must not appear** — it is gated and not accepting requests.
- [ ] Hours reflect 24/7 operation.
- [ ] No stated turnaround guarantee.
- [ ] Prices match `PRICING` or are omitted entirely.
- [ ] Contact details: support@instantmed.com.au · 0450 722 549.
- [ ] Address matches the registered address.
- [ ] Telehealth-only delivery mode; Australia-wide; 18+.
- [ ] No doctor count or doctor names.
- [ ] Description does not contradict `llms.txt` or the site's own service copy.

**Record what changed and the date** — this is a citation-relevant surface and the parent plan's scheduled reconciliation check needs a baseline.

---

## Draft 6 · Google Business Profile confirm/refresh

**Channel:** Google Business Profile · **Operator account action. Approval required before any edit.**

Rationale: GBP reviews feed Gemini and AI Mode grounding, and it is an off-site surface, so the on-site AHPRA posture is untouched.

- [ ] Confirm the profile exists and is verified (a GBP is believed to exist; Bing Places synced 2026-06-09).
- [ ] Service-area business, not a storefront — **do not** present the Surry Hills address as a walk-in clinic.
- [ ] Categories: telehealth service / medical service.
- [ ] Hours: 24/7.
- [ ] Description: reuse Draft 2's 50-word text verbatim. **No shortened process claim** — either the complete branch-aware `clinical_review_sequence` text or none.
- [ ] Website links to `https://instantmed.com.au` (apex, not www — www 301s to apex).

**Binding boundary:** GBP review counts and star ratings **must never be rendered on-site**. The on-site Google badge stays stars-only. Adding GBP as a review destination is a separate decision that belongs to the W-F/P0.4 rotation sequencing, not to this refresh.

---

## Send log (fill in at send time)

| # | Item | Approved by | Sent/published | Outcome |
|---|---|---|---|---|
| 1 | MediCompare email | — | — | — |
| 2 | Finder submission | — | — | — |
| 3 | Trustpilot claim | — | — | — |
| 4 | Wikidata entity | — | — | — |
| 5 | NHSD/PCA refresh | — | — | — |
| 6 | GBP confirm/refresh | — | — | — |

Reply rate, commitments, and live listings feed scorecard row 10 in the parent plan. Targets: ≥2 comparison listings live by Oct 1; ≥4 surfaces and ≥8 new referring domains by Jan 31.
