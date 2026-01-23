# Flow Consolidation Assessment

## Current State

The application has **two parallel intake flows** with different architectures:

### 1. EnhancedIntakeFlow (`components/intake/enhanced-intake-flow.tsx`)
- **Used by**: `/start` page, medical certificates, new prescriptions, consults
- **Steps**: `service` → `details` → `safety` → `account` → `review`
- **Size**: ~2,359 lines
- **State management**: Local useState + useFormAutosave hook
- **Checkout**: Uses both `createIntakeAndCheckoutAction` and `createGuestCheckoutAction`

### 2. RepeatRxIntakeFlow (`components/repeat-rx/intake-flow.tsx`)
- **Used by**: `/prescriptions/repeat` page
- **Steps**: `safety` → `auth` → `medication` → `history` → `medical_history` → `attestation` → `review` → `payment` → `confirmation`
- **Size**: ~1,474 lines
- **State management**: Local useState
- **Checkout**: Uses `createIntakeAndCheckoutAction`

### 3. Legacy Flows (deprecated but present)
- `app/request/unified-flow-client.tsx` - Older unified flow
- `app/start/unified-flow-client.tsx` - Start flow variant
- `app/medical-certificate/request/med-cert-flow-client.tsx` - Dedicated med cert flow (redirects to /start)

---

## Key Differences

| Aspect | EnhancedIntakeFlow | RepeatRxIntakeFlow |
|--------|-------------------|-------------------|
| Safety step position | Step 3 (after details) | Step 1 (first) |
| Auth handling | Built into account step | Dedicated auth step |
| Medication search | Inline PBS search | Dedicated step with SafetyStep |
| Medical history | Part of details | Separate step |
| Attestation | Part of review | Dedicated step |
| Guest checkout | Yes | Yes (via guest button) |

---

## Consolidation Recommendation

### Recommendation: **Partial Consolidation (Medium Priority)**

Full consolidation is not recommended at this time due to:
1. **Clinical workflow differences** - Repeat prescriptions have stricter safety requirements (safety FIRST)
2. **Regulatory compliance** - RepeatRx has specific attestation requirements
3. **Risk of regression** - Both flows are working; major refactor could introduce bugs

### Suggested Approach

#### Phase 1: Extract Shared Components (Low effort, High value)
Create a shared component library:

```
components/intake/shared/
├── safety-gate.tsx          # Emergency symptom checker
├── account-step.tsx         # Personal details form
├── review-summary.tsx       # Order review display
├── checkout-button.tsx      # Payment button with loading
├── progress-indicator.tsx   # Step progress display
└── trust-badges.tsx         # AHPRA, encryption badges
```

#### Phase 2: Unified State Store (Medium effort)
Extend `lib/flow/store.ts` (Zustand) to handle both flow types:
- Already has service selection, answers, identity data
- Add prescription-specific fields
- Add flow-type discriminator

#### Phase 3: Single Entry Point (Future)
Consider a single `/request` route with:
- Service type as URL param
- Dynamically rendered steps based on service
- Shared checkout logic

---

## Immediate Actions (Quick Wins)

1. ✅ **Already shared**: `createIntakeAndCheckoutAction`, `createGuestCheckoutAction`
2. ✅ **Already shared**: PBS medication search component
3. ✅ **Now shared**: Safety/emergency gate component (`components/shared/emergency-gate.tsx`)
4. ✅ **Now shared**: Checkout button component (`components/shared/checkout-button.tsx`)
5. ✅ **Now shared**: Shared intake index (`components/shared/intake/index.ts`)
6. ⬜ **Should share**: Progress indicator

---

## Files to Potentially Deprecate

Once consolidation is complete:
- `app/request/unified-flow-client.tsx` - Already unused?
- `app/start/unified-flow-client.tsx` - Replaced by EnhancedIntakeFlow
- `app/medical-certificate/request/med-cert-flow-client.tsx` - Already redirects

---

## Estimated Effort

| Phase | Effort | Risk | Value |
|-------|--------|------|-------|
| Phase 1 (Shared components) | 2-3 days | Low | High |
| Phase 2 (Unified store) | 1 week | Medium | Medium |
| Phase 3 (Single entry) | 2-3 weeks | High | High |

---

## Decision

**For now**: Keep both flows separate but extract shared components incrementally.

**Rationale**: 
- Both flows work correctly
- Clinical safety requirements differ between services
- Incremental extraction reduces risk
- Team can consolidate when bandwidth allows

---

*Last updated: January 2026*
*Author: Cascade (automated assessment)*
