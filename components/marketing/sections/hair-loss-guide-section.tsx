"use client"

import { AlertTriangle, BadgeCheck } from "lucide-react"
import Link from "next/link"
import type React from "react"
import { useState } from "react"

import { StickerIcon, type StickerIconName } from "@/components/icons/stickers"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Reveal } from "@/components/ui/reveal"
import { NORWOOD_STAGES } from "@/lib/marketing/hair-loss-hook-quiz"
import { cn } from "@/lib/utils"

// =============================================================================
// STATIC DATA
// =============================================================================

const HAIR_LOSS_TYPES = [
  {
    heading: "Androgenetic alopecia (pattern hair loss)",
    body: "The most common cause by a wide margin. Follicles gradually shrink under hormonal influence. This is what online assessment is designed for, treatment works, and earlier is better.",
    status: "treatable" as const,
  },
  {
    heading: "Telogen effluvium",
    body: "Temporary shedding triggered by stress, illness, surgery, childbirth, or nutritional deficiencies. Usually resolves within 3–6 months once the trigger is addressed.",
    status: "resolves" as const,
  },
  {
    heading: "Traction alopecia",
    body: "Caused by repeated tension from tight hairstyles. Stops progressing once the tension is removed. Early cases often recover; long-standing cases can scar permanently.",
    status: "resolves" as const,
  },
  {
    heading: "Scarring alopecias (cicatricial)",
    body: "Inflammatory conditions that destroy follicles permanently. Need in-person specialist assessment. If you see visibly scarred or reddened patches of scalp, see a GP in person.",
    status: "specialist" as const,
  },
  {
    heading: "Autoimmune (alopecia areata)",
    body: "Sudden patchy loss caused by the immune system attacking follicles. Distinct from gradual androgenetic alopecia. Needs in-person assessment, telehealth is not the right first step here.",
    status: "specialist" as const,
  },
]

const GROWTH_PHASES = [
  {
    name: "Anagen",
    duration: "2–7 years",
    description: "Active growth. Most follicles on a healthy scalp are here. This is the phase where treatment has the most leverage.",
    color: "bg-primary/10 border-primary/30 dark:border-primary/20",
    label_color: "text-primary",
  },
  {
    name: "Catagen",
    duration: "2–3 weeks",
    description: "Short regression phase. The follicle detaches from its blood supply and prepares to shed.",
    color: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-700/50",
    label_color: "text-amber-600 dark:text-amber-400",
  },
  {
    name: "Telogen",
    duration: "3 months",
    description: "The follicle rests, then the old hair sheds to make room for a new one.",
    color: "bg-muted/50 border-border",
    label_color: "text-muted-foreground",
  },
]

const TIMELINE_MILESTONES = [
  { label: "M1", heading: "Month 1", body: "Paradoxical shedding sometimes increases as follicles shift phase, uncomfortable but expected.", color: "bg-muted/60 border-muted-foreground/25 dark:bg-muted/30", dot: "bg-muted-foreground/30" },
  { label: "M2", heading: "Month 2", body: "Shedding typically stabilises.", color: "bg-muted/60 border-muted-foreground/25 dark:bg-muted/30", dot: "bg-muted-foreground/30" },
  { label: "M3", heading: "Month 3", body: "First signs, hairline feels less thin, less shedding in the shower.", color: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-700/50", dot: "bg-amber-400" },
  { label: "M6", heading: "Month 6", body: "Clear improvement visible in photos compared to month 0.", color: "bg-primary/5 border-primary/25", dot: "bg-primary/60" },
  { label: "M9", heading: "Month 9", body: "Regrowth is usually obvious to the person and often to others.", color: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-700/50", dot: "bg-emerald-400" },
  { label: "M12", heading: "Month 12", body: "Full treatment window, most of the improvement that's going to happen has happened by now.", color: "bg-emerald-100 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-600/60", dot: "bg-emerald-500" },
]

// =============================================================================
// HELPERS
// =============================================================================

function GuideItem({
  value,
  sticker,
  title,
  children,
}: {
  value: string
  sticker: StickerIconName
  title: string
  children: React.ReactNode
}) {
  return (
    <AccordionItem
      value={value}
      className="rounded-xl border border-border/50 bg-white dark:bg-card shadow-sm shadow-primary/[0.03] px-5 data-[state=open]:shadow-md data-[state=open]:shadow-primary/[0.06] transition-shadow"
    >
      <AccordionTrigger className="py-4 hover:no-underline gap-3">
        <div className="flex items-center gap-3">
          <StickerIcon name={sticker} size={28} loading="eager" />
          <span className="text-[15px] font-semibold text-foreground text-left">{title}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="pl-10 pb-2">{children}</div>
      </AccordionContent>
    </AccordionItem>
  )
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 mt-2">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
          <span className="shrink-0 mt-2 w-1.5 h-1.5 rounded-full bg-primary/40" aria-hidden="true" />
          {item}
        </li>
      ))}
    </ul>
  )
}

