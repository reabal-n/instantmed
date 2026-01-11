'use client'

import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface AnimatedGradientBorderProps {
  children: React.ReactNode
  className?: string
  containerClassName?: string
  borderWidth?: number
  duration?: number
}

export function AnimatedGradientBorder({
  children,
  className,
  containerClassName,
  borderWidth = 2,
  duration = 3,
}: AnimatedGradientBorderProps) {
  return (
    <div className={cn("relative group", containerClassName)}>
      {/* Animated gradient border */}
      <motion.div
        className="absolute -inset-px rounded-2xl opacity-75 group-hover:opacity-100 transition-opacity"
        style={{
          backgroundImage: 'linear-gradient(90deg, #6366f1, #8b5cf6, #a855f7, #8b5cf6, #6366f1)',
          backgroundSize: '200% 100%',
          padding: borderWidth,
        }}
        animate={{
          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
      
      {/* Content container */}
      <div className={cn(
        "relative bg-background rounded-2xl",
        className
      )}>
        {children}
      </div>
    </div>
  )
}

interface GlowCardProps {
  children: React.ReactNode
  className?: string
  glowColor?: string
}

export function GlowCard({
  children,
  className,
  glowColor = 'rgba(99, 102, 241, 0.3)',
}: GlowCardProps) {
  return (
    <motion.div
      className={cn(
        "relative rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-200/50 p-6 transition-all duration-300",
        className
      )}
      whileHover={{
        y: -4,
        boxShadow: `0 20px 40px ${glowColor}`,
      }}
    >
      {/* Glow effect on hover */}
      <motion.div
        className="absolute -inset-1 rounded-2xl opacity-0 blur-xl transition-opacity pointer-events-none"
        style={{ background: glowColor }}
        whileHover={{ opacity: 0.5 }}
      />
      
      <div className="relative">{children}</div>
    </motion.div>
  )
}

interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  className?: string
}

export function ShimmerButton({
  children,
  className,
  ...props
}: ShimmerButtonProps) {
  return (
    <button
      className={cn(
        "relative inline-flex items-center justify-center px-6 py-3 overflow-hidden font-medium text-white rounded-xl",
        "bg-linear-to-r from-indigo-600 to-violet-600",
        "transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98]",
        "shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30",
        className
      )}
      {...props}
    >
      {/* Shimmer effect */}
      <motion.div
        className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent"
        animate={{
          x: ['-100%', '100%'],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatDelay: 1,
          ease: 'easeInOut',
        }}
      />
      
      <span className="relative">{children}</span>
    </button>
  )
}
