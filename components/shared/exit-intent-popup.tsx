"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { X, Save, ArrowRight, Mail, Clock, Star, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { getAvailabilityMessage } from "@/lib/time-of-day"

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
                <Input
                  type="email"
                  placeholder="Your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  startContent={<Mail className="w-4 h-4 text-muted-foreground" />}
                />
                
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
  const availability = getAvailabilityMessage()
  
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
          {/* Time-aware status */}
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-4 ${
            availability.isActive 
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
          }`}>
            {availability.isActive && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            )}
            <span>{availability.message}</span>
          </div>

          <h3 className="text-lg font-semibold mb-2">
            Still thinking about it?
          </h3>

          <p className="text-sm text-muted-foreground mb-4">
            Most requests are reviewed within 45 minutes. AHPRA-registered doctors, 7 days a week.
          </p>
          
          {/* Mini testimonial */}
          <div className="bg-muted/30 rounded-xl p-4 mb-5 text-left">
            <div className="flex gap-0.5 mb-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="text-sm text-foreground italic mb-2">
              &quot;Had it sorted in about 40 minutes. My employer accepted it without any questions.&quot;
            </p>
            <p className="text-xs text-muted-foreground">Sarah M., Sydney</p>
          </div>

          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link href="/start?service=med-cert">
                Get started
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
            
            {/* Trust signal */}
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
              <Shield className="w-3 h-3" />
              Full refund if we can&apos;t help
            </p>

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
