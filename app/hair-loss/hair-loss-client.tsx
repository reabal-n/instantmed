"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  ArrowRight,
  Clock,
  Shield,
  EyeOff,
  Pill,
  PhoneOff,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/shared/navbar";
import { MarketingFooter } from "@/components/marketing";
import { AvailabilityIndicator } from "@/components/shared/availability-indicator";
import { CenteredHero } from "@/components/heroes";
import {
  FeatureGrid,
  ProcessSteps,
  Timeline,
  AccordionSection,
  CTABanner,
  SectionHeader,
} from "@/components/sections";
import { scrollRevealConfig, useReducedMotion } from "@/components/ui/motion";
import { RegulatoryPartners } from "@/components/marketing";
import { MarketingPageShell } from "@/components/shared/marketing-page-shell";
import { DoctorCredibility } from "@/components/marketing/doctor-credibility";
import { getTestimonialsByService } from "@/lib/data/testimonials";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const treatments = [
  {
    id: "oral",
    name: "Oral Treatment Option",
    brand: "Daily oral option",
    description:
      "Doctor-prescribed oral treatment taken once daily. Works by addressing hormonal factors that contribute to hair follicle changes.",
    type: "Oral treatment",
    frequency: "Once daily",
    results: "Results typically visible in 3-6 months",
    bestFor: "Hair loss at the crown and mid-scalp",
    popular: true,
  },
  {
    id: "topical",
    name: "Topical Treatment Option",
    brand: "Applied treatment option",
    description:
      "Doctor-prescribed topical solution or foam applied to the scalp. Stimulates hair follicles and increases blood flow to support hair growth.",
    type: "Topical solution/foam",
    frequency: "Twice daily",
    results: "Results typically visible in 2-4 months",
    bestFor: "Thinning hair, receding hairline",
    popular: true,
  },
  {
    id: "combination",
    name: "Combination Approach",
    brand: "Dual treatment approach",
    description:
      "Using both treatment approaches together for maximum effectiveness. Addresses hair loss through multiple mechanisms.",
    type: "Oral + Topical",
    frequency: "As directed",
    results: "Often more effective than either alone",
    bestFor: "Moderate to advanced hair loss",
    popular: false,
  },
];

const platformFeatures = [
  {
    icon: <PhoneOff className="h-6 w-6" />,
    title: "Complete Online",
    description:
      "Answer questions from your phone. Most consultations don't require a call.",
  },
  {
    icon: <Clock className="h-6 w-6" />,
    title: "Reviewed Within Hours",
    description:
      "Our doctors review requests quickly. Most are reviewed within a few hours during business hours.",
  },
  {
    icon: <EyeOff className="h-6 w-6" />,
    title: "100% Discreet",
    description:
      "Your consultation is private. Medications come in standard pharmacy packaging.",
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: "AHPRA-Registered Doctors",
    description:
      "All consultations reviewed by fully qualified Australian doctors.",
  },
];

const howItWorksSteps = [
  {
    number: 1,
    title: "Complete Questionnaire",
    description:
      "Answer questions about your hair loss online. Takes about 3 minutes.",
  },
  {
    number: 2,
    title: "Doctor Reviews",
    description:
      "An AHPRA-registered doctor reviews your request and prescribes if appropriate.",
  },
  {
    number: 3,
    title: "Receive Treatment Plan",
    description:
      "eScript sent to your phone via SMS. Collect from any pharmacy Australia-wide.",
  },
];

const resultsTimeline = [
  {
    title: "Month 1-2",
    description:
      "Treatment begins. Some initial shedding is normal as weaker hairs make way for stronger growth.",
  },
  {
    title: "Month 3-4",
    description:
      "Early signs of improvement. Shedding slows, and you may notice fine new hairs appearing.",
  },
  {
    title: "Month 6",
    description:
      "Visible improvement for most men. Hair appears thicker and fuller.",
  },
  {
    title: "Month 12+",
    description:
      "Full results visible. Continued use maintains and often improves results.",
  },
];

