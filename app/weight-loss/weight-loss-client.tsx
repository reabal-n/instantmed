'use client'

import Link from "next/link"
import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter } from "@/components/marketing"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useReducedMotion } from "framer-motion"
import { AnimatedOrbs, GlowLine, ShimmerButton } from "@/components/ui/premium-effects"
import { ParallaxSection } from "@/components/ui/parallax-section"
import { TrustLogos } from "@/components/marketing/trust-badges"
import { AvailabilityIndicator } from "@/components/shared/availability-indicator"
import { GridStagger } from "@/components/effects/stagger-container"
import {
  ArrowRight,
  Clock,
  Shield,
  Zap,
  Pill,
  Lock,
  ChevronDown,
  Scale,
  Activity,
  CheckCircle2,
} from "lucide-react"

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
    icon: Scale,
    title: "Medically Supervised",
    description: "All prescriptions reviewed by AHPRA-registered doctors who specialise in weight management.",
  },
  {
    icon: Clock,
    title: "Quick Turnaround",
    description: "Most prescriptions issued within 15 minutes during business hours. No long waits.",
  },
  {
    icon: Activity,
    title: "Ongoing Support",
    description: "Regular check-ins to monitor progress, adjust dosage, and ensure you&apos;re on track.",
  },
  {
    icon: Shield,
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
      "Our doctors can recommend different treatment approaches based on your health assessment. Some options work with your body's natural hormone systems for long-term support, while others are designed for shorter-term use alongside lifestyle changes. Your doctor will discuss the best approach for your individual health profile and goals.",
  },
  {
    question: "Do I need to have tried other weight management methods first?",
    answer:
      "Generally, yes. Medical weight management treatments are most appropriate as an adjunct to lifestyle modifications (diet and exercise) for people who haven&apos;t achieved adequate results with lifestyle changes alone. Your doctor will discuss your history as part of the assessment.",
  },
  {
    question: "Are these treatments PBS-subsidised?",
    answer:
      "Some treatment options may be PBS-subsidised for eligible patients with specific conditions (like Type 2 diabetes). Your doctor will discuss costs and eligibility during your consultation. Out-of-pocket costs vary depending on the treatment approach.",
  },
  {
    question: "How quickly can I get my prescription?",
    answer:
      "Most consultations are completed and prescriptions issued within 15 minutes during business hours. For new patients, we may require additional information, which could extend this slightly.",
  },
  {
    question: "What side effects should I expect?",
    answer:
      "Side effects vary by treatment approach. Some options may cause temporary digestive symptoms like nausea or diarrhoea. Other approaches may cause increased heart rate, dry mouth, or sleep changes. Our doctors will discuss potential side effects and how to manage them based on your specific treatment plan.",
  },
  {
    question: "How long will I need treatment?",
    answer:
      "This depends on the treatment approach and your individual response. Some options are used long-term for sustained results, while others are typically used for 3-6 months alongside lifestyle changes. Your doctor will create a personalised plan with regular check-ins.",
  },
]

