import Link from "next/link"
import { notFound } from "next/navigation"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getMedicationBySlug, CATEGORY_LABELS, type Medication } from "@/lib/data/medications"
import { ArrowRight, Pill, AlertTriangle, CheckCircle, Clock, Shield } from "lucide-react"
import type { Metadata } from "next"

// Helper function to get medication price (default pricing)
function getMedicationPrice(med: Medication): number {
  // Default pricing based on category and requirements
  if (med.requiresCall) {
    return 49 // Medications requiring consultation
  }
  return 39 // Standard medications
}

// Helper function to get simple description
function getSimpleDescription(med: Medication): string {
  return `Prescription for ${med.name}${med.brandNames.length > 0 ? ` (${med.brandNames[0]})` : ""}. ${med.commonUses.join(", ")}.`
}

// Helper function to get side effects (generic based on category)
function getSideEffects(med: Medication): string[] {
  const commonSideEffects: Record<string, string[]> = {
    "mental-health": ["Nausea", "Headache", "Drowsiness", "Insomnia", "Dry mouth"],
    antibiotics: ["Nausea", "Diarrhea", "Stomach upset", "Allergic reactions"],
    "pain-relief": ["Drowsiness", "Nausea", "Constipation", "Dizziness"],
    default: ["Nausea", "Headache", "Dizziness", "Mild stomach upset"],
  }
  return commonSideEffects[med.category] || commonSideEffects.default
}

// Helper function to get warnings
function getWarnings(med: Medication): string[] {
  const warnings: string[] = []
  if (med.schedule === 8) {
    warnings.push("Controlled substance - requires special authorization")
  }
  if (med.requiresCall) {
    warnings.push("Requires consultation with a doctor")
  }
  if (med.category === "mental-health") {
    warnings.push("May take 2-4 weeks to see full effects")
    warnings.push("Do not stop taking suddenly without medical advice")
  }
  if (med.category === "antibiotics") {
    warnings.push("Complete the full course even if you feel better")
    warnings.push("May reduce effectiveness of birth control pills")
  }
  return warnings.length > 0 ? warnings : ["Follow your doctor's instructions", "Report any unusual side effects"]
}

// Helper function to get contraindications
function getContraindications(med: Medication): string[] {
  const contraindications: string[] = []
  if (med.category === "mental-health") {
    contraindications.push("Pregnant or breastfeeding without doctor approval")
    contraindications.push("Taking MAO inhibitors")
  }
  if (med.category === "antibiotics") {
    contraindications.push("Known allergy to this medication")
  }
  if (med.category === "contraception") {
    contraindications.push("History of blood clots")
    contraindications.push("Smoking and over 35 years old")
  }
  return contraindications
}

// Prevent static generation to avoid Clerk publishableKey build errors

export const dynamic = "force-dynamic"
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const med = getMedicationBySlug(slug)

  if (!med) {
    return { title: "Medication Not Found | InstantMed" }
  }

  return {
    title: `${med.name} Information | InstantMed`,
    description: `Learn about ${med.name}. Reviewed by Australian doctors.`,
    robots: {
      index: false,
      follow: false,
    },
  }
}

export default async function MedicationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const med = getMedicationBySlug(slug)

  if (!med) {
    notFound()
  }

  const price = getMedicationPrice(med)
  const simpleDescription = getSimpleDescription(med)
  const sideEffects = getSideEffects(med)
  const warnings = getWarnings(med)
  const contraindications = getContraindications(med)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar variant="marketing" />

      <main className="flex-1 pt-20">
        {/* Hero */}
        <section className="px-4 py-12 bg-linear-to-b from-background to-muted/30">
          <div className="mx-auto max-w-4xl">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Main Info */}
              <div className="flex-1">
                <Badge variant="outline" className="mb-4">
                  {CATEGORY_LABELS[med.category]}
                </Badge>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-2">{med.name}</h1>
                <p className="text-lg text-muted-foreground mb-4">
                  {med.brandNames.length > 0 ? `${med.brandNames.join(", ")} • ` : ""}{med.name}
                </p>
                <p className="text-lg mb-6">{simpleDescription}</p>

                {/* Quick Facts */}
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>Same-day review</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <span>AHPRA doctors</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Pill className="h-4 w-4 text-primary" />
                    <span>Any pharmacy</span>
                  </div>
                </div>
              </div>

              {/* CTA Card */}
              <div className="lg:w-80 shrink-0">
                <div className="sticky top-24 p-6 rounded-2xl border bg-card shadow-lg">
                  <div className="text-center mb-4">
                    <p className="text-sm text-muted-foreground">From</p>
                    <p className="text-4xl font-bold">${price}</p>
                  </div>
                  <Button asChild className="w-full h-12 text-base" size="lg">
                    <Link href={`/start?service=repeat-script&medication=${med.id}`}>
                      Request {med.name}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <p className="text-xs text-center text-muted-foreground mt-3">
                    Only charged if a doctor approves your request
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Details */}
        <section className="px-4 py-12">
          <div className="mx-auto max-w-4xl grid md:grid-cols-2 gap-8">
            {/* Uses */}
            <div className="p-6 rounded-xl border bg-card">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                What it&apos;s used for
              </h2>
              <ul className="space-y-2">
                {med.commonUses.map((use) => (
                  <li key={use} className="flex items-start gap-2 text-sm">
                    <span className="text-primary mt-1">•</span>
                    {use}
                  </li>
                ))}
              </ul>
            </div>

            {/* Dosages */}
            <div className="p-6 rounded-xl border bg-card">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Pill className="h-5 w-5 text-primary" />
                Common dosages
              </h2>
              <ul className="space-y-2">
                {med.strengths.map((strength) => (
                  <li key={strength} className="flex items-start gap-2 text-sm">
                    <span className="text-primary mt-1">•</span>
                    {strength}
                  </li>
                ))}
              </ul>
            </div>

            {/* Side Effects */}
            <div className="p-6 rounded-xl border bg-card">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Possible side effects
              </h2>
              <ul className="space-y-2">
                {sideEffects.map((effect) => (
                  <li key={effect} className="flex items-start gap-2 text-sm">
                    <span className="text-amber-500 mt-1">•</span>
                    {effect}
                  </li>
                ))}
              </ul>
            </div>

            {/* Warnings */}
            <div className="p-6 rounded-xl border bg-card">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Important warnings
              </h2>
              <ul className="space-y-2">
                {warnings.map((warning) => (
                  <li key={warning} className="flex items-start gap-2 text-sm">
                    <span className="text-red-500 mt-1">•</span>
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Not suitable */}
        {contraindications.length > 0 && (
          <section className="px-4 py-8">
            <div className="mx-auto max-w-2xl">
              <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                <h3 className="font-semibold text-red-800 mb-2">Who should NOT take {med.name}</h3>
                <ul className="space-y-1 text-sm text-red-700">
                  {contraindications.map((contra) => (
                    <li key={contra}>• {contra}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* Bottom CTA */}
        <section className="px-4 py-12 bg-muted/30">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to request {med.name}?</h2>
            <p className="text-muted-foreground mb-6">
              Fill out a quick questionnaire. A doctor reviews within hours. E-script sent straight to your phone.
            </p>
            <Button asChild size="lg" className="h-12 px-8">
              <Link href={`/prescriptions/request?medication=${med.id}`}>
                Get started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
