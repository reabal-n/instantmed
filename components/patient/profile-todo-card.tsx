"use client"

import { AnimatePresence,motion } from "framer-motion"
import {
  CheckCircle2,
  ChevronRight,
  Circle,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react"

import { useReducedMotion } from "@/components/ui/motion"
import { cn } from "@/lib/utils"
import { validateAustralianAddress } from "@/lib/validation/australian-address"
import { validateAustralianPhone } from "@/lib/validation/australian-phone"
import { validateMedicareExpiry, validateMedicareNumber } from "@/lib/validation/medicare"
import type { AustralianState } from "@/types/db"

export interface ProfileData {
  profileId: string
  phone: string | null
  addressLine1: string | null
  suburb: string | null
  state: AustralianState | null
  postcode: string | null
  medicareNumber: string | null
  medicareIrn: number | null
  medicareExpiry: string | null
  consentMyhr: boolean
}

export type TodoDrawerType = "phone" | "address" | "medicare"

interface ProfileTodoCardProps {
  profileData: ProfileData
  onOpenDrawer: (type: TodoDrawerType) => void
  /** When true, hide entirely if all required fields (phone, address) are complete - for med-cert-only users who don't need Medicare */
  hideWhenMedCertOnlyComplete?: boolean
}

interface TodoItem {
  type: TodoDrawerType
  label: string
  description: string
  icon: typeof Phone
  isComplete: boolean
  isOptional?: boolean
  hint?: string
}

function hasCompletePhone(profile: ProfileData): boolean {
  return profile.phone ? validateAustralianPhone(profile.phone).valid : false
}

function hasCompleteAddress(profile: ProfileData): boolean {
  return validateAustralianAddress({
    addressLine1: profile.addressLine1 ?? undefined,
    suburb: profile.suburb ?? undefined,
    state: profile.state,
    postcode: profile.postcode ?? undefined,
  }).valid
}

function hasCompleteMedicare(profile: ProfileData): boolean {
  if (!profile.medicareNumber || !validateMedicareNumber(profile.medicareNumber).valid) {
    return false
  }

  const medicareIrn = profile.medicareIrn
  if (typeof medicareIrn !== "number" || !Number.isInteger(medicareIrn) || medicareIrn < 1 || medicareIrn > 9) {
    return false
  }

  return profile.medicareExpiry ? validateMedicareExpiry(profile.medicareExpiry).valid : true
}

export function getTodoItems(profile: ProfileData): TodoItem[] {
  const hasPhone = hasCompletePhone(profile)
  const hasAddress = hasCompleteAddress(profile)
  const hasMedicare = hasCompleteMedicare(profile)

  return [
    {
      type: "phone",
      label: "Phone number",
      description: "Required for prescriptions & consultations",
      icon: Phone,
      isComplete: hasPhone,
    },
    {
      type: "address",
      label: "Home address",
      description: "Required for prescriptions & referrals",
      icon: MapPin,
      isComplete: hasAddress,
    },
    {
      type: "medicare",
      label: "Medicare card",
      description: "Needed for prescriptions & referrals",
      icon: ShieldCheck,
      isComplete: hasMedicare,
      isOptional: true,
      hint: "Optional",
    },
  ]
}

export function ProfileTodoCard({ profileData, onOpenDrawer, hideWhenMedCertOnlyComplete }: ProfileTodoCardProps) {
  const prefersReducedMotion = useReducedMotion()
  const items = getTodoItems(profileData)
  const completedCount = items.filter((i) => i.isComplete).length
  const totalRequired = items.filter((i) => !i.isOptional).length
  const requiredComplete = items.filter((i) => !i.isOptional && i.isComplete).length
  const allRequiredDone = requiredComplete === totalRequired
  const allDone = completedCount === items.length

  // Hide when all required items are done (medicare is optional)
  if (allRequiredDone && items.find((i) => i.type === "medicare")?.isComplete) {
    return null
  }

  // Hide for med-cert-only users when phone + address are complete (Medicare not needed)
  if (hideWhenMedCertOnlyComplete && allRequiredDone) {
    return null
  }

  // Show condensed view when all required are done but medicare pending
  const isCondensed = allRequiredDone && !allDone

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={prefersReducedMotion ? {} : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={prefersReducedMotion ? undefined : { opacity: 0, y: -8, height: 0, marginBottom: 0 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.3, ease: "easeOut" }}
        className={cn(
          "bg-white dark:bg-card border border-border/50 dark:border-white/15",
          "shadow-sm shadow-primary/[0.04] dark:shadow-none rounded-xl overflow-hidden",
        )}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-semibold text-foreground">
              {isCondensed ? "One more thing" : "Complete your profile"}
            </h2>
            <span className="text-xs font-medium text-muted-foreground">
              {completedCount} of {items.length}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={prefersReducedMotion ? {} : { width: 0 }}
              animate={{ width: `${(completedCount / items.length) * 100}%` }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.3, ease: "easeOut", delay: prefersReducedMotion ? 0 : 0.15 }}
            />
          </div>
        </div>

        {/* Todo items */}
        <div className="px-3 pb-4">
          {items.map((item) => {
            // In condensed mode, only show incomplete items
            if (isCondensed && item.isComplete) return null

            const Icon = item.icon
            return (
              <button
                key={item.type}
                onClick={() => onOpenDrawer(item.type)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors text-left group",
                  item.isComplete
                    ? "opacity-60"
                    : "hover:bg-muted/50 cursor-pointer",
                )}
              >
                {/* Status icon */}
                {item.isComplete ? (
                  <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground/40 shrink-0" />
                )}

                {/* Item icon */}
                <div
                  className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                    item.isComplete
                      ? "bg-success-light"
                      : "bg-primary/8",
                  )}
                >
                  <Icon
                    className={cn(
                      "w-4 h-4",
                      item.isComplete
                        ? "text-success"
                        : "text-primary/70",
                    )}
                  />
                </div>

                {/* Label + description */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-sm font-medium",
                        item.isComplete
                          ? "line-through text-muted-foreground"
                          : "text-foreground",
                      )}
                    >
                      {item.label}
                    </span>
                    {item.hint && !item.isComplete && (
                      <span className="text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {item.hint}
                      </span>
                    )}
                  </div>
                  {!item.isComplete && (
                    <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                  )}
                </div>

                {/* Arrow */}
                {!item.isComplete && (
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
                )}
              </button>
            )
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
