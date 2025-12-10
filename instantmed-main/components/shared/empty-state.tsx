"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { type LucideIcon, FileX, Plus, Search, Inbox, Calendar, FileText, Pill, Stethoscope } from "lucide-react"
import Link from "next/link"

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
  secondaryActionLabel?: string
  secondaryActionHref?: string
  className?: string
  variant?: "default" | "illustrated" | "minimal"
}

export function EmptyState({
  icon: Icon = FileX,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  secondaryActionLabel,
  secondaryActionHref,
  className,
  variant = "default",
}: EmptyStateProps) {
  if (variant === "minimal") {
    return (
      <div className={cn("flex flex-col items-center justify-center py-8 px-4 text-center", className)}>
        <Icon className="h-10 w-10 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">{description}</p>
        {actionLabel && actionHref && (
          <Button asChild variant="link" size="sm" className="mt-2">
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        )}
      </div>
    )
  }

  if (variant === "illustrated") {
    return (
      <div className={cn("flex flex-col items-center justify-center py-16 px-4 text-center", className)}>
        {/* Animated illustration */}
        <div className="relative mb-8">
          {/* Background circles */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 animate-pulse" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/10"
              style={{ animation: "pulse 2s ease-in-out infinite", animationDelay: "0.5s" }}
            />
          </div>

          {/* Main icon container */}
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent backdrop-blur-sm border border-primary/20 shadow-lg animate-float">
            <Icon className="h-10 w-10 text-primary" />
          </div>

          {/* Decorative dots */}
          <div className="absolute -top-2 -right-2 w-3 h-3 rounded-full bg-primary/40 animate-ping" />
          <div
            className="absolute -bottom-1 -left-3 w-2 h-2 rounded-full bg-primary/30"
            style={{ animation: "ping 2s ease-in-out infinite", animationDelay: "1s" }}
          />
        </div>

        <h3
          className="text-xl font-semibold text-foreground mb-2 animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}
        >
          {title}
        </h3>
        <p
          className="text-muted-foreground max-w-sm mb-8 animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}
        >
          {description}
        </p>

        <div
          className="flex flex-col sm:flex-row gap-3 animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.3s", animationFillMode: "forwards" }}
        >
          {actionLabel && actionHref && (
            <Button asChild className="rounded-xl">
              <Link href={actionHref}>
                <Plus className="mr-2 h-4 w-4" />
                {actionLabel}
              </Link>
            </Button>
          )}
          {actionLabel && onAction && (
            <Button onClick={onAction} className="rounded-xl">
              <Plus className="mr-2 h-4 w-4" />
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && secondaryActionHref && (
            <Button asChild variant="outline" className="rounded-xl">
              <Link href={secondaryActionHref}>{secondaryActionLabel}</Link>
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-4 text-center", className)}>
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-muted to-muted/50 mb-4 shadow-inner">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      <div className="flex flex-col sm:flex-row gap-3">
        {actionLabel && actionHref && (
          <Button asChild className="rounded-xl">
            <Link href={actionHref}>
              <Plus className="mr-2 h-4 w-4" />
              {actionLabel}
            </Link>
          </Button>
        )}
        {actionLabel && onAction && (
          <Button onClick={onAction} className="rounded-xl">
            <Plus className="mr-2 h-4 w-4" />
            {actionLabel}
          </Button>
        )}
        {secondaryActionLabel && secondaryActionHref && (
          <Button asChild variant="outline" className="rounded-xl">
            <Link href={secondaryActionHref}>{secondaryActionLabel}</Link>
          </Button>
        )}
      </div>
    </div>
  )
}

// Pre-configured empty states for common scenarios
export function NoRequestsEmptyState() {
  return (
    <EmptyState
      icon={Inbox}
      title="No requests yet"
      description="You haven't submitted any requests. Get started by requesting a medical certificate, prescription, or referral."
      actionLabel="New Request"
      actionHref="/patient/requests/new"
      variant="illustrated"
    />
  )
}

export function NoSearchResultsEmptyState({ query }: { query: string }) {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description={`We couldn't find anything matching "${query}". Try a different search term.`}
      variant="minimal"
    />
  )
}

export function NoPatientsEmptyState() {
  return (
    <EmptyState
      icon={Calendar}
      title="No patients in queue"
      description="There are no pending requests at the moment. Check back later for new submissions."
      variant="illustrated"
    />
  )
}

// Quick actions component
interface QuickActionProps {
  icon: LucideIcon
  label: string
  href: string
  color?: string
}

export function QuickActions({ actions }: { actions: QuickActionProps[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {actions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className="group flex flex-col items-center gap-2 p-4 rounded-xl border border-border/50 bg-card/50 hover:bg-card hover:border-primary/30 hover:shadow-lg transition-all duration-200"
        >
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-110",
              action.color || "bg-primary/10"
            )}
          >
            <action.icon className="h-6 w-6 text-primary" />
          </div>
          <span className="text-sm font-medium text-center">{action.label}</span>
        </Link>
      ))}
    </div>
  )
}

export function PatientQuickActions() {
  const actions: QuickActionProps[] = [
    { icon: FileText, label: "Medical Certificate", href: "/medical-certificate/request", color: "bg-[#00E2B5]/10" },
    { icon: Pill, label: "Prescription", href: "/prescriptions/request", color: "bg-[#06B6D4]/10" },
    { icon: Stethoscope, label: "Referral", href: "/referrals", color: "bg-[#8B5CF6]/10" },
    { icon: Search, label: "Pathology", href: "/referrals/pathology-imaging/request", color: "bg-[#F59E0B]/10" },
  ]

  return <QuickActions actions={actions} />
}