export function WeightLossClient() {
  const prefersReducedMotion = useReducedMotion()
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <div className="flex min-h-screen flex-col bg-background">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-20">
          {/* Hero */}
          <ParallaxSection speed={0.2}>
            <section className="px-4 py-12 sm:px-6 lg:py-16 overflow-hidden relative">
              {!prefersReducedMotion && (
                <AnimatedOrbs orbCount={3} className="opacity-40" />
              )}
              <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                  <div className="max-w-4xl mx-auto text-center">
                    <AvailabilityIndicator variant="badge" className="mb-4" />

                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-3">
                    Weight Loss Treatment That Actually Works
                  </h1>
                  <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto mb-4">
                    Get doctor-led weight management support from an Australian doctor.
                    Includes <strong>ongoing monitoring</strong> and regular check-ins.
                  </p>
                  <p className="text-xs text-muted-foreground mb-6">
                    TGA-approved treatments • AHPRA-registered doctors • Ongoing monitoring
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
                    <Link href="/request?service=consult">
                      <ShimmerButton className="px-6 h-11 font-semibold bg-violet-600">
                        Start Consultation
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </ShimmerButton>
                    </Link>
                    <Link href="#treatments">
                      <Button variant="outline" size="lg" className="text-sm px-6 w-full sm:w-auto">
                        View Treatments
                      </Button>
                    </Link>
                  </div>

                  {/* Trust badges */}
                  <div className="flex flex-wrap justify-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-divider/50">
                      <Zap className="h-3.5 w-3.5 text-violet-600" />
                      <span className="font-medium text-muted-foreground">Reviewed within hours</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-divider/50">
                      <Activity className="h-3.5 w-3.5 text-violet-600" />
                      <span className="font-medium text-muted-foreground">Ongoing support</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-divider/50">
                      <Shield className="h-3.5 w-3.5 text-violet-600" />
                      <span className="font-medium text-muted-foreground">AHPRA doctors</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-divider/50">
                      <Lock className="h-3.5 w-3.5 text-violet-600" />
                      <span className="font-medium text-muted-foreground">Private & secure</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </section>
          </ParallaxSection>

          {/* GlowLine Divider */}
          <div className="max-w-2xl mx-auto px-4">
            <GlowLine />
          </div>

          {/* Treatment Options */}
          <section id="treatments" className="py-12 lg:py-16 px-4 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <div className="text-center mb-8">
                  <h2 className="text-2xl sm:text-3xl font-bold mb-2">Treatment Options</h2>
                  <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                    Our doctors can recommend TGA-approved treatment options based on your health assessment
                  </p>
                </div>

                <div className="space-y-4">
                  {treatments.map((treatment) => (
                    <div
                      key={treatment.id}
                      className="bg-content1/50 backdrop-blur-sm rounded-xl p-4 border border-divider/50 hover:border-violet-500/30 transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="text-lg font-bold">{treatment.name}</h3>
                            {treatment.popular && (
                              <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100 text-xs">
                                Most Popular
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{treatment.examples}</p>
                        </div>
                        <Pill className="h-5 w-5 text-violet-600 shrink-0" />
                      </div>

                      <p className="text-sm text-muted-foreground mb-3">{treatment.description}</p>

                      <div className="grid sm:grid-cols-2 gap-3 text-xs">
                        <div className="bg-violet-50/50 border border-violet-100 rounded-lg p-3">
                          <p className="font-medium mb-1 text-violet-900">How it works:</p>
                          <p className="text-muted-foreground">{treatment.howItWorks}</p>
                        </div>
                        <div className="bg-violet-50/50 border border-violet-100 rounded-lg p-3">
                          <p className="font-medium mb-1 text-violet-900">Suitable for:</p>
                          <p className="text-muted-foreground">{treatment.suitableFor}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 text-center">
                  <p className="text-xs text-muted-foreground mb-4">
                    Not sure which is right for you? Our doctors will help you choose the best option.
                  </p>
                  <Link href="/request?service=consult">
                    <Button className="bg-violet-600 hover:bg-violet-700 text-xs h-9">
                      Start Consultation
                      <ArrowRight className="h-3.5 w-3.5 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Platform Features */}
          <section className="py-12 lg:py-16 px-4 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <div className="text-center mb-8">
                  <h2 className="text-2xl sm:text-3xl font-bold mb-2">Why Choose InstantMed?</h2>
                  <p className="text-sm text-muted-foreground">
                    Comprehensive weight management support
                  </p>
                </div>

                <GridStagger columns={2} staggerDelay={0.1} className="grid sm:grid-cols-2 gap-4">
                  {platformFeatures.map((feature, i) => (
                    <div key={i} className="flex gap-3 p-4 rounded-xl bg-content1/50 backdrop-blur-sm border border-divider/50">
                      <div className="shrink-0 w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                        <feature.icon className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold mb-1">{feature.title}</h3>
                        <p className="text-xs text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </GridStagger>
                
                {/* Partner Logos */}
                <div className="mt-8">
                  <TrustLogos />
                </div>
              </div>
            </div>
          </section>

          {/* Eligibility */}
          <section className="py-12 lg:py-16 px-4 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <div className="text-center mb-8">
                  <h2 className="text-2xl sm:text-3xl font-bold mb-2">Who Can Use This Service?</h2>
                  <p className="text-sm text-muted-foreground">
                    Weight management treatments are suitable for adults who meet certain criteria
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-content1/50 backdrop-blur-sm rounded-xl p-4 border border-divider/50">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      </div>
                      <h3 className="text-sm font-semibold">You may be eligible if:</h3>
                    </div>
                    <ul className="space-y-2">
                      {eligibility.eligible.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-content1/50 backdrop-blur-sm rounded-xl p-4 border border-divider/50">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Shield className="h-4 w-4 text-slate-600" />
                      </div>
                      <h3 className="text-sm font-semibold">May not be suitable if:</h3>
                    </div>
                    <ul className="space-y-2">
                      {eligibility.notEligible.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <span className="text-slate-400">•</span>
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
          <section className="py-12 lg:py-16 px-4 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <div className="text-center mb-8">
                  <h2 className="text-2xl sm:text-3xl font-bold mb-2">How It Works</h2>
                  <p className="text-sm text-muted-foreground">Four steps to start your weight loss journey</p>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { step: 1, title: "Health Assessment", desc: "Complete a detailed questionnaire about your health, weight history, and goals." },
                    { step: 2, title: "Doctor Review", desc: "An AHPRA-registered doctor reviews your assessment and determines eligibility." },
                    { step: 3, title: "Receive Treatment Plan", desc: "If appropriate, your treatment plan is sent directly to your phone." },
                    { step: 4, title: "Ongoing Support", desc: "Regular check-ins to monitor progress and adjust your plan as needed." },
                  ].map((item) => (
                    <div key={item.step} className="text-center">
                      <div className="w-10 h-10 rounded-lg bg-violet-600 text-background flex items-center justify-center mx-auto mb-3 text-lg font-bold">
                        {item.step}
                      </div>
                      <h3 className="text-sm font-semibold mb-1">{item.title}</h3>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* FAQs */}
          <section className="py-12 lg:py-16 px-4 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden">
                <div className="text-center mb-8">
                  <h2 className="text-2xl sm:text-3xl font-bold mb-2">Frequently Asked Questions</h2>
                </div>

                <div className="space-y-3 max-w-3xl mx-auto">
                  {faqs.map((faq, i) => (
                    <details key={i} className="group bg-content1/50 backdrop-blur-sm rounded-xl border border-divider/50">
                      <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
                        <span className="text-sm font-medium pr-4">{faq.question}</span>
                        <ChevronDown className="h-4 w-4 text-muted-foreground group-open:rotate-180 transition-transform shrink-0" />
                      </summary>
                      <div className="px-4 pb-4">
                        <p className="text-xs text-muted-foreground">{faq.answer}</p>
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="py-12 lg:py-16 px-4 sm:px-6">
            <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="max-w-3xl mx-auto text-center">
                <div className="glass-card rounded-3xl p-6 lg:p-8 relative overflow-hidden border-violet-500/20 bg-violet-50/30 dark:bg-violet-950/10">
                  <h2 className="text-2xl sm:text-3xl font-bold mb-3">
                    Ready to Start Your Journey?
                  </h2>
                  <p className="text-sm text-muted-foreground mb-6 max-w-xl mx-auto">
                    Complete a health assessment in minutes. Our doctors will review your case and recommend the best treatment option.
                  </p>
                  <Link href="/request?service=consult">
                    <ShimmerButton className="px-8 h-12 font-semibold bg-violet-600">
                      Start Consultation
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </ShimmerButton>
                  </Link>
                  <p className="text-xs text-muted-foreground mt-4">
                    Takes ~5 minutes • Ongoing support included
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>

        <MarketingFooter />
      </div>
    </>
  )
}
