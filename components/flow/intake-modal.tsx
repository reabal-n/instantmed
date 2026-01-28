"use client"

import { useState, useEffect, useCallback } from "react"
import { X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { FocusTrap } from "@/components/ui/focus-trap"

interface IntakeModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  hasUnsavedChanges?: boolean
}

export function IntakeModal({
  isOpen,
  onClose,
  children,
  title,
  hasUnsavedChanges = false,
}: IntakeModalProps) {
  const [showConfirmation, setShowConfirmation] = useState(false)

  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowConfirmation(true)
    } else {
      onClose()
    }
  }, [hasUnsavedChanges, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }

    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose()
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [isOpen, hasUnsavedChanges, handleClose])

  const confirmClose = () => {
    setShowConfirmation(false)
    onClose()
  }

  const cancelClose = () => {
    setShowConfirmation(false)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <FocusTrap active={isOpen} onEscape={handleClose}>
            <div className="fixed inset-0 z-[101] overflow-hidden">
              <div className="flex min-h-full items-center justify-center p-0 sm:p-4">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 20 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={cn(
                    "relative w-full bg-white dark:bg-slate-900 shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
                    "sm:max-w-2xl sm:rounded-2xl",
                    "h-full sm:h-auto sm:max-h-[90vh]",
                    "flex flex-col"
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                {/* Header */}
                {title && (
                  <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-white dark:bg-slate-900 px-6 py-4 sm:rounded-t-2xl">
                    <h2 className="text-lg font-semibold">{title}</h2>
                    <motion.button
                      onClick={handleClose}
                      className="rounded-lg p-2 hover:bg-muted transition-colors"
                      aria-label="Close modal"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      transition={{ duration: 0.3 }}
                    >
                      <X className="w-5 h-5" />
                    </motion.button>
                  </div>
                )}

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto">
                    {children}
                  </div>
                </motion.div>
              </div>
            </div>
          </FocusTrap>

          {/* Confirmation Dialog */}
          <AnimatePresence>
            {showConfirmation && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[102] bg-black/80"
                />
                <div className="fixed inset-0 z-[103] flex items-center justify-center p-4">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl"
                  >
                    <h3 className="text-lg font-semibold mb-2">
                      Close without saving?
                    </h3>
                    <p className="text-muted-foreground text-sm mb-6">
                      You have unsaved changes. Are you sure you want to close? Your
                      progress will be lost.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={cancelClose}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-border hover:bg-muted transition-colors font-medium"
                      >
                        Keep editing
                      </button>
                      <button
                        onClick={confirmClose}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-destructive text-white hover:bg-destructive/90 transition-colors font-medium"
                      >
                        Close anyway
                      </button>
                    </div>
                  </motion.div>
                </div>
              </>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  )
}

/**
 * Hook to manage intake modal state
 */
export function useIntakeModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [serviceType, setServiceType] = useState<string | null>(null)

  const openModal = (service: string) => {
    setServiceType(service)
    setIsOpen(true)
  }

  const closeModal = () => {
    setIsOpen(false)
    // Small delay before clearing service type for smooth animation
    setTimeout(() => setServiceType(null), 300)
  }

  return {
    isOpen,
    serviceType,
    openModal,
    closeModal,
  }
}
