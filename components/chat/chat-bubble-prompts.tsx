"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { X, MessageCircle } from "lucide-react"

const CHAT_BUBBLE_DISMISSED_KEY = "instantmed_chat_bubble_dismissed"

const BUBBLE_PROMPTS = [
  "Need a hand?",
  "Quick question?",
  "How can I help?",
]

function loadBubbleDismissed(): boolean {
  if (typeof window === "undefined") return false
  try {
    return localStorage.getItem(CHAT_BUBBLE_DISMISSED_KEY) === "true"
  } catch {
    return false
  }
}

function saveBubbleDismissed(dismissed: boolean) {
  if (typeof window === "undefined") return
  try {
    if (dismissed) {
      localStorage.setItem(CHAT_BUBBLE_DISMISSED_KEY, "true")
    } else {
      localStorage.removeItem(CHAT_BUBBLE_DISMISSED_KEY)
    }
  } catch {
    // Ignore localStorage errors
  }
}

interface ChatBubblePromptsProps {
  isOpen: boolean
  onOpenChat: () => void
}

export function ChatBubblePrompts({ isOpen, onOpenChat }: ChatBubblePromptsProps) {
  const prefersReducedMotion = useReducedMotion()
  const [showBubble, setShowBubble] = useState(false)
  const [bubbleIndex, setBubbleIndex] = useState(0)
  const [bubbleDismissed, setBubbleDismissed] = useState(loadBubbleDismissed)

  // Show bubble after 3 seconds on page, hide after 10 seconds
  useEffect(() => {
    if (bubbleDismissed || isOpen) return

    const showTimer = setTimeout(() => {
      setShowBubble(true)
    }, 3000)

    const hideTimer = setTimeout(() => {
      setShowBubble(false)
    }, 13000)

    return () => {
      clearTimeout(showTimer)
      clearTimeout(hideTimer)
    }
  }, [bubbleDismissed, isOpen])

  // Rotate bubble text every 5 seconds while visible
  useEffect(() => {
    if (!showBubble) return

    const interval = setInterval(() => {
      setBubbleIndex((i) => (i + 1) % BUBBLE_PROMPTS.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [showBubble])

  const handleBubbleClick = () => {
    setShowBubble(false)
    setBubbleDismissed(true)
    saveBubbleDismissed(true)
    onOpenChat()
  }

  const handleBubbleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowBubble(false)
    setBubbleDismissed(true)
    saveBubbleDismissed(true)
  }

  const handleOpenClick = () => {
    setShowBubble(false)
    setBubbleDismissed(true)
    onOpenChat()
  }

  return (
    <>
      {/* Floating bubble prompt */}
      <AnimatePresence>
        {showBubble && !isOpen && (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
            className={cn(
              "fixed bottom-20 right-4 z-50",
              "bg-background border border-border rounded-2xl shadow-lg",
              "px-4 py-3 max-w-[200px]",
              "cursor-pointer group"
            )}
            onClick={handleBubbleClick}
            role="button"
            tabIndex={0}
            aria-label="Open chat assistant"
            onKeyDown={(e) => e.key === "Enter" && handleBubbleClick()}
          >
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <motion.p
                  key={bubbleIndex}
                  initial={prefersReducedMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm font-medium"
                >
                  {BUBBLE_PROMPTS[bubbleIndex]}
                </motion.p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Chat with our assistant
                </p>
              </div>
              <button
                onClick={handleBubbleDismiss}
                className="text-muted-foreground hover:text-foreground p-0.5 -mr-1 -mt-1"
                aria-label="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {/* Tail pointing to button */}
            <div className="absolute -bottom-2 right-6 w-4 h-4 bg-background border-b border-r border-border rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating button */}
      <motion.button
        onClick={handleOpenClick}
        className={cn(
          "fixed bottom-4 right-4 z-50",
          "w-14 h-14 rounded-full",
          "bg-primary text-primary-foreground shadow-lg",
          "flex items-center justify-center",
          "hover:shadow-xl",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
          "transition-shadow duration-200",
          isOpen && "hidden"
        )}
        whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
        whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
        aria-label="Open chat assistant"
      >
        <MessageCircle className="w-6 h-6" />
        {/* Subtle pulse indicator when bubble is showing */}
        {showBubble && (
          <motion.span
            className="absolute inset-0 rounded-full bg-primary"
            initial={prefersReducedMotion ? false : { opacity: 0.5, scale: 1 }}
            animate={prefersReducedMotion ? undefined : { opacity: 0, scale: 1.02 }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </motion.button>
    </>
  )
}
