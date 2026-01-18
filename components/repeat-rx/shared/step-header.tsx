"use client"

/**
 * Step Header - Shared component for step titles
 */

interface StepHeaderProps {
  title: string
  subtitle?: string
  emoji?: string
}

export function StepHeader({ title, subtitle, emoji }: StepHeaderProps) {
  return (
    <div className="text-center space-y-1">
      {emoji && <div className="text-3xl mb-2">{emoji}</div>}
      <h1 className="text-xl font-semibold">{title}</h1>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  )
}
