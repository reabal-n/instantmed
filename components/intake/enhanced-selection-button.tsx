"use client"

import React from "react"
import { motion } from "framer-motion"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface EnhancedSelectionButtonProps {
  selected: boolean
  onClick: () => void
  children?: React.ReactNode
  className?: string
  variant?: "default" | "chip" | "card" | "option"
  icon?: React.ElementType
  label?: string
  description?: string
  gradient?: "blue-purple" | "purple-pink" | "teal-emerald" | "orange-red"
}

const gradientClasses = {
  "blue-purple": "from-blue-500 via-purple-500 to-pink-500",
  "purple-pink": "from-purple-500 via-pink-500 to-rose-500",
  "teal-emerald": "from-teal-400 via-emerald-500 to-green-500",
  "orange-red": "from-orange-400 via-red-500 to-pink-500",
}

export function EnhancedSelectionButton({
  selected,
  onClick,
  children,
  className,
  variant = "default",
  icon: Icon,
  label,
  description,
  gradient = "blue-purple",
}: EnhancedSelectionButtonProps) {
  const baseClasses = "relative transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
  
  const variantClasses = {
    chip: cn(
      "px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-medium",
      selected
        ? `bg-gradient-to-r ${gradientClasses[gradient]} text-white shadow-lg shadow-purple-500/30`
        : "bg-white border-2 border-gray-200 hover:border-purple-300 hover:shadow-md text-gray-700"
    ),
    card: cn(
      "w-full p-5 rounded-2xl border-2 text-left",
      selected
        ? `border-transparent bg-gradient-to-br ${gradientClasses[gradient]} text-white shadow-xl shadow-purple-500/20`
        : "border-gray-200 bg-white hover:border-purple-300 hover:shadow-lg text-gray-900"
    ),
    option: cn(
      "w-full p-4 min-h-[80px] rounded-xl border-2 flex items-center gap-4 text-left",
      selected
        ? `border-transparent bg-gradient-to-r ${gradientClasses[gradient]} text-white shadow-lg`
        : "border-gray-200 bg-white hover:border-purple-300 hover:shadow-md text-gray-900"
    ),
    default: cn(
      "px-4 py-2 rounded-lg",
      selected
        ? `bg-gradient-to-r ${gradientClasses[gradient]} text-white shadow-md`
        : "bg-gray-100 hover:bg-gray-200 text-gray-700"
    ),
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: variant === "chip" ? 1.02 : 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(baseClasses, variantClasses[variant], className)}
      aria-pressed={selected}
    >
      {variant === "option" && Icon && (
        <motion.div
          className={cn(
            "w-11 h-11 rounded-lg flex items-center justify-center shrink-0 transition-all",
            selected
              ? "bg-white/20 backdrop-blur-sm"
              : "bg-gray-100 text-gray-600"
          )}
          animate={{
            scale: selected ? [1, 1.1, 1] : 1,
          }}
          transition={{ duration: 0.3 }}
        >
          <Icon className="w-5 h-5" />
        </motion.div>
      )}

      {variant === "card" && Icon && (
        <motion.div
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center mb-2 transition-all",
            selected
              ? "bg-white/20 backdrop-blur-sm"
              : "bg-gray-100 text-gray-600"
          )}
          animate={{
            scale: selected ? [1, 1.1, 1] : 1,
          }}
          transition={{ duration: 0.3 }}
        >
          <Icon className="w-6 h-6" />
        </motion.div>
      )}

      <div className="flex-1 min-w-0">
        {label && (
          <div className="font-medium text-sm block mb-1">{label}</div>
        )}
        {description && (
          <div className="text-xs opacity-90">{description}</div>
        )}
        {!label && !description && children}
      </div>

      {selected && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 15,
            mass: 0.5,
          }}
          className={cn(
            "shrink-0",
            variant === "option" || variant === "card" ? "w-5 h-5" : "w-4 h-4"
          )}
        >
          <Check className={cn("w-full h-full", variant === "chip" && "text-white")} />
        </motion.div>
      )}

      {/* Animated background glow for selected state */}
      {selected && variant !== "chip" && (
        <motion.div
          className={cn(
            "absolute inset-0 rounded-xl bg-gradient-to-r opacity-20 blur-xl -z-10",
            gradientClasses[gradient]
          )}
          animate={{
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}
    </motion.button>
  )
}

