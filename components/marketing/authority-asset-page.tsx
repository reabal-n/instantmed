import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarCheck,
  ExternalLink,
  FileText,
  ShieldCheck,
} from "lucide-react"
import Link from "next/link"

import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell"
import { Navbar } from "@/components/shared/navbar"
import { Heading } from "@/components/ui/heading"
import { SectionPill } from "@/components/ui/section-pill"
import type { AuthorityAsset, AuthorityAssetSource } from "@/lib/authority-assets"

interface AuthorityAssetPageProps {
  asset: AuthorityAsset
}

const cardClass =
  "rounded-2xl border border-border/50 bg-white p-5 shadow-md shadow-primary/[0.06] dark:border-white/15 dark:bg-card dark:shadow-none"

export function AuthorityAssetPage({ asset }: AuthorityAssetPageProps) {
  const sourceMap = new Map(asset.sources.map((source) => [source.id, source]))

  return (
    <MarketingPageShell>
      <div className="flex min-h-screen flex-col">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-20">
          <section className="px-4 py-16 sm:px-6 lg:py-20">
            <div className="mx-auto max-w-6xl">
              <div className="max-w-3xl">
                <SectionPill>{asset.eyebrow}</SectionPill>
                <Heading level="display" className="mt-6">
                  {asset.title}
                </Heading>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                  {asset.summary}
                </p>

                <div className="mt-8 flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-white px-3 py-1.5 shadow-sm shadow-primary/[0.04] dark:border-white/15 dark:bg-card dark:shadow-none">
                    <CalendarCheck className="h-4 w-4 text-primary" />
                    Last reviewed: {asset.lastReviewed}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-white px-3 py-1.5 shadow-sm shadow-primary/[0.04] dark:border-white/15 dark:bg-card dark:shadow-none">
                    <BookOpen className="h-4 w-4 text-primary" />
                    {asset.readingTime}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-white px-3 py-1.5 shadow-sm shadow-primary/[0.04] dark:border-white/15 dark:bg-card dark:shadow-none">
                    <FileText className="h-4 w-4 text-primary" />
                    Source-backed
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="border-y border-border/40 bg-muted/35 px-4 py-10 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
              <div className={cardClass}>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Asset type
                </p>
                <p className="mt-3 text-sm leading-6 text-foreground">
                  Linkable authority page for journalists, researchers, search engines, and answer engines.
                </p>
              </div>
              <div className={cardClass}>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Source discipline
                </p>
                <p className="mt-3 text-sm leading-6 text-foreground">
                  Every claim section cites public sources and separates facts from service boundaries.
                </p>
              </div>
              <div className={cardClass}>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Clinical boundary
                </p>
                <p className="mt-3 text-sm leading-6 text-foreground">
                  General information only. A doctor decides what is clinically appropriate for an individual case.
                </p>
              </div>
            </div>
          </section>

          <section className="px-4 py-16 sm:px-6 lg:py-20">
            <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
              <div className="space-y-5">
                {asset.sections.map((section, index) => {
                  const sources = section.sourceIds
                    .map((sourceId) => sourceMap.get(sourceId))
                    .filter((source): source is AuthorityAssetSource => Boolean(source))

                  return (
                    <article
                      key={section.id}
                      id={section.id}
                      className={cardClass}
                    >
                      <div className="flex items-start gap-4">
                        <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <Heading level="h2" as="h2">
                            {section.title}
                          </Heading>
                          <p className="mt-4 rounded-xl border border-primary/15 bg-primary/5 p-4 text-base font-medium leading-7 text-foreground">
                            Claim: {section.claim}
                          </p>
                          <div className="mt-5 space-y-4 text-base leading-8 text-muted-foreground">
                            {section.body.map((paragraph) => (
                              <p key={paragraph}>{paragraph}</p>
                            ))}
                          </div>
                          <div className="mt-6 flex flex-wrap gap-2">
                            {sources.map((sourceItem) => (
                              <a
                                key={sourceItem.id}
                                href={sourceItem.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/45 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary dark:border-white/15 dark:bg-white/[0.05]"
                              >
                                {sourceItem.publisher}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ))}
                          </div>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>

              <aside className="space-y-5 lg:sticky lg:top-24">
                <section className={cardClass}>
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <h2 className="text-base font-semibold text-foreground">
                      Neutral limits
                    </h2>
                  </div>
                  <ul className="mt-4 space-y-3">
                    {asset.clinicalLimits.map((limit) => (
                      <li key={limit} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                        <span>{limit}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className={cardClass}>
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <h2 className="text-base font-semibold text-foreground">
                      Sources
                    </h2>
                  </div>
                  <div className="mt-4 space-y-4">
                    {asset.sources.map((sourceItem) => (
                      <a
                        key={sourceItem.id}
                        href={sourceItem.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-xl border border-border/50 bg-muted/35 p-3 transition-colors hover:border-primary/30 dark:border-white/10 dark:bg-white/[0.04]"
                      >
                        <span className="block text-sm font-medium leading-5 text-foreground">
                          {sourceItem.title}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                          {sourceItem.publisher}
                        </span>
                        <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                          Open source
                          <ExternalLink className="h-3 w-3" />
                        </span>
                      </a>
                    ))}
                  </div>
                </section>

                <section className={cardClass}>
                  <h2 className="text-base font-semibold text-foreground">
                    Related InstantMed pages
                  </h2>
                  <div className="mt-4 space-y-2">
                    {asset.relatedLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="flex items-center justify-between rounded-xl border border-border/50 px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary dark:border-white/10"
                      >
                        {link.title}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    ))}
                  </div>
                </section>
              </aside>
            </div>
          </section>

          <section className="border-t border-border/40 bg-muted/35 px-4 py-12 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Cite this page
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  InstantMed, "{asset.title}", last reviewed {asset.lastReviewed}.
                </p>
              </div>
              <Link
                href="/resources"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-[transform,box-shadow,background-color] hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30"
              >
                All authority resources
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </main>

        <MarketingFooter />
      </div>
    </MarketingPageShell>
  )
}
