import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"
export const metadata = { title: "Email Hub" }

/**
 * /admin/email-hub was lifted under /admin/emails/hub in Phase 6 of
 * the doctor + admin portal rebuild (2026-04-29) so all three email
 * surfaces (Templates, Hub, Analytics) live behind a single tab nav.
 *
 * This route stays alive as a redirect so bookmarks and the daily
 * email digest links keep working.
 */
export default function LegacyEmailHubPage() {
  redirect("/admin/emails/hub")
}
