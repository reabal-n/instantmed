"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { CheckCircle, Clock, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"

// Generate confetti particles outside of component to avoid impure function calls during render
function generateConfettiParticles() {
  const colors = ["#2563EB", "#8b5cf6", "#22c55e", "#f59e0b"]
  return Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    color: colors[Math.floor(Math.random() * colors.length)],
    delay: Math.random() * 0.5,
  }))
}

interface SuccessStateProps {
  /** Main success message */
  title: string
  /** Optional subtitle/description */
  description?: string
  /** Optional next steps message */
  nextSteps?: string
  /** Primary action button */
  primaryAction?: {
    label: string
    href?: string
    onClick?: () => void
  }
  /** Secondary action button */
  secondaryAction?: {
    label: string
    href?: string
    onClick?: () => void
  }
  /** Show timing information */
  showTiming?: boolean
  /** Custom icon (defaults to CheckCircle) */
  icon?: React.ComponentType<{ className?: string }>
  /** Additional className */
  className?: string
  /** Show confetti animation */
  showConfetti?: boolean
}

export function SuccessState({
  title,
  description,
  nextSteps,
  primaryAction,
  secondaryAction,
  showTiming = false,
  icon: Icon = CheckCircle,
  className,
  showConfetti = false,
}: SuccessStateProps) {
  // Use lazy initializer to generate random values only once on mount
  const [confettiParticles] = useState(generateConfettiParticles)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn("text-center py-12 px-4", className)}
    >
      {/* Confetti effect */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {confettiParticles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: particle.left,
                top: particle.top,
                backgroundColor: particle.color,
              }}
              initial={{ opacity: 0, y: -20, scale: 0 }}
              animate={{
                opacity: [0, 1, 0],
                y: [0, 100],
                scale: [0, 1, 0],
                rotate: [0, 360],
              }}
              transition={{
                duration: 2,
                delay: particle.delay,
                ease: "easeOut",
              }}
            />
          ))}
        </div>
      )}

      {/* Success icon with animation */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 15,
          delay: 0.1,
        }}
        className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 20,
            delay: 0.2,
          }}
        >
          <Icon className="w-10 h-10 text-green-600" />
        </motion.div>
      </motion.div>

      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-2xl font-bold mb-2"
      >
        {title}
      </motion.h2>

      {/* Description */}
      {description && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-muted-foreground mb-6 max-w-md mx-auto leading-relaxed"
        >
          {description}
        </motion.p>
      )}

      {/* Timing info */}
      {showTiming && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-sm text-blue-700 mb-6"
        >
          <Clock className="w-4 h-4" />
          <span>{nextSteps || "You'll receive an email when it's ready"}</span>
        </motion.div>
      )}

      {/* Next steps message */}
      {nextSteps && !showTiming && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-sm text-muted-foreground mb-6"
        >
          {nextSteps}
        </motion.p>
      )}

      {/* Actions */}
      {(primaryAction || secondaryAction) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-3 justify-center items-center max-w-md mx-auto"
        >
          {primaryAction && (
            <Button
              className="w-full sm:w-auto min-w-[200px] h-12"
              onClick={primaryAction.onClick}
              asChild={!!primaryAction.href}
            >
              {primaryAction.href ? (
                <Link href={primaryAction.href}>
                  {primaryAction.label}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              ) : (
                primaryAction.label
              )}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="ghost"
              className="w-full sm:w-auto"
              onClick={secondaryAction.onClick}
              asChild={!!secondaryAction.href}
            >
              {secondaryAction.href ? (
                <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
              ) : (
                secondaryAction.label
              )}
            </Button>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}
