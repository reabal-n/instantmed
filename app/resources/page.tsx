import { ArrowRight, BookOpen, CalendarCheck, FileText } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell"
import { BreadcrumbSchema } from "@/components/seo"
import { Navbar } from "@/components/shared/navbar"
import { Heading } from "@/components/ui/heading"
import { SectionPill } from "@/components/ui/section-pill"
import { getAuthorityAssetGroups } from "@/lib/authority-assets"

const baseUrl = "https://instantmed.com.au"
const authorityResourceGroupLabels = [
  "Certificate evidence",
  "Prescription safety",
  "Telehealth access",
  "Privacy and governance",
] as const
const authorityResourceGroupRank: ReadonlyMap<string, number> = new Map(
  authorityResourceGroupLabels.map((label, index) => [label, index]),
)

export const metadata: Metadata = {
  title: "Australian Telehealth Authority Resources | InstantMed",
  description:
    "Source-backed Australian telehealth resources for safety, medical certificates, secure prescription requests, GP access, complaints, and clinical governance.",
  alternates: {
    canonical: `${baseUrl}/resources`,
  },
  openGraph: {
    title: "Australian Telehealth Authority Resources | InstantMed",
    description:
      "Source-backed Australian telehealth resources built for journalists, search engines, and answer engines.",
    url: `${baseUrl}/resources`,
    type: "website",
  },
}

export const revalidate = 86400

export default function ResourcesPage() {
  const groups = getAuthorityAssetGroups().sort(
    (a, b) =>
      (authorityResourceGroupRank.get(a.title) ?? 99) -
      (authorityResourceGroupRank.get(b.title) ?? 99),
  )

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: baseUrl },
          { name: "Authority resources", url: `${baseUrl}/resources` },
        ]}
      />
      <MarketingPageShell>
        <div className="flex min-h-screen flex-col">
          <Navbar variant="marketing" />

          <main className="flex-1 pt-20">
            <section className="px-4 py-16 sm:px-6 lg:py-20">
              <div className="mx-auto max-w-6xl">
                <div className="max-w-3xl">
                  <SectionPill>Authority resources</SectionPill>
                  <Heading level="display" className="mt-6">
                    Source-backed Australian telehealth references
                  </Heading>
                  <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                    These are not generic blog posts. They are citeable resources with visible sources,
                    reviewed dates, plain clinical limits, and careful language around employer policy,
                    prescription requests, telehealth access, privacy, billing, complaints, and governance.
                  </p>
                </div>

                <div className="mt-10 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-border/50 bg-white p-5 shadow-md shadow-primary/[0.06] dark:border-white/15 dark:bg-card dark:shadow-none">
                    <CalendarCheck className="h-5 w-5 text-primary" />
                    <p className="mt-3 text-sm font-semibold text-foreground">
                      Reviewed 6 June 2026
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Every asset carries the same visible review date.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/50 bg-white p-5 shadow-md shadow-primary/[0.06] dark:border-white/15 dark:bg-card dark:shadow-none">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <p className="mt-3 text-sm font-semibold text-foreground">
                      Public sources
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Sections cite official or public Australian sources.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/50 bg-white p-5 shadow-md shadow-primary/[0.06] dark:border-white/15 dark:bg-card dark:shadow-none">
                    <FileText className="h-5 w-5 text-primary" />
                    <p className="mt-3 text-sm font-semibold text-foreground">
                      Neutral boundaries
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      No broad acceptance claims, treatment promises, or product-led prescription language.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="px-4 pb-20 sm:px-6">
              <div className="mx-auto max-w-6xl space-y-12">
                {groups.map((group) => (
                  <section key={group.id} aria-labelledby={`${group.id}-heading`}>
                    <div className="mb-5 max-w-3xl">
                      <h2
                        id={`${group.id}-heading`}
                        className="text-2xl font-semibold tracking-normal text-foreground"
                      >
                        {group.title}
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {group.description}
                      </p>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                      {group.assets.map((asset) => (
                        <Link
                          key={asset.slug}
                          href={`/resources/${asset.slug}`}
                          className="group rounded-2xl border border-border/50 bg-white p-6 shadow-md shadow-primary/[0.06] transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/[0.08] dark:border-white/15 dark:bg-card dark:shadow-none"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                                {asset.eyebrow}
                              </p>
                              <h3 className="mt-3 text-xl font-semibold tracking-normal text-foreground">
                                {asset.title}
                              </h3>
                            </div>
                            <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                          </div>
                          <p className="mt-4 text-sm leading-6 text-muted-foreground">
                            {asset.description}
                          </p>
                          <div className="mt-6 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span className="rounded-full border border-border/50 px-3 py-1 dark:border-white/15">
                              Last reviewed: {asset.lastReviewed}
                            </span>
                            <span className="rounded-full border border-border/50 px-3 py-1 dark:border-white/15">
                              {asset.readingTime}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </section>
          </main>

          <MarketingFooter />
        </div>
      </MarketingPageShell>
    </>
  )
}
