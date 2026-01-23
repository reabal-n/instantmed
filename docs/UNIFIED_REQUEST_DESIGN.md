# Unified /request Entry Point Design

## Current State

The application has **multiple entry points** for similar flows:
- `/start` → `EnhancedIntakeFlow` (med-cert, repeat-script, new-script, consult)
- `/request` → `UnifiedFlowClient` (medcert, prescription, referral)  
- `/prescriptions/repeat` → `RepeatRxIntakeFlow`

Each has its own state management, step definitions, and UI patterns.

---

## Proposed Architecture

### Single Entry Point: `/request`

```
/request?service=med-cert
/request?service=prescription
/request?service=consult
/request?service=referral
```

### Dynamic Step System

```typescript
// Step registry - maps service to steps
const STEP_REGISTRY: Record<ServiceType, StepDefinition[]> = {
  'med-cert': [
    { id: 'safety', component: SafetyStep },
    { id: 'certificate', component: CertificateDetailsStep },
    { id: 'symptoms', component: SymptomsStep },
    { id: 'details', component: PatientDetailsStep },
    { id: 'checkout', component: CheckoutStep },
  ],
  'prescription': [
    { id: 'safety', component: SafetyStep },
    { id: 'medication', component: MedicationStep },
    { id: 'history', component: MedicationHistoryStep },
    { id: 'details', component: PatientDetailsStep },
    { id: 'checkout', component: CheckoutStep },
  ],
  // ... etc
}
```

### Shared Components (Already Created)

- `EmergencyGate` - Safety screening (✅ done)
- `CheckoutButton` - Payment button (✅ done)
- `SymptomChecker` - Red flag detection (✅ exists)

### State Management

Leverage the existing Zustand store in `lib/flow/store.ts`:

```typescript
// Single store for all flows
const useUnifiedFlowStore = create<UnifiedFlowState>((set, get) => ({
  // Current position
  serviceType: null,
  currentStep: 'safety',
  
  // Form data (generic)
  answers: {},
  identity: null,
  consents: [],
  
  // Navigation
  nextStep: () => { /* dynamic based on serviceType */ },
  prevStep: () => { /* ... */ },
  
  // Persistence
  saveDraft: async () => { /* ... */ },
  loadDraft: async () => { /* ... */ },
}))
```

---

## Implementation Plan

### Phase 1: Step Components (2-3 days)
Extract step components from existing flows:

```
components/request/steps/
├── safety-step.tsx          # Uses EmergencyGate
├── certificate-step.tsx     # Med cert specifics
├── medication-step.tsx      # PBS search integration
├── symptoms-step.tsx        # Symptom selection
├── patient-details-step.tsx # Identity + consents
├── checkout-step.tsx        # Review + payment
└── index.ts
```

### Phase 2: Step Router (1 day)
Create dynamic step router:

```typescript
// components/request/step-router.tsx
export function StepRouter({ serviceType, currentStep }: Props) {
  const steps = STEP_REGISTRY[serviceType]
  const StepComponent = steps.find(s => s.id === currentStep)?.component
  
  if (!StepComponent) return <NotFound />
  
  return <StepComponent />
}
```

### Phase 3: Unified Page (1 day)
Update `/request/page.tsx` to use the new system:

```typescript
// app/request/page.tsx
export default async function RequestPage({ searchParams }) {
  const params = await searchParams
  const serviceType = mapServiceParam(params.service)
  
  return (
    <FlowProvider serviceType={serviceType}>
      <RequestFlow />
    </FlowProvider>
  )
}
```

### Phase 4: Migration (ongoing)
- Redirect `/start` → `/request`
- Deprecate `EnhancedIntakeFlow` after verification
- Update all CTAs to point to `/request`

---

## Benefits

1. **Single source of truth** - One flow system, one state store
2. **Easier maintenance** - Shared components, consistent patterns
3. **Better testing** - Test individual steps in isolation
4. **Flexible** - Easy to add new services or rearrange steps
5. **Compliance** - Safety step always first, consistent consent collection

---

## Migration Path

```
Current:
/start?service=med-cert → EnhancedIntakeFlow
/prescriptions/repeat   → RepeatRxIntakeFlow
/request?service=medcert → UnifiedFlowClient

Target:
/request?service=med-cert     → UnifiedRequestFlow
/request?service=prescription → UnifiedRequestFlow  
/request?service=consult      → UnifiedRequestFlow

Redirects:
/start → /request (preserve params)
/prescriptions/repeat → /request?service=prescription
```

---

## File Structure

```
app/request/
├── page.tsx                 # Server component - auth + data fetching
├── request-flow.tsx         # Client component - flow orchestration
└── layout.tsx               # Optional layout wrapper

components/request/
├── steps/                   # Individual step components
│   ├── safety-step.tsx
│   ├── certificate-step.tsx
│   ├── medication-step.tsx
│   ├── symptoms-step.tsx
│   ├── patient-details-step.tsx
│   └── checkout-step.tsx
├── step-router.tsx          # Dynamic step rendering
├── flow-header.tsx          # Progress indicator + back button
├── flow-footer.tsx          # Navigation buttons
└── index.ts

lib/request/
├── step-registry.ts         # Step definitions per service
├── store.ts                 # Zustand store (extend existing)
├── validation.ts            # Per-step validation
└── types.ts                 # Shared types
```

---

*Last updated: January 2026*
