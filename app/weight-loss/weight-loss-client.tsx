'use client'

import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Lock,
  Shield,
  Zap,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import Script from "next/script"

import { CenteredHero } from "@/components/heroes"
import { StickerIcon } from "@/components/icons/stickers"
import { DoctorCredibility } from "@/components/marketing/doctor-credibility"
import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { RegulatoryPartners } from "@/components/marketing/regulatory-partners"
import { ServiceClaimSection } from "@/components/marketing/sections/service-claim-section"
import { CTABanner } from "@/components/sections/cta-banner"
import { FAQSection } from "@/components/sections/faq-section"
import { FeatureGrid } from "@/components/sections/feature-grid"
import { ProcessSteps } from "@/components/sections/process-steps"
import { AvailabilityIndicator } from "@/components/shared/availability-indicator"
import { Navbar } from "@/components/shared/navbar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Heading } from "@/components/ui/heading"
import { safeJsonLd } from "@/lib/seo/safe-json-ld"

const assessmentAreas = [
  {
    id: "health-profile",
    name: "Health profile",
    examples: "BMI, history, current medications",
    description: "Your doctor reviews your health background before deciding whether online weight management care is suitable.",
    howItWorks: "Checks clinical eligibility and safety boundaries",
    suitableFor: "Adults who meet assessment criteria",
    popular: false,
  },
  {
    id: "goals",
    name: "Goals and prior attempts",
    examples: "Weight history and previous support",
    description: "The form captures what you have tried, what changed, and what support you want the doctor to consider.",
    howItWorks: "Gives the doctor enough context to advise responsibly",
    suitableFor: "People seeking structured clinical review",
    popular: false,
  },
]

const platformFeatures = [
  {
    icon: <StickerIcon name="scales" size={48} />,
    title: "Doctor Reviewed",
    description: "Your request is reviewed by an AHPRA-registered doctor before any next step is recommended.",
  },
  {
    icon: <StickerIcon name="clock" size={48} />,
    title: "Quick Turnaround",
    description: "Submit any time. Doctor review follows when available.",
  },
  {
    icon: <StickerIcon name="pulse" size={48} />,
    title: "Follow-Up If Needed",
    description: "The doctor can request more information or recommend follow-up when your situation needs it.",
  },
  {
    icon: <StickerIcon name="security-shield" size={48} />,
    title: "Safety First",
    description: "The assessment checks eligibility, contraindications, and situations that need in-person care.",
  },
]

const eligibility = {
  eligible: [
    "Adults 18+ with BMI of 30 or higher",
    "BMI 27+ with weight-related conditions (diabetes, high blood pressure)",
    "Have tried diet and exercise without adequate results",
    "No contraindications that make online care unsuitable",
  ],
  notEligible: [
    "Under 18 years of age",
    "Pregnant or breastfeeding",
    "History of eating disorders",
    "Certain heart conditions or uncontrolled blood pressure",
    "Some medication interactions",
  ],
}

const faqs = [
  {
    question: "What does the doctor assess?",
    answer:
      "The doctor reviews your BMI, health history, current medications, previous weight management attempts, and any safety concerns before deciding what next step is clinically appropriate.",
  },
  {
    question: "Do I need to have tried other weight management methods first?",
    answer:
      "Generally, yes. Medical weight management support is usually considered alongside lifestyle changes. Your doctor will discuss your history as part of the assessment.",
  },
  {
    question: "Will medicine costs be discussed?",
    answer:
      "Yes. If the doctor decides a prescription option is clinically appropriate, they will explain relevant costs and pharmacy considerations after assessment.",
  },
  {
    question: "How quickly is my assessment reviewed?",
    answer:
      "Submit any time. A doctor reviews when available. For new patients, we may require additional information, which could extend timing.",
  },
  {
    question: "What if a treatment option is not suitable?",
    answer:
      "The doctor will explain why and may recommend lifestyle support, GP follow-up, pathology, or in-person care. If we cannot help through InstantMed, your consultation fee is refunded.",
  },
  {
    question: "Will I need follow-up?",
    answer:
      "Often, yes. Weight management care can require monitoring, progress checks, and safety review. The doctor will tell you what follow-up is appropriate for your situation.",
  },
  {
    question: "Is this service covered by Medicare?",
    answer:
      "The consultation fee is not Medicare-rebateable. Any pharmacy or subsidy questions are discussed after the doctor reviews your assessment.",
  },
  {
    question: "What happens if I'm not eligible for treatment?",
    answer:
      "If the doctor determines InstantMed is not appropriate for you, whether due to BMI criteria, contraindications, or other clinical reasons, you'll receive a full refund. The doctor may also recommend lifestyle support, GP follow-up, or specialist care.",
  },
  {
    question: "Can I use this service if I've had weight loss surgery?",
    answer:
      "You can submit an assessment, but it is important to disclose any previous bariatric surgery. The doctor will review your surgical history and current health status before deciding whether online care is suitable.",
  },
  {
    question: "Do I need to provide photos or measurements?",
    answer:
      "Measurements are part of the initial assessment. Photos are not always required, but the doctor may request extra information if it is needed for safe review. Any files you provide are stored securely and treated as confidential medical information.",
  },
]

