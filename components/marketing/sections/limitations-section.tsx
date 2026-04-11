"use client"

import Link from "next/link"
import { CheckCircle2, AlertCircle } from "lucide-react"
import { CONTACT_EMAIL } from "@/lib/constants"

// =============================================================================
// DATA
// =============================================================================

const WHAT_WE_COVER = [
  "Cold, flu, and respiratory infections",
  "Gastroenteritis and stomach bugs",
  "Migraine and headaches",
  "Back pain and muscle strain",
  "Mental health days",
  "Period pain and menstrual symptoms",
  "General malaise and fatigue",
  "Carer\u2019s leave (caring for a sick dependent)",
] as const

const WHEN_TO_SEE_GP = [
  "Workplace injuries requiring WorkCover documentation",
  "Conditions needing a physical examination",
  "Extended absences beyond 3\u20135 days",
  "Complex or ongoing chronic conditions",
  "Certificates for legal proceedings",
  "Medical emergencies \u2014 call 000",
] as const

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Balanced outcomes section — "What we cover" vs "When to see a GP instead".
 * Replaces the old flat limitations list with a two-column grid that frames
 * scope positively before setting honest boundaries.
 */
export function LimitationsSection() {
  return (
    <section aria-label="What we cover and limitations" className="py-12 lg:py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight mb-3">
            What we can help with
          </h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            We cover most common short-term conditions. For anything outside
            our scope, we&apos;ll tell you upfront.
          </p>
        </div>

        {/* Two-column grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Column 1: What we cover */}
          <div className="rounded-2xl border border-border/50 bg-white dark:bg-card shadow-md shadow-primary/[0.06] p-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1.5 mb-4">
              <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
              <span className="text-xs font-semibold text-success">
                Common conditions we cover
              </span>
            </div>
            <ul className="space-y-2.5">
              {WHAT_WE_COVER.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed"
                >
                  <CheckCircle2
                    className="h-4 w-4 text-success shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 2: When to see a GP */}
          <div className="rounded-2xl border border-border/50 bg-white dark:bg-card shadow-md shadow-primary/[0.06] p-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-warning/10 px-3 py-1.5 mb-4">
              <AlertCircle className="h-4 w-4 text-warning" aria-hidden="true" />
              <span className="text-xs font-semibold text-warning">
                When to see a GP instead
              </span>
            </div>
            <ul className="space-y-2.5">
              {WHEN_TO_SEE_GP.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed"
                >
                  <AlertCircle
                    className="h-4 w-4 text-warning shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground italic leading-relaxed">
              If your request isn&apos;t suitable, we&apos;ll refund your
              payment and explain why - no questions asked.
            </p>
          </div>
        </div>

        {/* Contact fallback */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Not sure if we can help?{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-primary hover:underline"
          >
            Ask us first
          </a>{" "}
          or{" "}
          <Link href="/faq" className="text-primary hover:underline">
            check our FAQ
          </Link>
          {" "}- we&apos;ll be straight with you.
        </p>
      </div>
    </section>
  )
}
