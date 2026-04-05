import { redirect } from "next/navigation"

// Redirect old prescription request route to unified /request
export default function PrescriptionRequestPage() {
  redirect("/request?service=prescription")
}
