/**
 * Ear, nose & throat conditions -- SEO landing page data
 * Part of the conditions data split. See ./index.ts for the combined export.
 */

import type { ConditionData } from "../conditions"

export const entConditions: Record<string, ConditionData> = {
  "tonsillitis": {
    name: "Tonsillitis",
    slug: "tonsillitis",
    description:
      "Inflammation of the tonsils, usually caused by viral or bacterial infection. Common in children and young adults, causing sore throat, difficulty swallowing, and fever.",
    searchIntent:
      "People searching for tonsillitis typically need a medical certificate for work or school absence, or want advice on whether they need antibiotics.",
    symptoms: [
      "Severe sore throat",
      "Difficulty or pain when swallowing",
      "Swollen, red tonsils (may have white spots)",
      "Fever and chills",
      "Swollen lymph nodes in the neck",
      "Bad breath",
      "Headache",
      "Ear pain",
    ],
    whenToSeek: [
      "Sore throat lasting more than 48 hours",
      "Difficulty swallowing fluids",
      "Fever over 38.5°C for more than 2 days",
      "Recurring tonsillitis (more than 5 episodes per year)",
      "You need a medical certificate for work or study",
    ],
    whenEmergency: [
      "Difficulty breathing",
      "Unable to swallow saliva (drooling)",
      "Severe neck swelling",
      "Difficulty opening your mouth",
    ],
    canWeHelp: {
      yes: [
        "Medical certificates for time off work or study",
        "Assessment of whether antibiotics may be needed",
        "Advice on symptom management and pain relief",
        "Guidance on when to return to work",
      ],
      no: [
        "Physical examination of tonsils (in-person assessment may be needed)",
        "Surgical referrals for tonsillectomy",
        "Treatment if you're experiencing emergency symptoms",
      ],
    },
    commonQuestions: [
      {
        q: "Can I get a medical certificate for tonsillitis?",
        a: "Yes. Tonsillitis often requires several days off work. Our doctors can provide a medical certificate if your symptoms warrant time off.",
      },
      {
        q: "Do I need antibiotics for tonsillitis?",
        a: "Not always. Most tonsillitis is viral and resolves on its own. Bacterial tonsillitis may benefit from antibiotics, but a doctor needs to assess your symptoms.",
      },
      {
        q: "How long is tonsillitis contagious?",
        a: "Usually contagious for 24-48 hours after starting antibiotics (if bacterial), or until symptoms improve (if viral). Most people should stay home for 2-3 days.",
      },
      {
        q: "When should I see a doctor in person for tonsillitis?",
        a: "If you can't swallow fluids, have difficulty breathing, or symptoms last more than 5 days, see a doctor in person for a throat examination.",
      },
    ],
    relatedConditions: ["cold-and-flu", "sinusitis", "conjunctivitis"],
    serviceType: "both",
    ctaText: "Get assessed",
    ctaHref: "/request?service=consult",
    stats: { avgTime: "40 mins", satisfaction: "4.8/5" },
    doctorPerspective: "Tonsillitis is overwhelmingly viral in origin - around 70-80% of cases - which means antibiotics will not help in most instances. The clinical challenge is distinguishing viral tonsillitis from Group A Streptococcal (GAS) infection, which does benefit from antibiotic treatment. Classic GAS features include sudden onset, severe throat pain, high fever, tonsillar exudate (white patches), tender anterior cervical lymph nodes, and absence of cough. The Centor criteria help quantify the probability. Even without antibiotics, most viral tonsillitis resolves in 5-7 days. Recurrent tonsillitis (7+ episodes in a year, or 5+ per year for 2 years) may warrant tonsillectomy referral. Via telehealth, I can assess the history pattern and decide whether antibiotics are appropriate or whether symptomatic management is the better approach.",
    auStats: [
      "Tonsillitis is one of the most common ENT presentations in Australian general practice",
      "Australia has one of the highest tonsillectomy rates in the world, particularly for children",
      "Group A Streptococcus causes approximately 20-30% of tonsillitis cases in children and 5-15% in adults",
      "Rheumatic fever from untreated strep throat remains a significant issue in Aboriginal and Torres Strait Islander communities",
    ],
    recoveryTimeline: {
      typical: "Viral tonsillitis: 5-7 days. Bacterial tonsillitis with antibiotics: significant improvement within 48 hours, course completed in 5-10 days. Peritonsillar abscess (quinsy): requires urgent in-person drainage.",
      returnToWork: "Return to work once you can swallow comfortably and your fever has resolved (usually 3-5 days). If prescribed antibiotics for strep throat, you are generally considered non-contagious after 24 hours of treatment.",
      whenToReassess: "See a doctor urgently if you cannot swallow at all (including your own saliva), if you develop a muffled voice ('hot potato' voice), if one tonsil appears much larger than the other, or if you have difficulty breathing. These may indicate a peritonsillar abscess.",
    },
    selfCareTips: [
      "Gargle with warm salt water (half a teaspoon in a glass of warm water) - this reduces swelling and discomfort",
      "Paracetamol and ibuprofen together provide better pain relief than either alone (stagger them every 3 hours)",
      "Eat soft, cool foods - ice cream, yoghurt, and cold smoothies soothe the throat better than hot drinks",
      "Stay hydrated - aim for frequent small sips if swallowing is painful",
      "Use throat lozenges or anaesthetic throat spray for temporary pain relief",
      "Rest your voice if it is painful to talk",
    ],
    treatmentInfo: {
      overview: "Most tonsillitis is viral (70-80% of cases) and does not require antibiotics. Antibiotics are indicated for confirmed or highly probable Group A Streptococcal infection, assessed using the modified Centor criteria. Pain management with paracetamol and ibuprofen is the cornerstone of treatment for both viral and bacterial tonsillitis.",
      medications: [
        {
          genericName: "Phenoxymethylpenicillin",
          brandNames: ["Abbocillin VK"],
          drugClass: "Penicillin antibiotic",
          typicalDose: "500mg twice daily for 10 days",
          pbsListed: true,
          pbsNote: "PBS listed for Group A Streptococcal tonsillitis/pharyngitis",
          prescriptionRequired: true,
          availableOnline: true,
          keyPoints: [
            "First-line antibiotic for confirmed strep throat in Australia",
            "Narrow-spectrum - less impact on gut flora than broad-spectrum antibiotics",
            "Full 10-day course required to prevent rheumatic fever (even if feeling better)",
            "Only needed when Centor score suggests streptococcal infection",
          ],
        },
        {
          genericName: "Cefalexin",
          brandNames: ["Keflex", "Ibilex"],
          drugClass: "Cephalosporin antibiotic",
          typicalDose: "500mg twice daily for 10 days",
          pbsListed: true,
          pbsNote: "PBS listed for penicillin-intolerant patients with strep throat",
          prescriptionRequired: true,
          availableOnline: true,
          keyPoints: [
            "Alternative for patients with non-severe penicillin allergy",
            "Broader spectrum than penicillin V",
            "Not suitable for patients with severe penicillin allergy (anaphylaxis)",
            "Complete the full course to prevent recurrence",
          ],
        },
        {
          genericName: "Ibuprofen",
          brandNames: ["Nurofen", "Advil", "Brufen"],
          drugClass: "Non-steroidal anti-inflammatory drug (NSAID)",
          typicalDose: "400mg every 6-8 hours as needed (max 1200mg/day)",
          pbsListed: false,
          prescriptionRequired: false,
          availableOnline: false,
          keyPoints: [
            "More effective than paracetamol for throat pain (anti-inflammatory effect)",
            "Can be alternated with paracetamol for better pain control",
            "Available over-the-counter at pharmacies",
            "Take with food to reduce stomach irritation",
          ],
        },
      ],
      guidelineSource: "Therapeutic Guidelines - Antibiotic, 2024",
      whenToSeeSpecialist: "Referral to an ENT surgeon is recommended for recurrent tonsillitis (7+ episodes in 1 year, or 5+/year for 2 consecutive years), peritonsillar abscess (quinsy), or suspected tonsil malignancy (unilateral enlargement in an adult).",
    },
    reviewedDate: "2026-03",
  },
  "ear-infection": {
    name: "Ear Infection",
    slug: "ear-infection",
    description:
      "Infection of the middle or outer ear causing pain, discharge, and sometimes hearing changes. Common in both children and adults, often following a cold or upper respiratory infection.",
    searchIntent:
      "People searching for ear infections want pain relief advice, need a medical certificate, or want to know if they need antibiotics.",
    symptoms: [
      "Ear pain (can be sharp or dull)",
      "Feeling of fullness or pressure in the ear",
      "Reduced hearing or muffled sounds",
      "Discharge from the ear",
      "Fever",
      "Balance problems or dizziness",
      "Headache on the affected side",
    ],
    whenToSeek: [
      "Ear pain lasting more than 48 hours",
      "Discharge from the ear",
      "Hearing loss",
      "Symptoms in children under 2",
      "You need a medical certificate for work or study",
    ],
    whenEmergency: [
      "Sudden severe hearing loss",
      "Facial drooping on the affected side",
      "High fever with stiff neck",
      "Severe dizziness with vomiting",
    ],
    canWeHelp: {
      yes: [
        "Medical certificates for time off work",
        "Advice on pain management",
        "Assessment of whether you need antibiotics",
        "Guidance on when to see an ENT specialist",
      ],
      no: [
        "Physical ear examination (otoscopy)",
        "Treatment for chronic or recurring ear infections",
        "Ear infections in young children (needs in-person assessment)",
      ],
    },
    commonQuestions: [
      {
        q: "Can I get a medical certificate for an ear infection?",
        a: "Yes. Ear infections can be quite painful and affect your ability to work. Our doctors can provide a medical certificate when appropriate.",
      },
      {
        q: "Do ear infections always need antibiotics?",
        a: "No. Many ear infections resolve on their own within 2-3 days. Antibiotics may be recommended if symptoms are severe or don't improve.",
      },
      {
        q: "Can telehealth help with ear infections?",
        a: "Telehealth is good for initial assessment, pain management advice, and medical certificates. If an ear examination is needed, we'll refer you to see a doctor in person.",
      },
      {
        q: "How long do ear infections last?",
        a: "Most ear infections improve within 2-3 days and resolve fully within 1-2 weeks. If symptoms persist beyond a week, see a doctor.",
      },
    ],
    relatedConditions: ["cold-and-flu", "sinusitis", "tonsillitis"],
    serviceType: "both",
    ctaText: "Get assessed",
    ctaHref: "/request?service=consult",
    stats: { avgTime: "35 mins", satisfaction: "4.7/5" },
    doctorPerspective: "Ear infections are very common, particularly in children, and can be assessed effectively via telehealth using a detailed symptom history. In adults, the most common presentation is otitis externa (outer ear infection or 'swimmer's ear') - pain that worsens when you tug the earlobe, with possible discharge. This is usually treated with antibiotic-steroid ear drops. Otitis media (middle ear infection) causes deep ear pain, sometimes with fever and hearing changes, and often follows a cold. In adults, most middle ear infections are viral and resolve without antibiotics in 2-3 days. Antibiotics are reserved for severe symptoms, bilateral infection, or symptoms persisting beyond 48 hours. The key red flag I screen for is mastoiditis - pain and swelling behind the ear - which requires urgent in-person assessment. I also ask about hearing changes, as sudden hearing loss needs prompt investigation.",
    auStats: [
      "Ear infections are the most common reason for antibiotic prescriptions in Australian children",
      "Aboriginal and Torres Strait Islander children have significantly higher rates of otitis media, particularly chronic suppurative otitis media",
      "Otitis externa ('swimmer's ear') is more common in tropical Australian climates",
      "Overuse of antibiotics for viral ear infections contributes to antimicrobial resistance - a major public health concern in Australia",
    ],
    recoveryTimeline: {
      typical: "Otitis externa: 7-10 days with antibiotic drops. Otitis media: most resolve in 2-3 days; if antibiotics are needed, improvement within 48 hours. Hearing changes may take several weeks to fully resolve as fluid drains from the middle ear.",
      returnToWork: "Most adults can work with an ear infection, though pain and reduced hearing may be distracting. 1-2 days off during the acute phase is reasonable. Avoid swimming until outer ear infections have fully resolved.",
      whenToReassess: "See a doctor urgently if you develop swelling or redness behind the ear (possible mastoiditis), high fever with ear pain, sudden significant hearing loss, facial weakness on the affected side, or discharge that persists beyond 2 weeks.",
    },
    selfCareTips: [
      "For pain relief, alternate paracetamol and ibuprofen every 3 hours (follow packet directions for each)",
      "Apply a warm compress to the affected ear - a warm washcloth held against the ear can ease pain",
      "Keep water out of the affected ear - use earplugs or cotton wool with petroleum jelly when showering",
      "Do not insert anything into the ear canal - no cotton buds, no drops unless prescribed",
      "For swimmer's ear prevention: dry ears thoroughly after swimming using a gentle hairdryer on low heat held at arm's length",
      "Sleep with the affected ear facing up to allow gravity to assist drainage",
    ],
    reviewedDate: "2026-03",
  },
  "sore-throat": {
    name: "Sore Throat",
    slug: "sore-throat",
    description:
      "Pain, scratchiness, or irritation in the throat that often worsens when swallowing. Usually caused by viral infections, but can also be bacterial (strep throat).",
    searchIntent:
      "People searching for sore throat want to know if they need antibiotics, need a medical certificate for work, or want advice on home remedies.",
    symptoms: [
      "Pain or scratchiness in the throat",
      "Difficulty or pain when swallowing",
      "Swollen glands in the neck",
      "Hoarse or muffled voice",
      "Red or swollen tonsils",
      "White patches on the tonsils",
      "Fever",
      "Headache",
    ],
    whenToSeek: [
      "Sore throat lasting more than a week",
      "Difficulty swallowing fluids",
      "Fever lasting more than 3 days",
      "Recurring sore throats",
      "You need a medical certificate for work or study",
    ],
    whenEmergency: [
      "Difficulty breathing or swallowing",
      "Inability to open your mouth",
      "Drooling (unable to swallow saliva)",
      "Severe neck swelling",
    ],
    canWeHelp: {
      yes: [
        "Medical certificates for time off work or study",
        "Advice on whether antibiotics are needed",
        "Pain management recommendations",
        "Guidance on when to see a GP in person",
      ],
      no: [
        "Throat swab testing",
        "Treatment for peritonsillar abscess",
        "Ongoing throat conditions requiring ENT referral",
      ],
    },
    commonQuestions: [
      {
        q: "Can I get a medical certificate for a sore throat?",
        a: "Yes. If your sore throat is severe enough to keep you from work, our doctors can provide a medical certificate.",
      },
      {
        q: "Do I need antibiotics for a sore throat?",
        a: "Most sore throats are viral and don't need antibiotics. Bacterial infections (strep throat) may benefit from antibiotics - a doctor can assess.",
      },
      {
        q: "How long does a sore throat last?",
        a: "Viral sore throats usually resolve in 5-7 days. If it lasts more than a week or gets worse, see a doctor.",
      },
      {
        q: "What's the fastest way to get rid of a sore throat?",
        a: "Rest, fluids, throat lozenges, and paracetamol or ibuprofen for pain. Gargling warm salt water can also help. See a doctor if it's severe.",
      },
    ],
    relatedConditions: ["cold-and-flu", "tonsillitis", "sinusitis"],
    serviceType: "med-cert",
    ctaText: "Get a certificate",
    ctaHref: "/request?service=med-cert",
    stats: { avgTime: "25 mins", satisfaction: "4.8/5" },
    doctorPerspective: "A sore throat is one of the most common reasons people seek medical attention, and the overwhelming majority are viral - caused by the same viruses that cause colds and flu. The clinical question is whether antibiotics are warranted, and for most sore throats, the answer is no. I use the modified Centor criteria to assess the probability of Group A Strep infection: fever, tonsillar exudate, tender cervical lymph nodes, absence of cough, and age. A score of 3 or more suggests possible strep and may warrant antibiotics. What patients often do not realise is that even untreated strep throat resolves on its own in most cases - the primary reason we treat with antibiotics is to prevent rheumatic fever (rare in non-Indigenous Australians) and to reduce the duration and severity of symptoms. For viral sore throats, the best treatment is pain management: paracetamol, ibuprofen, and warm salt water gargles.",
    auStats: [
      "Sore throat accounts for approximately 5% of all GP consultations in Australia",
      "Group A Strep causes only 15-30% of sore throats in children and 5-15% in adults - the rest are viral",
      "Rheumatic heart disease remains a critical concern in Aboriginal and Torres Strait Islander communities",
      "Antibiotics for viral sore throats contribute to antimicrobial resistance without clinical benefit",
    ],
    recoveryTimeline: {
      typical: "Viral sore throat: 5-7 days, peaking around day 2-3. Bacterial (strep) with antibiotics: significant improvement in 24-48 hours, course completed in 5-10 days. Glandular fever (EBV): sore throat can persist for 2-3 weeks.",
      returnToWork: "Most people can work with a sore throat once the worst pain and fever have passed (usually 2-3 days). Good hand hygiene and covering coughs help prevent spreading the infection to colleagues.",
      whenToReassess: "See a doctor if you cannot swallow at all (including saliva), if you develop a muffled or 'hot potato' voice, if one side of your throat is significantly more swollen than the other, if you have difficulty breathing, or if symptoms persist beyond 7 days without improvement.",
    },
    selfCareTips: [
      "Gargle with warm salt water several times a day - half a teaspoon of salt in a glass of warm water",
      "Paracetamol and ibuprofen together provide more effective pain relief than either alone",
      "Throat lozenges or anaesthetic throat spray provide temporary local pain relief",
      "Warm drinks (honey and lemon in warm water, herbal tea) soothe the throat - avoid very hot drinks",
      "Stay hydrated - small, frequent sips if swallowing is painful. Cold drinks and ice blocks can also numb the throat",
      "Rest your voice if talking is painful - avoid whispering, which actually strains the vocal cords more than soft speaking",
    ],
    reviewedDate: "2026-03",
  },
  conjunctivitis: {
    name: "Conjunctivitis (Pink Eye)",
    slug: "conjunctivitis",
    description:
      "Inflammation of the conjunctiva (eye lining), causing redness, itching, and discharge. Can be viral, bacterial, or allergic.",
    searchIntent:
      "People with pink eye want to know if it's contagious, how to treat it, and whether they need time off work.",
    symptoms: [
      "Red or pink eyes",
      "Itchy or gritty sensation",
      "Watery or sticky discharge",
      "Swollen eyelids",
      "Sensitivity to light",
      "Blurred vision (usually mild)",
    ],
    whenToSeek: [
      "Eye pain or severe discomfort",
      "Vision changes",
      "Symptoms not improving after a few days",
      "Wearing contact lenses",
      "You need a medical certificate (contagious for work)",
    ],
    whenEmergency: [
      "Severe eye pain",
      "Sudden vision loss",
      "Chemical splash in eye",
      "Deep eye injury",
    ],
    canWeHelp: {
      yes: [
        "Assessment of conjunctivitis type (viral vs bacterial)",
        "Treatment recommendations",
        "Medical certificates when contagious (e.g. childcare, healthcare workers)",
        "Advice on when to return to work",
      ],
      no: [
        "Eye examination with equipment",
        "Treatment for severe or complicated eye conditions",
      ],
    },
    commonQuestions: [
      {
        q: "Is pink eye contagious?",
        a: "Viral and bacterial conjunctivitis are contagious. Allergic conjunctivitis is not. Good hand hygiene and avoiding touching eyes helps prevent spread.",
      },
      {
        q: "How long should I stay home with pink eye?",
        a: "For bacterial conjunctivitis, until 24 hours after starting antibiotics. For viral, while symptoms are severe. Some workplaces (childcare, healthcare) have stricter rules.",
      },
      {
        q: "Do I need antibiotics for pink eye?",
        a: "Bacterial conjunctivitis often improves with antibiotic drops. Viral conjunctivitis doesn't need antibiotics - it resolves on its own.",
      },
      {
        q: "Can I get a medical certificate for pink eye?",
        a: "Yes, especially if you work in childcare, healthcare, or food service where contagious eye infections may require time off.",
      },
    ],
    relatedConditions: ["hay-fever", "cold-and-flu", "skin-rash"],
    serviceType: "both",
    ctaText: "Get assessed",
    ctaHref: "/request?service=consult&condition=conjunctivitis",
    stats: { avgTime: "40 mins", satisfaction: "4.8/5" },
    doctorPerspective: "Conjunctivitis is common and almost always straightforward, but the type matters for treatment. Viral conjunctivitis - the most common form - causes watery discharge, often starts in one eye and spreads to the other, and resolves on its own in 1-2 weeks. There is no effective treatment; antibiotics do not help. Bacterial conjunctivitis causes thick, yellow-green discharge that crusts the eyelids overnight and may benefit from antibiotic eye drops. Allergic conjunctivitis causes intense itching with clear, watery discharge and often occurs alongside hay fever. The key thing I assess remotely is whether the presentation is consistent with simple conjunctivitis or whether there are warning signs - significant pain (not just irritation), sensitivity to light, blurred vision, or a history of contact lens wear with a red eye. These need same-day in-person assessment to rule out more serious conditions like keratitis or uveitis.",
    auStats: [
      "Conjunctivitis accounts for approximately 1% of all GP consultations in Australia",
      "Viral conjunctivitis is the most common cause in adults, while bacterial is more common in children",
      "Allergic conjunctivitis affects up to 20% of Australians, often alongside hay fever",
      "Antibiotic eye drops are overprescribed for viral conjunctivitis, which resolves without treatment",
    ],
    recoveryTimeline: {
      typical: "Viral: 7-14 days (no treatment speeds this up). Bacterial: 5-7 days with antibiotic drops, up to 10 days without. Allergic: resolves when allergen exposure stops or with antihistamine drops.",
      returnToWork: "You can typically work with conjunctivitis, though viral and bacterial forms are contagious. Good hand hygiene is essential. Avoid sharing towels, pillows, or eye makeup. Children are usually excluded from school until discharge has cleared.",
      whenToReassess: "See a doctor urgently if you experience significant eye pain, light sensitivity, blurred vision, or if you wear contact lenses and develop a red eye. These may indicate a corneal infection requiring prompt treatment.",
    },
    selfCareTips: [
      "Clean discharge from the eyes gently with a clean, warm, damp cloth - use a fresh cloth each time",
      "Avoid touching or rubbing your eyes - this spreads infection and worsens irritation",
      "Do not wear contact lenses until the infection has fully cleared",
      "Use lubricating eye drops (artificial tears) to relieve discomfort",
      "For allergic conjunctivitis, cold compresses and antihistamine eye drops provide quick relief",
      "Wash hands frequently and do not share towels, pillowcases, or eye makeup",
    ],
    reviewedDate: "2026-03",
  },
  "pink-eye": {
    name: "Pink Eye (Conjunctivitis)",
    slug: "pink-eye",
    description:
      "Inflammation or infection of the clear membrane covering the white of the eye. Causes redness, itching, and discharge. Can be viral, bacterial, or allergic.",
    searchIntent:
      "People searching for pink eye want to know if it's contagious, need a medical certificate for work or school, or want treatment advice.",
    symptoms: [
      "Redness in one or both eyes",
      "Itching or burning sensation",
      "Watery or sticky discharge",
      "Crusty eyelids (especially in the morning)",
      "Gritty feeling in the eye",
      "Swollen eyelids",
      "Sensitivity to light",
    ],
    whenToSeek: [
      "Symptoms not improving after 2-3 days",
      "Significant discharge from the eye",
      "Pain in the eye (not just irritation)",
      "Vision changes",
      "You need a medical certificate for work or school",
    ],
    whenEmergency: [
      "Sudden loss of vision",
      "Severe eye pain",
      "Sensitivity to light with severe headache",
      "Injury to the eye",
    ],
    canWeHelp: {
      yes: [
        "Medical certificates for time off work or school",
        "Assessment of whether it's viral, bacterial, or allergic",
        "Advice on symptom management and hygiene",
        "Guidance on preventing spread to others",
      ],
      no: [
        "Eye examination with specialised equipment",
        "Prescription eye drops for severe infections",
        "Treatment for corneal conditions",
      ],
    },
    commonQuestions: [
      {
        q: "Can I get a medical certificate for pink eye?",
        a: "Yes. Conjunctivitis is contagious and many workplaces require you to stay home. Our doctors can provide a certificate for the necessary time off.",
      },
      {
        q: "How long is pink eye contagious?",
        a: "Viral conjunctivitis is contagious for 10-14 days. Bacterial conjunctivitis is contagious until 24 hours after starting antibiotic drops. Allergic conjunctivitis isn't contagious.",
      },
      {
        q: "Can telehealth diagnose pink eye?",
        a: "Telehealth can assess your symptoms and provide advice. If treatment isn't improving symptoms, an in-person eye examination may be recommended.",
      },
      {
        q: "Do I need antibiotic eye drops?",
        a: "Not always. Viral and allergic conjunctivitis don't respond to antibiotics. Bacterial conjunctivitis may benefit from antibiotic drops - a doctor can advise.",
      },
    ],
    relatedConditions: ["conjunctivitis", "hay-fever", "cold-and-flu"],
    serviceType: "med-cert",
    ctaText: "Get a certificate",
    ctaHref: "/request?service=med-cert",
    stats: { avgTime: "25 mins", satisfaction: "4.7/5" },
    doctorPerspective: "Pink eye and conjunctivitis are the same condition - the term 'pink eye' is simply the colloquial name. This page exists because many Australians search for 'pink eye' rather than 'conjunctivitis.' The clinical assessment is identical: I determine whether the presentation is viral (watery discharge, often bilateral, following a cold), bacterial (thick yellow-green discharge, crusting overnight, often unilateral), or allergic (intense itch, clear discharge, often seasonal). The most common mistake is treating viral pink eye with antibiotic drops - this does nothing except expose you to potential side effects and contribute to antibiotic resistance. Simple viral pink eye resolves on its own in 1-2 weeks. The key warning signs I screen for are pain (not just irritation), light sensitivity, blurred vision that does not clear with blinking, or contact lens wear with a red eye - all of which need in-person ophthalmological assessment.",
    auStats: [
      "Conjunctivitis (pink eye) is one of the most common eye conditions seen in Australian general practice",
      "Viral conjunctivitis is the most common cause in adults and is highly contagious for 10-14 days",
      "Antibiotic eye drops are frequently overprescribed for viral pink eye, which resolves without treatment",
      "Allergic conjunctivitis often co-occurs with hay fever and is more common in spring and summer",
    ],
    recoveryTimeline: {
      typical: "Viral: 7-14 days without specific treatment. Bacterial: 5-7 days with antibiotic drops, up to 10 days without. Allergic: resolves when allergen exposure stops or with antihistamine treatment.",
      returnToWork: "Adults can generally work with pink eye if symptoms are manageable. Good hand hygiene is essential to prevent spreading. Children are typically excluded from school or childcare until discharge has cleared.",
      whenToReassess: "See a doctor urgently if you experience significant eye pain (not just irritation), sensitivity to light, blurred vision that persists, a white spot on the coloured part of the eye, or if you wear contact lenses and develop a red eye.",
    },
    selfCareTips: [
      "Wash hands frequently - pink eye spreads easily through hand-to-eye contact",
      "Do not share towels, pillowcases, or eye makeup with anyone while symptomatic",
      "Clean discharge gently with a clean, warm, damp cloth - use a fresh cloth each time and for each eye",
      "Do not wear contact lenses until the infection has completely resolved",
      "Use lubricating eye drops (artificial tears) to relieve irritation and discomfort",
      "For allergic pink eye: cold compresses and over-the-counter antihistamine eye drops provide rapid relief",
    ],
    reviewedDate: "2026-03",
  },
  vertigo: {
    name: "Vertigo & Dizziness",
    slug: "vertigo",
    description:
      "A sensation of spinning or loss of balance. Can be caused by inner ear problems, migraines, or other conditions.",
    searchIntent:
      "People with vertigo need to understand the cause and may need medical certificates when it affects work or driving.",
    symptoms: [
      "Spinning sensation",
      "Loss of balance",
      "Nausea or vomiting",
      "Nystagmus (involuntary eye movement)",
      "Sweating",
      "Hearing changes (in some types)",
    ],
    whenToSeek: [
      "First episode of vertigo",
      "Vertigo with hearing loss",
      "Vertigo lasting more than a few days",
      "Recurring episodes",
      "You need a medical certificate (unsafe to drive/work)",
    ],
    whenEmergency: [
      "Vertigo with sudden severe headache",
      "Difficulty speaking or swallowing",
      "Weakness or numbness",
      "Double vision",
      "Chest pain",
    ],
    canWeHelp: {
      yes: [
        "Medical certificates when vertigo affects work or driving",
        "Discussion of common causes (BPPV, vestibular neuritis)",
        "Advice on vestibular exercises",
        "Referral for further assessment if needed",
      ],
      no: [
        "Physical examination (Epley manoeuvre for BPPV)",
        "Hearing tests",
        "Imaging for stroke assessment",
      ],
    },
    commonQuestions: [
      {
        q: "What causes vertigo?",
        a: "Common causes include benign paroxysmal positional vertigo (BPPV), vestibular neuritis, Meniere's disease, and migraines. A doctor can help narrow it down.",
      },
      {
        q: "Can I get a medical certificate for vertigo?",
        a: "Yes. Vertigo can make driving and many jobs unsafe. Our doctors can provide a certificate if you need time off.",
      },
      {
        q: "How long does vertigo last?",
        a: "BPPV episodes can last seconds to minutes. Vestibular neuritis may last days to weeks. Recovery varies by cause.",
      },
      {
        q: "Should I drive with vertigo?",
        a: "No. Vertigo can cause sudden loss of balance and is dangerous when driving. Wait until symptoms fully resolve.",
      },
    ],
    relatedConditions: ["migraine", "anxiety", "ear-infection"],
    serviceType: "both",
    ctaText: "Get assessed",
    ctaHref: "/request?service=consult&condition=vertigo",
    stats: { avgTime: "50 mins", satisfaction: "4.8/5" },
    doctorPerspective: "Vertigo is one of the most distressing symptoms patients describe - the sensation that the room is spinning can be genuinely terrifying. The most important distinction I make during assessment is between peripheral vertigo (inner ear causes, generally benign) and central vertigo (brain causes, potentially serious). Benign Paroxysmal Positional Vertigo (BPPV) is by far the most common cause - it is triggered by specific head movements, lasts seconds to minutes, and is caused by calcium crystals dislodging in the inner ear. It can be treated very effectively with specific head positioning exercises (the Epley manoeuvre). Vestibular neuritis causes prolonged vertigo lasting days and is usually viral. The red flags I screen for are vertigo with neurological symptoms - slurred speech, weakness on one side, difficulty walking, severe headache, or double vision - which require urgent assessment to rule out stroke.",
    auStats: [
      "Vertigo affects approximately 10% of the Australian population at some point in their lives",
      "BPPV accounts for about 25% of all vertigo cases and is the most common vestibular disorder",
      "Vertigo-related falls are a significant cause of injury in Australians over 65",
      "Vestibular disorders are 2-3 times more common in women than men",
    ],
    recoveryTimeline: {
      typical: "BPPV: often resolves with 1-3 treatments using the Epley manoeuvre, sometimes within a single session. Vestibular neuritis: acute phase 1-3 days, with gradual improvement over 2-6 weeks. Ménière's disease: attacks last hours, with variable intervals between episodes.",
      returnToWork: "Do not drive or operate machinery during active vertigo episodes. For BPPV, most people can return to work within days after successful treatment. For vestibular neuritis, 1-2 weeks off may be needed. Avoid heights, ladders, and situations where a fall would be dangerous.",
      whenToReassess: "Seek urgent medical care if vertigo is accompanied by slurred speech, facial drooping, arm or leg weakness, severe headache, difficulty walking, or double vision - these may indicate stroke. Also reassess if vertigo persists beyond 2 weeks or is getting worse.",
    },
    selfCareTips: [
      "During an acute episode, sit or lie still in a position that minimises spinning - avoid sudden head movements",
      "Focus your eyes on a fixed point during an episode to help your brain recalibrate",
      "Stay hydrated - dehydration can worsen vertigo symptoms",
      "The Epley manoeuvre can be done at home for BPPV - ask your doctor to demonstrate it or watch a reliable medical video",
      "Avoid looking at screens during acute vertigo - the visual stimulation worsens nausea",
      "When the acute episode passes, gentle walking helps your brain recalibrate your balance system faster than bed rest",
    ],
    reviewedDate: "2026-03",
  },
}
