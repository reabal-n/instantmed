# Lumen Health — Prescribing Workflow Boundary
Version 1.0 — Non-Negotiable Separation

This document defines the **hard boundary** between the Lumen Health platform and prescribing activity.

---

## Core Principle

Lumen Health does **not prescribe**.

It facilitates intake, triage, and clinician review.
All prescribing decisions and actions occur **outside the platform**.

---

## Platform Scope (Allowed)

Within Lumen Health, the platform may:
- Collect patient-reported information
- Present intake data to clinicians
- Support triage decisions
- Record clinician outcomes
- Indicate that prescribing may occur externally

The platform may **never** generate a prescription.

---

## Prescribing Scope (External Only)

Prescribing actions must occur:
- Outside the Lumen Health system
- Within a dedicated prescribing platform (e.g. Parchment)
- Through explicit clinician action

No prescribing logic exists inside Lumen Health.

---

## Data Boundary

Lumen Health may:
- Display intake data to clinicians
- Allow clinicians to reference patient details
- Export or copy information for external use

Lumen Health must not:
- Generate dosage instructions
- Create prescription artefacts
- Imply prescription approval
- Auto-populate or submit prescriptions

---

## Automation Constraints

The platform must not:
- Auto-initiate prescriptions
- Auto-suggest medications
- Auto-complete prescribing workflows
- Create outputs that resemble a prescription

Any automation must stop **before prescribing begins**.

---

## Copy & UX Boundary

User-facing language must:
- Reflect clinician-led assessment
- Avoid implying prescriptions are issued by the platform
- Avoid guarantees or outcomes related to prescribing

Prescribing is framed as:
> a possible outcome of clinician review, occurring separately

---

## Audit Narrative Alignment

If reviewed, the system must clearly show:
- Lumen Health ends at clinical assessment and triage
- Prescribing responsibility lies entirely with the clinician
- External systems are used for prescription generation

This boundary must remain true regardless of future feature expansion.
