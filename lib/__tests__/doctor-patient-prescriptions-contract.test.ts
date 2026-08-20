import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const detailSource = readFileSync(
  join(process.cwd(), "app/doctor/patients/[id]/patient-detail-client.tsx"),
  "utf8",
)
const detailPageSource = readFileSync(
  join(process.cwd(), "app/doctor/patients/[id]/page.tsx"),
  "utf8",
)
// Phase 4b of dashboard remaster (2026-05-12): medication history,
// communication history, and audit events were folded into the
// unified `PatientTimeline`. Most user-facing labels live there now.
const timelineSource = readFileSync(
  join(process.cwd(), "components/doctor/patient-timeline.tsx"),
  "utf8",
)
const panelSource = readFileSync(
  join(process.cwd(), "components/doctor/parchment-prescribe-panel.tsx"),
  "utf8",
)
const clinicalCaseReviewSource = readFileSync(
  join(process.cwd(), "components/doctor/clinical-case-review.tsx"),
  "utf8",
)

describe("doctor patient medication history contract", () => {
  it("shows Parchment prescriptions and prior InstantMed medication requests on the patient record", () => {
    expect(detailPageSource).toContain(".from(\"prescriptions\")")
    expect(detailPageSource).toContain("parchment_reference")
    expect(detailPageSource).toContain("answers:intake_answers(answers)")
    expect(detailPageSource).toContain("extractMedicationFromAnswers")
    expect(detailPageSource).toContain("medications={data.medications}")

    expect(detailSource).toContain("interface PatientMedication")
    // Phase 4b: prescriptions stream into the unified `PatientTimeline`
    // instead of a separate "Medication history" card. The labels
    // moved into `patient-timeline.tsx`.
    expect(detailSource).toContain("prescriptions={medications}")
    expect(timelineSource).toContain("InstantMed request")
    expect(timelineSource).toContain("SCID")
    expect(timelineSource).toContain("Parchment")
  })

  it("keeps patient-profile prescribing actions visible with clear blocked states", () => {
    expect(detailSource).toContain('value="clinical"')
    expect(detailSource).toContain("Prescribe in Parchment")
    expect(detailSource).not.toContain("Add prescription")
    expect(detailSource).toContain("Refresh")
    expect(detailSource).toContain("Sync")
    expect(detailSource).toContain("Prescriber not linked")
    expect(detailSource).toContain("`${STAFF_IDENTITY_HREF}#parchment-account`")
    expect(detailSource).toContain("Parchment integration disabled")
    expect(detailSource).toContain("hasInvalidMedicareNumber")
    expect(detailSource).toContain("Invalid Medicare is ignored")
  })

  it("organizes the full record into clinical, history, and operations tabs", () => {
    const operationsStart = detailSource.indexOf('<TabsContent value="operations"')

    expect(detailSource).toContain("TabsList")
    expect(detailSource).toContain('value="clinical"')
    expect(detailSource).toContain('value="history"')
    expect(detailSource).toContain('value="operations"')
    expect(detailSource).toContain('aria-label="Saved clinical profile"')
    expect(detailSource).toContain("Allergies")
    expect(detailSource).toContain("Conditions")
    expect(detailSource).toContain("Current medicines")
    expect(detailPageSource).toContain("getHealthProfile")
    expect(detailPageSource).toContain("healthProfile={data.healthProfile}")
    expect(detailSource).toContain("Email")
    expect(detailSource).toContain("Phone")
    expect(detailSource).toContain("Address")
    expect(detailSource).toContain("Medicare")
    expect(detailSource).toContain("ageDobLabel")
    // Old card titles must NOT come back.
    expect(detailSource).not.toContain("Patient summary")
    expect(detailSource).not.toContain("Prescribing identity")
    expect(detailSource).not.toContain("Delivery evidence")
    expect(detailSource).not.toContain('aria-label="Patient file status"')
    expect(detailSource).not.toContain('label: "Latest request"')
    expect(detailPageSource).not.toContain("certsResult")
    expect(detailPageSource).not.toContain("certificatesIssued")
    expect(detailPageSource).toContain("Prescription synced to PMS")
    expect(detailSource).toContain("<PatientTimeline")
    expect(detailSource).toContain("prescriptions={medications}")
    expect(detailSource).toContain('title="Clinical history"')
    expect(detailSource).toContain('title="Recent clinical activity"')
    expect(detailSource).toContain('title="Operational activity"')
    expect(detailSource.indexOf("Prescribe in Parchment")).toBeGreaterThan(operationsStart)
    expect(detailSource.indexOf("<EditPatientDialog patient={patient} />")).toBeGreaterThan(operationsStart)
    expect(timelineSource).toContain("initialPageSize")
    expect(timelineSource).toContain("Show ")
  })

  it("keeps full acquisition detail in Operations without repeating it in Clinical", () => {
    expect(detailSource).toContain('aria-label="Acquisition attribution"')
    expect(detailSource).toContain("Landing page")
    expect(detailSource).toContain("formatLandingPath(attribution.landing_page)")
    expect(detailSource).toContain("Campaign")
    expect(detailSource).toContain("Keyword")
    expect(detailSource).toContain('label: "First touch"')
    expect(detailSource).toContain('label: "Most recent"')
    expect(detailSource).toContain("contextLabel={label}")
  })

  it("surfaces Parchment webhook and sync activity without exposing raw PHI", () => {
    expect(detailPageSource).toContain("getPatientParchmentAuditRows")
    expect(detailPageSource).toContain("parchment_webhook_script_sent")
    expect(detailPageSource).toContain("metadata->>patient_id")
    expect(detailPageSource).toContain("metadata->>partner_patient_id")
    expect(detailSource).toContain("parchmentActivity")
    expect(detailSource).toContain('value="operations"')
    expect(timelineSource.toLowerCase()).toContain("webhook")
  })

  it("does not re-add a separate Delivery Evidence card", () => {
    // Phase 4 deliberately retired the "Delivery evidence" card because
    // the timeline's Audit tab shows the same webhook events with the
    // same SCID/event-id deep links. A regression that brings it back
    // would re-duplicate ~150px of vertical surface.
    expect(detailSource).not.toContain("Latest delivery update")
    expect(detailSource).not.toContain("secondaryParchmentActivity")
    expect(detailSource).not.toContain("earlier delivery event")
    expect(detailSource).not.toContain("Verifying Parchment delivery evidence")
    expect(detailSource).not.toContain("Waiting for webhook")
  })

  it("hides empty secondary patient sections instead of rendering full empty cards", () => {
    expect(detailSource).toContain("<PatientTimeline")
    expect(detailSource).toContain("emails={emailLogs}")
    expect(detailSource).toContain("audit={parchmentActivity}")
    expect(detailSource).toContain("notes={notes}")
    expect(detailSource).toContain("emptyLabel=")
    expect(detailSource).toContain("showNoteForm ? (")
    expect(timelineSource).toContain("availableFilters")
    expect(timelineSource).toContain('entry.kind === "all" || totalsByKind[entry.kind] > 0')
    expect(detailSource).not.toContain('import { ParchmentPrescribePanel, PatientCommunicationHistory }')
    expect(detailSource).not.toContain("<PatientCommunicationHistory")
    expect(existsSync(join(process.cwd(), "components/doctor/patient-communication-history.tsx"))).toBe(false)
    expect(detailSource).not.toContain("No requests from this patient yet")
    expect(detailSource).not.toContain("No emails sent to this patient yet")
    expect(detailSource).not.toContain("No notes yet")
  })

  it("shows Parchment sync health in the doctor patient list", () => {
    const patientsPageSource = readFileSync(
      join(process.cwd(), "app/doctor/patients/page.tsx"),
      "utf8",
    )
    const patientDirectorySource = readFileSync(
      join(process.cwd(), "lib/data/patient-directory.ts"),
      "utf8",
    )
    const patientsListSource = readFileSync(
      join(process.cwd(), "app/doctor/patients/patients-list-client.tsx"),
      "utf8",
    )

    expect(patientsPageSource).toContain("getPatientDirectoryPage")
    expect(patientsPageSource).toContain("parsePatientDirectorySort(params.sort)")
    expect(patientDirectorySource).toContain("parchment_patient_id")
    expect(patientDirectorySource).toContain("getLastRequestMap")
    expect(patientDirectorySource).toContain("getLastScriptMap")
    expect(patientDirectorySource).not.toContain("compareDirectoryPatients")
    // The directory keeps prescribing readiness contextual to each patient
    // and shows only non-zero exception filters for the current server page.
    expect(patientsListSource).toContain("Parchment sync")
    expect(patientsListSource).toContain("Parchment synced")
    expect(patientsListSource).toContain("Sync needed")
    expect(patientsListSource).toContain("Recent work")
    expect(patientsListSource).toContain("patient.lastRequest")
    expect(patientsListSource).toContain("patient.lastScript")
    expect(patientsListSource).toContain("hasExceptions ? (")
    expect(patientsListSource).not.toContain("All services")
    expect(patientsListSource).not.toContain("Directory summary")
    expect(patientsListSource).not.toContain("{/* Overview */}")
  })

  it("refreshes patient prescriptions when the embedded Parchment panel closes", () => {
    expect(panelSource).toContain("closeAndRefresh")
    expect(panelSource).toContain("onPrescriptionsRefresh()")
  })

  it("never replaces an in-progress Parchment session on a timer", () => {
    expect(panelSource).toContain("void loadPrescribingUrl()")
    expect(panelSource).not.toContain("240_000")
    expect(panelSource).not.toContain("270_000")
    expect(panelSource).not.toContain("sessionRefreshing")
    expect(panelSource).not.toContain("Session refreshing")
  })

  it("gives doctors a slow-iframe recovery state without blocking prescribing", () => {
    expect(panelSource).toContain("PARCHMENT_IFRAME_SLOW_LOAD_MS")
    expect(panelSource).toContain("iframeSlowToLoad")
    expect(panelSource).toContain("Parchment is taking a little longer")
    expect(panelSource).toContain("Open in new tab")
    expect(panelSource).toContain("copyMedicationSearchName")
  })

  it("mints a fresh Parchment session only after an explicit retry", () => {
    expect(panelSource).toContain('onClick={loadPrescribingUrl}')
    expect(panelSource).toContain("Retry session")
    expect(panelSource).not.toContain("iframeReloadKey")
    expect(panelSource).not.toContain("retryIframeOnly")
  })

  it("pins the narrow empirical Parchment iframe compatibility boundary", () => {
    expect(panelSource).toContain(
      'allow="clipboard-write; publickey-credentials-get *; publickey-credentials-create *"',
    )
    expect(panelSource).toContain('referrerPolicy="strict-origin-when-cross-origin"')
    expect(panelSource).toContain(
      'sandbox="allow-scripts allow-same-origin allow-forms allow-storage-access-by-user-activation allow-popups allow-popups-to-escape-sandbox"',
    )
    expect(panelSource).not.toContain("allow-top-navigation")
    expect(panelSource).not.toContain("allow-downloads")
  })

  it("routes Parchment identity failures back to patient detail editing", () => {
    expect(panelSource).toContain("canFixParchmentErrorFromPatientProfile")
    expect(panelSource).toContain('error?.startsWith("Missing prescribing details:")')
    expect(panelSource).toContain('error?.startsWith("Parchment rejected the patient details")')
    expect(panelSource).toContain("Edit patient details")
  })

  it("treats a Parchment identity-service outage as a provider recovery, not a patient edit", () => {
    expect(panelSource).toContain("Parchment identity service unavailable")
    expect(panelSource).toContain("Your InstantMed details are already saved")

    const fixabilityStart = panelSource.indexOf("function canFixParchmentErrorFromPatientProfile")
    const fixabilityEnd = panelSource.indexOf("\n}\n", fixabilityStart)
    const fixabilityBody = panelSource.slice(fixabilityStart, fixabilityEnd)
    expect(fixabilityBody).not.toContain("identity verification service failed")
  })

  it("copies a name-only medicine search value while preserving generic verification context", () => {
    expect(panelSource).toContain("copyMedicationSearchName")
    expect(panelSource).toContain("requestedNameCopyText")
    expect(panelSource).toContain("copyableMedicationName")
    expect(panelSource).toContain('toast.success("Copied medicine name")')
    expect(panelSource).toContain("Copy name")
    expect(panelSource).toContain("patient-entered medicine name")
    expect(panelSource).not.toContain("Copy context")
    expect(panelSource).not.toContain("Copy search")

    expect(clinicalCaseReviewSource).toContain("copyGenericMedicationName")
    expect(clinicalCaseReviewSource).toContain('toast.success("Copied generic medicine name")')
    expect(clinicalCaseReviewSource).toContain("Copy generic name")
    expect(clinicalCaseReviewSource).not.toContain("Copy search")
  })

  it("copies the separately labelled patient-reported frequency only", () => {
    expect(panelSource).toContain("copyPatientReportedFrequency")
    expect(panelSource).toContain('toast.success("Copied frequency")')
    expect(panelSource).toContain(">Frequency</p>")
    expect(panelSource).toContain("Copy frequency")
    expect(panelSource.indexOf("Copy frequency")).toBeLessThan(
      panelSource.indexOf("<details"),
    )
    expect(panelSource).not.toContain("Copy dose &amp; frequency")
  })

  it("keeps the Parchment handoff compact and puts raw request context behind disclosure", () => {
    expect(panelSource).toContain('data-parchment-medication-context="compact"')
    expect(panelSource).toContain("Medicine to search")
    expect(panelSource).toContain("Copy name")
    expect(panelSource).toContain("Request details")
    expect(panelSource).toContain("Likely match from a previous prescription")
    expect(panelSource).not.toContain('data-parchment-medication-context="mobile"')
    expect(panelSource).not.toContain('data-parchment-medication-context="desktop"')
  })

  it("never falls back to copying a strength-bearing search hint", () => {
    expect(panelSource).not.toContain("copyPrescriptionSearchHint")
    expect(panelSource).not.toContain("Copied Parchment search term")

    expect(clinicalCaseReviewSource).not.toContain("copySearchHint")
    expect(clinicalCaseReviewSource).toContain("medicationSearchHint")
    expect(clinicalCaseReviewSource).not.toContain("Copied Parchment search term")
  })

  it("does not pass raw intake answers into the client props", () => {
    expect(detailPageSource).toContain("intakeWithoutAnswers")
    expect(detailSource).not.toContain("answers:")
    expect(detailSource).not.toContain("intake_answers")
  })
})
