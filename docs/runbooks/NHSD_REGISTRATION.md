# NHSD_REGISTRATION.md — National Health Services Directory listing (field-values sheet)

> **Goal.** Get InstantMed listed in the **National Health Services Directory (NHSD)**
> — a Healthdirect/Australian-government directory (`.gov.au`). It is one of the
> uncontested third-party citation surfaces in the organic/GEO plan: a high-trust,
> indexable listing that LLM answers and Google both weight. NextClinic has one;
> InstantMed does not yet.
>
> **This sheet is paste-ready.** Every value below is approved copy you can enter
> directly. Items marked **⚠ confirm at portal** depend on the live form (NHSD uses
> SNOMED CT-AU service types and a FHIR data model, so some pick-lists only appear
> once you're in). Items marked **🔒** need an operator detail not in the repo.

---

## How to register (two pathways)

1. **Direct NHSD:** https://www.healthdirect.gov.au/register-with-nhsd → "Register an
   organisation" (service-desk portal).
2. **Provider Connect Australia™ (PCA™)** via the Australian Digital Health Agency,
   then publish to NHSD. PCA also lets you push the same data to other partners.

Have ready: ABN, organisation details, service details, and (optionally)
practitioner details. NHSD validates submissions before they go live.

---

## ⚠ Compliance guardrails for the listing copy (read first)

These are InstantMed's standing public-surface rules — apply them to every free-text
field:

- **Never state doctor count or individual doctor names.** Use **"AHPRA-registered
  doctors"**. A governance role may be described as **"AHPRA-registered Medical
  Director"** only where a single named governance contact is genuinely required.
- **No outcome promises** ("guaranteed", "always accepted", "approved in X minutes").
  Describe the *service*, not a result.
- **No "no call needed" framing for prescribing.** For Rx/ED/hair, the doctor may
  contact the patient if clinically needed.
- Keep it factual: AHPRA-registered doctors review a structured online form; documents
  / eScripts are delivered digitally.

---

## 1. Organisation (FHIR `Organization`)

| Field | Value (paste) | Notes |
|-------|---------------|-------|
| Legal/organisation name | `InstantMed Pty Ltd` | |
| Trading/display name | `InstantMed` | |
| ABN | `64 694 559 334` | NHSD validates against ABR |
| Organisation type | Telehealth / online medical service | ⚠ select nearest SNOMED CT-AU org type at portal |
| Website | `https://instantmed.com.au` | |
| Public contact email | `support@instantmed.com.au` | |
| Public contact phone | `0450 722 549` | |
| Registered address | `Level 1/457-459 Elizabeth Street, Surry Hills NSW 2010` | Administrative address; care is delivered Australia-wide via telehealth (see §2) |
| HPI-O (organisation healthcare identifier) | 🔒 ____ | Provide if InstantMed holds one; otherwise leave blank |

---

## 2. Location / service delivery (FHIR `Location`)

| Field | Value (paste) | Notes |
|-------|---------------|-------|
| Delivery mode | **Telehealth (online)** — Australia-wide | ⚠ tick the telehealth / virtual-care flag; InstantMed has no walk-in clinic |
| Physical/visiting address | Not applicable (online service) | If the form forces a physical address, use the §1 registered address and mark it administrative/non-visiting |
| Coverage area | Australia (all states & territories) | Patients must be physically in Australia |
| Languages | English | |

---

## 3. Health service(s) (FHIR `HealthcareService`)

> List InstantMed's **active** service lines only. Women's health and weight
> management are not launched — **do not list them.** General consult was retired.

**Service 3a — Online medical certificates**
| Field | Value (paste) |
|-------|---------------|
| Service name | `Online medical certificates` |
| Category / type | General practice / medical certificate (telehealth) — ⚠ map to SNOMED CT-AU |
| Description | `AHPRA-registered doctors review a structured online request and, if clinically appropriate, issue a medical certificate delivered digitally. For routine work, study and carer's leave. Australia-wide telehealth.` |
| Eligibility | `Adults 18+ in Australia (parental consent for minors). Medicare not required.` |
| Fees | Private fee, from `$24.95` (no Medicare rebate) |

**Service 3b — Repeat prescriptions (eScripts)**
| Field | Value (paste) |
|-------|---------------|
| Service name | `Repeat prescriptions online` |
| Description | `AHPRA-registered doctors review a structured online request for an existing, ongoing medication and, if clinically appropriate, issue an eScript token. The doctor may contact you if more information is needed. Controlled substances are not prescribed online.` |
| Eligibility | `Adults 18+ in Australia. Medicare required.` |
| Fees | Private fee, from `$29.95` |

**Service 3c — Erectile dysfunction assessment**
| Field | Value (paste) |
|-------|---------------|
| Service name | `Erectile dysfunction (ED) assessment` |
| Description | `AHPRA-registered doctors review a structured ED health assessment and, if clinically appropriate, arrange treatment. The doctor may contact you if clinically needed.` |
| Eligibility | `Adults 18+ in Australia. Medicare required.` |
| Fees | Private fee, from `$49.95` |

**Service 3d — Hair loss assessment**
| Field | Value (paste) |
|-------|---------------|
| Service name | `Hair loss assessment` |
| Description | `AHPRA-registered doctors review a structured hair-loss assessment and, if clinically appropriate, arrange treatment. The doctor may contact you if clinically needed.` |
| Eligibility | `Adults 18+ in Australia. Medicare required.` |
| Fees | Private fee, from `$49.95` |

---

## 4. Availability / hours (FHIR `HealthcareService.availableTime`)

| Field | Value (paste) | Notes |
|-------|---------------|-------|
| Request submission | `24/7, every day` | Patients can submit any time |
| Doctor review hours | `8:00am–10:00pm AEST, 7 days` (for prescriptions/consults) | Medical certificates are reviewed continuously |
| Stated turnaround | Leave blank or `Doctor review, typically same day` | ⚠ Do **not** enter a guaranteed time — no customer-facing SLA |
| Public holidays | `Requests accepted; review timing may vary` | |

---

## 5. Practitioners (FHIR `Practitioner` / `PractitionerRole`) — OPTIONAL

> **Operator decision.** NHSD can list individual practitioners, but InstantMed's
> public-surface rule is to **not** disclose doctor count or names. Options:
> - **Preferred:** list the **organisation/service only** (skip practitioner records),
>   described as staffed by *AHPRA-registered doctors*.
> - **If a named contact is mandatory:** list a single **AHPRA-registered Medical
>   Director** as the governance contact — 🔒 name + AHPRA number: ____ — and nothing
>   that implies team size, FRACGP, or peer review unless formally verified.

---

## 6. Endpoints / online presence (FHIR `Endpoint`)

| Field | Value (paste) |
|-------|---------------|
| Public website | `https://instantmed.com.au` |
| Online booking / intake URL | `https://instantmed.com.au/request` |
| Telehealth platform | InstantMed (own platform; asynchronous, form-first) |

---

## 7. Accreditation / credentials (if asked)

| Field | Value (paste) | Notes |
|-------|---------------|-------|
| Practitioner registration | All consulting doctors hold current AHPRA registration | |
| Certification | LegitScript certified — ID `48400566` | Telehealth/pharmacy certification |
| Privacy | Australian Privacy Principles (APP) compliant; data stored in Australia | See `/privacy` |

---

## 8. After it's live

- Record the **NHSD organisation identifier** returned on approval here: 🔒 ____
  (it can be added to Provider Connect Australia and other directories).
- Add the live NHSD listing URL to the operator's citation-surface tracker.
- Re-verify the listing annually (or when prices/services change) — keep it consistent
  with the `/compare/online-medical-certificate-options` table and the live pricing.

---

*Sources: Healthdirect NHSD registration (https://www.healthdirect.gov.au/register-with-nhsd),
NHSD FHIR R4 data model (Organisation/Location/HealthcareService/Practitioner/Endpoint).
Exact field labels and SNOMED CT-AU pick-lists appear in the live portal — items above
marked ⚠ are mapped to the nearest standard resource.*
