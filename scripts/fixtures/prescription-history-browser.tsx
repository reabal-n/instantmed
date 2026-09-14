import { useState } from "react"
import { createRoot } from "react-dom/client"
import { PrescriptionHistoryCard } from "@/components/doctor/review/prescription-history-card"
import type { ReviewPrescriptionHistory } from "@/lib/data/review-prescription-history"

const prescriptions: ReviewPrescriptionHistory["prescriptions"] = Array.from({ length: 5 }, (_, i) => ({
  id: `synthetic-rx-${i}`, source: "parchment", medication_name: `Synthetic medicine ${i + 1}`,
  medication_strength: "10 mg", dosage_instructions: i === 1 ? null : "One tablet on alternate mornings.\nOnly when needed; do not repeat on the same day. Keep this complete qualification visible.",
  status: i === 2 ? "cancelled" : "active", recorded_at: `2026-09-0${5 - i}`,
  request_id: "11111111-1111-4111-8111-111111111111",
}))
function Fixture() {
  const [history, setHistory] = useState<ReviewPrescriptionHistory>({ prescriptions, error: null, hasMore: false })
  const reload = async () => {
    if (new URLSearchParams(location.search).has("reload-error")) return null
    const next = { prescriptions: [{ ...prescriptions[0], id: "refreshed", medication_name: "Refreshed synthetic medicine" }], error: null, hasMore: false }
    setHistory(next)
    return next
  }
  return <main className="mx-auto max-w-3xl p-4">
    <h1 className="mb-4 text-xl font-semibold">Synthetic request review</h1>
    <PrescriptionHistoryCard patientId="11111111-1111-4111-8111-111111111111" history={history} reload={reload} />
    <button className="mt-4" onClick={() => setHistory({ prescriptions: [], error: "Could not load prescription history. Try refreshing.", hasMore: false })}>Simulate load error</button>
  </main>
}
createRoot(document.getElementById("root")!).render(<Fixture />)
