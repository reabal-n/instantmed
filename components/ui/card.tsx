"use client"

import * as React from "react"
import { Card as HeroCard } from "@heroui/react"
import { cn } from "@/lib/utils"

export interface CardProps {
  children?: React.ReactNode
  className?: string
  style?: React.CSSProperties
  /** Glass intensity level */
  glass?: "subtle" | "normal" | "elevated"
  /** Enable hover effects */
  hoverable?: boolean
  /** Enable press/click effect */
  pressable?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(({ 
  className, 
  children, 
  style, 
  glass = "normal",
  hoverable = true,
  pressable = false,
  ...props 
}, ref) => {
  // Soft Pop Glass intensity variants
  const glassStyles = {
    subtle: cn(
      "bg-white/50 dark:bg-gray-900/40",
      "backdrop-blur-lg",
      "border border-white/30 dark:border-white/8",
    ),
    normal: cn(
      "bg-white/70 dark:bg-gray-900/60",
      "backdrop-blur-xl",
      "border border-white/40 dark:border-white/10",
    ),
    elevated: cn(
      "bg-white/85 dark:bg-gray-900/80",
      "backdrop-blur-2xl",
      "border border-white/50 dark:border-white/15",
    ),
  }

  return (
    <HeroCard
      ref={ref}
      className={cn("text-card-foreground", className)}
      style={style}
      classNames={{
        base: cn(
          // Soft Pop Glass surface
          glassStyles[glass],
          // Geometry: rounded-2xl for cards
          "rounded-2xl",
          // Soft glow shadow (not black!)
          "shadow-[0_8px_30px_rgba(0,0,0,0.06)]",
          // Motion: hover lift with colored glow
          "transition-all duration-300 ease-out",
          hoverable && [
            "hover:bg-white/85 dark:hover:bg-gray-900/80",
            "hover:-translate-y-1",
            "hover:shadow-[0_20px_40px_rgba(59,130,246,0.12)]",
            "dark:hover:shadow-[0_20px_40px_rgba(139,92,246,0.15)]",
          ],
          // Press effect
          pressable && "active:scale-[0.98]",
        ),
      }}
      {...props}
    >
      {children}
    </HeroCard>
  )
})

Card.displayName = "Card"

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
