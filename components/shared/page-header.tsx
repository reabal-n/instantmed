import type React from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  description?: string
  icon?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ title, description, icon, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between animate-fade-in-up opacity-0",
        className,
      )}
      style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}
    >
      <div className="flex items-center gap-3">
        {icon && <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">{icon}</div>}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