/** Tap-to-reveal Norwood stage browser */
function NorwoodStagesReveal() {
  const [selectedStage, setSelectedStage] = useState<number>(1)
  const selected = NORWOOD_STAGES.find((s) => s.stage === selectedStage)

  return (
    <div>
      <div role="tablist" aria-label="Norwood hair loss stages" className="flex flex-wrap gap-2">
        {NORWOOD_STAGES.map((stage) => {
          const active = stage.stage === selectedStage
          return (
            <button
              key={stage.stage}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSelectedStage(stage.stage)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70",
              )}
            >
              {stage.label}
            </button>
          )
        })}
      </div>
      <div
        role="tabpanel"
        aria-live="polite"
        className="mt-4 rounded-xl border border-border/50 bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground"
      >
        {selected ? (
          <>
            <span className="font-medium text-foreground">{selected.label}:</span>{" "}
            {selected.description}
          </>
        ) : null}
      </div>
    </div>
  )
}

// =============================================================================
// COMPONENT
// =============================================================================

/** Long-form E-E-A-T content, hair loss biology, treatments, safety, telehealth */
export function HairLossGuideSection() {
  return (
    <section aria-label="Hair loss treatment guide" className="py-16 lg:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <Reveal instant className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary mb-4">
            <BadgeCheck className="h-3.5 w-3.5" />
            Medically reviewed by AHPRA-registered GPs
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight mb-3">
            Everything you need to know about hair loss treatment
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">
            The science, the options, and what to actually expect.
          </p>
        </Reveal>

        <Accordion type="multiple" defaultValue={["understanding"]} className="space-y-2">

          {/* 1. Understanding hair loss */}
          <GuideItem value="understanding" sticker="brain" title="Understanding hair loss in Australia">
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-lg bg-primary/5 border border-primary/15 p-3 text-center">
                  <p className="text-2xl font-bold text-primary">50%</p>
                  <p className="text-xs text-muted-foreground mt-0.5">of men over 50 affected</p>
                </div>
                <div className="rounded-lg bg-primary/5 border border-primary/15 p-3 text-center">
                  <p className="text-2xl font-bold text-primary">40%</p>
                  <p className="text-xs text-muted-foreground mt-0.5">of women by menopause</p>
                </div>
              </div>
              <Bullets items={[
                "Androgenetic alopecia (pattern hair loss) is the most common type, driven by DHT, a hormone derived from testosterone that gradually miniaturises hair follicles.",
                "Men typically see recession at the temples and crown; women usually see diffuse thinning across the top of the scalp.",
                "The Norwood scale (men) and Ludwig scale (women) classify severity and guide treatment decisions.",
                "It's significantly easier to maintain existing hair than to regrow what's already been lost, early intervention isn't marketing, it's biology.",
              ]} />
            </div>
          </GuideItem>

          {/* 2. Types of hair loss */}
          <GuideItem value="types" sticker="checklist" title="Types of hair loss: what's treatable and what isn't">
            <div className="space-y-3 pt-1">
              <p className="text-sm text-muted-foreground">
                Not every kind of hair loss responds the same way. A quick taxonomy so you know where yours fits.
              </p>
              <div className="space-y-2">
                {HAIR_LOSS_TYPES.map((block) => {
                  const colors =
                    block.status === "treatable"
                      ? "border-l-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/20"
                      : block.status === "resolves"
                        ? "border-l-amber-400 bg-amber-50/60 dark:bg-amber-950/20"
                        : "border-l-rose-400 bg-rose-50/60 dark:bg-rose-950/20"
                  const badge =
                    block.status === "treatable"
                      ? { label: "Treatable online", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400" }
                      : block.status === "resolves"
                        ? { label: "Often self-resolving", cls: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400" }
                        : { label: "Needs specialist", cls: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400" }
                  return (
                    <div key={block.heading} className={cn("rounded-lg border-l-4 border border-border/30 p-3.5", colors)}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-xs font-semibold text-foreground">{block.heading}</p>
                        <span className={cn("shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full", badge.cls)}>
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{block.body}</p>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground italic">
                Not sure which category you're in? The intake form asks the right questions to route you appropriately.
              </p>
            </div>
          </GuideItem>

          {/* 3. Hair growth cycle */}
          <GuideItem value="growth-cycle" sticker="synchronize" title="The hair growth cycle, explained">
            <div className="space-y-3 pt-1">
              <p className="text-sm text-muted-foreground">
                Hair doesn't grow continuously. Each follicle cycles through three phases, and that's why treatment takes months to show results.
              </p>
              <div className="flex items-stretch gap-1.5">
                {GROWTH_PHASES.map((phase, i) => (
                  <div key={phase.name} className="flex items-center gap-1.5 flex-1 min-w-0">
                    <div className={cn("flex-1 rounded-xl border p-3 text-center", phase.color)}>
                      <p className={cn("text-sm font-bold mb-0.5", phase.label_color)}>{phase.name}</p>
                      <p className="text-[10px] font-medium text-muted-foreground">{phase.duration}</p>
                      <p className="text-[10px] text-muted-foreground mt-1.5 leading-snug hidden sm:block">
                        {phase.description}
                      </p>
                    </div>
                    {i < GROWTH_PHASES.length - 1 && (
                      <span className="text-muted-foreground/40 text-sm shrink-0">→</span>
                    )}
                  </div>
                ))}
              </div>
              {/* Phase descriptions for mobile */}
              <div className="sm:hidden space-y-1.5">
                {GROWTH_PHASES.map((phase) => (
                  <p key={phase.name} className="text-xs text-muted-foreground leading-relaxed">
                    <span className={cn("font-semibold", phase.label_color)}>{phase.name}:</span>{" "}
                    {phase.description}
                  </p>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Treatment shifts follicles out of telogen and back into anagen, which is why you often see MORE shedding in the first month before things improve. It's working.
              </p>
            </div>
          </GuideItem>

          {/* 4. Treatment options */}
          <GuideItem value="treatments" sticker="syringe" title="Evidence-based treatment options">
            <div className="space-y-3 pt-1">
              <div className="rounded-lg bg-primary/5 border border-primary/15 p-3 flex items-start gap-2.5">
                <BadgeCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-foreground">
                  Both treatment categories are TGA-registered in Australia, approved for safety, quality, and efficacy.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-2.5">
                <div className="rounded-lg border border-primary/20 bg-primary/[0.03] p-3.5">
                  <p className="text-xs font-semibold text-foreground mb-1.5">Oral prescription tablet</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">Blocks the enzyme that converts testosterone to DHT. Slows or stops hair loss; may allow partial regrowth. Taken daily. Most effective for crown and mid-scalp.</p>
                  <p className="text-[10px] font-medium text-primary mt-2">What InstantMed doctors prescribe</p>
                </div>
                <div className="rounded-lg border border-border/50 bg-muted/30 p-3.5">
                  <p className="text-xs font-semibold text-foreground mb-1.5">Topical scalp treatment (OTC)</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">Stimulates blood flow to follicles and prolongs the growth phase. Applied once or twice daily. Available from any pharmacy without a prescription.</p>
                  <p className="text-[10px] font-medium text-muted-foreground mt-2">Often used alongside oral treatment</p>
                </div>
              </div>
              <Bullets items={[
                "Results take time, 3 months minimum to see reduced shedding, 6–12 months for visible regrowth.",
                "Stopping at month 4 because you haven't seen results yet is the single most common reason treatment 'doesn't work', you haven't given it long enough.",
              ]} />
            </div>
          </GuideItem>

          {/* 5. Treatment timeline */}
          <GuideItem value="timeline" sticker="clock" title="Typical treatment timeline">
            <div className="space-y-3 pt-1">
              <p className="text-sm text-muted-foreground">Month by month, what most patients experience on consistent treatment.</p>
              <div className="space-y-2">
                {TIMELINE_MILESTONES.map((m, i) => (
                  <div key={m.label} className="flex items-start gap-3">
                    <div className={cn("shrink-0 w-10 h-10 rounded-xl border flex flex-col items-center justify-center mt-0.5", m.color)}>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide leading-none">mo</span>
                      <span className="text-base font-bold text-foreground leading-tight">{i + 1 <= 2 ? i + 1 : m.label.replace("M", "")}</span>
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <p className="text-sm font-semibold text-foreground">{m.heading}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{m.body}</p>
                    </div>
                    <div className={cn("shrink-0 w-2.5 h-2.5 rounded-full mt-3", m.dot)} />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground italic">This is an average. Consistency matters more than anything else.</p>
            </div>
          </GuideItem>

          {/* 6. Consultation */}
          <GuideItem value="consultation" sticker="stethoscope" title="What happens during a hair loss consultation">
            <div className="space-y-3 pt-1">
              <div className="rounded-lg bg-muted/30 border border-border/50 p-3">
                <p className="text-xs font-semibold text-foreground mb-2">Your doctor checks five things:</p>
                <ul className="space-y-1.5">
                  {[
                    "Pattern of hair loss, consistent with androgenetic alopecia, or diffuse, patchy, or scarring?",
                    "Duration and rate of progression, stable, slowly worsening, or accelerating?",
                    "Current medications and supplements, some cause or contribute to shedding",
                    "Family history on both sides, your maternal grandfather's pattern is as relevant as your father's",
                    "Recent health changes, thyroid symptoms, weight changes, stress, or recent illness",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary/50 mt-1.5" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <Bullets items={[
                "You may be asked to upload scalp photos, they're genuinely diagnostic and often more informative than a physical examination.",
                "Based on the assessment, your doctor creates a personalised plan: which treatment, what strength, what to expect, and when to follow up.",
                "Hair loss is well-suited to telehealth, diagnosis is primarily history-based, monitoring is photo-based, and there's nothing that requires a stethoscope.",
                "Many people delay treatment because they find it embarrassing. Online consultations remove that barrier entirely.",
              ]} />
            </div>
          </GuideItem>

          {/* 7. Side effects */}
          <GuideItem value="side-effects" sticker="warning" title="Side effects and safety">
            <div className="space-y-3 pt-1">
              <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3 flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-destructive mb-1">Hard stop: pregnancy</p>
                  <p className="text-xs text-muted-foreground">
                    Women who are pregnant, breastfeeding, or may become pregnant must not take or handle oral DHT-blocking tablets. Risk of birth defects in a male fetus is clearly established, hard contraindication, not a precaution.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  { heading: "Physical", body: "Scalp irritation from topical treatments is the most common side effect, usually manageable by switching formulation. Side effects from oral treatment are uncommon and generally reversible." },
                  { heading: "Sexual function and mood", body: "A small percentage on oral treatment report changes in libido, sexual function, or mood. Data is genuinely mixed on frequency and persistence. Flag it if you notice anything." },
                  { heading: "How to spot them early", body: "Keep a note of how you feel in the first 2–3 months. If something shifts, flag it to the doctor. Clear baselines make follow-up much more useful." },
                ].map((block) => (
                  <div key={block.heading} className="rounded-lg bg-muted/30 border border-border/50 p-3">
                    <p className="text-xs font-semibold text-foreground mb-1.5">{block.heading}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{block.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </GuideItem>

          {/* 8. Ongoing treatment */}
          <GuideItem value="ongoing" sticker="pill-bottle" title="Ongoing treatment and repeat prescriptions">
            <div className="space-y-3 pt-1">
              <Bullets items={[
                "Hair loss treatment is maintenance, not a course, the improvement you achieve is preserved only as long as you keep taking it.",
                "After your initial consultation, repeat prescriptions are available through a short follow-up form. No need to retell your full history each time.",
                "Each repeat is a fresh clinical decision by a doctor, not an auto-renewal algorithm.",
              ]} />
              <Link
                href="/prescriptions"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Request a repeat prescription
                <span aria-hidden="true">→</span>
              </Link>
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700/50 p-3.5">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">
                  If you stop treatment
                </p>
                <p className="text-xs text-muted-foreground">
                  Hair that was preserved or regrown typically reverts within 6–12 months of stopping, often back to where you'd have been if you'd never started. Factor ongoing commitment into the decision before you begin.
                </p>
              </div>
            </div>
          </GuideItem>

          {/* 9. Norwood stages */}
          <GuideItem value="norwood" sticker="pulse" title="Norwood stages at a glance">
            <div className="space-y-3 pt-1">
              <p className="text-sm text-muted-foreground">
                The Norwood scale classifies male pattern hair loss from minor temple recession through extensive loss. Tap a stage to see what it describes.
              </p>
              <NorwoodStagesReveal />
            </div>
          </GuideItem>
        </Accordion>

        <Reveal className="mt-8 pt-6 border-t border-border/40 text-center" delay={0.3}>
          <p className="text-xs text-muted-foreground">
            All clinical decisions are made by AHPRA-registered doctors following{" "}
            <Link href="/clinical-governance" className="text-primary hover:underline">
              our clinical governance framework
            </Link>
            . We never automate clinical decisions.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
