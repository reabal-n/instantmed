import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { Button } from "@/components/ui/button"
import { ArrowRight, AlertTriangle, Pill, Clock, FileText } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

// Medication Directory Configuration
const medications: Record<
  string,
  {
    name: string
    genericName: string
    category: string
    description: string
    uses: string[]
    dosages: string[]
    sideEffects: string[]
    warnings: string[]
    prescribable: boolean
    schedule: string
  }
> = {
  amoxicillin: {
    name: "Amoxicillin",
    genericName: "Amoxicillin",
    category: "Antibiotic",
    description: "A penicillin-type antibiotic used to treat a wide variety of bacterial infections.",
    uses: ["Chest infections", "Ear infections", "Urinary tract infections", "Skin infections", "Dental infections"],
    dosages: ["250mg three times daily", "500mg three times daily", "Course typically 5-7 days"],
    sideEffects: ["Nausea", "Diarrhea", "Skin rash", "Yeast infections"],
    warnings: ["Tell your doctor if you're allergic to penicillin", "Complete the full course even if you feel better"],
    prescribable: true,
    schedule: "S4",
  },
  metformin: {
    name: "Metformin",
    genericName: "Metformin Hydrochloride",
    category: "Diabetes Medication",
    description: "First-line medication for type 2 diabetes that helps control blood sugar levels.",
    uses: ["Type 2 diabetes", "Polycystic ovary syndrome (PCOS)", "Insulin resistance"],
    dosages: ["500mg once or twice daily", "850mg once daily", "Extended release formulations available"],
    sideEffects: ["Nausea", "Diarrhea", "Stomach upset", "Vitamin B12 deficiency (long-term)"],
    warnings: ["Avoid excessive alcohol", "May need to stop before surgery or contrast scans"],
    prescribable: true,
    schedule: "S4",
  },
  sildenafil: {
    name: "Viagra (Sildenafil)",
    genericName: "Sildenafil Citrate",
    category: "Erectile Dysfunction",
    description: "Medication used to treat erectile dysfunction by increasing blood flow.",
    uses: ["Erectile dysfunction", "Pulmonary arterial hypertension"],
    dosages: ["25mg, 50mg, or 100mg", "Take 30-60 minutes before sexual activity", "Maximum once per day"],
    sideEffects: ["Headache", "Flushing", "Indigestion", "Nasal congestion", "Visual changes"],
    warnings: [
      "Do not take with nitrates",
      "Seek medical help for erections lasting more than 4 hours",
      "Not suitable for some heart conditions",
    ],
    prescribable: true,
    schedule: "S4",
  },
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const med = medications[slug]
  if (!med) return {}

  return {
    title: `${med.name} Prescription Online Australia | InstantMed`,
    description: `Request ${med.name} (${med.genericName}) online. ${med.description} Reviewed by Australian doctors.`,
    keywords: [`${med.name} online`, `${med.name} prescription australia`, `buy ${med.name} online`],
    openGraph: {
      title: `${med.name} Online | InstantMed`,
      description: `Request ${med.name} online from AHPRA-registered doctors.`,
    },
  }
}

export async function generateStaticParams() {
  return Object.keys(medications).map((slug) => ({ slug }))
}

export default async function MedicationPage({ params }: PageProps) {
  const { slug } = await params
  const med = medications[slug]

  if (!med) {
    notFound()
  }

  // Medical schema
  const medSchema = {
    "@context": "https://schema.org",
    "@type": "Drug",
    name: med.name,
    nonProprietaryName: med.genericName,
    drugClass: med.category,
    description: med.description,
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(medSchema) }} />

      <div className="flex min-h-screen flex-col bg-hero">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-24">
          {/* Hero */}
          <section className="px-4 py-12">
            <div className="mx-auto max-w-3xl">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <Link href="/medications" className="hover:text-[#00E2B5]">
                  Medications
                </Link>
                <span>/</span>
                <span>{med.category}</span>
              </div>

              <div className="flex items-start gap-4 mb-6">
                <div className="h-14 w-14 rounded-xl bg-[#00E2B5]/10 flex items-center justify-center shrink-0">
                  <Pill className="h-7 w-7 text-[#00E2B5]" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold sm:text-3xl" style={{ fontFamily: "var(--font-display)" }}>
                    {med.name}
                  </h1>
                  <p className="text-muted-foreground">
                    {med.genericName} • {med.category} • Schedule {med.schedule}
                  </p>
                </div>
              </div>

              <p className="text-muted-foreground mb-6">{med.description}</p>

              {med.prescribable && (
                <Link href={`/prescriptions/request?medication=${slug}`}>
                  <Button size="lg" className="bg-[#00E2B5] hover:bg-[#00E2B5]/90 text-[#0A0F1C]">
                    Request This Medication
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              )}
            </div>
          </section>

          {/* Details Grid */}
          <section className="px-4 py-12 bg-mesh">
            <div className="mx-auto max-w-3xl grid gap-6 sm:grid-cols-2">
              {/* Uses */}
              <div className="glass-card rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-5 w-5 text-[#00E2B5]" />
                  <h2 className="font-semibold">Common Uses</h2>
                </div>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {med.uses.map((use, i) => (
                    <li key={i}>• {use}</li>
                  ))}
                </ul>
              </div>

              {/* Dosages */}
              <div className="glass-card rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-5 w-5 text-[#06B6D4]" />
                  <h2 className="font-semibold">Typical Dosages</h2>
                </div>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {med.dosages.map((dose, i) => (
                    <li key={i}>• {dose}</li>
                  ))}
                </ul>
              </div>

              {/* Side Effects */}
              <div className="glass-card rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Pill className="h-5 w-5 text-[#8B5CF6]" />
                  <h2 className="font-semibold">Possible Side Effects</h2>
                </div>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {med.sideEffects.map((effect, i) => (
                    <li key={i}>• {effect}</li>
                  ))}
                </ul>
              </div>

              {/* Warnings */}
              <div className="glass-card rounded-xl p-5 border-amber-200 bg-amber-50/50">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <h2 className="font-semibold text-amber-800">Important Warnings</h2>
                </div>
                <ul className="space-y-1.5 text-sm text-amber-700">
                  {med.warnings.map((warning, i) => (
                    <li key={i}>• {warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Disclaimer */}
          <section className="px-4 py-8">
            <div className="mx-auto max-w-2xl text-center text-xs text-muted-foreground">
              <p>
                This information is for educational purposes only and is not a substitute for professional medical
                advice. Always consult a doctor before starting or changing any medication. The prescribing doctor will
                assess whether this medication is appropriate for you.
              </p>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  )
}
