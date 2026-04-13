/**
 * Urological symptoms -- SEO symptom page data
 * Part of the symptoms data split. See ./index.ts for the combined export.
 */

import type { SymptomData } from "../symptoms"

export const urologicalSymptoms: Record<string, SymptomData> = {
  "burning-when-urinating": {
    name: "Burning When Urinating",
    slug: "burning-when-urinating",
    description: "Burning, stinging, or pain when you urinate (dysuria) is one of the most common urinary symptoms. Often caused by a UTI, but can have other causes.",
    possibleCauses: [
      {
        name: "Urinary tract infection (UTI)",
        likelihood: "common",
        description: "The most common cause in women. Bacterial infection of the bladder or urethra.",
        whenToSuspect: ["Frequent urination", "Urgency", "Cloudy or strong-smelling urine", "Lower abdominal discomfort"]
      },
      {
        name: "Bladder infection (cystitis)",
        likelihood: "common",
        description: "Inflammation of the bladder, often bacterial.",
        whenToSuspect: ["Same as UTI", "Blood in urine in some cases"]
      },
      {
        name: "Vaginal infection or irritation",
        likelihood: "common",
        description: "Inflammation or infection affecting the urinary opening.",
        whenToSuspect: ["Discharge", "Itching", "Irritation from products"]
      },
      {
        name: "Sexually transmitted infection",
        likelihood: "less-common",
        description: "Chlamydia or gonorrhea can cause burning when urinating.",
        whenToSuspect: ["Recent unprotected sex", "Discharge", "Pain during sex"]
      },
      {
        name: "Kidney stones",
        likelihood: "less-common",
        description: "Stones passing through the urinary tract cause severe pain.",
        whenToSuspect: ["Severe flank pain", "Blood in urine", "Pain comes in waves"]
      }
    ],
    selfCareAdvice: [
      "Drink plenty of water (2-3 litres per day)",
      "Urinate frequently, don't hold it in",
      "Avoid irritating products (bubble bath, harsh soaps)",
      "Urinate after sexual activity",
      "Cranberry products may help prevent UTIs (weak evidence)"
    ],
    whenToSeeDoctor: [
      "Symptoms last more than 2 days",
      "You're male (less common, needs assessment)",
      "Pregnant or might be pregnant",
      "Blood in your urine",
      "Recurrent UTIs (3+ per year)",
      "Pain during sex or unusual discharge"
    ],
    emergencySigns: [
      "High fever (>38.5°C) with chills",
      "Severe back pain or flank pain",
      "Vomiting and unable to keep fluids down",
      "Complete inability to urinate",
      "Confusion or feeling very unwell"
    ],
    relatedSymptoms: ["frequent-urination", "uti", "abdominal-pain"],
    faqs: [
      { q: "Is burning when urinating always a UTI?", a: "No - while UTI is the most common cause in women, other causes include STIs, vaginal irritation, kidney stones, or prostatitis in men. If symptoms don't improve with treatment, further investigation is needed." },
      { q: "Can I treat a UTI without antibiotics?", a: "Simple UTIs typically need antibiotics to clear the infection. Drinking lots of water may help symptoms but won't eliminate the bacteria. Untreated UTIs can spread to kidneys." },
      { q: "When should I see a doctor in person?", a: "See a GP in person if you have fever/chills, blood in urine, severe back pain, vomiting, are pregnant, are male, or have recurrent UTIs." },
      { q: "How quickly should burning improve with treatment?", a: "With appropriate antibiotics for a UTI, most people feel relief within 24-48 hours. If symptoms worsen or don't improve after 2 days, contact your doctor." }
    ],
    serviceRecommendation: {
      type: "consult",
      text: "Get UTI treatment online",
      href: "/request?service=consult&condition=uti"
    },
    doctorPerspective: "Dysuria (burning on urination) in an otherwise healthy woman is UTI until proven otherwise - the positive predictive value of this symptom is over 90%. This is one of the most straightforward telehealth consultations: the symptom pattern (burning, frequency, urgency, sometimes blood in urine) is so characteristic that urine testing is not required before starting treatment in uncomplicated cases. In men, burning on urination is more complex - UTIs in men always warrant investigation as they suggest an underlying structural or functional issue. I also consider STI screening in sexually active patients with dysuria, particularly if there is urethral discharge. The key red flags I screen for are flank pain, fever, and rigors - these suggest the infection has reached the kidneys (pyelonephritis) and may need more aggressive treatment.",
    certGuidance: "A UTI can make concentration difficult and require frequent bathroom trips. Most people can work with mild symptoms, but severe burning, urgency, or associated fever warrants 1-2 days off. With antibiotics, significant relief usually comes within 24-48 hours.",
  },
  "frequent-urination": {
    name: "Frequent Urination",
    slug: "frequent-urination",
    description: "Needing to urinate more often than usual. Can be caused by UTIs, diabetes, prostate issues, anxiety, or simply drinking too much fluid.",
    possibleCauses: [
      {
        name: "Urinary tract infection",
        likelihood: "common",
        description: "Especially if accompanied by pain or burning.",
        whenToSuspect: ["Burning when urinating", "Urgency", "Cloudy urine", "Lower abdominal discomfort"]
      },
      {
        name: "Drinking too much fluid",
        likelihood: "common",
        description: "Especially caffeine, tea, alcohol.",
        whenToSuspect: ["High fluid intake", "Improves when reducing drinks", "No pain"]
      },
      {
        name: "Pregnancy",
        likelihood: "common",
        description: "Uterus presses on bladder.",
        whenToSuspect: ["Pregnant", "Early pregnancy symptom"]
      },
      {
        name: "Anxiety or stress",
        likelihood: "common",
        description: "Fight-or-flight response can increase urination.",
        whenToSuspect: ["Worse when anxious", "No infection symptoms"]
      },
      {
        name: "Type 2 diabetes",
        likelihood: "less-common",
        description: "High blood sugar causes frequent urination.",
        whenToSuspect: ["Excessive thirst", "Unexplained weight loss", "Fatigue"]
      },
      {
        name: "Prostate enlargement (men over 50)",
        likelihood: "less-common",
        description: "BPH can cause frequency and weak stream.",
        whenToSuspect: ["Weak stream", "Difficulty starting", "Men over 50"]
      }
    ],
    selfCareAdvice: [
      "Keep a bladder diary for 2-3 days",
      "Reduce caffeine and alcohol intake",
      "Avoid drinking large amounts before bed",
      "Practice bladder training",
      "Pelvic floor exercises (Kegels) can help"
    ],
    whenToSeeDoctor: [
      "Frequency is new and persistent",
      "Waking 2+ times per night to urinate",
      "Excessive thirst and urination together",
      "Weak urine stream or difficulty starting (men)",
      "Leaking urine",
      "Pain or discomfort"
    ],
    emergencySigns: [
      "Complete inability to urinate",
      "Severe pain with frequency",
      "Fever and back pain (possible kidney infection)",
      "Blood in urine with severe symptoms"
    ],
    relatedSymptoms: ["burning-when-urinating", "uti"],
    faqs: [
      { q: "Is frequent urination a sign of diabetes?", a: "It can be. If you're peeing frequently AND drinking a lot, feeling thirsty, losing weight, or feeling tired, get your blood sugar checked." },
      { q: "How often is too often to urinate?", a: "More than 8 times during the day or waking 2+ times at night is considered frequent. However, 'normal' varies." },
      { q: "Can anxiety cause frequent urination?", a: "Yes - anxiety activates your fight-or-flight response, which can increase urination. Treating the anxiety often helps." },
      { q: "When should I see a doctor?", a: "See a doctor if it's sudden and persistent, you have pain/burning, there's blood in urine, you're very thirsty, or it's disrupting your life." }
    ],
    serviceRecommendation: {
      type: "consult",
      text: "Get assessed online",
      href: "/request?service=consult&condition=uti"
    },
    doctorPerspective: "Frequent urination has a broad differential, and the clinical approach depends on whether it is accompanied by other symptoms. In women, the most common cause is UTI - frequency with burning and urgency. In men over 50, benign prostatic hyperplasia (BPH) is the leading cause. New-onset frequent urination with excessive thirst and weight loss raises immediate concern for diabetes and warrants a blood glucose test. Overactive bladder (urge incontinence) is another common cause that responds well to treatment. I also ask about fluid intake - many people drink excessive caffeine or water and mistake normal physiological output for a problem. Nocturia (waking at night to urinate) more than once is worth investigating, particularly in older adults.",
    certGuidance: "Frequent urination itself rarely prevents work but can be highly disruptive. If caused by a UTI, 1-2 days with treatment usually resolves urgency. Ensure easy bathroom access at work during recovery.",
  },
}
