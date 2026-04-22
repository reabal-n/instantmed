import { BadgeCheck } from "lucide-react"
import Link from "next/link"

import { StickerIcon, type StickerIconName } from "@/components/icons/stickers"
import { Reveal } from "@/components/ui/reveal"

// =============================================================================
// DATA
// =============================================================================

const GUIDE_SECTIONS: Array<{
  id: string
  sticker: StickerIconName
  title: string
  paragraphs: readonly string[]
}> = [
  {
    id: "science",
    sticker: "brain",
    title: "The science behind medical weight management",
    paragraphs: [
      "Your body doesn't want to lose weight. That's not a moral judgement - it's biology. Over millions of years, humans evolved sophisticated systems to defend against weight loss, because for most of our history, the bigger threat was starvation, not surplus. Understanding this is the starting point for understanding why medical treatment exists and why willpower alone has a poor track record.",
      "Your brain maintains a 'set point' - a weight range it considers normal and actively defends. When you lose weight through diet alone, your body responds by lowering your metabolic rate, increasing hunger hormones like ghrelin, and decreasing satiety hormones like leptin. You feel hungrier, burn fewer calories, and think about food more often. This isn't weakness. It's a coordinated biological response that made excellent sense on the savannah and makes weight management genuinely difficult in a modern food environment.",
      "Medical treatments work by intervening in these biological pathways. Some target the appetite-regulating systems in the brain, reducing hunger signals and helping you feel satisfied sooner. Others affect how your body processes nutrients or stores energy. The goal isn't to override your biology permanently - it's to give your body time to establish a new, lower set point while you build sustainable habits. Anyone promising 10kg in a month is selling something other than medicine.",
    ],
  },
  {
    id: "who-benefits",
    sticker: "checkmark",
    title: "Who benefits from medical weight management",
    paragraphs: [
      "Medical weight management isn't for everyone, and responsible doctors are selective about who they prescribe for. Current Australian guidelines generally recommend considering medical treatment for adults with a BMI of 30 or above, or a BMI of 27 or above when accompanied by weight-related health conditions such as type 2 diabetes, obstructive sleep apnoea, cardiovascular risk factors, or significant joint problems that limit mobility.",
      "There's an important prerequisite: you should have already made genuine attempts at lifestyle modification - changes to diet, physical activity, or both - without achieving or maintaining clinically meaningful weight loss. Medical treatment is designed to work alongside these efforts, not replace them. A doctor who prescribes medication without discussing nutrition and movement is cutting corners.",
      "Beyond the numbers, good candidates are people whose weight is actively affecting their health, quality of life, or ability to manage other conditions. If excess weight is worsening your blood pressure, making your knees hurt enough to stop you exercising, or pushing your blood sugar into pre-diabetic territory, treatment may help break a cycle that lifestyle changes alone haven't been able to interrupt. The conversation starts with your overall health picture - not just the number on the scale.",
    ],
  },
  {
    id: "treatment-approaches",
    sticker: "stethoscope",
    title: "Treatment approaches your doctor may recommend",
    paragraphs: [
      "There are several categories of TGA-approved treatments your doctor may consider, depending on your health profile. One class includes injectable treatments that work with your body's appetite-regulating hormones - they mimic natural signals that tell your brain you've eaten enough, leading to reduced hunger and earlier satiety. These are typically administered weekly and have shown significant results in clinical trials when combined with lifestyle changes.",
      "Another category includes oral treatments that support appetite control through different mechanisms - some work on neurotransmitter pathways in the brain, while others affect nutrient absorption. Your doctor will choose based on your medical history, other medications you're taking, and what's most likely to be effective and tolerable for you specifically. There's no single 'best' treatment - there's the best treatment for your situation.",
      "What every responsible approach has in common: medication is always adjunct to lifestyle changes, not a replacement. Treatment plans include guidance on nutrition, physical activity, and behavioural strategies. The medication creates a window of reduced hunger and improved metabolic function that makes it genuinely easier to make and sustain the lifestyle changes that drive long-term results. Think of it as scaffolding - it supports the structure while you build it, but the structure has to be sound on its own.",
    ],
  },
  {
    id: "treatment-journey",
    sticker: "clock",
    title: "What to expect from your treatment journey",
    paragraphs: [
      "Set your expectations at three to six months minimum. Weight management medication isn't a two-week course of antibiotics - it's a sustained treatment that works gradually, and the first few weeks are about finding the right dose and letting your body adjust, not dramatic results. Most treatments start at a lower dose that's increased over several weeks, which helps minimise side effects and gives your doctor data on how you're responding.",
      "In clinical practice, most patients on medical weight management see a reduction of 5-15% of their starting body weight over the first six to twelve months, with the rate of loss typically highest in the first three to six months before plateauing. That might not sound like the transformation you've seen advertised elsewhere, but a 5-10% reduction in body weight produces meaningful improvements in blood pressure, blood sugar control, cholesterol levels, and joint pain. Medicine measures success in health outcomes, not before-and-after photos.",
      "Throughout treatment, your doctor will schedule regular check-ins - typically monthly - to assess progress, monitor for side effects, and make dosing adjustments. If a treatment isn't producing results after an adequate trial period, your doctor may recommend switching approaches or reassessing whether medication is the right path. Treatment may also be adjusted or gradually reduced once you've reached your goals and established sustainable habits. This is a managed process, not a set-and-forget prescription.",
    ],
  },
  {
    id: "ongoing-support",
    sticker: "heart-with-pulse",
    title: "Ongoing support and monitoring",
    paragraphs: [
      "Weight management is a long game, and the support structure matters as much as the prescription. Monthly check-ins aren't a formality - they're where your doctor reviews your progress, asks about side effects, checks whether the treatment is still appropriate, and adjusts the plan. Some months you'll be losing weight steadily. Some months you won't. Both are normal, and both need clinical context to interpret correctly.",
      "Side effects, when they occur, are typically manageable but need to be discussed openly. Gastrointestinal effects - nausea, changes in appetite patterns, digestive discomfort - are among the most common across treatment categories and often improve as your body adjusts. Your doctor can advise on timing, dosing, and dietary adjustments that help. The goal is a treatment you can actually sustain, not one that works on paper but makes you miserable in practice.",
      "When you've reached your treatment goals - or when it's clear that medication has done what it can - your doctor will work with you on a transition plan. This might mean gradually reducing medication, shifting to a lower maintenance dose, or discontinuing treatment while maintaining the habits you've built. The aim is always to reach a point where the lifestyle changes are doing the heavy lifting. Good medical weight management has an exit strategy built in from the start.",
    ],
  },
]

