export const metadata = {
  title: "Emails",
}

/**
 * Shared layout for the Emails section of /admin.
 *
 * Phase 6 of the doctor + admin portal rebuild (2026-04-29). Email
 * surfaces used to sprawl across templates, preview, analytics, suppression,
 * and the old /admin/email-hub alias. The lean operating model now keeps only
 * three jobs here:
 *
 * Routes consolidated under /admin/emails:
 *   /admin/emails -> Templates (edit, preview, test)
 *   /admin/emails/hub -> Delivery hub (queue recovery + health)
 *   /admin/emails/suppression -> Suppression (blocked recipient recovery)
 *
 * Legacy preview/analytics/bookmark routes redirect into these canonical
 * surfaces via next.config.mjs.
 */
export default function EmailsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
