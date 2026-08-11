import {
  getRepeatRxAttestationStatus,
  hasLegacyRepeatRxReconciliationNote,
} from "@/lib/clinical/repeat-rx-attestation"
import { hasCompleteRepeatRxRegimen } from "@/lib/request/repeat-rx-regimen"
import {
  extractRepeatScriptMedications,
  formatRepeatScriptMedicationCompactLabel,
  getRepeatScriptMedicationDisplayParts,
} from "@/lib/validation/repeat-script-medications"

type ReviewFactState =
  | "confirmed"
  | "inferred"
  | "missing"
  | "not_asked"
  | "not_applicable"

export interface ReviewFact {
  key: string
  label: string
  value: string
  state: ReviewFactState
  provenance: "current_request"
  issue?: string
  optional?: boolean
  blocksPrescribing?: boolean
  noteCanResolve?: boolean
}

type ReviewSafetyFactState = "confirmed_negative" | "missing" | "not_asked"

interface ReviewSafetyFact {
  key: string
  label: string
  display: string
  state: ReviewSafetyFactState
  provenance: "current_request"
  issue?: string
}

interface ReviewSafetySummary {
  confirmedNegatives: ReviewSafetyFact[]
  gaps: ReviewSafetyFact[]
}

export interface ReviewPacketAdvisory {
  code: "confirm_strength_in_parchment"
  message: "Confirm strength in Parchment"
}

interface ReviewWorkflow {
  kind: "medical_certificate" | "repeat_prescription" | "prescribing_consult" | "consult"
  prescribeLabel: string | null
  completionLabel: string
  requiresFulfilment: boolean
}

export interface ReviewPacket {
  title: string
  workflow: ReviewWorkflow
  facts: ReviewFact[]
  safety: ReviewSafetySummary
  advisories: ReviewPacketAdvisory[]
  issueCount: number
  fulfilment: {
    status: "pending" | "recorded"
    recordedAt: string | null
  }
}

export interface BuildReviewPacketInput {
  category?: string | null
  serviceType?: string | null
  subtype?: string | null
  answers: Record<string, unknown>
  intake?: {
    status?: string | null
    script_sent?: boolean | null
    script_sent_at?: string | null
  } | null
  summary: {
    title: string
    keyFacts: Array<{ label: string; value: string }>
  }
}

export interface ReviewPacketBlocker {
  blocked: boolean
  warning: boolean
  message: string | null
}

type ReviewWorkflowKind = ReviewWorkflow["kind"]

const REPEAT_SERVICE_TYPES = new Set([
  "common_scripts",
  "prescription",
  "repeat",
  "repeat-script",
  "repeat_rx",
])

// weight_loss added at launch (2026-08-07): a weight consult prescribes via
// Parchment like the other specialty lines, so it needs the Prescribe
// affordance and the durable script_sent completion gate — without this it
// derived the generic "consult" workflow (no Prescribe button, completion
// ungated by fulfilment evidence).
const PRESCRIBING_CONSULT_SUBTYPES = new Set(["ed", "hair_loss", "womens_health", "weight_loss"])

const PRESCRIPTION_HISTORY_LABELS: Record<string, string> = {
  less_than_3_months: "Less than 3 months ago",
  last_3_months: "Less than 3 months ago",
  "3_to_6_months": "3–6 months ago",
  "6_to_12_months": "6–12 months ago",
  over_12_months: "Over 12 months ago",
}

const MISSING_VALUE_PATTERN = /^(not provided|not recorded|not specified|not captured|unknown)$/i

const REPEAT_NOTABLE_CONTEXT_LABELS = new Set([
  "side effects",
  "allergies",
  "conditions",
  "current medications",
  "pregnant/breastfeeding",
  "adverse medication reactions",
])

interface RepeatSafetyDefinition {
  key: string
  label: string
  negativeDisplay: string
  answerKeys: string[]
  detailKeys?: string[]
  missingDetailDisplay?: string
  missingDetailIssue?: string
}

