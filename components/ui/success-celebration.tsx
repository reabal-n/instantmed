"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Check, ChevronDown, Clock, Mail, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { Confetti } from "@/components/ui/confetti"
import { Button } from "@/components/ui/button"
import { SUCCESS, TIME, BUTTONS } from "@/lib/microcopy/style-guide"
import Link from "next/link"

interface SuccessCelebrationProps {
  type?: "request" | "payment" | "account"
  requestId?: string
  showConfetti?: boolean
}

export function SuccessCelebration({ type = "request", requestId, showConfetti = false }: SuccessCelebrationProps) {
  const [confettiTrigger, setConfettiTrigger] = useState(false)
  // Initialize showContent based on showConfetti prop
  const [showContent, setShowContent] = useState(!showConfetti)
  const [expandedFaq, setExpandedFaq] = useState(false)

  useEffect(() => {
    if (!showConfetti) return
    
    const t1 = setTimeout(() => setConfettiTrigger(true), 100)
    const t2 = setTimeout(() => setShowContent(true), 300)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [showConfetti])

  const content = type === "request" ? SUCCESS.requestSubmitted : SUCCESS.requestSubmitted

  return (
    <>
      {showConfetti && <Confetti trigger={confettiTrigger} duration={1500} particleCount={30} />}

      <div className="max-w-md mx-auto text-center">
        {/* Animated checkmark */}
        <div
          className={cn(
            "w-20 h-20 mx-auto mb-6 rounded-full bg-green-500 flex items-center justify-center transition-all duration-500",
            showContent ? "scale-100 opacity-100" : "scale-50 opacity-0",
          )}
        >
          <Check className="w-10 h-10 text-white" strokeWidth={3} />
        </div>

        {/* Title */}
        <h1
          className={cn(
            "text-2xl font-bold text-foreground mb-2 transition-all duration-500 delay-100",
            showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
          )}
        >
          {content.title}
        </h1>

        {/* Body */}
        <p
          className={cn(
            "text-muted-foreground mb-8 transition-all duration-500 delay-200",
            showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
          )}
        >
          {content.body}
        </p>

        {/* Timeline cards */}
        <div
          className={cn(
            "space-y-3 mb-8 transition-all duration-500 delay-300",
            showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
          )}
        >
          <TimelineCard
            icon={<Clock className="w-4 h-4" />}
            title="Expected turnaround"
            subtitle={TIME.turnaroundLong}
            status="active"
          />
          <TimelineCard
            icon={<Mail className="w-4 h-4" />}
            title="We'll email you"
            subtitle="When your document is ready"
          />
          <TimelineCard
            icon={<FileText className="w-4 h-4" />}
            title="Download anytime"
            subtitle="From your dashboard"
          />
        </div>

        {/* What happens next accordion */}
        <div
          className={cn(
            "mb-8 transition-all duration-500 delay-400",
            showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
          )}
        >
          <button
            onClick={() => setExpandedFaq(!expandedFaq)}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-left"
          >
            <span className="font-medium text-sm">What happens next?</span>
            <ChevronDown
              className={cn("w-4 h-4 text-muted-foreground transition-transform", expandedFaq && "rotate-180")}
            />
          </button>

          {expandedFaq && (
            <div className="mt-2 p-4 rounded-xl bg-muted/30 text-left text-sm text-muted-foreground space-y-3">
              <p>
                <strong>1. Doctor review</strong> — A registered GP will look over your request and make a clinical
                decision.
              </p>
              <p>
                <strong>2. Might need more info</strong> — Occasionally the doctor may message you if they need
                clarification.
              </p>
              <p>
                <strong>3. Document ready</strong> — Once approved, you&apos;ll get an email with your document attached.
                Download it anytime from your dashboard.
              </p>
              <p>
                <strong>4. Not approved?</strong> — If the doctor can&apos;t approve your request, you&apos;ll get a full refund
                and an explanation.
              </p>
            </div>
          )}
        </div>

        {/* CTA */}
        <div
          className={cn(
            "space-y-3 transition-all duration-500 delay-500",
            showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
          )}
        >
          <Button asChild size="lg" className="w-full">
            <Link href="/patient">Go to Dashboard</Link>
          </Button>
          {requestId && (
            <Button asChild variant="outline" size="lg" className="w-full">
              <Link href={`/patient/requests/${requestId}`}>{BUTTONS.viewRequest}</Link>
            </Button>
          )}
        </div>
      </div>
    </>
  )
}

interface TimelineCardProps {
  icon: React.ReactNode
  title: string
  subtitle: string
  status?: "active" | "pending" | "complete"
}

function TimelineCard({ icon, title, subtitle, status = "pending" }: TimelineCardProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border text-left transition-colors",
        status === "active" && "border-primary/30 bg-primary/5",
        status === "pending" && "border-border/50 bg-card/50",
        status === "complete" && "border-green-500/30 bg-green-500/5",
      )}
    >
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center",
          status === "active" && "bg-primary/10 text-primary",
          status === "pending" && "bg-muted text-muted-foreground",
          status === "complete" && "bg-green-500/10 text-green-600",
        )}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  )
}
