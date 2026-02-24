"use client"

import { motion, AnimatePresence } from "framer-motion"
import {
  Phone,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  Circle,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
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

function getTodoItems(profile: ProfileData): TodoItem[] {
  const hasPhone = Boolean(profile.phone)
  const hasAddress = Boolean(
    profile.addressLine1 && profile.suburb && profile.state && profile.postcode,
  )
  const hasMedicare = Boolean(profile.medicareNumber)

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

export function ProfileTodoCard({ profileData, onOpenDrawer }: ProfileTodoCardProps) {
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

  // Show condensed view when all required are done but medicare pending
  const isCondensed = allRequiredDone && !allDone

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8, height: 0, marginBottom: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="rounded-xl border border-border bg-gradient-to-br from-background to-muted/30 overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4">
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
              initial={{ width: 0 }}
              animate={{ width: `${(completedCount / items.length) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
            />
          </div>
        </div>

        {/* Todo items */}
        <div className="px-3 pb-3">
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
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground/40 shrink-0" />
                )}

                {/* Item icon */}
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                    item.isComplete
                      ? "bg-emerald-50 dark:bg-emerald-950/30"
                      : "bg-primary/5",
                  )}
                >
                  <Icon
                    className={cn(
                      "w-4 h-4",
                      item.isComplete
                        ? "text-emerald-600 dark:text-emerald-400"
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
                      <span className="text-[11px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
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
