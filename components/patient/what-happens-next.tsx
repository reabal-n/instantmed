"use client"

import { motion } from "framer-motion"
import {
  CheckCircle2,
  ChevronDown,
  HelpCircle,
  Users,
} from "lucide-react"
import Link from "next/link"
import { type ReactNode,useEffect,useState } from "react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Confetti } from "@/components/ui/confetti"
import { useReducedMotion } from "@/components/ui/motion"
import { QUEUE_DISPLAY_CAP, type WaitState } from "@/lib/brand/wait-counter-types"
import { buildPatientIntakeHref,PATIENT_DASHBOARD_HREF } from "@/lib/dashboard/routes"
import type { IntakeStatus } from "@/lib/data/intake-lifecycle"
import { GUARANTEE } from "@/lib/marketing/voice"
import { cn } from "@/lib/utils"

import { IntakeStatusTracker } from "./intake-status-tracker"

// Stable options object - defined at module level to prevent new reference on each render
const CONFETTI_OPTIONS = { particleCount: 40 }

interface WhatHappensNextProps {
  intakeId: string
  initialStatus: IntakeStatus
  serviceName?: string
  patientEmail?: string
  isPriority?: boolean
  showConfetti?: boolean
  initialQueuePosition?: number | null
  /**
   * Live wait-counter state (signature brand device #1, see docs/BRAND.md
   * §6.1). When provided, the queue card shows the median delivery time
   * alongside the queue position. Powers the "specificity is the brand
   * promise" rule (docs/BRAND.md §6.5).
   */
  waitState?: WaitState
  /**
   * Optional one-tap prompt rendered inside the confirmation beat, between the
   * success header and the primary CTAs. Used for the attribution survey: the
   * header ends with "you can close this tab", so anything below the status
   * tracker is effectively unseen (7 of 87 shown buyers answered in 30d at the
   * old page-bottom placement).
   */
  attributionSlot?: ReactNode
}

const FAQ_ITEMS = [
  {
    question: "How long does review take?",
    answer: "Requests can be submitted any time. Medical certificates are typically issued quickly, and prescriptions or consultations are reviewed when a doctor is available.",
  },
  {
    question: "What if the doctor needs more info?",
    answer: "They'll send you a message. You'll get an email notification, and you can respond right from your dashboard.",
  },
  {
    question: "What if my request isn't approved?",
    answer: `${GUARANTEE} The doctor will explain why and suggest next steps if appropriate.`,
  },
  {
    question: "How do I get my document?",
    answer: "Once approved, we'll email it to you and it'll be available in your dashboard to download anytime.",
  },
]

