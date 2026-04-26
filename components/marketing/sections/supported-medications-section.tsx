import type { LucideIcon } from "lucide-react"
import {
  Brain,
  Droplets,
  Heart,
  Pill,
  Shield,
  Sun,
  Thermometer,
  Wind,
} from "lucide-react"

import { Reveal } from "@/components/ui/reveal"
import { SectionPill } from "@/components/ui/section-pill"
import { cn } from "@/lib/utils"

// =============================================================================
// DATA
// =============================================================================

interface MedCategory {
  icon: LucideIcon
  name: string
  examples: string
  accent: string
  iconBg: string
  iconColor: string
}

const CATEGORIES: MedCategory[] = [
  {
    icon: Heart,
    name: "Blood pressure",
    examples: "Amlodipine, Ramipril, Perindopril",
    accent: "border-t-rose-400/60",
    iconBg: "bg-rose-50 dark:bg-rose-500/10",
    iconColor: "text-rose-500",
  },
  {
    icon: Droplets,
    name: "Cholesterol",
    examples: "Atorvastatin, Rosuvastatin",
    accent: "border-t-amber-400/60",
    iconBg: "bg-amber-50 dark:bg-amber-500/10",
    iconColor: "text-amber-500",
  },
  {
    icon: Shield,
    name: "Contraceptives",
    examples: "Combined pill, mini pill",
    accent: "border-t-pink-400/60",
    iconBg: "bg-pink-50 dark:bg-pink-500/10",
    iconColor: "text-pink-500",
  },
  {
    icon: Wind,
    name: "Asthma & COPD",
    examples: "Ventolin, Seretide, Symbicort",
    accent: "border-t-sky-400/60",
    iconBg: "bg-sky-50 dark:bg-sky-500/10",
    iconColor: "text-sky-500",
  },
  {
    icon: Thermometer,
    name: "Reflux & gut",
    examples: "Omeprazole, Pantoprazole, Esomeprazole",
    accent: "border-t-orange-400/60",
    iconBg: "bg-orange-50 dark:bg-orange-500/10",
    iconColor: "text-orange-500",
  },
  {
    icon: Sun,
    name: "Skin conditions",
    examples: "Topical steroids, tretinoin",
    accent: "border-t-lime-400/60",
    iconBg: "bg-lime-50 dark:bg-lime-500/10",
    iconColor: "text-lime-500",
  },
  {
    icon: Brain,
    name: "Thyroid",
    examples: "Levothyroxine, Thyroxine",
    accent: "border-t-teal-400/60",
    iconBg: "bg-teal-50 dark:bg-teal-500/10",
    iconColor: "text-teal-500",
  },
  {
    icon: Pill,
    name: "Other regular meds",
    examples: "Antihistamines, iron, metformin",
    accent: "border-t-slate-400/60",
    iconBg: "bg-slate-50 dark:bg-slate-500/10",
    iconColor: "text-slate-500",
  },
]

// =============================================================================
// COMPONENT
// =============================================================================

/** Medication categories grid with color-coded accent borders and hover effects */
export function SupportedMedicationsSection() {
  return (
    <section aria-label="Supported medications" className="py-12 lg:py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <Reveal className="text-center mb-10">
          <SectionPill>Medications</SectionPill>
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mt-4 mb-3 tracking-tight">
            Common medications we can renew
          </h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            For medications you already take. If your medication isn&apos;t
            listed, submit a request and the doctor will let you know.
          </p>
        </Reveal>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CATEGORIES.map((cat, index) => (
            <Reveal key={cat.name} delay={index * 0.05}>
              <div
                className={cn(
                  "rounded-xl bg-white dark:bg-card border border-border/50 dark:border-white/15 border-t-2",
                  cat.accent,
                  "shadow-sm shadow-primary/[0.04] dark:shadow-none p-4",
                  "hover:shadow-md hover:shadow-primary/[0.08] hover:-translate-y-0.5 transition-[transform,box-shadow] duration-300"
                )}
              >
                <div
                  className={cn(
                    "inline-flex items-center justify-center w-8 h-8 rounded-lg mb-3",
                    cat.iconBg
                  )}
                >
                  <cat.icon className={cn("h-4 w-4", cat.iconColor)} />
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">
                  {cat.name}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {cat.examples}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
