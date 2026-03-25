"use client"

import { LucideIcon, Plus, Lightbulb, Sparkles } from "lucide-react"
import { Button } from "./button"
import { cn } from "@/lib/utils"
import { motion, useReducedMotion } from "framer-motion"
import { fadeIn, fadeUp as slideUp } from "@/lib/motion"
import Link from "next/link"
import { LottieAnimation } from "@/components/ui/lottie-animation"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  /** Optional illustration component */
  illustration?: React.ReactNode
  action?: {
    label: string
    onClick?: () => void
    href?: string
  }
  /** Secondary action */
  secondaryAction?: {
    label: string
    onClick?: () => void
    href?: string
  }
  /** Tips/guidance to show */
  tips?: string[]
  /** Examples/templates to show */
  examples?: Array<{
    title: string
    description: string
    onClick?: () => void
  }>
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  illustration,
  action,
  secondaryAction,
  tips,
  examples,
  className,
}: EmptyStateProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      initial={prefersReducedMotion ? false : "initial"}
      animate="animate"
      variants={fadeIn}
      className={cn("text-center py-16 px-4 max-w-2xl mx-auto", className)}
    >
      {/* Illustration or Icon */}
      <motion.div
        initial={prefersReducedMotion ? false : { scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.1, type: "tween", ease: [0.22, 1, 0.36, 1], duration: 0.3 }}
        className="mb-8"
      >
        {illustration ? (
          <div className="w-32 h-32 mx-auto">{illustration}</div>
        ) : (
          <>
            <LottieAnimation name="empty-state" size={100} loop={false} className="mx-auto" />
            <div className="w-24 h-24 mx-auto rounded-3xl bg-linear-to-br from-primary/15 to-secondary/15 flex items-center justify-center shadow-lg">
              <Icon className="w-11 h-11 text-primary" />
            </div>
          </>
        )}
      </motion.div>

      {/* Title */}
      <motion.h3
        initial={prefersReducedMotion ? false : "initial"}
        animate="animate"
        variants={slideUp}
        transition={{ delay: prefersReducedMotion ? 0 : 0.2 }}
        className="text-2xl font-semibold mb-3 text-foreground"
      >
        {title}
      </motion.h3>

      {/* Description */}
      <motion.p
        initial={prefersReducedMotion ? false : "initial"}
        animate="animate"
        variants={slideUp}
        transition={{ delay: prefersReducedMotion ? 0 : 0.3 }}
        className="text-muted-foreground text-base mb-10 max-w-md mx-auto leading-relaxed"
      >
        {description}
      </motion.p>

      {/* Actions */}
      {(action || secondaryAction) && (
        <motion.div
          initial={prefersReducedMotion ? false : "initial"}
          animate="animate"
          variants={slideUp}
          transition={{ delay: prefersReducedMotion ? 0 : 0.4 }}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-10"
        >
          {action && (
            <>
              {action.href ? (
                <Button asChild className="min-h-[44px] touch-target">
                  <Link href={action.href}>
                    <Plus className="mr-2 h-4 w-4" />
                    {action.label}
                  </Link>
                </Button>
              ) : (
                <Button onClick={action.onClick} className="min-h-[44px] touch-target">
                  <Plus className="mr-2 h-4 w-4" />
                  {action.label}
                </Button>
              )}
            </>
          )}
          {secondaryAction && (
            <>
              {secondaryAction.href ? (
                <Button variant="outline" asChild className="min-h-[44px] touch-target">
                  <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={secondaryAction.onClick}
                  className="min-h-[44px] touch-target"
                >
                  {secondaryAction.label}
                </Button>
              )}
            </>
          )}
        </motion.div>
      )}

      {/* Tips */}
      {tips && tips.length > 0 && (
        <motion.div
          initial={prefersReducedMotion ? false : "initial"}
          animate="animate"
          variants={slideUp}
          transition={{ delay: prefersReducedMotion ? 0 : 0.5 }}
          className="mt-10 p-5 bg-muted/40 rounded-xl border border-border/50"
        >
          <div className="flex items-center gap-2 mb-4 justify-center">
            <Lightbulb className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Tips</span>
          </div>
          <ul className="text-left space-y-2.5 text-sm text-muted-foreground">
            {tips.map((tip, index) => (
              <li key={index} className="flex items-start gap-2">
                <Sparkles className="w-3 h-3 mt-0.5 text-primary shrink-0" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Examples/Templates */}
      {examples && examples.length > 0 && (
        <motion.div
          initial={prefersReducedMotion ? false : "initial"}
          animate="animate"
          variants={slideUp}
          transition={{ delay: prefersReducedMotion ? 0 : 0.6 }}
          className="mt-8"
        >
          <p className="text-sm font-medium text-foreground mb-4">Examples:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {examples.map((example, index) => (
              <button
                key={index}
                onClick={example.onClick}
                className="p-4 text-left rounded-xl border border-border/50 bg-background/50 hover:bg-background hover:border-primary/50 transition-all cursor-pointer min-h-[44px] touch-target"
              >
                <h4 className="font-medium text-sm text-foreground mb-1">{example.title}</h4>
                <p className="text-xs text-muted-foreground">{example.description}</p>
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
