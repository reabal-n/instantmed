"use client"

import { CONTACT_EMAIL } from "@/lib/constants"

// =============================================================================
// COMPONENT
// =============================================================================

/** Limitations callout — honest scope boundary, reduces bad-fit conversions */
export function LimitationsSection() {
  return (
    <section aria-label="Service limitations" className="pb-4">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-border/40 bg-muted/30 dark:bg-white/[0.03] px-6 py-5">
          <p className="text-sm font-medium text-foreground mb-3">
            Not the right fit for every situation
          </p>
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
            {[
              "Backdated certificates for past absences",
              "Conditions needing physical examination",
              "Workers\u2019 compensation claims",
              "Complex or ongoing chronic conditions",
              "Patients under 18 (parental consent required)",
              "Medical emergencies \u2014 call 000",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="mt-0.5 text-muted-foreground/40 shrink-0">&times;</span>
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            Not sure if we can help?{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
              Ask us first
            </a>{" "}
            — we&apos;ll be straight with you.
          </p>
        </div>
      </div>
    </section>
  )
}
