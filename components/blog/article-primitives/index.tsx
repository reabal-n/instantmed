"use client"

import { AlertTriangle, CheckCircle2, FileText, Info, Lightbulb, Shield } from "lucide-react"

import type { ArticleSection } from "@/lib/blog/types"
import { cn } from "@/lib/utils"

const calloutConfig = {
  info: {
    icon: Info,
    label: "Key Information",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
    accent: "bg-blue-500",
    iconColor: "text-blue-600 dark:text-blue-400",
    labelColor: "text-blue-700 dark:text-blue-300",
    textColor: "text-blue-800 dark:text-blue-200",
  },
  warning: {
    icon: AlertTriangle,
    label: "Important Warning",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    accent: "bg-amber-500",
    iconColor: "text-amber-600 dark:text-amber-400",
    labelColor: "text-amber-700 dark:text-amber-300",
    textColor: "text-amber-800 dark:text-amber-200",
  },
  tip: {
    icon: Lightbulb,
    label: "Helpful Tip",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800",
    accent: "bg-emerald-500",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    labelColor: "text-emerald-700 dark:text-emerald-300",
    textColor: "text-emerald-800 dark:text-emerald-200",
  },
  emergency: {
    icon: AlertTriangle,
    label: "Emergency Information",
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-800",
    accent: "bg-red-500",
    iconColor: "text-red-600 dark:text-red-400",
    labelColor: "text-red-700 dark:text-red-300",
    textColor: "text-red-800 dark:text-red-200",
  },
}

export function CalloutBox({ variant, content }: { variant: ArticleSection["variant"]; content: string }) {
  const cfg = calloutConfig[variant || "info"]
  const Icon = cfg.icon

  return (
    <div className={cn("relative my-6 overflow-hidden rounded-xl border", cfg.bg, cfg.border)}>
      <div className={cn("absolute bottom-0 left-0 top-0 w-1", cfg.accent)} />
      <div className="py-4 pl-5 pr-4">
        <div className="mb-1.5 flex items-center gap-2">
          <Icon className={cn("h-4 w-4 shrink-0", cfg.iconColor)} />
          <span className={cn("text-xs font-semibold uppercase tracking-wide", cfg.labelColor)}>{cfg.label}</span>
        </div>
        <p className={cn("text-sm leading-relaxed", cfg.textColor)}>{content}</p>
      </div>
    </div>
  )
}

