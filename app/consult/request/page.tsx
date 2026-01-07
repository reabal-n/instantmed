import { redirect } from "next/navigation"

// Redirect old consult request route to unified /start
export default function ConsultRequestPage() {
  redirect("/start?service=consult")
}
