import { getApprovedClaim } from "@/lib/marketing/approved-claims"
import {
  type CanonicalServiceId,
  getActiveServices,
  getServiceMarketingHref,
  getServiceRequestHref,
  type ServiceDef,
} from "@/lib/services/service-catalog"

// Every canonical service is active since the 2026-08-10 weight launch.
type ActiveServiceId = CanonicalServiceId

interface ServiceDecisionCopy {
  ctaLabel: string
  doctorRole?: string
  group: "core" | "focused"
  suitability: string
}

export type ServiceDecision = ServiceDef &
  ServiceDecisionCopy & {
    id: ActiveServiceId
    marketingHref: string
    requestHref: string
  }

const CLINICAL_DECISION_MODEL = getApprovedClaim("clinical_decision_model")

const SERVICE_DECISION_COPY = {
  "med-cert": {
    group: "core",
    suitability: "Short work, university, or carer's leave evidence for an illness or injury.",
    doctorRole: CLINICAL_DECISION_MODEL,
    ctaLabel: "Start a certificate",
  },
  "repeat-rx": {
    group: "core",
    suitability: "A regular eligible medication you already take and need reviewed for a repeat.",
    ctaLabel: "Start a repeat request",
  },
  ed: {
    group: "focused",
    suitability: "Erection concerns suited to a private, structured safety assessment.",
    ctaLabel: "Start ED assessment",
  },
  "hair-loss": {
    group: "focused",
    suitability: "Pattern hair thinning or recession suited to a focused online assessment.",
    ctaLabel: "Start hair loss assessment",
  },
  "womens-health": {
    group: "focused",
    suitability: "UTI symptoms, or starting or switching the contraceptive pill.",
    ctaLabel: "Start women's health assessment",
  },
  "weight-loss": {
    group: "focused",
    suitability: "Doctor-reviewed weight-management assessment with eligibility and safety screening first.",
    ctaLabel: "Start weight assessment",
  },
} satisfies Record<ActiveServiceId, ServiceDecisionCopy>

export function getActiveServiceDecisions(): ServiceDecision[] {
  return getActiveServices().map((service) => {
    return {
      ...service,
      ...SERVICE_DECISION_COPY[service.id],
      id: service.id,
      marketingHref: getServiceMarketingHref(service),
      requestHref: getServiceRequestHref(service),
    }
  })
}
