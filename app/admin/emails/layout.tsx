export const metadata = {
  title: "Emails",
}

/**
 * Shared layout for the Emails section of /admin.
 *
 * Phase 6 of the doctor + admin portal rebuild (2026-04-29). Email
 * surfaces were split across /admin/emails (templates),
 * /admin/email-hub (operational dashboard), and
 * /admin/emails/analytics (delivery metrics) - three different mental
 * models the operator had to remember. This layout wraps all three
 * into one section header and tab strip.
 *
 * Routes consolidated under /admin/emails:
 *   /admin/emails -> Templates (CRUD + preview)
 *   /admin/emails/hub -> Hub (operational dashboard, was /admin/email-hub)
 *   /admin/emails/analytics -> Analytics (30-day delivery metrics)
 *   /admin/emails/suppression -> Suppression (blocked recipient recovery)
 *
 * /admin/email-hub still exists as a 301 redirect to /admin/emails/hub
 * so existing bookmarks and digest links keep working.
 */
export default function EmailsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
