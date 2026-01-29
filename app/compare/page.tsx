import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { Button } from "@/components/ui/button"
import { ArrowRight, Scale, Zap, Building2, Globe } from "lucide-react"
import Link from "next/link"
import type { Metadata } from "next"
import { BreadcrumbSchema } from "@/components/seo/healthcare-schema"

export const metadata: Metadata = {
  title: "Compare Healthcare Options | Telehealth vs GP | InstantMed",
  description: "Compare telehealth with traditional GP visits and other healthcare options. Honest comparisons to help you choose the right care for your needs.",
  openGraph: {
    title: "Compare Healthcare Options | InstantMed",
    description: "Honest comparisons between telehealth and other healthcare options.",
  },
}

const comparisons = [
  {
    slug: "telehealth-vs-gp",
    title: "Telehealth vs In-Person GP",
    description: "Compare telehealth services with traditional GP visits. Understand when each option is best for your healthcare needs.",
    icon: Building2,
    highlights: ["Wait times", "Physical exams", "Cost", "Convenience"]
  },
  {
    slug: "online-medical-certificate-options",
    title: "Online Medical Certificate Services Compared",
    description: "Compare different online medical certificate services in Australia. What to look for and how options differ.",
    icon: Globe,
    highlights: ["Response times", "Pricing", "Legitimacy", "Features"]
  },
  {
    slug: "waiting-room-vs-telehealth",
    title: "Skip the Waiting Room: Is Telehealth Worth It?",
    description: "Tired of waiting rooms? See how telehealth changes the equation for common healthcare needs.",
    icon: Zap,
    highlights: ["Time savings", "Convenience", "When to use each"]
  },
]

export default function CompareIndexPage() {
  return (
    <>
      <BreadcrumbSchema 
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Compare", url: "https://instantmed.com.au/compare" }
        ]} 
      />

      <div className="flex min-h-screen flex-col bg-white/50 dark:bg-black">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-20">
          {/* Hero */}
          <section className="px-4 py-16 bg-white/80 dark:bg-white/5 border-b border-white/50 dark:border-white/10">
            <div className="mx-auto max-w-4xl text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                <Scale className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Honest Comparisons</span>
              </div>
              <h1 className="text-4xl font-bold text-foreground mb-4">
                Compare Your Healthcare Options
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                We believe in transparency. These comparisons are honest assessments to help you 
                choose the right care for your situation — even when that&apos;s not us.
              </p>
            </div>
          </section>

          {/* Comparisons Grid */}
          <section className="px-4 py-16">
            <div className="mx-auto max-w-4xl">
              <div className="grid gap-6">
                {comparisons.map((comparison) => (
                  <Link
                    key={comparison.slug}
                    href={`/compare/${comparison.slug}`}
                    className="group bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-white/50 dark:border-white/10 p-6 hover:border-primary/50 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <comparison.icon className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h2 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                          {comparison.title}
                        </h2>
                        <p className="text-muted-foreground mb-4">
                          {comparison.description}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {comparison.highlights.map((highlight) => (
                            <span 
                              key={highlight}
                              className="text-xs px-2 py-1 bg-white/60 dark:bg-white/10 rounded-full text-muted-foreground"
                            >
                              {highlight}
                            </span>
                          ))}
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="px-4 py-16 bg-primary/5">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Ready to Try Telehealth?
              </h2>
              <p className="text-muted-foreground mb-8">
                See why thousands of Australians choose InstantMed for quick, convenient healthcare.
              </p>
              <Button asChild size="lg" className="rounded-full">
                <Link href="/request">
                  Get started
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
