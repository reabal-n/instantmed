"use client"

import * as React from "react"
import { Lora } from "next/font/google"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { lumenDurations, lumenEasing } from "@/components/ui/motion"
import { X } from "lucide-react"

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  weight: ["400", "600", "700"],
})

export interface LumenModalProps {
  children: React.ReactNode
  /** Control visibility */
  isOpen: boolean
  /** Close handler */
  onClose: () => void
  /** Modal title */
  title?: string
  /** Modal description */
  description?: string
  /** Modal size */
  size?: "sm" | "md" | "lg" | "xl" | "full"
  /** Show close button */
  showCloseButton?: boolean
  /** Close on backdrop click */
  closeOnBackdrop?: boolean
  /** Additional class for modal content */
  className?: string
}

const sizeStyles = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-[90vw] max-h-[90vh]",
}

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: {
      duration: lumenDurations.normal,
      ease: lumenEasing.gentle,
    },
  },
  exit: { 
    opacity: 0,
    transition: {
      duration: lumenDurations.fast,
    },
  },
}

const modalVariants = {
  hidden: { 
    opacity: 0, 
    scale: 0.98,
    y: 8,
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: {
      duration: lumenDurations.slow,
      ease: lumenEasing.gentle,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    y: 8,
    transition: { 
      duration: lumenDurations.fast,
    },
  },
}

export function LumenModal({
  children,
  isOpen,
  onClose,
  title,
  description,
  size = "md",
  showCloseButton = true,
  closeOnBackdrop = true,
  className,
}: LumenModalProps) {
  // Close on escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [isOpen, onClose])

  // Lock body scroll when open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div className={cn("fixed inset-0 z-50 flex items-center justify-center p-4", lora.variable)}>
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={closeOnBackdrop ? onClose : undefined}
            aria-hidden="true"
          />
          
          {/* Modal */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? "modal-title" : undefined}
            aria-describedby={description ? "modal-description" : undefined}
            className={cn(
              // Base styles
              "relative w-full",
              sizeStyles[size],
              // Lumen Glass elevated surface
              "bg-white/90 dark:bg-white/10",
              "backdrop-blur-2xl",
              "border border-sky-300/45 dark:border-white/15",
              "rounded-3xl",
              "shadow-[0_20px_60px_rgba(197,221,240,0.30)]",
              // Padding
              "p-6",
              className
            )}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Close button */}
            {showCloseButton && (
              <button
                onClick={onClose}
                className={cn(
                  "absolute top-4 right-4",
                  "p-2 rounded-xl",
                  "text-muted-foreground hover:text-foreground",
                  "hover:bg-sky-100 dark:hover:bg-white/10",
                  "transition-colors duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dawn-300"
                )}
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {/* Header */}
            {(title || description) && (
              <div className="mb-4 pr-8">
                {title && (
                  <h2
                    id="modal-title"
                    className="text-xl font-serif font-semibold text-foreground"
                  >
                    {title}
                  </h2>
                )}
                {description && (
                  <p
                    id="modal-description"
                    className="mt-1 text-sm text-muted-foreground font-sans"
                  >
                    {description}
                  </p>
                )}
              </div>
            )}

            {/* Content */}
            <div className="font-sans">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
