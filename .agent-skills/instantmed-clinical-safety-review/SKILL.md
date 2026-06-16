---
name: instantmed-clinical-safety-review
description: InstantMed clinical and safety launch review workflow. Use when a task in /Users/rey/Developer/instantmed touches clinical policy, intake safety, service launch or gating, consult subtypes, women's health, repeat prescriptions, ED, hair loss, medical certificates, red flags, triage, AI clinical drafting, doctor review surfaces, prescribing boundaries, docs/CLINICAL.md, lib/safety, lib/clinical, lib/request, components/request, or any patient-safety-affecting change.
---

# InstantMed Clinical Safety Review

Use this as the first pass for safety-critical InstantMed work. The goal is to stop attractive changes from bypassing policy, server enforcement, persistence, or doctor review.

## Load Order

Read the smallest relevant set:

1. `AGENTS.md`, then `wiki/index.md`
2. `docs/CLINICAL.md`
3. `docs/SECURITY.md` when privacy, PHI, auth, RLS, logging, or audit data is touched
4. `docs/ARCHITECTURE.md` for intake, AI, data flow, DB, or route changes
5. `docs/SERVICE_LAUNCH_CHECKLISTS.md` for service launch or ungating work
6. Target implementation files from the task, using `rg` before broad folder reads

## Review Path

Trace the change through these layers and report gaps before editing:

1. Policy: active service scope, retired/gated scope, prescribing boundary, AI boundary, refund boundary.
2. Entry and routing: public entry points, service catalog, consult subtype gates, canonical `/request` path.
3. Intake UI: step registry, target step components, client validation, patient copy.
4. Server enforcement: Zod schemas, `validateSafetyFieldsPresent`, `checkSafetyForServer`, deterministic rules, checkout blockers.
5. Persistence: authenticated checkout, guest checkout, retry-payment, normalization, `intake_answers`, risk flags.
6. Doctor surface: case summary, review panel, rationale capture, call/decline/approve affordances.
7. Tests and docs: focused unit/contract/E2E coverage, relevant canonical docs.

## Non-Negotiables

- Do not treat a service launch as routing only.
- Do not widen women's health, weight loss, general consult, prescribing, or follow-up without explicit policy alignment.
- Do not make AI responsible for safety, diagnosis, prescribing, call requirement, or decline decisions.
- Do not rely on client-only blocks for red flags, pregnancy risk, controlled substances, or missing safety answers.
- Do not overclaim verification. Say exactly which path, browser, test, and persistence layer was exercised.

## Output Shape

Lead with the recommendation:

- Decision: safe to proceed, blocked, or needs explicit product/clinical decision.
- Policy alignment: what docs allow or forbid.
- Enforcement map: files checked and the layer each covers.
- Gaps: missing server checks, persistence gaps, doctor-surface gaps, docs/tests gaps.
- Verification: commands or browser paths run, and what they actually prove.

Ask the user only when the repo cannot answer a clinical or product policy decision.
