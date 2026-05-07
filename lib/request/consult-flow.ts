import type { ConsultSubtype, UnifiedStepId } from "@/types/services"

import { isConsultSubtypeKey } from "./consult-subtypes"
import type { DraftData } from "./draft-storage"

export {
  isConsultSubtypeKey,
  normalizeConsultSubtypeParam,
} from "./consult-subtypes"

const CONSULT_SUBTYPE_FIRST_STEPS: Record<ConsultSubtype, UnifiedStepId> = {
  general: "consult-reason",
  ed: "ed-goals",
  hair_loss: "hair-loss-goals",
  womens_health: "womens-health-type",
  weight_loss: "weight-loss-assessment",
}

const CONSULT_SUBTYPE_RESET_KEYS = [
  "consultCategory",
  "consultDetails",
  "consultUrgency",
  "general_associated_symptoms",
  "emergency_symptoms",
  "edGoal",
  "edDuration",
  "edAgeConfirmed",
  "iief1",
  "iief2",
  "iief3",
  "iief4",
  "iief5",
  "edNitrates",
  "edAlphaBlockers",
  "edRecentHeartEvent",
  "edSevereHeart",
  "edGpCleared",
  "edHypertension",
  "edDiabetes",
  "edBpMedication",
  "has_allergies",
  "known_allergies",
  "has_conditions",
  "existing_conditions",
  "takes_medications",
  "current_medications",
  "previousEdMeds",
  "edPreviousTreatment",
  "edPreviousEffectiveness",
  "edPreference",
  "hairGoal",
  "hairOnset",
  "hairPattern",
  "hairFamilyHistory",
  "triedMinoxidil",
  "triedFinasteride",
  "triedBiotin",
  "triedShampoos",
  "triedPRP",
  "triedOther",
  "hairReproductive",
  "scalpDandruff",
  "scalpPsoriasis",
  "scalpItching",
  "scalpFolliculitis",
  "scalpNone",
  "hairLowBP",
  "hairHeartConditions",
  "hairMedicationPreference",
  "hairAdditionalInfo",
  "womensHealthOption",
  "contraceptionType",
  "pregnancyStatus",
  "hoursSinceIntercourse",
  "utiSymptoms",
  "utiRedFlags",
  "utiPregnant",
  "womensDetails",
  "currentWeight",
  "currentHeight",
  "targetWeight",
  "previousAttempts",
  "weightLossMedPreference",
  "eatingDisorderHistory",
  "wlAdverseReactions",
  "wlAdverseReactionsDetails",
  "weightLossGoals",
  "preferredTimeSlot",
  "callbackPhone",
] as const

export function getConsultSubtypeFirstStep(subtype: unknown): UnifiedStepId {
  return isConsultSubtypeKey(subtype)
    ? CONSULT_SUBTYPE_FIRST_STEPS[subtype]
    : CONSULT_SUBTYPE_FIRST_STEPS.general
}

export function getConsultSubtypeResetKeys(): readonly string[] {
  return CONSULT_SUBTYPE_RESET_KEYS
}

export function getConsultDraftResumeHref(
  draft: Pick<DraftData, "serviceType" | "currentStepId" | "answers" | "lastSavedAt">
): string {
  if (draft.serviceType !== "consult") {
    return `/request?service=${draft.serviceType}`
  }

  const subtype = draft.answers.consultSubtype
  if (isConsultSubtypeKey(subtype)) {
    return `/request?service=consult&subtype=${encodeURIComponent(subtype)}`
  }

  return "/request?service=consult"
}
