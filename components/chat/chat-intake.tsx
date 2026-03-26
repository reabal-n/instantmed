"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { ChatIntakeProvider } from "@/components/chat/chat-intake-context"
import { ChatHeader } from "@/components/chat/chat-header"
import { ChatMessages } from "@/components/chat/chat-messages"
import { ChatInputForm } from "@/components/chat/chat-input-form"
import { ChatBubblePrompts } from "@/components/chat/chat-bubble-prompts"
import { ChatRedirectOverlay } from "@/components/chat/chat-redirect-overlay"

export function ChatIntake({
  isOpen,
  onClose,
  onComplete,
}: {
  isOpen: boolean
  onClose: () => void
  onComplete?: (data: Record<string, unknown>) => void
}) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <ChatIntakeProvider isOpen={isOpen} onClose={onClose} onComplete={onComplete}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
            className={cn(
              "fixed bottom-20 right-4 z-50",
              "w-[380px] max-w-[calc(100vw-2rem)]",
              "bg-background border border-border rounded-2xl shadow-2xl",
              "flex flex-col overflow-hidden",
              "max-h-[600px]"
            )}
          >
            <ChatHeader onClose={onClose} />
            <ChatRedirectOverlay />
            <ChatMessages />
            <ChatInputForm />
          </motion.div>
        )}
      </AnimatePresence>
    </ChatIntakeProvider>
  )
}

export function ChatIntakeButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <ChatBubblePrompts
        isOpen={isOpen}
        onOpenChat={() => setIsOpen(true)}
      />

      {/* Chat window */}
      <ChatIntake
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onComplete={(data) => {
          const serviceType = data.service_type as string
          const encodedData = btoa(JSON.stringify(data))
          const prefillParam = `?prefill=${encodeURIComponent(encodedData)}`

          if (serviceType === "med_cert") {
            window.location.href = `/medical-certificate/request${prefillParam}`
          } else if (serviceType === "repeat_rx") {
            window.location.href = `/prescriptions/repeat${prefillParam}`
          } else if (serviceType === "consult") {
            window.location.href = `/consult${prefillParam}`
          }
          setIsOpen(false)
        }}
      />
    </>
  )
}
