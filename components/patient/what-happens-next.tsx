"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { 
  Mail, 
  FileText, 
  ChevronDown,
  HelpCircle,
  CheckCircle2,
  User,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Confetti } from "@/components/ui/confetti"
import { IntakeStatusTracker } from "./intake-status-tracker"
import Link from "next/link"
import type { IntakeStatus } from "@/lib/data/intake-lifecycle"

// Service-specific messaging for the success page
const SERVICE_MESSAGING: Record<string, { deliveryTitle: string; deliveryDescription: string; documentTitle: string; documentDescription: string }> = {
  "medical certificate": {
    deliveryTitle: "Certificate via email",
    deliveryDescription: "Your certificate will be emailed as a PDF once approved",
    documentTitle: "Download anytime",
    documentDescription: "Your certificate is always available in your dashboard",
  },
  "prescription": {
    deliveryTitle: "eScript via SMS & email",
    deliveryDescription: "Your eScript will be sent to your mobile and email once approved",
    documentTitle: "Use at any pharmacy",
    documentDescription: "Present your eScript token at any Australian pharmacy",
  },
  "repeat prescription": {
    deliveryTitle: "eScript via SMS & email",
    deliveryDescription: "Your eScript will be sent to your mobile and email once approved",
    documentTitle: "Use at any pharmacy",
    documentDescription: "Present your eScript token at any Australian pharmacy",
  },
  "consultation": {
    deliveryTitle: "Doctor follow-up",
    deliveryDescription: "Your doctor will contact you to discuss next steps",
    documentTitle: "Notes in your dashboard",
    documentDescription: "Consultation notes and any prescriptions will appear in your dashboard",
  },
}

function getServiceMessaging(serviceName?: string) {
  if (!serviceName) return null
  const key = serviceName.toLowerCase()
  return SERVICE_MESSAGING[key] || null
}

interface WhatHappensNextProps {
  intakeId: string
  initialStatus: IntakeStatus
  serviceName?: string
  patientEmail?: string
  isPriority?: boolean
  showConfetti?: boolean
}

const FAQ_ITEMS = [
  {
    question: "How long does review take?",
    answer: "Most requests are reviewed within an hour during business hours (8am–10pm AEST). Priority requests are reviewed within 15 minutes.",
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
  patientEmail,
  isPriority = false,
  showConfetti = true,
}: WhatHappensNextProps) {
  const [confettiTrigger, setConfettiTrigger] = useState(false)
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)
  const [_currentStatus, setCurrentStatus] = useState<IntakeStatus>(initialStatus)

  // Trigger confetti on mount
  useEffect(() => {
    if (showConfetti) {
      setTimeout(() => setConfettiTrigger(true), 300)
    }
  }, [showConfetti])

  return (
    <>
      {showConfetti && <Confetti trigger={confettiTrigger} options={{ particleCount: 40 }} />}

      <div className="max-w-lg mx-auto space-y-6">
        {/* Success header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500 flex items-center justify-center"
          >
            <CheckCircle2 className="w-8 h-8 text-white" />
          </motion.div>
          
          <h1 className="text-2xl font-bold mb-2">Request submitted</h1>
          <p className="text-muted-foreground">
            {serviceName ? `Your ${serviceName.toLowerCase()} request is ` : "Your request is "}
            being reviewed by our doctors.
          </p>
          
          {/* Reassurance badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <IntakeStatusTracker
            intakeId={intakeId}
            initialStatus={initialStatus}
            isPriority={isPriority}
            onStatusChange={setCurrentStatus}
          />
        </motion.div>

        {/* Key info cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid gap-3"
        >
          <InfoCard
            icon={<User className="h-4 w-4" />}
            title="Doctor review in progress"
            description={isPriority 
              ? "Priority review — within 15 minutes" 
              : "Most requests reviewed within 45 minutes"
            }
            highlight={isPriority}
          />
          
          <InfoCard
            icon={<Mail className="h-4 w-4" />}
            title={getServiceMessaging(serviceName)?.deliveryTitle || "We'll email you"}
            description={patientEmail
              ? `Updates sent to ${patientEmail}`
              : getServiceMessaging(serviceName)?.deliveryDescription || "You'll get an email when your document is ready"
            }
          />

          <InfoCard
            icon={<FileText className="h-4 w-4" />}
            title={getServiceMessaging(serviceName)?.documentTitle || "Download anytime"}
            description={getServiceMessaging(serviceName)?.documentDescription || "Your documents are always available in your dashboard"}
          />
        </motion.div>

        {/* FAQ accordion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
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
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
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

interface InfoCardProps {
  icon: React.ReactNode
  title: string
  description: string
  highlight?: boolean
}

function InfoCard({ icon, title, description, highlight }: InfoCardProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-xl border",
        highlight
          ? "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800"
          : "bg-muted/30 border-border/50"
      )}
    >
      <div
        className={cn(
          "shrink-0 h-8 w-8 rounded-lg flex items-center justify-center",
          highlight
            ? "bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400"
            : "bg-primary/10 text-primary"
        )}
      >
        {icon}
      </div>
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  )
}
