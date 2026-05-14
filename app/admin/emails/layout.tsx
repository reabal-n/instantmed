export const metadata = {
  title: "Email delivery",
}

/**
 * Shared layout for the Email delivery section of /admin.
 *
 * Phase 6 of the doctor + admin portal rebuild (2026-04-29). Email
 * surfaces used to sprawl across templates, preview, analytics, suppression,
 * and the old /admin/email-hub alias. The lean operating model now keeps only
 * three jobs here:
 *
 * Routes consolidated under /admin/emails:
 *   /admin/emails -> Redirect to Email delivery
 *   /admin/emails/hub -> Email delivery (queue recovery + health)
 *   /admin/emails/templates -> Templates (edit, preview, test)
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
