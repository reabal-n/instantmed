import { notFound } from "next/navigation"
import { Suspense } from "react"

import { Skeleton } from "@/components/ui/skeleton"

import { EmailTestClient } from "./email-test-client"

export const dynamic = "force-dynamic"

/**
 * Dev-only email tester. Lets ops send test emails to arbitrary
 * addresses. Gated to non-production environments because:
 *
 *   1. It's a dev tool, not a production operator surface.
 *   2. Sending test emails in production from /admin/email-test
 *      consumes Resend quota and pollutes deliverability metrics.
 *   3. Per CLAUDE.md "Dev routes blocked in prod" pattern.
 *
 * Production admins who need to verify email delivery should use
 * Resend dashboard or the deploy-preview environment instead.
 */
export default async function EmailTestPage() {
  const env = process.env.VERCEL_ENV ?? "development"
  if (env === "production") {
    notFound()
  }

  return (
    <div className="space-y-6">
      <Suspense fallback={<Skeleton className="h-[600px] rounded-lg" />}>
        <EmailTestClient />
      </Suspense>
    </div>
  )
}
