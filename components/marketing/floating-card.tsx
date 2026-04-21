import { Reveal } from "@/components/ui/reveal"
import { cn } from "@/lib/utils"

interface FloatingCardProps {
  children: React.ReactNode
  className?: string
  delay?: number
}

export function FloatingCard({ children, className, delay = 0 }: FloatingCardProps) {
  return (
    <Reveal delay={delay}>
      <div
        className={cn(
          "rounded-2xl bg-white dark:bg-card border border-border/50 shadow-xl shadow-primary/[0.08] dark:shadow-none",
          className
        )}
      >
        {children}
      </div>
    </Reveal>
  )
}
