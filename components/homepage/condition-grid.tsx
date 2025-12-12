"use client"

import { useRef } from "react"
import Link from "next/link"
import { ArrowRight, Sparkles } from "lucide-react"
import { motion, useInView } from "framer-motion"
import { MagneticGlow } from "@/components/effects/magnetic-button"

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

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
    },
  },
}

const itemVariants = {
  hidden: { 
    opacity: 0, 
    y: 20,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.4, 0.25, 1],
    },
  },
}

export function ConditionGrid() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.1 })

  return (
    <motion.div
      ref={ref}
      variants={containerVariants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
    >
      {conditions.map((condition) => (
        <motion.div key={condition.id} variants={itemVariants}>
          <Link href={condition.href} className="group block h-full">
            <MagneticGlow glowColor={`${condition.color}30`}>
              <motion.div 
                className="relative bg-white dark:bg-gray-800 rounded-2xl p-5 h-full shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
                whileHover={{ 
                  y: -4,
                  boxShadow: `0 20px 40px ${condition.color}20`,
                }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                {/* Popular badge */}
                {condition.popular && (
                  <motion.div
                    className="absolute top-2 right-2"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: "spring" }}
                  >
                    <div className="flex items-center gap-1 bg-gradient-to-r from-[#00E2B5] to-[#06B6D4] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      <Sparkles className="h-2.5 w-2.5" />
                      Popular
                    </div>
                  </motion.div>
                )}
                
                {/* Gradient accent line */}
                <motion.div 
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ background: `linear-gradient(90deg, ${condition.color}, ${condition.color}80)` }}
                  initial={{ scaleX: 0 }}
                  whileHover={{ scaleX: 1 }}
                  transition={{ duration: 0.3 }}
                />
                
                {/* Icon with color background */}
                <motion.div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 text-2xl"
                  style={{ background: `linear-gradient(135deg, ${condition.color}20, ${condition.color}10)` }}
                  whileHover={{ scale: 1.15, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  {condition.icon}
                </motion.div>

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
                  <motion.div 
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: `${condition.color}20` }}
                    initial={{ opacity: 0, x: -10 }}
                    whileHover={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <motion.div
                      animate={{ x: [0, 3, 0] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      <ArrowRight className="h-3 w-3" style={{ color: condition.color }} />
                    </motion.div>
                  </motion.div>
                </div>

                {/* Hover background glow */}
                <motion.div
                  className="absolute inset-0 rounded-2xl pointer-events-none"
                  style={{
                    background: `radial-gradient(circle at 50% 100%, ${condition.color}10, transparent 70%)`,
                  }}
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />
              </motion.div>
            </MagneticGlow>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  )
}
