import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Conditions We Treat Online | InstantMed Australia",
  description:
    "Browse all conditions we can treat online. UTI, acne, eczema, erectile dysfunction, hair loss, and more. Australian doctors, fast service.",
}

const conditionCategories = [
  {
    name: "Women's Health",
    conditions: [
      { name: "UTI", slug: "uti" },
      { name: "Thrush", slug: "thrush" },
      { name: "Contraception", slug: "contraception" },
    ],
  },
  {
    name: "Men's Health",
    conditions: [
      { name: "Erectile Dysfunction", slug: "erectile-dysfunction" },
      { name: "Hair Loss", slug: "hair-loss" },
    ],
  },
  {
    name: "Skin Conditions",
    conditions: [
      { name: "Acne", slug: "acne" },
      { name: "Eczema", slug: "eczema" },
    ],
  },
  {
    name: "Respiratory & Allergies",
    conditions: [
      { name: "Hay Fever", slug: "hay-fever" },
      { name: "Cold and Flu", slug: "cold-and-flu" },
      { name: "Sinus Infection", slug: "sinus-infection" },
      { name: "Conjunctivitis", slug: "conjunctivitis" },
    ],
  },
  {
    name: "Digestive",
    conditions: [{ name: "Acid Reflux", slug: "acid-reflux" }],
  },
  {
    name: "Chronic Conditions",
    conditions: [
      { name: "High Blood Pressure", slug: "high-blood-pressure" },
      { name: "High Cholesterol", slug: "high-cholesterol" },
    ],
  },
  {
    name: "Weight Management",
    conditions: [{ name: "Weight Loss", slug: "weight-loss" }],
  },
]

export default function ConditionsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar variant="marketing" />

      <main className="flex-1 pt-20">
        <section className="px-4 py-12 sm:py-16">
          <div className="mx-auto max-w-4xl">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl text-center mb-4">
              Conditions We Treat Online
            </h1>
            <p className="text-muted-foreground text-center max-w-xl mx-auto mb-12">
              Quick, convenient treatment for common conditions. Reviewed by Australian doctors.
            </p>

            <div className="space-y-8">
              {conditionCategories.map((category) => (
                <div key={category.name}>
                  <h2 className="text-lg font-semibold mb-4">{category.name}</h2>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {category.conditions.map((condition) => (
                      <Link
                        key={condition.slug}
                        href={`/conditions/${condition.slug}`}
                        className="flex items-center justify-between p-4 rounded-xl border bg-card hover:border-[#00E2B5] transition-colors"
                      >
                        <span className="font-medium">{condition.name}</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
