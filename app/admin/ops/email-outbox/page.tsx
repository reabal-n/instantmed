import { redirect } from "next/navigation"

// Consolidated: all email outbox routes redirect to the canonical location
export default function OpsEmailOutboxRedirect() {
  redirect("/doctor/admin/email-outbox")
}
