# InstantMed Business Plan

> **Authority:** durable business strategy, positioning, service boundaries, and business-model decisions.
> This file does not own the current operating phase, priority order, live metrics, revenue milestones, contribution formulas, or hiring thresholds. Those live in `docs/ROADMAP.md`, the admin dashboard, and `docs/REVENUE_MODEL.md`.

**Last updated:** 2026-07-12

---

## 1. Strategic Verdict

InstantMed is a specialised, form-first Australian telehealth service. It is not a broad online GP clinic.

The business is built around one-off, clearly scoped services that can be delivered safely with low booking friction. Acquisition is in scope for launched services when public claims are accurate, paid-order measurement is trustworthy, first-order contribution is understood, and clinical, queue, refund, and support health remain controlled.

## 2. Non-Negotiable Business Decisions

| Decision | Rule |
|----------|------|
| **Business model** | One-off transactions only for now. No subscriptions, memberships, bundles, or pharmacy fulfilment until deliberate expansion gates pass. |
| **Active services** | Medical certificates, repeat prescriptions, erectile dysfunction, hair loss, and narrowly scoped women's health (UTI + new/switch contraceptive pill). |
| **Gated/retired services** | Weight loss remains gated. General Consult is retired and cannot be used as a fallback route around structured screeners. |
| **Fulfilment** | eScript token only for prescribing services. No owned pharmacy, delivery, inventory, or dispensing margin in this phase. |
| **Moat** | No booking friction: patients start with a secure clinical form. A doctor may call or message whenever clinically needed. |
| **Clinical control** | The website must never promise that prescribing requests will not need doctor contact. Eligible low-risk med-cert requests may use the logged, doctor-owned protocol described in `docs/CLINICAL.md`. |
| **Growth posture** | Launched services may run as low-budget, bounded acquisition pilots. Material scaling requires the economic gates in `docs/REVENUE_MODEL.md` and explicit operator approval. |
| **Revenue direction** | Work through the milestone ladder in `docs/REVENUE_MODEL.md`. $1M annual gross remains a distant directional north star, not the active operating target. |
| **Operator model** | One owner-operator account holds the sole `admin` role and inherits doctor capabilities. Future clinicians use `doctor`; non-clinical operators use `support`. |

## 3. Product Priority

This is the durable service hierarchy, not the current execution queue. `docs/ROADMAP.md` is the sole owner of work order.

| Rank | Service | Role | Rationale |
|------|---------|------|-----------|
| 1 | Medical certificates | Revenue engine | Lowest operational friction and strongest fit for protocolised, doctor-owned administrative review. |
| 2 | Repeat prescriptions | Second core product | Clear existing-treatment intent and natural trust expansion after an earlier order. |
| 3 | Hair loss | Specialist line | Higher AOV, one-off only, with a bounded clinical and advertising surface. |
| 4 | ED | Specialist line | High intent and higher AOV, with stricter contraindication, privacy, and advertising risk. |
| 5 | Women's health | Narrow specialist line | UTI + new/switch pill only. Avoid broad "women's health clinic" positioning. |

Weight loss is not part of the active hierarchy. It remains a reserved, gated subtype until clinical, monitoring, advertising, and staffing readiness are explicitly approved.

General Consult was retired publicly on 2026-05-20. The `consult` service type stays in code as the parent category for ED, hair-loss, and women's-health subtypes only. `/consult` renders a services overview and `/general-consult` redirects to it. Cases outside the specialised service lines route to a GP or in-person care, not into a generic paid request.

The launched non-med-cert services are approved to remain live as low-budget bounded pilots. `docs/SERVICE_LAUNCH_CHECKLISTS.md` owns the clinical, fulfilment, compliance, and evidence gates for keeping a pilot healthy or materially scaling it.

## 4. Positioning

### Platform Positioning

InstantMed gives Australians a faster way to request common medical services without booking an appointment or sitting in a waiting room.

### Approved Platform Wedge

> No appointment. No waiting room. Start with a secure clinical form.

### Approved Prescribing/Specialty Wedge

> Complete a secure clinical form. A doctor reviews it and may call you briefly before prescribing.

This keeps a possible doctor call visible for ED, hair loss, new/repeat scripts, and women's health. It does not frame contact as a rare exception.

### Approved Med Cert Wedge

Use only on med-cert surfaces where the protocol supports it:

> No video. No call. No appointment.

### Do Not Use

- "No doctor"
- "Guaranteed prescription" or "Guaranteed treatment"
- "No call needed" on any prescribing or specialty-service surface
- "Doctor approves in 2 hours or your money back"
- "Accepted by all employers" or unsupported acceptance rates
- "Special consideration" or "deferred exam" as supported use cases

## 5. Growth Principles

The business should:

- keep public facts and eligibility accurate before distributing them
- measure paid orders and net-retained revenue from payment truth
- improve service-level contribution before increasing budgets
- use existing patient trust for appropriate one-off repeat requests
- compound compliant organic and external-authority distribution
- reduce support work and doctor minutes without weakening accountability

The current channel sequence and checkpoints live only in `docs/ROADMAP.md`.

## 6. Owner-Doctor Operating Model

The owner-operator is both the sole human admin and a treating doctor. The `admin` role inherits doctor capabilities, so a separate admin and doctor account is neither required nor desired.

The model works only while the platform reduces active doctor minutes per order without weakening clinical accountability:

| Service | Operating rule |
|---------|----------------|
| Med certs | Protocol automation for suitable low-risk requests, followed by individual doctor review and QA. |
| Repeat prescriptions | Doctor-reviewed one-off eScript request. Call/message if unclear, new, unstable, high-risk, or incomplete. |
| Hair loss | One-off form-first doctor assessment. No subscription, outcome guarantee, or drug-name acquisition marketing. |
| ED | One-off form-first doctor assessment with strict contraindication screening. |
| Women's health | Narrowly scoped services only. Complex cases route to GP or in-person care. |
| Weight loss | Gated. No paid requests or advertising until a deliberate launch decision changes the canon. |

Future clinical capacity is added with `doctor` accounts and capability flags. Future non-clinical operations capacity is added with bounded `support` accounts. The security and access implementation is owned by `docs/SECURITY.md` and `docs/ARCHITECTURE.md`.

## 7. Durable Moat

The moat is not "no doctor." It is:

- no booked appointment
- no waiting room
- form-first clinical intake
- doctor ownership of every clinical pathway
- clear pricing and full refund on decline
- eScript delivery to an Australian pharmacy when approved
- doctor-owned med-cert protocol automation for suitable administrative requests
- employer verification and auditable digital delivery

## 8. Operating Invariants

InstantMed is ready to grow only while:

- compliance copy is clean across marketing, ads, metadata, schema, and email
- prescribing services never promise approval or no doctor contact
- med-cert automation stays logged, auditable, and doctor-owned
- refunds, disputes, queue health, support load, and doctor capacity remain visible
- paid acquisition follows the first-order contribution rule
- every material Ads mutation is approved by the operator

Live values belong in the admin dashboard. Milestones and thresholds belong in `docs/REVENUE_MODEL.md`.

## 9. Expansion Boundaries

Do not add subscriptions, pharmacy fulfilment, staff-heavy follow-up, broader GP services, or high-volume weight management merely because revenue increases.

Expansion requires all of the following categories to be healthy:

- first-order contribution and net-retained revenue
- refund and chargeback performance
- doctor queue and active-review capacity
- support burden
- clinical QA and incident readiness
- advertising and SEO compliance

The numeric decision rules and hiring/capacity triggers live only in `docs/REVENUE_MODEL.md`. The current decision queue lives only in `docs/ROADMAP.md`.
