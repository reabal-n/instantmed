'use client'

import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Lock,
  Pill,
  Shield,
  Zap,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import Script from "next/script"

import { CenteredHero } from "@/components/heroes"
import { StickerIcon } from "@/components/icons/stickers"
import { DoctorCredibility,MarketingFooter, RegulatoryPartners } from "@/components/marketing"
import { WeightLossGuideSection } from "@/components/marketing/sections"
import { ServiceClaimSection } from "@/components/marketing/sections/service-claim-section"
import {
  CTABanner,
  FAQSection,
  FeatureGrid,
  ProcessSteps,
} from "@/components/sections"
import { Navbar } from "@/components/shared"
import { AvailabilityIndicator } from "@/components/shared"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Heading } from "@/components/ui/heading"
import { safeJsonLd } from "@/lib/seo/safe-json-ld"

const treatments = [
  {
    id: "glp1",
    name: "Hormone-Based Treatment",
    examples: "Weekly or daily options available",
    description: "Doctor-prescribed treatment that helps regulate appetite and support healthy weight management. Clinically proven approach with ongoing monitoring.",
    howItWorks: "Works with your body's natural hormone systems to support appetite regulation",
    suitableFor: "BMI 30+ or BMI 27+ with related health conditions",
    popular: true,
  },
  {
    id: "short-term",
    name: "Short-Term Treatment Option",
    examples: "Various strengths available based on assessment",
    description: "Doctor-prescribed treatment taken once daily. Typically used for 3-6 months alongside lifestyle changes with regular check-ins.",
    howItWorks: "Supports appetite regulation through doctor-supervised treatment",
    suitableFor: "BMI 30+ or BMI 27+ with related health conditions",
    popular: false,
  },
]

const platformFeatures = [
  {
    icon: <StickerIcon name="scales" size={48} />,
    title: "Medically Supervised",
    description: "All prescriptions reviewed by AHPRA-registered doctors who specialise in weight management.",
  },
  {
    icon: <StickerIcon name="clock" size={48} />,
    title: "Quick Turnaround",
    description: "Submit any time. Doctor review follows when available.",
  },
  {
    icon: <StickerIcon name="pulse" size={48} />,
    title: "Ongoing Support",
    description: "Regular check-ins to monitor progress, adjust dosage, and ensure you're on track.",
  },
  {
    icon: <StickerIcon name="security-shield" size={48} />,
    title: "Safe & Regulated",
    description: "Only TGA-approved treatment options recommended after thorough health assessment.",
  },
]

