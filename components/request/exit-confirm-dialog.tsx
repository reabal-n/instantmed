"use client"

import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { Button } from "@/components/ui/button"

interface ExitConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirmExit: () => void
}

export function ExitConfirmDialog({ open, onClose, onConfirmExit }: ExitConfirmDialogProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={prefersReducedMotion ? false : { scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-background rounded-xl p-6 max-w-sm w-full shadow-xl"
          >
            <h3 className="font-semibold text-lg mb-2">Leave this request?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Your progress has been saved as a draft. You can continue later.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={onClose}
              >
                Keep editing
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={onConfirmExit}
              >
                Leave
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
