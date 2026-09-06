import { createRoot } from "react-dom/client"
import ReviewStep from "@/components/request/steps/review-step"
import { useRequestStore } from "@/components/request/store"

const seeded = sessionStorage.getItem("fixture-seeded")
useRequestStore.getState().setServiceType("prescription")
if (!seeded) {
  useRequestStore.setState({
    flowInstanceId: "41414141-4141-4141-8141-414141414141",
    currentStepId: "review", furthestVisitedStepId: "review", safetyConfirmed: true,
    agreedToTerms: true, confirmedAccuracy: true,
    firstName: "Fixture", lastName: "Patient", email: "fixture@example.test", dob: "1985-04-01",
    answers: { medication_name: "Fixture medicine", currentDose: "Fixture dose", prescribedBefore: true },
  })
  localStorage.setItem("instantmed-server-draft-prescription", "42424242-4242-4242-8242-424242424242")
  localStorage.setItem("instantmed-server-draft-flow-prescription", "41414141-4141-4141-8141-414141414141")
  sessionStorage.setItem("fixture-seeded", "1")
}
Object.assign(window, { checkoutFixtureStore: useRequestStore })
createRoot(document.getElementById("root")!).render(<ReviewStep serviceType="prescription" onNext={() => {}} />)
