"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/uix"
import { cn } from "@/lib/utils"
import { type LucideIcon, FileX, Plus } from "lucide-react"
import Link from "next/link"

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
  className?: string
  /** Show floating animation on the icon */
  animate?: boolean
}

export function EmptyState({
  icon: Icon = FileX,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
  animate = true,
}: EmptyStateProps) {
  return (
    <motion.div 
      className={cn("flex flex-col items-center justify-center py-12 px-4 text-center", className)}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div 
        className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-secondary/20 mb-6 shadow-lg"
        animate={animate ? { 
          y: [0, -8, 0],
          rotate: [0, 2, -2, 0],
        } : undefined}
        transition={animate ? { 
          duration: 4, 
          repeat: Infinity, 
          ease: "easeInOut" 
        } : undefined}
      >
        <Icon className="h-10 w-10 text-primary" />
      </motion.div>
      <motion.h3 
        className="text-xl font-semibold text-foreground mb-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {title}
      </motion.h3>
      <motion.p 
        className="text-sm text-muted-foreground max-w-sm mb-6 leading-relaxed"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {description}
      </motion.p>
      {actionLabel && actionHref && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button asChild className="rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <Link href={actionHref}>
              <Plus className="mr-2 h-4 w-4" />
              {actionLabel}
            </Link>
          </Button>
        </motion.div>
      )}
      {actionLabel && onAction && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button onClick={onAction} className="rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <Plus className="mr-2 h-4 w-4" />
            {actionLabel}
          </Button>
        </motion.div>
      )}
    </motion.div>
  )
}
