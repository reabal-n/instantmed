import { redirect } from "next/navigation"

// Redirect old consult request route to unified /request
export default function ConsultRequestPage() {
  redirect("/request?service=consult")
}