// =============================================================================
// COMPONENT
// =============================================================================

/** Long-form E-E-A-T content section - weight management science, eligibility, treatments, journey, monitoring */
export function WeightManagementGuideSection() {
  return (
    <section
      aria-label="Weight management treatment guide"
      className="py-20 lg:py-24"
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <Reveal className="text-center mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary mb-4">
            <BadgeCheck className="h-3.5 w-3.5" />
            Medically reviewed by AHPRA-registered GPs
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight mb-3">
            Everything you need to know about medical weight management
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">
            The biology, the options, and realistic expectations - no hype, no
            miracle promises.
          </p>
        </Reveal>

        {/* Content sections */}
        <div className="space-y-12">
          {GUIDE_SECTIONS.map((section, i) => (
            <Reveal key={section.id} delay={i * 0.05}>
              <div className="flex items-start gap-4">
                <div className="shrink-0 mt-0.5">
                  <StickerIcon name={section.sticker} size={36} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-foreground mb-3">
                    {section.title}
                  </h3>
                  <div className="space-y-3">
                    {section.paragraphs.map((p, j) => (
                      <p
                        key={j}
                        className="text-sm text-muted-foreground leading-relaxed"
                      >
                        {p}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Clinical governance link */}
        <div className="mt-12 pt-8 border-t border-border/40 text-center">
          <p className="text-xs text-muted-foreground">
            All clinical decisions are made by AHPRA-registered doctors following{" "}
            <Link
              href="/clinical-governance"
              className="text-primary hover:underline"
            >
              our clinical governance framework
            </Link>
            . We never automate clinical decisions.
          </p>
        </div>
      </div>
    </section>
  )
}
