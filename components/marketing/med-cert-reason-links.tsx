import { ArrowRight } from "lucide-react"
import Link from "next/link"

import {
  medCertIntentConfigs,
  type MedCertIntentSlug,
} from "@/lib/marketing/med-cert-intent-config"

/**
 * Server-rendered "Certificates by reason" links for the /medical-certificate
 * hub. This is the crawlable inbound-link surface for the intent children —
 * without it the deepened condition pages (anxiety, flu, migraine, gastro,
 * back-pain, covid) are internal-link orphans.
 *
 * Labels/descriptions come straight from the intent configs so this section
 * can never drift from the compliance-reviewed copy on the pages themselves.
 * return-to-work + centrelink are boundary aliases of "work" and deliberately
 * excluded.
 */
const REASON_SLUGS: MedCertIntentSlug[] = [
  "sick-leave",
  "work",
  "study",
  "carer",
  "school",
  "university",
  "work-from-home",
  "flu",
  "gastro",
  "migraine",
  "back-pain",
  "anxiety",
  "covid",
]

export function MedCertReasonLinks() {
  return (
    <section
      aria-label="Certificates by reason"
      className="py-12 border-t border-border/30 dark:border-white/10"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-lg font-semibold text-foreground mb-2 text-center">
          Certificates by reason
        </h2>
        <p className="text-sm text-muted-foreground mb-8 text-center">
          Guidance for the situations we&apos;re asked about most: what a certificate covers, and
          where the boundaries are.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
          {REASON_SLUGS.map((slug) => {
            const config = medCertIntentConfigs[slug]
            return (
              <Link key={slug} href={`/medical-certificate/${slug}`} className="group block">
                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                  {config.explainerTitle}
                </span>
                <span className="mt-0.5 block text-sm text-muted-foreground">
                  {config.explainerSubtitle}
                </span>
              </Link>
            )
          })}
          <Link href="/medical-certificate/employer-acceptance" className="group block">
            <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground group-hover:text-primary transition-colors">
              Employer evidence guide <ArrowRight className="h-3 w-3" />
            </span>
            <span className="mt-0.5 block text-sm text-muted-foreground">
              How employers can verify online certificates, and the policy caveats to check first.
            </span>
          </Link>
        </div>
      </div>
    </section>
  )
}
