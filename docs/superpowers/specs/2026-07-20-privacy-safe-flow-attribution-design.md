# Privacy-Safe Flow Attribution Design

**Status:** Approved for implementation on 2026-07-20.

## Goal

Measure conversion and intake friction by a real intake attempt without identifying
the patient, recording clinical content, or adding any new patient-facing gate.

The canonical unit is a random `flow_instance_id` created for each fresh intake
attempt. It follows that attempt from the client draft through checkout and
confirmed purchase. Raw event occurrences remain available for retry analysis, but
conversion and drop-off use unique flow attempts.

## Non-Goals

- No new eligibility, identity, clinical, or validation questions.
- No stricter rejection rules.
- No redesign of patient intake or checkout.
- No staff timer or broad attribution platform.
- No backfill that fabricates exact identifiers for historical events.
- No search queries, health keywords, click IDs, clinical answers, free text, or
  patient/staff/database identifiers in PostHog.

## Identifier Contract

`flow_instance_id` is a random UUID v4 with no encoded meaning.

- Mint it when a fresh intake attempt begins.
- Persist it in the Zustand/localStorage draft and service-scoped draft.
- Persist it in `partial_intakes` for authenticated cross-device draft restore.
- Persist it in `intakes` and Stripe Checkout metadata.
- Carry it into server-side payment and purchase events.
- Keep the same ID for payment retries belonging to the same intake.
- Mint a new ID for a genuinely fresh attempt after reset or a new legacy draft
  that has no existing ID.
- Treat malformed IDs as absent and create or omit them at the appropriate trust
  boundary. Never accept an arbitrary analytics identifier.

The database columns are nullable UUIDs so deployment is backwards compatible and
old rows remain valid.

## Data Flow

```text
fresh service selection
  -> flow_instance_id UUID
  -> request store + local/service draft
  -> partial_intakes.flow_instance_id
  -> checkout action
  -> intakes.flow_instance_id
  -> Stripe metadata.flow_instance_id
  -> confirmed payment finalization
  -> privacy-sanitized PostHog events
```

The ID is operational attribution metadata. It must not be copied into the clinical
`answers` payload.

## Analytics Contract

All intake funnel events may include:

- `flow_instance_id`
- controlled service/subtype and step identifiers
- controlled campaign, ad group, and creative identifiers when available
- non-identifying technical context already approved by the PostHog privacy
  sanitizer

They must not include:

- email, name, phone, date of birth, Medicare/IHI, or address
- production intake, patient, profile, or staff IDs
- intake answers, symptoms, medicine names, free text, or clinical decisions
- `gclid`, `gbraid`, `wbraid`, search query, keyword, or `utm_term`

The funnel query returns two measures:

1. **Attempts:** unique valid `flow_instance_id` values. Historical rows fall back
   to an explicitly approximate session/distinct identifier.
2. **Occurrences:** raw event count, used only to show retries or repeated actions.

Stage conversion, drop-off, and friction use attempts. Retry occurrences are shown
separately and never added directly to the friction score.

## Failure Behaviour

- Analytics failure must never block intake, checkout, payment, or fulfilment.
- Missing or invalid flow IDs are tolerated during rollout.
- Draft restoration must preserve an existing valid ID and repair a missing legacy
  ID without asking the patient anything.
- Database rollout happens before application rollout so new writes cannot fail on
  missing columns.
- Old application code remains compatible with the nullable columns.

## Staff UI

The existing analytics page keeps its current layout. Copy changes only:

- funnel counts are labelled as unique attempts;
- repeat interactions are labelled as retries;
- legacy fallback is described as approximate where relevant.

No decorative motion or new dashboard surface is introduced.

## Verification

- Unit/contract tests prove generation, validation, draft restore, checkout
  propagation, Stripe metadata, purchase propagation, sanitization, and
  attempt-versus-occurrence aggregation.
- Supabase migration and advisors are checked.
- Full `release:check` passes.
- The staff analytics route is verified in a real browser at desktop and mobile,
  in light and dark mode.
- Production health and runtime errors are checked after deployment.
