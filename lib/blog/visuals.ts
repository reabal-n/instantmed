export const TOP_VISUAL_ARTICLE_SLUGS = [
  "ibs-digestive-issues",
  "medical-certificate-mental-health-day",
  "eczema-dermatitis",
  "telehealth-after-hours",
  "medical-certificate-food-poisoning",
  "sinusitis",
  "hay-fever-allergies",
  "medical-certificate-period-pain",
  "university-medical-certificates",
  "vertigo-dizziness",
  "medical-certificate-centrelink",
  "gout",
  "medical-certificate-surgery-recovery",
  "pbs-pharmaceutical-benefits-scheme",
  "medical-certificate-pregnancy-related-absence",
] as const

export type TopVisualArticleSlug = (typeof TOP_VISUAL_ARTICLE_SLUGS)[number]

export interface ArticleVisualItem {
  label: string
  detail: string
  tone?: "neutral" | "safe" | "caution" | "urgent"
}

export interface ArticleVisual {
  id: string
  title: string
  eyebrow: string
  summary: string
  kind: "comparison" | "flow" | "timeline" | "warning" | "checklist" | "spectrum"
  accent: "blue" | "emerald" | "amber" | "rose" | "sky"
  items: ArticleVisualItem[]
  imagePrompt: string
  assetPath?: string
}

