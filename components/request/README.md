# Unified Request Flow

The unified `/request` entry point consolidates all clinical intake flows into a single, dynamic step-based system.

## Quick Start

```tsx
import { RequestFlow } from "@/components/request/request-flow"

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
| `/request?service=repeat-script` | Repeat prescription |
| `/consult` | Services overview for active specialty pathways |
| `/request?service=consult&subtype=ed` | ED specialty consult |
| `/request?service=consult&subtype=hair_loss` | Hair loss specialty consult |
| `/request?service=consult&subtype=womens_health` | Women's health consult (UTI + contraception) |

Supported service params are defined by `SUPPORTED_SERVICE_SLUGS` and
`mapServiceParam` in `lib/request/step-registry.ts`. Referral and pathology
requests are not standalone `/request` checkout services.

Consult subtype launch state is defined in `lib/request/consult-subtypes.ts`.
Women's health is live; weight loss remains blocked before checkout even if a
client route is bypassed.

## Architecture

```
components/request/
├── request-flow.tsx       # Main orchestration component
├── step-router.tsx        # Renders the current step from the dynamic registry
├── step-components.tsx    # next/dynamic registry (SSR on: first step renders in initial HTML)
├── step-loaders.ts        # import() prefetch cache (module-scope + idle next-step preloads)
├── step-error-boundary.tsx # Error handling for steps
├── store.ts              # Zustand state management
├── index.ts              # Barrel exports
└── steps/                # Individual step components
    ├── certificate-step.tsx
    ├── symptoms-step.tsx
    ├── medication-step.tsx   # repeat-Rx: medicine + prescription history + dose/indication/side effects
    ├── medical-history-step.tsx
    ├── ed-*-step.tsx
    ├── hair-loss-*-step.tsx
    ├── womens-health-*-step.tsx
    ├── weight-loss-*-step.tsx
    ├── patient-details-step.tsx
    └── review-step.tsx       # unified review + payment (med-cert / prescription / consult)
```

## Features

### ✅ Implemented
- **Dynamic steps** - Steps configured per service type via `step-registry.ts`
- **Auth-aware navigation** - Skip steps based on auth/profile state
- **Draft persistence** - Auto-save to localStorage with restoration UI
- **Personless PostHog tracking** - Service/subtype/step events for funnel analysis, without patient identity or clinical answers
- **Error boundaries** - Graceful error handling per step
- **Loading states** - Skeleton UI during step transitions
- **Review step** - Summary before checkout

### Step Registry

Steps are defined in `lib/request/step-registry.ts`:
Consult subtype launch state is defined in `lib/request/consult-subtypes.ts`.

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
import { useRequestStore } from "@/components/request/store"

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

## Adding New Steps

1. Create step component in `components/request/steps/`:

```tsx
export default function MyNewStep({ serviceType, onNext, onBack }: StepProps) {
  return (...)
}
```

2. Register its lazy loader in `step-loaders.ts`:

```ts
const stepLoaders = {
  "my-new-step": () => import("./steps/my-new-step").then((mod) => mod.default),
}
```

3. Register its dynamic component in `step-components.tsx` (literal `import()`
   inside `dynamic()` — required for SSR + head chunk preload; pinned by
   `lib/__tests__/request-performance-contract.test.ts`):

```tsx
"my-new-step": dynamic(() => import("./steps/my-new-step"), {
  loading: stepLoadingFallback("my-new-step", true),
}),
```

   If the step can ever be the FIRST step of a service it will server-render:
   keep its default-state render free of window/localStorage access and
   date-dependent markup.

4. Add step definition to `lib/request/step-registry.ts`:

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
pnpm e2e -- unified-request-flow
```
