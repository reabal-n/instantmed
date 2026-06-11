# NHSD_REGISTRATION.md — National Health Services Directory listing

> **Status: DONE (2026-06-11).** InstantMed is registered in Provider Connect
> Australia (PCA) and **published to NHSD (Consumers + Providers), Services `1 of 1`,
> consent accepted**. Org Publisher status = Approved/Active. Practitioners
> published = `0 of 1` (founder's name deliberately removed — no doctor name on the
> listing).
>
> **Live listing:** https://www.healthdirect.gov.au/australian-health-services/healthcare-service/loc/name/type/71eacff6-eb7a-4208-bc98-0520560b11b6
> · NHSD healthcare-service identifier: `71eacff6-eb7a-4208-bc98-0520560b11b6`. NHSD
> validates before full propagation, so allow a few days; healthdirect's Service
> Finder is a JS app (not server-rendered), so verify the rendered name/description
> and the absence of doctor names in a browser.
>
> This doc is the as-built record + redo guide. It corrects two earlier wrong
> assumptions: NHSD has **no "Telehealth" service type** (the portal rejects it),
> and you create **one** service, not four.

---

## The route: Provider Connect Australia (PCA), not direct-NHSD

Register via **PCA** (Australian Digital Health Agency) — you maintain your info
once and tick a box to publish to NHSD. Then publish: **org → "Partner services"
tab → "Publish to partner services."** The direct-NHSD portal is the old way; PCA is
the system InstantMed is set up in.

Login: PCA portal (Reabal's ADHA/PRODA account). Org: INSTANTMED PTY. LTD.

---

## ⚠ Compliance guardrails (apply to every free-text field)

- **Never state doctor count or individual doctor names.** Use "AHPRA-registered
  doctors". Do **not** publish practitioner records to NHSD (we set Practitioners =
  `0 of 1`).
- **No outcome promises** ("guaranteed", "always accepted", "approved in X minutes").
- **No "no call needed" framing for prescribing** — for Rx/ED/hair the doctor *may*
  contact the patient. (The banned phrasing is "contacting you only if more
  information is clinically needed".)
- Factual only: AHPRA-registered doctors review a structured online form; documents /
  eScripts delivered digitally.

---

## 1. Organisation

Already registered + ABR-validated. For reference / re-entry:

| Field | Value |
|-------|-------|
| Legal name | `INSTANTMED PTY. LTD.` |
| ABN | `64 694 559 334` |
| Postal address | `Level 1/457-459 Elizabeth Street, Surry Hills NSW 2010` |
| Org phone / email | `0450 722 549` / `hello@instantmed.com.au` |
| Website | `https://instantmed.com.au` |
| HPI-O for CSP | None provided (left blank — fine; not required) |

---

## 2. Location (PCA "Add a location")

| Field | Value |
|-------|-------|
| Advertised name | `InstantMed Telehealth` |
| Location type | **Virtual – delivers healthcare services virtually** ← the key field (no walk-in clinic) |
| Currently providing services | ✅ on |
| Amenities (wheelchair/toilet…) | leave blank (physical-premises only) |
| Phone / email | `0450 722 549` / `hello@instantmed.com.au` |
| Website | `https://instantmed.com.au` (⚠ not an email — easy to fat-finger) |
| Postal address | `Level 1/457-459 Elizabeth Street, Surry Hills NSW 2010` |

---

## 3. Healthcare service — ONE service (PCA "Add a healthcare service")

> **Critical:** the service **Type** must be **`General practice`** (a supported
> NHSD type). Do **NOT** search "Telehealth service" / "Telehealth Clinic" — the
> portal shows *"NHSD does not support this healthcare service type… it will not
> display on the Service Finder"* and the listing goes invisible. Telehealth is a
> *delivery mode* (Virtual location + the "also delivered virtually" tick), not a
> service type. Create **one** General practice service; list the offerings (certs,
> scripts, ED, hair) in the description — NHSD has no per-offering service types.

| Field | Value |
|-------|-------|
| Service type | **`General practice`** (supported — no warning banner) |
| Service name | `InstantMed Telehealth - General practice` (auto-fills; fine to leave) |
| "This service is also delivered virtually" | ✅ tick it |
| Contact | business phone/email only (not a personal mobile) |

**Service description (public, ≤500 chars — compliant version):**

> InstantMed is an Australian telehealth service for adults who want a doctor
> without the wait: medical certificates, repeat prescriptions, and hair-loss and
> erectile-dysfunction assessments. An AHPRA-registered doctor reviews your secure
> online form and may contact you if clinically needed. Approved documents and
> eScripts are delivered digitally and fill at any Australian pharmacy. Available 7
> days. Medicare optional for certificates, required for prescriptions. Full refund
> if declined.

**Availability:** Available 7 days / requests 24-7. **Do not** enter a guaranteed
turnaround (no customer-facing SLA). Don't publish bank/credentials — not needed.

---

## 4. Publish + practitioners

- **Practitioners: do not publish.** Remove the founder as a published practitioner
  (we left it at `0 of 1`) — keeps doctor names off the public listing.
- **Publish:** org → **Partner services** tab → **"Publish to partner services"** →
  confirm **NHSD for Consumers** shows **Services `1 of 1`** (and NHSD for Providers).
  That consumer row is the public Service Finder entry — the whole goal.
- **Skip the practitioner "Publishing" flow** entirely (personal contact details,
  bank account, credential documents, "add business partners") — it's for individual
  practitioners sharing personal info; irrelevant here and we don't publish it.

---

## 5. Partner-service hygiene (which to keep / remove)

PCA offers ~37 partners. **Keep:** NHSD (Consumers + Providers) — the goal — and the
**PHNs** (Primary Health Networks: Brisbane North, BSPHN, Country to Coast QLD,
Country SA, COORDINARE, Capital Health ACT, Healthy North Coast, etc.) + **NSW
Health** — legitimate primary-care directories you do serve via telehealth; harmless,
zero removal value. **Remove** (category errors / software you don't use): Australian
Podiatry Association, Association of Massage Therapists, RxTro, Inca (Precedence
Health Care), Health Hunter. They add no backlink value and read as miscategorised.

> Note: PHN/partner feeds are **internal/B2B data shares, not public crawlable
> backlinks.** The only public, LLM-/Google-read directory in this set is **NHSD's
> Service Finder.** Don't bulk-add partners chasing "backlinks" — there aren't any.

---

## 6. Accreditation / facts (if asked)

| Field | Value |
|-------|-------|
| Registration | All consulting doctors hold current AHPRA registration |
| Certification | LegitScript certified — ID `48400566` |
| Privacy | Australian Privacy Principles compliant; data stored in Australia (`/privacy`) |

---

## 7. Maintenance

- Re-verify the listing when prices/services change — keep it consistent with the
  `/compare/online-medical-certificate-options` price table and live `PRICING_DISPLAY`.
- Founding year: **2026**. Women's health / weight loss are **not** listed (unlaunched).