export function WeightLossClient() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  }

  return (
    <>
      <Script id="faq-schema" type="application/ld+json"
        suppressHydrationWarning dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema) }} />

      <div className="flex min-h-screen flex-col">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-20">
          {/* Hero */}
          <CenteredHero
            pill="Weight Management"
            title="Weight management assessment, reviewed by a doctor."
            highlightWords={["reviewed by a doctor"]}
            subtitle="Start with a confidential health form. An Australian doctor reviews your suitability and explains next steps if clinically appropriate."
          >
            <AvailabilityIndicator variant="badge" className="mb-4" />

            <p className="text-xs text-muted-foreground mb-6">
              AHPRA-registered doctors · Confidential assessment · No clinic visit
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
              <Button asChild size="lg" className="px-6 h-11 font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 transition-[transform,box-shadow]">
                <Link href="/request?service=consult&subtype=weight_loss">
                  Start Consultation
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              <Link href="#assessment">
                <Button variant="outline" size="lg" className="text-sm px-6 w-full sm:w-auto">
                  What doctors check
                </Button>
              </Link>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap justify-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 bg-muted/50 dark:bg-white/[0.06] px-3 py-1.5 rounded-full border border-border/50">
                <Zap className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium text-muted-foreground">Doctor review when available</span>
              </div>
              <div className="flex items-center gap-1.5 bg-muted/50 dark:bg-white/[0.06] px-3 py-1.5 rounded-full border border-border/50">
                <Activity className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium text-muted-foreground">Ongoing support</span>
              </div>
              <div className="flex items-center gap-1.5 bg-muted/50 dark:bg-white/[0.06] px-3 py-1.5 rounded-full border border-border/50">
                <Shield className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium text-muted-foreground">AHPRA doctors</span>
              </div>
              <div className="flex items-center gap-1.5 bg-muted/50 dark:bg-white/[0.06] px-3 py-1.5 rounded-full border border-border/50">
                <Lock className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium text-muted-foreground">Private & secure</span>
              </div>
            </div>
          </CenteredHero>

          {/* Page superpower — clinical-supervision framing without drug-led promotion. */}
          <ServiceClaimSection
            eyebrow="Clinical, not cosmetic"
            headline={
              <>
                <span className="text-primary">Doctor-supervised</span> weight management.
              </>
            }
            body="Not a meal-plan subscription. Not a wellness program. A structured doctor review for adults with BMI 30+ (or 27+ with related conditions), with follow-up only when something important is missing. The clinical framing matters. Your doctor checks suitability, safety, and whether online care is appropriate."
          />

          {/* Hero image */}
          <section className="px-4 pb-12">
            <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-border/50 dark:border-white/15 shadow-lg shadow-primary/[0.06] dark:shadow-none">
              <Image
                src="/images/instantmed-photography/consult-1.webp"
                alt="A patient calmly fills in a secure health form on their phone at a kitchen bench."
                width={800}
                height={450}
                className="w-full h-auto object-cover"
                priority
              />
            </div>
          </section>

          {/* Assessment focus */}
          <section id="assessment" className="py-12 lg:py-16 px-4 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="rounded-3xl border border-border/50 dark:border-white/15 bg-white dark:bg-card shadow-lg shadow-primary/[0.06] dark:shadow-none p-4 lg:p-6 relative overflow-hidden">
                <div className="text-center mb-8">
                  <Heading level="h2" className="mb-2">What Doctors Check</Heading>
                  <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                    The service starts with suitability and safety review, not a menu of medicines
                  </p>
                </div>

                <div className="space-y-4">
                  {assessmentAreas.map((treatment) => (
                    <div
                      key={treatment.id}
                      className="bg-white dark:bg-card rounded-xl p-4 border border-border/50 dark:border-white/15 shadow-sm shadow-primary/[0.04] dark:shadow-none hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/[0.08] transition-[transform,box-shadow] duration-300"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Heading level="h3">{treatment.name}</Heading>
                            {treatment.popular && (
                              <Badge className="bg-primary/10 text-primary hover:bg-primary/10 text-xs">
                                Most Popular
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{treatment.examples}</p>
                        </div>
                        <Activity className="h-5 w-5 text-primary shrink-0" />
                      </div>

                      <p className="text-sm text-muted-foreground mb-3">{treatment.description}</p>

                      <div className="grid sm:grid-cols-2 gap-3 text-xs">
                        <div className="bg-primary/5 border border-primary/15 rounded-lg p-3">
                          <p className="font-medium mb-1 text-foreground">How it works:</p>
                          <p className="text-muted-foreground">{treatment.howItWorks}</p>
                        </div>
                        <div className="bg-primary/5 border border-primary/15 rounded-lg p-3">
                          <p className="font-medium mb-1 text-foreground">Suitable for:</p>
                          <p className="text-muted-foreground">{treatment.suitableFor}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 text-center">
                  <p className="text-xs text-muted-foreground mb-4">
                    Not sure which is right for you? The reviewing doctor will help you choose the best option.
                  </p>
                  <Link href="/request?service=consult&subtype=weight_loss">
                    <Button className="bg-primary hover:bg-primary/90 text-xs h-9">
                      Start Consultation
                      <ArrowRight className="h-3.5 w-3.5 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Platform Features */}
          <FeatureGrid
            pill="Why InstantMed"
            title="Why Choose InstantMed?"
            subtitle="Comprehensive weight management support"
            highlightWords={["InstantMed"]}
            features={platformFeatures}
            columns={2}
          />

          {/* Trust Logos */}
          <div className="px-4 pb-8">
            <div className="mx-auto max-w-5xl">
              <RegulatoryPartners />
            </div>
          </div>

          {/* Eligibility */}
          <section className="py-12 lg:py-16 px-4 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="rounded-3xl border border-border/50 dark:border-white/15 bg-white dark:bg-card shadow-lg shadow-primary/[0.06] dark:shadow-none p-4 lg:p-6 relative overflow-hidden">
                <div className="text-center mb-8">
                  <Heading level="h2" className="mb-2">Who Can Use This Service?</Heading>
                  <p className="text-sm text-muted-foreground">
                    Online weight management review is suitable for adults who meet certain criteria
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-card rounded-xl p-4 border border-border/50 dark:border-white/15 shadow-sm shadow-primary/[0.04] dark:shadow-none">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      </div>
                      <h3 className="text-sm font-semibold">You may be eligible if:</h3>
                    </div>
                    <ul className="space-y-2">
                      {eligibility.eligible.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs">
                          <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white dark:bg-card rounded-xl p-4 border border-border/50 dark:border-white/15 shadow-sm shadow-primary/[0.04] dark:shadow-none">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <h3 className="text-sm font-semibold">May not be suitable if:</h3>
                    </div>
                    <ul className="space-y-2">
                      {eligibility.notEligible.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <span className="text-muted-foreground/60">&bull;</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <ProcessSteps
            pill="How It Works"
            title="How It Works"
            subtitle="Four steps to start a weight management assessment"
            highlightWords={["Works"]}
            steps={[
              { number: 1, title: "Health Assessment", description: "Complete a detailed questionnaire about your health, weight history, and goals." },
              { number: 2, title: "Doctor Review", description: "An AHPRA-registered doctor reviews your assessment and determines eligibility." },
              { number: 3, title: "Receive Next Steps", description: "The doctor explains the outcome and any appropriate next step." },
              { number: 4, title: "Follow-Up If Needed", description: "The doctor may request more information or recommend follow-up." },
            ]}
          />

          {/* Doctor credibility */}
          <div className="max-w-4xl mx-auto px-4">
            <DoctorCredibility variant="inline" stats={['experience', 'approval', 'sameDay']} />
          </div>

          {/* FAQs */}
          <FAQSection
            title="Frequently Asked Questions"
            items={faqs}
          />

          {/* Final CTA */}
          <CTABanner
            title="Ready when you are."
            subtitle="Complete a health assessment in minutes. An AHPRA-registered doctor will review your case and explain what is clinically appropriate."
            ctaText="Start Consultation"
            ctaHref="/request?service=consult&subtype=weight_loss"
          />
        </main>

        <MarketingFooter />
      </div>
    </>
  )
}
