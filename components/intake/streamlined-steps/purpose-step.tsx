"use client"

import { motion, useReducedMotion } from "framer-motion"
import { Button } from "@/components/uix"
import { Briefcase, GraduationCap, Heart, ChevronRight, Info } from "lucide-react"
import { SelectCard, staggerChildren, childFade, fadeSlide } from "../intake-ui-primitives"
import type { IntakeFormData } from "../streamlined-intake"

interface PurposeStepProps {
  formData: IntakeFormData
  errors: Record<string, string>
  onUpdateField: <K extends keyof IntakeFormData>(field: K, value: IntakeFormData[K]) => void
  onNext: () => void
}

export function PurposeStep({ formData, errors, onUpdateField, onNext }: PurposeStepProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      key="purpose"
      variants={prefersReducedMotion ? undefined : fadeSlide}
      initial={prefersReducedMotion ? false : "initial"}
      animate="animate"
      exit={prefersReducedMotion ? undefined : "exit"}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">
          What do you need?
        </h1>
        <p className="text-muted-foreground">
          Select the type of medical certificate you need
        </p>
      </div>

      <motion.div variants={staggerChildren} className="space-y-3">
        <motion.div variants={childFade}>
          <SelectCard
            selected={formData.certType === "work"}
            onClick={() => onUpdateField("certType", "work")}
            icon={Briefcase}
            title="Work absence"
            description="For your employer - sick leave, personal leave"
          />
        </motion.div>
        <motion.div variants={childFade}>
          <SelectCard
            selected={formData.certType === "uni"}
            onClick={() => onUpdateField("certType", "uni")}
            icon={GraduationCap}
            title="University/School"
            description="For educational institutions - exams, assignments"
          />
        </motion.div>
        <motion.div variants={childFade}>
          <SelectCard
            selected={formData.certType === "carer"}
            onClick={() => onUpdateField("certType", "carer")}
            icon={Heart}
            title="Carer's leave"
            description="To care for an ill family member"
          />
        </motion.div>

        {formData.certType === "carer" && (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="p-4 rounded-2xl bg-dawn-50/80 dark:bg-dawn-500/20 backdrop-blur-xl border border-dawn-200/50 dark:border-dawn-800/30 shadow-[0_4px_16px_rgb(245,158,11,0.15)] text-sm"
          >
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-dawn-600 shrink-0 mt-0.5" />
              <div className="space-y-2 text-dawn-800">
                <p className="font-medium">Carer&apos;s Leave Certificate Requirements</p>
                <ul className="text-xs space-y-1 text-dawn-700">
                  <li>• You&apos;ll need to provide the name and relationship of the person you&apos;re caring for</li>
                  <li>• The certificate confirms you need time off to care for an immediate family member or household member</li>
                  <li>• No medical details about the person being cared for will be included</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {errors.certType && (
        <p className="text-sm text-destructive text-center">{errors.certType}</p>
      )}

      <Button
        onClick={onNext}
        disabled={!formData.certType}
        className="w-full h-12 rounded-full bg-linear-to-r from-primary-500 to-primary-600 text-white shadow-[0_8px_30px_rgb(59,130,246,0.3)] hover:shadow-[0_12px_40px_rgb(59,130,246,0.4)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 text-base font-medium"
      >
        Continue
        <ChevronRight className="w-5 h-5 ml-1" />
      </Button>
    </motion.div>
  )
}
