/**
 * Women's health & urological conditions -- SEO landing page data
 * Part of the conditions data split. See ./index.ts for the combined export.
 */

import type { ConditionData } from "../conditions"

export const womensHealthConditions: Record<string, ConditionData> = {
  "period-pain": {
    name: "Period Pain (Dysmenorrhoea)",
    slug: "period-pain",
    description:
      "Cramping and discomfort during menstruation. Can be primary (normal) or secondary (from conditions like endometriosis).",
    searchIntent:
      "People with period pain want relief and sometimes medical certificates when it affects work.",
    symptoms: [
      "Cramping in lower abdomen",
      "Back pain",
      "Headache",
      "Fatigue",
      "Nausea",
      "Pain before or during period",
    ],
    whenToSeek: [
      "Severe pain not helped by over-the-counter pain relief",
      "Pain with heavy bleeding",
      "Pain between periods",
      "New or worsening pain",
      "You need a medical certificate",
    ],
    whenEmergency: [
      "Severe pain with fever",
      "Fainting or severe dizziness",
      "Pain with pregnancy possibility",
    ],
    canWeHelp: {
      yes: [
        "Medical certificates for period-related absence",
        "Discussion of pain relief options",
        "Contraceptive options that can reduce period pain",
        "Referral if underlying condition suspected",
      ],
      no: [
        "Pelvic examination",
        "Ultrasound or other imaging",
        "Treatment for endometriosis (needs specialist)",
      ],
    },
    commonQuestions: [
      {
        q: "Can I get a medical certificate for period pain?",
        a: "Yes. Severe period pain is a valid reason for a medical certificate. Our doctors understand it can be debilitating.",
      },
      {
        q: "When is period pain not normal?",
        a: "See a doctor if pain is severe, doesn't respond to pain relief, occurs between periods, or is accompanied by heavy bleeding.",
      },
      {
        q: "Can the pill help period pain?",
        a: "Yes. Hormonal contraceptives can reduce period pain for many people. Our doctors can discuss options.",
      },
      {
        q: "Could I have endometriosis?",
        a: "Endometriosis can cause severe period pain. If pain is debilitating or you have other symptoms, a doctor can discuss referral for assessment.",
      },
    ],
    relatedConditions: ["anxiety", "fatigue", "migraine"],
    serviceType: "both",
    ctaText: "Get assessed",
    ctaHref: "/request?service=consult&condition=period-pain",
    stats: { avgTime: "50 mins", satisfaction: "4.8/5" },
    doctorPerspective: "Period pain is one of the most common and most dismissed health complaints. When someone tells me their period pain is bad enough to miss work, I believe them - studies show that dysmenorrhoea can produce pain comparable to a heart attack in severity. Primary dysmenorrhoea (pain without underlying disease) affects up to 90% of menstruating women and peaks in the teens and twenties. Secondary dysmenorrhoea (pain caused by endometriosis, fibroids, or other conditions) tends to develop later and worsen over time. What I look for in assessment is whether the pain pattern has changed, whether it is getting progressively worse, and whether there are associated symptoms like heavy bleeding, pain during sex, or pain between periods - these may suggest endometriosis, which affects 1 in 9 Australian women and takes an average of 7 years to diagnose. A medical certificate for period pain is entirely legitimate, and effective management options exist beyond just 'taking a Nurofen.'",
    auStats: [
      "Period pain affects up to 90% of menstruating Australians, with 20% experiencing severe pain",
      "Endometriosis affects approximately 1 in 9 Australian women and costs the economy $9.7 billion annually",
      "Period pain is one of the leading causes of school and work absenteeism for women under 25",
      "The average delay in diagnosing endometriosis in Australia is 6.5 years",
    ],
    recoveryTimeline: {
      typical: "Primary period pain typically lasts 1-3 days per cycle, peaking in the first 24-48 hours. With effective management (NSAIDs started before pain begins, heat therapy, hormonal contraceptives), most women can achieve significant pain reduction.",
      returnToWork: "Severe period pain may require 1-2 days off per cycle. If you are regularly missing work due to period pain, discuss this with your doctor - better management options may be available, including hormonal treatments that can reduce or eliminate periods entirely.",
      whenToReassess: "See a doctor if period pain is worsening over time, if you have very heavy bleeding (soaking through a pad or tampon every hour), pain during sex, difficulty falling pregnant, or if over-the-counter treatments are not providing adequate relief.",
    },
    selfCareTips: [
      "Start NSAIDs (ibuprofen) 1-2 days before your period is due - they work better as prevention than as rescue treatment",
      "Apply heat to the lower abdomen - a heat pack or hot water bottle is as effective as ibuprofen for mild-moderate pain",
      "Gentle exercise (walking, yoga, swimming) can reduce period pain through endorphin release",
      "Consider a TENS machine for drug-free pain relief - evidence supports their use for period pain",
      "Track your cycle to anticipate and prepare for painful days (apps like Flo or Clue can help)",
      "If paracetamol and ibuprofen together are not enough, discuss prescription options with your doctor - effective treatments exist",
    ],
    reviewedDate: "2026-03",
  },
  uti: {
    name: "Urinary Tract Infection (UTI)",
    slug: "uti",
    description:
      "An infection in any part of the urinary system, most commonly affecting the bladder. More common in women and can cause painful, frequent urination.",
    searchIntent:
      "People with UTI symptoms often need quick treatment to relieve symptoms and prevent the infection from worsening.",
    symptoms: [
      "Burning sensation when urinating",
      "Frequent urge to urinate",
      "Passing small amounts of urine",
      "Cloudy or strong-smelling urine",
      "Blood in urine",
      "Pelvic pain (women)",
      "Lower abdominal discomfort",
    ],
    whenToSeek: [
      "Symptoms of a UTI (burning, frequency)",
      "Previous UTIs and recognise the symptoms",
      "Mild to moderate symptoms",
      "Need treatment to continue working",
    ],
    whenEmergency: [
      "High fever with chills",
      "Severe back or side pain",
      "Nausea and vomiting",
      "Blood in urine with fever",
      "UTI symptoms during pregnancy",
    ],
    canWeHelp: {
      yes: [
        "Assessment of uncomplicated UTI symptoms",
        "Treatment for straightforward UTIs in women",
        "Medical certificates if needed",
        "Advice on prevention",
      ],
      no: [
        "UTIs in men (these need further investigation)",
        "Complicated or recurrent UTIs",
        "UTIs during pregnancy",
        "UTIs with fever or back pain",
      ],
    },
    commonQuestions: [
      {
        q: "Can I get UTI treatment online?",
        a: "For uncomplicated UTIs in women with typical symptoms, yes. Our doctors can assess your situation and provide appropriate treatment if suitable for telehealth.",
      },
      {
        q: "How quickly does UTI treatment work?",
        a: "Most people start feeling better within 1-2 days of starting treatment. It's important to complete the full course even if you feel better.",
      },
      {
        q: "How can I prevent UTIs?",
        a: "Stay hydrated, urinate when you need to, wipe front to back, urinate after intercourse, and avoid irritating products in the genital area.",
      },
      {
        q: "When is a UTI serious?",
        a: "A UTI is serious if you develop fever, back pain, nausea, or if you're pregnant. These could indicate a kidney infection and need urgent care.",
      },
    ],
    relatedConditions: ["kidney-infection", "cystitis"],
    serviceType: "consult",
    ctaText: "Get assessed now",
    ctaHref: "/request?service=consult&condition=uti",
    stats: { avgTime: "35 mins", satisfaction: "4.9/5" },
    doctorPerspective: "UTIs are one of the most common conditions we see in telehealth, and they are well-suited to remote assessment because the diagnosis is primarily symptom-based. If you are experiencing the classic triad - burning when you urinate, increased frequency, and urgency - and you are an otherwise healthy woman under 65, the probability of a UTI is over 90%. This is why guidelines in Australia and internationally support empiric antibiotic treatment based on symptoms alone, without requiring a urine test first. However, there are important exceptions: recurrent UTIs (three or more per year), UTIs in men (which always warrant investigation), symptoms suggesting the infection has reached the kidneys (back pain, fever, chills), and UTIs during pregnancy all require more careful assessment. I always ask about these factors in a consultation. Left untreated, a simple bladder infection can ascend to the kidneys, so prompt treatment matters.",
    auStats: [
      "UTIs account for approximately 1-3% of all GP consultations in Australia",
      "1 in 2 Australian women will experience at least one UTI in their lifetime",
      "Uncomplicated UTIs can be treated via telehealth under PBS guidelines without a urine test",
      "E. coli causes approximately 80% of community-acquired UTIs in Australia",
    ],
    recoveryTimeline: {
      typical: "With antibiotic treatment, most UTI symptoms improve within 24-48 hours. A standard course is 3-5 days of antibiotics. Full resolution usually occurs within a week.",
      returnToWork: "Most people can continue working with a UTI, though the discomfort can be distracting. If symptoms are severe, 1-2 days off may be reasonable. Ensure you have easy bathroom access and stay well hydrated.",
      whenToReassess: "See a doctor urgently if you develop fever, chills, back or side pain, or nausea - this may indicate the infection has reached your kidneys. Also reassess if symptoms have not improved after 48 hours of antibiotics, as the bacteria may be resistant.",
    },
    selfCareTips: [
      "Drink plenty of water - aim for 2-3 litres per day to help flush bacteria",
      "Urinate as soon as you feel the urge - holding on can worsen the infection",
      "Wipe front to back after using the toilet",
      "Urinate soon after sexual intercourse - this is one of the most effective preventive measures",
      "Avoid irritants like bubble bath, scented soaps, and douches near the urethra",
      "Cranberry products may help prevent (not treat) recurrent UTIs, though evidence is mixed",
    ],
    treatmentInfo: {
      overview: "Uncomplicated UTIs in women are treated with a short course of antibiotics. The choice depends on local resistance patterns, allergies, and pregnancy status. Most women improve within 24-48 hours of starting treatment.",
      medications: [
        {
          genericName: "Trimethoprim",
          brandNames: ["Alprim"],
          drugClass: "Folate synthesis inhibitor",
          typicalDose: "300mg once daily for 3 days",
          pbsListed: true,
          pbsNote: "PBS listed for acute uncomplicated UTI",
          prescriptionRequired: true,
          availableOnline: true,
          keyPoints: [
            "First-line treatment for uncomplicated UTI in non-pregnant women",
            "Avoid in first trimester of pregnancy (folate antagonist)",
            "Resistance rates in Australia ~15-20% — still effective for most patients",
            "Take with food to reduce nausea",
          ],
        },
        {
          genericName: "Cefalexin",
          brandNames: ["Keflex", "Ibilex"],
          drugClass: "First-generation cephalosporin",
          typicalDose: "500mg twice daily for 5 days",
          pbsListed: true,
          pbsNote: "PBS listed for UTI when trimethoprim unsuitable",
          prescriptionRequired: true,
          availableOnline: true,
          keyPoints: [
            "Used when trimethoprim is contraindicated or local resistance is high",
            "Safe in pregnancy (Category A)",
            "Well-tolerated — GI upset is the most common side effect",
            "Longer course (5 days) compared to trimethoprim",
          ],
        },
        {
          genericName: "Nitrofurantoin",
          brandNames: ["Macrodantin", "Furadantin"],
          drugClass: "Nitrofuran antibacterial",
          typicalDose: "100mg four times daily for 5 days (macrocrystals), or 100mg twice daily for 5 days (modified release)",
          pbsListed: true,
          pbsNote: "PBS listed for acute cystitis",
          prescriptionRequired: true,
          availableOnline: true,
          keyPoints: [
            "Alternative first-line agent with low resistance rates",
            "Avoid in renal impairment (eGFR <30) — poor urinary concentration",
            "Can cause nausea — take with food",
            "Avoid at term (38+ weeks) pregnancy — risk of neonatal haemolysis",
          ],
        },
      ],
      guidelineSource: "Therapeutic Guidelines — Antibiotic, 2024",
      whenToSeeSpecialist: "Referral to a urologist is recommended for recurrent UTIs (3+ per year), UTIs in men, structural abnormalities, or infections that fail to respond to standard treatment.",
    },
    reviewedDate: "2026-04",
  },
}
