"use client"

import { useState, useEffect } from "react"
import { motion, useReducedMotion } from "framer-motion"
import {
  ChevronDown,
  HelpCircle,
  CheckCircle2,
  Users,
  Share2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Confetti } from "@/components/ui/confetti"
import { IntakeStatusTracker } from "./intake-status-tracker"
import Link from "next/link"
import type { IntakeStatus } from "@/lib/data/intake-lifecycle"

// Stable options object — defined at module level to prevent new reference on each render
const CONFETTI_OPTIONS = { particleCount: 40 }

interface WhatHappensNextProps {
  intakeId: string
  initialStatus: IntakeStatus
  serviceName?: string
  patientEmail?: string
  isPriority?: boolean
  showConfetti?: boolean
  initialQueuePosition?: number | null
}

const FAQ_ITEMS = [
  {
    question: "How long does review take?",
    answer: "Most requests are reviewed within 30 minutes during business hours (8am–10pm AEST). Priority requests are reviewed within 15 minutes.",
  },
  {
    question: "What if the doctor needs more info?",
    answer: "They'll send you a message. You'll get an email notification, and you can respond right from your dashboard.",
  },
  {
    question: "What if my request isn't approved?",
    answer: "You get a full refund, no questions asked. The doctor will explain why and suggest next steps if appropriate.",
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
}: WhatHappensNextProps) {
  const prefersReducedMotion = useReducedMotion()
  const [confettiTrigger, setConfettiTrigger] = useState(false)
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)
  const [_currentStatus, setCurrentStatus] = useState<IntakeStatus>(initialStatus)
  const [queuePosition, setQueuePosition] = useState<number | null>(initialQueuePosition ?? null)
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
        // Non-critical — just don't show position
      }
    }
    fetchQueue()
  }, [intakeId])

  return (
    <>
      {showConfetti && <Confetti trigger={confettiTrigger} options={CONFETTI_OPTIONS} />}

      <div className="max-w-lg mx-auto space-y-6">
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
            className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500 flex items-center justify-center"
          >
            <CheckCircle2 className="w-8 h-8 text-white" />
          </motion.div>
          
          <h1 className="text-2xl font-semibold tracking-tight mb-2">Request submitted</h1>
          <p className="text-muted-foreground">
            {serviceName ? `Your ${serviceName.toLowerCase()} request is ` : "Your request is "}
            being reviewed by our doctors.
          </p>
          
          {/* Reassurance badge */}
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: prefersReducedMotion ? 0 : 0.4 }}
            className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
              Doctors are reviewing requests now
            </span>
          </motion.div>
        </motion.div>

        {/* Live status tracker */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: prefersReducedMotion ? 0 : 0.3 }}
        >
          <IntakeStatusTracker
            intakeId={intakeId}
            initialStatus={initialStatus}
            onStatusChange={setCurrentStatus}
          />
        </motion.div>

        {/* Queue position */}
        {queuePosition !== null && queuePosition > 0 && (
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: prefersReducedMotion ? 0 : 0.45 }}
          >
            <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
              <div className="shrink-0 h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Queue position: #{queuePosition}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {queuePosition <= 3
                    ? "You're near the front — should be reviewed very soon"
                    : `${queuePosition} requests ahead of yours`}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Referral prompt — highest-intent moment */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: prefersReducedMotion ? 0 : 0.5 }}
        >
          <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-border/50">
            <div className="flex items-start gap-3">
              <div className="shrink-0 h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <Share2 className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Know someone who needs this?</p>
                <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                  Share your referral link from your dashboard and you both get $5 credit
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="gap-2"
                >
                  <Link href="/patient">
                    <Share2 className="w-3.5 h-3.5" />
                    Get your referral link
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* FAQ accordion */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: prefersReducedMotion ? 0 : 0.55 }}
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
                      <motion.div
                        initial={prefersReducedMotion ? {} : { opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={prefersReducedMotion ? undefined : { opacity: 0, height: 0 }}
                        className="px-4 pb-4"
                      >
                        <p className="text-sm text-muted-foreground">{item.answer}</p>
                      </motion.div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: prefersReducedMotion ? 0 : 0.65 }}
          className="space-y-3"
        >
          <Button asChild size="lg" className="w-full">
            <Link href={`/patient/intakes/${intakeId}`}>
              View request details
            </Link>
          </Button>
          
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/patient">
              Go to dashboard
            </Link>
          </Button>
        </motion.div>

        {/* Support footer */}
        <motion.p
          initial={prefersReducedMotion ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: prefersReducedMotion ? 0 : 0.75 }}
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