const REPEAT_SAFETY_DEFINITIONS: RepeatSafetyDefinition[] = [
  {
    key: "side_effects",
    label: "Side effects",
    negativeDisplay: "No side effects",
    answerKeys: ["hasSideEffects", "has_side_effects"],
    detailKeys: ["sideEffects", "side_effects"],
    missingDetailDisplay: "Side-effect details missing",
    missingDetailIssue: "Confirm side-effect details",
  },
  {
    key: "allergies",
    label: "Allergy history",
    negativeDisplay: "No allergies",
    answerKeys: ["hasAllergies", "has_allergies"],
    detailKeys: ["allergies", "known_allergies"],
    missingDetailDisplay: "Allergy details missing",
    missingDetailIssue: "Confirm allergy details",
  },
  {
    key: "medication_reactions",
    label: "Medicine reaction history",
    negativeDisplay: "No medicine reactions",
    answerKeys: ["hasAdverseMedicationReactions", "has_adverse_medication_reactions"],
  },
  {
    key: "conditions",
    label: "Medical conditions",
    negativeDisplay: "No conditions",
    answerKeys: ["hasConditions", "has_conditions"],
    detailKeys: ["conditions", "existing_conditions"],
    missingDetailDisplay: "Condition details missing",
    missingDetailIssue: "Confirm condition details",
  },
  {
    key: "other_medications",
    label: "Other medicines",
    negativeDisplay: "No other medicines",
    answerKeys: ["hasOtherMedications", "has_other_medications"],
    detailKeys: ["otherMedications", "other_medications", "current_medications"],
    missingDetailDisplay: "Other medicine details missing",
    missingDetailIssue: "Confirm other medicine details",
  },
  {
    key: "pregnancy_breastfeeding",
    label: "Pregnancy/breastfeeding",
    negativeDisplay: "Not pregnant/breastfeeding",
    answerKeys: ["isPregnantOrBreastfeeding", "is_pregnant_or_breastfeeding"],
  },
]

function isRoutineNegativeContextValue(value: string): boolean {
  const normalized = value.trim().toLowerCase()
  if (["no", "none", "none reported", "false", "nil", "n/a", "na", "not applicable"].includes(normalized)) {
    return true
  }

  return /^no (?:known |reported )?(?:side effects?|allerg(?:y|ies)|conditions?|current medications?|other medications?|adverse medication reactions?)(?: reported)?$/.test(normalized) ||
    /^not (?:currently )?(?:pregnant(?: or breastfeeding)?|breastfeeding)$/.test(normalized)
}

function answerString(answers: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = answers[key]
    if (typeof value === "string" && value.trim()) return value.trim()
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
  }
  return null
}

function answerBoolean(answers: Record<string, unknown>, keys: string[]): boolean | undefined {
  let explicitlyFalse = false

  for (const key of keys) {
    const value = answers[key]
    if (value === true) return true
    if (value === false) {
      explicitlyFalse = true
      continue
    }
    if (typeof value !== "string") continue

    const normalized = value.trim().toLowerCase()
    if (["yes", "true", "1"].includes(normalized)) return true
    if (["no", "false", "0", "none", "nil"].includes(normalized)) {
      explicitlyFalse = true
    }
  }

  return explicitlyFalse ? false : undefined
}

