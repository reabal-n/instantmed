"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { cn } from "@/lib/utils"

// Animation variants for 3D flip effect
const itemVariants = {
  initial: { rotateX: 0, opacity: 1 },
  hover: { rotateX: -90, opacity: 0 },
}

const backVariants = {
  initial: { rotateX: 90, opacity: 0 },
  hover: { rotateX: 0, opacity: 1 },
}

const glowVariants = {
  initial: { opacity: 0, scale: 0.8 },
  hover: {
    opacity: 1,
    scale: 2,
    transition: {
      opacity: { duration: 0.3, ease: "easeOut" },
      scale: { duration: 0.3, ease: "easeOut" },
    },
  },
}

const sharedTransition = {
  type: "tween" as const,
  ease: [0.22, 1, 0.36, 1] as const,
  duration: 0.3,
}

export interface AnimatedNavLinkProps {
  href: string
  children: React.ReactNode
  gradient?: string
  icon?: React.ReactNode
  isActive?: boolean
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void
}

export function AnimatedNavLink({ href, children, gradient, icon, isActive, onClick }: AnimatedNavLinkProps) {
  const prefersReducedMotion = useReducedMotion()
  const defaultGradient = "radial-gradient(circle, rgba(0,226,181,0.15) 0%, rgba(0,226,181,0.06) 50%, rgba(0,226,181,0) 100%)"

  // AUDIT FIX: Skip 3D flip animation for users who prefer reduced motion
  if (prefersReducedMotion) {
    return (
      <div className="relative">
        <Link
          href={href}
          onClick={onClick}
          aria-current={isActive ? "page" : undefined}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors relative z-10",
            isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {icon}
          {children}
        </Link>
        {isActive && (
          <div className="absolute inset-0 rounded-lg bg-primary/10 -z-10">
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full" />
          </div>
        )}
      </div>
    )
  }

  return (
    <motion.div
      className="relative"
      style={{ perspective: "600px" }}
      whileHover="hover"
      initial="initial"
    >
      <motion.div
        className="absolute inset-0 z-0 pointer-events-none rounded-lg"
        variants={glowVariants}
        style={{
          background: gradient || defaultGradient,
          opacity: 0,
        }}
      />
      <motion.div
        variants={itemVariants}
        transition={sharedTransition}
        style={{ transformStyle: "preserve-3d", transformOrigin: "center bottom" }}
      >
        <Link
          href={href}
          onClick={onClick}
          aria-current={isActive ? "page" : undefined}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors relative z-10",
            isActive
              ? "text-foreground"
              : "text-muted-foreground"
          )}
        >
          {icon}
          {children}
        </Link>
      </motion.div>
      <motion.div
        className="absolute inset-0 z-10"
        variants={backVariants}
        transition={sharedTransition}
        style={{ transformStyle: "preserve-3d", transformOrigin: "center top", rotateX: 90 }}
      >
        <Link
          href={href}
          onClick={onClick}
          aria-current={isActive ? "page" : undefined}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-foreground"
        >
          {icon}
          {children}
        </Link>
      </motion.div>
      {isActive && (
        <motion.div
          layoutId="navbar-tubelight"
          className="absolute inset-0 rounded-lg bg-primary/10 -z-10"
          transition={{ type: "tween", ease: [0.22, 1, 0.36, 1], duration: 0.3 }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full">
            <div className="absolute w-8 h-4 bg-primary/20 rounded-full blur-md -top-1 -left-1" />
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
