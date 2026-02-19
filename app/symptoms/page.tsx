import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { Button } from "@/components/ui/button"
import { ArrowRight, Shield, Clock, Star, AlertTriangle } from "lucide-react"
import Link from "next/link"
import type { Metadata } from "next"
import { BreadcrumbSchema } from "@/components/seo/healthcare-schema"

export const metadata: Metadata = {
  title: "Symptom Checker | What Could Be Causing Your Symptoms",
  description: "Understand your symptoms and learn when you should see a doctor. Browse common symptoms like sore throat, headache, fatigue, cough, and fever. Get assessed by Australian doctors online.",
  openGraph: {
    title: "Symptom Checker | InstantMed",
    description: "Understand your symptoms and when to seek medical advice.",
  },
}

const symptoms = [
  {
    slug: "sore-throat",
    name: "Sore Throat",
    description: "Pain or irritation in the throat, especially when swallowing",
    commonCauses: ["Viral infection", "Bacterial infection", "Allergies"]
  },
  {
    slug: "headache",
    name: "Headache",
    description: "Pain in any region of the head, from dull to sharp",
    commonCauses: ["Tension", "Migraine", "Dehydration", "Sinus"]
  },
  {
    slug: "fatigue",
    name: "Fatigue & Tiredness",
    description: "Persistent exhaustion that doesn't improve with rest",
    commonCauses: ["Poor sleep", "Stress", "Anaemia", "Thyroid"]
  },
  {
    slug: "cough",
    name: "Cough",
    description: "Dry or productive cough that may be acute or chronic",
    commonCauses: ["Viral infection", "Allergies", "Asthma", "Reflux"]
  },
  {
    slug: "fever",
    name: "Fever",
    description: "Body temperature above 38°C, often with other symptoms",
    commonCauses: ["Viral infection", "Bacterial infection", "COVID-19"]
  },
]

export default function SymptomsIndexPage() {
  return (
    <>
      <BreadcrumbSchema 
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Symptom Checker", url: "https://instantmed.com.au/symptoms" }
        ]} 
      />

      <div className="flex min-h-screen flex-col bg-white/50 dark:bg-black">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-20">
          {/* Hero */}
          <section className="px-4 py-16 bg-white/80 dark:bg-white/5 border-b border-white/50 dark:border-white/10">
            <div className="mx-auto max-w-4xl text-center">
              <h1 className="text-4xl font-bold text-foreground mb-4">
                What&apos;s Causing Your Symptoms?
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                Learn about common symptoms, possible causes, and when you should see a doctor. 
                This information is for guidance only — for medical advice, consult a doctor.
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <span>Doctor-reviewed content</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>Updated regularly</span>
                </div>
              </div>
            </div>
          </section>

          {/* Emergency Notice */}
          <section className="px-4 py-6 bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-800">
            <div className="mx-auto max-w-4xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-red-800 dark:text-red-200 font-medium">
                  If you&apos;re experiencing a medical emergency, call 000 immediately
                </p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  Symptoms like chest pain, difficulty breathing, severe bleeding, or loss of consciousness require emergency care.
                </p>
              </div>
            </div>
          </section>

          {/* Symptoms Grid */}
          <section className="px-4 py-16">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-2xl font-bold text-foreground mb-8">
                Common Symptoms
              </h2>
              <div className="grid sm:grid-cols-2 gap-6">
                {symptoms.map((symptom) => (
                  <Link
                    key={symptom.slug}
                    href={`/symptoms/${symptom.slug}`}
                    className="group bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-white/50 dark:border-white/10 p-6 hover:border-primary/50 hover:shadow-lg transition-all"
                  >
                    <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                      {symptom.name}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      {symptom.description}
                    </p>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Common causes:</p>
                      <div className="flex flex-wrap gap-2">
                        {symptom.commonCauses.map((cause) => (
                          <span 
                            key={cause}
                            className="text-xs px-2 py-1 bg-white/60 dark:bg-white/10 rounded-full text-muted-foreground"
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
            </div>
          </section>

          {/* CTA */}
          <section className="px-4 py-16 bg-primary/5">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Concerned About Your Symptoms?
              </h2>
              <p className="text-muted-foreground mb-8">
                Our Australian-registered doctors can assess your symptoms and provide advice, 
                treatment, or medical certificates when appropriate.
              </p>
              <Button asChild size="lg" className="rounded-full">
                <Link href="/request">
                  Get assessed by a doctor
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>Response in ~1 hour</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  <span>4.9/5 rating</span>
                </div>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  )
}
