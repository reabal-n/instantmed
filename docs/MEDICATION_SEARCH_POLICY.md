# Medication Search Policy

## 1. Intent & Scope

The medication search feature exists **solely** to help patients recall and reference the name of a medication they already know.

It is **not**:
- a recommendation tool
- a prescribing tool
- a clinical decision system
- an eligibility or approval mechanism

All prescribing decisions occur **outside this platform**, within the clinician's prescribing system.

---

## 2. Data Source

Medication data is sourced from:
- PBS (Pharmaceutical Benefits Scheme) API
- Department of Health public API

Fields are **reference metadata only**:
- PBS Code
- Drug name
- Strength
- Form
- Manufacturer

The dataset intentionally excludes:
- dosing instructions
- indications for use (clinical interpretation)
- contraindications
- warnings or advice
- therapeutic equivalence

---

## 3. Allowed Use

Medication search may be used to:
- assist patient recall during intake
- improve record accuracy
- support clinician context during review

Medication search may **not** be used to:
- suggest medications
- imply appropriateness
- auto-fill prescriptions
- influence eligibility or triage outcomes
- generate recommendations (human or AI)

---

## 4. Patient-Facing Presentation Rules

### Search framing
- Label: "Medication name (optional)"
- Helper text: "If you know the name, start typing to help us locate it."

### Result display
Each result may show:
- Product name (primary)
- Active ingredient(s) (secondary, muted)
- Dosage form (small, tertiary)

No result may:
- be highlighted as "recommended"
- be framed as "suitable"
- imply approval or entitlement

---

## 5. Language Constraints

Allowed language:
- "Reference only"
- "Helps with accuracy"
- "Doctor will review"

Forbidden language:
- "Recommended"
- "Eligible"
- "Approved"
- "Correct medication"
- "Renewal guaranteed"

---

## 6. Clinical Boundary

- Patient selection is **advisory only**
- Clinicians retain full discretion
- Medication search input has **no authority** in prescribing decisions
- The platform remains an intake + triage layer only

---

## 7. Audit Position (Explicit)

If audited, the position is:

> "Patients may optionally self-identify a medication name using a public reference list.  
> The system does not recommend, select, or approve medications.  
> All prescribing decisions occur independently within the clinician's prescribing platform."

This policy governs **all current and future implementations** of medication search.
