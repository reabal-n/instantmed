import { createRoot } from "react-dom/client"
import { PanelProvider, usePanel } from "@/components/panels/panel-provider"
import { ParchmentPrescribePanel } from "@/components/doctor/parchment-prescribe-panel"
import { buildClinicalCaseSummary } from "@/lib/clinical/case-summary"
import { buildParchmentPrescriptionContext } from "@/lib/doctor/parchment-prescribing-context"
import type { ParchmentPrescriptionContext } from "@/lib/doctor/parchment-prescribing-context"

const cautionSource = {
  category: "consult", subtype: "ed",
  answers: { edDuration: "6_12_months", edAgeConfirmed: true, edErectionFrequency: 3,
    edPreference: "prn", edNitrates: false, edRecentHeartEvent: false,
    edSevereHeart: false, edAlphaBlockers: true },
}
const sourceCautions = buildParchmentPrescriptionContext(buildClinicalCaseSummary(cautionSource), cautionSource)?.safetyItems
const context: ParchmentPrescriptionContext = {
  requestLabel: "Synthetic repeat prescription",
  presetLabel: "Synthetic reference",
  directionsTemplate: "",
  requestedNameCopyText: "Synthetic medicine",
  medicationLabel: "Synthetic medicine 5 mg",
  regimenSource: "patient_reported",
  copyText: "Synthetic medicine",
  patientReportedDose: "One tablet on alternate mornings, only when needed.",
  patientReportedFrequency: "Alternate mornings",
  assessmentFacts: [{ key: "history", label: "History", value: "Synthetic assessment detail", state: "confirmed", provenance: "current_request" }],
}

function Fixture() {
  const { openPanel, closePanel } = usePanel()
  const open = () => openPanel({
    id: "synthetic-prescribing",
    type: "sheet",
    component: <ParchmentPrescribePanel intakeId="synthetic-prescribing" patientName="Synthetic Patient" prescriptionContext={new URLSearchParams(location.search).has("long") ? {
      ...context,
      safetyItems: sourceCautions,
      patientReportedDose: Array.from({ length: 30 }, (_, i) => `Synthetic medicine ${i + 1}: one 5 mg tablet on alternate mornings, only when needed.`).join("\n"),
    } : context} />,
  })
  return <main className="p-6">
    <button onClick={open}>Open prescribing</button>
    <button onClick={() => openPanel({ id: "basic-panel", type: "sheet", component: (
      <div role="dialog" aria-label="Basic panel">
        <button>First action</button><button onClick={closePanel}>Close basic panel</button>
        <button style={{ display: "none" }}>Hidden action</button>
      </div>
    ) })}>Open basic panel</button>
    <label>Retained note<textarea defaultValue="Synthetic retained note" /></label>
    <div style={{ height: 1600 }}>Synthetic background review</div>
  </main>
}
createRoot(document.getElementById("root")!).render(<PanelProvider><Fixture /></PanelProvider>)
