import { redirect } from "next/navigation"

/**
 * /prescriptions/new redirects to consult flow (new medications require assessment)
 */
export default function NewPrescriptionPage() {
  redirect("/request?service=consult")
}
