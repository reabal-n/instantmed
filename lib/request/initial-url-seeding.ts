import { isValidCertCategory, isValidCertDuration } from "@/lib/marketing/med-cert-selector"
import { isConsultSubtypeAvailable, isConsultSubtypeKey } from "@/lib/request/consult-subtypes"
import type { UnifiedServiceType } from "@/types/services"

type InitialAnswerSeedKey = "consultSubtype" | "certType" | "duration"

export interface InitialAnswerSeed {
  key: InitialAnswerSeedKey
  value: string
}

export interface InitialRequestUrlContext {
  initialService: UnifiedServiceType | null
  initialSubtype?: string
  initialCertType?: string
  initialDuration?: string
  storedConsultSubtype?: unknown
  storedCertType?: unknown
  storedDuration?: unknown
  lastSavedAt?: string | null
}

export interface InitialRequestUrlDecision {
  answerSeeds: InitialAnswerSeed[]
  subtypeMismatch?: {
    draftSubtype: string
  }
  redirectPath?: string
}

const COMING_SOON_SUBTYPE_REDIRECTS: Record<string, string> = {
  womens_health: "/request",
  weight_loss: "/weight-loss",
}

export function getInitialRequestUrlDecision({
  initialService,
  initialSubtype,
  initialCertType,
  initialDuration,
  storedConsultSubtype,
  storedCertType,
  storedDuration,
  lastSavedAt,
}: InitialRequestUrlContext): InitialRequestUrlDecision {
  const answerSeeds: InitialAnswerSeed[] = []
  const decision: InitialRequestUrlDecision = { answerSeeds }

  if (initialService === "consult" && initialSubtype) {
    if (typeof storedConsultSubtype === "string" && storedConsultSubtype !== initialSubtype && lastSavedAt) {
      decision.subtypeMismatch = { draftSubtype: storedConsultSubtype }
    } else {
      answerSeeds.push({ key: "consultSubtype", value: initialSubtype })
    }

    if (isConsultSubtypeKey(initialSubtype) && !isConsultSubtypeAvailable(initialSubtype)) {
      decision.redirectPath = COMING_SOON_SUBTYPE_REDIRECTS[initialSubtype] || "/"
    }
  }

  if (initialService === "med-cert" && initialCertType && !storedCertType && isValidCertCategory(initialCertType)) {
    answerSeeds.push({ key: "certType", value: initialCertType })
  }

  if (initialService === "med-cert" && initialDuration && !storedDuration && isValidCertDuration(initialDuration)) {
    answerSeeds.push({ key: "duration", value: initialDuration })
  }

  return decision
}