const faqGroups = [
  {
    items: [
      {
        question: "What treatment options are available?",
        answer:
          "Our doctors can recommend different treatment approaches based on your assessment. One option is an oral treatment that addresses hormonal factors contributing to hair loss — it's most effective for hair loss at the crown and mid-scalp. Another option is a topical treatment applied directly to the scalp that stimulates hair follicles and increases blood flow. Many men use both approaches together for best results.",
      },
      {
        question: "How long until I see results?",
        answer:
          "Hair growth takes time. With topical treatments, some improvement may be visible in 2-4 months. With oral treatments, most men see results in 3-6 months. It can take up to 12 months to see the full effect. Consistency is key — stopping treatment typically leads to reversal of gains.",
      },
      {
        question: "Are there side effects?",
        answer:
          "Topical treatments may cause scalp irritation or unwanted facial hair growth (rare). Oral treatments may cause decreased libido or erectile changes in a small percentage of men (1-2%), which typically resolve after stopping treatment. Our doctors will discuss potential side effects with you.",
      },
      {
        question: "Do I need a doctor consultation for these treatments?",
        answer:
          "Oral treatments always require a doctor consultation in Australia. Topical treatments at higher strengths are also prescription-only, though lower strengths are available over the counter. Our doctors can recommend both approaches after assessment.",
      },
      {
        question: "Is the service really discreet?",
        answer:
          "Completely. No phone calls required. Your pharmacy receives only the prescription — not your consultation details. Medications come in standard pharmacy packaging with no indication of contents. Your bank statement shows 'InstantMed' only.",
      },
      {
        question: "Can women use these treatments?",
        answer:
          "Topical treatments can be used by women for hair loss (at lower concentrations). Oral treatments are NOT suitable for women, especially those who are or may become pregnant. If you're a woman experiencing hair loss, please indicate this in your consultation.",
      },
    ],
  },
];

// Hair loss testimonials — Jake T. (t39) first, plus 1-2 other consultation testimonials
const hairLossTestimonials = (() => {
  const all = getTestimonialsByService("consultation").filter(t => t.rating >= 4);
  const jake = all.find(t => t.id === "t39");
  const others = all.filter(t => t.id !== "t39").slice(0, 2);
  return jake ? [jake, ...others] : all.slice(0, 3);
})();

/* ------------------------------------------------------------------ */
/*  Custom treatment cards (too detailed for FeatureGrid)              */
/* ------------------------------------------------------------------ */

