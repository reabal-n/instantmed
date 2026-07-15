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
      className="border-t border-border/30 py-8 dark:border-white/10"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <nav aria-label="More medical certificate guidance" className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
          {REASON_SLUGS.map((slug) => {
            const config = medCertIntentConfigs[slug]
            return (
              <Link
                key={slug}
                href={`/medical-certificate/${slug}`}
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                {config.explainerTitle}
              </Link>
            )
          })}
          <Link
            href="/medical-certificate/employer-acceptance"
            className="inline-flex items-center gap-1 font-medium text-primary hover:text-primary/80"
          >
            Employer evidence guide <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
          <Link href="/prescriptions" className="text-muted-foreground transition-colors hover:text-primary">
            Repeat prescriptions
          </Link>
        </nav>
      </div>
    </section>
  )
}
