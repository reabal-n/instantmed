"use client"

import * as React from "react"
import { RadioGroup as HeroRadioGroup, Radio, type RadioGroupProps as HeroRadioGroupProps } from "@heroui/react"
import { cn } from "@/lib/utils"

export interface RadioGroupProps extends HeroRadioGroupProps {
  className?: string
}

const RadioGroup = React.forwardRef<
  HTMLDivElement,
  RadioGroupProps
>(({ className, ...props }, ref) => (
  <HeroRadioGroup
    ref={ref}
    className={cn("grid gap-4 sm:grid-cols-2", className)}
    {...props}
  />
))
RadioGroup.displayName = "RadioGroup"

export interface RadioCardProps {
  title: string
  description?: string
  icon?: React.ReactNode
  value: string
  className?: string
  isSelected?: boolean
}

const RadioCard = React.forwardRef<
  HTMLInputElement,
  RadioCardProps
>(({ className, title, description, icon, value, ...props }, ref) => (
  <Radio
    ref={ref}
    value={value}
    classNames={{
      base: cn(
        "relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left shadow-sm transition-all",
        "hover:shadow-md",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70",
        "data-[selected=true]:border-primary data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      ),
      label: "font-semibold",
      description: "text-sm text-default-500",
    }}
    {...props}
  >
    <div className="flex items-center gap-3">
      {icon && <span className="text-primary">{icon}</span>}
      <span className="font-semibold">{title}</span>
    </div>
    {description && (
      <p className="text-sm text-default-500">{description}</p>
    )}

    {/* Glowing green dot indicator */}
    {props.isSelected && (
      <span className="absolute top-3 right-3 relative flex size-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75"></span>
        <span className="relative inline-flex size-3 rounded-full bg-green-500 shadow-[0_0_6px_2px_rgba(34,197,94,0.6)]"></span>
      </span>
    )}
  </Radio>
))
RadioCard.displayName = "RadioCard"

export { RadioGroup, RadioCard }
