import { requireRole } from "@/lib/auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import Link from "next/link"
import { 
  Mail, 
  AlertTriangle, 
  CreditCard, 
  Users,
  Bug,
  Server,
  ExternalLink
} from "lucide-react"

// External dashboard URLs - configured via Vercel environment variables
// NEXT_PUBLIC_SENTRY_PROJECT_URL and NEXT_PUBLIC_VERCEL_PROJECT_URL
const SENTRY_URL = process.env.NEXT_PUBLIC_SENTRY_PROJECT_URL || null
const VERCEL_URL = process.env.NEXT_PUBLIC_VERCEL_PROJECT_URL || null
const RESEND_URL = "https://resend.com/emails"

export const dynamic = "force-dynamic"

interface OpsCounts {
  stuckIntakes: number
  failedEmails: number
  paymentMismatches: number
}

async function getOpsCounts(): Promise<OpsCounts> {
  const supabase = createServiceRoleClient()
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // Fetch counts in parallel
  const [stuckResult, emailResult, reconciliationResult] = await Promise.all([
    // Stuck intakes: paid but not reviewed in 2+ hours
    supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .eq("payment_status", "paid")
      .in("status", ["paid", "awaiting_review"])
      .lt("paid_at", new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()),

    // Failed emails in last 24h
    supabase
      .from("email_outbox")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("created_at", yesterday.toISOString()),

    // Payment mismatches (paid but not delivered)
    supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .or("payment_status.eq.paid,refund_status.eq.failed")
      .in("status", ["paid", "awaiting_review", "in_review"])
      .lt("paid_at", new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString()),
  ])

  return {
    stuckIntakes: stuckResult.count || 0,
    failedEmails: emailResult.count || 0,
    paymentMismatches: reconciliationResult.count || 0,
  }
}

export default async function OpsIndexPage() {
  await requireRole(["doctor", "admin"])

  const counts = await getOpsCounts()

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-2xl font-semibold mb-2">Ops</h1>
      <p className="text-muted-foreground mb-8">Quick links to operational tools</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Email Outbox */}
        <Link href="/doctor/admin/email-outbox" className="block" data-testid="ops-card-email-outbox">
          <div className="border rounded-lg p-5 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Email Outbox</span>
            </div>
            <p className="text-sm text-muted-foreground">
              View sent emails and retry failures
            </p>
            {counts.failedEmails > 0 && (
              <div className="mt-3 text-sm">
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                  {counts.failedEmails} failed (24h)
                </span>
              </div>
            )}
          </div>
        </Link>

        {/* Stuck Intakes */}
        <Link href="/doctor/admin/ops/intakes-stuck" className="block" data-testid="ops-card-stuck-intakes">
          <div className="border rounded-lg p-5 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Stuck Intakes</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Intakes needing attention
            </p>
            {counts.stuckIntakes > 0 && (
              <div className="mt-3 text-sm">
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                  {counts.stuckIntakes} stuck
                </span>
              </div>
            )}
          </div>
        </Link>

        {/* Reconciliation */}
        <Link href="/doctor/admin/ops/reconciliation" className="block" data-testid="ops-card-reconciliation">
          <div className="border rounded-lg p-5 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Reconciliation</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Payment vs delivery mismatches
            </p>
            {counts.paymentMismatches > 0 && (
              <div className="mt-3 text-sm">
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                  {counts.paymentMismatches} mismatches
                </span>
              </div>
            )}
          </div>
        </Link>

        {/* Doctor Ops */}
        <Link href="/doctor/admin/ops/doctors" className="block" data-testid="ops-card-doctors">
          <div className="border rounded-lg p-5 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Doctor Ops</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Doctor assignments and workload
            </p>
          </div>
        </Link>

      </div>

      {/* External Tools Section */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">External Tools</h2>
        <div className="flex flex-wrap gap-4 text-sm">
          {SENTRY_URL ? (
            <a 
              href={SENTRY_URL} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
              data-testid="external-link-sentry"
            >
              <Bug className="h-4 w-4" />
              Sentry Issues
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground/50" title="Set NEXT_PUBLIC_SENTRY_PROJECT_URL">
              <Bug className="h-4 w-4" />
              Sentry Issues (not configured)
            </span>
          )}
          
          {VERCEL_URL ? (
            <a 
              href={VERCEL_URL} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
              data-testid="external-link-vercel"
            >
              <Server className="h-4 w-4" />
              Vercel Logs
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground/50" title="Set NEXT_PUBLIC_VERCEL_PROJECT_URL">
              <Server className="h-4 w-4" />
              Vercel Logs (not configured)
            </span>
          )}
          
          <a 
            href={RESEND_URL} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            data-testid="external-link-resend"
          >
            <Mail className="h-4 w-4" />
            Resend Dashboard
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Quick summary */}
      <div className="mt-8 p-4 bg-muted/30 rounded-lg">
        <h2 className="text-sm font-medium mb-2">Quick Summary</h2>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>• <strong>{counts.stuckIntakes}</strong> intakes stuck (paid 2h+ ago, not reviewed)</p>
          <p>• <strong>{counts.failedEmails}</strong> emails failed in last 24 hours</p>
          <p>• <strong>{counts.paymentMismatches}</strong> payment/delivery mismatches</p>
        </div>
      </div>
    </div>
  )
}