function TreatmentOptions() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, {
    once: scrollRevealConfig.once,
    amount: 0.1,
  });
  const prefersReducedMotion = useReducedMotion();

  return (
    <section id="treatments" className="py-20 px-4">
      <SectionHeader
        pill="Treatment Options"
        title="Clinically-Proven Approaches"
        subtitle="Our doctors can recommend TGA-approved hair loss treatment options based on your assessment"
        highlightWords={["Clinically-Proven"]}
      />

      <div ref={ref} className="mx-auto max-w-3xl space-y-4">
        {treatments.map((treatment, i) => (
          <motion.div
            key={treatment.id}
            className="rounded-2xl border border-border/50 dark:border-white/15 bg-white dark:bg-card shadow-md shadow-primary/[0.06] dark:shadow-none p-5 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/[0.08] transition-all duration-300"
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 16 }}
            animate={
              prefersReducedMotion
                ? {}
                : isInView
                  ? { opacity: 1, y: 0 }
                  : {}
            }
            transition={{
              duration: 0.4,
              delay: i * 0.1,
              ease: [0.25, 0.1, 0.25, 1],
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="text-lg font-semibold">{treatment.name}</h3>
                  {treatment.popular && (
                    <Badge className="bg-primary/10 text-primary hover:bg-primary/10 text-xs">
                      Popular
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {treatment.brand}
                </p>
              </div>
              <Pill className="h-5 w-5 text-primary shrink-0" />
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              {treatment.description}
            </p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {[
                { label: "Type", value: treatment.type },
                { label: "Frequency", value: treatment.frequency },
                { label: "Results", value: treatment.results },
                { label: "Best for", value: treatment.bestFor },
              ].map((field) => (
                <div
                  key={field.label}
                  className="rounded-lg border border-border/50 bg-muted/30 p-3"
                >
                  <p className="text-muted-foreground text-xs">{field.label}</p>
                  <p className="font-medium">{field.value}</p>
                </div>
              ))}
            </div>
          </motion.div>
        ))}

        <div className="pt-4 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Not sure which is right for you? Our doctors will recommend the best
            option.
          </p>
          <Button
            asChild
            size="lg"
            className="shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 transition-all"
          >
            <Link href="/request?service=consult">
              Start Consultation
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

interface HairLossClientProps {
  faqSchema: object;
}

export function HairLossClient({ faqSchema }: HairLossClientProps) {
  return (
    <MarketingPageShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="flex min-h-screen flex-col">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-20">
          <CenteredHero
            pill="Hair Loss Treatment"
            title="Hair Loss Treatment Online"
            highlightWords={["Treatment"]}
            subtitle="Get a doctor-led consultation for hair loss treatment from an Australian doctor. No waiting rooms. Completely discreet."
          >
            <AvailabilityIndicator variant="badge" className="mb-4" />

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                asChild
                size="lg"
                className="px-6 h-11 font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 transition-all"
              >
                <Link href="/request?service=consult">
                  Start Consultation
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-11">
                <Link href="#treatments">View Treatments</Link>
              </Button>
            </div>
          </CenteredHero>

          {/* Trust logos */}
          <div className="px-4 pb-8">
            <div className="mx-auto max-w-5xl">
              <RegulatoryPartners />
            </div>
          </div>

          {/* Hero image */}
          <section className="px-4 pb-12">
            <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-border/50 dark:border-white/15 shadow-lg shadow-primary/[0.06] dark:shadow-none">
              <Image
                src="/images/consult-1.jpeg"
                alt="Patient completing an online consultation from their phone"
                width={800}
                height={450}
                className="w-full h-auto object-cover"
                priority
              />
            </div>
          </section>

          <TreatmentOptions />

          <FeatureGrid
            pill="Why InstantMed"
            title="Discreet, Professional Healthcare"
            subtitle="Fast, discreet, and professional healthcare from home"
            highlightWords={["Professional"]}
            features={platformFeatures}
            columns={2}
          />

          <ProcessSteps
            pill="How It Works"
            title="Three Simple Steps"
            subtitle="Get your treatment plan without leaving home"
            highlightWords={["Simple"]}
            steps={howItWorksSteps}
          />

          <Timeline
            pill="Results Timeline"
            title="What to Expect"
            subtitle="Hair regrowth takes time — here's a typical timeline"
            highlightWords={["Expect"]}
            steps={resultsTimeline}
          />

          {/* Doctor credibility + patient feedback */}
          <section className="py-12 px-4">
            <div className="max-w-4xl mx-auto">
              <DoctorCredibility variant="inline" stats={['experience', 'approval', 'sameDay']} className="mb-10" />
              <h2 className="text-2xl font-semibold text-center mb-8">What patients say</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {hairLossTestimonials.map((t) => (
                  <div key={t.id} className="rounded-2xl border border-border/50 bg-white dark:bg-card p-5 shadow-md shadow-primary/[0.06] dark:shadow-none">
                    <div className="flex gap-0.5 mb-2">
                      {[...Array(t.rating)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-sm text-foreground/80 leading-relaxed">&ldquo;{t.text}&rdquo;</p>
                    <p className="text-xs text-muted-foreground mt-3">{t.name}, {t.location}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <AccordionSection
            pill="FAQs"
            title="Frequently Asked Questions"
            highlightWords={["Questions"]}
            groups={faqGroups}
          />

          <CTABanner
            title="Ready to Get Started?"
            subtitle="Complete a confidential consultation in minutes. Our doctors are ready to help."
            ctaText="Start Consultation"
            ctaHref="/request?service=consult"
          />
        </main>

        <MarketingFooter />
      </div>
    </MarketingPageShell>
  );
}
