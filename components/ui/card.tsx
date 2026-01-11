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
  // Lumen Glass intensity variants - Night sky compatible
  const glassStyles = {
    subtle: cn(
      "bg-white/60 dark:bg-slate-900/50",
      "backdrop-blur-lg",
      "border border-sky-300/25 dark:border-slate-400/10",
    ),
    normal: cn(
      "bg-white/75 dark:bg-slate-900/60",
      "backdrop-blur-xl",
      "border border-sky-300/35 dark:border-slate-400/12",
    ),
    elevated: cn(
      "bg-white/90 dark:bg-slate-900/75",
      "backdrop-blur-2xl",
      "border border-sky-300/45 dark:border-slate-400/15",
    ),
  }

  return (
    <HeroCard
      ref={ref}
      className={cn("text-card-foreground", className)}
      style={style}
      classNames={{
        base: cn(
          // Lumen Glass surface
          glassStyles[glass],
          // Geometry: rounded-2xl for cards
          "rounded-2xl",
          // Lumen soft shadow (sky-tinted)
          "shadow-[0_4px_20px_rgba(197,221,240,0.15)]",
          // Motion: gentle hover lift
          "transition-all duration-300 ease-out",
          hoverable && [
            "hover:bg-white/85 dark:hover:bg-slate-900/70",
            "hover:-translate-y-0.5",
            "hover:shadow-[0_8px_30px_rgba(197,221,240,0.20)]",
            "dark:hover:shadow-[0_8px_30px_rgba(148,163,184,0.12)]",
          ],
          // Press effect - subtle
          pressable && "active:translate-y-0",
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
