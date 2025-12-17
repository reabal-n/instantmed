"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { HelpCircle, ExternalLink } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface ContextualHelpProps {
  title: string
  description: string
  learnMoreHref?: string
  learnMoreText?: string
  className?: string
  side?: "top" | "bottom" | "left" | "right"
  size?: "sm" | "md"
}

export function ContextualHelp({
  title,
  description,
  learnMoreHref,
  learnMoreText = "Learn more",
  className,
  side = "top",
  size = "sm",
}: ContextualHelpProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            size === "sm" ? "w-4 h-4" : "w-5 h-5",
            className
          )}
          aria-label={`Help: ${title}`}
        >
          <HelpCircle className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        side={side} 
        className="w-72 p-4 rounded-xl"
        onPointerDownOutside={() => setOpen(false)}
      >
        <h4 className="font-semibold text-foreground mb-1">{title}</h4>
        <p className="text-sm text-muted-foreground mb-3">{description}</p>
        {learnMoreHref && (
          <Link
            href={learnMoreHref}
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            target={learnMoreHref.startsWith("http") ? "_blank" : undefined}
          >
            {learnMoreText}
            <ExternalLink className="w-3 h-3" />
          </Link>
        )}
      </PopoverContent>
    </Popover>
  )
}

// Inline help tooltip for form fields
interface FieldHelpProps {
  children: React.ReactNode
  help: string
  className?: string
}

export function FieldHelp({ children, help, className }: FieldHelpProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {children}
      <ContextualHelp title="Help" description={help} size="sm" />
    </div>
  )
}

// Keyboard shortcut hint
interface KeyboardHintProps {
  keys: string[]
  description: string
  className?: string
}

export function KeyboardHint({ keys, description, className }: KeyboardHintProps) {
  return (
    <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
      <div className="flex items-center gap-0.5">
        {keys.map((key, index) => (
          <span key={index}>
            <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">
              {key}
            </kbd>
            {index < keys.length - 1 && <span className="mx-0.5">+</span>}
          </span>
        ))}
      </div>
      <span>{description}</span>
    </div>
  )
}

// Help panel for complex features
interface HelpPanelProps {
  title: string
  items: Array<{
    icon?: React.ReactNode
    title: string
    description: string
  }>
  className?: string
}

export function HelpPanel({ title, items, className }: HelpPanelProps) {
  return (
    <div className={cn("glass-card rounded-2xl p-5", className)}>
      <div className="flex items-center gap-2 mb-4">
        <HelpCircle className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">{title}</h3>
      </div>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="flex gap-3">
            {item.icon && (
              <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                {item.icon}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-foreground">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Quick tips banner
interface QuickTipProps {
  tip: string
  onDismiss?: () => void
  className?: string
}

export function QuickTip({ tip, onDismiss, className }: QuickTipProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/5 border border-primary/10",
      className
    )}>
      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <span className="text-xs">💡</span>
      </div>
      <p className="text-sm text-foreground flex-1">{tip}</p>
      {onDismiss && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setDismissed(true)
            onDismiss()
          }}
          className="h-6 px-2 text-xs"
        >
          Got it
        </Button>
      )}
    </div>
  )
}
