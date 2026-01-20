"use client";

import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import * as React from "react";
import { cn } from "@/lib/utils";

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Root
    ref={ref}
    className={cn("grid gap-4 sm:grid-cols-2", className)}
    {...props}
  />
));
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

const RadioCard = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> & {
    title: string;
    description?: string;
    icon?: React.ReactNode;
  }
>(({ className, title, description, icon, ...props }, ref) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all duration-300",
      // Calm glass surface
      "bg-white/90 dark:bg-slate-900/60 backdrop-blur-sm",
      "border-slate-200/60 dark:border-slate-700/40",
      "shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
      // Subtle hover - light settling effect
      "hover:bg-white hover:border-slate-300/60 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]",
      // Focus state
      "focus-visible:outline-2 focus-visible:outline-ring/70",
      // Selected state - clear visual feedback
      "data-[state=checked]:bg-sky-50/80 dark:data-[state=checked]:bg-sky-900/20",
      "data-[state=checked]:border-sky-300/60 dark:data-[state=checked]:border-sky-600/40",
      "data-[state=checked]:shadow-[0_2px_8px_rgba(138,187,224,0.15)]",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  >
    <div className="flex items-center gap-3">
      {icon && <span className="text-primary">{icon}</span>}
      <span className="font-semibold">{title}</span>
    </div>
    {description && (
      <p className="text-sm text-muted-foreground">{description}</p>
    )}

    {/* Subtle checkmark indicator - calm confirmation */}
    <RadioGroupPrimitive.Indicator className="absolute top-3 right-3">
      <span className="flex size-5 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-800/40">
        <svg className="size-3 text-sky-600 dark:text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
    </RadioGroupPrimitive.Indicator>
  </RadioGroupPrimitive.Item>
));
RadioCard.displayName = "RadioCard";

export { RadioGroup, RadioCard };
