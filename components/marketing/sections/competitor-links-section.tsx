import Link from "next/link"
import { ArrowRight, Scale } from "lucide-react"
import { SectionPill } from "@/components/ui/section-pill"
import { COMPETITOR_COMPARISONS } from "@/lib/seo/data/competitor-comparisons"

interface CompetitorLinksSectionProps {
  /** Slugs to display - omit to show all competitors */
  slugs?: string[]
  className?: string
}

/**
 * Inline comparison links section for landing pages.
 * Links to competitor-specific /compare/instantmed-vs-X pages for SEO internal linking.
 */
export function CompetitorLinksSection({ slugs, className }: CompetitorLinksSectionProps) {
  const entries = slugs
    ? slugs.map(s => COMPETITOR_COMPARISONS[s]).filter(Boolean)
    : Object.values(COMPETITOR_COMPARISONS)

  if (entries.length === 0) return null

  return (
    <section className={className ?? "px-4 py-12 sm:px-6"}>
      <div className="mx-auto max-w-4xl">
        <div className="text-center mb-8">
          <SectionPill>How We Compare</SectionPill>
          <h2 className="mt-4 text-2xl font-semibold text-foreground">
            See how InstantMed stacks up
          </h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto">
            Honest, side-by-side comparisons with other Australian telehealth services.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => (
            <Link
              key={entry.slug}
              href={`/compare/${entry.slug}`}
              className="group flex items-center gap-3 rounded-xl border border-border/50 bg-white dark:bg-card p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <Scale className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors flex-1">
                vs {entry.competitor.name}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
          ))}
        </div>

        <p className="mt-4 text-center">
          <Link
            href="/compare"
            className="text-xs text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
          >
            View all comparisons
            <ArrowRight className="w-3 h-3" />
          </Link>
        </p>
      </div>
    </section>
  )
}
