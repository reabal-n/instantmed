"use client"

import { useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { FocusTrap } from "./focus-trap"
import { useKeyboardShortcuts } from "./keyboard-shortcuts"

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  description?: string
  className?: string
  /** Prevent closing on backdrop click */
  preventClose?: boolean
  /** Show close button */
  showCloseButton?: boolean
}

/**
 * BottomSheet - Mobile-friendly modal component
 * Slides up from bottom on mobile, centered modal on desktop
 */
export function BottomSheet({
  open,
  onClose,
  children,
  title,
  description,
  className,
  preventClose = false,
  showCloseButton = true,
}: BottomSheetProps) {
  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  // Keyboard shortcuts: Escape to close
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: "Escape",
        handler: () => {
          if (!preventClose) onClose()
        },
        preventDefault: true,
      },
    ],
    enabled: open && !preventClose,
  })

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={preventClose ? undefined : onClose}
            aria-hidden="true"
          />

          {/* Sheet */}
          <FocusTrap active={open} onEscape={preventClose ? undefined : onClose}>
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{
                type: "spring",
                damping: 30,
                stiffness: 200,
              }}
              className={cn(
                "fixed bottom-0 left-0 right-0 z-50",
                "md:bottom-auto md:left-1/2 md:right-auto md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2",
                "md:max-w-lg md:w-full md:max-h-[90vh]",
                "bg-background rounded-t-3xl md:rounded-3xl",
                "shadow-2xl",
                "safe-bottom md:safe-bottom-0",
                className
              )}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? "bottom-sheet-title" : undefined}
              aria-describedby={description ? "bottom-sheet-description" : undefined}
            >
            {/* Handle bar (mobile only) */}
            <div className="md:hidden flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
            </div>

            {/* Header */}
            {(title || description || showCloseButton) && (
              <div className="flex items-start justify-between px-6 pt-4 pb-2 md:pt-6">
                <div className="flex-1">
                  {title && (
                    <h2
                      id="bottom-sheet-title"
                      className="text-xl font-semibold text-foreground"
                    >
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p
                      id="bottom-sheet-description"
                      className="text-sm text-muted-foreground mt-1"
                    >
                      {description}
                    </p>
                  )}
                </div>
                {showCloseButton && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="ml-4 -mt-2 -mr-2"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="px-6 pb-6 md:pb-6 overflow-y-auto max-h-[calc(100vh-200px)] md:max-h-[calc(90vh-100px)]">
              {children}
            </div>
            </motion.div>
          </FocusTrap>
        </>
      )}
    </AnimatePresence>
  )
}

