import type { ComponentType } from "react"

import type { UnifiedServiceType } from "@/lib/request/step-registry"

export interface StepComponentProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
  initialDuration?: string
}

const stepLoaders = {
  'certificate-step': () => import("./steps/certificate-step").then((mod) => mod.default),
  'symptoms-step': () => import("./steps/symptoms-step").then((mod) => mod.default),
  'medication-step': () => import("./steps/medication-step").then((mod) => mod.default),
  'medication-history-step': () => import("./steps/medication-history-step").then((mod) => mod.default),
  'medical-history-step': () => import("./steps/medical-history-step").then((mod) => mod.default),
  'consult-reason-step': () => import("./steps/consult-reason-step").then((mod) => mod.default),
  'patient-details-step': () => import("./steps/patient-details-step").then((mod) => mod.default),
  'review-step': () => import("./steps/review-step").then((mod) => mod.default),
  'checkout-step': () => import("./steps/checkout-step").then((mod) => mod.default),
  'ed-goals-step': () => import("./steps/ed-goals-step").then((mod) => mod.default),
  'ed-assessment-step': () => import("./steps/ed-assessment-step").then((mod) => mod.default),
  'ed-health-step': () => import("./steps/ed-health-step").then((mod) => mod.default),
  'ed-preferences-step': () => import("./steps/ed-preferences-step").then((mod) => mod.default),
  'hair-loss-goals-step': () => import("./steps/hair-loss-goals-step").then((mod) => mod.default),
  'hair-loss-assessment-step': () => import("./steps/hair-loss-assessment-step").then((mod) => mod.default),
  'hair-loss-health-step': () => import("./steps/hair-loss-health-step").then((mod) => mod.default),
  'hair-loss-preferences-step': () => import("./steps/hair-loss-preferences-step").then((mod) => mod.default),
  'womens-health-type-step': () => import("./steps/womens-health-type-step").then((mod) => mod.default),
  'womens-health-assessment-step': () => import("./steps/womens-health-assessment-step").then((mod) => mod.default),
  'weight-loss-assessment-step': () => import("./steps/weight-loss-assessment-step").then((mod) => mod.default),
  'weight-loss-call-step': () => import("./steps/weight-loss-call-step").then((mod) => mod.default),
} satisfies Record<string, () => Promise<ComponentType<StepComponentProps>>>

type StepComponentKey = keyof typeof stepLoaders

const stepComponentCache = new Map<string, Promise<ComponentType<StepComponentProps> | null>>()

export function preloadStepComponent(componentPath: string) {
  const loader = stepLoaders[componentPath as StepComponentKey]
  if (!loader) return Promise.resolve(null)

  const cached = stepComponentCache.get(componentPath)
  if (cached) return cached

  const promise = loader().catch((error) => {
    stepComponentCache.delete(componentPath)
    throw error
  })
  stepComponentCache.set(componentPath, promise)
  return promise
}

export async function loadStepComponent(componentPath: string) {
  const loader = stepLoaders[componentPath as StepComponentKey]
  if (!loader) return null
  return preloadStepComponent(componentPath)
}
