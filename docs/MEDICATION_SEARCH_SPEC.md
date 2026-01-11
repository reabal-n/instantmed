# Medication Search Technical Specification

## 1. Data Boundary (Hard Constraint)

The `artg_products` table is a **read-only reference dataset**.

It must never be:
- written to by patient flows
- queried by eligibility logic
- used by approval or triage automation
- used by AI systems for recommendations

Only permitted operation:
- text search for recall purposes

---

## 2. Thin Read API

### Endpoint
`GET /api/medications/search` 

### Inputs
- `q` (string, required)
- `limit` (number, optional, default 15)

### Outputs (strict)
Each result returns only:
- `artg_id` 
- `product_name` 
- `active_ingredients_raw` 
- `dosage_form` 
- `route` 

### API Rules
- No ranking heuristics beyond text relevance
- No synonyms, substitutions, or inferred matches
- No "did you mean"
- No clinical interpretation
- No caching of user queries

This endpoint is **read-only** and must remain stateless.

---

## 3. Patient UX Integration

### Placement
- Intake form
- Optional field
- Never required to proceed

### UI Behavior
- Autocomplete-style dropdown
- Results appear only after user input
- No default or prefilled values

### UX Copy (Required)
Below the field:
> "This helps with record accuracy. A doctor will review everything."

The UI must not:
- suggest correctness
- imply approval
- block progression based on selection

---

## 4. Clinician/Admin View

For clinician visibility only:
- Display what the patient typed
- Display the matched ARTG product (if selected)

Label clearly:
> "Patient-selected (reference only)"

No auto-linking to prescribing actions.

---

## 5. Interaction Logging (Audit-Oriented)

Log the following server-side:
- intake_id
- medication_search_used (boolean)
- medication_selected (boolean)
- selected_artg_id (nullable)

Do NOT log:
- keystrokes
- partial queries
- rejected search results
- inferred intent

Purpose of logging:
- audit traceability
- system behavior verification
- not analytics optimization

---

## 6. Explicit Non-Goals

This system does NOT:
- validate medication correctness
- check availability
- assess suitability
- confirm indications
- influence clinical decisions

Any future expansion beyond recall/search requires:
- explicit policy update
- clinician-only access
- separate risk review

---

## 7. Stability Rule

Once live:
- medication search behavior should change rarely
- schema changes must be additive only
- no "smart" behavior without policy revision

This document is binding for all implementations.