const eligibility = {
  eligible: [
    "Adults 18+ with BMI of 30 or higher",
    "BMI 27+ with weight-related conditions (diabetes, high blood pressure)",
    "Have tried diet and exercise without adequate results",
    "No contraindications to weight management treatments",
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
    question: "What treatment options are available?",
    answer:
      "The reviewing doctor can recommend different treatment approaches based on your health assessment. Some options work with your body's natural hormone systems for long-term support, while others are designed for shorter-term use alongside lifestyle changes. Your treating doctor will discuss the best approach for your individual health profile and goals.",
  },
  {
    question: "Do I need to have tried other weight management methods first?",
    answer:
      "Generally, yes. Medical weight management treatments are most appropriate as an adjunct to lifestyle modifications (diet and exercise) for people who haven\u0027t achieved adequate results with lifestyle changes alone. Your doctor will discuss your history as part of the assessment.",
  },
  {
    question: "Are these treatments PBS-subsidised?",
    answer:
      "Some treatment options may be PBS-subsidised for eligible patients with specific conditions (like Type 2 diabetes). Your doctor will discuss costs and eligibility during your consultation. Out-of-pocket costs vary depending on the treatment approach.",
  },
  {
    question: "How quickly can I get my prescription?",
    answer:
      "Submit any time. A doctor reviews when available. For new patients, we may require additional information, which could extend timing.",
  },
  {
    question: "What side effects should I expect?",
    answer:
      "Side effects vary by treatment approach. Some options may cause temporary digestive symptoms like nausea or diarrhoea. Other approaches may cause increased heart rate, dry mouth, or sleep changes. Your treating doctor will discuss potential side effects and how to manage them based on your specific treatment plan.",
  },
  {
    question: "How long will I need treatment?",
    answer:
      "This depends on the treatment approach and your individual response. Some options are used long-term for sustained results, while others are typically used for 3-6 months alongside lifestyle changes. Your doctor will create a personalised plan with regular check-ins.",
  },
  {
    question: "Is this service covered by Medicare?",
    answer:
      "The consultation fee is not Medicare-rebateable. However, if your doctor prescribes a treatment that is listed on the Pharmaceutical Benefits Scheme (PBS), you may be eligible for PBS subsidies on the medication itself. Your doctor will discuss costs and PBS eligibility as part of your consultation.",
  },
  {
    question: "What happens if I'm not eligible for treatment?",
    answer:
      "If our doctor determines that medical weight management treatment isn't appropriate for you - whether due to BMI criteria, contraindications, or other clinical reasons - you'll receive a full refund of your consultation fee. Your doctor may also provide alternative recommendations, such as lifestyle modifications or a referral to a specialist.",
  },
  {
    question: "Can I use this service if I've had weight loss surgery?",
    answer:
      "Yes, but it's important to disclose any previous bariatric surgery during your health assessment. Some treatments may not be suitable post-surgery, and dosing or monitoring requirements may differ. Your doctor will review your surgical history and current health status to determine whether medical weight management treatment is appropriate for you.",
  },
  {
    question: "Do I need to provide photos or measurements?",
    answer:
      "Photos and measurements can be helpful for tracking your progress over time, but they're not always required for your initial assessment. Your doctor may request them as part of follow-up reviews to monitor how treatment is working. Any images you provide are stored securely and treated as confidential medical information.",
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
            title="Weight Loss Treatment That Actually Works"
            highlightWords={["Actually Works"]}
            subtitle="Get doctor-led weight management support from an Australian doctor. Includes ongoing monitoring and regular check-ins."
          >
            <AvailabilityIndicator variant="badge" className="mb-4" />

            <p className="text-xs text-muted-foreground mb-6">
              TGA-approved treatments · AHPRA-registered doctors · Ongoing monitoring
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
              <Button asChild size="lg" className="px-6 h-11 font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 transition-[transform,box-shadow]">
                <Link href="/request?service=consult&subtype=weight_loss">
                  Start Consultation
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              <Link href="#treatments">
                <Button variant="outline" size="lg" className="text-sm px-6 w-full sm:w-auto">
                  View Treatments
                </Button>
              </Link>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap justify-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 bg-muted/50 dark:bg-white/[0.06] px-3 py-1.5 rounded-full border border-border/50">
                <Zap className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium text-muted-foreground">Reviewed within 1–2 hours</span>
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

          {/* Page superpower — clinical-supervision framing distinguishes
              this from cosmetic / wellness weight-loss programs that don't
              involve a doctor. Anchors TGA-approved + ongoing-monitoring. */}
          <ServiceClaimSection
            eyebrow="Clinical, not cosmetic"
            headline={
              <>
                <span className="text-primary">Doctor-supervised</span> weight management.
              </>
            }
            body="Not a meal-plan subscription. Not a wellness program. Doctor-prescribed treatment options for adults with BMI 30+ (or 27+ with related conditions), with regular check-ins and TGA-approved medications. The clinical framing matters. Your doctor follows up, adjusts dosage, and watches for side effects."
          />

          {/* Hero image */}
          <section className="px-4 pb-12">
            <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-border/50 dark:border-white/15 shadow-lg shadow-primary/[0.06] dark:shadow-none">
              <Image
                src="/images/consult-1.webp"
                alt="Patient using their phone for a medical consultation"
                width={800}
                height={450}
                className="w-full h-auto object-cover"
                priority
              />
            </div>
          </section>

          {/* Treatment Options */}
          <section id="treatments" className="py-12 lg:py-16 px-4 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="rounded-3xl border border-border/50 dark:border-white/15 bg-white dark:bg-card shadow-lg shadow-primary/[0.06] dark:shadow-none p-4 lg:p-6 relative overflow-hidden">
                <div className="text-center mb-8">
                  <Heading level="h2" className="mb-2">Treatment Options</Heading>
                  <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                    The reviewing doctor can recommend TGA-approved treatment options based on your health assessment
                  </p>
                </div>

                <div className="space-y-4">
                  {treatments.map((treatment) => (
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
                        <Pill className="h-5 w-5 text-primary shrink-0" />
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
                    Weight management treatments are suitable for adults who meet certain criteria
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
            subtitle="Four steps to start your weight loss journey"
            highlightWords={["Works"]}
            steps={[
              { number: 1, title: "Health Assessment", description: "Complete a detailed questionnaire about your health, weight history, and goals." },
              { number: 2, title: "Doctor Review", description: "An AHPRA-registered doctor reviews your assessment and determines eligibility." },
              { number: 3, title: "Receive Treatment Plan", description: "If appropriate, your treatment plan is sent directly to your phone." },
              { number: 4, title: "Ongoing Support", description: "Regular check-ins to monitor progress and adjust your plan as needed." },
            ]}
          />

          {/* Doctor credibility */}
          <div className="max-w-4xl mx-auto px-4">
            <DoctorCredibility variant="inline" stats={['experience', 'approval', 'sameDay']} />
          </div>

          {/* E-E-A-T Guide */}
          <WeightLossGuideSection />

          {/* FAQs */}
          <FAQSection
            title="Frequently Asked Questions"
            items={faqs}
          />

          {/* Final CTA */}
          <CTABanner
            title="Ready when you are."
            subtitle="Complete a health assessment in minutes. An AHPRA-registered doctor will review your case and recommend the best treatment option."
            ctaText="Start Consultation"
            ctaHref="/request?service=consult&subtype=weight_loss"
          />
        </main>

        <MarketingFooter />
      </div>
    </>
  )
}
