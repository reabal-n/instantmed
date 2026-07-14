import { getRepeatRxAttestationStatus } from "@/lib/clinical/repeat-rx-attestation"
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

const PRESCRIBING_CONSULT_SUBTYPES = new Set(["ed", "hair_loss", "womens_health"])

const PRESCRIPTION_HISTORY_LABELS: Record<string, string> = {
  less_than_3_months: "Less than 3 months ago",
  last_3_months: "Less than 3 months ago",
  "3_to_6_months": "3–6 months ago",
  "6_to_12_months": "6–12 months ago",
  over_12_months: "Over 12 months ago",
}

const MISSING_VALUE_PATTERN = /^(not provided|not recorded|not specified|not captured|unknown)$/i

function answerString(answers: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = answers[key]
    if (typeof value === "string" && value.trim()) return value.trim()
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
  }
  return null
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

  if (medications.length > 1) {
    facts.push(fact(
      "medicine",
      "Requested medicines",
      medications.map(formatRepeatScriptMedicationCompactLabel).join("; "),
      {
        state: "confirmed",
        issue: "Confirm each medicine and regimen",
        optional: false,
        blocksPrescribing: false,
        noteCanResolve: false,
      },
    ))
  } else {
    facts.push(fact(
      "medicine",
      "Medicine",
      primaryParts?.name || null,
      {
        state: primaryParts?.name ? "confirmed" : "missing",
        issue: primaryParts?.name ? undefined : "Confirm medicine",
        optional: false,
        blocksPrescribing: !primaryParts?.name,
        noteCanResolve: !primaryParts?.name,
      },
    ))
    facts.push(fact(
      "strength",
      "Strength",
      primaryParts?.strength || null,
      {
        state: primaryParts?.strength
          ? primaryParts.strengthSource === "structured"
            ? "confirmed"
            : "inferred"
          : "missing",
        issue: primaryParts?.strength && primaryParts.strengthSource === "structured"
          ? undefined
          : "Confirm strength",
        optional: false,
        blocksPrescribing: false,
        noteCanResolve: false,
      },
    ))
    facts.push(fact(
      "form",
      "Form",
      primaryParts?.form || null,
      {
        state: primaryParts?.form ? "confirmed" : "missing",
        issue: primaryParts?.form ? undefined : "Confirm form",
        optional: false,
        blocksPrescribing: false,
        noteCanResolve: false,
      },
    ))
  }

  const patientDose = answerString(input.answers, [
    "currentDose",
    "current_dose",
    "dosageInstructions",
    "dosage_instructions",
  ])
  facts.push(fact(
    "patient_dose",
    "Patient-reported dose",
    patientDose,
    {
      state: patientDose ? "confirmed" : "missing",
      issue: patientDose ? undefined : "Confirm dose and frequency",
      optional: false,
      blocksPrescribing: !patientDose,
      noteCanResolve: !patientDose,
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
    if (packetLabels.has(summaryFact.label.toLowerCase())) continue
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

  return {
    title: input.summary.title,
    workflow,
    facts,
    issueCount: facts.filter((reviewFact) => Boolean(reviewFact.issue)).length,
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

  const unresolvedHardBlock = blockingFacts.some((reviewFact) => !reviewFact.noteCanResolve)
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
