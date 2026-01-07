import { redirect } from "next/navigation"

// Redirect old medical certificate request route to unified /start
export default function MedCertRequestPage() {
  redirect("/start?service=med-cert")
}
