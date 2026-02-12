'use client'

import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter } from "@/components/marketing"
import { Button } from "@/components/ui/button"
import { ArrowRight, Shield, CheckCircle2, Zap, MessageSquare, Target, Calendar, UserCheck, TrendingDown } from "lucide-react"
import Link from "next/link"
import { useReducedMotion } from "framer-motion"
import { AnimatedOrbs, GlowLine, ShimmerButton } from "@/components/ui/premium-effects"
import { ParallaxSection } from "@/components/ui/parallax-section"
import { AvailabilityIndicator } from "@/components/shared/availability-indicator"

export function WeightManagementClient() {
  const prefersReducedMotion = useReducedMotion()
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Can I get weight loss treatment online in Australia?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Australian doctors can prescribe TGA-approved weight management medications via telehealth for eligible patients. You'll need to complete a health assessment and be reviewed by a doctor.",
        },
      },
      {
        "@type": "Question",
        name: "How quickly can I start?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Complete your health assessment in about 10 minutes. Most consultations are reviewed within 2 hours. If appropriate, your prescription is sent same-day.",
        },
      },
      {
        "@type": "Question",
        name: "Do I need to have tried other weight loss methods first?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Generally, yes. Weight management medications work best alongside lifestyle changes and are typically recommended for people who have already tried diet and exercise.",
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <div className="flex min-h-screen flex-col bg-background">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-20">
          {/* Hero */}
          <ParallaxSection speed={0.2}>
            <section className="px-4 py-12 sm:py-20 relative overflow-hidden">
              {!prefersReducedMotion && (
                <AnimatedOrbs orbCount={3} className="opacity-40" />
              )}
              <div className="mx-auto max-w-3xl text-center relative">
                <AvailabilityIndicator variant="badge" className="mb-6" />

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4">
                Telehealth Weight Management
              </h1>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-4">
                Work with Australian doctors on a personalised weight management plan. Get assessed, receive treatment if appropriate, and get ongoing support — all from home.
              </p>
              <p className="text-sm text-muted-foreground mb-8">
                AHPRA-registered doctors • TGA-approved treatments • Ongoing check-ins included
              </p>

              <Link href="/request?service=consult">
                <ShimmerButton className="px-8 h-12 font-semibold bg-violet-600">
                  Start Assessment
                  <ArrowRight className="h-4 w-4 ml-2" />
                </ShimmerButton>
              </Link>

              {/* Trust badges */}
              <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5 bg-background/80 px-3 py-1.5 rounded-full border">
                  <Zap className="h-4 w-4 text-violet-600" />
                  <span className="font-medium">15 min assessment</span>
                </div>
                <div className="flex items-center gap-1.5 bg-background/80 px-3 py-1.5 rounded-full border">
                  <Shield className="h-4 w-4 text-violet-600" />
                  <span>Doctor reviewed</span>
                </div>
                <div className="flex items-center gap-1.5 bg-background/80 px-3 py-1.5 rounded-full border">
                  <Calendar className="h-4 w-4 text-violet-600" />
                  <span>Ongoing support</span>
                </div>
              </div>
            </div>
            </section>
          </ParallaxSection>

          {/* GlowLine Divider */}
          <div className="max-w-2xl mx-auto px-4">
            <GlowLine />
          </div>

          {/* Stats Bar */}
          <section className="px-4 py-8 bg-violet-600 text-background">
            <div className="mx-auto max-w-4xl">
              <div className="grid gap-6 sm:grid-cols-4 text-center">
                <div>
                  <div className="text-3xl font-bold mb-1">10 min</div>
                  <div className="text-sm text-background/80">health assessment</div>
                </div>
                <div>
                  <div className="text-3xl font-bold mb-1">~2 hrs</div>
                  <div className="text-sm text-background/80">doctor review</div>
                </div>
                <div>
                  <div className="text-3xl font-bold mb-1">Same day</div>
                  <div className="text-sm text-background/80">script if appropriate</div>
                </div>
                <div>
                  <div className="text-3xl font-bold mb-1">Monthly</div>
                  <div className="text-sm text-background/80">check-ins included</div>
                </div>
              </div>
            </div>
          </section>

          {/* What's Different */}
          <section className="px-4 py-12">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-xl font-bold mb-8 text-center">A different approach to weight management</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  {
                    icon: UserCheck,
                    title: "Doctor-guided, not DIY",
                    desc: "Every patient is reviewed by an AHPRA-registered doctor who creates a personalised plan.",
                  },
                  {
                    icon: Target,
                    title: "Personalised to you",
                    desc: "Your plan is based on your health history, goals, and what&apos;s worked (or hasn't) before.",
                  },
                  {
                    icon: MessageSquare,
                    title: "Ongoing support",
                    desc: "Regular check-ins to track progress, adjust your plan, and keep you on track.",
                  },
                  {
                    icon: TrendingDown,
                    title: "Evidence-based",
                    desc: "TGA-approved treatments combined with lifestyle guidance for sustainable results.",
                  },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4 p-4 rounded-xl bg-muted/30">
                    <item.icon className="h-6 w-6 text-violet-600 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold mb-1">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="px-4 py-12 bg-muted/30">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-xl font-bold mb-8 text-center">How it works</h2>
              <div className="grid gap-6 sm:grid-cols-4">
                {[
                  {
                    step: "1",
                    title: "Health assessment",
                    desc: "Complete a detailed questionnaire about your health, weight history, and goals.",
                    time: "10 min",
                  },
                  {
                    step: "2",
                    title: "Doctor review",
                    desc: "An Australian doctor reviews your assessment and determines if treatment is appropriate.",
                    time: "~2 hrs",
                  },
                  {
                    step: "3",
                    title: "Get your plan",
                    desc: "Receive your personalised treatment plan. If medication is appropriate, e-script sent same-day.",
                    time: "Same day",
                  },
                  {
                    step: "4",
                    title: "Ongoing support",
                    desc: "Regular check-ins to track progress, adjust treatment, and renew prescriptions.",
                    time: "Monthly",
                  },
                ].map((item) => (
                  <div key={item.step} className="text-center p-4 bg-background rounded-xl">
                    <div className="h-12 w-12 rounded-full bg-violet-600/10 flex items-center justify-center mx-auto mb-3">
                      <span className="font-bold text-xl text-violet-600">{item.step}</span>
                    </div>
                    <h3 className="font-semibold mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{item.desc}</p>
                    <span className="inline-block text-xs bg-violet-600/10 text-violet-600 px-2 py-0.5 rounded-full">
                      {item.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Eligibility */}
          <section className="px-4 py-12">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-xl font-bold mb-6 text-center">Is this program right for you?</h2>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="p-6 rounded-xl border bg-card">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Good fit if you...
                  </h3>
                  <ul className="space-y-2 text-sm">
                    {[
                      "Are an adult (18+) with BMI 27 or higher",
                      "Have tried diet and exercise without lasting success",
                      "Want medical supervision for your weight loss journey",
                      "Are committed to making lifestyle changes alongside treatment",
                      "Don't have contraindications (discussed during assessment)",
                    ].map((item, i) => (
                      <li key={i} className="flex gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-6 rounded-xl border bg-muted/30">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-violet-600" />
                    May need alternative care if...
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {[
                      "Pregnant or breastfeeding",
                      "Under 18 years old",
                      "Active eating disorder",
                      "Certain heart conditions or uncontrolled blood pressure",
                      "Taking medications that may interact",
                    ].map((item, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-muted-foreground">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 text-xs text-muted-foreground">
                    Not sure? Complete the assessment — our doctors will advise if this program is right for you.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* FAQs */}
          <section className="px-4 py-12 bg-muted/30">
            <div className="mx-auto max-w-2xl">
              <h2 className="text-xl font-bold text-center mb-8">Common questions</h2>
              <div className="space-y-4">
                {[
                  {
                    q: "What medications might be prescribed?",
                    a: "Our doctors prescribe TGA-approved weight management medications. The specific treatment depends on your health profile, goals, and any contraindications. All options are discussed with you before prescribing.",
                  },
                  {
                    q: "Do I need to have tried other methods first?",
                    a: "Generally, yes. Weight management medications are most effective when combined with lifestyle changes. Your doctor will discuss your history during the assessment.",
                  },
                  {
                    q: "How long does the program last?",
                    a: "Weight management is typically an ongoing journey. After your initial consultation, you'll have monthly check-ins to monitor progress, adjust your plan, and renew prescriptions if needed.",
                  },
                  {
                    q: "Are the medications covered by PBS?",
                    a: "Some medications may be PBS-subsidised for eligible patients. Your doctor will discuss costs and eligibility during your consultation. Out-of-pocket costs vary.",
                  },
                  {
                    q: "What if I&apos;m not eligible?",
                    a: "If medication isn&apos;t appropriate for you, you'll receive a full refund of the consultation fee. We'll also provide recommendations for alternative approaches.",
                  },
                  {
                    q: "How much does the program cost?",
                    a: "Initial consultation is $49.95. This includes your assessment, doctor review, and personalised plan. Medication costs are separate and vary depending on treatment.",
                  },
                ].map((faq, i) => (
                  <div key={i} className="p-5 rounded-xl bg-background">
                    <h3 className="font-semibold mb-2">{faq.q}</h3>
                    <p className="text-sm text-muted-foreground">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="px-4 py-16">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-2xl font-bold mb-4">Start your journey today</h2>
              <p className="text-muted-foreground mb-6">
                Complete your health assessment in 10 minutes. A doctor will review your case and create a personalised plan.
              </p>
              <Link href="/request?service=consult">
                <Button size="lg" className="bg-violet-600 hover:bg-violet-700 text-background">
                  Start Assessment
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <p className="mt-4 text-xs text-muted-foreground">$49.95 consultation • Ongoing support included</p>
            </div>
          </section>

          {/* Related */}
          <section className="px-4 py-8 border-t">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm text-muted-foreground">
                <Link href="/weight-loss" className="text-violet-600 hover:underline">
                  Weight Loss
                </Link>
                {" • "}
                <Link href="/prescriptions" className="text-violet-600 hover:underline">
                  Prescriptions
                </Link>
                {" • "}
                <Link href="/how-it-works" className="text-violet-600 hover:underline">
                  How It Works
                </Link>
              </p>
            </div>
          </section>
        </main>

        <MarketingFooter />
      </div>
    </>
  )
}
