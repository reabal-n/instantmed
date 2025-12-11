"use client"

import Link from "next/link"
import { ArrowRight, Sparkles } from "lucide-react"
import { BlurFade } from "@/components/ui/blur-fade"

interface Condition {
  id: string
  icon: string
  name: string
  tagline: string
  price: string
  href: string
  color: string
  popular?: boolean
}

const conditions: Condition[] = [
  {
    id: "med-cert",
    icon: "📄",
    name: "Med Certificate",
    tagline: "Work or uni. Sorted.",
    price: "$29",
    href: "/medical-certificate",
    color: "#00E2B5",
    popular: true,
  },
  {
    id: "weight-loss",
    icon: "⚖️",
    name: "Weight Loss",
    tagline: "Ozempic & friends.",
    price: "$149",
    href: "/weight-loss",
    color: "#10B981",
    popular: true,
  },
  {
    id: "cold-flu",
    icon: "🤧",
    name: "Cold & Flu",
    tagline: "Feel like death? Get sorted.",
    price: "$39",
    href: "/prescriptions",
    color: "#06B6D4",
  },
  {
    id: "uti",
    icon: "🔥",
    name: "UTI",
    tagline: "Burning? Yeah, no thanks.",
    price: "$39",
    href: "/womens-health?condition=uti",
    color: "#EC4899",
  },
  {
    id: "blood-pressure",
    icon: "💊",
    name: "Blood Pressure",
    tagline: "Keep the ticker happy.",
    price: "$39",
    href: "/prescriptions",
    color: "#EF4444",
  },
  {
    id: "hair-loss",
    icon: "💇",
    name: "Hair Loss",
    tagline: "Fighting the fade.",
    price: "$39",
    href: "/mens-health?condition=hair-loss",
    color: "#8B5CF6",
  },
  {
    id: "contraception",
    icon: "💊",
    name: "Contraception",
    tagline: "No surprises.",
    price: "$39",
    href: "/womens-health?condition=contraception",
    color: "#F472B6",
  },
  {
    id: "skin",
    icon: "🩹",
    name: "Skin Issues",
    tagline: "Rashes, acne, the works.",
    price: "$39",
    href: "/prescriptions",
    color: "#F59E0B",
  },
  {
    id: "sleep",
    icon: "😴",
    name: "Sleep",
    tagline: "Actually get some rest.",
    price: "$39",
    href: "/prescriptions",
    color: "#6366F1",
  },
  {
    id: "ed",
    icon: "💪",
    name: "Erectile Dysfunction",
    tagline: "Discreet. No judgement.",
    price: "$39",
    href: "/mens-health?condition=ed",
    color: "#3B82F6",
  },
  {
    id: "reflux",
    icon: "🔥",
    name: "Acid Reflux",
    tagline: "Tame the burn.",
    price: "$39",
    href: "/prescriptions",
    color: "#F97316",
  },
  {
    id: "allergies",
    icon: "🌸",
    name: "Allergies",
    tagline: "Stop the sniffles.",
    price: "$39",
    href: "/prescriptions",
    color: "#A855F7",
  },
]

export function ConditionGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {conditions.map((condition, i) => (
        <BlurFade key={condition.id} delay={0.05 + i * 0.03}>
          <Link href={condition.href} className="group block h-full">
            <div 
              className="relative bg-white dark:bg-gray-800 rounded-2xl p-5 h-full shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100 dark:border-gray-700 overflow-hidden"
            >
              {/* Popular badge */}
              {condition.popular && (
                <div className="absolute top-2 right-2">
                  <div className="flex items-center gap-1 bg-gradient-to-r from-[#00E2B5] to-[#06B6D4] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    <Sparkles className="h-2.5 w-2.5" />
                    Popular
                  </div>
                </div>
              )}
              
              {/* Gradient accent */}
              <div 
                className="absolute top-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: `linear-gradient(90deg, ${condition.color}, ${condition.color}80)` }}
              />
              
              {/* Icon with color background */}
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 text-2xl group-hover:scale-110 transition-transform duration-300"
                style={{ background: `linear-gradient(135deg, ${condition.color}20, ${condition.color}10)` }}
              >
                {condition.icon}
              </div>

              {/* Name */}
              <h3 className="font-bold text-sm text-foreground mb-1">{condition.name}</h3>

              {/* Tagline */}
              <p className="text-xs text-muted-foreground leading-snug mb-4">{condition.tagline}</p>

              {/* Price + Arrow */}
              <div className="flex items-center justify-between">
                <span 
                  className="text-sm font-bold"
                  style={{ color: condition.color }}
                >
                  From {condition.price}
                </span>
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1"
                  style={{ background: `${condition.color}20` }}
                >
                  <ArrowRight className="h-3 w-3" style={{ color: condition.color }} />
                </div>
              </div>
            </div>
          </Link>
        </BlurFade>
      ))}
    </div>
  )
}