function repeatPrescriptionSafety(answers: Record<string, unknown>): ReviewSafetySummary {
  const confirmedNegatives: ReviewSafetyFact[] = []
  const gaps: ReviewSafetyFact[] = []

  for (const definition of REPEAT_SAFETY_DEFINITIONS) {
    const answer = answerBoolean(answers, definition.answerKeys)
    const recordedDetail = definition.detailKeys
      ? answerString(answers, definition.detailKeys)
      : null
    const hasAffirmativeDetail = Boolean(
      recordedDetail && !isRoutineNegativeContextValue(recordedDetail),
    )

    if (answer === false) {
      // Persisted drafts can contain a stale negative toggle alongside real
      // positive detail. Never turn that contradiction into reassurance.
      if (hasAffirmativeDetail) {
        gaps.push({
          key: definition.key,
          label: definition.label,
          display: `${definition.label} response conflicts with recorded details`,
          state: "missing",
          provenance: "current_request",
          issue: `Confirm ${definition.label.toLowerCase()}`,
        })
        continue
      }

      confirmedNegatives.push({
        key: definition.key,
        label: definition.label,
        display: definition.negativeDisplay,
        state: "confirmed_negative",
        provenance: "current_request",
      })
      continue
    }

    if (answer === undefined) {
      gaps.push({
        key: definition.key,
        label: definition.label,
        display: definition.label,
        state: "not_asked",
        provenance: "current_request",
        issue: `${definition.label} not captured`,
      })
      continue
    }

    if (definition.detailKeys && !hasAffirmativeDetail) {
      gaps.push({
        key: definition.key,
        label: definition.label,
        display: definition.missingDetailDisplay || `${definition.label} details missing`,
        state: "missing",
        provenance: "current_request",
        issue: definition.missingDetailIssue || `Confirm ${definition.label.toLowerCase()}`,
      })
    }
  }

  return { confirmedNegatives, gaps }
}

function repeatPrescriptionAdvisories(
  answers: Record<string, unknown>,
): ReviewPacketAdvisory[] {
  const medications = extractRepeatScriptMedications(answers)
  if (medications.length !== 1) return []

  const medication = getRepeatScriptMedicationDisplayParts(medications[0])
  if (medication.strength && medication.strengthSource !== "inferred") return []

  return [{
    code: "confirm_strength_in_parchment",
    message: "Confirm strength in Parchment",
  }]
}

function fact(
  key: string,
  label: string,
  value: string | null,
  options: Pick<ReviewFact, "state" | "issue" | "optional" | "blocksPrescribing" | "noteCanResolve">,
): ReviewFact {
  return {
    key,
    label,
    value: value || "Not recorded",
    provenance: "current_request",
    ...options,
  }
}

function normalizeFactKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
}

function normalizeGenericFactValue(value: string): Pick<ReviewFact, "value" | "state"> {
  if (MISSING_VALUE_PATTERN.test(value.trim()) || /^not captured\b/i.test(value.trim())) {
    return { value: "Not recorded", state: "missing" }
  }
  return { value, state: "confirmed" }
}

function deriveWorkflowKind(input: BuildReviewPacketInput): ReviewWorkflowKind {
  const category = (input.category || "").trim().toLowerCase()
  const serviceType = (input.serviceType || "").trim().toLowerCase()
  const subtype = (input.subtype || "").trim().toLowerCase()

  if (category === "medical_certificate" || category === "med_cert" || serviceType === "med_certs") {
    return "medical_certificate"
  }
  if (category === "prescription" || REPEAT_SERVICE_TYPES.has(serviceType)) {
    return "repeat_prescription"
  }
  if (PRESCRIBING_CONSULT_SUBTYPES.has(subtype)) return "prescribing_consult"
  return "consult"
}

function workflowFor(kind: ReviewWorkflowKind): ReviewWorkflow {
  switch (kind) {
    case "medical_certificate":
      return {
        kind,
        prescribeLabel: null,
        completionLabel: "Approve certificate",
        requiresFulfilment: false,
      }
    case "repeat_prescription":
    case "prescribing_consult":
      return {
        kind,
        prescribeLabel: "Prescribe",
        completionLabel: "Complete request",
        requiresFulfilment: true,
      }
    case "consult":
      return {
        kind,
        prescribeLabel: null,
        completionLabel: "Complete request",
        requiresFulfilment: false,
      }
  }
}

function genericFacts(input: BuildReviewPacketInput): ReviewFact[] {
  return input.summary.keyFacts.map(({ label, value }) => ({
    key: normalizeFactKey(label),
    label,
    ...normalizeGenericFactValue(value),
    provenance: "current_request" as const,
  }))
}

