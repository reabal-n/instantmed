"use client"

import { motion } from "framer-motion"
import { LucideIcon, FileText, Plus, Lightbulb, Sparkles } from "lucide-react"
import { Button } from "./button"
import { cn } from "@/lib/utils"
import { fadeIn, slideUp } from "./animations"
import Link from "next/link"

interface EnhancedEmptyStateProps {
  /** Icon to display */
  icon?: LucideIcon
  /** Title text */
  title: string
  /** Description text */
  description: string
  /** Optional illustration component */
  illustration?: React.ReactNode
  /** Primary action */
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
  /** Custom className */
  className?: string
}

/**
 * Enhanced Empty State Component
 * 
 * More engaging empty states with illustrations, tips, and examples
 */
export function EnhancedEmptyState({
  icon: Icon = FileText,
  title,
  description,
  illustration,
  action,
  secondaryAction,
  tips,
  examples,
  className,
}: EnhancedEmptyStateProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={fadeIn}
      className={cn("text-center py-12 px-4 max-w-2xl mx-auto", className)}
    >
      {/* Illustration or Icon */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
        className="mb-6"
      >
        {illustration ? (
          <div className="w-32 h-32 mx-auto">{illustration}</div>
        ) : (
          <div className="w-20 h-20 mx-auto rounded-3xl bg-linear-to-br from-primary/20 to-secondary/20 flex items-center justify-center shadow-lg">
            <Icon className="w-10 h-10 text-primary" />
          </div>
        )}
      </motion.div>

      {/* Title */}
      <motion.h3
        initial="initial"
        animate="animate"
        variants={slideUp}
        transition={{ delay: 0.2 }}
        className="text-2xl font-semibold mb-2 text-foreground"
      >
        {title}
      </motion.h3>

      {/* Description */}
      <motion.p
        initial="initial"
        animate="animate"
        variants={slideUp}
        transition={{ delay: 0.3 }}
        className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed"
      >
        {description}
      </motion.p>

      {/* Actions */}
      {(action || secondaryAction) && (
        <motion.div
          initial="initial"
          animate="animate"
          variants={slideUp}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-3 justify-center mb-8"
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
          initial="initial"
          animate="animate"
          variants={slideUp}
          transition={{ delay: 0.5 }}
          className="mt-8 p-4 bg-muted/50 rounded-xl border border-border/50"
        >
          <div className="flex items-center gap-2 mb-3 justify-center">
            <Lightbulb className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Tips</span>
          </div>
          <ul className="text-left space-y-2 text-sm text-muted-foreground">
            {tips.map((tip, index) => (
              <li key={index} className="flex items-start gap-2">
                <Sparkles className="w-3 h-3 mt-0.5 text-primary flex-shrink-0" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Examples/Templates */}
      {examples && examples.length > 0 && (
        <motion.div
          initial="initial"
          animate="animate"
          variants={slideUp}
          transition={{ delay: 0.6 }}
          className="mt-8"
        >
          <p className="text-sm font-medium text-foreground mb-4">Examples:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {examples.map((example, index) => (
              <button
                key={index}
                onClick={example.onClick}
                className="p-4 text-left rounded-xl border border-border/50 bg-background/50 hover:bg-background hover:border-primary/50 transition-all cursor-pointer"
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

