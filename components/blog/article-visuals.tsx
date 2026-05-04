import { AlertTriangle, CheckCircle2, Clock3, Layers3 } from "lucide-react"
import Image from "next/image"

import type { ArticleVisual, ArticleVisualItem } from "@/lib/blog/visuals"
import { cn } from "@/lib/utils"

const accentStyles: Record<ArticleVisual["accent"], { border: string; bg: string; text: string; soft: string }> = {
  amber: {
    border: "border-amber-200 dark:border-amber-800",
    bg: "bg-amber-50 dark:bg-amber-950/20",
    text: "text-amber-700 dark:text-amber-300",
    soft: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  },
  blue: {
    border: "border-blue-200 dark:border-blue-800",
    bg: "bg-blue-50 dark:bg-blue-950/20",
    text: "text-blue-700 dark:text-blue-300",
    soft: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  },
  emerald: {
    border: "border-emerald-200 dark:border-emerald-800",
    bg: "bg-emerald-50 dark:bg-emerald-950/20",
    text: "text-emerald-700 dark:text-emerald-300",
    soft: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  rose: {
    border: "border-rose-200 dark:border-rose-800",
    bg: "bg-rose-50 dark:bg-rose-950/20",
    text: "text-rose-700 dark:text-rose-300",
    soft: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  },
  sky: {
    border: "border-sky-200 dark:border-sky-800",
    bg: "bg-sky-50 dark:bg-sky-950/20",
    text: "text-sky-700 dark:text-sky-300",
    soft: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  },
}

const toneStyles: Record<NonNullable<ArticleVisualItem["tone"]>, string> = {
  caution: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  neutral: "bg-muted text-muted-foreground",
  safe: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  urgent: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
}

function VisualGlyph({ visual }: { visual: ArticleVisual }) {
  const styles = accentStyles[visual.accent]
  const Icon = visual.kind === "warning" ? AlertTriangle : visual.kind === "timeline" ? Clock3 : Layers3

  return (
    <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl border", styles.bg, styles.border)}>
      <Icon className={cn("h-5 w-5", styles.text)} />
    </div>
  )
}

function VisualItemRow({ item, index, visual }: { item: ArticleVisualItem; index: number; visual: ArticleVisual }) {
  const styles = accentStyles[visual.accent]
  const toneClass = toneStyles[item.tone ?? "neutral"]

  if (visual.kind === "flow" || visual.kind === "timeline") {
    return (
      <li className="grid grid-cols-[32px_1fr] gap-3">
        <div className="flex flex-col items-center">
          <span className={cn("flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold", styles.soft)}>
            {index + 1}
          </span>
          <span className="mt-1 h-full min-h-5 w-px bg-border last:hidden" />
        </div>
        <div className="pb-4">
          <p className="text-sm font-semibold text-foreground">{item.label}</p>
          <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{item.detail}</p>
        </div>
      </li>
    )
  }

  return (
    <li className="rounded-xl border border-border/50 bg-white px-3 py-3 shadow-sm shadow-primary/[0.03] dark:bg-card dark:shadow-none">
      <div className="flex items-start gap-3">
        {visual.kind === "warning" ? (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
        ) : (
          <CheckCircle2 className={cn("mt-0.5 h-4 w-4 shrink-0", styles.text)} />
        )}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{item.label}</p>
            {item.tone && (
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", toneClass)}>
                {item.tone}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.detail}</p>
        </div>
      </div>
    </li>
  )
}

function ArticleVisualPanel({ visual }: { visual: ArticleVisual }) {
  const styles = accentStyles[visual.accent]

  return (
    <figure className={cn("rounded-2xl border p-5 shadow-md shadow-primary/[0.04] dark:shadow-none", styles.bg, styles.border)}>
      <div className="flex items-start gap-4">
        <VisualGlyph visual={visual} />
        <div className="min-w-0">
          <p className={cn("text-xs font-semibold uppercase tracking-[0.08em]", styles.text)}>{visual.eyebrow}</p>
          <figcaption className="mt-1 text-lg font-semibold leading-snug text-foreground">{visual.title}</figcaption>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{visual.summary}</p>
        </div>
      </div>

      {visual.assetPath && (
        <div className="relative mt-5 aspect-[16/9] overflow-hidden rounded-xl border border-border/50 bg-white/70 dark:bg-card">
          <Image
            src={visual.assetPath}
            alt={`${visual.title}: ${visual.summary}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 760px"
          />
        </div>
      )}

      <ul
        className={cn(
          "mt-5",
          visual.kind === "flow" || visual.kind === "timeline"
            ? "space-y-0"
            : visual.kind === "comparison"
              ? "grid gap-3 sm:grid-cols-3"
              : "grid gap-3 sm:grid-cols-2",
        )}
      >
        {visual.items.map((item, index) => (
          <VisualItemRow key={`${visual.id}-${item.label}`} item={item} index={index} visual={visual} />
        ))}
      </ul>
    </figure>
  )
}

export function ArticleVisuals({ visuals }: { visuals: ArticleVisual[] }) {
  if (visuals.length === 0) return null

  return (
    <section aria-label="Visual guide" className="my-8 space-y-4">
      {visuals.map((visual) => (
        <ArticleVisualPanel key={visual.id} visual={visual} />
      ))}
    </section>
  )
}
