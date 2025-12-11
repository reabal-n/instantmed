import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { TiltCard } from "@/components/shared/tilt-card"
import { Pill, ArrowRight } from "lucide-react"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Medications Directory | Online Prescriptions | InstantMed",
  description:
    "Browse our directory of prescribable medications. Learn about dosages, uses, and side effects. Request prescriptions online from Australian doctors.",
  openGraph: {
    title: "Medications Directory | InstantMed",
    description: "Browse medications available for online prescription in Australia.",
  },
}

const medicationCategories = [
  {
    name: "Antibiotics",
    medications: [
      { slug: "amoxicillin", name: "Amoxicillin" },
      { slug: "doxycycline", name: "Doxycycline" },
      { slug: "azithromycin", name: "Azithromycin" },
    ],
  },
  {
    name: "Blood Pressure",
    medications: [
      { slug: "amlodipine", name: "Amlodipine" },
      { slug: "ramipril", name: "Ramipril" },
      { slug: "metoprolol", name: "Metoprolol" },
    ],
  },
  {
    name: "Diabetes",
    medications: [
      { slug: "metformin", name: "Metformin" },
      { slug: "gliclazide", name: "Gliclazide" },
    ],
  },
  {
    name: "Men's Health",
    medications: [
      { slug: "sildenafil", name: "Sildenafil (Viagra)" },
      { slug: "tadalafil", name: "Tadalafil (Cialis)" },
      { slug: "finasteride", name: "Finasteride" },
    ],
  },
  {
    name: "Women's Health",
    medications: [
      { slug: "levlen", name: "Levlen ED" },
      { slug: "yasmin", name: "Yasmin" },
      { slug: "trimethoprim", name: "Trimethoprim (UTI)" },
    ],
  },
  {
    name: "Weight Loss",
    medications: [
      { slug: "ozempic", name: "Ozempic (Semaglutide)" },
      { slug: "saxenda", name: "Saxenda (Liraglutide)" },
    ],
  },
]

export default function MedicationsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-hero">
      <Navbar variant="marketing" />

      <main className="flex-1 pt-24">
        {/* Hero */}
        <section className="px-4 py-12 text-center">
          <div className="h-14 w-14 rounded-xl bg-[#00E2B5]/10 flex items-center justify-center mx-auto mb-4">
            <Pill className="h-7 w-7 text-[#00E2B5]" />
          </div>
          <h1 className="text-3xl font-bold sm:text-4xl mb-4" style={{ fontFamily: "var(--font-display)" }}>
            Medications Directory
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Learn about medications available for online prescription in Australia. Each page includes dosage info,
            uses, side effects, and a link to request a prescription.
          </p>
        </section>

        {/* Categories */}
        <section className="px-4 py-12 bg-mesh">
          <div className="mx-auto max-w-4xl">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {medicationCategories.map((category) => (
                <TiltCard key={category.name} className="glass-card rounded-xl p-5">
                  <h2 className="font-semibold mb-3">{category.name}</h2>
                  <ul className="space-y-2">
                    {category.medications.map((med) => (
                      <li key={med.slug}>
                        <Link
                          href={`/medications/${med.slug}`}
                          className="flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors group"
                        >
                          <span>{med.name}</span>
                          <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </TiltCard>
              ))}
            </div>
          </div>
        </section>

        {/* Disclaimer */}
        <section className="px-4 py-8">
          <div className="mx-auto max-w-2xl text-center text-xs text-muted-foreground">
            <p>
              This directory is for educational purposes only. Not all medications listed can be prescribed online. A
              doctor will assess whether each medication is appropriate for your situation.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
