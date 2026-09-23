import { ArrowRight } from "lucide-react"
import Link from "next/link"

import {
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

const REASON_LABELS: Record<MedCertIntentSlug, string> = {
  'return-to-work': 'Return to work', centrelink: 'Centrelink evidence',
  'sick-leave': 'Sick leave certificates', work: 'Certificates for work', study: 'Certificates for study', carer: "Carer’s leave certificates", school: 'Adult student certificates', university: 'University certificates', 'work-from-home': 'Working from home', flu: 'Flu and work absence', gastro: 'Gastro and work absence', migraine: 'Migraine and work absence', 'back-pain': 'Back pain and work absence', anxiety: 'Anxiety and work absence', covid: 'COVID-19 and work absence',
}

export function MedCertReasonLinks() {
  return (
    <section
      aria-label="Certificates by reason"
      className="border-t border-border/30 py-4 dark:border-white/10"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <details>
          <summary className="mx-auto w-fit cursor-pointer rounded-lg px-3 min-h-12 py-3 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            More certificate guidance
          </summary>
          <nav aria-label="More medical certificate guidance" className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {REASON_SLUGS.map((slug) => {
              return (
                <Link
                  key={slug}
                  href={`/medical-certificate/${slug}`}
                  className="flex min-h-11 items-center text-muted-foreground transition-colors hover:text-primary"
                >
                  {REASON_LABELS[slug]}
                </Link>
              )
            })}
            <Link
              href="/medical-certificate/employer-acceptance"
              className="inline-flex items-center gap-1 font-medium text-primary hover:text-primary/80"
            >
              Employer evidence guide <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
            <Link href="/prescriptions" className="flex min-h-11 items-center text-muted-foreground transition-colors hover:text-primary">
              Repeat prescriptions
            </Link>
          </nav>
        </details>
      </div>
    </section>
  )
}