function medicalCertificateFacts(input: BuildReviewPacketInput): ReviewFact[] {
  const facts = genericFacts(input)
  const symptomDetail = answerString(input.answers, ["symptomDetails", "symptom_details"])
  const existingSymptomFact = facts.find((reviewFact) => reviewFact.key === "symptoms")

  if (!symptomDetail && !existingSymptomFact) {
    facts.push(fact(
      "symptoms",
      "Symptoms",
      null,
      {
        state: "missing",
        issue: "Request symptom detail",
        optional: false,
        blocksPrescribing: false,
        noteCanResolve: false,
      },
    ))
  }

  return facts
}

function repeatPrescriptionFacts(input: BuildReviewPacketInput): ReviewFact[] {
  const medications = extractRepeatScriptMedications(input.answers)
  const primaryMedication = medications[0]
  const primaryParts = primaryMedication
    ? getRepeatScriptMedicationDisplayParts(primaryMedication)
    : null
  const facts: ReviewFact[] = []

  const medicationValue = medications.length > 0
    ? medications.map(formatRepeatScriptMedicationCompactLabel).join("; ")
    : null
  const missingStrength = medications.length > 0 && medications.some((medication) => (
    !getRepeatScriptMedicationDisplayParts(medication).strength
  ))
  const inferredStrength = medications.length === 1 && primaryParts?.strengthSource === "inferred"
  const medicationState: ReviewFactState = !medicationValue || missingStrength
    ? "missing"
    : inferredStrength
      ? "inferred"
      : "confirmed"
  const medicationIssue = !medicationValue
    ? "Confirm medicine"
    : medications.length > 1
      ? missingStrength
        ? "Strength not recorded for one or more medicines · confirm each regimen"
        : "Confirm each medicine and regimen"
      : missingStrength
        ? "Strength not recorded · confirm before prescribing"
        : inferredStrength
          ? "Confirm strength"
          : undefined
  facts.push(fact(
    "medicine",
    medications.length > 1 ? "Requested medicines" : "Medicine",
    medicationValue,
    {
      state: medicationState,
      issue: medicationIssue,
      optional: false,
      blocksPrescribing: !medicationValue,
      noteCanResolve: !medicationValue,
    },
  ))

  const patientDose = answerString(input.answers, [
    "currentDose",
    "current_dose",
    "dosageInstructions",
    "dosage_instructions",
  ])
  const patientDoseComplete = hasCompleteRepeatRxRegimen(patientDose)
  facts.push(fact(
    "patient_dose",
    "Current dose",
    patientDoseComplete ? patientDose : null,
    {
      state: patientDoseComplete ? "confirmed" : "missing",
      issue: patientDoseComplete ? undefined : "Confirm dose and frequency",
      optional: false,
      blocksPrescribing: !patientDoseComplete,
      noteCanResolve: !patientDoseComplete,
    },
  ))

  const indication = answerString(input.answers, ["indication", "indication_for"])
  facts.push(fact(
    "indication",
    "Indication",
    indication,
    {
      state: indication ? "confirmed" : "missing",
      issue: indication ? undefined : "Confirm indication",
      optional: false,
      blocksPrescribing: !indication,
      noteCanResolve: !indication,
    },
  ))

  const prescriptionHistory = answerString(input.answers, [
    "prescriptionHistory",
    "last_prescribed",
    "prescription_history",
  ])
  const prescriptionHistoryLabel = prescriptionHistory
    ? PRESCRIPTION_HISTORY_LABELS[prescriptionHistory] || prescriptionHistory.replace(/_/g, " ")
    : null
  facts.push(fact(
    "last_prescribed",
    "Last prescribed",
    prescriptionHistoryLabel,
    {
      state: prescriptionHistory ? "confirmed" : "missing",
      issue: prescriptionHistory ? undefined : "Confirm prescribing history",
      optional: true,
      blocksPrescribing: false,
      noteCanResolve: false,
    },
  ))

  const attestation = getRepeatRxAttestationStatus(input.answers)
  facts.push(fact(
    "regimen",
    "Dose and directions",
    attestation === "confirmed_unchanged"
      ? "Confirmed unchanged"
      : attestation === "changed"
        ? "Patient reported a change"
        : null,
    {
      state: attestation === "missing" ? "missing" : "confirmed",
      issue: attestation === "missing" ? "Regimen confirmation not captured" : undefined,
      optional: false,
      blocksPrescribing: attestation === "missing",
      noteCanResolve: false,
    },
  ))

  const packetLabels = new Set([
    "requested medication",
    "requested medications",
    "strength",
    "form",
    "last prescribed",
    "patient-reported dose",
    "same dose and directions",
  ])
  for (const summaryFact of input.summary.keyFacts) {
    const normalizedLabel = summaryFact.label.toLowerCase()
    if (packetLabels.has(normalizedLabel)) continue
    if (!REPEAT_NOTABLE_CONTEXT_LABELS.has(normalizedLabel)) continue
    if (isRoutineNegativeContextValue(summaryFact.value)) continue
    const normalized = normalizeGenericFactValue(summaryFact.value)
    facts.push({
      key: normalizeFactKey(summaryFact.label),
      label: summaryFact.label,
      ...normalized,
      provenance: "current_request",
      optional: true,
    })
  }

  return facts
}

