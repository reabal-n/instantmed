'use client'

import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter } from "@/components/marketing"
import { safeJsonLd } from "@/lib/seo/safe-json-ld"
import { Button } from "@/components/ui/button"
import { ArrowRight, Shield, CheckCircle2, Zap, MessageSquare, Target, Calendar, UserCheck, TrendingDown } from "lucide-react"
import Link from "next/link"
import { AvailabilityIndicator } from "@/components/shared/availability-indicator"
import { CenteredHero } from "@/components/heroes"
import { AccordionSection, ProcessSteps, CTABanner } from "@/components/sections"
import { MarketingPageShell } from "@/components/shared/marketing-page-shell"
import { WeightManagementGuideSection } from "@/components/marketing/sections/weight-management-guide-section"

export function WeightManagementClient() {
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

  const faqGroups = [
    {
      items: [
        {
          question: "What medications might be prescribed?",
          answer: "Our doctors prescribe TGA-approved weight management medications. The specific treatment depends on your health profile, goals, and any contraindications. All options are discussed with you before prescribing.",
        },
        {
          question: "Do I need to have tried other methods first?",
          answer: "Generally, yes. Weight management medications are most effective when combined with lifestyle changes. Your doctor will discuss your history during the assessment.",
        },
        {
          question: "How long does the program last?",
          answer: "Weight management is typically an ongoing journey. After your initial consultation, you'll have monthly check-ins to monitor progress, adjust your plan, and renew prescriptions if needed.",
        },
        {
          question: "Are the medications covered by PBS?",
          answer: "Some medications may be PBS-subsidised for eligible patients. Your doctor will discuss costs and eligibility during your consultation. Out-of-pocket costs vary.",
        },
        {
          question: "What if I'm not eligible?",
          answer: "If medication isn't appropriate for you, you'll receive a full refund of the consultation fee. We'll also provide recommendations for alternative approaches.",
        },
        {
          question: "How much does the program cost?",
          answer: "Initial consultation is $49.95. This includes your assessment, doctor review, and personalised plan. Medication costs are separate and vary depending on treatment.",
        },
        {
          question: "Is this covered by Medicare or private health insurance?",
          answer: "The consultation itself is not covered by Medicare as it's a private telehealth service. However, some prescribed medications may be PBS-subsidised, which significantly reduces their cost. Private health insurance typically doesn't cover telehealth consultations or weight management medications, but check with your fund — policies vary. Your doctor will discuss medication costs and any PBS eligibility during your consultation.",
        },
        {
          question: "What if I've tried weight loss treatment before and it didn't work?",
          answer: "Previous treatment experience is actually useful information for your doctor. There are multiple categories of weight management medication that work through different biological mechanisms — what didn't work before may not be relevant to a different approach. Your doctor will ask about what you've tried, what happened, and why it didn't work out, then recommend an approach that accounts for that history. Sometimes the issue was the wrong treatment, sometimes the wrong dose, and sometimes the timing wasn't right.",
        },
        {
          question: "Can I use this alongside my existing GP care?",
          answer: "Absolutely, and we encourage it. Our doctors can work alongside your regular GP — we'll provide documentation of your treatment plan that you can share with them. If you have existing conditions being managed by your GP (diabetes, blood pressure, etc.), it's important they're aware of any new medications. We're happy to communicate directly with your GP if you consent to it.",
        },
        {
          question: "What happens if I experience side effects?",
          answer: "Side effects are discussed upfront before any treatment starts, so you know what to watch for. If you experience side effects, contact us through your patient dashboard — your doctor will review and may adjust your dose, change the timing of your medication, or recommend a different treatment. Most common side effects (particularly gastrointestinal ones) improve within the first few weeks as your body adjusts. Your doctor won't keep you on a treatment that's making you miserable.",
        },
        {
          question: "Do I need blood tests before starting?",
          answer: "It depends on your health profile. Your doctor may recommend baseline blood tests — particularly for blood sugar, thyroid function, liver and kidney function — before starting certain treatments. This helps rule out underlying conditions that could be contributing to weight gain and ensures the chosen medication is safe for you. If blood tests are needed, your doctor will explain which ones and why. You can have them done at any pathology lab.",
        },
        {
          question: "What's the difference between this and a weight loss clinic?",
          answer: "Most commercial weight loss clinics focus on meal plans, supplements, or a single branded program. Medical weight management through InstantMed is a doctor-led service using TGA-approved treatments prescribed based on your individual health assessment. Your doctor considers your full medical history, current medications, and health conditions — not just your weight. There's no upselling, no proprietary shakes, and no lock-in contracts. It's straightforward medical care for a medical condition.",
        },
      ],
    },
  ]

  const processSteps = [
    {
      number: 1,
      title: "Health assessment",
      description: "Complete a detailed questionnaire about your health, weight history, and goals.",
    },
    {
      number: 2,
      title: "Doctor review",
      description: "An Australian doctor reviews your assessment and determines if treatment is appropriate.",
    },
    {
      number: 3,
      title: "Get your plan",
      description: "Receive your personalised treatment plan. If medication is appropriate, e-script sent same-day.",
    },
    {
      number: 4,
      title: "Ongoing support",
      description: "Regular check-ins to track progress, adjust treatment, and renew prescriptions.",
    },
  ]

  return (
    <MarketingPageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema) }} />

      <div className="flex min-h-screen flex-col">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-20">
          {/* Hero */}
          <CenteredHero
            title="Telehealth Weight Management"
            highlightWords={["Weight Management"]}
            subtitle="Work with Australian doctors on a personalised weight management plan. Get assessed, receive treatment if appropriate, and get ongoing support — all from home."
          >
            <AvailabilityIndicator variant="badge" className="mb-6" />

            <p className="text-sm text-muted-foreground mb-8">
              AHPRA-registered doctors &bull; TGA-approved treatments &bull; Ongoing check-ins included
            </p>

            <Button asChild size="lg" className="px-8 h-12 font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 transition-all">
              <Link href="/request?service=consult">
                Start Assessment
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>

            {/* Trust badges */}
            <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5 bg-background/80 px-3 py-1.5 rounded-full border">
                <Zap className="h-4 w-4 text-primary" />
                <span className="font-medium">15 min assessment</span>
              </div>
              <div className="flex items-center gap-1.5 bg-background/80 px-3 py-1.5 rounded-full border">
                <Shield className="h-4 w-4 text-primary" />
                <span>Doctor reviewed</span>
              </div>
              <div className="flex items-center gap-1.5 bg-background/80 px-3 py-1.5 rounded-full border">
                <Calendar className="h-4 w-4 text-primary" />
                <span>Ongoing support</span>
              </div>
            </div>
          </CenteredHero>

          {/* Stats Bar */}
          <section className="px-4 py-8 bg-primary text-primary-foreground">
            <div className="mx-auto max-w-4xl">
              <div className="grid gap-6 sm:grid-cols-4 text-center">
                <div>
                  <div className="text-3xl font-semibold mb-1">10 min</div>
                  <div className="text-sm text-primary-foreground/80">health assessment</div>
                </div>
                <div>
                  <div className="text-3xl font-semibold mb-1">~2 hrs</div>
                  <div className="text-sm text-primary-foreground/80">doctor review</div>
                </div>
                <div>
                  <div className="text-3xl font-semibold mb-1">Same day</div>
                  <div className="text-sm text-primary-foreground/80">script if appropriate</div>
                </div>
                <div>
                  <div className="text-3xl font-semibold mb-1">Monthly</div>
                  <div className="text-sm text-primary-foreground/80">check-ins included</div>
                </div>
              </div>
            </div>
          </section>

          {/* What's Different */}
          <section className="px-4 py-12">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-xl font-semibold mb-8 text-center">A different approach to weight management</h2>
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
                    <item.icon className="h-6 w-6 text-primary shrink-0 mt-0.5" />
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
          <ProcessSteps
            title="How it works"
            steps={processSteps}
            className="bg-muted/30"
          />

          {/* Eligibility */}
          <section className="px-4 py-12">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-xl font-semibold mb-6 text-center">Is this program right for you?</h2>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="p-6 rounded-xl border bg-card">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-success" />
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
                        <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-6 rounded-xl border bg-muted/30">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
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
                        <span className="text-muted-foreground">&bull;</span>
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

          {/* Guide Section */}
          <WeightManagementGuideSection />

          {/* FAQs */}
          <AccordionSection
            title="Common questions"
            groups={faqGroups}
            className="bg-muted/30"
          />

          {/* Final CTA */}
          <CTABanner
            title="Start your journey today"
            subtitle="Complete your health assessment in 10 minutes. A doctor will review your case and create a personalised plan. $49.95 consultation — ongoing support included."
            ctaText="Start Assessment"
            ctaHref="/request?service=consult"
          />

          {/* Related */}
          <section className="px-4 py-8 border-t">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm text-muted-foreground">
                <Link href="/weight-loss" className="text-primary hover:underline">
                  Weight Loss
                </Link>
                {" • "}
                <Link href="/prescriptions" className="text-primary hover:underline">
                  Prescriptions
                </Link>
                {" • "}
                <Link href="/how-it-works" className="text-primary hover:underline">
                  How It Works
                </Link>
              </p>
            </div>
          </section>
        </main>

        <MarketingFooter />
      </div>
    </MarketingPageShell>
  )
}
