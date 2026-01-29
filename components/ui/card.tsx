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
  // Unified glass card styles - consistent dark mode support
  const craftCardStyles = {
    subtle: "bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-white/50 dark:border-white/10",
    normal: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-sm dark:shadow-none",
    elevated: "bg-white/90 dark:bg-white/10 backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-md dark:shadow-none",
  }

  return (
    <HeroCard
      ref={ref}
      className={cn("text-card-foreground", className)}
      style={style}
      classNames={{
        base: cn(
          // Craft surface (no backdrop-blur)
          craftCardStyles[glass],
          // Restrained radius
          "rounded-xl",
          // Subtle transition
          "transition-all duration-200",
          hoverable && [
            "hover:shadow-md",
            "hover:border-border/80",
          ],
          // Press effect - subtle
          pressable && "active:scale-[0.99]",
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
