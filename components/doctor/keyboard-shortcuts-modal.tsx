"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Keyboard, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DOCTOR_SHORTCUTS } from "@/hooks/use-doctor-shortcuts"
import { cn } from "@/lib/utils"

interface KeyboardShortcutsModalProps {
  trigger?: React.ReactNode
  className?: string
}

/**
 * Keyboard Shortcuts Help Modal
 * 
 * Shows all available keyboard shortcuts for doctors.
 * Can be triggered by:
 * - ⌘/Ctrl + ? (question mark)
 * - Clicking the keyboard icon button
 */
export function KeyboardShortcutsModal({ trigger, className }: KeyboardShortcutsModalProps) {
  const [open, setOpen] = useState(false)
  const isMac = typeof window !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0

  // Listen for ⌘/Ctrl + ? to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "?") {
        e.preventDefault()
        setOpen(true)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Replace ⌘ with Ctrl for non-Mac
  const formatKey = (key: string) => {
    if (key === "⌘" && !isMac) return "Ctrl"
    return key
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="ghost"
            size="sm"
            className={cn("gap-2 text-muted-foreground hover:text-foreground", className)}
          >
            <Keyboard className="h-4 w-4" />
            <span className="hidden sm:inline">Shortcuts</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded">
              {isMac ? "⌘" : "Ctrl"}+?
            </kbd>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Speed up your workflow with these shortcuts.
          </p>
          
          <div className="space-y-1">
            {DOCTOR_SHORTCUTS.map((shortcut, index) => (
              <motion.div
                key={shortcut.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">{shortcut.label}</p>
                  <p className="text-xs text-muted-foreground">{shortcut.description}</p>
                </div>
                <div className="flex items-center gap-1">
                  {shortcut.keys.map((key, keyIndex) => (
                    <span key={keyIndex}>
                      <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-xs font-mono bg-muted border border-border rounded shadow-sm">
                        {formatKey(key)}
                      </kbd>
                      {keyIndex < shortcut.keys.length - 1 && (
                        <span className="mx-0.5 text-muted-foreground">+</span>
                      )}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Shortcuts are disabled when typing in text fields.
              Press <kbd className="px-1 py-0.5 text-[10px] bg-muted rounded">Esc</kbd> to close dialogs.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Floating shortcut hint that appears on first visit
 */
export function ShortcutDiscoveryHint() {
  const [show, setShow] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const isMac = typeof window !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0

  useEffect(() => {
    // Check if user has seen this hint before
    const hasSeen = localStorage.getItem("doctor_shortcuts_hint_seen")
    if (!hasSeen) {
      // Show after a short delay
      const timer = setTimeout(() => setShow(true), 3000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem("doctor_shortcuts_hint_seen", "true")
    setTimeout(() => setShow(false), 300)
  }

  if (!show) return null

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          className="fixed bottom-20 right-4 z-50 max-w-xs"
        >
          <div className="bg-card border border-border rounded-xl shadow-lg p-4">
            <button
              onClick={handleDismiss}
              className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
            
            <div className="flex items-start gap-3 pr-6">
              <div className="p-2 rounded-lg bg-primary/10">
                <Keyboard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Keyboard shortcuts available</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Press{" "}
                  <kbd className="px-1 py-0.5 text-[10px] bg-muted rounded">
                    {isMac ? "⌘" : "Ctrl"}+?
                  </kbd>{" "}
                  to see all shortcuts
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
