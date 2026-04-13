/**
 * Sensory and sleep symptoms -- SEO symptom page data
 * Part of the symptoms data split. See ./index.ts for the combined export.
 */

import type { SymptomData } from "../symptoms"

export const sensorySleepSymptoms: Record<string, SymptomData> = {
  "eye-strain": {
    name: "Eye Strain (Digital Eye Strain)",
    slug: "eye-strain",
    description: "Tired, sore, or dry eyes from prolonged screen use or close-up work. Also called computer vision syndrome. Affects up to 90% of people who use screens for 2+ hours daily.",
    possibleCauses: [
      { name: "Prolonged screen use", likelihood: "common", description: "Reduced blink rate and sustained focus cause strain.", whenToSuspect: ["Worse after screen time", "Better on weekends", "Late afternoon symptoms"] },
      { name: "Poor lighting or glare", likelihood: "common", description: "Screen brightness mismatch with environment.", whenToSuspect: ["Overhead fluorescent lighting", "Screen facing window", "No screen filter"] },
      { name: "Uncorrected vision", likelihood: "common", description: "Needing glasses or updated prescription.", whenToSuspect: ["Squinting", "Headaches", "Holding phone closer"] },
      { name: "Dry eye syndrome", likelihood: "less-common", description: "Insufficient tear production.", whenToSuspect: ["Eyes feel gritty", "Worse in air conditioning", "Contact lens discomfort"] }
    ],
    selfCareAdvice: ["Follow the 20-20-20 rule: every 20 minutes, look at something 20 feet away for 20 seconds", "Blink deliberately - screen use reduces blink rate by 50%", "Adjust screen brightness to match your environment", "Use lubricating eye drops (artificial tears)", "Position screen at arm's length, slightly below eye level"],
    whenToSeeDoctor: ["Eye strain with persistent headaches", "Vision changes or blurred vision", "Eye pain (not just tiredness)", "Symptoms not improving with self-care", "You need an eye test referral"],
    emergencySigns: ["Sudden vision loss or dark spots", "Severe eye pain", "Flashing lights or new floaters", "Double vision"],
    relatedSymptoms: ["headache", "neck-pain"],
    faqs: [
      { q: "Can screens damage my eyes?", a: "Screens don't cause permanent eye damage, but they do cause temporary symptoms (strain, dryness, headache). The real concern is that we blink 50% less when using screens, leading to dry eyes and fatigue." },
      { q: "Do blue light glasses help?", a: "Evidence is mixed. Current research suggests blue light glasses have minimal effect on eye strain. Better strategies are the 20-20-20 rule, proper screen positioning, and adequate lighting." },
      { q: "Can I get a medical certificate for eye strain?", a: "Severe eye strain with headaches can affect your ability to do screen-based work. A certificate may be appropriate, along with recommendations for workplace ergonomic assessment." }
    ],
    serviceRecommendation: { type: "consult", text: "Get assessed", href: "/request?service=consult" },
    doctorPerspective: "Digital eye strain is the occupational health epidemic of the modern workplace. Nearly everyone who works at a screen for more than 2 hours daily experiences it to some degree, yet very few seek help or make the simple adjustments that resolve it. The root cause is that our eyes evolved for distance vision and outdoor light - sustained near-focus on a backlit screen in an air-conditioned room is physiologically demanding. The most effective intervention is the 20-20-20 rule, combined with deliberate blinking and appropriate screen positioning. I also always recommend an eye test to rule out uncorrected refractive error - even a mild prescription that you 'don't really need' can eliminate eye strain entirely.",
    certGuidance: "Severe eye strain can make screen-based work impossible. If headaches and eye fatigue are debilitating despite ergonomic adjustments, a certificate and optometry referral are appropriate.",
  },
  "sleep-apnoea": {
    name: "Sleep Apnoea",
    slug: "sleep-apnoea",
    description: "A condition where breathing repeatedly stops and starts during sleep. Causes loud snoring, daytime sleepiness, and increases the risk of heart disease, stroke, and diabetes.",
    possibleCauses: [
      { name: "Obstructive sleep apnoea (OSA)", likelihood: "common", description: "Throat muscles relax excessively during sleep, blocking the airway.", whenToSuspect: ["Loud snoring", "Witnessed apnoeas (partner sees you stop breathing)", "Overweight", "Neck circumference >40cm"] },
      { name: "Central sleep apnoea", likelihood: "rare", description: "Brain doesn't send proper signals to breathing muscles.", whenToSuspect: ["Heart failure", "Opioid use", "No snoring", "Cheyne-Stokes breathing pattern"] }
    ],
    selfCareAdvice: ["Lose weight if overweight - even 5-10% weight loss can significantly reduce OSA severity", "Sleep on your side - back sleeping worsens obstruction", "Avoid alcohol within 3 hours of bedtime - it relaxes throat muscles", "Avoid sedating medications before bed", "Maintain regular sleep schedule"],
    whenToSeeDoctor: ["Loud snoring with witnessed breathing pauses", "Excessive daytime sleepiness despite adequate sleep hours", "Morning headaches", "Difficulty concentrating", "Falling asleep while driving (urgent)"],
    emergencySigns: ["Falling asleep at the wheel or during safety-critical tasks", "Severe breathlessness on waking", "Chest pain on waking"],
    relatedSymptoms: ["fatigue", "headache", "insomnia"],
    faqs: [
      { q: "How is sleep apnoea diagnosed?", a: "A sleep study (polysomnography) is the gold standard. Home-based sleep studies are now available and are more convenient. Your GP can arrange a referral." },
      { q: "What is CPAP?", a: "Continuous Positive Airway Pressure - a machine that gently blows air through a mask to keep your airway open during sleep. It is the most effective treatment for moderate-severe OSA." },
      { q: "Is sleep apnoea dangerous?", a: "Untreated OSA significantly increases risk of heart attack, stroke, type 2 diabetes, and car accidents (due to daytime sleepiness). Treatment with CPAP dramatically reduces these risks." }
    ],
    serviceRecommendation: { type: "consult", text: "Get assessed", href: "/request?service=consult" },
    doctorPerspective: "Sleep apnoea is one of the most underdiagnosed conditions in Australia - up to 80% of moderate-to-severe cases remain undiagnosed. The classic presentation is a middle-aged, overweight male with loud snoring and daytime sleepiness, but it affects women too (particularly after menopause) and can occur at any weight. Via telehealth, I can screen using validated questionnaires (STOP-BANG, Epworth Sleepiness Scale), arrange home sleep study referrals, and discuss treatment options. The most important reason to diagnose and treat OSA is cardiovascular risk reduction - untreated severe OSA doubles the risk of heart attack and stroke. CPAP compliance is the main challenge, but modern machines are quieter, smaller, and more comfortable than older models.",
    certGuidance: "Untreated severe OSA with excessive daytime sleepiness is a safety risk for driving and operating machinery. A certificate may be appropriate while awaiting diagnosis and treatment initiation.",
  },
}
