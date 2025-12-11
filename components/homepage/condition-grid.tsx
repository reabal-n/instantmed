"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { GlassCard } from "@/components/effects/glass-card"

interface Condition {
  id: string
  icon: string
  name: string
  tagline: string
  price: string
  href: string
  color: string
}

const conditions: Condition[] = [
  {
    id: "cold-flu",
    icon: "🤧",
    name: "Cold & Flu",
    tagline: "Feel like death? Get sorted.",
    price: "$24.95",
    href: "/prescriptions",
    color: "#06B6D4",
  },
  {
    id: "uti",
    icon: "🔥",
    name: "UTI",
    tagline: "Burning? Yeah, no thanks.",
    price: "$24.95",
    href: "/womens-health?condition=uti",
    color: "#EC4899",
  },
  {
    id: "blood-pressure",
    icon: "💊",
    name: "Blood Pressure",
    tagline: "Keep the ticker happy.",
    price: "$24.95",
    href: "/prescriptions",
    color: "#EF4444",
  },
  {
    id: "hair-loss",
    icon: "💇",
    name: "Hair Loss",
    tagline: "Fighting the fade.",
    price: "$24.95",
    href: "/mens-health?condition=hair-loss",
    color: "#8B5CF6",
  },
  {
    id: "weight-loss",
    icon: "⚖️",
    name: "Weight Loss",
    tagline: "Ozempic & friends.",
    price: "$149",
    href: "/weight-loss",
    color: "#10B981",
  },
  {
    id: "contraception",
    icon: "💊",
    name: "Contraception",
    tagline: "No surprises.",
    price: "$24.95",
    href: "/womens-health?condition=contraception",
    color: "#F472B6",
  },
  {
    id: "skin",
    icon: "🩹",
    name: "Skin Issues",
    tagline: "Rashes, acne, the works.",
    price: "$24.95",
    href: "/prescriptions",
    color: "#F59E0B",
  },
  {
    id: "sleep",
    icon: "😴",
    name: "Sleep",
    tagline: "Actually get some rest.",
    price: "$24.95",
    href: "/prescriptions",
    color: "#6366F1",
  },
  {
    id: "ed",
    icon: "💪",
    name: "Erectile Dysfunction",
    tagline: "Discreet. No judgement.",
    price: "$24.95",
    href: "/mens-health?condition=ed",
    color: "#3B82F6",
  },
  {
    id: "reflux",
    icon: "🔥",
    name: "Acid Reflux",
    tagline: "Tame the burn.",
    price: "$24.95",
    href: "/prescriptions",
    color: "#F97316",
  },
  {
    id: "allergies",
    icon: "🌸",
    name: "Allergies",
    tagline: "Stop the sniffles.",
    price: "$24.95",
    href: "/prescriptions",
    color: "#A855F7",
  },
  {
    id: "med-cert",
    icon: "📄",
    name: "Med Certificate",
    tagline: "Work or uni. Sorted.",
    price: "$19.95",
    href: "/medical-certificate",
    color: "#00E2B5",
  },
]

export function ConditionGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {conditions.map((condition, i) => (
        <Link key={condition.id} href={condition.href} className="group block">
          <GlassCard className={`p-5 h-full tilt-card animate-fade-in-up stagger-${Math.min(i + 1, 8)}`}>
            {/* Icon with hover animation */}
            <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">
              {condition.icon}
            </div>

            {/* Name */}
            <h3 className="font-semibold text-sm text-foreground mb-1">{condition.name}</h3>

            {/* Tagline */}
            <p className="text-xs text-muted-foreground leading-snug mb-4">{condition.tagline}</p>

            {/* Price + Arrow with accent color */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold font-mono" style={{ color: condition.color }}>
                {condition.price}
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-[#00E2B5] group-hover:translate-x-1 transition-all" />
            </div>
          </GlassCard>
        </Link>
      ))}
    </div>
  )
}