export function buildReviewPacket(input: BuildReviewPacketInput): ReviewPacket {
  const workflow = workflowFor(deriveWorkflowKind(input))
  const facts = workflow.kind === "repeat_prescription"
    ? repeatPrescriptionFacts(input)
    : workflow.kind === "medical_certificate"
      ? medicalCertificateFacts(input)
      : genericFacts(input)
  const safety = workflow.kind === "repeat_prescription"
    ? repeatPrescriptionSafety(input.answers)
    : { confirmedNegatives: [], gaps: [] }
  const advisories = workflow.kind === "repeat_prescription"
    ? repeatPrescriptionAdvisories(input.answers)
    : []

  return {
    title: input.summary.title,
    workflow,
    facts,
    safety,
    advisories,
    issueCount: facts.filter((reviewFact) => (
      Boolean(reviewFact.issue) &&
      (workflow.kind !== "repeat_prescription" || reviewFact.blocksPrescribing === true)
    )).length,
    fulfilment: input.intake?.script_sent === true
      ? {
          status: "recorded",
          recordedAt: input.intake.script_sent_at || null,
        }
      : {
          status: "pending",
          recordedAt: null,
        },
  }
}

export function getReviewPacketBlocker(
  packet: ReviewPacket,
  doctorNotes: string | null | undefined,
): ReviewPacketBlocker {
  if (packet.workflow.kind !== "repeat_prescription") {
    return { blocked: false, warning: false, message: null }
  }

  const blockingFacts = packet.facts.filter((reviewFact) => reviewFact.blocksPrescribing)
  if (blockingFacts.length === 0) {
    return { blocked: false, warning: false, message: null }
  }

  const recordedLegacyScriptReconciled =
    packet.fulfilment.status === "recorded" &&
    hasLegacyRepeatRxReconciliationNote(doctorNotes)
  const unresolvedHardBlock = blockingFacts.some((reviewFact) => (
    !reviewFact.noteCanResolve &&
    !(recordedLegacyScriptReconciled && reviewFact.key === "regimen")
  ))
  const labels = blockingFacts.map((reviewFact) => reviewFact.label.toLowerCase()).join(", ")
  const hasNote = Boolean(doctorNotes?.trim())

  if (!unresolvedHardBlock && hasNote) {
    return {
      blocked: false,
      warning: true,
      message: `Patient did not provide ${labels}. A clinical note is recorded — confirm the details in Parchment.`,
    }
  }

  return {
    blocked: true,
    warning: false,
    message: unresolvedHardBlock
      ? `Patient did not provide ${labels}. This request cannot proceed until the required intake confirmation is present.`
      : `Patient did not provide ${labels}. Add a clinical note (or request the details) before prescribing.`,
  }
}
