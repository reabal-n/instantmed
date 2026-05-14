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

  // Phase 4 of dashboard remaster (2026-05-12): patient profile became an
  // entity page. The "Prescribing workspace" card collapsed into a thin
  // strip; the "Delivery evidence" card was retired (its content lives in
  // the unified timeline's Audit tab); the "Patient summary" card became
  // a single bounded label/value strip.
  it("keeps patient-profile prescribing actions visible with clear blocked states", () => {
    // Prescribing strip — the primary CTA + the four blocked states must
    // still be reachable on the entity page.
    expect(detailSource).toContain("Prescribe in Parchment")
    expect(detailSource).not.toContain("Add prescription")
    // Refresh / Sync controls live in the strip, not in a big card.
    expect(detailSource).toContain("Refresh")
    expect(detailSource).toContain("Sync")
    expect(detailSource).toContain("Prescriber not linked")
    expect(detailSource).toContain("`${STAFF_IDENTITY_HREF}#parchment-account`")
    expect(detailSource).toContain("Parchment integration disabled")
  })

  it("organizes the profile around the unified timeline as primary content", () => {
    // Identity / Prescribing identity / Parchment cards collapsed into one
    // bounded `<dl>` strip. The compact identity row keeps Email/Phone/
    // Address/DOB/Medicare/Member-since but drops the "Patient summary"
    // header that hosted them.
    expect(detailSource).toContain("Address")
    expect(detailSource).toContain("DOB")
    expect(detailSource).toContain("Medicare")
    expect(detailSource).toContain("Member since")
    // Old card titles must NOT come back.
    expect(detailSource).not.toContain("Patient summary")
    expect(detailSource).not.toContain("Prescribing identity")
    // Audit / delivery evidence is the timeline's job now.
    expect(detailSource).not.toContain("Delivery evidence")
    expect(detailPageSource).toContain("Prescription synced to PMS")
    // Phase 4b: PatientTimeline is the canonical history surface.
    expect(detailSource).toContain("<PatientTimeline")
    expect(detailSource).toContain("prescriptions={medications}")
    expect(timelineSource).toContain("initialPageSize")
    expect(timelineSource).toContain("Show ")
  })

  it("surfaces Parchment webhook and sync activity without exposing raw PHI", () => {
    // The audit-row mapping (page.tsx) feeds the timeline; the timeline
    // renders these without exposing raw PHI.
    expect(detailPageSource).toContain("getPatientParchmentAuditRows")
    expect(detailPageSource).toContain("parchment_webhook_script_sent")
    expect(detailPageSource).toContain("metadata->>patient_id")
    expect(detailPageSource).toContain("metadata->>partner_patient_id")
    expect(detailSource).toContain("parchmentActivity")
    // The audit-event labels live on the timeline now.
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
    // Phase 4b: requests, prescriptions, notes, emails, and audit events
    // all flow through one PatientTimeline. The legacy
    // `{emailLogs.length > 0 && <PatientCommunicationHistory ...>}` block
    // is gone — the timeline handles the empty state itself.
    expect(detailSource).toContain("<PatientTimeline")
    expect(detailSource).toContain("emails={emailLogs}")
    expect(detailSource).toContain("audit={parchmentActivity}")
    expect(detailSource).toContain("notes={notes}")
    expect(detailSource).toContain("emptyLabel=")
    expect(detailSource).toContain("{showNoteForm && (")
    // No more `PatientCommunicationHistory` import or rendering — emails
    // are absorbed into the timeline. (A comment in the file may still
    // mention the retired component for historical context.)
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
    expect(patientsListSource).toContain("Parchment sync")
    expect(patientsListSource).toContain("Ready in Parchment")
    expect(patientsListSource).toContain("Not synced")
    expect(patientsListSource).toContain("All services")
    expect(patientsListSource).toContain("Last request")
    expect(patientsListSource).toContain("Last script")
    expect(patientsListSource).toContain("Directory summary")
    expect(patientsListSource).toContain("sm:grid-cols-2 xl:grid-cols-4")
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
