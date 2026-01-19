"use client"

import dynamic from "next/dynamic"
import { useState } from "react"
import { MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Lazy load the full chat component
const ChatIntake = dynamic(
  () => import("./chat-intake").then(mod => ({ default: mod.ChatIntake })),
  { 
    ssr: false,
    loading: () => <ChatSkeleton />
  }
)

function ChatSkeleton() {
  return (
    <div className="fixed bottom-20 right-4 z-50 w-[380px] max-w-[calc(100vw-2rem)] bg-background border border-border rounded-2xl shadow-2xl overflow-hidden">
      <div className="h-14 bg-primary animate-pulse" />
      <div className="p-4 space-y-3 min-h-[300px]">
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
            <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
          </div>
        </div>
      </div>
      <div className="p-3 border-t">
        <div className="h-10 bg-muted rounded animate-pulse" />
      </div>
    </div>
  )
}

/**
 * Lazy-loaded chat button that only loads the full chat component when clicked
 * This reduces initial bundle size and improves page load time
 */
export function ChatIntakeButtonLazy() {
  const [isOpen, setIsOpen] = useState(false)
  const [shouldLoad, setShouldLoad] = useState(false)
  
  const handleOpen = () => {
    setShouldLoad(true) // Start loading the component
    setIsOpen(true)
  }
  
  return (
    <>
      {/* Only render ChatIntake after first click */}
      {shouldLoad && (
        <ChatIntake
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onComplete={(_data) => {
            setIsOpen(false)
          }}
        />
      )}
      
      {/* Floating action button - always rendered */}
      {!isOpen && (
        <Button
          onClick={handleOpen}
          size="lg"
          className={cn(
            "fixed bottom-4 right-4 z-50",
            "rounded-full w-14 h-14 p-0",
            "shadow-lg hover:shadow-xl transition-shadow"
          )}
          aria-label="Open chat assistant"
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      )}
    </>
  )
}
