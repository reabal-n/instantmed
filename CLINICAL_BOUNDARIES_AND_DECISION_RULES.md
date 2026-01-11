# Lumen Health — Clinical Boundaries & Decision Rules
Version 1.0 — Firm Constraints

This document defines the non-negotiable operational boundaries of the platform.
These rules govern triage, clinician authority, and request outcomes.

---

## Platform Role (Audit Narrative)

Lumen Health is **not a prescribing system**.

It is an **intake, triage, and documentation platform** that supports clinician decision-making.

All prescribing decisions occur outside the platform.

---

## Clean Audit Narrative (Must Remain True)

- Patient self-identifies symptoms and history
- Platform assists intake and triage only
- No automated clinical decisions are made
- Clinician reviews every request
- Prescribing (if any) occurs entirely in Parchment
- The clinician remains fully responsible

Everything built must support this narrative.

---

## Mandatory Clinician Decision Checkpoint

Every request must end in **one explicit outcome**:

- Approved
- Needs Call
- Declined

No defaults.
No silent automation.
A clinician must actively select the outcome.

---

## Triage Outcome Definitions

### Approved
- Clinician is satisfied the request is clinically appropriate
- No synchronous contact required
- Any prescribing occurs outside the platform

---

### Needs Call
- New, unclear, or escalating presentation
- Conflicting or incomplete information
- Any clinician uncertainty

No prescribing until the call occurs.

---

### Declined
- Outside scope
- Unsafe or inappropriate for online care
- Red-flag or high-risk presentation
- Repeated misuse

Declines require a brief internal rationale.

---

## Auto-Reject Rules (System-Level)

Requests are immediately declined if they involve:

- Emergency or urgent symptoms
- Red-flag presentations
- Controlled or restricted substances
- First-time requests for high-risk treatments
- Requests clearly outside GP scope

Outcome: Declined + redirection advice.

---

## Asynchronous vs Synchronous Boundaries

### Never Asynchronous
- New diagnoses
- New long-term medications
- Symptom escalation
- Ambiguous or conflicting histories
- Any clinician discomfort

---

### May Be Asynchronous (Clinician Discretion)
- Administrative documentation
- Repeat treatment requests with reported stability
- Low-risk, clearly defined presentations

Efficiency never overrides safety.

---

## Lightweight Clinical Rules Engine

The platform may apply **deterministic rules** to assist triage:

Examples:
- High-risk category → force "Needs Call"
- Escalation markers → disable async completion

Characteristics:
- Logic-based only
- Server-side
- Fully logged
- Explainable

This is not AI and does not replace clinician judgment.

---

## Final Safety Rule

If a clinician is unsure, the correct outcome is:

**Needs Call**

Speed is never a clinical justification.
