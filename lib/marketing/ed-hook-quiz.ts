/**
 * ED Hook Quiz — 3 lightweight questions designed for conversion.
 *
 * NOTE: this is NOT the IIEF-5. IIEF-5 is a 5-question clinical
 * assessment with a different scoring scale and lives inside the paid
 * intake. This 3-question hook quiz is positioned as a quick check,
 * not a clinical assessment, and never uses drug names.
 */

export const ED_HOOK_QUIZ_KEY = "instantmed.hookQuiz.ed.v1"

export type EdHookQuizTier = "mild" | "moderate" | "severe"

export interface EdHookQuizResult {
  tier: EdHookQuizTier
  answers: [number, number, number]
  completedAt: string
}

interface QuizOption {
  label: string
  score: 1 | 2 | 3 | 4 | 5
}

interface QuizQuestion {
  id: "q1" | "q2" | "q3"
  prompt: string
  options: QuizOption[]
}

export const ED_HOOK_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "q1",
    prompt:
      "Over the past 4 weeks, how often have you been able to get an erection firm enough for sex?",
    options: [
      { label: "Almost never or never", score: 1 },
      { label: "A few times (much less than half the time)", score: 2 },
      { label: "Sometimes (about half the time)", score: 3 },
      { label: "Most times (much more than half the time)", score: 4 },
      { label: "Almost always or always", score: 5 },
    ],
  },
  {
    id: "q2",
    prompt:
      "When you tried to have sex, how confident were you that you could get and keep an erection?",
    options: [
      { label: "Very low", score: 1 },
      { label: "Low", score: 2 },
      { label: "Moderate", score: 3 },
      { label: "High", score: 4 },
      { label: "Very high", score: 5 },
    ],
  },
  {
    id: "q3",
    prompt: "Over the past 4 weeks, how satisfying was sex for you?",
    options: [
      { label: "Not at all satisfying", score: 1 },
      { label: "A little satisfying", score: 2 },
      { label: "Moderately satisfying", score: 3 },
      { label: "Highly satisfying", score: 4 },
      { label: "Very highly satisfying", score: 5 },
    ],
  },
]

export function scoreEdHookQuiz(answers: [number, number, number]): EdHookQuizResult {
  const total = answers[0] + answers[1] + answers[2]
  let tier: EdHookQuizTier
  if (total <= 6) tier = "severe"
  else if (total <= 10) tier = "moderate"
  else tier = "mild"
  return {
    tier,
    answers,
    completedAt: new Date().toISOString(),
  }
}

export function getEdHookQuizReassurance(tier: EdHookQuizTier): string {
  switch (tier) {
    case "severe":
      return "You're not alone — many patients in this range see meaningful improvement with treatment. A doctor can assess what's appropriate for you."
    case "moderate":
      return "This is a common place to be. Treatment is effective for most patients, and a doctor can recommend the right approach."
    case "mild":
      return "Things are relatively good but not perfect — a doctor can assess whether treatment or other support is worth considering."
  }
}
