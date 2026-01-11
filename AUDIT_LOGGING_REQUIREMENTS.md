# Lumen Health — Audit Logging Requirements
Version 1.0 — High-Level Guardrails

This document defines **what must be observable and provable** if Lumen Health is audited.
It does not dictate implementation details.

The goal is to demonstrate:
- Clinician involvement
- Clear decision-making
- A defensible timeline of care

---

## Core Principle

If an action affects clinical care or access to care, it must be **reconstructable after the fact**.

Logs exist to prove **who decided what, and when** — not to optimise product analytics.

---

## What Must Be Loggable (High-Level)

The system must be able to reconstruct, at minimum:

### 1. Request Lifecycle
- Request created
- Request reviewed
- Final outcome assigned

Each state must be time-ordered.

---

### 2. Clinician Involvement
For every request:
- A clinician reviewed it
- A clinician selected the final outcome

The system must be able to show **human-in-the-loop review**, not automation.

---

### 3. Triage Outcome
The final triage state must be recorded:
- Approved
- Needs Call
- Declined

Outcome changes must be traceable.

---

### 4. Synchronous Contact Indicators
Where applicable, the system must be able to indicate:
- Whether a call was required
- Whether a call occurred before completion

Exact call content is out of scope.

---

### 5. Prescribing Boundary Evidence
Logs must clearly show that:
- No prescribing action occurred inside the platform
- Prescribing (if any) occurred externally

The platform must never appear to generate prescriptions.

---

## Log Characteristics (Not Implementation)

Audit logs should be:
- Immutable or append-only
- Non-editable after creation
- Time-stamped
- Attributable to a role (e.g. clinician vs system)

Exact storage, schema, and retention period are implementation decisions.

---

## What Logs Are Not For

Audit logs are **not**:
- Decision-support engines
- Analytics dashboards
- A replacement for clinical notes
- A substitute for Parchment records

They exist to support compliance and defensibility only.

---

## Audit Readiness Test

If audited, the system should be able to answer:
- Who reviewed this request?
- When was the decision made?
- What was the outcome?
- Was a call required?
- Where did prescribing occur?

If any answer is unclear, logging is insufficient.
