# Unified Request Flow

The unified `/request` entry point consolidates all clinical intake flows into a single, dynamic step-based system.

## Quick Start

```tsx
import { RequestFlow } from "@/components/request"

// In your page component
<RequestFlow
  initialService="med-cert"
  isAuthenticated={!!user}
  hasProfile={!!profile}
  hasMedicare={!!profile?.medicare_number}
  userEmail={user?.email}
  userName={profile?.full_name}
/>
```

## Routes

| Route | Description |
|-------|-------------|
| `/request?service=med-cert` | Medical certificate flow |
| `/request?service=prescription` | New prescription request |
| `/request?service=repeat-script` | Repeat prescription |
| `/request?service=consult` | Doctor consultation |
| `/request?service=referral` | Specialist referral |

## Architecture

```
components/request/
├── request-flow.tsx       # Main orchestration component
├── step-router.tsx        # Dynamic step component loader
├── step-error-boundary.tsx # Error handling for steps
├── store.ts              # Zustand state management
├── index.ts              # Barrel exports
└── steps/                # Individual step components
    ├── safety-step.tsx
    ├── certificate-step.tsx
    ├── symptoms-step.tsx
    ├── medication-step.tsx
    ├── medication-history-step.tsx
    ├── medical-history-step.tsx
    ├── consult-reason-step.tsx
    ├── patient-details-step.tsx
    ├── review-step.tsx
    ├── checkout-step.tsx
    └── referral-reason-step.tsx
```

## Features

### ✅ Implemented
- **Dynamic steps** - Steps configured per service type via `step-registry.ts`
- **Auth-aware navigation** - Skip steps based on auth/profile state
- **Draft persistence** - Auto-save to localStorage with restoration UI
- **PostHog tracking** - Analytics events for all step transitions
- **Error boundaries** - Graceful error handling per step
- **Loading states** - Skeleton UI during step transitions
- **Review step** - Summary before checkout

### Step Registry

Steps are defined in `lib/request/step-registry.ts`:

```ts
import { STEP_REGISTRY, getStepsForService } from "@/lib/request/step-registry"

// Get steps for a service with skip logic applied
const steps = getStepsForService("med-cert", {
  isAuthenticated: true,
  hasProfile: true,
  hasMedicare: false,
  serviceType: "med-cert",
  answers: {},
})
```

### State Management

Uses Zustand with persistence:

```ts
import { useRequestStore } from "@/components/request"

const { 
  serviceType,
  currentStepId,
  answers,
  setAnswer,
  nextStep,
  prevStep,
  reset,
} = useRequestStore()
```

## Migration from Legacy Flows

### EnhancedIntakeFlow → RequestFlow

Old:
```tsx
import { EnhancedIntakeFlow } from "@/components/intake/enhanced-intake-flow"
<EnhancedIntakeFlow serviceType="med-cert" />
```

New:
```tsx
import { RequestFlow } from "@/components/request"
<RequestFlow initialService="med-cert" isAuthenticated={...} hasProfile={...} hasMedicare={...} />
```

### RepeatRxIntakeFlow → RequestFlow

Old:
```tsx
import { RepeatRxIntakeFlow } from "@/components/repeat-rx/intake-flow"
```

New:
```tsx
import { RequestFlow } from "@/components/request"
<RequestFlow initialService="prescription" isAuthenticated={...} hasProfile={...} hasMedicare={...} />
```

## Adding New Steps

1. Create step component in `components/request/steps/`:

```tsx
export default function MyNewStep({ serviceType, onNext, onBack }: StepProps) {
  return (...)
}
```

2. Add to lazy loader in `step-router.tsx`:

```ts
'my-new-step': lazy(() => import('./steps/my-new-step')),
```

3. Add step definition to `lib/request/step-registry.ts`:

```ts
{
  id: 'my-new',
  label: 'My New Step',
  shortLabel: 'New',
  componentPath: 'my-new-step',
  required: true,
}
```

## Testing

E2E tests in `e2e/unified-request-flow.spec.ts`:

```bash
pnpm test:e2e -- unified-request-flow
```
