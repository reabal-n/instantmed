"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Clock, ChevronDown, FileText, Pill, Zap } from "lucide-react"

export interface EstimatedTimeBadgeProps {
  estimatedTime?: string
  label?: string
  type?: "certificate" | "prescription" | "consult"
  className?: string
}

const typeConfig = {
  certificate: {
    icon: FileText,
    label: "Medical Certificate",
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
  },
  prescription: {
    icon: Pill,
    label: "Prescription",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  consult: {
    icon: Zap,
    label: "Consultation",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
}

export function EstimatedTimeBadge({
  estimatedTime = "20-60 min",
  label = "Average turnaround",
  type = "certificate",
  className,
}: EstimatedTimeBadgeProps) {
  const [isOpen, setIsOpen] = useState(false)
  const config = typeConfig[type]

  return (
    <div className={cn("inline-block", className)}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative cursor-pointer rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm",
          "hover:border-primary/30 hover:shadow-md transition-all duration-300",
          "overflow-hidden"
        )}
      >
        {/* Shimmer effect */}
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        
        <div className="relative flex items-center gap-3 px-4 py-3">
          {/* Icon */}
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", config.bg)}>
            <Clock className={cn("h-4 w-4", config.color)} />
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-sm font-semibold text-foreground">{estimatedTime}</p>
          </div>

          {/* Badge + Arrow */}
          <div className="flex items-center gap-2">
            <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", config.bg, config.color)}>
              {config.label}
            </span>
            <ChevronDown 
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-300",
                isOpen && "rotate-180"
              )} 
            />
          </div>
        </div>

        {/* Animated border */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <rect
            x="1"
            y="1"
            width="calc(100% - 2px)"
            height="calc(100% - 2px)"
            rx="12"
            ry="12"
            fill="none"
            stroke="url(#gradient)"
            strokeWidth="1.5"
            strokeDasharray="200"
            strokeDashoffset="200"
            className="animate-[dash_3s_ease-in-out_infinite]"
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00E2B5" />
              <stop offset="100%" stopColor="#06B6D4" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Expandable details */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300",
          isOpen ? "max-h-48 opacity-100 mt-2" : "max-h-0 opacity-0"
        )}
      >
        <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">1</span>
            <div>
              <p className="text-xs font-medium text-foreground">Submit your request</p>
              <p className="text-xs text-muted-foreground">Complete the quick health questionnaire</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">2</span>
            <div>
              <p className="text-xs font-medium text-foreground">GP reviews your case</p>
              <p className="text-xs text-muted-foreground">An AHPRA-registered doctor assesses your request</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">3</span>
            <div>
              <p className="text-xs font-medium text-foreground">Receive your document</p>
              <p className="text-xs text-muted-foreground">Download instantly or sent to your pharmacy</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
