/**
 * Intent Pages Data
 * High-intent search queries mapped to conversion pages
 * 
 * Examples:
 * - "same day medical certificate"
 * - "doctor's certificate online"
 * - "UTI script online"
 * - "after hours telehealth"
 */

import type { SEOPage } from './registry'

export interface IntentPage extends Omit<SEOPage, 'type'> {
  type: 'intent'
  intent: {
    searchQuery: string // Primary search term
    alternateQueries: string[] // Variations
    userNeed: string // What the user actually wants
    urgency: 'immediate' | 'same-day' | 'flexible'
    serviceType: 'medical-certificate' | 'prescription' | 'consult' | 'multiple'
  }
  conversion: {
    primaryCTA: string
    ctaUrl: string
    secondaryCTA?: string
    secondaryCTAUrl?: string
  }
}

export const intentPages: IntentPage[] = [
  {
    slug: 'same-day-medical-certificate',
    type: 'intent',
    title: 'Same Day Medical Certificate Online | Doctor Reviewed',
    description: 'Need a medical certificate today? Reviewed by Australian doctors, valid for employers and universities. From $19.95.',
    h1: 'Same Day Medical Certificate — Reviewed & Valid',
    content: {
      intro: 'Feeling unwell and need a medical certificate for work or uni today? Our Australian doctors typically issue valid medical certificates in under 30 minutes, 24/7, delivered straight to your email. Submit from home — no waiting rooms.',
      uniqueBlocks: [
        {
          id: 'how-fast',
          type: 'text',
          content: 'Most medical certificates are issued in under 30 minutes, available 24/7. Your certificate is emailed as a PDF and is immediately valid.',
        },
        {
          id: 'what-employers-accept',
          type: 'text',
          content: 'Our medical certificates are issued by AHPRA-registered GPs and are legally valid for Australian workplaces and educational institutions. They meet Fair Work requirements and include all necessary details: your name, dates of absence, doctor details with AHPRA number, and clinic information.',
        },
        {
          id: 'process',
          type: 'list',
          content: [
            'Answer a few questions about your symptoms (takes 2-3 minutes)',
            'Pay $19.95 via secure payment',
            'Australian doctor reviews your case',
            'Certificate emailed to you — typically in under 30 minutes',
            'Forward to your employer or upload to your HR system',
          ],
        },
        {
          id: 'when-to-use',
          type: 'callout',
          content: 'Perfect for: cold/flu, gastro, migraine, injury, mental health day, medical appointments. NOT for emergencies — if you\'re experiencing chest pain, difficulty breathing, or other serious symptoms, call 000.',
        },
        {
          id: 'employer-acceptance',
          type: 'text',
          content: 'Under the Fair Work Act 2009, employers must accept medical certificates as evidence of illness or injury for personal/carer\'s leave. There is no legal distinction between a certificate issued via telehealth and one from a walk-in clinic — both carry the same legal weight when issued by an AHPRA-registered medical practitioner. The Fair Work Ombudsman has confirmed that telehealth certificates meet the definition of "medical certificate" under section 107 of the Act. If your employer refuses a valid telehealth certificate, they may be in breach of their obligations.',
        },
        {
          id: 'what-doctors-assess',
          type: 'text',
          content: 'When you submit a medical certificate request, the reviewing doctor assesses several things: the nature and severity of your reported symptoms, whether those symptoms are consistent with being unfit for work, how many days off are medically reasonable, and whether your situation needs further investigation or in-person care. Doctors use their clinical judgement — the same standard applied in any GP consultation. They may decline to issue a certificate if your symptoms don\'t support time off work, or if they believe you need a physical examination instead.',
        },
        {
          id: 'evidence-rules',
          type: 'list',
          content: [
            'Under Fair Work, employers can request evidence for absences of a single day if it\'s a pattern or repeated occurrence',
            'For absences over two consecutive days, employers can require a medical certificate as "reasonable evidence"',
            'Statutory declarations are accepted as an alternative to medical certificates under section 107(3)',
            'Enterprise agreements or employment contracts may have stricter evidence requirements — check your specific agreement',
            'Casual employees don\'t accumulate paid sick leave but may still need certificates if their contract requires it',
          ],
        },
        {
          id: 'backdating-rules',
          type: 'text',
          content: 'Backdating a medical certificate means the certificate covers days before the consultation. Our doctors can backdate certificates up to 3 days at no additional cost — this covers common situations where you were too unwell to seek a certificate on the day itself. Beyond 3 days, backdating requires a brief phone consultation so the doctor can verify the details of your illness. This isn\'t a bureaucratic hurdle — it\'s a clinical governance requirement. AHPRA guidelines require doctors to exercise reasonable clinical judgement when certifying retrospective unfitness, and a conversation helps them do that responsibly.',
        },
        {
          id: 'certificate-details',
          type: 'callout',
          content: 'Every certificate includes: your full name, dates of unfitness for work or study, the issuing doctor\'s name and AHPRA registration number, the practice name and address, a unique certificate ID for verification, and a digital signature. These details satisfy Fair Work requirements and most enterprise agreement clauses.',
        },
      ],
    },
    metadata: {
      keywords: [
        'same day medical certificate',
        'medical certificate today',
        'urgent medical certificate',
        'fast medical certificate online',
        'medical certificate within hours',
      ],
      lastModified: new Date('2026-01-03'),
    },
    structured: {
      faqs: [
        {
          question: 'How quickly can I get a medical certificate?',
          answer: 'Most certificates are issued in under 30 minutes, available 24/7. Your certificate is emailed as a PDF as soon as it\u0027s approved.',
        },
        {
          question: 'Will my employer accept an online medical certificate?',
          answer: 'Yes — our certificates are issued by AHPRA-registered Australian GPs and meet all Fair Work requirements. They\'re legally equivalent to certificates from a physical clinic.',
        },
        {
          question: 'Can I backdate a medical certificate?',
          answer: 'Yes, certificates can be backdated up to 3 days at no extra charge. Backdating beyond 3 days may require a phone consultation with the doctor to verify details.',
        },
        {
          question: 'What if I need a certificate for multiple days?',
          answer: 'You can request certificates for up to 5 consecutive days through our standard process. Longer durations may require additional information or follow-up.',
        },
      ],
    },
    links: {
      related: [
        { type: 'condition', slug: 'cold-and-flu', title: 'Cold & Flu Medical Certificates' },
        { type: 'audience', slug: 'students', title: 'Medical Certificates for Students' },
        { type: 'audience', slug: 'shift-workers', title: 'Certificates for Shift Workers' },
      ],
    },
    intent: {
      searchQuery: 'same day medical certificate',
      alternateQueries: [
        'medical certificate today',
        'urgent medical certificate',
        'fast medical certificate',
        'medical certificate within hours',
        'last minute medical certificate',
      ],
      userNeed: 'Get a valid medical certificate quickly for work/uni',
      urgency: 'immediate',
      serviceType: 'medical-certificate',
    },
    conversion: {
      primaryCTA: 'Get Started',
      ctaUrl: '/request?service=med-cert',
      secondaryCTA: 'Learn More About Our Service',
      secondaryCTAUrl: '/medical-certificate',
    },
  },

  {
    slug: 'uti-treatment-online',
    type: 'intent',
    title: 'UTI Treatment Online Australia | Doctor Assessed',
    description: 'Burning when you pee? Get assessed for UTI treatment online by Australian doctors. Doctor-reviewed, same-day where appropriate. From $29.95.',
    h1: 'UTI Treatment Online — Relief When You Need It',
    content: {
      intro: 'Urinary tract infections are uncomfortable, urgent, and need quick treatment. Our Australian doctors can assess your symptoms online and prescribe antibiotics if appropriate, with your e-script sent to your phone within hours.',
      uniqueBlocks: [
        {
          id: 'symptoms-we-treat',
          type: 'list',
          content: [
            'Burning or stinging when urinating',
            'Urgent need to pee frequently',
            'Cloudy, dark, or strong-smelling urine',
            'Lower abdominal pain or discomfort',
            'Mild fever (not high fever)',
          ],
        },
        {
          id: 'how-it-works',
          type: 'text',
          content: 'Complete a quick symptom questionnaire, answer questions about your health history, and our doctor will review your case. If your symptoms are consistent with a straightforward UTI and there are no red flags, we can prescribe appropriate antibiotics. Your e-script is sent via SMS and can be filled at any Australian pharmacy.',
        },
        {
          id: 'when-to-see-gp',
          type: 'callout',
          content: 'See a GP in person if you have: blood in urine, high fever/chills, severe back pain, vomiting, are pregnant, or have recurrent UTIs (3+ per year). These require physical examination or further testing.',
        },
        {
          id: 'uti-prevalence-australia',
          type: 'text',
          content: 'Urinary tract infections are one of the most common bacterial infections in Australia, particularly among women. Around 50% of Australian women will experience at least one UTI in their lifetime, and roughly one in three will have one before age 24. UTIs account for a significant proportion of after-hours GP presentations and emergency department visits — many of which could be managed through telehealth. The condition is well-suited to remote assessment because diagnosis is primarily symptom-based for uncomplicated cases, and treatment guidelines are well-established through Therapeutic Guidelines (eTG).',
        },
        {
          id: 'telehealth-vs-ed',
          type: 'text',
          content: 'Not every UTI needs an emergency department visit, and knowing the difference matters. A straightforward UTI — burning when you urinate, frequent urination, lower abdominal discomfort, no fever — can usually be assessed and treated via telehealth. An ED visit is appropriate when you have a high fever (over 38.5°C), severe flank or back pain, rigors or chills, persistent vomiting, or if you\'re pregnant. These symptoms may suggest the infection has spread to the kidneys (pyelonephritis), which requires in-person assessment and potentially IV treatment. If you\'re unsure, a telehealth consultation can help you decide whether you need emergency care.',
        },
        {
          id: 'recurrent-utis',
          type: 'text',
          content: 'If you experience three or more UTIs in a year, or two in six months, you may have recurrent UTIs. While we can treat individual episodes, recurrent infections typically need further investigation — including urine cultures, imaging, and sometimes specialist referral. Your GP may consider prophylactic strategies such as post-coital prevention, low-dose continuous therapy, or non-antibiotic approaches. We\'ll flag recurrent UTIs during your assessment and recommend appropriate follow-up with your regular GP or a urologist.',
        },
        {
          id: 'pregnancy-considerations',
          type: 'callout',
          content: 'UTIs during pregnancy require careful management. Untreated UTIs in pregnancy carry risks including preterm labour and low birth weight. Even asymptomatic bacteriuria (bacteria in urine without symptoms) is routinely screened for and treated during pregnancy. If you\'re pregnant and suspect a UTI, we recommend seeing your GP or midwife in person for a urine culture and tailored treatment. Our doctors will not prescribe UTI treatment to pregnant patients via telehealth — this is a clinical safety boundary.',
        },
      ],
    },
    metadata: {
      keywords: [
        'UTI treatment online',
        'UTI antibiotics online',
        'urinary tract infection online doctor',
        'uti prescription online',
        'uti treatment australia',
      ],
      lastModified: new Date('2026-01-03'),
    },
    structured: {
      faqs: [
        {
          question: 'Can you prescribe antibiotics for a UTI online?',
          answer: 'Yes — if your symptoms are consistent with a straightforward UTI and you don\'t have any red flags (like fever, blood in urine, pregnancy), our doctors can prescribe appropriate antibiotics.',
        },
        {
          question: 'Do I need a urine test?',
          answer: 'For typical UTI symptoms in otherwise healthy women, treatment can often begin based on symptoms alone. If your case is unclear, recurrent, or complicated, we may recommend a urine culture before prescribing.',
        },
        {
          question: 'How quickly will the antibiotics work?',
          answer: 'Most people start feeling relief within 24-48 hours of starting antibiotics. Always complete the full course even if you feel better.',
        },
      ],
    },
    links: {
      related: [
        { type: 'condition', slug: 'uti', title: 'UTI Information & Treatment' },
        { type: 'medication', slug: 'trimethoprim', title: 'Trimethoprim for UTI' },
      ],
    },
    intent: {
      searchQuery: 'uti treatment online',
      alternateQueries: [
        'uti antibiotics online',
        'online doctor for uti',
        'uti prescription online',
        'treat uti online',
        'uti telehealth',
      ],
      userNeed: 'Get antibiotics for UTI symptoms quickly',
      urgency: 'same-day',
      serviceType: 'prescription',
    },
    conversion: {
      primaryCTA: 'Get UTI Treatment',
      ctaUrl: '/prescriptions?condition=uti',
      secondaryCTA: 'Learn About UTI Treatment',
      secondaryCTAUrl: '/conditions/uti',
    },
  },

  {
    slug: 'after-hours-doctor',
    type: 'intent',
    title: 'After Hours Doctor Online | Evenings & Weekends',
    description: 'Need a doctor after hours? Get medical certificates and medication renewals evenings and weekends. Australian doctors available 7 days, 7am-10pm.',
    h1: 'After Hours Doctor — Available When You Need Us',
    content: {
      intro: 'Sick on the weekend or after work? Our Australian doctors are available 7 days a week, 7am-10pm AEST. Get medical certificates, medication renewals, and consultations outside traditional clinic hours.',
      uniqueBlocks: [
        {
          id: 'availability',
          type: 'text',
          content: 'We know illness doesn\'t follow a 9-5 schedule. That\'s why our doctors review requests 7 days a week, from 7am to 10pm AEST. Submit your request anytime — even at 2am — and it will be reviewed when our doctors are next available.',
        },
        {
          id: 'what-we-can-help',
          type: 'list',
          content: [
            'Medical certificates for Monday morning (submitted Sunday night)',
            'Repeat prescriptions when your regular GP is closed',
            'UTI treatment on weekends',
            'Cold/flu certificates for shift workers',
            'Urgent medication refills',
          ],
        },
        {
          id: 'turnaround',
          type: 'text',
          content: 'Standard requests are reviewed within 24 hours, usually much faster during business hours and weekends. Priority requests are reviewed within 30-60 minutes during service hours. Requests submitted overnight are reviewed first thing in the morning.',
        },
        {
          id: 'what-constitutes-after-hours',
          type: 'text',
          content: 'In the Australian healthcare system, "after hours" generally refers to times outside standard GP clinic operating hours — typically before 8am and after 6pm on weekdays, after 12pm on Saturdays, and all day Sundays and public holidays. Many GP clinics close by 5pm or 6pm on weekdays and don\'t open on weekends at all, leaving significant gaps in access. After-hours GP services, bulk-billing clinics, and hospital EDs fill some of that gap, but wait times can be substantial — 2-4 hours at an after-hours clinic and considerably longer in ED. For non-urgent needs like medical certificates and medication renewals, telehealth is often the most practical option.',
        },
        {
          id: 'emergency-decision-tree',
          type: 'list',
          content: [
            'Call 000 or go to ED: chest pain, difficulty breathing, signs of stroke, severe bleeding, anaphylaxis, loss of consciousness, suspected fracture, poisoning',
            'Consider after-hours GP clinic: moderate pain, worsening infection, persistent vomiting, wounds needing stitches, ear infections in children',
            'Suitable for telehealth: medical certificates for illness, repeat medication renewals, UTI symptoms, cold and flu assessment, minor skin concerns, mental health support',
            'Can wait until morning: routine medication reviews, non-urgent referrals, follow-up appointments, general health questions',
          ],
        },
        {
          id: 'cost-comparison',
          type: 'text',
          content: 'After-hours healthcare in Australia varies significantly in cost. Hospital emergency departments are free for Medicare card holders, but involve long waits and are designed for genuine emergencies — not certificates or scripts. After-hours GP home visit services typically cost $80-$150 out of pocket after Medicare rebate, and availability is limited in regional areas. After-hours walk-in clinics may bulk-bill but often have 1-3 hour waits. Our telehealth service is a flat fee with no hidden costs — $19.95 for medical certificates, $29.95 for medication renewals, and $49.95 for consultations — regardless of what time you submit.',
        },
        {
          id: 'regional-access',
          type: 'text',
          content: 'After-hours access is a particular challenge in regional and rural Australia. Many country towns have limited or no after-hours GP services, and the nearest hospital may be over an hour away. Telehealth bridges this gap — all you need is an internet connection. Our service covers all Australian states and territories, and our doctors understand the unique healthcare access challenges faced by regional communities. Whether you\'re on a remote station in Queensland or in a small coastal town in Tasmania, you can access the same standard of care.',
        },
      ],
    },
    metadata: {
      keywords: [
        'after hours doctor online',
        'weekend doctor online',
        'online doctor evenings',
        'telehealth after hours',
        'doctor available weekends',
      ],
      lastModified: new Date('2026-01-03'),
    },
    structured: {
      faqs: [
        {
          question: 'Are doctors available 24/7?',
          answer: 'Doctors are available 7 days a week from 7am-10pm AEST. Requests submitted outside these hours are reviewed first thing in the morning.',
        },
        {
          question: 'Is it more expensive after hours?',
          answer: 'No — our pricing is the same regardless of when you submit your request. Medical certificates are $19.95, medication renewals are $29.95, and consultations are $49.95.',
        },
        {
          question: 'What if I have an emergency after hours?',
          answer: 'For medical emergencies (chest pain, difficulty breathing, severe injury), call 000 or go to your nearest emergency department. We\'re for non-urgent medical needs.',
        },
      ],
    },
    links: {
      related: [
        { type: 'audience', slug: 'shift-workers', title: 'Telehealth for Shift Workers' },
        { type: 'intent', slug: 'same-day-medical-certificate', title: 'Same Day Medical Certificates' },
      ],
    },
    intent: {
      searchQuery: 'after hours doctor online',
      alternateQueries: [
        'weekend doctor',
        'online doctor evenings',
        'doctor available weekends',
        'telehealth after hours',
        'online doctor sundays',
      ],
      userNeed: 'Access medical services outside business hours',
      urgency: 'flexible',
      serviceType: 'multiple',
    },
    conversion: {
      primaryCTA: 'Get Started',
      ctaUrl: '/request',
    },
  },

  {
    slug: 'repeat-prescription-online',
    type: 'intent',
    title: 'Repeat Medication Online Australia | Doctor Review',
    description: 'Need repeat medication? Get your medication renewed online from Australian doctors. Same medication, reviewed by a doctor. From $29.95.',
    h1: 'Repeat Medication Online — Simple Doctor-Reviewed Renewal',
    content: {
      intro: 'Running low on your regular medication? Get your repeat medication renewed online from home. Our Australian doctors can review and renew ongoing medications you\'re already taking.',
      uniqueBlocks: [
        {
          id: 'what-we-can-renew',
          type: 'list',
          content: [
            'Blood pressure medications (if stable)',
            'Cholesterol medications (statins)',
            'Contraceptive pill (same brand)',
            'Thyroid medications (if stable)',
            'Chronic condition medications',
            'Regular medications you\'ve been taking for months',
          ],
        },
        {
          id: 'what-we-need',
          type: 'text',
          content: 'To renew your medication, we need to know: what medication you\'re taking (name and dose), how long you\'ve been on it, when you last saw a doctor about it, and if you\'ve had any problems or side effects. If your condition is stable and you\'re due for a routine repeat, we can usually help.',
        },
        {
          id: 'when-see-gp',
          type: 'callout',
          content: 'See your regular GP if: you need a dose change, you\'re experiencing side effects, your condition has changed, you\'re due for blood tests or reviews, or you haven\'t seen a doctor about this condition in over 12 months.',
        },
        {
          id: 'pbs-vs-private',
          type: 'text',
          content: 'In Australia, medications are either subsidised through the Pharmaceutical Benefits Scheme (PBS) or dispensed at full private cost. Most common medications for chronic conditions — blood pressure, cholesterol, thyroid, contraception — are PBS-listed, meaning you pay a capped amount (currently $31.60 for general patients, or $7.70 with a concession card). Our doctors can issue PBS prescriptions where clinically appropriate. Private prescriptions may be needed for medications not on the PBS or when PBS criteria aren\'t met. Your pharmacist will let you know the cost when you present your e-script.',
        },
        {
          id: 'escript-workflow',
          type: 'text',
          content: 'When your medication renewal is approved, you receive an electronic prescription (e-script) via SMS. This is a QR code-based token that any Australian pharmacy can scan to dispense your medication. E-scripts are the standard in Australia since 2020 and are accepted at all pharmacies including Chemist Warehouse, Priceline, TerryWhite, and independent pharmacies. You can also save your e-script token in compatible apps for future use. If your prescription includes repeats, each repeat generates a new token sent to the same phone number.',
        },
        {
          id: 'suitable-for-telehealth',
          type: 'list',
          content: [
            'Blood pressure medications (ACE inhibitors, ARBs, calcium channel blockers) — stable patients with recent blood pressure readings',
            'Cholesterol-lowering medications (statins) — stable patients with recent lipid panel results',
            'Oral contraceptive pill — same brand you\'ve been taking, with recent blood pressure check',
            'Thyroid replacement — stable patients with recent thyroid function tests',
            'Reflux and heartburn medications (proton pump inhibitors) — ongoing use',
            'Asthma preventers — stable, well-controlled asthma with current management plan',
          ],
        },
        {
          id: 'what-doctors-check',
          type: 'text',
          content: 'Our doctors don\'t just rubber-stamp renewals. They review your medication history, check for potential interactions, confirm the medication is still appropriate for your condition, and assess whether you\'re overdue for monitoring. For blood pressure medications, they\'ll ask about recent readings. For cholesterol medications, they\'ll check when you last had blood tests. For contraceptives, they\'ll confirm your blood pressure and screen for risk factors. This is the same clinical due diligence your regular GP would perform — it\'s just done online.',
        },
        {
          id: 'controlled-substances',
          type: 'callout',
          content: 'We cannot prescribe Schedule 8 controlled substances (opioids, benzodiazepines, stimulants) or medications requiring specialist oversight. This is a firm clinical boundary aligned with TGA and state health department regulations. If your regular medication falls into these categories, you\'ll need to see your prescribing doctor in person for renewals.',
        },
      ],
    },
    metadata: {
      keywords: [
        'repeat prescription online',
        'renew prescription online',
        'online script renewal',
        'prescription refill online australia',
        'repeat script online',
      ],
      lastModified: new Date('2026-01-03'),
    },
    structured: {
      faqs: [
        {
          question: 'Can you renew any prescription online?',
          answer: 'We can renew most regular medications for stable conditions. We cannot prescribe new medications, Schedule 8 controlled substances, or medications that require physical examination or blood tests.',
        },
        {
          question: 'Do I need to provide previous scripts?',
          answer: 'Not necessarily, but it helps if you know the exact medication name, strength, and your current dosing schedule. Having a photo of your current medication is useful.',
        },
        {
          question: 'How long does a repeat medication request take?',
          answer: 'Most repeat medication requests are reviewed within 1-3 hours. Priority review is available for urgent needs. Your e-script is sent via SMS.',
        },
      ],
    },
    links: {
      related: [
        { type: 'condition', slug: 'high-blood-pressure', title: 'Blood Pressure Medication Repeats' },
        { type: 'condition', slug: 'high-cholesterol', title: 'Cholesterol Medication Repeats' },
        { type: 'category', slug: 'prescriptions', title: 'Prescription Services' },
      ],
    },
    intent: {
      searchQuery: 'repeat prescription online',
      alternateQueries: [
        'renew prescription online',
        'online script renewal',
        'prescription refill online',
        'repeat script online',
        'renew script online',
      ],
      userNeed: 'Renew existing medication without GP visit',
      urgency: 'same-day',
      serviceType: 'prescription',
    },
    conversion: {
      primaryCTA: 'Renew Medication',
      ctaUrl: '/prescriptions',
    },
  },

  {
    slug: 'work-certificate-online',
    type: 'intent',
    title: 'Work Certificate Online Australia | Sick Leave',
    description: 'Need a work certificate for sick leave? Get one online within hours from Australian doctors. Employer-accepted. From $19.95.',
    h1: 'Work Certificate Online — Valid for Sick Leave',
    content: {
      intro: 'Feeling too unwell to work? Get a medical certificate for sick leave without visiting a clinic. Our certificates are issued by AHPRA-registered doctors and meet Fair Work requirements.',
      uniqueBlocks: [
        {
          id: 'fair-work-compliant',
          type: 'text',
          content: 'Under Fair Work regulations, medical certificates from telehealth doctors are just as valid as certificates from physical clinics. Our certificates include all required information: your name, dates of absence, doctor\'s details with AHPRA registration number, and medical practice information. Employers must accept them.',
        },
        {
          id: 'common-reasons',
          type: 'list',
          content: [
            'Cold, flu, or respiratory infection',
            'Gastroenteritis (stomach bug)',
            'Migraine or severe headache',
            'Back pain or injury',
            'Mental health day',
            'Medical appointment',
          ],
        },
        {
          id: 'what-employers-need',
          type: 'text',
          content: 'Most employers require a medical certificate if you\'re absent for more than 2-3 days, or if you\'ve used all casual sick leave. Our certificates clearly state: dates you were unfit for work, that you were assessed by a registered doctor, and doctor\'s registration details. You can forward the PDF directly to your employer.',
        },
        {
          id: 'legal-validity',
          type: 'text',
          content: 'The legal validity of online medical certificates in Australia is well-established. Under the Fair Work Act 2009, a medical certificate is defined as a certificate from a "medical practitioner" — there is no requirement for the consultation to be in person. The Medical Board of Australia (part of AHPRA) recognises telehealth as a legitimate mode of healthcare delivery, and certificates issued via telehealth carry identical legal standing to those from a face-to-face consultation. If an employer questions the validity of your certificate, they should be directed to the Fair Work Ombudsman\'s guidance on evidence requirements for personal leave.',
        },
        {
          id: 'enterprise-agreements',
          type: 'text',
          content: 'Some enterprise agreements and workplace policies have specific clauses about medical evidence. Common variations include: requiring a certificate after a single day of absence (stricter than the Fair Work minimum), specifying that certificates must come from a "registered medical practitioner" (which our doctors are), or requiring certificates to state specific information like fitness for particular duties. Our certificates are designed to satisfy the most common enterprise agreement requirements. If your workplace has unusual requirements — such as a specific form or additional details — let us know in the notes section of your request.',
        },
        {
          id: 'employer-obligations',
          type: 'list',
          content: [
            'Employers must accept medical certificates from any AHPRA-registered medical practitioner — they cannot insist you visit a specific clinic',
            'Employers cannot contact your doctor for more information without your written consent (Privacy Act 1988, Australian Privacy Principle 3)',
            'Employers must provide paid personal/carer\'s leave — 10 days per year for full-time employees under the National Employment Standards',
            'Employers can request "reasonable evidence" for leave but cannot unreasonably refuse a valid medical certificate',
            'Dismissing an employee for taking legitimate sick leave with valid medical evidence may constitute unfair dismissal under the Fair Work Act',
          ],
        },
        {
          id: 'shift-workers-note',
          type: 'text',
          content: 'Shift workers face particular challenges with medical certificates. If you work evenings, nights, or rotating rosters, getting to a GP during business hours isn\'t always practical — especially when you\'re genuinely unwell. Our service is designed with shift workers in mind. Submit your request at any time, and a doctor will review it during our operating hours (7am-10pm AEST, 7 days). If you need a certificate for a shift that starts in a few hours, choose priority review for faster turnaround.',
        },
      ],
    },
    metadata: {
      keywords: [
        'work certificate online',
        'sick leave certificate',
        'medical certificate for work',
        'work sick certificate online',
        'employer medical certificate',
      ],
      lastModified: new Date('2026-01-03'),
    },
    structured: {
      faqs: [
        {
          question: 'Will my employer accept an online medical certificate?',
          answer: 'Yes — our certificates are issued by AHPRA-registered Australian doctors and meet all Fair Work requirements. They are legally valid for sick leave.',
        },
        {
          question: 'Can I get a certificate for today?',
          answer: 'Yes — we can issue certificates for the current day if you\'re currently unwell. Standard review is 1-3 hours, or choose priority for 30-60 minute turnaround.',
        },
        {
          question: 'Can I backdate a work certificate?',
          answer: 'Certificates can be backdated up to 3 days at no extra charge. Beyond 3 days may require a phone consultation to verify details.',
        },
      ],
    },
    links: {
      related: [
        { type: 'intent', slug: 'same-day-medical-certificate', title: 'Same Day Medical Certificates' },
        { type: 'audience', slug: 'shift-workers', title: 'Certificates for Shift Workers' },
        { type: 'condition', slug: 'cold-and-flu', title: 'Cold & Flu Certificates' },
      ],
    },
    intent: {
      searchQuery: 'work certificate online',
      alternateQueries: [
        'sick leave certificate',
        'work sick certificate',
        'medical certificate for work',
        'employer medical certificate online',
      ],
      userNeed: 'Get valid sick leave certificate for employer',
      urgency: 'same-day',
      serviceType: 'medical-certificate',
    },
    conversion: {
      primaryCTA: 'Get Work Certificate',
      ctaUrl: '/request?service=med-cert',
    },
  },

  {
    slug: 'emergency-contraception-online',
    type: 'intent',
    title: 'Emergency Contraception Online Australia',
    description: 'Need emergency contraception? Get assessed and prescribed online by Australian doctors. E-script sent to your phone.',
    h1: 'Emergency Contraception — Online Doctor Assessment',
    content: {
      intro: 'Emergency contraception (the "morning after pill") can prevent pregnancy after unprotected sex or contraceptive failure. Time is critical — it\'s most effective when taken as soon as possible.',
      uniqueBlocks: [
        {
          id: 'how-it-works',
          type: 'text',
          content: 'Emergency contraceptive pills work by delaying or preventing ovulation. There are two main types — one works best within 72 hours, and a more effective option works up to 120 hours (5 days) after unprotected sex. Your doctor will recommend the most appropriate option. The sooner you take it, the more effective it is.',
        },
        {
          id: 'what-we-need-to-know',
          type: 'list',
          content: [
            'When did unprotected sex occur? (time is critical)',
            'Are you currently using any contraception?',
            'When was your last period?',
            'Any chance you might already be pregnant?',
            'Any medications or health conditions?',
          ],
        },
        {
          id: 'important',
          type: 'callout',
          content: 'Emergency contraception is NOT an abortion pill — it won\'t work if you\'re already pregnant. It\'s also not suitable for regular use. If you need ongoing contraception, ask about regular contraceptive options.',
        },
        {
          id: 'time-sensitivity',
          type: 'text',
          content: 'With emergency contraception, every hour counts. Effectiveness drops significantly with delay — the sooner you act, the better the outcome. Within 24 hours of unprotected sex, effectiveness is highest. By 72 hours, one common option has reduced effectiveness, and the alternative option remains effective up to 120 hours but still works better when taken earlier. This is why we prioritise emergency contraception requests — our doctors understand the urgency and aim to review these cases as quickly as possible during operating hours.',
        },
        {
          id: 'pharmacist-vs-doctor',
          type: 'text',
          content: 'In Australia, one type of emergency contraceptive pill is available over the counter from pharmacists without a prescription. However, there are situations where a doctor\'s involvement is beneficial or necessary. The more effective option (which works up to 120 hours) requires a prescription. A doctor can also assess whether emergency contraception is appropriate given your medical history, current medications, and individual circumstances. Some people prefer the privacy of an online consultation rather than discussing their situation at a pharmacy counter. Our telehealth assessment provides that privacy while ensuring you receive the most appropriate option.',
        },
        {
          id: 'privacy-and-confidentiality',
          type: 'text',
          content: 'We understand that seeking emergency contraception can feel sensitive. Your consultation is completely confidential and protected under Australian privacy law (Privacy Act 1988). Your records are encrypted and will not be shared with anyone — not partners, parents, or employers. If you\'re under 18 and seeking emergency contraception, we follow the Gillick competence framework: if you understand the treatment and its implications, you can consent independently. Our doctors are experienced in providing non-judgemental care for reproductive health needs.',
        },
        {
          id: 'what-happens-after',
          type: 'list',
          content: [
            'Take the medication as directed — one dose, as soon as possible after receiving it from the pharmacy',
            'You may experience nausea, headache, fatigue, or irregular bleeding — these are common and temporary',
            'If you vomit within 2-3 hours of taking the tablet, you may need another dose — contact us or your pharmacist',
            'Your next period may come earlier or later than expected — if it\'s more than 7 days late, take a pregnancy test',
            'Emergency contraception does not protect against STIs — consider testing if there\'s a risk of exposure',
            'Speak with a doctor about regular contraception to avoid needing emergency options in future',
          ],
        },
      ],
    },
    metadata: {
      keywords: [
        'emergency contraception online',
        'morning after pill online',
        'emergency contraceptive pill online',
        'emergency contraception australia',
        'morning after pill doctor online',
      ],
      lastModified: new Date('2026-01-03'),
    },
    structured: {
      faqs: [
        {
          question: 'How quickly can I get emergency contraception?',
          answer: 'Priority review is available for emergency contraception requests. E-script is typically sent within 30-60 minutes. You can then pick up from most pharmacies immediately.',
        },
        {
          question: 'Is it too late if it\'s been 3 days?',
          answer: 'No — one option works up to 72 hours and another up to 120 hours (5 days). However, effectiveness decreases with time, so seek assessment as soon as possible. Your doctor will advise which option is appropriate.',
        },
        {
          question: 'Will emergency contraception affect my period?',
          answer: 'Your next period may be earlier, later, or heavier than usual. If your period is more than 7 days late, take a pregnancy test.',
        },
      ],
    },
    links: {
      related: [
        { type: 'condition', slug: 'contraception', title: 'Regular Contraception Options' },
      ],
    },
    intent: {
      searchQuery: 'emergency contraception online',
      alternateQueries: [
        'morning after pill online',
        'emergency contraceptive pill',
        'emergency contraception australia',
        'morning after pill doctor',
      ],
      userNeed: 'Get emergency contraception fast to prevent pregnancy',
      urgency: 'immediate',
      serviceType: 'prescription',
    },
    conversion: {
      primaryCTA: 'Get Emergency Contraception',
      ctaUrl: '/request?service=consult',
    },
  },

  {
    slug: 'hair-loss-treatment-online',
    type: 'intent',
    title: 'Hair Loss Treatment Online Australia',
    description: 'Get hair loss treatment online from Australian doctors. Doctor-reviewed treatment options available. From $34.95.',
    h1: 'Hair Loss Treatment Online — Stop Thinning, Start Regrowing',
    content: {
      intro: 'Experiencing hair thinning or male pattern baldness? Get evidence-based hair loss treatment online. Our Australian doctors can recommend clinically appropriate treatment options for anyone experiencing pattern hair loss.',
      uniqueBlocks: [
        {
          id: 'treatment-options',
          type: 'list',
          content: [
            'Oral treatment options (men): Doctor-reviewed options that can help slow hair loss and promote regrowth.',
            'Topical treatment options (men & women): Doctor-reviewed options that can improve hair growth.',
            'Combination therapy: Many men use both together for best results.',
            'Works best when started early, before significant loss',
            'Results take 6-12 months — hair grows slowly',
          ],
        },
        {
          id: 'online-process',
          type: 'text',
          content: 'Complete a quick questionnaire about your hair loss pattern, health history, and expectations. Upload photos of your hair (top and crown views helpful). Our doctor reviews and assesses whether treatment is appropriate. If suitable, treatment options are discussed and recommended.',
        },
        {
          id: 'realistic-expectations',
          type: 'callout',
          content: 'Hair loss treatment requires commitment. Results take 6-12 months of daily use. Treatment must continue indefinitely — benefits reverse if you stop. Best results when started early. Not everyone responds, but most see at least some benefit.',
        },
        {
          id: 'types-of-hair-loss',
          type: 'text',
          content: 'Not all hair loss is the same, and understanding the type matters for treatment. Androgenetic alopecia (male or female pattern hair loss) is by far the most common — it\'s genetic, progressive, and follows predictable patterns. In men, it typically starts with a receding hairline and thinning at the crown. In women, it usually presents as diffuse thinning across the top of the scalp. Other types of hair loss include alopecia areata (autoimmune, causing patchy loss), telogen effluvium (temporary shedding from stress, illness, or hormonal changes), and traction alopecia (from tight hairstyles). Telehealth treatment is most appropriate for androgenetic alopecia — other types may require in-person investigation.',
        },
        {
          id: 'telehealth-assessment',
          type: 'text',
          content: 'Our telehealth assessment for hair loss involves a detailed questionnaire about your hair loss pattern, onset, family history, diet, stress levels, and overall health. We ask you to upload clear photos of your scalp from multiple angles — top, crown, hairline, and sides. The doctor uses these to assess the pattern and severity using established classification scales (Norwood for men, Ludwig for women). While this approach works well for pattern hair loss, there are limitations. Telehealth cannot replace dermoscopy (a specialised scalp examination), blood tests for iron, thyroid, or hormonal causes, or scalp biopsy for uncertain diagnoses. If your doctor suspects something other than pattern hair loss, they\'ll recommend in-person follow-up.',
        },
        {
          id: 'treatment-expectations',
          type: 'list',
          content: [
            'Months 1-3: You may notice increased shedding initially — this is a normal part of the treatment cycle and not a sign it isn\'t working',
            'Months 3-6: Shedding typically stabilises. You may notice fewer hairs falling out, but visible regrowth isn\'t common yet',
            'Months 6-12: Gradual improvement in hair density and thickness. This is when most people start noticing meaningful changes',
            'Beyond 12 months: Continued improvement, with maximum benefit usually reached at 2 years of consistent daily use',
            'Stopping treatment: Hair loss resumes within 3-6 months of discontinuation. Treatment is ongoing, not a cure',
          ],
        },
        {
          id: 'when-to-see-dermatologist',
          type: 'callout',
          content: 'See a dermatologist or hair loss specialist if: your hair loss is patchy or sudden, you have scalp pain, itching, or scarring, you\'re a woman with signs of hormonal imbalance (irregular periods, acne, excess facial hair), treatment hasn\'t shown any improvement after 12 months, or you\'re considering surgical options like hair transplantation. A dermatologist can perform specialised investigations and offer treatments beyond what\'s available through telehealth.',
        },
      ],
    },
    metadata: {
      keywords: [
        'hair loss treatment online',
        'hair loss treatment online australia',
        'hair loss doctor online',
        'male pattern baldness treatment',
        'online hair loss prescription',
      ],
      lastModified: new Date('2026-01-03'),
    },
    structured: {
      faqs: [
        {
          question: 'Can I get hair loss treatment online?',
          answer: 'Yes — our Australian doctors can recommend clinically appropriate treatment options online after assessing your suitability. We discuss how treatment works, potential considerations, and realistic expectations.',
        },
        {
          question: 'Do hair loss treatments really work?',
          answer: 'Yes — clinically proven treatments can help slow hair loss and promote regrowth. Results vary, but many people see benefit when treatment is started early and used consistently.',
        },
        {
          question: 'How long until I see results?',
          answer: 'Most people notice reduced shedding within 3 months. Visible regrowth typically appears after 6-12 months. Maximum benefit is usually seen after 2 years of consistent use.',
        },
      ],
    },
    links: {
      related: [
        { type: 'condition', slug: 'hair-loss', title: 'Hair Loss Treatment' },
        { type: 'symptom', slug: 'hair-thinning', title: 'Hair Thinning Causes' },
      ],
    },
    intent: {
      searchQuery: 'hair loss treatment online',
      alternateQueries: [
        'hair loss treatment online',
        'hair loss doctor online',
        'male pattern baldness treatment',
        'online hair loss prescription',
        'hair loss treatment online',
      ],
      userNeed: 'Get prescription hair loss treatment conveniently',
      urgency: 'flexible',
      serviceType: 'prescription',
    },
    conversion: {
      primaryCTA: 'Get Hair Loss Treatment',
      ctaUrl: '/request?service=consult',
    },
  },

  {
    slug: 'flu-certificate-online',
    type: 'intent',
    title: 'Flu Certificate Online Australia | Medical Certificate',
    description: 'Need a medical certificate for flu or cold? Get one online in under 30 minutes, 24/7. Australian doctors. Employer-accepted. From $19.95.',
    h1: 'Flu & Cold Certificate Online — Too Sick to Work',
    content: {
      intro: 'Got the flu or a bad cold and need to stay home? Get a medical certificate online without dragging yourself to a clinic. Our AHPRA-registered doctors issue valid certificates for work or uni, delivered straight to your email.',
      uniqueBlocks: [
        {
          id: 'common-symptoms',
          type: 'text',
          content: 'Flu and cold symptoms include fever, sore throat, cough, runny nose, body aches, headache, and fatigue. If you\'re experiencing these symptoms and aren\'t fit for work, our doctors can assess you online and issue a medical certificate. Most colds need 2-3 days rest, while flu can require 5-7 days recovery.',
        },
        {
          id: 'what-we-need',
          type: 'list',
          content: [
            'Description of your symptoms (fever, cough, etc.)',
            'When symptoms started',
            'How many days off work you need',
            'Any complications (chest pain, difficulty breathing)',
            'Photos not required for straightforward flu/cold',
          ],
        },
        {
          id: 'when-to-see-gp',
          type: 'callout',
          content: 'Seek in-person care if you have: severe difficulty breathing, chest pain, confusion, blue lips, severe dehydration, or symptoms lasting >10 days without improvement. These may indicate complications like pneumonia.',
        },
        {
          id: 'flu-vs-cold',
          type: 'text',
          content: 'Understanding the difference between influenza and the common cold helps determine how long you\'ll need off work. A cold typically comes on gradually — runny nose, sore throat, mild cough — and most people feel functional (if miserable) within 3-4 days. Influenza hits harder and faster: sudden onset of high fever, severe body aches, exhaustion, and dry cough. Flu can leave you bedridden for 3-5 days and fatigued for up to two weeks. When you request a certificate, describing your symptoms accurately helps the doctor determine an appropriate duration. Don\'t downplay how you\'re feeling — a doctor would rather give you adequate recovery time than have you return to work too early and relapse.',
        },
        {
          id: 'when-to-stay-home',
          type: 'list',
          content: [
            'You have a fever (38°C or above) — you\'re contagious and should stay home until fever-free for at least 24 hours without medication',
            'You\'re coughing or sneezing frequently — respiratory droplets are the primary transmission route for both cold and flu viruses',
            'You work in healthcare, aged care, childcare, or food handling — these industries have stricter fitness-for-work requirements for good reason',
            'Your symptoms affect your ability to concentrate, drive safely, or perform physical tasks — working while genuinely unwell isn\'t productive and risks mistakes',
            'You\'ve tested positive for influenza or COVID-19 — follow current public health guidelines for isolation periods',
          ],
        },
        {
          id: 'public-health',
          type: 'text',
          content: 'Presenteeism — going to work while sick — costs the Australian economy an estimated $34 billion annually, significantly more than absenteeism. When you stay home with the flu, you\'re not just recovering — you\'re protecting your colleagues, customers, and the broader community. This is particularly important during flu season (typically June to September in Australia) and in workplaces with vulnerable populations. A medical certificate legitimises your absence and removes the pressure to "push through." Getting a certificate online means you don\'t need to sit in a waiting room spreading the virus to other patients, either.',
        },
        {
          id: 'vaccination-note',
          type: 'text',
          content: 'Annual influenza vaccination remains the most effective preventive measure, reducing your risk of catching the flu by 40-60% in well-matched seasons. In Australia, the flu vaccine is free under the National Immunisation Program for people aged 65 and over, pregnant women, Aboriginal and Torres Strait Islander people aged 6 months and over, and those with chronic medical conditions. For everyone else, the vaccine typically costs $15-$25 at a pharmacy. Even if you\'ve been vaccinated, you can still catch the flu — but symptoms are usually milder and shorter in duration.',
        },
        {
          id: 'returning-to-work',
          type: 'callout',
          content: 'Most employers don\'t require a "fitness to return" certificate after a cold or flu — your original medical certificate covering specific dates is sufficient. However, some workplaces (particularly healthcare and aged care) may require clearance before you return. If your employer needs a return-to-work certificate, you can request one through our service once you\'ve recovered.',
        },
      ],
    },
    metadata: {
      keywords: [
        'flu certificate online',
        'cold certificate online',
        'sick certificate flu',
        'medical certificate for flu',
        'flu sick leave certificate',
      ],
      lastModified: new Date('2026-01-03'),
    },
    structured: {
      faqs: [
        {
          question: 'Can I get a certificate if I just have a cold?',
          answer: 'Yes — if you\'re too unwell to work, you can get a certificate for a cold. Most employers accept certificates for any illness that prevents you from working safely.',
        },
        {
          question: 'How many days can I get certified off for flu?',
          answer: 'Typically 2-3 days for a cold, 5-7 days for flu. Your doctor will determine appropriate duration based on your symptoms and job requirements.',
        },
        {
          question: 'Do I need a doctor\'s note for flu?',
          answer: 'Many employers require a medical certificate if you\'re absent for more than 2-3 days or if you\'ve used all casual sick leave. Check your workplace policy.',
        },
      ],
    },
    links: {
      related: [
        { type: 'condition', slug: 'cold-and-flu', title: 'Cold & Flu Information' },
        { type: 'intent', slug: 'same-day-medical-certificate', title: 'Same Day Medical Certificates' },
      ],
    },
    intent: {
      searchQuery: 'flu certificate online',
      alternateQueries: [
        'cold certificate online',
        'sick certificate flu',
        'medical certificate for flu',
        'flu sick leave online',
      ],
      userNeed: 'Get medical certificate for flu/cold without clinic visit',
      urgency: 'same-day',
      serviceType: 'medical-certificate',
    },
    conversion: {
      primaryCTA: 'Get Flu Certificate',
      ctaUrl: '/request?service=med-cert&condition=cold-flu',
    },
  },
]

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getIntentPageBySlug(slug: string): IntentPage | undefined {
  return intentPages.find(p => p.slug === slug)
}

export function getAllIntentSlugs(): string[] {
  return intentPages.map(p => p.slug)
}

export function getIntentPagesByUrgency(urgency: 'immediate' | 'same-day' | 'flexible'): IntentPage[] {
  return intentPages.filter(p => p.intent.urgency === urgency)
}

// NEW INTENT PAGES - TO BE PROPERLY IMPLEMENTED
// The following pages need to be restructured to match the IntentPage interface before being added
