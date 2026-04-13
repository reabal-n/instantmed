/**
 * Medical certificate guides -- SEO guide page data
 * Part of the guides data split. See ./index.ts for the combined export.
 */

import { PRICING_DISPLAY } from "@/lib/constants"

import type { GuideData } from "../guides"

export const medCertGuides: Record<string, GuideData> = {
  "how-to-get-medical-certificate-for-work": {
    title: "How to Get a Medical Certificate for Work in Australia",
    slug: "how-to-get-medical-certificate-for-work",
    description: "A complete guide to getting a valid medical certificate for work in Australia. Learn your options, what employers accept, and the fastest ways to get one.",
    lastUpdated: "April 2026",
    readTime: "6 min read",
    intro: "Need time off work due to illness? In Australia, employers can request a medical certificate for sick leave, especially for absences of more than 2 days. This guide explains all your options for getting one - from your regular GP to telehealth services that can have you sorted in under an hour.",
    steps: [
      {
        title: "Understand when you need a medical certificate",
        content: "Under Australian workplace law, your employer can request a medical certificate for any period of sick leave. Most commonly, they'll ask for one if you're away for more than 2 consecutive days, or if there's a pattern of absences (like always being sick on Mondays). Some workplaces require certificates from day one - check your employment contract or company policy.",
        tips: [
          "Check your workplace policy - some require certificates from day one",
          "Casual employees may still need certificates for consistent work patterns",
          "You don't need to disclose your specific diagnosis on most certificates"
        ]
      },
      {
        title: "Choose how to see a doctor",
        content: "You have several options for getting a medical certificate in Australia. Your regular GP is always an option, but appointments can take days to get. After-hours clinics work for evenings and weekends but often have long waits. Telehealth services like InstantMed let you get assessed online - typically in under an hour, without leaving home.",
        tips: [
          "GP clinics: Usually need an appointment, may have wait times of days",
          "Walk-in clinics: No appointment but often 1-2 hour waits",
          "Telehealth: Fastest option, done from home, usually under 1 hour"
        ]
      },
      {
        title: "Complete your consultation",
        content: "Whether in-person or online, the doctor will ask about your symptoms, how long you've been unwell, and how it's affecting your ability to work. Be honest - doctors can tell when symptoms don't match up, and it's not worth the risk to your professional reputation. For telehealth, you'll typically fill out a questionnaire and may exchange messages with the doctor.",
        tips: [
          "Describe your symptoms clearly and honestly",
          "Mention how your condition affects your ability to do your job",
          "If you need specific dates covered, let the doctor know"
        ]
      },
      {
        title: "Receive your certificate",
        content: "If the doctor agrees you're unfit for work, they'll issue a medical certificate. This will include the dates you're certified as unfit, the doctor's details, and usually a general statement about your fitness for work (without revealing your diagnosis). For telehealth services, the certificate is typically emailed as a PDF that you can forward directly to your employer.",
        tips: [
          "Medical certificates don't usually include your specific diagnosis",
          "PDF certificates are accepted by all Australian employers",
          "Keep a copy for your own records"
        ]
      },
      {
        title: "Submit to your employer",
        content: "Most employers accept certificates via email. Simply forward the PDF or attach it to your leave request in your HR system. Some employers may want the original for their files - you can print the PDF or ask if a digital copy is acceptable. The certificate is a legal medical document, so treat it accordingly."
      }
    ],
    importantNotes: [
      "Medical certificates from telehealth services are legally valid and accepted by all Australian employers",
      "Doctors cannot backdate certificates for days they didn't assess you (though they may certify recent days if clinically appropriate)",
      "Faking illness or providing false information to obtain a certificate is fraud and grounds for dismissal",
      "You have the right to privacy - your employer can request a certificate but cannot demand to know your diagnosis"
    ],
    faqs: [
      {
        q: "Will my employer accept an online medical certificate?",
        a: "Yes. Medical certificates from telehealth services are issued by AHPRA-registered doctors and are legally valid. They're accepted by all Australian employers, universities, and government bodies."
      },
      {
        q: "Can I get a certificate for a mental health day?",
        a: "Yes. Mental health is a legitimate medical reason for time off work. Doctors can issue certificates for anxiety, stress, or other mental health conditions affecting your ability to work."
      },
      {
        q: "How far can a medical certificate be backdated?",
        a: "Doctors can only certify conditions they've assessed. However, if you're still unwell when you see a doctor, they may certify that you've been unfit for work for a recent period if that's clinically appropriate."
      },
      {
        q: "What if I can't afford to see a doctor?",
        a: "Many GP clinics offer bulk billing (free with Medicare). Telehealth services have fixed fees starting from around $20. Some workplaces also have Employee Assistance Programs that cover medical consultations."
      },
      {
        q: "Can my employer refuse my medical certificate?",
        a: "Generally, no. A valid medical certificate from a registered doctor is evidence that you were unfit for work. However, employers can request additional information in some circumstances or ask you to see a company-appointed doctor for extended absences."
      }
    ],
    cta: {
      text: "Get a medical certificate now",
      href: "/request?service=med-cert",
      subtext: `${PRICING_DISPLAY.FROM_MED_CERT} · Usually ready in under 1 hour`
    }
  },
  "how-to-get-sick-note-for-uni": {
    title: "How to Get a Sick Note for University in Australia",
    slug: "how-to-get-sick-note-for-uni",
    description: "Need a medical certificate for a missed exam, assignment extension, or university absence? Here's how to get one quickly and what your university will accept.",
    lastUpdated: "April 2026",
    readTime: "5 min read",
    intro: "Whether you've missed an exam, need an assignment extension, or have been too unwell to attend classes, most Australian universities require a medical certificate as supporting documentation. This guide explains how to get one and what universities typically accept.",
    steps: [
      {
        title: "Check your university's requirements",
        content: "Each university has its own policies for medical documentation. Most require certificates for missed exams (special consideration), assignment extensions beyond a few days, and prolonged absences. Check your university's special consideration or academic support pages for specific requirements.",
        tips: [
          "Most unis have online portals for special consideration applications",
          "Deadlines for applications vary - some require submission within days",
          "Some universities have their own medical certificate forms"
        ]
      },
      {
        title: "Get your medical certificate",
        content: "You can get a certificate from any registered Australian doctor - your GP, a clinic, or a telehealth service. For time-sensitive situations like missed exams, telehealth is often the fastest option. The certificate needs to cover the relevant dates and indicate that you were unfit for study or to attend the exam.",
        tips: [
          "Make sure the certificate covers the specific dates you need",
          "If you missed an exam, the certificate should cover that specific date",
          "Get your certificate as soon as possible - don't wait until you've recovered"
        ]
      },
      {
        title: "Submit your application",
        content: "Most universities have online systems for submitting special consideration requests or extension applications. You'll typically need to upload your medical certificate, explain how your illness affected your studies, and submit within the specified timeframe. Keep copies of everything you submit.",
        tips: [
          "Submit as early as possible - deadlines are often strict",
          "Include a brief explanation of how your illness impacted your work",
          "Check if you need to notify your lecturer/tutor separately"
        ]
      },
      {
        title: "Follow up if needed",
        content: "After submitting, you should receive confirmation. If your application is approved, you'll be informed of the outcome - this might be a deferred exam, extension, or other arrangement. If there are any issues with your documentation, the university will usually contact you to request more information."
      }
    ],
    importantNotes: [
      "Universities accept medical certificates from telehealth services - they're issued by registered doctors",
      "Apply for special consideration as soon as possible, even if you're still unwell",
      "Keep records of all your submissions and communications",
      "If you're experiencing ongoing health issues affecting your studies, talk to your university's student support services"
    ],
    faqs: [
      {
        q: "Will my university accept an online medical certificate?",
        a: "Yes. Australian universities accept certificates from any AHPRA-registered doctor, including those practicing via telehealth. The certificate needs to be legitimate and include the doctor's registration details."
      },
      {
        q: "What if I was too sick to see a doctor on the day?",
        a: "See a doctor as soon as you can. If you're still unwell, the doctor can often certify that you've been unfit for recent days. Explain your situation to both the doctor and in your special consideration application."
      },
      {
        q: "Can I get a certificate for mental health reasons?",
        a: "Absolutely. Mental health conditions are legitimate medical reasons for special consideration. You don't need to disclose your specific diagnosis - the certificate just needs to confirm you were unfit for study."
      },
      {
        q: "How specific does the certificate need to be?",
        a: "It should include the dates you were unfit for study, the doctor's details and registration number, and a statement about your fitness for study. It doesn't need to include your specific diagnosis."
      }
    ],
    cta: {
      text: "Get your certificate now",
      href: "/request?service=med-cert",
      subtext: `${PRICING_DISPLAY.FROM_MED_CERT} · Perfect for special consideration applications`
    }
  },
  "medical-certificate-centrelink": {
    title: "How to Get a Medical Certificate for Centrelink",
    slug: "medical-certificate-centrelink",
    description: "Need a medical certificate for Centrelink or a government agency? Learn what's required for each payment type, how to get one, and avoid common mistakes.",
    lastUpdated: "April 2026",
    readTime: "7 min read",
    intro: "Centrelink and Services Australia require medical certificates in a range of situations - from meeting mutual obligation requirements on JobSeeker to supporting Disability Support Pension claims. The requirements differ by payment type, and getting the wrong certificate can delay your payments. This guide covers what each situation needs and the fastest way to get compliant documentation.",
    steps: [
      {
        title: "Identify which Centrelink situation applies to you",
        content: "Centrelink uses medical certificates differently depending on your payment type. For JobSeeker Payment, a certificate can temporarily exempt you from mutual obligation activities (looking for work, attending appointments). For Disability Support Pension (DSP), medical evidence supports your initial claim or review. For Carer Payment, certificates document the condition of the person you care for. For Parenting Payment, certificates can support exemptions from participation requirements. Check your Centrelink online account or latest correspondence to confirm exactly what's been requested.",
        tips: [
          "JobSeeker: Certificate exempts you from activities for a set period (usually 1–13 weeks)",
          "DSP: Requires comprehensive medical evidence - often from a GP who knows your history",
          "Carer Payment: Certificate is about the care recipient, not you",
          "If in doubt, call Centrelink (132 850) and ask what format they need before seeing a doctor"
        ]
      },
      {
        title: "Understand what the certificate needs to include",
        content: "Standard medical certificates (date, 'unfit for work', doctor details) are often insufficient for Centrelink purposes. Centrelink frequently needs certificates that specify your condition, how it affects your functional capacity, the expected duration, and whether it's temporary or permanent. For participation exemptions, the certificate should state that you're unable to meet your obligations due to your medical condition. Some payment types require a Centrelink-specific form (e.g. SU415 for DSP medical evidence) rather than a standard certificate.",
        tips: [
          "Ask your doctor to include functional impact - not just a diagnosis",
          "Specify the time period clearly (from date X to date Y)",
          "For DSP claims, Centrelink has specific forms your doctor needs to complete",
          "A generic 'unfit for work' certificate may not be accepted - include detail"
        ]
      },
      {
        title: "See a doctor who can assess your condition",
        content: "For straightforward short-term exemptions (e.g. you have the flu and can't attend an appointment), a telehealth doctor can assess and issue an appropriate certificate. For ongoing or complex claims - DSP applications, long-term exemptions, functional assessments - Centrelink typically expects evidence from a doctor who knows your history. Your regular GP is usually the best option for these. If you don't have a regular GP, a telehealth service can provide initial documentation while you establish ongoing care.",
        tips: [
          "Telehealth works for: short-term exemptions, acute illness, straightforward certificates",
          "Your regular GP is better for: DSP applications, long-term conditions, functional assessments",
          "The doctor must have assessed you - pre-dated or backdated certificates have limits",
          "If you need a Centrelink-specific form completed, confirm the doctor can do this before your appointment"
        ]
      },
      {
        title: "Submit the certificate to Centrelink",
        content: "Centrelink accepts medical certificates through several channels: the myGov app (upload a photo or scan), the Centrelink online portal, in person at a Centrelink office, or by post. The myGov app is fastest - you can photograph the certificate and submit immediately. Always submit before any deadlines stated in your correspondence. Late submissions can result in payment suspensions or participation failures being recorded.",
        tips: [
          "MyGov app upload is the fastest method - usually processed within 1–2 business days",
          "Keep the original certificate and a digital copy for your records",
          "Note any reference numbers or confirmation receipts from the submission",
          "If your payment is suspended pending a certificate, submit ASAP - delays cost you money"
        ]
      },
      {
        title: "Follow up if there are issues",
        content: "If Centrelink rejects your certificate or requests additional information, don't panic. Common rejection reasons include: certificate doesn't specify functional capacity, wrong date range, certificate doesn't match the requested format, or the condition needs more detailed documentation. Contact Centrelink to understand exactly what's missing, then see your doctor again with that specific feedback. Most issues can be resolved with a revised certificate.",
        tips: [
          "Ask Centrelink specifically what was wrong - vague feedback wastes time",
          "Take Centrelink's feedback letter to your doctor so they know what to include",
          "If you disagree with a decision, you have the right to request a review",
          "Free legal help is available through Legal Aid and community legal centres"
        ]
      }
    ],
    importantNotes: [
      "Centrelink requirements differ by payment type - always check what's specifically required before seeing a doctor",
      "Standard 'unfit for work' certificates are often insufficient - Centrelink frequently needs functional capacity details",
      "For DSP claims, Centrelink has specific medical forms (SU415) that your doctor needs to complete",
      "Backdating has strict limits - doctors can only certify conditions they've actually assessed",
      "If you're having trouble getting the right documentation, community legal centres can help for free"
    ],
    faqs: [
      { q: "Can I get a Centrelink medical certificate online?", a: "Yes, for short-term exemptions and acute illness. A telehealth doctor can assess your condition and issue a certificate that meets Centrelink requirements for temporary exemptions. For complex claims like DSP, you'll likely need your regular GP." },
      { q: "What if Centrelink rejects my certificate?", a: "Ask Centrelink specifically what's missing. Common issues: not enough detail about functional capacity, wrong date range, or needing a Centrelink-specific form instead of a standard certificate. Take their feedback to your doctor and get a revised certificate." },
      { q: "How long is a Centrelink medical certificate valid?", a: "It depends on the situation. Short-term exemptions typically cover 1–13 weeks. For ongoing conditions, Centrelink may request updated evidence every 3–6 months. DSP evidence is assessed as part of the claim process and may need updating at reviews." },
      { q: "Do I need a certificate to defer a Centrelink appointment?", a: "If you're too unwell to attend a Centrelink appointment, you should call them beforehand to reschedule. A medical certificate can support your reason but calling ahead is usually sufficient for a single missed appointment." },
      { q: "Can Centrelink access my medical records?", a: "Not without your consent. Centrelink can only see the certificates and forms you provide. However, for DSP claims, you may be asked to consent to Centrelink requesting information from your treating doctors. You have the right to understand what information will be shared." }
    ],
    cta: { text: "Get a medical certificate", href: "/request?service=med-cert", subtext: `${PRICING_DISPLAY.FROM_MED_CERT} · Australian doctors` }
  },
  "medical-certificate-for-carers-leave": {
    title: "How to Get a Medical Certificate for Carer's Leave in Australia",
    slug: "medical-certificate-for-carers-leave",
    description: "Need time off to care for a sick family member? Learn your carer's leave entitlements, how to get a medical certificate, and what your employer can and can't ask.",
    lastUpdated: "April 2026",
    readTime: "6 min read",
    intro: "When a family member or household member is ill and needs your care, you're entitled to take time off work under Australian law. If your employer requests evidence, you'll need a medical certificate - but it works differently from a personal sick leave certificate. Here's everything you need to know about carer's leave documentation.",
    steps: [
      {
        title: "Understand your carer's leave entitlements",
        content: "Under the Fair Work Act 2009, all full-time and part-time employees are entitled to 10 days of paid personal/carer's leave per year, which accumulates and rolls over. Carer's leave comes from the same pool as your personal sick leave. You can take carer's leave when an immediate family member (spouse, child, parent, grandparent, sibling) or household member is ill, injured, or facing an unexpected emergency. Casual employees are entitled to 2 days of unpaid carer's leave per occasion.",
        tips: [
          "10 days per year for full-time employees, pro-rata for part-time",
          "Same leave balance as personal sick leave - they share a pool",
          "Covers immediate family AND household members (including de facto partners)",
          "Casual employees get 2 days unpaid per occasion - no accumulation",
          "You don't need to exhaust your own sick leave before using carer's leave"
        ]
      },
      {
        title: "Know when a certificate is required",
        content: "Your employer can request evidence that you needed to provide care. This is most common for absences of 2+ consecutive days, but some workplace policies require evidence from day one. The evidence needs to show that the person required care - not that you yourself were unwell. A medical certificate, statutory declaration, or pharmacy receipt can all serve as evidence, though most employers prefer a certificate.",
        tips: [
          "Most employers require evidence for 2+ days, but check your workplace policy",
          "A statutory declaration is a legal alternative to a medical certificate",
          "Evidence needs to document the care recipient's need - not your own health",
          "Keep text messages and pharmacy receipts as backup evidence"
        ]
      },
      {
        title: "Get a medical certificate via telehealth",
        content: "Telehealth is particularly suited to carer's leave certificates because you probably can't leave the person you're caring for. You describe who needs care, their symptoms or condition, and how they require your assistance. The doctor assesses the situation and issues a certificate stating that the person needed care. The certificate doesn't need to include the care recipient's specific diagnosis - only that they required care.",
        tips: [
          "Complete the form from home - no need to leave the person you're caring for",
          "You describe the situation on behalf of the care recipient",
          "The certificate states they needed care, not necessarily what was wrong",
          "If the care recipient is a child, you complete the form as the parent/guardian"
        ]
      },
      {
        title: "Submit to your employer",
        content: "Forward the certificate to HR or your manager as soon as practical. Carer's leave is a protected entitlement under the Fair Work Act - your employer cannot unreasonably refuse it when you provide the required evidence. They can ask when you expect to return and whether the person's condition is ongoing, but they cannot demand the care recipient's diagnosis or medical details.",
        tips: [
          "Submit promptly - ideally before or on the day of your absence",
          "Keep a copy for your records (digital and physical)",
          "Your employer can ask when you'll be back but not the diagnosis",
          "If your employer refuses legitimate carer's leave, contact Fair Work on 13 13 94"
        ]
      }
    ],
    importantNotes: [
      "Carer's leave is a legally protected entitlement - employers cannot unreasonably refuse it with valid evidence",
      "The certificate documents the care recipient's need, not your own illness",
      "You don't need to be a 'carer' in the Centrelink sense - any immediate family or household member qualifies",
      "Telehealth is ideal because you can get the certificate without leaving the person you're caring for",
      "If you're regularly taking carer's leave, talk to your employer about flexible work arrangements - you may have additional rights"
    ],
    faqs: [
      { q: "Can I get a carer's leave certificate online?", a: "Yes. You describe who needs care and their situation. The doctor assesses and issues a certificate confirming the person required care. This is especially practical when you can't leave the unwell person to visit a GP." },
      { q: "What if my child is the one who's sick?", a: "Same process. You complete the form on their behalf as the parent or guardian. The certificate documents that your child needed care. This covers common situations like childhood gastro, fever, or any illness requiring a parent at home." },
      { q: "Do I need to say what was wrong with them?", a: "The certificate states that the person needed care. A specific diagnosis is not required - your employer only needs to know that a family or household member was unwell and required your care. Privacy protections apply to the care recipient just as they would to you." },
      { q: "Can I take carer's leave for a mental health crisis?", a: "Yes. If a family member is experiencing a mental health episode that requires your care and supervision, carer's leave applies. The certificate documents the need for care without disclosing the nature of the condition." },
      { q: "Can both parents take carer's leave for the same child?", a: "Both parents can take carer's leave simultaneously if the situation warrants it (e.g. a seriously ill child). Each parent uses their own leave balance and provides their own evidence." }
    ],
    cta: { text: "Get a carer's leave certificate", href: "/medical-certificate/carer", subtext: `${PRICING_DISPLAY.FROM_MED_CERT} · No need to leave home` }
  },
  "medical-certificate-employer-requirements": {
    title: "What Employers Can and Can't Ask For in a Medical Certificate",
    slug: "medical-certificate-employer-requirements",
    description: "Understanding your rights: what employers can request in a medical certificate and what they cannot demand.",
    lastUpdated: "April 2026",
    readTime: "5 min read",
    intro: "Employers can request evidence when you take sick leave, but there are limits. This guide explains what they can ask for, what you're required to provide, and your privacy rights.",
    steps: [
      {
        title: "What employers can request",
        content: "Under the Fair Work Act, employers can request evidence that you were unfit for work. A medical certificate from a registered practitioner is sufficient. It typically needs to state the dates you were unfit - it does NOT need to disclose your diagnosis.",
        tips: ["Certificate confirms unfitness", "Dates are usually required", "Diagnosis is private"]
      },
      {
        title: "What employers cannot demand",
        content: "Employers cannot demand to know your specific diagnosis, require you to see a particular doctor, or ask for more than reasonable evidence. They cannot require a certificate for every single day of absence if you have one covering the period.",
        tips: ["Your diagnosis is private", "You choose your doctor", "One certificate can cover multiple days"]
      },
      {
        title: "If you feel your rights are being violated",
        content: "If you believe your employer is unreasonably demanding private medical information or refusing your valid certificate, you can contact the Fair Work Ombudsman for advice. Your union (if you have one) can also help.",
        tips: ["Fair Work provides free advice", "Document any unreasonable requests", "Keep copies of your certificates"]
      }
    ],
    importantNotes: [
      "A medical certificate confirms unfitness - it doesn't need diagnosis details",
      "Employers must accept valid certificates from registered doctors",
      "You have a right to medical privacy"
    ],
    faqs: [
      { q: "Can my employer reject my medical certificate?", a: "Generally no, if it's from a registered doctor and covers the relevant dates. They can't reject it because it's from telehealth." },
      { q: "Do I have to tell my employer why I'm sick?", a: "No. You only need to provide a certificate stating you were unfit. The certificate doesn't need to specify your condition." },
      { q: "Can they ask for a certificate from day one?", a: "Employers can have policies requiring certificates from the first day. Check your employment contract or workplace policy." }
    ],
    cta: { text: "Get a medical certificate", href: "/request?service=med-cert", subtext: `${PRICING_DISPLAY.FROM_MED_CERT} · Valid for all employers` }
  },
  "mental-health-certificate-australia": {
    title: "How to Get a Medical Certificate for a Mental Health Day",
    slug: "mental-health-certificate-australia",
    description: "Mental health days are legitimate sick leave in Australia. Learn how to get a medical certificate for mental health without an in-person visit.",
    lastUpdated: "April 2026",
    readTime: "5 min read",
    intro: "Feeling burned out, overwhelmed, or unable to face work? In Australia, taking a mental health day is your right under the Fair Work Act. Personal/carer's leave covers both physical and mental health - no distinction. Here's how to get a medical certificate without having to explain yourself in a waiting room.",
    steps: [
      {
        title: "Understand your entitlements",
        content: "Under the Fair Work Act 2009, full-time and part-time employees get 10 days of paid personal/carer's leave per year. Mental health is explicitly covered. You don't need to be 'clinically depressed' - stress, anxiety, burnout, or just needing a reset are all valid reasons.",
        tips: ["Mental health leave comes from your personal leave balance", "Casual employees aren't entitled to paid leave but can still take unpaid time off", "Your employer cannot discriminate based on the type of illness"]
      },
      {
        title: "Get a medical certificate",
        content: "If your employer requires a certificate (most do for absences over 1 day, some for any absence), you can get one through telehealth without leaving home. Complete a brief health questionnaire, a doctor reviews your situation, and a certificate is issued if appropriate. No diagnosis appears on the certificate.",
        tips: ["Telehealth is ideal - no travel while you're struggling", "Certificates don't specify your diagnosis", "The doctor may ask about your symptoms to assess appropriately"]
      },
      {
        title: "Submit to your employer",
        content: "Forward the PDF certificate to your manager or HR. You only need to say you were unwell. You don't need to disclose that it was a mental health day, what your symptoms were, or whether you saw a therapist.",
        tips: ["'I was unwell' is sufficient explanation", "Your employer cannot ask for your diagnosis", "Keep a copy for your records"]
      }
    ],
    importantNotes: [
      "Mental health leave is legally the same as sick leave in Australia",
      "Medical certificates never specify your diagnosis - your privacy is protected",
      "If you're experiencing ongoing mental health issues, consider seeing a GP for a Mental Health Treatment Plan",
      "In crisis? Call Lifeline 13 11 14 or Beyond Blue 1300 22 4636"
    ],
    faqs: [
      { q: "Can my employer refuse a mental health day?", a: "No. If you have available personal leave, your employer must accept a valid medical certificate regardless of the type of illness." },
      { q: "Will the certificate say it's for mental health?", a: "No. Medical certificates state that you were unfit for work on specific dates. No diagnosis or reason is included." },
      { q: "How often can I take mental health days?", a: "As often as needed, within your leave balance. If you're frequently needing time off, consider discussing ongoing support with a GP." },
      { q: "Do I need to see a psychologist to get a mental health certificate?", a: "No. A GP (including via telehealth) can issue a medical certificate for a mental health day. You don't need a specialist." }
    ],
    cta: { text: "Get a certificate", href: "/request?service=med-cert", subtext: "Certificate issued in under an hour. No diagnosis disclosed." }
  },
  "medical-certificate-for-surgery-recovery": {
    title: "How to Get a Medical Certificate for Surgery Recovery",
    slug: "medical-certificate-for-surgery-recovery",
    description: "Need time off work after surgery? Learn how to get a medical certificate covering your recovery period in Australia.",
    lastUpdated: "April 2026",
    readTime: "4 min read",
    intro: "If you've had surgery - whether minor day surgery or a major procedure - you'll likely need time off work to recover. Your surgeon should provide initial documentation, but if you need additional time or a separate certificate, here's how to get one.",
    steps: [
      {
        title: "Get documentation from your surgeon",
        content: "Your surgeon or hospital should provide a medical certificate covering the initial recovery period. This usually states the date of surgery, expected recovery time, and any work restrictions. Keep this - it's your primary documentation.",
        tips: ["Ask your surgeon before the procedure how long you'll need off", "Get the certificate before you leave the hospital", "Ask about any work restrictions (lifting, driving, etc.)"]
      },
      {
        title: "If you need additional recovery time",
        content: "If your recovery takes longer than expected, you may need an extended certificate. Your GP, or a telehealth doctor, can assess your current condition and issue a new certificate. They'll want to know what surgery you had, when, and what symptoms you're still experiencing.",
        tips: ["Telehealth is convenient when mobility is limited post-surgery", "Be honest about your recovery - don't rush back", "Some surgeries have standard recovery timelines"]
      },
      {
        title: "Submit to your employer",
        content: "Provide your certificate to HR or your manager. For extended leave, keep them updated on your expected return date. You may be entitled to use personal leave, annual leave, or long service leave depending on your circumstances.",
        tips: ["Check if your employer has a return-to-work program", "You may be able to return on modified duties", "Keep copies of all medical documentation"]
      }
    ],
    importantNotes: [
      "Your surgeon should provide initial recovery documentation",
      "If recovery takes longer than expected, telehealth can help with extended certificates",
      "Don't rush back to work - returning too early can cause setbacks",
      "Check your entitlements: personal leave, workers comp (if work-related), or income protection"
    ],
    faqs: [
      { q: "How long can I get a medical certificate for after surgery?", a: "This depends on the surgery. Minor procedures may need days. Major surgery can require weeks or months. Your surgeon and GP will advise." },
      { q: "Can a telehealth doctor extend my surgery recovery certificate?", a: "Yes. If your recovery is taking longer than the initial certificate covers, a telehealth doctor can assess and provide an extension." },
      { q: "Do I need my surgeon's approval to return to work?", a: "For major surgery, yes - a surgical clearance is usually recommended. For minor procedures, a GP can assess your fitness to work." }
    ],
    cta: { text: "Get a certificate", href: "/request?service=med-cert", subtext: "Extended recovery certificates available via telehealth" }
  },
  "what-employers-can-ask-medical-certificate": {
    title: "What Can Employers Ask About Your Medical Certificate?",
    slug: "what-employers-can-ask-medical-certificate",
    description: "Know your rights. Learn what information employers can and cannot request regarding your medical certificate in Australia.",
    lastUpdated: "April 2026",
    readTime: "5 min read",
    intro: "You've submitted a medical certificate but your boss wants more detail. What are they entitled to ask? In Australia, there are clear rules about what employers can and can't request. Knowing your rights means you can push back when appropriate.",
    steps: [
      {
        title: "What a medical certificate must include",
        content: "A valid Australian medical certificate only needs to include: the patient's name, the dates of unfitness, the doctor's name and registration details, and a statement that you were unfit for work. That's it. No diagnosis, no symptoms, no treatment details are required.",
        tips: ["Certificates state 'unfit for work' - not why", "The doctor's AHPRA registration number should be on it", "Telehealth certificates are equally valid"]
      },
      {
        title: "What employers can ask",
        content: "Your employer can ask: for a medical certificate if your absence exceeds their policy threshold (often 2+ days), when you expect to return, and whether you have any work restrictions when returning. They can also ask if you're fit for modified duties.",
        tips: ["Most companies require certificates after 2 consecutive days", "Some require them from day one - check your contract", "Employers can ask about fitness for specific duties"]
      },
      {
        title: "What employers cannot ask",
        content: "Your employer cannot demand: your specific diagnosis, details of your treatment, the name of your medication, access to your medical records, or a more detailed certificate than what's legally required. If they push for details, you can say 'the certificate provides the required information.'",
        tips: ["You never have to disclose your diagnosis", "Employers can't contact your doctor without consent", "Privacy laws protect your medical information"]
      }
    ],
    importantNotes: [
      "Under the Privacy Act 1988, your medical information is protected",
      "The Fair Work Act doesn't require diagnosis disclosure on medical certificates",
      "If an employer pressures you for medical details, contact Fair Work (13 13 94)",
      "You may choose to share more if you want accommodations, but it's your choice"
    ],
    faqs: [
      { q: "Can my boss call my doctor?", a: "Not without your written consent. Doctors are bound by patient confidentiality and won't share information without your permission." },
      { q: "Can I be fired for taking sick leave?", a: "No. Under the Fair Work Act, it's unlawful to dismiss someone for temporary absence due to illness if they provide required documentation." },
      { q: "What if my employer says my certificate isn't detailed enough?", a: "A certificate stating you were unfit for work on specific dates, signed by a registered doctor, meets legal requirements. They can't demand more." },
      { q: "Do I need a certificate for 1 day off?", a: "It depends on your workplace policy. Fair Work allows employers to request 'evidence' for any period, but most only require certificates for 2+ days." }
    ],
    cta: { text: "Get a certificate", href: "/request?service=med-cert", subtext: "Valid, privacy-compliant medical certificates" }
  },
  "medical-certificate-casual-workers": {
    title: "Do Casual Workers Need Medical Certificates?",
    slug: "medical-certificate-casual-workers",
    description: "Guide for casual employees on when medical certificates are required and your entitlements under Australian workplace law.",
    lastUpdated: "April 2026",
    readTime: "4 min read",
    intro: "Casual employment in Australia is different from full-time or part-time work. You don't get paid sick leave - but that doesn't mean medical certificates don't matter. Some employers still require them, and having documentation protects you. Here's what casual workers need to know.",
    steps: [
      {
        title: "Understand your casual entitlements",
        content: "Casual employees don't receive paid sick leave under the Fair Work Act. However, you're entitled to 2 days of unpaid carer's leave per occasion, and unpaid compassionate leave. Your casual loading (typically 25%) is meant to compensate for the lack of leave entitlements.",
        tips: ["No paid sick leave for casuals", "Unpaid carer's leave is available (2 days per occasion)", "25% casual loading compensates for no leave"]
      },
      {
        title: "When you might still need a certificate",
        content: "Even without paid sick leave, your employer may request a medical certificate to: justify rescheduling shifts, document why you missed a rostered shift, support unfair dismissal claims if they try to let you go for being 'unreliable', or if you're applying for conversion to permanent status.",
        tips: ["Documentation protects you even without paid leave", "Some employers have policies requiring certificates for missed shifts", "Keep certificates as evidence in case of disputes"]
      },
      {
        title: "Getting a certificate as a casual worker",
        content: "The process is the same as for any employee. See a doctor or use telehealth. The certificate states you were unfit for work on specific dates. Even if you're not getting paid for the day, having documentation shows you had a legitimate reason for your absence.",
        tips: ["Telehealth is quick and affordable", "Certificates are the same regardless of employment type", "Keep records of all certificates for your own protection"]
      }
    ],
    importantNotes: [
      "Casual employees don't get paid sick leave but can still access unpaid leave",
      "After 12 months of regular hours, you may be eligible for casual conversion to permanent",
      "Medical certificates protect you from unfair dismissal claims based on absenteeism",
      "If you're unsure about your entitlements, call Fair Work on 13 13 94"
    ],
    faqs: [
      { q: "Can I be fired for calling in sick as a casual?", a: "You can't be fired for a genuine illness. However, casual employment can be ended without notice. Having medical certificates documents that your absences were legitimate." },
      { q: "Do I need to pay for a medical certificate as a casual?", a: `Yes, there's typically a cost for the consultation. Telehealth services like InstantMed offer certificates from ${PRICING_DISPLAY.MED_CERT} - often cheaper than an in-person GP visit.` },
      { q: "Can a casual worker get unpaid sick leave?", a: "There's no 'unpaid sick leave' entitlement, but you can simply not work. Having documentation helps protect your position with your employer." },
      { q: "What if my employer pressures me to work while sick?", a: "You're never obligated to work while genuinely unwell. If pressured, document the conversation and contact Fair Work if necessary." }
    ],
    cta: { text: "Get a certificate", href: "/request?service=med-cert", subtext: `${PRICING_DISPLAY.FROM_MED_CERT}. Valid for all Australian employers.` }
  },
}
