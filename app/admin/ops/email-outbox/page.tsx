import { redirect } from "next/navigation"

// Canonical email outbox lives at /doctor/admin/email-outbox
export default function OpsEmailOutboxRedirect() {
  redirect("/doctor/admin/email-outbox")
}
