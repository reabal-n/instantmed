"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { X, Save, ArrowRight, Mail, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"

interface ExitIntentPopupProps {
  /** Variant: 'discount' for marketing pages, 'save' for intake forms */
  variant?: 'discount' | 'save'
  /** Form data to save (for 'save' variant) */
  formData?: Record<string, unknown>
  /** Callback when user saves for later */
  onSaveForLater?: (email: string) => void
}

export function ExitIntentPopup({ 
  variant = 'discount',
  formData,
  onSaveForLater 
}: ExitIntentPopupProps) {
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
  const [hasShown, setHasShown] = useState(() => {
    if (typeof window === "undefined") return false
    return sessionStorage.getItem("exitIntentShown") === "true"
  })
  const [isVisible, setIsVisible] = useState(false)
  const [email, setEmail] = useState("")
  const [isSaved, setIsSaved] = useState(false)

  useEffect(() => {
    if (!isClient || hasShown) return
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !hasShown) {
        setIsVisible(true)
        setHasShown(true)
        sessionStorage.setItem("exitIntentShown", "true")
      }
    }

    document.addEventListener("mouseleave", handleMouseLeave)
    return () => document.removeEventListener("mouseleave", handleMouseLeave)
  }, [hasShown, isClient])

  const handleSaveForLater = () => {
    if (!email) return
    
    // Save form data to localStorage
    if (formData) {
      const savedData = {
        ...formData,
        savedEmail: email,
        savedAt: new Date().toISOString(),
      }
      localStorage.setItem("intake_saved_for_later", JSON.stringify(savedData))
    }
    
    onSaveForLater?.(email)
    setIsSaved(true)
    
    // Auto-close after 2 seconds
    setTimeout(() => setIsVisible(false), 2000)
  }

  if (!isVisible) return null

  // Save for later variant (for intake forms)
  if (variant === 'save') {
    return (
      <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsVisible(false)} />

        <div className="relative w-full max-w-md bg-card border rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <button
            onClick={() => setIsVisible(false)}
            className="absolute top-4 right-4 p-2 hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>

          {isSaved ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3">
                <Save className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Progress saved</h3>
              <p className="text-sm text-muted-foreground">
                We&apos;ll email you a link to continue where you left off.
              </p>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Save your progress?</h3>
                <p className="text-sm text-muted-foreground">
                  We&apos;ll save your answers so you can finish later.
                </p>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Button 
                  onClick={handleSaveForLater}
                  disabled={!email}
                  className="w-full"
                >
                  Save for later
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>

                <button
                  onClick={() => setIsVisible(false)}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  No thanks, I&apos;ll finish now
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // Discount variant (for marketing pages)
  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsVisible(false)} />

      <div className="relative w-full max-w-md bg-card border rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={() => setIsVisible(false)}
          className="absolute top-4 right-4 p-2 hover:bg-muted rounded-full transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Clock className="w-6 h-6 text-primary" />
          </div>

          <h3 className="text-lg font-semibold mb-1">
            Before you go...
          </h3>

          <p className="text-sm text-muted-foreground mb-6">
            Most requests are reviewed in under 30 minutes. No waiting rooms, no phone calls.
          </p>

          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link href="/medical-certificate">
                Get started
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>

            <button
              onClick={() => setIsVisible(false)}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
