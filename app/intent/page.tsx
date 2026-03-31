import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter } from "@/components/marketing"
import { Button } from "@/components/ui/button"
import { ArrowRight, Search } from "lucide-react"
import Link from "next/link"
import type { Metadata } from "next"
import { BreadcrumbSchema } from "@/components/seo/healthcare-schema"

export const metadata: Metadata = {
  title: "Find What You Need | Online Doctor Services | InstantMed",
  description: "Looking for a specific telehealth service? Same-day medical certificates, UTI treatment, after-hours doctor, repeat prescriptions, and more — all reviewed by Australian doctors.",
  openGraph: {
    title: "Find What You Need | InstantMed",
    description: "Same-day medical certificates, prescriptions, and consultations reviewed by Australian doctors.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/intent",
  },
}

const intents = [
  { slug: "same-day-medical-certificate", name: "Same Day Medical Certificate", description: "Get a valid certificate reviewed and emailed within hours" },
  { slug: "work-certificate-online", name: "Work Certificate Online", description: "Sick leave certificate accepted by all Australian employers" },
  { slug: "flu-certificate-online", name: "Cold & Flu Certificate", description: "Too sick to work? Get a certificate from your couch" },
  { slug: "uti-treatment-online", name: "UTI Treatment Online", description: "Doctor-assessed UTI treatment with same-day eScript" },
  { slug: "repeat-prescription-online", name: "Repeat Prescription Online", description: "Renew existing medication without a clinic visit" },
  { slug: "after-hours-doctor", name: "After Hours Doctor", description: "Available 8am-10pm AEST, 7 days including weekends" },
  { slug: "hair-loss-treatment-online", name: "Hair Loss Treatment", description: "Doctor-reviewed treatment plans for hair thinning" },
  { slug: "emergency-contraception-online", name: "Emergency Contraception", description: "Confidential doctor assessment with same-day eScript" },
]

export default function IntentPage() {
  return (
    <>
      <BreadcrumbSchema items={[
        { name: "Home", url: "https://instantmed.com.au" },
        { name: "Services", url: "https://instantmed.com.au/intent" },
      ]} />

      <div className="flex min-h-screen flex-col">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-20">
          <section className="px-4 py-12 sm:py-16">
            <div className="mx-auto max-w-4xl">
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm mb-6">
                  <Search className="h-4 w-4" />
                  Find what you need
                </div>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl mb-4">
                  What Can We Help With?
                </h1>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                  Whether you need a certificate, a prescription, or just to speak with a doctor — find the right service below.
                  All reviewed by AHPRA-registered Australian doctors.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {intents.map((intent) => (
                  <Link
                    key={intent.slug}
                    href={`/intent/${intent.slug}`}
                    className="group p-5 rounded-xl border border-border/50 dark:border-white/15 bg-white dark:bg-card shadow-md shadow-primary/[0.06] dark:shadow-none hover:border-primary/30 transition-all"
                  >
                    <h2 className="font-semibold text-foreground group-hover:text-primary transition-colors mb-1">
                      {intent.name}
                    </h2>
                    <p className="text-sm text-muted-foreground mb-3">{intent.description}</p>
                    <span className="text-xs text-primary font-medium flex items-center gap-1">
                      Learn more <ArrowRight className="h-3 w-3" />
                    </span>
                  </Link>
                ))}
              </div>

              <div className="mt-12 text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Not sure what you need? Start here and a doctor will guide you.
                </p>
                <Button asChild size="lg" className="rounded-full shadow-lg shadow-primary/20">
                  <Link href="/request">
                    Get started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <div className="mt-12 flex flex-wrap justify-center gap-3 text-sm">
                <Link href="/conditions" className="text-primary hover:underline">Browse conditions</Link>
                <span className="text-muted-foreground">·</span>
                <Link href="/symptoms" className="text-primary hover:underline">Check symptoms</Link>
                <span className="text-muted-foreground">·</span>
                <Link href="/guides" className="text-primary hover:underline">Read guides</Link>
                <span className="text-muted-foreground">·</span>
                <Link href="/locations" className="text-primary hover:underline">Find your city</Link>
              </div>
            </div>
          </section>
        </main>

        <MarketingFooter />
      </div>
    </>
  )
}
