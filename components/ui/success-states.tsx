"use client"

import { motion } from "framer-motion"
import { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { CheckCircle, ArrowRight, Download, Clock, Mail } from "lucide-react"
import { Button } from "@/components/uix"
import Link from "next/link"
import confetti from "canvas-confetti"
import { useEffect } from "react"

// =============================================================================
// SUCCESS ICON WITH ANIMATION
// =============================================================================

function AnimatedCheckIcon({ size = 80 }: { size?: number }) {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 15,
        delay: 0.1,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 80 80"
        fill="none"
        className="text-emerald-500"
      >
        {/* Circle background */}
        <motion.circle
          cx="40"
          cy="40"
          r="38"
          stroke="currentColor"
          strokeWidth="3"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-emerald-100 dark:text-emerald-900/30"
        />
        
        {/* Filled circle */}
        <motion.circle
          cx="40"
          cy="40"
          r="32"
          fill="currentColor"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="text-emerald-500"
        />
        
        {/* Check mark */}
        <motion.path
          d="M24 40L35 51L56 30"
          stroke="white"
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.4, duration: 0.3, ease: "easeOut" }}
        />
      </svg>
    </motion.div>
  )
}

// =============================================================================
// PREMIUM SUCCESS STATE
// =============================================================================

interface PremiumSuccessStateProps {
  title: string
  subtitle?: string
  description?: string
  icon?: ReactNode
  showConfetti?: boolean
  steps?: Array<{ icon: ReactNode; label: string; description?: string }>
  primaryAction?: {
    label: string
    href?: string
    onClick?: () => void
    icon?: ReactNode
  }
  secondaryAction?: {
    label: string
    href?: string
    onClick?: () => void
    icon?: ReactNode
  }
  footer?: ReactNode
  className?: string
}

export function PremiumSuccessState({
  title,
  subtitle,
  description,
  icon,
  showConfetti = true,
  steps,
  primaryAction,
  secondaryAction,
  footer,
  className,
}: PremiumSuccessStateProps) {
  // Fire confetti on mount
  useEffect(() => {
    if (!showConfetti) return
    
    const duration = 2000
    const end = Date.now() + duration

    const colors = ["#22c55e", "#06B6D4", "#8B5CF6"]
    
    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      })
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      })

      if (Date.now() < end) {
        requestAnimationFrame(frame)
      }
    }
    
    frame()
  }, [showConfetti])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn("text-center py-12 px-6 max-w-lg mx-auto", className)}
    >
      {/* Success Icon */}
      <motion.div
        className="mb-6"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
      >
        {icon || <AnimatedCheckIcon />}
      </motion.div>

      {/* Title */}
      <motion.h1
        className="text-2xl sm:text-3xl font-bold text-foreground mb-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {title}
      </motion.h1>

      {/* Subtitle */}
      {subtitle && (
        <motion.p
          className="text-lg text-muted-foreground mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {subtitle}
        </motion.p>
      )}

      {/* Description */}
      {description && (
        <motion.p
          className="text-sm text-muted-foreground mb-8 leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {description}
        </motion.p>
      )}

      {/* Steps/Next steps */}
      {steps && steps.length > 0 && (
        <motion.div
          className="mb-8 bg-muted/30 rounded-2xl p-6 text-left"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h3 className="text-sm font-semibold text-foreground mb-4">What happens next</h3>
          <div className="space-y-4">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                className="flex items-start gap-3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-primary">{step.icon}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{step.label}</p>
                  {step.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Actions */}
      {(primaryAction || secondaryAction) && (
        <motion.div
          className="flex flex-col sm:flex-row gap-3 justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          {primaryAction && (
            primaryAction.href ? (
              <Button asChild className="rounded-xl">
                <Link href={primaryAction.href}>
                  {primaryAction.label}
                  {primaryAction.icon || <ArrowRight className="ml-2 h-4 w-4" />}
                </Link>
              </Button>
            ) : (
              <Button onClick={primaryAction.onClick} className="rounded-xl">
                {primaryAction.label}
                {primaryAction.icon || <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            )
          )}
          {secondaryAction && (
            secondaryAction.href ? (
              <Button asChild variant="outline" className="rounded-xl">
                <Link href={secondaryAction.href}>
                  {secondaryAction.icon}
                  {secondaryAction.label}
                </Link>
              </Button>
            ) : (
              <Button variant="outline" onClick={secondaryAction.onClick} className="rounded-xl">
                {secondaryAction.icon}
                {secondaryAction.label}
              </Button>
            )
          )}
        </motion.div>
      )}

      {/* Footer */}
      {footer && (
        <motion.div
          className="mt-8 text-xs text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          {footer}
        </motion.div>
      )}
    </motion.div>
  )
}

// =============================================================================
// REQUEST SUBMITTED SUCCESS
// =============================================================================

export function RequestSubmittedSuccess({
  requestType,
  email,
}: {
  requestType: string
  email?: string
}) {
  return (
    <PremiumSuccessState
      title="Request Submitted!"
      subtitle={`Your ${requestType} request is now with our doctors`}
      description={email ? `We'll email you at ${email} when it's ready.` : undefined}
      steps={[
        {
          icon: <Clock className="h-4 w-4" />,
          label: "Doctor reviews your request",
          description: "Usually within 15-30 minutes (8am-10pm AEST)",
        },
        {
          icon: <Mail className="h-4 w-4" />,
          label: "Get notified by email",
          description: "We'll send your document as soon as it's approved",
        },
        {
          icon: <Download className="h-4 w-4" />,
          label: "Download your document",
          description: "Also available in your dashboard anytime",
        },
      ]}
      primaryAction={{
        label: "Go to Dashboard",
        href: "/patient",
      }}
      footer={
        <p>
          Need help? <Link href="/contact" className="text-primary hover:underline">Contact support</Link>
        </p>
      }
    />
  )
}

// =============================================================================
// PAYMENT SUCCESS
// =============================================================================

export function PaymentSuccessState({ onContinue }: { onContinue?: () => void }) {
  return (
    <PremiumSuccessState
      title="Payment Received!"
      subtitle="A doctor is now reviewing your request"
      steps={[
        {
          icon: <CheckCircle className="h-4 w-4" />,
          label: "Payment confirmed",
          description: "Your transaction was successful",
        },
        {
          icon: <Clock className="h-4 w-4" />,
          label: "Review in progress",
          description: "Our doctors typically respond within 15 minutes",
        },
      ]}
      primaryAction={{
        label: "View Request Status",
        href: "/patient",
        onClick: onContinue,
      }}
    />
  )
}
