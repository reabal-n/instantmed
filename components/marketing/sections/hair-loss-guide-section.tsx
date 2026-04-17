"use client"

import {
  AlertTriangle,
  BadgeCheck,
  Brain,
  CalendarClock,
  FlaskConical,
  Layers,
  LineChart,
  Monitor,
  RefreshCw,
  Repeat,
  ShieldAlert,
  Stethoscope,
} from "lucide-react"
import Link from "next/link"
import type React from "react"
import { useState } from "react"

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
// DATA - all content preserved for SEO (E-E-A-T)
// =============================================================================

const GUIDE_SECTIONS = [
  {
    id: "understanding",
    icon: Brain,
    title: "Understanding hair loss in Australia",
    paragraphs: [
      "Hair loss is one of the most common medical conditions in Australia - and one of the least discussed. Androgenetic alopecia (pattern hair loss) affects roughly 50% of men over 50 and around 40% of women experience noticeable thinning by menopause. Despite how common it is, many people treat it as a cosmetic concern rather than what it actually is: a medical condition with well-understood biology and effective treatments.",
      "The primary driver in most cases is dihydrotestosterone (DHT), a hormone derived from testosterone. DHT binds to receptors in hair follicles - particularly at the crown and temples in men - and gradually miniaturises them. Each growth cycle produces a thinner, shorter hair until the follicle eventually stops producing visible hair altogether. In women, the pattern is different: thinning tends to be diffuse across the top of the scalp rather than receding at the hairline.",
      "Doctors classify male pattern hair loss using the Norwood scale (seven stages from minor temple recession to extensive loss) and female pattern hair loss using the Ludwig scale (three stages of increasing diffuse thinning). These classification systems aren't just academic - they help determine which treatments are most appropriate and set realistic expectations. The single most important thing to understand: it is significantly easier to maintain existing hair than to regrow what's already been lost. Early intervention isn't marketing - it's biology.",
      "Not all hair loss is pattern hair loss, and that distinction matters for treatment. Telogen effluvium is a diffuse shedding triggered by a physiological stress - major illness, rapid weight change, childbirth, surgery, or a traumatic life event - usually beginning two to three months after the trigger and resolving on its own over six to twelve months once the underlying cause is addressed. Alopecia areata is an autoimmune condition that causes well-defined circular patches of sudden hair loss and is clinically distinct from androgenetic alopecia in both appearance and treatment. Nutritional and medical factors - iron deficiency, thyroid dysfunction, severe calorie or protein restriction, and certain vitamin deficiencies - can cause or amplify hair thinning. A responsible consultation rules these out before prescribing long-term treatment for pattern hair loss.",
    ],
  },
  {
    id: "treatments",
    icon: FlaskConical,
    title: "Evidence-based treatment options",
    paragraphs: [
      "Both treatment categories used for pattern hair loss are TGA-registered in Australia. That means the Therapeutic Goods Administration has reviewed the safety, quality, and efficacy data before approving them for use - they are not supplements, wellness products, or unregulated compounded formulations. Decades of peer-reviewed randomised controlled trials support the mechanisms and outcomes described below, and every prescription we issue is for a TGA-approved product dispensed through an Australian pharmacy.",
      "There are two main categories of treatment for pattern hair loss, both supported by decades of clinical evidence. The first is a prescription oral treatment that works by blocking the enzyme responsible for converting testosterone to DHT - the hormone that miniaturises hair follicles. By reducing DHT levels, this treatment slows or stops further hair loss and, in many cases, allows partially miniaturised follicles to recover. It's taken as a daily tablet and is most effective for hair loss at the crown and mid-scalp. Most people see reduced shedding within three months, with visible improvement by six to twelve months. This is the treatment InstantMed doctors prescribe.",
      "The second approach is a topical treatment applied directly to the scalp. It works by stimulating blood flow to hair follicles and prolonging the growth phase of the hair cycle. Available in different strengths and formulations (liquid and foam), it's applied once or twice daily depending on the preparation. Standard-strength formulations are available over the counter from any Australian pharmacy without a prescription.",
      "Many people use both treatments together - the oral prescription addresses the hormonal cause while the over-the-counter topical treatment directly stimulates follicle activity. Your doctor may prescribe oral treatment and recommend a complementary pharmacy-available topical as part of a combination approach.",
      "Results take time. Three months is the minimum to see reduced shedding, and six to twelve months for meaningful regrowth. Anyone promising faster results is selling something other than medicine. Stopping treatment at month four because you haven't seen regrowth yet is the single most common reason hair loss treatment 'doesn't work' - you simply haven't given it long enough.",
    ],
  },
  {
    id: "consultation",
    icon: Stethoscope,
    title: "What happens during a hair loss consultation",
    paragraphs: [
      "A hair loss consultation starts with your medical history - not just your hair. Your doctor will ask about family history of hair loss (both sides matter, not just your father's), when you first noticed thinning, and how it's progressed. They'll also screen for other conditions that can cause or worsen hair loss: thyroid disorders, iron deficiency, hormonal imbalances, stress, and certain medications. Hair loss can be a symptom of something else entirely, and a responsible doctor checks before prescribing.",
      "You may be asked to provide photos of your scalp from specific angles. For pattern hair loss, photos are genuinely diagnostic - they show distribution, density, and miniaturisation in ways that are often more informative than a physical examination. Your doctor will assess whether your pattern is consistent with androgenetic alopecia or whether further investigation (blood tests, specialist referral) is warranted.",
      "Based on this assessment, your doctor creates a personalised treatment plan. This includes which treatment approach is appropriate, what strength and formulation to use, what results to realistically expect, and when to follow up. Not everyone is a candidate for every treatment - and a good consultation is as much about ruling things out as it is about prescribing.",
      "Specifically, your doctor is looking at five things: the pattern of your hair loss (is it consistent with androgenetic alopecia, or is it diffuse, patchy, or scarring?), the duration and rate of progression (stable, slowly worsening, or accelerating?), your current medications and supplements (some can cause or contribute to shedding), your family history on both sides (your maternal grandfather's pattern is as relevant as your father's), and any recent health changes - thyroid symptoms, weight changes, stress, or recent illness.",
    ],
  },
  {
    id: "side-effects",
    icon: ShieldAlert,
    title: "Side effects and safety",
    paragraphs: [
      "Honesty about side effects isn't a liability - it's the reason you should trust a service. Oral treatments that block DHT can cause sexual side effects in a small percentage of users: approximately 1-2% may experience decreased libido, erectile difficulty, or reduced ejaculate volume. In the vast majority of cases, these effects are mild and resolve completely after stopping the medication. There are rare reports of persistent effects, though large-scale studies suggest this is uncommon.",
      "Over-the-counter topical treatments are generally well tolerated. The most common side effect is scalp irritation - dryness, flaking, or itching at the application site. Some people experience unwanted hair growth on areas adjacent to the application site (forehead, cheeks), which is why careful application matters. Rarely, topical treatments can cause dizziness or heart palpitations, particularly at higher strengths.",
      "Women should not use oral DHT-blocking treatments due to the risk of birth defects during pregnancy. This is a hard contraindication, not a precaution. For all treatments, ongoing monitoring is part of the process - your doctor adjusts the plan based on how you respond, both in terms of results and any side effects. A treatment that works brilliantly on paper but makes you miserable in practice isn't a good treatment.",
      "Not everyone is a candidate for oral hair loss treatment. Women who are pregnant, breastfeeding, or may become pregnant must not take or handle oral DHT-blocking tablets - the risk of birth defects in a male fetus is clearly established and is a hard contraindication. People with significant liver disease generally shouldn't take oral hair loss treatment either. Your doctor screens for these factors during the assessment. Over-the-counter topical treatment remains an option for most people who can't take the oral form.",
    ],
  },
  {
    id: "online-treatment",
    icon: Monitor,
    title: "Why online treatment works for hair loss",
    paragraphs: [
      "Hair loss is one of the conditions best suited to telehealth. Diagnosis is primarily history-based: your family pattern, age of onset, and progression tell a doctor most of what they need to know. Scalp photos - which you can take at home with a phone - are highly informative for assessing distribution and severity. There is no blood pressure to measure, no lump to palpate, no stethoscope required. Pattern hair loss is, diagnostically, a condition made for remote assessment.",
      "Follow-up is equally straightforward. Treatment monitoring means checking: is the shedding slowing? Is there visible improvement? Are there any side effects? All of this can be communicated through a brief questionnaire and updated photos. Regular check-ins are easy to schedule and don't require taking time off work or sitting in a waiting room.",
      "There's also a practical reality that matters: many people delay seeking treatment for hair loss because they find it embarrassing. Online consultations remove that barrier entirely. You complete a medical questionnaire, upload photos, and a doctor reviews everything privately. No waiting room, no small talk, no judgement. Given that early treatment produces the best results, anything that gets people to act sooner is genuinely good medicine.",
    ],
  },
  {
    id: "continuing-treatment",
    icon: Repeat,
    title: "Ongoing treatment and repeat prescriptions",
    paragraphs: [
      "Hair loss treatment is not a course - it's an ongoing commitment. Once you and your doctor land on a regimen that works, the goal is continuity. The improvement you achieve in the first twelve months is maintained only as long as you keep taking the treatment. Stopping is the fastest way to lose what you gained, typically within six to twelve months of your last dose.",
      "Because of that reality, we've made the repeat prescription flow deliberately low-friction. After your initial consultation, you can request follow-up prescriptions through a short repeat questionnaire. An AHPRA-registered doctor confirms you're tolerating the treatment, screens for any new conditions or medications, and either re-issues the prescription or recommends a follow-up review. There's no need to retell your full history every time, but there's no 'approval on autopilot' either - each repeat is a fresh clinical decision made by a human doctor.",
      "If you prefer set-and-forget, you can opt into a monthly repeat subscription. It schedules the doctor review and eScript issue for you each month at a flat fee, and you can pause or cancel at any time from your dashboard. Either way, the ongoing clinical responsibility stays with an Australian-registered doctor - not an algorithm, and not a form with a rubber stamp.",
    ],
    link: { href: "/prescriptions", label: "Request a repeat prescription" },
  },
] as const

