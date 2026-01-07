import { redirect } from "next/navigation"

// Redirect old prescription request route to unified /start
export default function PrescriptionRequestPage() {
  redirect("/start?service=repeat-script")
}
