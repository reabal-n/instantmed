import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter } from "@/components/marketing"
import { Button } from "@/components/ui/button"
import { ArrowRight, Shield, Clock, Star } from "lucide-react"
import Link from "next/link"
import type { Metadata } from "next"
import { BreadcrumbSchema } from "@/components/seo/healthcare-schema"

export const metadata: Metadata = {
  title: "Health Conditions We Can Help With | Online Doctor",
  description: "Get assessed for common health conditions by Australian doctors online. Medical certificates, treatment advice, and prescriptions for conditions like cold & flu, back pain, anxiety, and more.",
  openGraph: {
    title: "Health Conditions | InstantMed",
    description: "Online doctor consultations for common health conditions.",
  },
}

const conditions = [
  {
    slug: "cold-and-flu",
    name: "Cold & Flu",
    description: "Viral infections with fever, cough, and body aches",
    services: ["Medical Certificate", "Symptom Assessment"]
  },
  {
    slug: "gastro",
    name: "Gastroenteritis",
    description: "Stomach bug causing vomiting and diarrhea",
    services: ["Medical Certificate", "Treatment Advice"]
  },
  {
    slug: "back-pain",
    name: "Back Pain",
    description: "Lower, middle, or upper back pain and discomfort",
    services: ["Medical Certificate", "Assessment", "Referrals"]
  },
  {
    slug: "migraine",
    name: "Migraine",
    description: "Severe headaches with nausea and light sensitivity",
    services: ["Medical Certificate", "Management Review"]
  },
  {
    slug: "anxiety",
    name: "Anxiety",
    description: "Excessive worry affecting daily life and wellbeing",
    services: ["Medical Certificate", "Support", "Referrals"]
  },
  {
    slug: "uti",
    name: "Urinary Tract Infection",
    description: "Bladder infections causing painful urination",
    services: ["Assessment", "Treatment"]
  },
  {
    slug: "skin-rash",
    name: "Skin Rash",
    description: "Redness, itching, or changes in skin appearance",
    services: ["Photo Assessment", "Treatment Advice"]
  },
  {
    slug: "insomnia",
    name: "Insomnia & Sleep Problems",
    description: "Difficulty sleeping or staying asleep",
    services: ["Medical Certificate", "Assessment", "Advice"]
  },
]

export default function ConditionsIndexPage() {
  return (
    <>
      <BreadcrumbSchema 
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Conditions", url: "https://instantmed.com.au/conditions" }
        ]} 
      />

      <div className="flex min-h-screen flex-col bg-white/50 dark:bg-black">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-20">
          {/* Hero */}
          <section className="px-4 py-16 bg-white/80 dark:bg-white/5 border-b border-white/50 dark:border-white/10">
            <div className="mx-auto max-w-4xl text-center">
              <h1 className="text-4xl font-bold text-foreground mb-4">
                Health Conditions We Can Help With
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                Get assessed by Australian-registered doctors for common health conditions. 
                Medical certificates, treatment advice, and prescriptions when appropriate.
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <span>AHPRA registered doctors</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>Response in ~1 hour</span>
                </div>
              </div>
            </div>
          </section>

          {/* Conditions Grid */}
          <section className="px-4 py-16">
            <div className="mx-auto max-w-5xl">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {conditions.map((condition) => (
                  <Link
                    key={condition.slug}
                    href={`/conditions/${condition.slug}`}
                    className="group bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-white/50 dark:border-white/10 p-6 hover:border-primary/50 hover:shadow-lg transition-all"
                  >
                    <h2 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                      {condition.name}
                    </h2>
                    <p className="text-muted-foreground text-sm mb-4">
                      {condition.description}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {condition.services.map((service) => (
                        <span 
                          key={service}
                          className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full"
                        >
                          {service}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center text-sm text-primary font-medium">
                      Learn more
                      <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
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
                Not sure which service you need?
              </h2>
              <p className="text-muted-foreground mb-8">
                Start a consultation and our doctors will help you figure out the best path forward.
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

        <MarketingFooter />
      </div>
    </>
  )
}
