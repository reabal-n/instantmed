"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface ProgressiveSectionProps {
  /** Section title */
  title: string
  /** Section content */
  children: React.ReactNode
  /** Whether section is open by default */
  defaultOpen?: boolean
  /** Optional description/subtitle */
  description?: string
  /** Custom className */
  className?: string
  /** Show border */
  bordered?: boolean
  /** Icon to show before title */
  icon?: React.ComponentType<{ className?: string }>
}

export function ProgressiveSection({
  title,
  children,
  defaultOpen = false,
  description,
  className,
  bordered = true,
  icon: Icon,
}: ProgressiveSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div
      className={cn(
        "transition-all duration-300",
        bordered && "border border-gray-200 rounded-xl overflow-hidden",
        className
      )}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full p-4 flex items-center justify-between",
          "hover:bg-gray-50 transition-colors duration-200",
          "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2",
          isOpen && "bg-gray-50/50"
        )}
        aria-expanded={isOpen}
        aria-controls={`progressive-section-${title}`}
      >
        <div className="flex items-center gap-3 flex-1 text-left">
          {Icon && (
            <Icon className="w-5 h-5 text-primary flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-foreground">{title}</h3>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id={`progressive-section-${title}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className={cn("p-4 pt-0", bordered && "border-t border-gray-200")}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface ProgressiveDisclosureProps {
  /** Label for the toggle button */
  label: string
  /** Content to show/hide */
  children: React.ReactNode
  /** Whether content is visible by default */
  defaultOpen?: boolean
  /** Button variant */
  variant?: "link" | "ghost" | "outline"
  /** Custom className */
  className?: string
}

export function ProgressiveDisclosure({
  label,
  children,
  defaultOpen = false,
  variant = "link",
  className,
}: ProgressiveDisclosureProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className={cn("space-y-4", className)}>
      <Button
        type="button"
        variant={variant}
        onClick={() => setIsOpen(!isOpen)}
        className="text-sm text-primary hover:text-primary/80"
      >
        {isOpen ? "Hide" : "Show"} {label}
        {isOpen ? (
          <ChevronUp className="w-4 h-4 ml-1" />
        ) : (
          <ChevronDown className="w-4 h-4 ml-1" />
        )}
      </Button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

