"use client"

import { AlertTriangle, CheckCircle2, Clock3, Layers3, Maximize2 } from "lucide-react"
import Image from "next/image"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { ArticleVisualItem, RenderableArticleVisual } from "@/lib/blog/visuals"
import { cn } from "@/lib/utils"

const accentStyles: Record<RenderableArticleVisual["accent"], { border: string; bg: string; text: string; soft: string }> = {
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

function VisualGlyph({ visual }: { visual: RenderableArticleVisual }) {
  const styles = accentStyles[visual.accent]
  const Icon = visual.kind === "warning" ? AlertTriangle : visual.kind === "timeline" ? Clock3 : Layers3

  return (
    <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl border", styles.bg, styles.border)}>
      <Icon className={cn("h-5 w-5", styles.text)} />
    </div>
  )
}

function VisualItemRow({
  item,
  index,
  visual,
}: {
  item: ArticleVisualItem
  index: number
  visual: RenderableArticleVisual
}) {
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

function ArticleVisualPanel({ visual }: { visual: RenderableArticleVisual }) {
  const styles = accentStyles[visual.accent]

  if (visual.assetPath) {
    const imageAlt = `${visual.title}: ${visual.summary}`

    return (
      <figure className="my-10">
        <div className="mb-3 flex items-center gap-3">
          <VisualGlyph visual={visual} />
          <div className="min-w-0">
            <p className={cn("text-xs font-semibold uppercase tracking-[0.08em]", styles.text)}>{visual.eyebrow}</p>
            <figcaption className="mt-1 text-base font-semibold leading-snug text-foreground">{visual.title}</figcaption>
          </div>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              className="group mx-auto block w-full max-w-[480px] cursor-zoom-in overflow-hidden rounded-xl border border-border/50 bg-white text-left shadow-sm shadow-primary/[0.04] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md hover:shadow-primary/[0.08] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-card dark:shadow-none"
              aria-label={`Open ${visual.title} in a larger view`}
            >
              <span className="relative block aspect-[2/3] w-full bg-white dark:bg-card">
                <Image
                  src={visual.assetPath}
                  alt={imageAlt}
                  fill
                  className="object-contain"
                  sizes="(max-width: 640px) 100vw, 480px"
                />
              </span>
              <span className="flex min-h-11 items-center justify-center gap-2 border-t border-border/50 bg-muted/40 px-3 py-2 text-sm font-medium text-foreground transition-colors duration-200 group-hover:bg-primary/5 dark:bg-white/[0.04]">
                <Maximize2 className="h-3.5 w-3.5" />
                View larger image
              </span>
            </button>
          </DialogTrigger>
          <DialogContent className="w-[calc(100vw-1rem)] max-w-5xl gap-0 overflow-hidden border-border/50 bg-white p-0 shadow-xl shadow-primary/[0.08] backdrop-blur-none dark:bg-card dark:shadow-none sm:w-[calc(100vw-2rem)]">
            <DialogHeader className="px-4 pb-3 pr-12 pt-4 sm:px-5 sm:pt-5">
              <DialogTitle className="text-base leading-snug sm:text-lg">{visual.title}</DialogTitle>
              <DialogDescription className="leading-relaxed">{visual.summary}</DialogDescription>
            </DialogHeader>
            <div className="max-h-[calc(100dvh-9rem)] overflow-auto bg-muted/40 p-3 dark:bg-white/[0.04] sm:p-5">
              <div className="mx-auto w-full max-w-[960px] overflow-hidden rounded-xl border border-border/50 bg-white shadow-sm shadow-primary/[0.04] dark:bg-card dark:shadow-none">
                <Image
                  src={visual.assetPath}
                  alt={imageAlt}
                  width={1200}
                  height={1800}
                  className="h-auto w-full"
                  sizes="(max-width: 1024px) 92vw, 960px"
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <p className="mx-auto mt-3 max-w-[480px] text-sm leading-relaxed text-muted-foreground">{visual.summary}</p>
      </figure>
    )
  }

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

export function ArticleVisuals({ visuals }: { visuals: RenderableArticleVisual[] }) {
  if (visuals.length === 0) return null

  return (
    <section aria-label="Visual guide" className="my-8 space-y-4">
      {visuals.map((visual) => (
        <ArticleVisualPanel key={visual.id} visual={visual} />
      ))}
    </section>
  )
}
