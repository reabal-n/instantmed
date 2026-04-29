import { Mail } from "lucide-react"

import { Heading } from "@/components/ui/heading"

import { EmailTabsNav } from "./email-tabs-nav"

export const metadata = {
  title: "Emails",
}

/**
 * Shared layout for the Emails section of /admin.
 *
 * Phase 6 of the doctor + admin portal rebuild (2026-04-29). Email
 * surfaces were split across /admin/emails (templates),
 * /admin/email-hub (operational dashboard), and
 * /admin/emails/analytics (delivery metrics) — three different mental
 * models the operator had to remember. This layout wraps all three
 * into one section header + tab strip.
 *
 * Routes consolidated under /admin/emails:
 *   /admin/emails          → Templates  (CRUD + preview)
 *   /admin/emails/hub      → Hub        (operational dashboard, was /admin/email-hub)
 *   /admin/emails/analytics → Analytics (30-day delivery metrics)
 *
 * /admin/email-hub still exists as a 301 redirect to /admin/emails/hub
 * so existing bookmarks and digest links keep working.
 */
export default function EmailsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
          aria-hidden
        >
          <Mail className="h-5 w-5" />
        </div>
        <div>
          <Heading level="h1" className="!text-2xl">
            Emails
          </Heading>
          <p className="mt-1 text-sm text-muted-foreground">
            Operational dashboard, templates, and 30-day delivery metrics
          </p>
        </div>
      </div>

      <EmailTabsNav />

      <div>{children}</div>
    </div>
  )
}
