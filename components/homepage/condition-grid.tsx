"use client"

import { useRef } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { motion, useInView } from "framer-motion"

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
    tagline: "For when you're actually sick.",
    price: "$29",
    href: "/medical-certificate",
    color: "#2563EB",
    popular: true,
  },
  {
    id: "weight-loss",
    icon: "⚖️",
    name: "Weight Loss",
    tagline: "Doctor-led weight management support.",
    price: "$149",
    href: "/weight-loss",
    color: "#10B981",
    popular: true,
  },
  {
    id: "cold-flu",
    icon: "🤧",
    name: "Cold & Flu",
    tagline: "Feeling like garbage? Same.",
    price: "$39",
    href: "/prescriptions",
    color: "#4f46e5",
  },
  {
    id: "uti",
    icon: "🔥",
    name: "UTI",
    tagline: "You know the feeling. Let's fix it.",
    price: "$39",
    href: "/womens-health?condition=uti",
    color: "#EC4899",
  },
  {
    id: "blood-pressure",
    icon: "💊",
    name: "Blood Pressure",
    tagline: "Keep the numbers where they should be.",
    price: "$39",
    href: "/prescriptions",
    color: "#EF4444",
  },
  {
    id: "hair-loss",
    icon: "💇",
    name: "Hair Loss",
    tagline: "Fighting the inevitable.",
    price: "$39",
    href: "/mens-health?condition=hair-loss",
    color: "#4f46e5",
  },
  {
    id: "contraception",
    icon: "💊",
    name: "Contraception",
    tagline: "Planning ahead.",
    price: "$39",
    href: "/womens-health?condition=contraception",
    color: "#F472B6",
  },
  {
    id: "skin",
    icon: "🩹",
    name: "Skin Issues",
    tagline: "Rashes, acne, mystery bumps.",
    price: "$39",
    href: "/prescriptions",
    color: "#F59E0B",
  },
  {
    id: "sleep",
    icon: "😴",
    name: "Sleep",
    tagline: "For when counting sheep isn't cutting it.",
    price: "$39",
    href: "/prescriptions",
    color: "#6366F1",
  },
  {
    id: "ed",
    icon: "💪",
    name: "Erectile Dysfunction",
    tagline: "Discreet. No awkward chats.",
    price: "$39",
    href: "/mens-health?condition=ed",
    color: "#3B82F6",
  },
  {
    id: "reflux",
    icon: "🔥",
    name: "Acid Reflux",
    tagline: "Regret that second coffee.",
    price: "$39",
    href: "/prescriptions",
    color: "#F97316",
  },
  {
    id: "allergies",
    icon: "🌸",
    name: "Allergies",
    tagline: "Spring can wait.",
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
      ease: [0.25, 0.4, 0.25, 1] as const,
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
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5"
    >
      {conditions.map((condition) => (
        <motion.div key={condition.id} variants={itemVariants}>
          <Link href={condition.href} className="group block h-full">
            <motion.div 
              className="glass-card relative rounded-2xl p-5 h-full overflow-hidden"
              whileHover={{ 
                y: -6,
                transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
              }}
              style={{
                boxShadow: `0 4px 24px ${condition.color}15`,
              }}
            >
              {/* Outer glow on hover */}
              <motion.div
                className="absolute -inset-[1px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                  background: `linear-gradient(135deg, ${condition.color}40, transparent 60%)`,
                  filter: 'blur(8px)',
                }}
              />
              
              {/* Popular badge */}
              {condition.popular && (
                <motion.div
                  className="absolute top-3 right-3 z-10"
                  initial={{ scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, duration: 0.15, ease: "easeOut" }}
                >
                  <div 
                    className="text-[10px] font-bold px-2.5 py-1 rounded-full text-white shadow-lg"
                    style={{ 
                      background: `linear-gradient(135deg, ${condition.color}, ${condition.color}cc)`,
                      boxShadow: `0 4px 12px ${condition.color}40`,
                    }}
                  >
                    Popular
                  </div>
                </motion.div>
              )}
              
              {/* Top accent gradient */}
              <div 
                className="absolute top-0 left-0 right-0 h-[2px] opacity-60 group-hover:opacity-100 transition-opacity"
                style={{ 
                  background: `linear-gradient(90deg, transparent, ${condition.color}, transparent)`,
                }}
              />
              
              {/* 3D Emoji icon */}
              <motion.div 
                className="relative w-14 h-14 rounded-2xl flex items-center justify-center mb-4 text-3xl"
                style={{ 
                  background: `linear-gradient(145deg, ${condition.color}20, ${condition.color}08)`,
                  boxShadow: `inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px ${condition.color}15`,
                }}
                whileHover={{ scale: 1.1, rotate: 3 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
              >
                <span className="drop-shadow-sm">{condition.icon}</span>
              </motion.div>

              {/* Name - using heading font */}
              <h3 className="font-heading font-semibold text-base text-foreground mb-1.5 tracking-tight">
                {condition.name}
              </h3>

              {/* Tagline */}
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                {condition.tagline}
              </p>

              {/* Price + Arrow */}
              <div className="flex items-center justify-between">
                <span 
                  className="text-base font-bold tracking-tight"
                  style={{ color: condition.color }}
                >
                  From {condition.price}
                </span>
                <motion.div 
                  className="w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
                  style={{ 
                    background: `linear-gradient(135deg, ${condition.color}30, ${condition.color}15)`,
                    boxShadow: `0 2px 8px ${condition.color}20`,
                  }}
                  initial={{ x: -8 }}
                  whileHover={{ x: 0 }}
                >
                  <ArrowRight className="h-4 w-4" style={{ color: condition.color }} />
                </motion.div>
              </div>

              {/* Bottom glow effect */}
              <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-16 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                  background: `radial-gradient(ellipse at center bottom, ${condition.color}20, transparent 70%)`,
                }}
              />
            </motion.div>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  )
}
