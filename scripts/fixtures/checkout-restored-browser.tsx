import { createRoot } from "react-dom/client"
import ReviewStep from "@/components/request/steps/review-step"
import { useRequestStore } from "@/components/request/store"
import { Button } from "@/components/ui/button"

await useRequestStore.persist.rehydrate()
const seeded = sessionStorage.getItem("fixture-seeded")
if (!useRequestStore.getState().serviceType) useRequestStore.getState().setServiceType("prescription")
if (!seeded) {
  useRequestStore.setState({
    flowInstanceId: "41414141-4141-4141-8141-414141414141",
    currentStepId: "review", furthestVisitedStepId: "review", safetyConfirmed: true,
    agreedToTerms: true, confirmedAccuracy: true,
    firstName: "Fixture", lastName: "Patient", email: "fixture@example.test", dob: "1985-04-01",
    answers: { medication_name: "Fixture medicine", currentDose: "Fixture dose", prescribedBefore: true },
    lastSavedAt: new Date().toISOString(),
  })
  localStorage.setItem("instantmed-server-draft-prescription", "42424242-4242-4242-8242-424242424242")
  localStorage.setItem("instantmed-server-draft-flow-prescription", "41414141-4141-4141-8141-414141414141")
  sessionStorage.setItem("fixture-seeded", "1")
}
Object.assign(window, { checkoutFixtureStore: useRequestStore })

// Only the surrounding navigation is a fixture. ReviewStep, consent, payment
// handling, browser draft persistence, and every store action are production.
function Fixture() {
  const state = useRequestStore()
  if (window.location.pathname !== "/request") return <p>Fixture destination reached</p>
  if (state.currentStepId !== "review") {
    return <div className="space-y-6">
      <p>Fixture navigation: {state.currentStepId}</p>
      <label className="block">Fixture email
        <input className="block border p-2 text-foreground bg-background" value={state.email} onChange={event => state.setIdentity({ email: event.target.value })} />
      </label>
      <Button onClick={() => state.goToStep("review")}>Review saved request</Button>
    </div>
  }
  return <>
    <Button variant="outline" className="mb-6" onClick={state.prevStep}>Back</Button>
    <ReviewStep serviceType="prescription" onNext={() => {}} />
  </>
}
createRoot(document.getElementById("root")!).render(<Fixture />)
