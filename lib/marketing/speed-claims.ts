import type { WaitState } from "@/lib/brand/wait-counter-types"

const UNDER_HOUR_MAX_MEDIAN_MINUTES = 60
const UNDER_HOUR_MAX_QUEUE_P95_MINUTES = 60
const MAX_SAMPLE_AGE_MINUTES = 120
const MIN_SAMPLE_SIZE = 5

export type SpeedClaimService = "med-cert" | "rx" | "consult"

export type MedCertSpeedClaimInput = {
  service: SpeedClaimService
  medianMinutes: number | null
  sampleSize: number
  newestSampleAgeMinutes: number | null
  queueP95Minutes: number | null
}

export type MedCertSpeedClaim = {
  service: SpeedClaimService
  status: "under_hour" | "fallback"
  primary: string
  qualifier: string
  source: "recent_metrics" | "fallback"
}

export function buildMedCertSpeedClaim(input: MedCertSpeedClaimInput): MedCertSpeedClaim {
  if (!isUnderHourMedCertInput(input)) {
    return {
      service: input.service,
      status: "fallback",
      primary: "Fast doctor review",
      qualifier: "Review timing depends on queue volume and clinical complexity.",
      source: "fallback",
    }
  }

  return {
    service: input.service,
    status: "under_hour",
    primary: "Medical certificates are often under an hour",
    qualifier: "Based on recent med-cert review data; not a guarantee.",
    source: "recent_metrics",
  }
}

export function buildMedCertSpeedClaimFromWaitState(state: WaitState): MedCertSpeedClaim {
  return buildMedCertSpeedClaim({
    service: state.service ?? "med-cert",
    medianMinutes: state.variant === "live" ? state.medianMinutes ?? null : null,
    sampleSize: state.variant === "live" ? state.sampleSize ?? 0 : 0,
    newestSampleAgeMinutes: state.variant === "live" ? state.newestSampleAgeMinutes ?? null : null,
    queueP95Minutes: state.variant === "live" ? state.queueP95Minutes ?? null : null,
  })
}

export function canShowUnderHourMedCertClaim(claim: MedCertSpeedClaim): boolean {
  return claim.service === "med-cert" && claim.status === "under_hour"
}

function isUnderHourMedCertInput(input: MedCertSpeedClaimInput): boolean {
  return (
    input.service === "med-cert" &&
    typeof input.medianMinutes === "number" &&
    input.medianMinutes > 0 &&
    input.medianMinutes < UNDER_HOUR_MAX_MEDIAN_MINUTES &&
    input.sampleSize >= MIN_SAMPLE_SIZE &&
    typeof input.newestSampleAgeMinutes === "number" &&
    input.newestSampleAgeMinutes <= MAX_SAMPLE_AGE_MINUTES &&
    typeof input.queueP95Minutes === "number" &&
    input.queueP95Minutes >= 0 &&
    input.queueP95Minutes <= UNDER_HOUR_MAX_QUEUE_P95_MINUTES
  )
}
