/**
 * Dermatology and hair symptoms -- SEO symptom page data
 * Part of the symptoms data split. See ./index.ts for the combined export.
 */

import type { SymptomData } from "../symptoms"

export const dermatologySymptoms: Record<string, SymptomData> = {
  "hair-thinning": {
    name: "Hair Thinning",
    slug: "hair-thinning",
    description: "Hair thinning affects about 50% of men by age 50 and many women. Several treatments can slow or reverse hair loss if started early.",
    possibleCauses: [
      {
        name: "Androgenetic alopecia (pattern baldness)",
        likelihood: "common",
        description: "Genetic sensitivity to hormones. Most common cause of hair loss.",
        whenToSuspect: ["Receding hairline (men)", "Thinning at crown", "Widening part (women)", "Family history"]
      },
      {
        name: "Stress (telogen effluvium)",
        likelihood: "common",
        description: "Hair enters shedding phase 2-3 months after stressful event.",
        whenToSuspect: ["Major stress 2-3 months ago", "Sudden shedding", "Usually regrows"]
      },
      {
        name: "Hormonal changes",
        likelihood: "common",
        description: "Menopause, PCOS, thyroid problems can cause thinning.",
        whenToSuspect: ["Women after menopause", "Irregular periods", "Weight changes"]
      },
      {
        name: "Iron deficiency",
        likelihood: "less-common",
        description: "Low iron or ferritin can cause hair loss.",
        whenToSuspect: ["Heavy periods", "Pale skin", "Fatigue"]
      },
      {
        name: "Thyroid problems",
        likelihood: "less-common",
        description: "Both underactive and overactive thyroid can cause thinning.",
        whenToSuspect: ["Weight changes", "Feeling cold", "Dry skin", "Fatigue"]
      }
    ],
    selfCareAdvice: [
      "Gentle hair care - avoid tight hairstyles and excessive heat",
      "Balanced diet with adequate protein and iron",
      "Manage stress through exercise, sleep, relaxation",
      "Avoid smoking - worsens hair loss",
      "Be patient - hair grows slowly (~1cm per month)"
    ],
    whenToSeeDoctor: [
      "Sudden or patchy hair loss",
      "Hair loss with other symptoms (fatigue, weight changes)",
      "Scalp problems (itching, redness, scaling)",
      "Rapid hair loss or facial hair growth (women)",
      "Hair loss affecting your mental health"
    ],
    emergencySigns: [
      "Rapid extensive hair loss",
      "Hair loss with severe scalp pain or discharge",
      "Hair loss with signs of infection"
    ],
    relatedSymptoms: ["fatigue", "stress"],
    faqs: [
      { q: "At what age does hair loss start?", a: "Male pattern baldness can start in the early 20s but is more common from 30s onward. Women typically notice thinning after menopause." },
      { q: "Is hair loss reversible?", a: "It depends on the cause. Androgenetic alopecia can be slowed or partially reversed with treatment, especially if caught early. Stress-related loss usually regrows within 6-9 months." },
      { q: "Do hair loss treatments work?", a: "Yes - clinically proven treatments can help slow hair loss and promote regrowth. Results take 6-12 months. Treatment must be continued to maintain benefits." },
      { q: "Can stress cause hair loss?", a: "Yes - severe stress can cause telogen effluvium, where lots of hair enters the shedding phase at once. This usually happens 2-3 months after the stressful event and regrows within 6-9 months." }
    ],
    serviceRecommendation: {
      type: "consult",
      text: "Get hair loss treatment",
      href: "/request?service=consult"
    },
    doctorPerspective: "Hair thinning is a sensitive topic and patients often delay seeking help. The most common cause by far is androgenetic alopecia (male or female pattern hair loss) - a genetic condition that responds well to treatment when started early. The key is early intervention: finasteride and minoxidil are most effective at preventing further loss rather than regrowing what has already gone. Other causes I consider include thyroid dysfunction, iron deficiency, stress-related telogen effluvium (which typically occurs 2-3 months after a significant stressor), autoimmune alopecia, and medication side effects. A thorough history usually identifies the pattern, and blood tests may be needed to rule out medical causes. Telehealth is well-suited for hair loss assessment because the diagnosis is largely visual and history-based.",
    certGuidance: "Hair thinning itself is unlikely to require a medical certificate, though the psychological impact (anxiety, depression) may. If hair loss is causing significant distress affecting your work or daily function, that is a legitimate reason to seek support.",
  },
  "itching": {
    name: "Itching (Pruritus)",
    slug: "itching",
    description: "Uncomfortable urge to scratch. Can be localised or generalised, from skin conditions or internal causes.",
    possibleCauses: [
      { name: "Dry skin", likelihood: "common", description: "Most common cause of itching.", whenToSuspect: ["Worse in winter", "Improves with moisturiser"] },
      { name: "Eczema", likelihood: "common", description: "Chronic itchy skin condition.", whenToSuspect: ["Recurring", "Dry patches", "Family history"] },
      { name: "Allergic reaction", likelihood: "common", description: "To products, plants, or food.", whenToSuspect: ["New product", "Rash", "Hives"] },
      { name: "Fungal infection", likelihood: "common", description: "Athlete's foot, jock itch, etc.", whenToSuspect: ["Red, scaly patches", "Between toes or in folds"] },
      { name: "Liver or kidney disease", likelihood: "rare", description: "Generalised itching.", whenToSuspect: ["Widespread", "No rash", "Other symptoms"] }
    ],
    selfCareAdvice: ["Moisturise regularly", "Avoid hot showers", "Use gentle soap", "Cool compress"],
    whenToSeeDoctor: ["Itching lasting >2 weeks", "Severe itching", "Itching with rash", "You need a medical certificate"],
    emergencySigns: ["Itching with difficulty breathing", "Swelling of face or throat", "Widespread hives"],
    relatedSymptoms: ["skin-rash", "eczema", "hives"],
    faqs: [
      { q: "When is itching serious?", a: "See a doctor if itching is severe, widespread without rash, or doesn't improve. Itching with breathing difficulty is an emergency." },
      { q: "Can I get a medical certificate for itching?", a: "If severe itching (e.g. from eczema flare) affects sleep or work, yes." }
    ],
    serviceRecommendation: { type: "consult", text: "Get assessed", href: "/request?service=consult" },
    doctorPerspective: "Itching (pruritus) without a visible rash is a diagnostically interesting symptom. If there is a rash, the cause is usually dermatological - eczema, contact dermatitis, fungal infection, hives, or insect bites. But generalised itching without any rash can indicate systemic conditions: liver disease (bile salt deposition), kidney disease (uraemia), thyroid dysfunction, iron deficiency, or rarely, lymphoma. This is why persistent, unexplained itching warrants blood tests. For itching with a clear skin cause, treatment is usually straightforward - moisturisers for dry skin, topical steroids for eczema, antifungals for fungal infections, and antihistamines for allergic reactions. The most important self-care advice is to avoid scratching - it creates an itch-scratch cycle that worsens the condition.",
    certGuidance: "Severe itching - particularly from eczema flares or allergic reactions - can be genuinely debilitating and affect sleep and concentration. A certificate is appropriate when itching significantly impairs your ability to work.",
  },
  "hair-loss": {
    name: "Hair Loss",
    slug: "hair-loss",
    description: "Thinning, shedding, or bald patches on the scalp. Can be caused by genetics, hormones, stress, nutritional deficiencies, or autoimmune conditions.",
    possibleCauses: [
      { name: "Androgenetic alopecia (male/female pattern)", likelihood: "common", description: "Genetic hair loss - the most common type.", whenToSuspect: ["Family history", "Gradual thinning", "Receding hairline (men)", "Widening part (women)"] },
      { name: "Telogen effluvium (stress-related)", likelihood: "common", description: "Temporary shedding 2-3 months after a stressor.", whenToSuspect: ["Recent illness, surgery, or stress", "Diffuse thinning", "Started 2-3 months after event"] },
      { name: "Iron or nutritional deficiency", likelihood: "less-common", description: "Low iron, zinc, or vitamin D can cause hair loss.", whenToSuspect: ["Fatigue", "Vegetarian/vegan", "Heavy periods", "Diffuse thinning"] },
      { name: "Thyroid dysfunction", likelihood: "less-common", description: "Both hypo- and hyperthyroidism cause hair loss.", whenToSuspect: ["Fatigue or anxiety", "Weight changes", "Temperature sensitivity"] },
      { name: "Alopecia areata", likelihood: "less-common", description: "Autoimmune patches of hair loss.", whenToSuspect: ["Round bald patches", "Smooth skin in patches", "May regrow spontaneously"] }
    ],
    selfCareAdvice: ["Don't panic - stress worsens hair loss. Most types are treatable", "Get blood tests for iron, thyroid, vitamin D, and zinc", "Use gentle hair care - avoid excessive heat, tight styles, and harsh chemicals", "Consider minoxidil (available OTC) for pattern hair loss", "Ensure adequate protein intake - hair is made of protein"],
    whenToSeeDoctor: ["Sudden or rapid hair loss", "Bald patches appearing", "Hair loss with scalp symptoms (pain, itching, redness)", "Hair loss after starting new medication", "You want to discuss treatment options"],
    emergencySigns: ["Hair loss with severe scalp pain and scarring (possible scarring alopecia - needs dermatology)", "Complete hair loss over days (rare - needs urgent assessment)"],
    relatedSymptoms: ["fatigue", "stress"],
    faqs: [
      { q: "Can a doctor help with hair loss?", a: "Yes. A doctor can identify the cause (blood tests for deficiencies, thyroid, hormones), prescribe treatments (finasteride, minoxidil, iron supplementation), and refer to a dermatologist if needed." },
      { q: "Is hair loss reversible?", a: "It depends on the cause. Telogen effluvium (stress-related) is fully reversible. Iron/thyroid-related hair loss reverses with treatment. Pattern hair loss can be slowed and partially reversed with early treatment but is progressive without it." },
      { q: "What treatments are available?", a: "Minoxidil (topical, OTC), finasteride (prescription, for men), iron/vitamin supplements if deficient, and referral for PRP therapy or specialist treatments for resistant cases." }
    ],
    serviceRecommendation: { type: "consult", text: "Get assessed", href: "/request?service=consult" },
    doctorPerspective: "Hair loss consultations have increased significantly in telehealth - likely because patients find it easier to discuss a sensitive topic from home. The diagnostic approach starts with the pattern: is it diffuse (all over) or patchy? Gradual or sudden? Diffuse gradual thinning in a typical pattern strongly suggests androgenetic alopecia (genetic). Diffuse shedding 2-3 months after a stressor (illness, surgery, childbirth, severe stress) is telogen effluvium - this is fully reversible. Patchy loss with smooth skin suggests alopecia areata. I always check for treatable causes: iron, ferritin, thyroid function, zinc, and vitamin D - these are all correctable and commonly overlooked. For androgenetic alopecia, the key message is that early treatment (minoxidil ± finasteride for men) is far more effective at preventing further loss than trying to regrow what's already gone.",
    certGuidance: "Hair loss itself is unlikely to require a medical certificate, but the psychological impact can be significant. If hair loss is causing anxiety or depression that affects work, that is a legitimate reason for support.",
  },
}
