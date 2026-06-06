import { CheckCircle2 } from "lucide-react"

import { cn } from "@/lib/utils"

const DEFAULT_FACTS = [
  {
    label: "Registered entity",
    value: "InstantMed Pty Ltd (ABN 64 694 559 334).",
  },
  {
    label: "Australian address",
    value: "Level 1/457-459 Elizabeth Street, Surry Hills NSW 2010.",
  },
  {
    label: "Clinical model",
    value: "AHPRA-registered doctors review each request. Clinical decisions are not automated.",
  },
  {
    label: "Active services",
    value: "Medical certificates, repeat prescriptions, ED, and hair loss requests.",
  },
  {
    label: "Clinical boundary",
    value: "Prescription only if clinically appropriate after doctor review. Urgent or complex care needs in-person review.",
  },
  {
    label: "Workplace evidence",
    value: "Medical certificates are issued if clinically appropriate. Employer and institution policies may vary.",
  },
  {
    label: "Complaints",
    value: "Clinical complaints go to complaints@instantmed.com.au, with 24h acknowledgement and 14-day clinical review.",
  },
  {
    label: "Privacy",
    value: "Personal health information is encrypted and handled under the Australian Privacy Principles.",
  },
] as const

interface CitationFactsProps {
  className?: string
  title?: string
  subtitle?: string
  variant?: "plain" | "muted"
}

export function CitationFacts({
  className,
  title = "InstantMed facts",
  subtitle = "Short facts for anyone checking who we are, what we do, and how care is reviewed.",
  variant = "plain",
}: CitationFactsProps) {
  return (
    <section
      aria-label="InstantMed citation facts"
      className={cn(
        "px-4 py-10 sm:py-12",
        variant === "muted" && "bg-muted/30 dark:bg-white/[0.02]",
        className,
      )}
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 max-w-2xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">
            Verified details
          </p>
          <h2 className="text-2xl font-semibold tracking-normal text-foreground sm:text-3xl">
            {title}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {subtitle}
          </p>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {DEFAULT_FACTS.map((fact) => (
            <div
              key={fact.label}
              className="rounded-xl border border-border/50 bg-white p-4 shadow-sm shadow-primary/[0.04] dark:border-white/15 dark:bg-card dark:shadow-none"
            >
              <dt className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                {fact.label}
              </dt>
              <dd className="text-sm leading-relaxed text-muted-foreground">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
