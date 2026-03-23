"use client"

import { Button } from "@/components/ui/button"
import { Stethoscope, RotateCcw, X } from "lucide-react"
import { ChatProgress } from "@/components/chat/chat-progress"
import { useChatIntakeContext } from "@/components/chat/chat-intake-context"

interface ChatHeaderProps {
  onClose: () => void
}

export function ChatHeader({ onClose }: ChatHeaderProps) {
  const {
    handleReset,
    serviceType,
    messages,
    currentStep,
    totalSteps,
    stepLabels,
  } = useChatIntakeContext()

  return (
    <div className="border-b bg-primary text-primary-foreground">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Stethoscope className="w-5 h-5" />
          <span className="font-semibold">InstantMed Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReset}
            aria-label="Start new conversation"
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close chat"
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
      {/* Progress indicator */}
      {serviceType && messages.length > 1 && (
        <div className="px-4 pb-2">
          <ChatProgress
            currentStep={currentStep}
            totalSteps={totalSteps}
            labels={stepLabels}
          />
        </div>
      )}
    </div>
  )
}
