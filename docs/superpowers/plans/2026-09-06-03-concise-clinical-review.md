# Session 3 — Concise clinical review and notes

> **For agentic workers:** Use `superpowers:executing-plans` and the project UI/clinical skills. Work only this session plan. Follow the [ROADMAP session protocol](../../ROADMAP.md#sequential-build-session-protocol).

**Goal:** Let the clinician understand the current request and prescribing regimen immediately, clarify missing information and edit a coherent note without losing work.

**Architecture:** Extend the existing `ReviewPacket`, `IntakeReviewCockpit` and `IntakeReviewPanel`. Dashboard, Ledger and full request routes already share these; do not introduce another review framework. Preserve single-column review with progressive disclosure for notes and history rather than reintroducing Request/Notes/History tabs.

**Tech stack:** Pinned React 18/Next.js 15.5, TypeScript, shadcn/Radix and existing Source Sans 3/design tokens; no decorative portal motion.

**Spec/design brief:** [ROADMAP](../../ROADMAP.md), rank 2; [DESIGN](../../../DESIGN.md), [PRODUCT](../../../PRODUCT.md), [CLINICAL](../../CLINICAL.md). On Sep6 the operator identified concise clinical information as the main pain: medicine name, dose and frequency must be visible in the prescribing modal, with layout decisions delegated to the implementer.

**Status:** Planned. Starts after Session 2's build/decision handoff; its commercial measurement may continue independently.

## Design direction and acceptance scene

A clinician reviews repeated requests on a laptop, often alongside prescribing software, and occasionally uses a phone. The workspace should feel calm, compact and dependable. Keep Morning Canvas/light default and full dark-mode support, with the existing portal typography and controls. Linear's hierarchy and Stripe's readable density are references; the existing design system decides actual tokens.

Production UI is the deliverable. At 1366×768, current identity, requested medicine/strength, dose/directions, frequency, indication and the next action must be readable without opening an extra details control. Long clinical text wraps and remains accessible; no safety information is truncated to achieve that screen target. Mobile at 390×844 keeps identity and the primary action accessible while the clinical content scrolls.

## Global constraints

- Clinical and intake answers remain source-faithful. Do not infer a regimen, convert an indication into a diagnosis, or infer that “No conditions” means “no other conditions.”
- Keep patient answers, saved history and clinician findings clearly separate. Missing, not asked, explicit negative and conflicting recorded values are distinct states.
- Use one current prescribing-state presentation. Actual risk, missing required information and genuine delivery/recovery failures remain prominent; ordinary unfinished prescribing is neutral work.
- Preserve durable note persistence, draft status, record ownership, doctor capabilities, audit logs and `script_sent` completion guards. No clinical outcome is automatic.
- Preserve the full questionnaire and dated history within one disclosure action. Do not hide essential current-request facts behind hover, icons or new tabs.

## Task 1 — Make the current request concise and complete

**Files:** `lib/clinical/review-packet.ts`, `components/doctor/review/request-info-card.tsx`, `components/doctor/review/intake-review-cockpit.tsx`, `components/doctor/intake-review-panel.tsx`, `components/doctor/review/review-blockers-strip.tsx`.

**Interface:** Extend existing packet fields only when a fact is currently missing. Preserve their provenance and empty-state semantics; consumers must not reinterpret missing values as negative answers. Reuse existing prescribing-context normalization rather than adding a second clinical parser.

- [ ] Capture the existing seeded review at laptop and mobile sizes, including long medicine names/directions, two medicines, positive safety answers and absent responses.
- [ ] Put the complete medicine name and strength together. Give the current regimen a full-width readable line; show dose and frequency separately when explicitly captured, otherwise retain the original directions and label the uncaptured field truthfully.
- [ ] Show indication adjacent to the regimen. Replace the equal four-column competition and dot-separated negative sentence with compact labelled safety rows.
- [ ] Keep positive findings, required missing information and actual recorded contradictions visible. For an indication alongside a negative conditions answer, show both sources for clinician reconciliation; do not invent a semantic contradiction detector.
- [ ] Retain certificate and specialty variants: certificate purpose/dates/symptoms; specialty assessment details. Do not force a medication template onto every service.
- [ ] Verify identical clinical facts across queue panel, Ledger panel and full admin/doctor request record.

## Task 2 — Expose prescribing context in the current modal now

**Files:** `components/doctor/parchment-prescribe-panel.tsx` and the existing prescribing-context helper located by `lib/__tests__/parchment-prescribing-context.test.ts`.

**Interface:** Consume the same source fields as Task 1. Medicine and frequency/copy controls already exist in the modal; dose is currently inside Request details. This task changes visibility and hierarchy, not provider behavior.

- [ ] Show medicine/strength, dose/directions, frequency and indication together above the existing iframe without expanding Request details.
- [ ] Keep full-regimen display separate from medication-search copy. Preserve the existing verified generic-name-only resolution and safe patient-entry fallback for the medication search control; do not replace it with a medicine/strength/dose bundle. Separate directions/frequency copy controls preserve their exact source units and qualifiers and never synthesize a prescribing instruction.
- [ ] Keep missing/long/multiple regimens readable and permit the reference content to expand on small screens without covering the close action.
- [ ] Preserve the existing iframe width and lifecycle for this release. Session 4 owns spatial enlargement, so the immediate clinical-summary improvement does not wait for it.

## Task 3 — Restore clarification and simplify routine status

**Files:** `app/doctor/queue/queue-table.tsx`, the existing queue actions, cockpit action area and blockers strip. Reuse the existing request-information action/dialog; the compact-layout exclusion currently hides the general control.

- [ ] Put a labelled Request information action inside the compact review, with existing authorization, message validation and durable outcome behavior. `app/actions/request-more-info.ts` currently permits `paid`, `in_review` and `pending_info`; enable only for supported states and explain unavailability elsewhere. Clarification after `awaiting_script` is a separate explicitly specified/tested transition, not permission to expose an action that will fail or silently alter lifecycle rules in this task.
- [ ] Keep the current clinical phone affordance obvious; clicking it must not mark a required consultation completed or create a new call-outcome workflow.
- [ ] Show one neutral ready/pending/recorded/completed status. Completion remains visible but disabled with one explanation until durable prescription evidence exists.
- [ ] Keep the audited external-prescription fallback under labelled secondary/recovery options. Do not turn it into the default prescribing path.
- [ ] Keep decline accessible with the exact current refund consequence and reason in its confirmation; remove repeated everyday refund text only where the confirmation retains it.
- [ ] Verify another doctor's ownership, capability restrictions, send failure, delayed confirmation and stale state. No enabled-looking action may bypass its server guard.

## Task 4 — Make the note one readable document

**Files:** `components/doctor/clinical-case-review.tsx`, current draft-save hooks/actions used by that component, `components/doctor/review/intake-review-cockpit.tsx`.

- [ ] Replace four tiny internally scrolling SOAP boxes with vertically arranged sections that expand to their content. Keep one primary scroll area for the open note view and preserve the patient/critical-context strip.
- [ ] Show Saving, Saved and Save failed beside the note title, using the existing persistence state. Retain generated content as Draft; saved does not mean signed.
- [ ] Preserve edits through note/history disclosure, Parchment open/close, patient details and request navigation. Save failure must keep recoverable content and a clear retry, not silently navigate away or reset the editor.
- [ ] Preserve SOAP field storage and clinician-authored content. Do not swap the app model, auto-sign notes or rewrite clinical boilerplate in a way that changes its meaning.

## Verification and handoff

Extend `lib/__tests__/review-packet.test.ts`, `lib/__tests__/clinical-case-review-render.test.tsx`, `lib/__tests__/intake-review-cockpit-no-tabs.test.tsx` and `lib/__tests__/parchment-prescribing-context.test.ts` for changed behavior. Use the existing dashboard keyboard and prescribing E2E harnesses for real interactions.

The browser matrix includes laptop/mobile, light/dark, keyboard focus, long content, explicit negatives/missing/uncaptured values, contradictory source answers, draft save failure, another doctor's lock, delayed/failed provider confirmation and external fallback. Use seeded data. Show the operator a compact before/after review set; screenshots prove layout, while interaction assertions prove saving and completion guards.

Follow the shared release protocol. Record the accepted field hierarchy and summary consumers for Session 4. No new shared abstraction is justified solely by file size.

**Next-session prompt:** “Execute Session 4, Room to prescribe, from ROADMAP. Preserve Session 3's accepted clinical summary and note persistence; improve the surrounding Parchment workspace only.”

## Execution receipt

Unstarted. Record visual acceptance, behavioral proof and release evidence when performed.