export function KeyTakeawayBox({ section }: { section: ArticleSection }) {
  return (
    <aside
      className="group my-8 overflow-hidden rounded-2xl border border-primary/20 bg-white shadow-md shadow-primary/[0.06] transition-[transform,box-shadow,border-color] duration-300 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-lg motion-safe:hover:shadow-primary/[0.08] dark:border-white/15 dark:bg-card dark:shadow-none dark:hover:border-primary/35"
      aria-label={section.title ?? "Key takeaway"}
    >
      <div className="border-b border-primary/10 bg-primary/[0.035] px-5 py-4 dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
            <Lightbulb className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">Key takeaway</p>
            <h3 className="text-base font-semibold tracking-[-0.01em] text-foreground">{section.title}</h3>
          </div>
        </div>
      </div>
      <ul className="space-y-3 px-5 py-5">
        {section.items?.map((item, index) => (
          <li key={index} className="flex gap-3 text-[15px] leading-relaxed text-muted-foreground">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </aside>
  )
}

const decisionGroupStyles: Record<
  NonNullable<ArticleSection["groups"]>[number]["title"],
  {
    icon: typeof CheckCircle2
    badge: string
    surface: string
    iconColor: string
  }
> = {
  "May fit telehealth": {
    icon: CheckCircle2,
    badge:
      "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-800",
    surface: "bg-emerald-50/55 dark:bg-emerald-950/20",
    iconColor: "text-emerald-600 dark:text-emerald-300",
  },
  "Needs in-person care": {
    icon: FileText,
    badge:
      "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-800",
    surface: "bg-amber-50/60 dark:bg-amber-950/20",
    iconColor: "text-amber-600 dark:text-amber-300",
  },
  "Urgent care": {
    icon: AlertTriangle,
    badge: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:ring-rose-800",
    surface: "bg-rose-50/60 dark:bg-rose-950/20",
    iconColor: "text-rose-600 dark:text-rose-300",
  },
}

export function DecisionBox({ section }: { section: ArticleSection }) {
  return (
    <section
      className="my-8 rounded-2xl border border-border/50 bg-white p-5 shadow-md shadow-primary/[0.06] transition-[box-shadow,border-color] duration-300 hover:border-primary/25 dark:border-white/15 dark:bg-card dark:shadow-none"
      aria-label={section.title ?? "Decision guide"}
    >
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
          <Shield className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">Decision guide</p>
          <h3 className="text-lg font-semibold tracking-[-0.01em] text-foreground">{section.title}</h3>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {section.groups?.map((group) => {
          const cfg = decisionGroupStyles[group.title]
          const Icon = cfg.icon
          return (
            <div key={group.title} className={cn("rounded-xl p-4 ring-1 ring-border/50", cfg.surface)}>
              <div className="mb-3 flex items-center gap-2">
                <Icon className={cn("h-4 w-4 shrink-0", cfg.iconColor)} />
                <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-medium ring-1", cfg.badge)}>
                  {group.title}
                </span>
              </div>
              <ul className="space-y-2">
                {group.items.map((item, index) => (
                  <li key={index} className="text-sm leading-relaxed text-foreground/75">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export function EvidencePolicyNote({ section }: { section: ArticleSection }) {
  const isPolicy = section.type === "policyNote"
  const Icon = isPolicy ? Shield : FileText

  return (
    <aside
      className={cn(
        "my-7 rounded-2xl border bg-white p-5 shadow-sm shadow-primary/[0.04] transition-[border-color,box-shadow] duration-300 hover:border-primary/25 dark:border-white/15 dark:bg-card dark:shadow-none",
        isPolicy ? "border-blue-200/80 dark:border-blue-900/60" : "border-emerald-200/80 dark:border-emerald-900/60",
      )}
      aria-label={section.title ?? (isPolicy ? "Policy note" : "Evidence note")}
    >
      <div className="mb-3 flex items-start gap-3">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1",
            isPolicy
              ? "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:ring-blue-800"
              : "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-800",
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p
            className={cn(
              "text-xs font-semibold uppercase tracking-[0.08em]",
              isPolicy ? "text-blue-700 dark:text-blue-300" : "text-emerald-700 dark:text-emerald-300",
            )}
          >
            {isPolicy ? "Policy note" : "Evidence note"}
          </p>
          <h3 className="text-base font-semibold tracking-[-0.01em] text-foreground">{section.title}</h3>
          {section.source && <p className="mt-1 text-xs text-muted-foreground">Source: {section.source}</p>}
        </div>
      </div>
      {section.items && section.items.length > 0 ? (
        <ul className="space-y-2 pl-1">
          {section.items.map((item, index) => (
            <li key={index} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm leading-relaxed text-muted-foreground">{section.content}</p>
      )}
    </aside>
  )
}

export function CareBoundaryBox({ section }: { section: ArticleSection }) {
  return (
    <aside
      className="my-7 rounded-2xl border border-amber-200/80 bg-white p-5 shadow-sm shadow-primary/[0.04] transition-[border-color,box-shadow] duration-300 hover:border-amber-300 dark:border-amber-900/60 dark:bg-card dark:shadow-none"
      aria-label={section.title ?? "Care boundary"}
    >
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-800">
          <Shield className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-700 dark:text-amber-300">
            Care boundary
          </p>
          <h3 className="text-base font-semibold tracking-[-0.01em] text-foreground">{section.title}</h3>
        </div>
      </div>
      {section.items && section.items.length > 0 ? (
        <ul className="space-y-2 pl-1">
          {section.items.map((item, index) => (
            <li key={index} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-300" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm leading-relaxed text-muted-foreground">{section.content}</p>
      )}
    </aside>
  )
}