const visualLibrary: Record<TopVisualArticleSlug, ArticleVisual[]> = {
  "ibs-digestive-issues": [
    {
      id: "ibs-subtype-map",
      eyebrow: "Subtype map",
      title: "IBS patterns change the management conversation",
      summary: "The same diagnosis can present as constipation, diarrhoea, mixed bowel habits, or an unclassified pattern.",
      kind: "comparison",
      accent: "blue",
      items: [
        { label: "IBS-C", detail: "Hard or infrequent stools predominate" },
        { label: "IBS-D", detail: "Loose, urgent, or frequent stools predominate" },
        { label: "IBS-M", detail: "Hard and loose stools occur in the same week" },
        { label: "IBS-U", detail: "Symptoms do not fit the main patterns" },
      ],
      imagePrompt: "Australian editorial health infographic, abstract gut-brain and bowel pattern mapping, calm warm ivory background, no readable text, no anatomy gore, premium clinical style",
      assetPath: "/images/blog/ibs-digestive-issues/ibs-subtype-map.webp",
    },
    {
      id: "fodmap-three-phase",
      eyebrow: "Diet pathway",
      title: "Low FODMAP is a three-phase process",
      summary: "The goal is not permanent restriction. The useful endpoint is a personalised diet that identifies specific triggers.",
      kind: "flow",
      accent: "emerald",
      items: [
        { label: "Elimination", detail: "Short trial to see whether FODMAPs matter" },
        { label: "Reintroduction", detail: "Test categories one at a time" },
        { label: "Personalisation", detail: "Keep variety while avoiding proven triggers" },
      ],
      imagePrompt: "Calm Australian kitchen health visual with food diary, phone, tea, and fresh low FODMAP ingredients, no readable labels, warm daylight, premium editorial photo style",
      assetPath: "/images/blog/ibs-digestive-issues/fodmap-three-phase.webp",
    },
    {
      id: "ibs-red-flags",
      eyebrow: "Safety boundary",
      title: "Symptoms that do not fit simple IBS",
      summary: "Blood, weight loss, night symptoms, fever, anaemia, and new symptoms after 50 need investigation before assuming IBS.",
      kind: "warning",
      accent: "rose",
      items: [
        { label: "Blood or anaemia", detail: "Needs investigation", tone: "urgent" },
        { label: "Unintentional weight loss", detail: "Do not treat as routine IBS", tone: "urgent" },
        { label: "Symptoms waking you", detail: "More concerning than daytime-only symptoms", tone: "caution" },
      ],
      imagePrompt: "Minimal medical warning still-life for digestive red flags, no people, no clinicians, no faces, calm red accent, abstract checklist shapes, phone and paper note only, no readable text, no graphic body imagery",
      assetPath: "/images/blog/ibs-digestive-issues/ibs-red-flags.webp",
    },
  ],
  "medical-certificate-mental-health-day": [
    {
      id: "mental-health-evidence-boundary",
      eyebrow: "Work evidence",
      title: "Mental health absence is still sick leave",
      summary: "The certificate should confirm fitness for work, not disclose private diagnosis details to an employer.",
      kind: "checklist",
      accent: "blue",
      items: [
        { label: "Fit or unfit for work", detail: "The work-capacity question is central" },
        { label: "Private diagnosis", detail: "Usually not required by an employer" },
        { label: "Review plan", detail: "Recurring episodes deserve proper follow-up" },
      ],
      imagePrompt: "Quiet Australian bedroom morning scene, phone and workplace leave form on laptop, calm mental health day mood, no readable text, no faces looking at camera",
    },
    {
      id: "support-escalation",
      eyebrow: "Escalation ladder",
      title: "When a bad day needs more support",
      summary: "Occasional stress leave and crisis symptoms are different problems and need different pathways.",
      kind: "timeline",
      accent: "rose",
      items: [
        { label: "Mild stress", detail: "Rest, document absence, monitor pattern", tone: "safe" },
        { label: "Recurring episodes", detail: "Arrange regular GP review", tone: "caution" },
        { label: "Self-harm thoughts", detail: "Use crisis support or call 000", tone: "urgent" },
      ],
      imagePrompt: "Abstract calm support ladder for mental wellbeing, warm ivory and soft blue, no readable text, no distressing imagery",
    },
  ],
  "eczema-dermatitis": [
    {
      id: "eczema-flare-cycle",
      eyebrow: "Flare cycle",
      title: "Dryness, itch, scratching, and inflammation reinforce each other",
      summary: "Good eczema care focuses on breaking the cycle and rebuilding the skin barrier.",
      kind: "flow",
      accent: "amber",
      items: [
        { label: "Dry barrier", detail: "Skin loses moisture and irritants enter" },
        { label: "Itch", detail: "Inflammation increases the urge to scratch" },
        { label: "Scratch damage", detail: "More barrier injury can restart the flare" },
      ],
      imagePrompt: "Clean non-graphic eczema skin barrier illustration, soft warm clinical colours, no readable text, no close-up wounds",
    },
    {
      id: "eczema-routine",
      eyebrow: "Care routine",
      title: "Barrier care is the daily baseline",
      summary: "Most plans combine trigger reduction, regular moisturiser, and short targeted treatment during flares.",
      kind: "checklist",
      accent: "emerald",
      items: [
        { label: "Moisturise often", detail: "Especially after washing" },
        { label: "Avoid irritants", detail: "Fragrance, harsh soaps, heat, and friction" },
        { label: "Treat flares early", detail: "Use clinician-directed treatment when needed" },
      ],
      imagePrompt: "Australian bathroom counter with moisturiser pump, soft towel, gentle skincare, warm morning light, no readable brand names",
    },
  ],
  "telehealth-after-hours": [
    {
      id: "after-hours-urgency-ladder",
      eyebrow: "Triage",
      title: "After-hours care starts with urgency",
      summary: "The right path depends on danger, severity, and whether a physical exam is needed.",
      kind: "timeline",
      accent: "rose",
      items: [
        { label: "Emergency", detail: "Chest pain, breathing trouble, stroke signs: call 000", tone: "urgent" },
        { label: "Same-day urgent", detail: "Severe or worsening symptoms need urgent care", tone: "caution" },
        { label: "Routine", detail: "Stable admin or mild symptoms may wait", tone: "safe" },
      ],
      imagePrompt: "Minimal after-hours healthcare triage ladder, phone on bedside table at night, calm not alarming, no readable text",
    },
    {
      id: "after-hours-fit",
      eyebrow: "Fit check",
      title: "Some problems are not solved by an online form",
      summary: "If diagnosis depends on examination, monitoring, imaging, or emergency treatment, telehealth is the wrong first stop.",
      kind: "comparison",
      accent: "blue",
      items: [
        { label: "Good fit", detail: "Stable, low-risk, information-based requests", tone: "safe" },
        { label: "Poor fit", detail: "Severe pain, injury, dehydration, or complex symptoms", tone: "caution" },
        { label: "Emergency", detail: "Time-critical symptoms should bypass telehealth", tone: "urgent" },
      ],
      imagePrompt: "Calm decision-tree concept for after-hours care, Australian phone and notepad, no readable labels, warm ivory background",
    },
  ],
  "medical-certificate-food-poisoning": [
    {
      id: "gastro-recovery-window",
      eyebrow: "Recovery window",
      title: "Food poisoning is usually short, but dehydration changes the risk",
      summary: "Most uncomplicated cases improve over one to three days. Worsening symptoms need review.",
      kind: "timeline",
      accent: "sky",
      items: [
        { label: "First 24 hours", detail: "Rest and fluids are the main focus" },
        { label: "1-3 days", detail: "Most uncomplicated cases settle" },
        { label: "Worsening", detail: "Fever, blood, severe pain, or dehydration needs care", tone: "urgent" },
      ],
      imagePrompt: "Australian kitchen bench with water glass, oral rehydration sachet, phone, calm illness recovery scene, no readable text",
    },
    {
      id: "food-handler-boundary",
      eyebrow: "Work safety",
      title: "Food handlers need a stricter return-to-work boundary",
      summary: "Work involving food service or vulnerable people may need longer exclusion after symptoms stop.",
      kind: "warning",
      accent: "amber",
      items: [
        { label: "Last diarrhoea or vomiting", detail: "Do not return while symptomatic", tone: "urgent" },
        { label: "Food handling", detail: "Often requires at least 48 hours symptom-free", tone: "caution" },
        { label: "Document the absence", detail: "Use evidence without oversharing details" },
      ],
      imagePrompt: "Subtle food service return-to-work safety illustration, apron and calendar, no readable text, warm clinical palette",
    },
  ],
  sinusitis: [
    {
      id: "sinusitis-timeline",
      eyebrow: "Timeline",
      title: "Most sinus symptoms start viral",
      summary: "Duration, worsening pattern, and severity matter more than pressure alone.",
      kind: "timeline",
      accent: "blue",
      items: [
        { label: "Days 1-7", detail: "Viral symptoms are common" },
        { label: "Persistent", detail: "Symptoms beyond 10 days may need review", tone: "caution" },
        { label: "Severe or worsening", detail: "Fever, swelling, or eye symptoms need prompt care", tone: "urgent" },
      ],
      imagePrompt: "Clean sinus pressure timeline illustration, tissue box and calendar, no readable text, soft Australian daylight",
    },
    {
      id: "sinusitis-red-flags",
      eyebrow: "Red flags",
      title: "Eye or neurological symptoms change the urgency",
      summary: "Swelling around the eye, vision changes, severe headache, confusion, or neck stiffness are not routine sinusitis.",
      kind: "warning",
      accent: "rose",
      items: [
        { label: "Eye swelling", detail: "Needs urgent assessment", tone: "urgent" },
        { label: "Vision change", detail: "Do not wait for routine care", tone: "urgent" },
        { label: "Severe headache", detail: "Especially with neck stiffness or confusion", tone: "urgent" },
      ],
      imagePrompt: "Minimal red-flag sinusitis safety illustration, abstract face outline, no readable text, no graphic symptoms",
    },
  ],
  "hay-fever-allergies": [
    {
      id: "nasal-spray-technique",
      eyebrow: "Technique",
      title: "Spray angle matters",
      summary: "Aiming slightly outward can improve effect and reduce irritation compared with spraying straight up the septum.",
      kind: "flow",
      accent: "emerald",
      items: [
        { label: "Gently clear nose", detail: "Do not over-irritate" },
        { label: "Aim outward", detail: "Point away from the nasal septum" },
        { label: "Use consistently", detail: "Steroid sprays often need regular use" },
      ],
      imagePrompt: "Clean hay fever nasal spray technique illustration, soft botanical background, no readable text",
    },
    {
      id: "hay-fever-control-stack",
      eyebrow: "Control stack",
      title: "Hay fever control is layered",
      summary: "Exposure reduction, correct spray use, and allergy medicines each solve a different part of the problem.",
      kind: "spectrum",
      accent: "sky",
      items: [
        { label: "Environment", detail: "Pollen, dust, pets, and mould" },
        { label: "Nose", detail: "Congestion and inflammation" },
        { label: "Eyes", detail: "Itch, watering, and irritation" },
      ],
      imagePrompt: "Textless Australian spring allergy still life, tissue box, closed window, soft pollen shapes outside, blank medicine packaging with no letters, no readable text, no people, calm daylight",
    },
  ],
  "medical-certificate-period-pain": [
    {
      id: "period-pain-patterns",
      eyebrow: "Pattern check",
      title: "Pain pattern determines whether it needs investigation",
      summary: "Severe, worsening, one-sided, or new pain deserves more than a routine certificate.",
      kind: "comparison",
      accent: "rose",
      items: [
        { label: "Common cramps", detail: "Predictable and similar to previous cycles" },
        { label: "Concerning pattern", detail: "Worsening, one-sided, new, or disabling", tone: "caution" },
        { label: "Urgent symptoms", detail: "Fever, fainting, pregnancy concern, or severe pain", tone: "urgent" },
      ],
      imagePrompt: "Calm period pain guide illustration, heat pack and calendar, warm respectful style, no readable text",
    },
    {
      id: "period-work-documentation",
      eyebrow: "Documentation",
      title: "The work note should focus on capacity",
      summary: "A certificate can support absence without disclosing private gynaecological details to an employer.",
      kind: "checklist",
      accent: "blue",
      items: [
        { label: "Unfit for work", detail: "State the relevant date or period" },
        { label: "Privacy", detail: "Diagnosis detail is usually not needed" },
        { label: "Follow-up", detail: "Recurring severe pain should be assessed" },
      ],
      imagePrompt: "Australian work-from-home sick day scene with calendar and heat pack, no readable text, calm privacy-focused mood",
    },
  ],
  "university-medical-certificates": [
    {
      id: "uni-document-checklist",
      eyebrow: "Evidence",
      title: "University documentation is about dates, impact, and timing",
      summary: "The useful certificate matches the affected class, exam, placement, or assessment window.",
      kind: "checklist",
      accent: "blue",
      items: [
        { label: "Relevant dates", detail: "Match the assessment or attendance period" },
        { label: "Functional impact", detail: "Explain why study was affected" },
        { label: "Institution rules", detail: "Check the submission deadline" },
      ],
      imagePrompt: "Textless Australian university desk still life, laptop with blank screen, blank calendar blocks, unlabelled folder, pen, no readable text or letters anywhere, no people, soft daylight",
    },
    {
      id: "uni-extension-timeline",
      eyebrow: "Timing",
      title: "Submit evidence before the admin window closes",
      summary: "Late documentation can be rejected even when the illness was real.",
      kind: "timeline",
      accent: "amber",
      items: [
        { label: "Illness day", detail: "Record symptoms and affected tasks" },
        { label: "Certificate", detail: "Get evidence that covers the relevant dates" },
        { label: "Submission", detail: "Upload before the university deadline", tone: "caution" },
      ],
      imagePrompt: "University special consideration timeline visual, laptop and planner, no readable text, warm ivory palette",
    },
  ],
  "vertigo-dizziness": [
    {
      id: "vertigo-patterns",
      eyebrow: "Pattern recognition",
      title: "Dizziness is not one symptom",
      summary: "Spinning, faintness, imbalance, and light-headedness point toward different causes and urgency.",
      kind: "comparison",
      accent: "sky",
      items: [
        { label: "Spinning", detail: "Often vestibular" },
        { label: "Faintness", detail: "Can be blood pressure, dehydration, or cardiac" },
        { label: "Neurological signs", detail: "Weakness, speech trouble, or new severe headache is urgent", tone: "urgent" },
      ],
      imagePrompt: "Clean dizziness pattern illustration with subtle circular motion lines, calm clinical style, no readable text",
    },
    {
      id: "dizziness-red-flags",
      eyebrow: "Urgency",
      title: "Stroke-like symptoms override routine vertigo care",
      summary: "Facial droop, arm weakness, speech trouble, severe headache, chest pain, or collapse needs urgent care.",
      kind: "warning",
      accent: "rose",
      items: [
        { label: "Face, arm, speech", detail: "Call 000", tone: "urgent" },
        { label: "Chest pain or collapse", detail: "Emergency pathway", tone: "urgent" },
        { label: "New severe headache", detail: "Prompt assessment", tone: "urgent" },
      ],
      imagePrompt: "Minimal textless emergency warning still life for dizziness, phone, abstract balance shapes, calm red accent, no readable text, no people, no body closeups, no distressing imagery",
    },
  ],
  "medical-certificate-centrelink": [
    {
      id: "centrelink-certificate-types",
      eyebrow: "Form fit",
      title: "Different Centrelink situations need different evidence",
      summary: "A short illness certificate is not the same as evidence for a long-term exemption or DSP application.",
      kind: "comparison",
      accent: "blue",
      items: [
        { label: "Short absence", detail: "Standard certificate may be enough" },
        { label: "Mutual obligations", detail: "Centrelink form requirements may apply" },
        { label: "DSP evidence", detail: "Usually needs treating history and reports", tone: "caution" },
      ],
      imagePrompt: "Australian admin paperwork scene, myGov-style laptop without readable screen text, folder and calendar, warm daylight",
    },
    {
      id: "centrelink-evidence-stack",
      eyebrow: "Evidence stack",
      title: "Long-term claims need more than a one-off note",
      summary: "Treating GP reports, specialist letters, investigations, and function history matter for complex claims.",
      kind: "checklist",
      accent: "amber",
      items: [
        { label: "Diagnosis", detail: "Clear and documented" },
        { label: "Treatment history", detail: "Shows what has been tried" },
        { label: "Functional impact", detail: "Connects condition to daily limits" },
      ],
      imagePrompt: "Textless organised evidence stack still life, blank folder, blank documents, calendar with no numbers or words, warm administrative healthcare style, no readable text, no people",
    },
  ],
  gout: [
    {
      id: "gout-flare-timeline",
      eyebrow: "Flare pattern",
      title: "Gout flares often peak fast",
      summary: "Sudden severe joint pain, swelling, warmth, and tenderness are typical, but infection can mimic it.",
      kind: "timeline",
      accent: "rose",
      items: [
        { label: "Sudden onset", detail: "Often overnight" },
        { label: "Peak pain", detail: "Can be intense in the first day" },
        { label: "Atypical features", detail: "Fever or spreading redness needs assessment", tone: "urgent" },
      ],
      imagePrompt: "Non-graphic gout flare concept, foot resting near bed with subtle red accent, no readable text, respectful clinical style",
    },
    {
      id: "gout-prevention-levers",
      eyebrow: "Prevention",
      title: "Long-term control is different from flare relief",
      summary: "Reducing future attacks usually means reviewing urate level, triggers, kidney function, and long-term plan.",
      kind: "checklist",
      accent: "emerald",
      items: [
        { label: "Urate target", detail: "Discuss blood testing and treatment goals" },
        { label: "Trigger pattern", detail: "Alcohol, dehydration, diet, illness, medicines" },
        { label: "Kidney and heart risk", detail: "Comorbidities change the plan" },
      ],
      imagePrompt: "Calm gout prevention visual, water glass, medication organiser without labels, healthy meal, no readable text",
    },
  ],
  "medical-certificate-surgery-recovery": [
    {
      id: "surgery-recovery-phases",
      eyebrow: "Recovery phases",
      title: "Recovery certificates should match the actual restriction",
      summary: "Pain, fatigue, wound care, driving, lifting, and infection risk can affect return-to-work timing.",
      kind: "timeline",
      accent: "blue",
      items: [
        { label: "Immediate recovery", detail: "Rest, pain control, wound care" },
        { label: "Functional return", detail: "Driving, lifting, standing, concentration" },
        { label: "Review", detail: "Complications or slow recovery need follow-up", tone: "caution" },
      ],
      imagePrompt: "Post-surgery home recovery scene, couch, water, discharge paperwork without readable text, calm warm daylight",
    },
    {
      id: "modified-duties",
      eyebrow: "Work capacity",
      title: "Return-to-work can be full, delayed, or modified",
      summary: "A useful plan distinguishes desk duties from physical duties and short shifts from full workload.",
      kind: "comparison",
      accent: "emerald",
      items: [
        { label: "Desk work", detail: "May return earlier if pain and fatigue allow" },
        { label: "Physical work", detail: "Lifting, bending, standing can need longer" },
        { label: "Red flags", detail: "Fever, wound changes, chest pain, or breathlessness", tone: "urgent" },
      ],
      imagePrompt: "Textless return-to-work planning still life after surgery, blank planner, blank calendar blocks, pen, water glass, calm clinical palette, no people, no doctors, no faces, no readable text",
    },
  ],
  "pbs-pharmaceutical-benefits-scheme": [
    {
      id: "pbs-price-pathway",
      eyebrow: "Cost pathway",
      title: "PBS cost depends on listing, eligibility, and safety net status",
      summary: "A medicine can be prescription-only without being subsidised for every patient or every indication.",
      kind: "flow",
      accent: "blue",
      items: [
        { label: "Listed medicine", detail: "Is it on the PBS?" },
        { label: "Patient criteria", detail: "Does the indication meet rules?" },
        { label: "Safety net", detail: "Costs may reduce after threshold" },
      ],
      imagePrompt: "Textless PBS medicine cost pathway still life, phone with blank screen, blank receipt shapes, neutral medicine box with no letters, no pharmacy signage, no Rx symbols, no people, calm daylight",
    },
    {
      id: "pbs-authority",
      eyebrow: "Authority rules",
      title: "Some PBS medicines need authority approval",
      summary: "Authority requirements are designed to match subsidy with clinical criteria.",
      kind: "checklist",
      accent: "amber",
      items: [
        { label: "Streamlined", detail: "Code may be used when criteria are met" },
        { label: "Authority required", detail: "Prescriber must confirm eligibility" },
        { label: "Private script", detail: "May cost more if PBS criteria are not met" },
      ],
      imagePrompt: "Textless authority approval checkpoint still life, blank forms, soft checkmark shapes, neutral medicine box with no letters, warm ivory and blue accents, no people, no clinicians, no readable text",
    },
  ],
  "medical-certificate-pregnancy-related-absence": [
    {
      id: "pregnancy-absence-reasons",
      eyebrow: "Common reasons",
      title: "Pregnancy-related absence can be legitimate sick leave",
      summary: "Nausea, fatigue, pain, bleeding concerns, appointments, and complications can affect work capacity.",
      kind: "spectrum",
      accent: "rose",
      items: [
        { label: "Common symptoms", detail: "Nausea, fatigue, pelvic pain" },
        { label: "Work demands", detail: "Standing, lifting, travel, long shifts" },
        { label: "Complications", detail: "Need clinician review and sometimes urgent care", tone: "caution" },
      ],
      imagePrompt: "Respectful pregnancy sick leave visual, calendar, water glass, soft blanket, no readable text, no medical examination imagery",
    },
    {
      id: "pregnancy-red-flags",
      eyebrow: "Urgent signs",
      title: "Some pregnancy symptoms should not wait",
      summary: "Bleeding, severe pain, fainting, severe headache, vision changes, reduced fetal movement, or breathlessness need prompt care.",
      kind: "warning",
      accent: "rose",
      items: [
        { label: "Bleeding or severe pain", detail: "Prompt medical assessment", tone: "urgent" },
        { label: "Headache or vision changes", detail: "Especially later in pregnancy", tone: "urgent" },
        { label: "Reduced fetal movement", detail: "Follow maternity service advice", tone: "urgent" },
      ],
      imagePrompt: "Minimal textless pregnancy red-flag safety still life, phone with blank screen, soft warning shape, blank notebook with no letters, calm serious tone, no people, no clinicians, no readable text",
    },
  ],
}

function withAssetPaths(slug: TopVisualArticleSlug, visuals: ArticleVisual[]): ArticleVisual[] {
  return visuals.map((visual) => ({
    ...visual,
    assetPath: visual.assetPath ?? `/images/blog/${slug}/${visual.id}.webp`,
  }))
}

export function getArticleVisuals(slug: string): ArticleVisual[] {
  const topSlug = slug as TopVisualArticleSlug
  const visuals = visualLibrary[topSlug]
  return visuals ? withAssetPaths(topSlug, visuals) : []
}

export function getAllTopArticleVisuals(): Record<TopVisualArticleSlug, ArticleVisual[]> {
  return Object.fromEntries(
    TOP_VISUAL_ARTICLE_SLUGS.map((slug) => [slug, withAssetPaths(slug, visualLibrary[slug])]),
  ) as Record<TopVisualArticleSlug, ArticleVisual[]>
}
