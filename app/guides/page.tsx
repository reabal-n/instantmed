import { ArrowRight, Clock } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { BreadcrumbSchema } from "@/components/seo"
import { Footer,Navbar } from "@/components/shared"
import { Button } from "@/components/ui/button"
import { SectionPill } from "@/components/ui/section-pill"
import { getGuideIndex } from "@/lib/seo/data/guides"

export const metadata: Metadata = {
  title: "Healthcare Guides | How-To Articles",
  description: "Practical guides on getting medical certificates, using telehealth in Australia, and navigating the healthcare system. Written and reviewed by healthcare professionals.",
  openGraph: {
    title: "Healthcare Guides | InstantMed",
    description: "Practical guides on telehealth and healthcare in Australia.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/guides",
  },
}

export default function GuidesIndexPage() {
  const guides = getGuideIndex()

  return (
    <>
      <BreadcrumbSchema 
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Guides", url: "https://instantmed.com.au/guides" }
        ]} 
      />

      <div className="flex min-h-screen flex-col bg-background dark:bg-black">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-20">
          {/* Hero */}
          <section className="px-4 py-16 border-b border-border dark:border-border">
            <div className="mx-auto max-w-4xl text-center">
              <div className="mb-6">
                <SectionPill>Healthcare Guides</SectionPill>
              </div>
              <h1 className="text-4xl font-semibold text-foreground mb-4">
                Practical Healthcare Guides
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Clear, practical information on getting medical certificates, using telehealth, 
                and navigating Australia&apos;s healthcare system.
              </p>
            </div>
          </section>

          {/* Guides List */}
          <section className="px-4 py-16">
            <div className="mx-auto max-w-3xl">
              <div className="space-y-6">
                {guides.map((guide) => (
                  <Link
                    key={guide.slug}
                    href={`/guides/${guide.slug}`}
                    className="group block bg-white dark:bg-card rounded-2xl border border-border/50 shadow-md shadow-primary/[0.06] p-6 hover:shadow-lg hover:shadow-primary/[0.08] hover:-translate-y-0.5 transition-[transform,box-shadow] duration-300"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <span className="text-xs font-medium px-2 py-1 bg-primary/10 text-primary rounded-full">
                          {guide.category}
                        </span>
                        <h2 className="text-xl font-semibold text-foreground mt-3 mb-2 group-hover:text-primary transition-colors">
                          {guide.title}
                        </h2>
                        <p className="text-muted-foreground mb-4">
                          {guide.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            <span>{guide.readTime}</span>
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-[transform,color] shrink-0 mt-2" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="px-4 py-16 bg-primary/5">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                Need a Medical Certificate Now?
              </h2>
              <p className="text-muted-foreground mb-8">
                Skip the reading - an AHPRA-registered doctor can help you in under an hour.
              </p>
              <Button asChild size="lg" className="rounded-full shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-[transform,box-shadow]">
                <Link href="/request">
                  Start a request
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  )
}
