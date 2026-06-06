# Recovery Lifecycle Review

Generated: 2026-06-06

## Verdict

Partial-intake recovery is sending emails and at least some recovered orders are reaching payment, but the system cannot currently prove which partial draft became which intake. The 30-day baseline shows 14 recovery-marked partial drafts, 2 recovery-attributed paid orders, and 0 `converted_to_intake_id` markers. That is a measurement and lifecycle bug, not enough evidence to conclude that recovery demand is dead.

## Reviewed Files

- `lib/request/server-draft.ts`
- `lib/request/draft-storage.ts`
- `app/api/draft/route.ts`
- `app/actions/unified-checkout.ts`
- `components/request/steps/checkout-step.tsx`
- `components/request/steps/review-step.tsx`
- `lib/stripe/checkout/persistence.ts`
- `lib/stripe/guest-checkout.ts`
- `lib/email/partial-intake-recovery.ts`
- `lib/email/abandoned-checkout.ts`

## Findings

### Is the server draft session id available to checkout?

No. `lib/request/server-draft.ts` keeps the active server draft id inside private `getStoredSessionId(service)`, and neither `checkout-step.tsx` nor `review-step.tsx` can read it. `app/actions/unified-checkout.ts` also has no `serverDraftSessionId` field on `UnifiedCheckoutInput`, so checkout cannot carry the partial draft id into persistence.

### Is `converted_to_intake_id` ever written?

No current write path was found. `app/api/draft/route.ts` reads only unconverted drafts with `.is("converted_to_intake_id", null)`, but its terminal mutation is DELETE. Authenticated checkout creates the intake in `lib/stripe/checkout/persistence.ts`; guest checkout creates it in `lib/stripe/guest-checkout.ts`; neither updates `partial_intakes.converted_to_intake_id`.

### Are successful checkouts deleting draft rows, leaving rows untouched, or marking conversion?

Checkout success is not connected to the server draft row. Local draft cleanup can call `clearDraft(service)`, and that imports `deleteServerDraft(service)`, which deletes the server row. The checkout actions themselves do not call conversion marking, and they do not receive enough input to do it.

### Does recovery link resumption preserve the same draft id through checkout?

Not reliably. `lib/email/partial-intake-recovery.ts` includes `d=<session_id>` in the recovery URL, and `components/marketing/intake-resume-chip.tsx` can fetch by explicit id. However, the resumed id is not exposed to checkout and is not guaranteed to be persisted back into the active localStorage server-draft key before payment. A recovered patient can therefore complete payment while the original `partial_intakes` row remains unconverted.

### Which email templates are active, previewable, and covered by tests?

`PartialIntakeRecoveryEmail` is active because `lib/email/partial-intake-recovery.ts` imports it directly, but it is not exported from `lib/email/components/templates/index.ts`, is not registered in the dev email preview, and is not covered by `lib/__tests__/email-templates.test.tsx`. Abandoned checkout and follow-up templates are exported, previewed, and covered, but the sender still hardcodes the initial subject instead of using `abandonedCheckoutSubject()`.

## Required Fix Order

1. Expose the active server draft session id from `lib/request/server-draft.ts`.
2. Pass `serverDraftSessionId` from both checkout components into `createCheckoutFromUnifiedFlow`.
3. Add `serverDraftSessionId` to unified/authenticated/guest checkout input types.
4. Mark the matching `partial_intakes` row converted after a durable intake insert.
5. Keep explicit user discard as DELETE; checkout success must be conversion marking, not deletion.
6. Export and preview the partial-intake recovery template after the lifecycle marker is fixed.
