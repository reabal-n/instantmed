import { Reveal } from "@/components/ui/reveal"
import { SectionPill } from "@/components/ui/section-pill"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StoryBlock =
  | { type: "paragraph"; content: string }
  | { type: "stat-callout"; value: string; label: string; color?: string }
  | { type: "pull-quote"; quote: string; attribution?: string }

export interface EditorialStoryBlockProps {
  pill?: string
  title: string
  subtitle?: string
  blocks: StoryBlock[]
  className?: string
}

// ---------------------------------------------------------------------------
// Block renderers
// ---------------------------------------------------------------------------

function ParagraphBlock({ content }: { content: string }) {
  return (
    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-prose">
      {content}
    </p>
  )
}

function StatCallout({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <div className="flex items-baseline gap-3 py-4 border-l-2 border-primary/30 pl-6 my-2">
      <span className={cn("text-3xl sm:text-4xl font-light tracking-tight", color ?? "text-primary")}>
        {value}
      </span>
      <span className="text-sm text-muted-foreground font-medium">{label}</span>
    </div>
  )
}

function PullQuote({ quote, attribution }: { quote: string; attribution?: string }) {
  return (
    <blockquote className="relative py-4 my-2 pl-6 border-l-2 border-primary/20">
      <p className="text-base sm:text-lg font-light text-foreground italic leading-relaxed">
        &ldquo;{quote}&rdquo;
      </p>
      {attribution && (
        <cite className="block mt-2 text-xs text-muted-foreground not-italic font-medium">
          {attribution}
        </cite>
      )}
    </blockquote>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function EditorialStoryBlock({
  pill,
  title,
  subtitle,
  blocks,
  className,
}: EditorialStoryBlockProps) {
  return (
    <section className={cn("py-16 lg:py-24", className)}>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {pill && (
          <div className="mb-4">
            <SectionPill>{pill}</SectionPill>
          </div>
        )}

        <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight mb-3">
          {title}
        </h2>

        {subtitle && (
          <p className="text-sm text-muted-foreground mb-8 max-w-lg">{subtitle}</p>
        )}

        <div className="space-y-5">
          {blocks.map((block, i) => (
            <Reveal key={i} delay={i * 0.05}>
              {block.type === "paragraph" && <ParagraphBlock content={block.content} />}
              {block.type === "stat-callout" && (
                <StatCallout value={block.value} label={block.label} color={block.color} />
              )}
              {block.type === "pull-quote" && (
                <PullQuote quote={block.quote} attribution={block.attribution} />
              )}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
