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
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        // Glass container
        "bg-white/50 dark:bg-slate-900/40 backdrop-blur-xl",
        "border border-white/40 dark:border-white/10",
        "rounded-3xl",
        "shadow-[0_8px_30px_rgb(59,130,246,0.1)] dark:shadow-[0_8px_30px_rgb(139,92,246,0.1)]",
        className
      )}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div 
        className={cn(
          "flex h-20 w-20 items-center justify-center rounded-3xl mb-6",
          // Glass icon container with gradient
          "bg-linear-to-br from-primary/20 to-violet-500/20",
          "backdrop-blur-sm border border-white/50 dark:border-white/20",
          // Glow effect
          "shadow-[0_8px_30px_rgb(59,130,246,0.25)]"
        )}
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
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button asChild className="rounded-full shadow-[0_8px_30px_rgb(59,130,246,0.3)] hover:shadow-[0_12px_40px_rgb(59,130,246,0.4)] transition-all duration-300">
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
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button onClick={onAction} className="rounded-full shadow-[0_8px_30px_rgb(59,130,246,0.3)] hover:shadow-[0_12px_40px_rgb(59,130,246,0.4)] transition-all duration-300">
            <Plus className="mr-2 h-4 w-4" />
            {actionLabel}
          </Button>
        </motion.div>
      )}
    </motion.div>
  )
}
