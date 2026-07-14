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
    expect(patientsPageSource).toContain("parsePatientDirectorySort")
    expect(patientDirectorySource).toContain("parchment_patient_id")
    expect(patientDirectorySource).toContain("getLastRequestMap")
    expect(patientDirectorySource).toContain("getLastScriptMap")
    expect(patientDirectorySource).toContain("compareDirectoryPatients")
    // 2026-05-21: Status + Parchment columns calmed from loud
    // colored-background pills to inline dot + label. Stat strip
    // compressed from a 4-card 2x2 grid into a single horizontal row.
    expect(patientsListSource).toContain("Parchment sync")
    expect(patientsListSource).toContain("Synced")
    expect(patientsListSource).toContain("Sync needed")
    expect(patientsListSource).toContain("All services")
    expect(patientsListSource).toContain("Last request")
    expect(patientsListSource).toContain("Last script")
    expect(patientsListSource).toContain("Directory summary")
    expect(patientsListSource).not.toContain("{/* Overview */}")
  })

  it("refreshes patient prescriptions when the embedded Parchment panel closes", () => {
    expect(panelSource).toContain("closeAndRefresh")
    expect(panelSource).toContain("onPrescriptionsRefresh()")
  })

  it("keeps automatic Parchment session refreshes out of top-level doctor toasts", () => {
    expect(panelSource).toContain("loadPrescribingUrl()")
    expect(panelSource).not.toContain("Parchment session expiring")
    expect(panelSource).not.toContain("toast.warning")
  })

  it("gives doctors a slow-iframe recovery state without blocking prescribing", () => {
    expect(panelSource).toContain("PARCHMENT_IFRAME_SLOW_LOAD_MS")
    expect(panelSource).toContain("iframeSlowToLoad")
    expect(panelSource).toContain("Parchment is taking a little longer")
    expect(panelSource).toContain("Open in new tab")
    expect(panelSource).toContain("copyPrescriptionContext")
  })

  it("lets doctors retry only the embedded iframe without refreshing the SSO session", () => {
    expect(panelSource).toContain("iframeReloadKey")
    expect(panelSource).toContain("retryIframeOnly")
    expect(panelSource).toContain("setIframeReloadKey((key) => key + 1)")
    expect(panelSource).toContain("Retry iframe")
    expect(panelSource).toContain("key={iframeReloadKey}")
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

  it("names the copied medicine in Parchment copy feedback", () => {
    expect(panelSource).toContain("getCopiedMedicineLabel")
    expect(panelSource).toContain("Copied")
    expect(panelSource).toContain("to Parchment")
    expect(panelSource).not.toContain('toast.success("Prescription details copied")')

    expect(clinicalCaseReviewSource).toContain("getPrescriptionCopyLabel")
    expect(clinicalCaseReviewSource).toContain("Copied")
    expect(clinicalCaseReviewSource).toContain("for Parchment")
    expect(clinicalCaseReviewSource).not.toContain('toast.success("Parchment preset copied")')
  })

  it("lets doctors copy only the Parchment search term when needed", () => {
    expect(panelSource).toContain("copyPrescriptionSearchHint")
    expect(panelSource).toContain("Copied Parchment search term")
    expect(panelSource).toContain("Copy search")
    expect(panelSource).toContain("prescriptionContext.searchHint")

    expect(clinicalCaseReviewSource).toContain("copySearchHint")
    expect(clinicalCaseReviewSource).toContain("medicationSearchHint")
    expect(clinicalCaseReviewSource).toContain("Copy search")
  })

  it("does not pass raw intake answers into the client props", () => {
    expect(detailPageSource).toContain("intakeWithoutAnswers")
    expect(detailSource).not.toContain("answers:")
    expect(detailSource).not.toContain("intake_answers")
  })
})