const EXTENDED_GUIDE_SECTIONS = [
  {
    id: "types-of-hair-loss",
    icon: Layers,
    title: "Types of hair loss: what's treatable and what isn't",
    opening:
      "Not every kind of hair loss responds the same way - and a few kinds don't respond to online assessment at all. A quick taxonomy so you know where yours fits.",
    mini_blocks: [
      {
        heading: "Androgenetic alopecia (male and female pattern)",
        body: "The most common cause by a wide margin. Follicles gradually shrink under hormonal influence. This is what online assessment is built for - treatment works, and the earlier you start, the more you preserve.",
        status: "treatable" as const,
      },
      {
        heading: "Telogen effluvium",
        body: "Temporary shedding triggered by stress, illness, surgery, childbirth, thyroid issues, or nutritional deficiencies. Often resolves on its own within 3-6 months once the trigger is addressed. A doctor can help identify the trigger.",
        status: "resolves" as const,
      },
      {
        heading: "Traction alopecia",
        body: "Caused by repeated pulling or tension - tight ponytails, braids, certain hairstyles. Stops progressing once the tension is removed. Early-caught cases often recover; long-standing cases can leave permanent scarring.",
        status: "resolves" as const,
      },
      {
        heading: "Scarring alopecias (cicatricial)",
        body: "A group of inflammatory conditions that destroy follicles permanently. These need in-person specialist assessment (dermatologist). Online assessment is not appropriate - if you see visibly scarred or reddened patches of scalp, please see a GP in person.",
        status: "specialist" as const,
      },
      {
        heading: "Autoimmune (alopecia areata)",
        body: "Sudden patchy hair loss caused by the immune system attacking follicles. Distinct from the gradual recession of androgenetic alopecia. These also need in-person assessment - online telehealth is not the right first step.",
        status: "specialist" as const,
      },
    ],
    closing:
      "If you're not sure which category you're in, the intake flow asks the right questions to route you appropriately.",
  },
  {
    id: "growth-cycle",
    icon: RefreshCw,
    title: "The hair growth cycle, explained",
    opening:
      "Hair doesn't grow continuously. Each follicle cycles through three phases - and that's why treatment takes months to show results.",
    phases: [
      {
        name: "Anagen",
        duration: "2-7 years",
        description: "Active growth. Most follicles on a healthy scalp are in anagen at any given time. This is the phase where treatment has the most leverage.",
        color: "bg-primary/10 border-primary/30 dark:border-primary/20",
        label_color: "text-primary",
      },
      {
        name: "Catagen",
        duration: "2-3 weeks",
        description: "A short regression phase where the follicle detaches from its blood supply and prepares to shed.",
        color: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-700/50",
        label_color: "text-amber-600 dark:text-amber-400",
      },
      {
        name: "Telogen",
        duration: "3 months",
        description: "The follicle rests, then the old hair sheds to make room for a new one. Seeing more shed hair in the shower usually means telogen, not catastrophe.",
        color: "bg-muted/50 border-border",
        label_color: "text-muted-foreground",
      },
    ],
    closing:
      "Treatment shifts follicles out of telogen and back into anagen - which is why you often see MORE shedding in the first month of treatment before things improve. It's working; it just doesn't feel like it yet.",
  },
  {
    id: "typical-timeline",
    icon: CalendarClock,
    title: "Typical treatment timeline",
    opening:
      "Month by month, what most patients experience on consistent treatment.",
    milestones: [
      { label: "M1", heading: "Month 1", body: "Paradoxical shedding sometimes increases as follicles shift phase. Uncomfortable but expected.", color: "bg-muted/60 border-muted-foreground/25 dark:bg-muted/30", dot: "bg-muted-foreground/30" },
      { label: "M2", heading: "Month 2", body: "Shedding typically stabilises.", color: "bg-muted/60 border-muted-foreground/25 dark:bg-muted/30", dot: "bg-muted-foreground/30" },
      { label: "M3", heading: "Month 3", body: "First signs in the mirror - hairline feels less thin, shedding in the shower less dramatic.", color: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-700/50", dot: "bg-amber-400" },
      { label: "M6", heading: "Month 6", body: "Clear improvement visible in photos compared to month 0.", color: "bg-primary/5 border-primary/25", dot: "bg-primary/60" },
      { label: "M9", heading: "Month 9", body: "Regrowth is usually obvious to the person and often to others.", color: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-700/50", dot: "bg-emerald-400" },
      { label: "M12", heading: "Month 12", body: "Full treatment window - most of the improvement that's going to happen has happened by now.", color: "bg-emerald-100 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-600/60", dot: "bg-emerald-500" },
    ],
    closing:
      "This is an average. Some people respond faster, some slower. Consistency matters more than anything else.",
  },
  {
    id: "side-effects-honest",
    icon: ShieldAlert,
    title: "Side effects: the honest version",
    opening:
      "Most side effects are uncommon, but it's worth knowing what to watch for.",
    mini_blocks: [
      {
        heading: "Physical",
        body: "Scalp irritation from over-the-counter topical treatments is the most common issue and usually manageable by switching formulation. Side effects from oral prescription treatment are uncommon and usually reversible if treatment stops.",
      },
      {
        heading: "Mental health and sexual function",
        body: "A small percentage of patients on oral treatment report changes in mood, libido, or sexual function. The data is genuinely mixed on how often this happens and how persistent it is. If you notice any of these while on treatment, tell the doctor.",
      },
      {
        heading: "How to spot them early",
        body: "Keep a note of how you feel in the first 2-3 months. If something shifts, flag it. Doctors are much more effective when they have a clear baseline to compare against.",
      },
    ],
  },
  {
    id: "if-you-stop",
    icon: RefreshCw,
    title: "If you stop treatment",
    opening: "Be honest with yourself about this one before you start.",
    body: "Treatment is effectively maintenance - not a cure. If you stop, hair that was preserved or regrown on treatment typically reverts within 6-12 months, often back to where you'd have been if you'd never started. That's not a reason to avoid treatment - it's a reason to factor ongoing commitment into the decision. If budget or lifestyle makes long-term commitment impractical, talk to the doctor about whether treatment is the right move for you right now.",
  },
] as const

// =============================================================================
// HELPERS
// =============================================================================

function GuideItem({
  value,
  icon: Icon,
  title,
  children,
}: {
  value: string
  icon: React.ElementType
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
          <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <span className="text-[15px] font-semibold text-foreground text-left">{title}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="pl-11 pb-2">{children}</div>
      </AccordionContent>
    </AccordionItem>
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

/** Long-form E-E-A-T content section - hair loss biology, treatments, safety, telehealth suitability */
export function HairLossGuideSection() {
  const typesData = EXTENDED_GUIDE_SECTIONS[0]
  const growthData = EXTENDED_GUIDE_SECTIONS[1]
  const timelineData = EXTENDED_GUIDE_SECTIONS[2]
  const sideEffectsHonest = EXTENDED_GUIDE_SECTIONS[3]
  const ifYouStop = EXTENDED_GUIDE_SECTIONS[4]

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
            The science, the options, and what to actually expect - without the marketing spin.
          </p>
        </Reveal>

        <Accordion type="multiple" defaultValue={["understanding"]} className="space-y-2">

          {/* 1. Understanding hair loss */}
          <GuideItem value="understanding" icon={Brain} title="Understanding hair loss in Australia">
            <div className="space-y-4 pt-1">
              {/* Stat callout */}
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
              {GUIDE_SECTIONS[0].paragraphs.map((p, i) => (
                <p key={i} className="text-sm text-muted-foreground leading-relaxed">{p}</p>
              ))}
            </div>
          </GuideItem>

          {/* 2. Types of hair loss - colored card grid */}
          <GuideItem value="types" icon={Layers} title="Types of hair loss: what's treatable and what isn't">
            <div className="space-y-4 pt-1">
              <p className="text-sm text-muted-foreground leading-relaxed">{typesData.opening}</p>
              <div className="space-y-2.5">
                {typesData.mini_blocks.map((block) => {
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
                      <div className="flex items-start justify-between gap-2 mb-1.5">
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
              <p className="text-xs text-muted-foreground italic">{typesData.closing}</p>
            </div>
          </GuideItem>

          {/* 3. Hair growth cycle - 3-phase visual */}
          <GuideItem value="growth-cycle" icon={RefreshCw} title="The hair growth cycle, explained">
            <div className="space-y-4 pt-1">
              <p className="text-sm text-muted-foreground leading-relaxed">{growthData.opening}</p>
              {/* 3-phase visual */}
              <div className="flex items-stretch gap-1.5">
                {growthData.phases.map((phase, i) => (
                  <div key={phase.name} className="flex items-center gap-1.5 flex-1 min-w-0">
                    <div className={cn("flex-1 rounded-xl border p-3 text-center", phase.color)}>
                      <p className={cn("text-sm font-bold mb-0.5", phase.label_color)}>{phase.name}</p>
                      <p className="text-[10px] font-medium text-muted-foreground">{phase.duration}</p>
                      <p className="text-[10px] text-muted-foreground mt-1.5 leading-snug hidden sm:block">
                        {phase.description}
                      </p>
                    </div>
                    {i < growthData.phases.length - 1 && (
                      <span className="text-muted-foreground/40 text-sm shrink-0">→</span>
                    )}
                  </div>
                ))}
              </div>
              {/* Phase descriptions for mobile (hidden on sm+) */}
              <div className="sm:hidden space-y-2">
                {growthData.phases.map((phase) => (
                  <p key={phase.name} className="text-xs text-muted-foreground leading-relaxed">
                    <span className={cn("font-semibold", phase.label_color)}>{phase.name}:</span>{" "}
                    {phase.description}
                  </p>
                ))}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{growthData.closing}</p>
            </div>
          </GuideItem>

          {/* 4. Evidence-based treatments */}
          <GuideItem value="treatments" icon={FlaskConical} title="Evidence-based treatment options">
            <div className="space-y-4 pt-1">
              {/* TGA badge */}
              <div className="rounded-lg bg-primary/5 border border-primary/15 p-3 flex items-start gap-2.5">
                <BadgeCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-foreground">
                  Both treatment categories are TGA-registered in Australia - reviewed for safety, quality, and efficacy before approval.
                </p>
              </div>
              {GUIDE_SECTIONS[1].paragraphs.map((p, i) => (
                <p key={i} className="text-sm text-muted-foreground leading-relaxed">{p}</p>
              ))}
            </div>
          </GuideItem>

          {/* 5. Treatment timeline - visual milestone stepper */}
          <GuideItem value="timeline" icon={CalendarClock} title="Typical treatment timeline">
            <div className="space-y-4 pt-1">
              <p className="text-sm text-muted-foreground leading-relaxed">{timelineData.opening}</p>
              <div className="space-y-2">
                {timelineData.milestones.map((m, i) => (
                  <div key={m.label} className="flex items-start gap-3">
                    <div className={cn("shrink-0 w-10 h-10 rounded-xl border flex flex-col items-center justify-center mt-0.5", m.color)}>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide leading-none">mo</span>
                      <span className="text-base font-bold text-foreground leading-tight">{i + 1 <= 2 ? i + 1 : m.label.replace("M", "")}</span>
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <p className="text-sm font-semibold text-foreground">{m.heading}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{m.body}</p>
                    </div>
                    {/* Progress dot */}
                    <div className={cn("shrink-0 w-2.5 h-2.5 rounded-full mt-3", m.dot)} />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground italic">{timelineData.closing}</p>
            </div>
          </GuideItem>

          {/* 6. Consultation + why online works */}
          <GuideItem value="consultation" icon={Stethoscope} title="What happens during a hair loss consultation">
            <div className="space-y-4 pt-1">
              {/* The 5 things doctors check - highlighted */}
              <div className="rounded-lg bg-muted/30 border border-border/50 p-3 mb-1">
                <p className="text-xs font-semibold text-foreground mb-2">Your doctor checks five things:</p>
                <ul className="space-y-1.5">
                  {[
                    "Pattern of hair loss - consistent with androgenetic alopecia, or diffuse/patchy/scarring?",
                    "Duration and rate of progression - stable, slowly worsening, or accelerating?",
                    "Current medications and supplements - some cause or contribute to shedding",
                    "Family history on both sides - maternal grandfather's pattern is as relevant as your father's",
                    "Recent health changes - thyroid symptoms, weight changes, stress, or recent illness",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary/50 mt-1.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              {GUIDE_SECTIONS[2].paragraphs.map((p, i) => (
                <p key={i} className="text-sm text-muted-foreground leading-relaxed">{p}</p>
              ))}
              <div className="border-t border-border/40 pt-4">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-3">Why online works for hair loss</p>
                {GUIDE_SECTIONS[4].paragraphs.map((p, i) => (
                  <p key={i} className="text-sm text-muted-foreground leading-relaxed mb-3 last:mb-0">{p}</p>
                ))}
              </div>
            </div>
          </GuideItem>

          {/* 7. Side effects + safety - merged */}
          <GuideItem value="side-effects" icon={ShieldAlert} title="Side effects and safety">
            <div className="space-y-4 pt-1">
              {/* Hard contraindication callout */}
              <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3 flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-destructive mb-1">Hard stop: pregnancy</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Women who are pregnant, breastfeeding, or may become pregnant must not take or handle oral DHT-blocking tablets. The risk of birth defects in a male fetus is clearly established - this is a hard contraindication, not a precaution.
                  </p>
                </div>
              </div>
              {GUIDE_SECTIONS[3].paragraphs.map((p, i) => (
                <p key={i} className="text-sm text-muted-foreground leading-relaxed">{p}</p>
              ))}
              {/* Honest side effects mini blocks */}
              <div className="border-t border-border/40 pt-4">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-3">What to watch for</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {sideEffectsHonest.mini_blocks.map((block) => (
                    <div key={block.heading} className="rounded-lg bg-muted/30 border border-border/50 p-3">
                      <p className="text-xs font-semibold text-foreground mb-1.5">{block.heading}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{block.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </GuideItem>

          {/* 8. Ongoing treatment + if you stop */}
          <GuideItem value="ongoing" icon={Repeat} title="Ongoing treatment and repeat prescriptions">
            <div className="space-y-4 pt-1">
              {GUIDE_SECTIONS[5].paragraphs.map((p, i) => (
                <p key={i} className="text-sm text-muted-foreground leading-relaxed">{p}</p>
              ))}
              {"link" in GUIDE_SECTIONS[5] && GUIDE_SECTIONS[5].link && (
                <Link
                  href={GUIDE_SECTIONS[5].link.href}
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  {GUIDE_SECTIONS[5].link.label}
                  <span aria-hidden="true">→</span>
                </Link>
              )}
              {/* If you stop - amber callout */}
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700/50 p-3.5">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1.5">
                  If you stop treatment
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">{ifYouStop.body}</p>
              </div>
            </div>
          </GuideItem>

          {/* 9. Norwood stages - interactive */}
          <GuideItem value="norwood" icon={LineChart} title="Norwood stages at a glance">
            <div className="space-y-3 pt-1">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Tap a stage to see what it describes. The Norwood scale is the standard way doctors classify male pattern hair loss - from minor temple recession through extensive loss.
              </p>
              <NorwoodStagesReveal />
            </div>
          </GuideItem>
        </Accordion>

        {/* Clinical governance footer */}
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
