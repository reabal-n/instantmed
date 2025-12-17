"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { Check, X } from "lucide-react"

interface PasswordStrengthProps {
  password: string
  className?: string
}

interface PasswordRequirement {
  label: string
  test: (password: string) => boolean
}

const requirements: PasswordRequirement[] = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "Contains uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "Contains lowercase letter", test: (p) => /[a-z]/.test(p) },
  { label: "Contains a number", test: (p) => /[0-9]/.test(p) },
]

function getStrength(password: string): number {
  if (!password) return 0
  let strength = 0
  requirements.forEach((req) => {
    if (req.test(password)) strength++
  })
  return strength
}

function getStrengthLabel(strength: number): { label: string; color: string } {
  switch (strength) {
    case 0:
      return { label: "", color: "" }
    case 1:
      return { label: "Weak", color: "text-red-500" }
    case 2:
      return { label: "Fair", color: "text-orange-500" }
    case 3:
      return { label: "Good", color: "text-amber-500" }
    case 4:
      return { label: "Strong", color: "text-emerald-500" }
    default:
      return { label: "", color: "" }
  }
}

function getBarColor(strength: number, index: number): string {
  if (index >= strength) return "bg-muted"
  switch (strength) {
    case 1:
      return "bg-red-500"
    case 2:
      return "bg-orange-500"
    case 3:
      return "bg-amber-500"
    case 4:
      return "bg-emerald-500"
    default:
      return "bg-muted"
  }
}

export function PasswordStrength({ password, className }: PasswordStrengthProps) {
  const strength = useMemo(() => getStrength(password), [password])
  const { label, color } = getStrengthLabel(strength)

  if (!password) return null

  return (
    <div className={cn("space-y-3", className)}>
      {/* Strength bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Password strength</span>
          <span className={cn("text-xs font-medium transition-colors", color)}>
            {label}
          </span>
        </div>
        <div className="flex gap-1">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-all duration-300",
                getBarColor(strength, index),
                index < strength && "animate-[scale-in_0.2s_ease-out]"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            />
          ))}
        </div>
      </div>

      {/* Requirements checklist */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {requirements.map((req, index) => {
          const passed = req.test(password)
          return (
            <div
              key={index}
              className={cn(
                "flex items-center gap-1.5 text-xs transition-all duration-200",
                passed ? "text-emerald-600" : "text-muted-foreground"
              )}
            >
              <div
                className={cn(
                  "w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all duration-200",
                  passed
                    ? "bg-emerald-100 dark:bg-emerald-900/30"
                    : "bg-muted"
                )}
              >
                {passed ? (
                  <Check className="w-2.5 h-2.5" />
                ) : (
                  <X className="w-2.5 h-2.5" />
                )}
              </div>
              <span>{req.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function usePasswordStrength(password: string) {
  const strength = useMemo(() => getStrength(password), [password])
  const isValid = strength === requirements.length
  const { label, color } = getStrengthLabel(strength)
  
  return {
    strength,
    isValid,
    label,
    color,
    requirements: requirements.map((req) => ({
      ...req,
      passed: req.test(password),
    })),
  }
}
