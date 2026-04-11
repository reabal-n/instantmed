import Link from "next/link";
import { ArrowRight, AlertTriangle } from "lucide-react";
import { Navbar } from "@/components/shared/navbar";
import { MarketingFooter } from "@/components/marketing";
import { CenteredHero } from "@/components/heroes";
import { AccordionSection, CTABanner, SectionHeader } from "@/components/sections";
import { PerspectiveTiltCard } from "@/components/ui/morning/perspective-tilt-card";
import { BreadcrumbSchema, FAQSchema } from "@/components/seo/healthcare-schema";
import { symptoms as symptomsData } from "@/lib/seo/data/symptoms";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Symptom Guide | Common Symptoms & Causes",
  description:
    "Understand your symptoms and when to see a doctor. Browse 26 common symptoms including sore throat, headache, fatigue, nausea, dizziness, and more. Get assessed by Australian doctors online.",
  openGraph: {
    title: "Symptom Checker | InstantMed",
    description:
      "Understand your symptoms and when to seek medical advice.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/symptoms",
  },
};

const symptoms = Object.values(symptomsData).map((s) => ({
  slug: s.slug,
  name: s.name,
  description: s.description,
  commonCauses: s.possibleCauses
    .filter((c) => c.likelihood === "common")
    .slice(0, 4)
    .map((c) => c.name),
}));

const symptomsFaqs = [
  {
    question: "Is this a diagnosis tool?",
    answer: "No. Our symptom guides are for general health information only. They can help you understand what might be going on, but they don't replace a proper medical assessment. For a clinical opinion, start a consultation with one of our doctors.",
  },
  {
    question: "When should I go to emergency instead?",
    answer: "If you're experiencing chest pain, difficulty breathing, severe bleeding, loss of consciousness, signs of stroke, or any life-threatening symptoms - call 000 or go to your nearest emergency department immediately. Telehealth is not appropriate for emergencies.",
  },
  {
    question: "Can you treat my symptoms via telehealth?",
    answer: "Many common symptoms can be assessed and managed via telehealth, including sore throats, headaches, coughs, fevers, and fatigue. Our doctors will tell you if your symptoms need in-person examination instead.",
  },
  {
    question: "What if I have multiple symptoms at the same time?",
    answer: "That's completely normal - most illnesses come with a few symptoms at once. Describe everything you're experiencing in your consultation request, and our doctor will consider the full picture.",
  },
  {
    question: "Can I get a medical certificate based on my symptoms?",
    answer: "If a doctor assesses that your symptoms are genuine and prevent you from working or studying, they can issue a medical certificate. The certificate covers the period the doctor considers clinically appropriate.",
  },
  {
    question: "How accurate is symptom information online?",
    answer: "Our symptom pages are reviewed for clinical accuracy, but online information is general by nature. Your actual situation may differ. That's why we always recommend getting assessed by a doctor rather than self-diagnosing.",
  },
  {
    question: "Do I need to know my diagnosis before starting?",
    answer: "Not at all. You don't need to know what's wrong - that's our job. Just describe your symptoms as clearly as you can, and our doctor will take it from there.",
  },
  {
    question: "What happens after I describe my symptoms?",
    answer: "An AHPRA-registered doctor reviews your symptom details and medical history. They'll either provide advice, issue a certificate, suggest treatment, or recommend you see someone in person - whatever's clinically appropriate.",
  },
]

export default function SymptomsIndexPage() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          {
            name: "Symptom Checker",
            url: "https://instantmed.com.au/symptoms",
          },
        ]}
      />
      <FAQSchema faqs={symptomsFaqs} />

      <div className="flex min-h-screen flex-col">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-20">
          <CenteredHero
            pill="Symptom Checker"
            title="What's Causing Your Symptoms?"
            highlightWords={["Symptoms"]}
            subtitle="Learn about common symptoms, possible causes, and when you should see a doctor. This information is for guidance only - for medical advice, consult a doctor."
          />

          {/* Emergency Notice - critical safety, always visible */}
          <section className="px-4 py-5 bg-destructive-light border-y border-destructive-border">
            <div className="mx-auto max-w-4xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-destructive font-medium">
                  If you&apos;re experiencing a medical emergency, call 000
                  immediately
                </p>
                <p className="text-sm text-destructive mt-1">
                  Symptoms like chest pain, difficulty breathing, severe
                  bleeding, or loss of consciousness require emergency care.
                </p>
              </div>
            </div>
          </section>

          {/* Symptoms Grid */}
          <section className="py-20 px-4">
            <SectionHeader
              title="Common Symptoms"
              subtitle="Select a symptom to learn about possible causes and when to seek help"
              highlightWords={["Symptoms"]}
            />

            <div className="mx-auto max-w-5xl grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {symptoms.map((symptom) => (
                <Link key={symptom.slug} href={`/symptoms/${symptom.slug}`} className="group">
                  <PerspectiveTiltCard variant="glass" maxRotation={4} className="h-full">
                    <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                      {symptom.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {symptom.description}
                    </p>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Common causes:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {symptom.commonCauses.map((cause) => (
                          <span
                            key={cause}
                            className="text-xs px-2 py-1 rounded-full border border-border/50 bg-muted/30 text-muted-foreground"
                          >
                            {cause}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="mt-4 flex items-center text-sm text-primary font-medium">
                      Learn more
                      <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </PerspectiveTiltCard>
                </Link>
              ))}
            </div>
          </section>

          {/* FAQ Section */}
          <AccordionSection
            groups={[{ items: symptomsFaqs }]}
            title="Common Questions About Symptoms"
            subtitle="Understanding when and how to seek care"
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

          <CTABanner
            title="Concerned About Your Symptoms?"
            subtitle="Our Australian-registered doctors can assess your symptoms and provide advice, treatment, or medical certificates when appropriate."
            ctaText="Get assessed by a doctor"
            ctaHref="/request"
          />
        </main>

        <MarketingFooter />
      </div>
    </>
  );
}
