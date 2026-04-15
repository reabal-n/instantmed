"use client"

import { CONTACT_EMAIL } from "@/lib/constants"

// =============================================================================
// COMPONENT
// =============================================================================

/** Limitations callout - honest scope boundary for consultations */
export function ConsultLimitationsSection() {
  return (
    <section aria-label="Consultation limitations" className="pb-4">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-border/40 bg-muted/30 dark:bg-white/[0.03] px-6 py-5">
          <p className="text-sm font-medium text-foreground mb-3">
            Not suitable for every situation
          </p>
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
            {[
              "Emergencies: call 000 immediately",
              "Conditions requiring physical examination",
              "Schedule 8 drugs (opioids, stimulants)",
              "Workers\u2019 compensation assessments",
              "Complex mental health crises",
              "Patients under 18 (parental consent required)",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span aria-hidden="true" className="mt-0.5 text-muted-foreground/70 shrink-0">&times;</span>
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            Not sure if telehealth is right for your concern?{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
              Ask us first
            </a>{" "}
            - we&apos;ll point you in the right direction.
          </p>
        </div>
      </div>
    </section>
  )
}
