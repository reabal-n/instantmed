import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter } from "@/components/marketing"
import { Button } from "@/components/ui/button"
import { ArrowRight, Shield, Clock } from "lucide-react"
import Link from "next/link"
import type { Metadata } from "next"
import { BreadcrumbSchema, FAQSchema } from "@/components/seo/healthcare-schema"
import { AccordionSection } from "@/components/sections"
import { conditionsData, type ConditionData } from "@/lib/seo/data/conditions"

export const metadata: Metadata = {
  title: "Health Conditions We Treat Online",
  description: "Get assessed for common health conditions by Australian doctors online. Medical certificates, treatment advice, and prescriptions for cold & flu, back pain, anxiety, and more.",
  openGraph: {
    title: "Health Conditions | InstantMed",
    description: "Online doctor consultations for common health conditions.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/conditions",
  },
}

// Map serviceType → user-facing tag chips on each card.
// Single source of truth lives in lib/seo/data/conditions.ts.
function getServiceTags(serviceType: ConditionData["serviceType"]): string[] {
  if (serviceType === "med-cert") return ["Medical Certificate"]
  if (serviceType === "consult") return ["Consultation", "Treatment Advice"]
  return ["Medical Certificate", "Consultation"]
}

// Render every condition from the canonical data file so the hub stays in
// sync with /conditions/[slug] and conditions/sitemap.ts. Sorted alphabetically
// for predictability — no manual curation drift.
const conditions = Object.values(conditionsData)
  .map((c) => ({
    slug: c.slug,
    name: c.name,
    description: c.description,
    services: getServiceTags(c.serviceType),
  }))
  .sort((a, b) => a.name.localeCompare(b.name))

const conditionsFaqs = [
  {
    question: "What conditions can you treat online?",
    answer: "We can assess and provide medical certificates for a range of common conditions including cold and flu, gastro, back pain, migraine, anxiety, UTIs, skin rashes, and sleep problems. Our doctors will let you know if your condition needs in-person care instead.",
  },
  {
    question: "Do I need a referral to use InstantMed?",
    answer: "No referral is needed. You can start a request directly through our website. An AHPRA-registered doctor reviews every submission and decides the appropriate next step.",
  },
  {
    question: "Can I get a medical certificate for any condition?",
    answer: "Medical certificates are available for conditions that genuinely prevent you from working or studying. Our doctors assess each request individually — if a certificate isn't clinically appropriate, they'll let you know.",
  },
  {
    question: "What if my condition is more serious than expected?",
    answer: "If our doctor determines your condition requires in-person examination, imaging, or emergency care, they'll advise you accordingly. We never push treatment beyond what's safe to deliver via telehealth.",
  },
  {
    question: "Can I get a prescription for my condition?",
    answer: "Where clinically appropriate, our doctors can issue eScripts for eligible medications. Some conditions and medications require an in-person consultation — our doctors will guide you if that's the case.",
  },
  {
    question: "How do your doctors assess conditions online?",
    answer: "You fill in a structured medical questionnaire about your symptoms, history, and current medications. A doctor reviews your responses (and any photos, if relevant) and makes a clinical decision — the same way they would in a clinic, minus the waiting room.",
  },
  {
    question: "Are your doctors qualified to treat these conditions?",
    answer: "Every doctor on our platform is registered with AHPRA and holds a current medical licence in Australia. They follow our clinical governance framework and only treat conditions within the scope of telehealth.",
  },
  {
    question: "What if I have a condition that's not listed here?",
    answer: "Start a general consultation and describe what's going on. Our doctors can assess a wide range of concerns beyond what's listed. If telehealth isn't appropriate for your situation, they'll point you in the right direction.",
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
      <FAQSchema faqs={conditionsFaqs} />

      <div className="flex min-h-screen flex-col bg-background">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-20">
          {/* Hero */}
          <section className="px-4 py-16 bg-muted/50 dark:bg-white/5 border-b border-border/50 dark:border-white/10">
            <div className="mx-auto max-w-4xl text-center">
              <h1 className="text-4xl font-semibold text-foreground mb-4">
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
                    className="group bg-white dark:bg-card rounded-2xl border border-border/50 shadow-md shadow-primary/[0.06] p-6 hover:shadow-lg hover:shadow-primary/[0.08] hover:-translate-y-0.5 transition-all duration-300 flex flex-col"
                  >
                    <h2 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                      {condition.name}
                    </h2>
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
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

          {/* FAQ Section */}
          <AccordionSection
            groups={[{ items: conditionsFaqs }]}
            title="Common Questions About Health Conditions"
            subtitle="What you should know before getting assessed online"
          />

          {/* Clinical Governance */}
          <div className="mx-auto max-w-3xl px-4 py-4 text-center">
            <p className="text-xs text-muted-foreground">
              All clinical decisions are made by AHPRA-registered doctors following{" "}
              <Link href="/clinical-governance" className="text-primary hover:underline">
                our clinical governance framework
              </Link>
              . We never automate clinical decisions.
            </p>
          </div>

          {/* CTA */}
          <section className="px-4 py-16 bg-primary/5">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                Not sure which service you need?
              </h2>
              <p className="text-muted-foreground mb-8">
                Start a consultation and our doctors will help you figure out the best path forward.
              </p>
              <Button asChild size="lg" className="rounded-full">
                <Link href="/request">
                  Start a request
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
