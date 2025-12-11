"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface StickyFooterProps {
  children: React.ReactNode
  className?: string
}

export function StickyFooter({ children, className }: StickyFooterProps) {
  const [keyboardVisible, setKeyboardVisible] = useState(false)

  useEffect(() => {
    // Detect virtual keyboard on mobile
    const handleResize = () => {
      // If viewport height shrinks significantly, keyboard is likely open
      const isKeyboardOpen = window.visualViewport ? window.visualViewport.height < window.innerHeight * 0.75 : false
      setKeyboardVisible(isKeyboardOpen)
    }

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResize)
      return () => window.visualViewport?.removeEventListener("resize", handleResize)
    }
  }, [])

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40",
        "bg-background/95 backdrop-blur-lg border-t border-border",
        "px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]",
        "transition-transform duration-200",
        keyboardVisible && "translate-y-0", // Stay visible above keyboard
        className,
      )}
    >
      <div className="max-w-md mx-auto">{children}</div>
    </div>
  )
}
