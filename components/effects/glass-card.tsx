import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface GlassCardProps {
  children: ReactNode
  className?: string
  hover?: boolean
}

export function GlassCard({ children, className, hover = true }: GlassCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-2xl backdrop-blur-xl",
        "bg-white/10 dark:bg-black/20",
        "border border-white/20 dark:border-white/10",
        "shadow-[0_8px_32px_0_rgba(79,70,229,0.1)]",
        hover && "transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_8px_32px_0_rgba(79,70,229,0.2)]",
        className,
      )}
    >
      <div className="absolute inset-0 rounded-2xl bg-linear-to-br from-white/5 to-transparent pointer-events-none" />
      {children}
    </div>
  )
}
