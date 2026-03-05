import Link from "next/link";
import { ArrowRight, AlertTriangle } from "lucide-react";
import { Navbar } from "@/components/shared/navbar";
import { MarketingFooter } from "@/components/marketing";
import { CenteredHero } from "@/components/heroes";
import { CTABanner, SectionHeader } from "@/components/sections";
import { BreadcrumbSchema } from "@/components/seo/healthcare-schema";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Symptom Checker | What Could Be Causing Your Symptoms",
  description:
    "Understand your symptoms and learn when you should see a doctor. Browse common symptoms like sore throat, headache, fatigue, cough, and fever. Get assessed by Australian doctors online.",
  openGraph: {
    title: "Symptom Checker | InstantMed",
    description:
      "Understand your symptoms and when to seek medical advice.",
  },
};

const symptoms = [
  {
    slug: "sore-throat",
    name: "Sore Throat",
    description:
      "Pain or irritation in the throat, especially when swallowing",
    commonCauses: ["Viral infection", "Bacterial infection", "Allergies"],
  },
  {
    slug: "headache",
    name: "Headache",
    description: "Pain in any region of the head, from dull to sharp",
    commonCauses: ["Tension", "Migraine", "Dehydration", "Sinus"],
  },
  {
    slug: "fatigue",
    name: "Fatigue & Tiredness",
    description: "Persistent exhaustion that doesn't improve with rest",
    commonCauses: ["Poor sleep", "Stress", "Anaemia", "Thyroid"],
  },
  {
    slug: "cough",
    name: "Cough",
    description: "Dry or productive cough that may be acute or chronic",
    commonCauses: ["Viral infection", "Allergies", "Asthma", "Reflux"],
  },
  {
    slug: "fever",
    name: "Fever",
    description: "Body temperature above 38°C, often with other symptoms",
    commonCauses: ["Viral infection", "Bacterial infection", "COVID-19"],
  },
];

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

      <div className="flex min-h-screen flex-col bg-background">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-20">
          <CenteredHero
            pill="Symptom Checker"
            title="What's Causing Your Symptoms?"
            highlightWords={["Symptoms"]}
            subtitle="Learn about common symptoms, possible causes, and when you should see a doctor. This information is for guidance only — for medical advice, consult a doctor."
          />

          {/* Emergency Notice — critical safety, always visible */}
          <section className="px-4 py-5 bg-red-50 dark:bg-red-950/30 border-y border-red-200 dark:border-red-800">
            <div className="mx-auto max-w-4xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-red-800 dark:text-red-200 font-medium">
                  If you&apos;re experiencing a medical emergency, call 000
                  immediately
                </p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
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

            <div className="mx-auto max-w-4xl grid sm:grid-cols-2 gap-5">
              {symptoms.map((symptom) => (
                <Link
                  key={symptom.slug}
                  href={`/symptoms/${symptom.slug}`}
                  className="group rounded-2xl border border-border/50 bg-white/60 dark:bg-white/5 backdrop-blur-sm p-6 hover:border-primary/50 hover:shadow-lg transition-all"
                >
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
                </Link>
              ))}
            </div>
          </section>

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
