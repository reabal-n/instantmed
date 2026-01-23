import { redirect } from "next/navigation"

// Redirect old medical certificate request route to unified /request
export default function MedCertRequestPage() {
  redirect("/request?service=med-cert")
}
