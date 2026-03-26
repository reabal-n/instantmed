"use client"

import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { Button } from "@/components/ui/button"
import { ChevronRight, RefreshCw, Pill } from "lucide-react"
import { SelectCard } from "@/components/intake/prescription-shared"
import type { PrescriptionFormData } from "@/components/intake/prescription-intake"

// Animation variants
const fadeSlide = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
}

const staggerChildren = {
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
}

const childFade = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
}

interface TypeStepProps {
  rxType: PrescriptionFormData["rxType"]
  error?: string
  onSelect: (type: "repeat" | "new") => void
  onNext: () => void
}

export function TypeStep({ rxType, error, onSelect, onNext }: TypeStepProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      key="type"
      variants={prefersReducedMotion ? undefined : fadeSlide}
      initial={prefersReducedMotion ? {} : "initial"}
      animate="animate"
      exit={prefersReducedMotion ? undefined : "exit"}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">
          What type of prescription?
        </h1>
        <p className="text-muted-foreground">
          Select whether this is a repeat or new prescription
        </p>
      </div>

      <motion.div variants={staggerChildren} className="space-y-3">
        <motion.div variants={childFade}>
          <SelectCard
            selected={rxType === "repeat"}
            onClick={() => onSelect("repeat")}
            icon={RefreshCw}
            title="Repeat prescription"
            description="I've been prescribed this medication before"
          />
        </motion.div>
        <motion.div variants={childFade}>
          <SelectCard
            selected={rxType === "new"}
            onClick={() => onSelect("new")}
            icon={Pill}
            title="New prescription"
            description="I need a new medication for a condition"
          />
        </motion.div>
      </motion.div>

      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}

      <Button
        onClick={onNext}
        disabled={!rxType}
        className="w-full h-12 rounded-full bg-linear-to-r from-primary-500 to-primary-600 text-white shadow-[0_8px_30px_rgb(59,130,246,0.3)] hover:shadow-[0_12px_40px_rgb(59,130,246,0.4)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 text-base font-medium"
      >
        Continue
        <ChevronRight className="w-5 h-5 ml-1" />
      </Button>
    </motion.div>
  )
}
