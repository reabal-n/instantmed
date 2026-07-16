import { isValidCertCategory, isValidCertDuration } from "@/lib/marketing/med-cert-selector"
import {
  isConsultSubtypeAvailable,
  isConsultSubtypeKey,
  isWomensHealthOptionLive,
} from "@/lib/request/consult-subtypes"
import type { UnifiedServiceType } from "@/types/services"

type InitialAnswerSeedKey = "consultSubtype" | "womensHealthOption" | "certType" | "duration"

export interface InitialAnswerSeed {
  key: InitialAnswerSeedKey
  value: string
}

export interface InitialRequestUrlContext {
  initialService: UnifiedServiceType | null
  initialSubtype?: string
  initialIntent?: string
  initialCertType?: string
  initialDuration?: string
  storedConsultSubtype?: unknown
  storedWomensHealthOption?: unknown
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
  initialIntent,
  initialCertType,
  initialDuration,
  storedConsultSubtype,
  storedWomensHealthOption,
  storedCertType,
  storedDuration,
  lastSavedAt,
}: InitialRequestUrlContext): InitialRequestUrlDecision {
  const answerSeeds: InitialAnswerSeed[] = []
  const decision: InitialRequestUrlDecision = { answerSeeds }

  if (initialService === "consult" && initialSubtype) {
    const hasSubtypeMismatch =
      typeof storedConsultSubtype === "string" &&
      storedConsultSubtype !== initialSubtype &&
      Boolean(lastSavedAt)

    if (hasSubtypeMismatch) {
      decision.subtypeMismatch = { draftSubtype: storedConsultSubtype }
    } else {
      answerSeeds.push({ key: "consultSubtype", value: initialSubtype })

      if (
        initialSubtype === "womens_health" &&
        !storedWomensHealthOption &&
        isWomensHealthOptionLive(initialIntent)
      ) {
        answerSeeds.push({ key: "womensHealthOption", value: initialIntent })
      }
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
