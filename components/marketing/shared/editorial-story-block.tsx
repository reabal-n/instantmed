import { Heading } from "@/components/ui/heading"
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
    <div className="flex items-baseline gap-4 py-5 my-2">
      <span className={cn("text-4xl sm:text-5xl font-light tracking-tight tabular-nums", color ?? "text-primary")}>
        {value}
      </span>
      <span className="text-sm text-muted-foreground font-medium max-w-xs">{label}</span>
    </div>
  )
}

function PullQuote({ quote, attribution }: { quote: string; attribution?: string }) {
  return (
    <blockquote className="py-4 my-2 text-center max-w-xl mx-auto">
      <p className="text-lg sm:text-xl font-light text-foreground italic leading-relaxed text-balance">
        &ldquo;{quote}&rdquo;
      </p>
      {attribution && (
        <cite className="block mt-3 text-xs text-muted-foreground not-italic font-medium tracking-wide uppercase">
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

        <Heading level="h2" className="mb-3">
          {title}
        </Heading>

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
