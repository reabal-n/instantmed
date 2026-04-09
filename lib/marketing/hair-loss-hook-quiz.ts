/**
 * Hair Loss Hook Quiz — lightweight Norwood + duration picker for the
 * landing page. NOT a clinical assessment — the intake flow handles that.
 *
 * This helper stores the selected Norwood stage and how long the patient
 * has been noticing progression. Downstream: the Phase 2D+ intake rewrite
 * will pre-fill from sessionStorage under HAIR_LOSS_HOOK_QUIZ_KEY.
 *
 * Strictly no drug names — TGA compliance.
 */

export const HAIR_LOSS_HOOK_QUIZ_KEY = "instantmed.hookQuiz.hair_loss.v1"

export type NorwoodStage = 1 | 2 | 3 | 4 | 5 | 6 | 7
export type DurationBucket = "<6mo" | "6-12mo" | "1-3yr" | "3yr+"

export interface HairLossHookQuizResult {
  norwood: NorwoodStage
  durationBucket: DurationBucket
  completedAt: string
}

interface NorwoodStageInfo {
  stage: NorwoodStage
  label: string
  description: string
}

export const NORWOOD_STAGES: NorwoodStageInfo[] = [
  { stage: 1, label: "Stage 1", description: "No significant recession." },
  { stage: 2, label: "Stage 2", description: "Slight hairline recession at the temples." },
  { stage: 3, label: "Stage 3", description: "Clear temple recession, some thinning at the crown." },
  { stage: 4, label: "Stage 4", description: "Deeper recession and an emerging bald spot at the crown." },
  { stage: 5, label: "Stage 5", description: "The front and crown areas are visibly bald and separated by a thinning strip." },
  { stage: 6, label: "Stage 6", description: "The thinning strip is mostly gone; front and crown have merged." },
  { stage: 7, label: "Stage 7", description: "Only a band of hair remains around the sides and back." },
]

interface DurationBucketInfo {
  id: DurationBucket
  label: string
}

export const DURATION_BUCKETS: DurationBucketInfo[] = [
  { id: "<6mo", label: "Less than 6 months" },
  { id: "6-12mo", label: "6–12 months" },
  { id: "1-3yr", label: "1–3 years" },
  { id: "3yr+", label: "More than 3 years" },
]

export function buildHairLossHookQuizResult(
  norwood: NorwoodStage,
  durationBucket: DurationBucket
): HairLossHookQuizResult {
  return {
    norwood,
    durationBucket,
    completedAt: new Date().toISOString(),
  }
}

export function getHairLossHookQuizReassurance(
  stage: NorwoodStage,
  duration: DurationBucket
): string {
  const earlyStage = stage <= 3
  const longDuration = duration === "1-3yr" || duration === "3yr+"

  if (earlyStage && !longDuration) {
    return "You're catching this early. Consistent treatment typically prevents further progression, and many patients see regrowth at this stage."
  }
  if (earlyStage && longDuration) {
    return "Early stage, but it's been a while — consistent treatment can still prevent progression and often drives some regrowth."
  }
  if (!earlyStage && !longDuration) {
    return "You're at a stage where treatment focus shifts toward preserving what's alive and stabilising progression. A doctor can assess what's realistic for you."
  }
  return "At this stage treatment is primarily about slowing further loss and protecting remaining follicles. A doctor can be honest about what's realistic."
}