export function WhatHappensNext({
  intakeId,
  initialStatus,
  serviceName,
  patientEmail: _patientEmail,
  isPriority: _isPriority = false,
  showConfetti = false,
  initialQueuePosition,
  waitState,
  attributionSlot,
}: WhatHappensNextProps) {
  const prefersReducedMotion = useReducedMotion()
  const [confettiTrigger, setConfettiTrigger] = useState(false)
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)
  const [queuePosition, setQueuePosition] = useState<number | null>(initialQueuePosition ?? null)
  const isMedCert = serviceName?.toLowerCase().includes("cert") ?? false
  // Trigger confetti on mount
  useEffect(() => {
    if (showConfetti) {
      setTimeout(() => setConfettiTrigger(true), 300)
    }
  }, [showConfetti])

  // Fetch queue position estimate
  useEffect(() => {
    if (!intakeId) return
    async function fetchQueue() {
      try {
        const res = await fetch(`/api/queue/position?intake_id=${encodeURIComponent(intakeId)}`)
        const data = await res.json()
        if (data.position !== null && data.position !== undefined) {
          setQueuePosition(Number(data.position))
        }
      } catch {
        // Non-critical - just don't show position
      }
    }
    fetchQueue()
  }, [intakeId])

  return (
    <>
      {showConfetti && <Confetti trigger={confettiTrigger} options={CONFETTI_OPTIONS} />}

      <div className="max-w-lg mx-auto space-y-4">
        {/* Success header */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <motion.div
            initial={prefersReducedMotion ? {} : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "tween", ease: [0.22, 1, 0.36, 1], duration: 0.3, delay: prefersReducedMotion ? 0 : 0.2 }}
            className="w-16 h-16 mx-auto mb-4 rounded-full bg-success flex items-center justify-center"
          >
            <CheckCircle2 className="w-8 h-8 text-white" />
          </motion.div>
          
          <h1 className="text-2xl font-semibold tracking-tight mb-2">Request submitted</h1>
          <p className="text-muted-foreground">
            {isMedCert
              ? "Your certificate request has been received. We'll email it if approved."
              : serviceName
                ? `Your ${serviceName.toLowerCase()} request is being reviewed by our doctors.`
                : "Your request is being reviewed by our doctors."}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Check your junk or spam folder if you don't see the email later.
          </p>

          {/* Reassurance badge — live-status pulse (docs/BRAND.md §6.1). */}
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: prefersReducedMotion ? 0 : 0.4 }}
            className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-card border border-border/60 shadow-sm shadow-primary/[0.04]"
          >
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="motion-safe:animate-wait-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs font-medium text-foreground">
              {waitState?.medianMinutes
                ? `Average wait today: ~${waitState.medianMinutes} min`
                : isMedCert
                  ? "Delivered digitally if approved"
                  : "Doctors are reviewing requests now"}
            </span>
          </motion.div>

          {/* Close-this-tab reassurance (docs/BRAND.md §6.5).
              Specificity is the brand promise: tell patients explicitly that
              they don't need to keep this tab open. */}
          <p className="mt-3 text-xs text-muted-foreground">
            We&apos;ll email the moment it&apos;s ready. You can close this tab.
          </p>
        </motion.div>

        {/* Primary actions */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: prefersReducedMotion ? 0 : 0.3 }}
          className="space-y-2"
        >
          <Button asChild size="lg" className="w-full">
            <Link href={buildPatientIntakeHref(intakeId)}>
              View request details
            </Link>
          </Button>

          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href={PATIENT_DASHBOARD_HREF}>
              Go to dashboard
            </Link>
          </Button>
        </motion.div>

        {attributionSlot && (
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: prefersReducedMotion ? 0 : 0.32 }}
            className="rounded-xl border border-border/40 bg-muted/30 px-4 py-3.5"
          >
            {attributionSlot}
          </motion.div>
        )}

        {/* Live status tracker */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: prefersReducedMotion ? 0 : 0.35 }}
        >
          <IntakeStatusTracker
            initialStatus={initialStatus}
          />
        </motion.div>

        {/* Queue position — capped at 6+ per docs/BRAND.md §6.1 graceful
            degradation (uncapped numbers like "47 ahead" backfire). */}
        {queuePosition !== null && queuePosition > 0 && (
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: prefersReducedMotion ? 0 : 0.4 }}
          >
            <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
              <div className="shrink-0 h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">
                  {queuePosition >= QUEUE_DISPLAY_CAP
                    ? `${QUEUE_DISPLAY_CAP}+ in the queue`
                    : `Queue position: #${queuePosition}`}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {queuePosition <= 3
                    ? "You're near the front. Should be reviewed very soon."
                    : queuePosition >= QUEUE_DISPLAY_CAP
                      ? "Doctors are working through the queue now."
                      : `${queuePosition} requests ahead of yours`}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* FAQ accordion */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: prefersReducedMotion ? 0 : 0.45 }}
        >
          <Card className="overflow-hidden">
            <button
              onClick={() => setExpandedFaq(expandedFaq === -1 ? null : -1)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">Common questions</span>
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  expandedFaq !== null && "rotate-180"
                )}
              />
            </button>

            {expandedFaq !== null && (
              <div className="border-t">
                {FAQ_ITEMS.map((item, index) => (
                  <div key={index} className="border-b last:border-b-0">
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
                    >
                      <span className="text-sm font-medium">{item.question}</span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform shrink-0 ml-2",
                          expandedFaq === index && "rotate-180"
                        )}
                      />
                    </button>
                    {expandedFaq === index && (
                      <div className="px-4 pb-4">
                        <p className="text-sm text-muted-foreground">{item.answer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Support footer */}
        <motion.p
          initial={prefersReducedMotion ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: prefersReducedMotion ? 0 : 0.55 }}
          className="text-center text-xs text-muted-foreground"
        >
          Questions?{" "}
          <Link href="/contact" className="text-primary hover:underline">
            Contact support
          </Link>
          {" "}• Reference: {intakeId.slice(0, 8).toUpperCase()}
        </motion.p>
      </div>
    </>
  )
}
