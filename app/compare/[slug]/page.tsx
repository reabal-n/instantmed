import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Shield,
  X,
  Zap,
} from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { ContentPageTracker } from "@/components/analytics/content-page-tracker"
import { DataDrivenGuideSection } from "@/components/marketing/sections"
import { BreadcrumbSchema, FAQSchema, HealthArticleSchema, MedicalDisclaimer } from "@/components/seo"
import { Footer,Navbar } from "@/components/shared"
import { Button } from "@/components/ui/button"
import { PageBreadcrumbs } from "@/components/uix"
import { PRICING_DISPLAY } from "@/lib/constants"
import {
  type ComparisonEntry,
  COMPETITOR_COMPARISONS,
} from "@/lib/seo/data/competitor-comparisons"

// Built-in comparisons - general telehealth educational pages.
// Competitor-specific comparisons live in lib/seo/data/competitor-comparisons.ts
// and are merged into `comparisons` below.
const builtInComparisons: Record<string, ComparisonEntry> = {
  "telehealth-vs-gp": {
    title: "Telehealth vs In-Person GP: Which Should You Choose?",
    slug: "telehealth-vs-gp",
    description: "Compare telehealth services like InstantMed with traditional GP visits. Understand when each option is best for your healthcare needs.",
    competitor: {
      name: "In-Person GP",
      type: "gp"
    },
    heroText: "Both telehealth and in-person GP visits have their place in modern healthcare. Here's an honest comparison to help you choose the right option for your situation.",
    comparisonTable: [
      { feature: "Wait time for appointment", instantmed: "No wait - start immediately", competitor: "Often days to weeks", winner: "instantmed" },
      { feature: "Time to see doctor", instantmed: "Usually under 1 hour", competitor: "15-60 min in waiting room + consult", winner: "instantmed" },
      { feature: "Available after hours", instantmed: "Yes, extended hours", competitor: "Limited (after-hours clinics)", winner: "instantmed" },
      { feature: "Physical examination", instantmed: "Not available", competitor: "Full examination possible", winner: "competitor" },
      { feature: "Blood tests & procedures", instantmed: "Referrals only", competitor: "On-site or nearby", winner: "competitor" },
      { feature: "Medical certificates", instantmed: "Yes - legally valid", competitor: "Yes", winner: "tie" },
      { feature: "Prescriptions", instantmed: "E-prescriptions for suitable conditions", competitor: "Full prescribing", winner: "competitor" },
      { feature: "Cost with Medicare", instantmed: `${PRICING_DISPLAY.FROM_MED_CERT} (no Medicare rebate)`, competitor: "Free if bulk-billed", winner: "competitor" },
      { feature: "Continuity of care", instantmed: "Records available, different doctors", competitor: "Same GP can follow your history", winner: "competitor" },
      { feature: "Convenience", instantmed: "From anywhere, no travel", competitor: "Need to travel to clinic", winner: "instantmed" },
      { feature: "Privacy", instantmed: "Completely private", competitor: "Waiting room, shared space", winner: "instantmed" },
      { feature: "Complex conditions", instantmed: "Better suited for simple issues", competitor: "Can handle complexity", winner: "competitor" },
    ],
    whenInstantMedBetter: [
      "You need a medical certificate quickly and don't want to wait for a GP appointment",
      "You have a straightforward issue like cold/flu symptoms",
      "You need a repeat prescription for a medication you're already taking",
      "You're in a remote area or can't easily get to a clinic",
      "You need care outside normal GP hours",
      "You prefer the privacy of a remote consultation",
      "You're too unwell to travel to a clinic"
    ],
    whenCompetitorBetter: [
      "You need a physical examination",
      "You're starting a new medication that needs monitoring",
      "You have a complex or ongoing health condition",
      "You need blood tests, vaccinations, or procedures",
      "You want to build a relationship with a regular GP",
      "You're eligible for bulk billing and cost is a concern",
      "You have symptoms that need to be physically assessed"
    ],
    verdict: "Telehealth and in-person GPs complement each other. Use telehealth for convenience and straightforward issues. See your GP for complex conditions, physical examinations, and ongoing care. Many people use both - telehealth when they need something quick, GP visits for comprehensive care.",
    faqs: [
      {
        q: "Is telehealth as good as seeing a GP in person?",
        a: "For appropriate conditions, telehealth can be just as effective. Many health issues don't require physical examination. The key is knowing which option suits your needs - telehealth is great for convenience and simple issues, while GPs are better for complex or ongoing care."
      },
      {
        q: "Will my regular GP know about my telehealth consultations?",
        a: "Telehealth consultations create medical records, but they're not automatically shared with your GP. You can request a summary to share with your GP, or inform them about any diagnoses or prescriptions you received."
      },
      {
        q: "Can telehealth doctors prescribe the same medications as GPs?",
        a: "Telehealth doctors can prescribe most common medications, including repeat scripts. However, some medications (controlled substances, those needing monitoring) may require an in-person assessment."
      },
      {
        q: "Should I still have a regular GP if I use telehealth?",
        a: "Yes, we recommend it. A regular GP provides continuity of care, knows your full history, and can manage complex or chronic conditions. Telehealth is best used as a complement to, not replacement for, ongoing GP care."
      },
      {
        q: "Are telehealth doctors registered with AHPRA?",
        a: "They should be, and you should always verify. Every doctor on InstantMed is fully registered with AHPRA (the Australian Health Practitioner Regulation Agency). If a telehealth service doesn't confirm this, that's a reason to look elsewhere."
      },
      {
        q: "Is my personal health information safe during a telehealth consultation?",
        a: "Reputable telehealth services use encryption and follow Australian Privacy Act requirements for handling health data. InstantMed encrypts all personal health information and stores data on Australian servers. Always check a provider's privacy policy before sharing medical details."
      },
      {
        q: "Can a telehealth doctor issue a referral to a specialist?",
        a: "Yes. Telehealth doctors can write referrals for specialists, pathology, and imaging - the same as a GP. However, your specialist may still want to see you in person for the actual consultation, depending on your condition."
      },
      {
        q: "How do I know if my issue is suitable for telehealth?",
        a: "A reasonable rule of thumb: if you could describe the problem over the phone and the doctor wouldn't need to touch you, it's probably suitable. Cold and flu symptoms, repeat scripts, medical certificates, and skin concerns visible in photos are all good fits. Chest pain, severe injuries, or breathing difficulties need in-person or emergency care."
      },
      {
        q: "What happens if the telehealth doctor can't help me?",
        a: "A responsible telehealth service will tell you when your issue needs in-person care. At InstantMed, if a doctor can't safely help through telehealth, they'll advise you to see a GP or attend an emergency department - and you'll receive a full refund."
      },
      {
        q: "Does telehealth cost more than seeing a GP?",
        a: "If your GP bulk bills, then yes - telehealth will cost more in dollar terms. But if you factor in travel costs, time off work, and the convenience of being seen from home, many people find telehealth a reasonable trade-off. Private GP consultations often cost $40-80 out of pocket, which makes the comparison closer."
      },
      {
        q: "Can children use telehealth services?",
        a: "Most telehealth services, including InstantMed, are designed for patients aged 18 and over. Some services offer paediatric telehealth, but for children, an in-person GP is generally the better option - kids are harder to assess remotely and often need physical examination."
      },
      {
        q: "Is a medical certificate from telehealth valid for work?",
        a: "Yes. A medical certificate issued by an AHPRA-registered doctor through telehealth is legally identical to one from an in-person visit. The Fair Work Act doesn't distinguish between the two. Your employer must accept it."
      }
    ],
    guideContent: {
      title: "Understanding Telehealth vs GP Visits in Australia",
      subtitle: "An honest guide to choosing the right healthcare option for your situation.",
      sections: [
        {
          id: "regulation",
          title: "How Telehealth Is Regulated in Australia",
          paragraphs: [
            "Telehealth in Australia operates under the same regulatory framework as in-person medicine. Every telehealth doctor must hold current AHPRA registration, and the Medical Board of Australia's guidelines on telehealth consultations apply equally to online and in-person care. This means the clinical standards you receive through telehealth should be identical to what you'd get sitting in a GP's office.",
            "The TGA (Therapeutic Goods Administration) regulates prescribing regardless of the consultation format. Telehealth doctors follow the same prescribing rules, can't prescribe controlled substances without appropriate assessment, and must document their clinical reasoning. The difference is the delivery method, not the regulatory standard.",
            "One area where regulation is still catching up is cross-border prescribing. Australian telehealth services can only treat patients physically located in Australia, and prescribing laws vary slightly between states - though for common conditions and standard medications, these differences rarely matter in practice."
          ]
        },
        {
          id: "when-to-choose",
          title: "When Each Option Makes Clinical Sense",
          paragraphs: [
            "The clinical question isn't whether telehealth is 'real medicine' - it is. The question is whether your specific issue can be safely assessed without hands-on examination. Upper respiratory infections, urinary symptoms, mental health check-ins, repeat prescriptions, and medical certificates are all well-suited to telehealth. These conditions rely primarily on your history and reported symptoms, not on physical findings.",
            "In-person GP visits become necessary when examination changes the clinical picture. A sore throat is fine for telehealth, but persistent abdominal pain needs palpation. A rash you can photograph works online, but a suspicious mole needs a dermoscope. The best approach is to start with the question: does this condition require someone to physically examine me?",
            "For ongoing chronic conditions, the answer is usually 'both.' Your regular GP manages the long-term plan, runs periodic blood tests, and adjusts treatment. Telehealth fills the gaps - when you need a script renewed between appointments, or a quick certificate when you're too unwell to visit the clinic."
          ]
        },
        {
          id: "cost-value",
          title: "The Real Cost Comparison",
          paragraphs: [
            "The headline price is simple: bulk-billed GPs are free at the point of service; telehealth costs money out of pocket. But the full cost picture is more nuanced. The average private GP consultation in Australia costs $40-80 after any Medicare rebate, and many Australians no longer have access to a bulk-billing GP - particularly in metro areas where bulk billing has declined sharply.",
            "Then there are the hidden costs of GP visits: travel time, fuel or public transport fares, parking, and time off work. For someone earning an average wage, a two-hour round trip to the GP (including waiting room time) represents $60-80 in lost productivity. A telehealth consultation that takes 10 minutes to complete suddenly looks more economical."
          ]
        },
        {
          id: "privacy",
          title: "Privacy and Data Security Considerations",
          paragraphs: [
            "There's an irony in healthcare privacy: sitting in a GP waiting room is one of the least private experiences in medicine. Everyone can see you're there, and conversations at the reception desk aren't always discreet. Telehealth, by contrast, lets you consult from wherever you're comfortable - no one knows you sought medical attention unless you tell them.",
            "On the digital side, reputable telehealth services encrypt personal health information both in transit and at rest. The Australian Privacy Act's health-specific provisions (the Australian Privacy Principles) apply to telehealth providers just as they do to GP clinics. The key difference is that telehealth creates a digital record from the start, while GP clinics vary widely in how they store and protect patient data.",
            "If privacy matters to you - whether for stigmatised conditions, workplace sensitivity, or personal preference - telehealth offers a level of discretion that's difficult to match in a physical clinic setting."
          ]
        }
      ]
    }
  },
  "online-medical-certificate-options": {
    title: "Online Medical Certificate Services in Australia Compared",
    slug: "online-medical-certificate-options",
    description: "Compare online medical certificate services in Australia. See how different telehealth providers stack up for getting a sick note.",
    competitor: {
      name: "Other Online Services",
      type: "alternative"
    },
    heroText: "Several telehealth services in Australia offer online medical certificates. Here's what to look for and how the options compare.",
    comparisonTable: [
      { feature: "AHPRA registered doctors", instantmed: true, competitor: "Varies - always check", winner: "tie" },
      { feature: "Average response time", instantmed: "Under 1 hour", competitor: "1-24 hours", winner: "instantmed" },
      { feature: "Price for med cert", instantmed: PRICING_DISPLAY.FROM_MED_CERT, competitor: "$15-50", winner: "tie" },
      { feature: "Backdating available", instantmed: "If clinically appropriate", competitor: "Varies by service", winner: "tie" },
      { feature: "Carer's leave certificates", instantmed: true, competitor: "Most services", winner: "tie" },
      { feature: "Mental health certificates", instantmed: true, competitor: "Most services", winner: "tie" },
      { feature: "Follow-up if declined", instantmed: "Full refund + guidance", competitor: "Varies", winner: "instantmed" },
      { feature: "Doctor messaging", instantmed: "Yes - can clarify", competitor: "Some services", winner: "instantmed" },
      { feature: "Available 7 days", instantmed: true, competitor: "Most services", winner: "tie" },
      { feature: "Prescription services", instantmed: true, competitor: "Some services", winner: "instantmed" },
    ],
    whenInstantMedBetter: [
      "You need your certificate quickly (under 1 hour)",
      "You want to be able to message the doctor if they have questions",
      "You also need a prescription or other medical service",
      "You value a refund guarantee if your request can't be fulfilled",
      "You want a service with transparent, upfront pricing"
    ],
    whenCompetitorBetter: [
      "You're looking for the absolute lowest price",
      "You're eligible for a bulk-billed telehealth service",
      "You have a specific service you've used before and trust",
      "You want video consultation rather than asynchronous"
    ],
    verdict: "When choosing an online medical certificate service, prioritise: (1) AHPRA-registered doctors, (2) clear pricing, (3) reasonable response times, and (4) a proper clinical assessment. Avoid services that seem to guarantee approval or don't involve a real doctor reviewing your case.",
    faqs: [
      {
        q: "Are all online medical certificates legitimate?",
        a: "Certificates from AHPRA-registered doctors are legitimate. Always verify the service uses registered Australian doctors. Avoid services that guarantee approval without assessment - that's a red flag."
      },
      {
        q: "Why do prices vary so much between services?",
        a: "Prices reflect different business models. Some services use very brief assessments, others more thorough. Cheaper isn't always better - look for services that do a proper clinical assessment."
      },
      {
        q: "What should I look for in an online certificate service?",
        a: "Key factors: AHPRA-registered doctors, transparent pricing, reasonable response times, proper assessment process, and clear communication. Avoid services promising instant approval."
      },
      {
        q: "Can my employer tell if my certificate is from a telehealth service?",
        a: "Certificates will show the doctor's details. Some employers can tell it's from a telehealth service, but this doesn't affect validity. Telehealth certificates are legally equivalent to in-person ones."
      },
      {
        q: "Are online medical certificates accepted under the Fair Work Act?",
        a: "Yes. The Fair Work Act requires a medical certificate from a 'registered health practitioner.' AHPRA-registered doctors providing certificates through telehealth meet this standard. The Act makes no distinction between online and in-person certificates."
      },
      {
        q: "Can I get a backdated medical certificate online?",
        a: "Some services can backdate certificates when it's clinically appropriate - for example, if you were genuinely unwell yesterday but couldn't see a doctor. The doctor needs to be satisfied there's a reasonable basis for backdating. Services that backdate without any clinical assessment should be avoided."
      },
      {
        q: "What happens if my online certificate request is declined?",
        a: "A reputable service will explain why the request was declined and suggest next steps - usually seeing a GP in person. At InstantMed, declined requests receive a full refund. If a service keeps your money after declining, that's worth questioning."
      },
      {
        q: "How long is an online medical certificate valid for?",
        a: "The validity period is set by the issuing doctor based on their clinical assessment, just like an in-person certificate. Common durations are 1-3 days for acute illness. The certificate will clearly state the dates it covers."
      },
      {
        q: "Can I get a carer's leave certificate online?",
        a: "Yes. Carer's leave certificates require a doctor to confirm that a member of your household or family is ill and needs your care. Most online services can issue these - the doctor will ask about the person you're caring for and why they need your support."
      },
      {
        q: "Do online medical certificate services report to My Health Record?",
        a: "This varies by service. Some upload records to My Health Record, others don't. Medical certificates aren't routinely uploaded to My Health Record even by GPs, so this usually isn't a concern. Check the service's privacy policy if you want to know their specific practice."
      },
      {
        q: "Is it safe to enter my health information on these websites?",
        a: "Reputable services use encryption and comply with Australian Privacy Act requirements. Look for services that clearly state how they handle your data, use HTTPS, and follow the Australian Privacy Principles. Avoid services with vague or missing privacy policies."
      },
      {
        q: "Can I get a medical certificate for mental health reasons online?",
        a: "Yes. Mental health conditions like anxiety, stress, and depression are valid reasons for a medical certificate, and telehealth is well-suited for assessing these conditions. The doctor will ask about your symptoms and their impact on your ability to work. There's no requirement to disclose a specific diagnosis to your employer."
      }
    ],
    guideContent: {
      title: "Choosing an Online Medical Certificate Service",
      subtitle: "What matters, what doesn't, and the red flags to watch for.",
      sections: [
        {
          id: "legitimacy",
          title: "What Makes an Online Certificate Legitimate",
          paragraphs: [
            "The legitimacy of a medical certificate comes from who issues it, not how. Under Australian law, a valid medical certificate must be issued by a registered health practitioner - in most cases, an AHPRA-registered doctor. Whether that doctor assessed you in a clinic or through a telehealth platform is irrelevant to the certificate's legal standing.",
            "The certificate itself should include the doctor's name, AHPRA registration number (or provider number), the date of assessment, the period of unfitness, and the doctor's signature or digital equivalent. If a service issues certificates missing any of these elements, that's a problem. If it issues them without any clinical assessment at all, that's a bigger problem.",
            "Worth noting: your employer can verify a doctor's registration on the AHPRA website. They can also contact the issuing doctor to confirm a certificate is genuine. Services that use real, registered doctors have nothing to hide here."
          ]
        },
        {
          id: "assessment-quality",
          title: "Why the Assessment Process Matters",
          paragraphs: [
            "Some online certificate services use a minimal questionnaire - a few checkboxes and you're done. Others conduct a more thorough assessment, asking about your symptoms, duration, severity, and any relevant medical history. The quality of this assessment directly affects the quality (and defensibility) of the certificate.",
            "A proper assessment protects you. If your employer ever questions a certificate, a thorough assessment record supports the doctor's decision. It also means the doctor can pick up on red flags - symptoms that might suggest something more serious, or patterns that warrant follow-up. The extra few minutes of answering questions is a feature, not a bug."
          ]
        },
        {
          id: "employer-acceptance",
          title: "Employer Acceptance and Your Rights",
          paragraphs: [
            "Some employers raise eyebrows at online medical certificates. They shouldn't - and legally, they can't reject a valid certificate simply because it came from a telehealth service. The Fair Work Act requires employees to provide 'evidence that would satisfy a reasonable person,' and a certificate from a registered doctor meets that standard regardless of the consultation format.",
            "That said, some enterprise agreements or company policies have specific wording about acceptable evidence. If your employer has a policy that specifically requires an in-person GP visit, that policy may be unenforceable under the Fair Work Act, but it's worth knowing about before a dispute arises. The Fair Work Ombudsman has guidance on this.",
            "If an employer rejects a legitimate telehealth certificate, the employee can file a complaint with the Fair Work Commission. In practice, most employers accept them without question - particularly since COVID normalised telehealth across Australia."
          ]
        },
        {
          id: "security-privacy",
          title: "Protecting Your Health Information Online",
          paragraphs: [
            "When you submit health information to an online service, you're trusting them with sensitive data. Australian Privacy Principle 11 requires organisations to take reasonable steps to protect personal information from misuse, interference, and unauthorised access. For health information, the standard is higher.",
            "Before using any online certificate service, check three things: do they use HTTPS (the padlock in your browser bar)? Do they have a clear privacy policy explaining how your data is stored and who can access it? And do they store data in Australia, or is it going offshore? These basics tell you a lot about how seriously a service takes your privacy."
          ]
        }
      ]
    }
  },
  "waiting-room-vs-telehealth": {
    title: "Skip the Waiting Room: Is Telehealth Worth It?",
    slug: "waiting-room-vs-telehealth",
    description: "Tired of waiting rooms? Compare the telehealth experience with traditional clinic visits and see if online healthcare is right for you.",
    competitor: {
      name: "Traditional Clinic Visit",
      type: "alternative"
    },
    heroText: "The average Australian spends 20 minutes in a GP waiting room - and that's after waiting days for an appointment. Here's how telehealth changes the equation.",
    comparisonTable: [
      { feature: "Booking an appointment", instantmed: "Instant - start now", competitor: "Often 2-7 days wait", winner: "instantmed" },
      { feature: "Time in waiting room", instantmed: "0 minutes", competitor: "15-45 minutes average", winner: "instantmed" },
      { feature: "Travel time", instantmed: "None", competitor: "15-30 minutes each way", winner: "instantmed" },
      { feature: "Total time investment", instantmed: "~10 min form + wait for response", competitor: "Often 1-2+ hours total", winner: "instantmed" },
      { feature: "Can do while sick in bed", instantmed: true, competitor: false, winner: "instantmed" },
      { feature: "Exposure to other sick people", instantmed: "None", competitor: "Waiting room exposure", winner: "instantmed" },
      { feature: "Need to take time off work", instantmed: "Usually no", competitor: "Often yes", winner: "instantmed" },
      { feature: "Available on weekends", instantmed: true, competitor: "Limited options", winner: "instantmed" },
      { feature: "Physical examination", instantmed: false, competitor: true, winner: "competitor" },
      { feature: "Same-day procedures", instantmed: false, competitor: true, winner: "competitor" },
    ],
    whenInstantMedBetter: [
      "You're unwell and don't want to leave the house",
      "You can't get a GP appointment for days",
      "You just need a medical certificate or simple script",
      "You don't want to sit in a waiting room with other sick people",
      "You can't take time off work for a GP visit",
      "It's after hours or the weekend",
      "You value convenience and speed"
    ],
    whenCompetitorBetter: [
      "You need a physical examination",
      "You need blood tests or vaccinations",
      "You have a complex condition needing discussion",
      "You're eligible for bulk billing",
      "You want to see your regular GP who knows your history"
    ],
    verdict: "For straightforward needs like medical certificates, simple illnesses, and repeat prescriptions, telehealth saves significant time and hassle. For complex issues or when you need physical assessment, a clinic visit is still the better choice. The good news: you don't have to choose one or the other.",
    faqs: [
      {
        q: "How much time does telehealth actually save?",
        a: "For a typical medical certificate, telehealth takes about 10 minutes to complete the form, then you wait for the doctor's response (usually under an hour). Compare this to days waiting for a GP appointment, plus travel and waiting room time."
      },
      {
        q: "Is it worth paying for telehealth when GPs can bulk bill?",
        a: "That depends on your situation. If your time is valuable and you need care quickly, paying $20-30 for telehealth can be worth it. If cost is your main concern and you can wait, a bulk-billed GP is the cheaper option."
      },
      {
        q: "What if I start with telehealth but need to see someone in person?",
        a: "That's fine - telehealth doctors will tell you if they think you need in-person care. You're not locked in. Many people use telehealth for triage - if it's simple, sorted. If not, they'll guide you to the right care."
      },
      {
        q: "Do I still need a regular GP if I use telehealth?",
        a: "We recommend having a regular GP for ongoing care, chronic conditions, and comprehensive health management. Telehealth is best for convenience and acute issues, not as a replacement for regular preventive care."
      },
      {
        q: "Is the clinical quality lower when I skip the waiting room?",
        a: "The waiting room is not part of the clinical assessment - it's just where you sit before it happens. The quality of care depends on the doctor, not the chair you waited in. For conditions suitable for remote assessment, telehealth doctors apply the same clinical standards as in-person doctors."
      },
      {
        q: "Can I use telehealth if I'm in a rural or remote area?",
        a: "Absolutely - and this is where telehealth really shines. If the nearest GP is a 90-minute drive, telehealth removes a significant barrier to getting care. You just need an internet connection. Many rural Australians have made telehealth their first port of call for straightforward issues."
      },
      {
        q: "What about infection risk in waiting rooms?",
        a: "It's a legitimate concern. GP waiting rooms can expose you to other sick patients, which is particularly relevant during flu season or respiratory illness outbreaks. Telehealth eliminates this risk entirely. If you're already unwell or immunocompromised, avoiding a waiting room has clear clinical benefits."
      },
      {
        q: "How does telehealth handle follow-up if my condition worsens?",
        a: "A responsible telehealth service includes safety-netting advice - what to watch for and when to seek in-person or emergency care. If your condition worsens, you should see a GP or attend an emergency department. Telehealth is a complement to the healthcare system, not a walled garden."
      },
      {
        q: "Are telehealth consultations documented like in-person visits?",
        a: "Yes. Telehealth consultations create a clinical record that includes your symptoms, the doctor's assessment, and any treatment or referrals. These records can be shared with your GP if needed. Some services also provide consultation summaries you can keep for your own records."
      },
      {
        q: "Can I get a referral through telehealth?",
        a: "Yes. Telehealth doctors can write referrals to specialists, pathology, and imaging. The referral is as valid as one from an in-person visit. However, the specialist may still require you to attend in person - that depends on the specialist's own practice."
      },
      {
        q: "What technology do I need for a telehealth consultation?",
        a: "For asynchronous telehealth services like InstantMed, you just need a device with a web browser and an internet connection. No special software, no video calls, no app downloads. You fill in a form, a doctor reviews it, and you get your result. Simpler than most people expect."
      },
      {
        q: "Is telehealth covered by private health insurance?",
        a: "Most private health insurance policies don't cover GP consultations (in-person or telehealth) under their extras cover. However, some policies offer telehealth as a member benefit. Check with your insurer. For most people, telehealth is an out-of-pocket cost that competes on convenience rather than insurance coverage."
      }
    ],
    guideContent: {
      title: "The Real Cost of the Waiting Room",
      subtitle: "Time, money, and health trade-offs most people don't think about.",
      sections: [
        {
          id: "hidden-costs",
          title: "The Hidden Costs of a GP Visit",
          paragraphs: [
            "The financial cost of seeing a GP is just the start. The average GP visit in Australia takes about two hours from door to door - factoring in travel time, parking, the waiting room, the consultation itself, and any pharmacy stop afterwards. For someone on an average wage, those two hours represent $60-80 in lost earnings or productive time.",
            "Then there are the less obvious costs: arranging childcare, rescheduling meetings, using up personal leave. For shift workers, a midday GP appointment might mean losing an entire shift. For small business owners, being away from work for two hours can have ripple effects. The waiting room isn't free - you're just paying in time instead of money.",
            "None of this means GP visits aren't worth it. For complex issues, ongoing care, and physical examinations, they absolutely are. But for a medical certificate or a repeat prescription, the two-hour investment can feel disproportionate to the clinical need."
          ]
        },
        {
          id: "infection-risk",
          title: "Waiting Rooms and Infection Exposure",
          paragraphs: [
            "GP waiting rooms are, by design, places where sick people congregate. During flu season, a waiting room visit carries a measurable risk of picking up something new. Research has shown that respiratory viruses can spread in enclosed spaces with limited ventilation - and while many clinics have improved their airflow since COVID, the fundamental physics hasn't changed.",
            "For immunocompromised patients, the elderly, or pregnant women, this isn't a trivial concern. Telehealth removes the exposure entirely. You consult from your own environment, on your own terms, without sitting next to someone who's coughing into the shared magazine pile."
          ]
        },
        {
          id: "accessibility",
          title: "Accessibility and Equity of Access",
          paragraphs: [
            "Australia's GP shortage is well-documented. In 2024, the average wait for a GP appointment was 4-7 days in metro areas and significantly longer in rural and regional Australia. Some towns have no GP at all. Telehealth doesn't fix the doctor shortage, but it does remove the geographic barrier - a patient in rural Queensland has the same access to telehealth as someone in Sydney's CBD.",
            "Accessibility matters beyond geography too. People with mobility limitations, those without reliable transport, parents with young children, and workers on inflexible rosters all face barriers to in-person care. Telehealth lowers those barriers without requiring anyone to build a new clinic or hire another receptionist.",
            "The equity argument is real: if your only options are a GP with a two-week wait or paying $20-30 for a same-day telehealth consultation, the ability to access care at all becomes the defining factor. A system that only works during business hours for people who can leave work isn't serving everyone."
          ]
        }
      ]
    }
  },
  "bulk-billing-vs-private-telehealth": {
    title: "Bulk Billing vs Private Telehealth: Which Is Better?",
    slug: "bulk-billing-vs-private-telehealth",
    description: "Compare bulk-billed telehealth with private telehealth services. Understand the trade-offs between cost, wait times, and service quality.",
    competitor: { name: "Bulk-Billed Telehealth", type: "alternative" },
    heroText: "Bulk-billed telehealth is free with Medicare, but private telehealth often offers faster service and more flexibility. Here's how they compare.",
    comparisonTable: [
      { feature: "Out-of-pocket cost", instantmed: PRICING_DISPLAY.FROM_MED_CERT, competitor: "Free (with Medicare)", winner: "competitor" },
      { feature: "Wait time for appointment", instantmed: "Usually under 1 hour", competitor: "Often days to weeks", winner: "instantmed" },
      { feature: "Available 7 days", instantmed: true, competitor: "Varies - limited", winner: "instantmed" },
      { feature: "Extended hours", instantmed: "7am-10pm AEST", competitor: "Often business hours only", winner: "instantmed" },
      { feature: "Medical certificates", instantmed: true, competitor: "Yes", winner: "tie" },
      { feature: "Prescription services", instantmed: true, competitor: "Yes", winner: "tie" },
      { feature: "Doctor messaging", instantmed: true, competitor: "Rare", winner: "instantmed" },
      { feature: "Medicare rebate", instantmed: "No - private service", competitor: "Bulk billed", winner: "competitor" },
    ],
    whenInstantMedBetter: [
      "You need care quickly and can't wait days",
      "You need a certificate or script outside business hours",
      "You value convenience and speed over cost",
      "Bulk-billing services are fully booked",
    ],
    whenCompetitorBetter: [
      "Cost is your primary concern",
      "You can wait days for an appointment",
      "You're eligible for bulk billing and have time",
    ],
    verdict: "Choose bulk billing if cost matters most and you can wait. Choose private telehealth if speed and convenience matter. Many Australians use both - bulk billing when they can wait, private when they need something fast.",
    faqs: [
      { q: "Is private telehealth worth it when bulk billing exists?", a: "It depends on your situation. If you need a certificate today and bulk-billing has a 2-week wait, paying $20 can be worth it. If you have time and cost matters, bulk billing is the better choice." },
      { q: "Can I claim Medicare for private telehealth?", a: "Some private telehealth services may allow you to claim a rebate. Check with the provider. InstantMed is a private service with transparent upfront pricing." },
      { q: "Why is bulk-billed telehealth so hard to get?", a: "Demand exceeds supply. Many bulk-billing services are fully booked. Government funding for bulk billing has also been under pressure." },
      {
        q: "Are the doctors less qualified on private telehealth services?",
        a: "No. All practising doctors in Australia must be registered with AHPRA regardless of whether they work in a bulk-billing clinic or a private telehealth service. The qualification and registration requirements are identical. The difference is in the business model, not the medical credentials."
      },
      {
        q: "Why can't private telehealth services offer bulk billing?",
        a: "Bulk billing requires the provider to accept the Medicare rebate as full payment. For telehealth consultations, the Medicare rebate is often lower than the cost of providing the service - particularly for asynchronous consultations that don't attract standard MBS item numbers. Private services charge a fee to sustain quality and availability."
      },
      {
        q: "Do bulk-billed telehealth services offer the same clinical quality?",
        a: "They can - the clinical quality depends on the individual doctor and the service's processes, not the billing model. However, bulk-billed services are under more financial pressure, which can mean shorter consultations and higher patient volumes per doctor. This doesn't necessarily mean worse care, but it's a factor."
      },
      {
        q: "Can I use private telehealth for conditions I'd normally bulk bill?",
        a: "Yes. You can use private telehealth for any condition that's clinically appropriate for remote assessment. Many people use private telehealth when they can't get a timely bulk-billed appointment - it's a matter of trading cost for convenience."
      },
      {
        q: "Is my health data handled differently by private vs bulk-billed services?",
        a: "Both are bound by the Australian Privacy Act and the Australian Privacy Principles. In practice, private telehealth services often invest more heavily in data security infrastructure - encryption, secure storage, access controls - because their business model depends on patient trust. But the legal obligations are the same."
      },
      {
        q: "Will bulk-billed telehealth become easier to access in future?",
        a: "The Australian Government has been expanding Medicare item numbers for telehealth, but the fundamental challenge remains: there aren't enough doctors to meet demand, regardless of billing model. Telehealth improves access by removing geographic barriers, but it can't create more doctors. Private services help absorb overflow demand."
      },
      {
        q: "Can I claim private telehealth costs on my tax return?",
        a: "Medical expenses are generally not tax-deductible for individuals in Australia. However, if your employer provides a health spending account or you have an HSA equivalent through your workplace, check whether telehealth services are covered. Some corporate wellness programs reimburse telehealth costs."
      },
      {
        q: "Do I need a Medicare card to use private telehealth?",
        a: "Not necessarily. Private telehealth services that don't bill Medicare may not require a Medicare card. At InstantMed, a Medicare card is not required for medical certificates, but is needed for services where the doctor may need to verify your Medicare eligibility or prescribing history."
      }
    ],
    guideContent: {
      title: "Bulk Billing vs Private Telehealth: The Full Picture",
      subtitle: "Understanding the real trade-offs behind free and paid telehealth models.",
      sections: [
        {
          id: "funding-model",
          title: "How Each Model Is Funded",
          paragraphs: [
            "Bulk billing works because the government pays the doctor on your behalf through the Medicare Benefits Schedule. The MBS sets the rebate amount for each consultation type. When a doctor bulk bills, they accept this rebate as full payment - no gap, no out-of-pocket cost to the patient. It's a cornerstone of Australia's universal healthcare system.",
            "Private telehealth services charge patients directly and don't rely on MBS rebates. This means they can set their own prices, offer extended hours, and invest in technology and service quality without being constrained by Medicare rebate levels. The trade-off is clear: patients pay, but they gain access and convenience.",
            "The financial pressure on bulk billing is real. Medicare rebates haven't kept pace with the cost of running a medical practice, which is why fewer GPs offer bulk billing - particularly in capital cities. For telehealth specifically, asynchronous consultations don't always fit neatly into existing MBS item numbers, making bulk billing structurally difficult."
          ]
        },
        {
          id: "availability",
          title: "Why Availability Differs So Much",
          paragraphs: [
            "The wait time difference between bulk-billed and private telehealth is often dramatic - days or weeks versus under an hour. This isn't a mystery: when something is free, demand outstrips supply. Bulk-billed telehealth services are often overwhelmed, with appointment slots filling up almost immediately.",
            "Private services manage this through pricing. The fee creates a natural demand filter - people who need care urgently are willing to pay, while those with less urgent needs may prefer to wait for a free option. This isn't a value judgment; it's how markets work. The result is that private services can maintain shorter wait times because they aren't absorbing unlimited demand at zero cost."
          ]
        },
        {
          id: "when-to-use",
          title: "A Practical Decision Framework",
          paragraphs: [
            "Rather than treating this as an either/or choice, most Australians are better served by using both models strategically. For routine check-ups, chronic disease management, and ongoing care, a bulk-billed GP (in-person or telehealth) provides the best value. Your regular GP knows your history, coordinates your care, and bulk billing keeps costs manageable over time.",
            "For acute needs - a medical certificate for tomorrow, a repeat prescription that ran out over the weekend, or care after hours when bulk-billed services aren't available - private telehealth fills a genuine gap. Paying $20-40 for same-day service is a reasonable cost when the alternative is missing work or going without care.",
            "The test is simple: can this wait, or do I need it now? If it can wait, use the free option. If it can't, pay for the faster one. Neither choice is wrong - they serve different needs."
          ]
        }
      ]
    }
  },
  "e-prescriptions-vs-paper": {
    title: "e-Prescriptions vs Paper Prescriptions: What's the Difference?",
    slug: "e-prescriptions-vs-paper",
    description: "e-Prescriptions (eScripts) are replacing paper prescriptions in Australia. Learn how they work, where to use them, and how they compare.",
    competitor: { name: "Paper Prescriptions", type: "alternative" },
    heroText: "e-Prescriptions have become the standard in Australia. Here's how they compare to the old paper system and what you need to know.",
    comparisonTable: [
      { feature: "Format", instantmed: "QR code or token via SMS", competitor: "Physical paper", winner: "tie" },
      { feature: "Can lose it", instantmed: "No - resendable", competitor: "Yes", winner: "instantmed" },
      { feature: "Use at any pharmacy", instantmed: true, competitor: true, winner: "tie" },
      { feature: "Need to collect", instantmed: "No - digital", competitor: "Yes - from doctor", winner: "instantmed" },
      { feature: "Repeat prescriptions", instantmed: "Token can include repeats", competitor: "Separate paper for each", winner: "instantmed" },
      { feature: "PBS eligible", instantmed: true, competitor: true, winner: "tie" },
      { feature: "Works with telehealth", instantmed: "Designed for it", competitor: "Requires mail or pickup", winner: "instantmed" },
    ],
    whenInstantMedBetter: [
      "You're using telehealth - eScripts are the standard",
      "You want to avoid losing a prescription",
      "You need repeats - one token can include them",
    ],
    whenCompetitorBetter: [
      "Your pharmacy doesn't support eScripts (rare)",
      "You prefer to hold a physical copy",
    ],
    verdict: "e-Prescriptions are the modern standard in Australia. They're more convenient, can't be lost, and work seamlessly with telehealth. Paper prescriptions are still valid but less common. Most pharmacies accept eScripts.",
    faqs: [
      { q: "Do all pharmacies accept eScripts?", a: "Yes. eScripts are now the standard across Australia. Any pharmacy can scan the QR code or enter the token." },
      { q: "What if I lose my eScript?", a: "Contact your doctor or the service that issued it. They can resend it. One advantage of eScripts - they're digital and resendable." },
      { q: "Can I use an eScript at a different pharmacy than usual?", a: "Yes. eScripts work at any pharmacy in Australia. You're not locked in to one pharmacy." },
      {
        q: "How do e-prescriptions actually work?",
        a: "Your doctor creates the prescription electronically. You receive a token - a unique code - via SMS or email, often with a QR code. At the pharmacy, the pharmacist scans the QR code or enters the token to retrieve your prescription from a secure national database. The medication is dispensed just like it would be with paper."
      },
      {
        q: "Are e-prescriptions as safe and regulated as paper prescriptions?",
        a: "Yes - arguably more so. e-Prescriptions are regulated by the same TGA and state-based prescribing laws as paper. Additionally, eScripts have built-in safeguards: they're tied to a verified prescriber, tracked in a national system, and can't be photocopied or forged the way paper scripts occasionally are."
      },
      {
        q: "Can I still get a paper prescription if I prefer one?",
        a: "In most cases, yes. While eScripts are the default, doctors can still issue paper prescriptions if you request one. However, if you're using a telehealth service, paper prescriptions add a logistical step - you'd need to collect the paper script or have it posted, which somewhat defeats the point."
      },
      {
        q: "Do e-prescriptions work with the PBS (Pharmaceutical Benefits Scheme)?",
        a: "Yes. e-Prescriptions are fully compatible with the PBS. You receive the same subsidised pricing regardless of whether your prescription is electronic or paper. The pharmacist applies your PBS entitlements in exactly the same way."
      },
      {
        q: "What happens to my repeats with an e-prescription?",
        a: "Your repeats are stored electronically with your original prescription. Each time you fill a repeat, the pharmacy updates the national system. You can check how many repeats you have left through Active Script List (ASL) if your pharmacy participates, or by asking your pharmacist."
      },
      {
        q: "Can someone else pick up my e-prescription medication?",
        a: "Yes. You can forward the eScript token or QR code to someone else, and they can present it at the pharmacy on your behalf. The pharmacist may ask them to confirm your date of birth or other identifying details. It works the same way as giving someone a paper script to fill for you."
      },
      {
        q: "What is the Active Script List (ASL)?",
        a: "The Active Script List is a national service that stores your electronic prescriptions in one place. If your pharmacy participates in ASL, they can see all your current eScripts without you needing to present a token each time. It's opt-in and makes managing multiple prescriptions significantly easier."
      },
      {
        q: "Are e-prescriptions secure? Can they be hacked or intercepted?",
        a: "e-Prescriptions use encryption and are transmitted through a secure national infrastructure managed by the Australian Digital Health Agency. The token alone isn't enough - it needs to be redeemed through an authorised pharmacy system. In practical terms, eScripts are more secure than paper prescriptions, which can be stolen, copied, or altered."
      },
      {
        q: "Can my e-prescription expire?",
        a: "Yes. Like paper prescriptions, eScripts have an expiry date set by the prescribing doctor or by legislation (typically 12 months for standard medications). Your token will show the expiry date, and the pharmacy system will flag expired prescriptions. If yours expires, you'll need a new prescription from a doctor."
      }
    ],
    guideContent: {
      title: "e-Prescriptions in Australia: What You Need to Know",
      subtitle: "The complete guide to how electronic prescriptions work, their benefits, and the transition from paper.",
      sections: [
        {
          id: "how-it-works",
          title: "How the e-Prescription System Works",
          paragraphs: [
            "Australia's e-prescription system is built on a national infrastructure managed by the Australian Digital Health Agency. When a doctor writes an electronic prescription, it's uploaded to a secure prescription exchange. The patient receives a token - a unique identifier - via SMS, email, or through their health app. This token is the digital equivalent of the paper script.",
            "At the pharmacy, the process is straightforward. The pharmacist either scans the QR code or manually enters the token, which retrieves the prescription from the exchange. They verify the patient's identity, dispense the medication, and mark the prescription as filled. The whole process takes about the same time as a paper script - the difference is everything that happens before you reach the pharmacy counter.",
            "For repeat prescriptions, the system is particularly elegant. Instead of keeping track of multiple paper scripts (and inevitably losing one behind the fridge), all your repeats are stored electronically. Each fill updates the national record, and you always know how many repeats remain."
          ]
        },
        {
          id: "security",
          title: "Security and Privacy of Electronic Prescriptions",
          paragraphs: [
            "e-Prescriptions are transmitted through encrypted channels and stored in secure, government-regulated prescription exchanges. The system was designed with privacy as a core requirement - your prescription data is only accessible to authorised prescribers and pharmacists, not to insurers, employers, or other third parties.",
            "Compared to paper, eScripts are more secure in several meaningful ways. Paper prescriptions can be photocopied, altered, or stolen. eScripts can't be forged - they're cryptographically signed by the prescribing doctor and verified through the national system. If someone intercepts your token, they still need to present identification at the pharmacy to collect the medication.",
            "The Active Script List (ASL) adds another layer of convenience without sacrificing privacy. If you opt in, your pharmacy can see all your current prescriptions in one place, reducing the risk of duplicates, interactions, or expired scripts slipping through the cracks."
          ]
        },
        {
          id: "transition",
          title: "The Transition from Paper to Digital",
          paragraphs: [
            "Australia has been transitioning to e-prescriptions since 2020, and the shift is now well advanced. Virtually all pharmacies accept eScripts, and most GPs issue them by default. Paper prescriptions aren't going away entirely - they're still valid and sometimes necessary - but they're increasingly the exception rather than the rule.",
            "For patients, the transition has been largely seamless. If you've used a QR code to check in somewhere or scan a menu, you already have the technical skills for eScripts. The learning curve is minimal. For older patients or those less comfortable with technology, pharmacists are accustomed to walking people through the process."
          ]
        },
        {
          id: "telehealth-fit",
          title: "Why e-Prescriptions and Telehealth Are Natural Partners",
          paragraphs: [
            "Before e-prescriptions, telehealth had a prescription problem. If a doctor consulted with you remotely but needed to prescribe medication, they had to either post a paper script (slow and unreliable) or fax it to a specific pharmacy (limiting your choice). eScripts solved this completely - the prescription is delivered digitally, instantly, and can be filled anywhere.",
            "This is why telehealth has grown so rapidly alongside e-prescriptions. The two technologies remove the two biggest barriers to remote healthcare: the need to be physically present for the consultation, and the need to physically collect a prescription. Together, they mean a patient in rural NSW can consult a doctor and have their prescription ready at the local pharmacy without leaving home.",
            "For repeat prescriptions in particular, the telehealth-plus-eScript combination is transformative. Instead of booking a GP appointment, waiting days, travelling to the clinic, sitting in the waiting room, and then driving to the pharmacy - you fill in a form, receive your eScript, and walk to your nearest pharmacy. The clinical standard is the same; the logistics are just better."
          ]
        }
      ]
    }
  },
}

// Merge built-in comparisons with competitor comparisons.
// Keys must stay unique across both sources - the competitor file uses
// `instantmed-vs-*` slugs which don't collide with the built-in entries.
const comparisons: Record<string, ComparisonEntry> = {
  ...builtInComparisons,
  ...COMPETITOR_COMPARISONS,
}

// Default keyword set for general (non-competitor) comparison pages.
const DEFAULT_COMPARISON_KEYWORDS = [
  'telehealth vs gp',
  'online doctor comparison',
  'telehealth australia',
  'medical certificate online vs gp',
]

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const comparison = comparisons[slug]
  if (!comparison) return {}

  return {
    title: comparison.title,
    description: comparison.description,
    keywords: comparison.keywords ?? DEFAULT_COMPARISON_KEYWORDS,
    openGraph: {
      title: comparison.title,
      description: comparison.description,
      url: `https://instantmed.com.au/compare/${slug}`,
    },
    alternates: {
      canonical: `https://instantmed.com.au/compare/${slug}`,
    },
  }
}

export async function generateStaticParams() {
  return Object.keys(comparisons).map((slug) => ({ slug }))
}

export default async function ComparisonPage({ params }: PageProps) {
  const { slug } = await params
  const comparison = comparisons[slug]

  if (!comparison) {
    notFound()
  }

  const faqSchemaData = comparison.faqs.map(faq => ({
    question: faq.q,
    answer: faq.a
  }))

  return (
    <>
      <HealthArticleSchema title={comparison.title} description={comparison.description} url={`/compare/${slug}`} />
      <FAQSchema faqs={faqSchemaData} />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Compare", url: "https://instantmed.com.au/compare" },
          { name: comparison.title, url: `https://instantmed.com.au/compare/${slug}` }
        ]}
      />

      <div className="flex min-h-screen flex-col bg-background">
        <Navbar variant="marketing" />
        <ContentPageTracker pageType="compare" slug={slug} />

        <main className="flex-1 pt-20">
          {/* Breadcrumbs */}
          <div className="px-4 pt-6 bg-white dark:bg-card">
            <div className="mx-auto max-w-4xl">
              <PageBreadcrumbs
                links={[
                  { label: "Compare", href: "/compare" },
                  { label: comparison.title }
                ]}
                showHome
              />
            </div>
          </div>

          {/* Hero */}
          <section className="px-4 py-8 sm:py-12 bg-white dark:bg-card border-b border-border dark:border-border">
            <div className="mx-auto max-w-4xl text-center">
              <h1 className="text-3xl sm:text-4xl font-semibold text-foreground mb-4">
                {comparison.title}
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {comparison.heroText}
              </p>
            </div>
          </section>

          {/* Comparison Table */}
          <section className="px-4 py-12">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-2xl font-semibold text-foreground mb-8 text-center">
                Head-to-Head Comparison
              </h2>

              <div className="bg-white dark:bg-card rounded-2xl border border-border dark:border-border overflow-hidden shadow-sm shadow-primary/[0.04] dark:shadow-none">
                {/* Header */}
                <div className="grid grid-cols-3 bg-muted/50 dark:bg-white/[0.06] p-4 border-b border-border dark:border-border">
                  <div className="font-medium text-muted-foreground">Feature</div>
                  <div className="font-semibold text-primary text-center">InstantMed</div>
                  <div className="font-medium text-foreground text-center">{comparison.competitor.name}</div>
                </div>

                {/* Rows */}
                {comparison.comparisonTable.map((row, i) => (
                  <div
                    key={i}
                    className={`grid grid-cols-3 p-4 ${i !== comparison.comparisonTable.length - 1 ? 'border-b border-border/50 dark:border-border' : ''}`}
                  >
                    <div className="text-foreground font-medium">{row.feature}</div>
                    <div className="text-center">
                      {typeof row.instantmed === 'boolean' ? (
                        row.instantmed ? (
                          <CheckCircle2 className="w-5 h-5 text-success mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-muted-foreground/60 mx-auto" />
                        )
                      ) : (
                        <span className={`text-sm ${row.winner === 'instantmed' ? 'text-success font-medium' : 'text-foreground'}`}>
                          {row.instantmed}
                        </span>
                      )}
                    </div>
                    <div className="text-center">
                      {typeof row.competitor === 'boolean' ? (
                        row.competitor ? (
                          <CheckCircle2 className="w-5 h-5 text-success mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-muted-foreground/60 mx-auto" />
                        )
                      ) : (
                        <span className={`text-sm ${row.winner === 'competitor' ? 'text-success font-medium' : 'text-foreground'}`}>
                          {row.competitor}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* When to Choose Each */}
          <section className="px-4 py-12 bg-muted/50 dark:bg-white/[0.06]">
            <div className="mx-auto max-w-4xl">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Choose InstantMed */}
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 shadow-sm shadow-primary/[0.04] dark:shadow-none">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-primary" />
                    Choose InstantMed When
                  </h3>
                  <ul className="space-y-3">
                    {comparison.whenInstantMedBetter.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-foreground">
                        <CheckCircle2 className="w-4 h-4 text-primary mt-1 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Button asChild className="mt-6 w-full rounded-full">
                    <Link href="/request">
                      Try InstantMed
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Link>
                  </Button>
                </div>

                {/* Choose Competitor */}
                <div className="bg-white dark:bg-card border border-border dark:border-border rounded-2xl p-6 shadow-sm shadow-primary/[0.04] dark:shadow-none">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                    Choose {comparison.competitor.name} When
                  </h3>
                  <ul className="space-y-3">
                    {comparison.whenCompetitorBetter.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-foreground">
                        <CheckCircle2 className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Verdict */}
          <section className="px-4 py-12">
            <div className="mx-auto max-w-3xl">
              <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-2xl p-8 shadow-sm shadow-primary/[0.04] dark:shadow-none">
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  The Bottom Line
                </h2>
                <p className="text-foreground/80 dark:text-foreground/70 leading-relaxed">
                  {comparison.verdict}
                </p>
              </div>
            </div>
          </section>

          {/* Guide Section (E-E-A-T) */}
          <DataDrivenGuideSection
            ariaLabel="comparison guide"
            title={comparison.guideContent.title}
            subtitle={comparison.guideContent.subtitle}
            sections={comparison.guideContent.sections}
          />

          {/* FAQ */}
          <section className="px-4 py-12 bg-muted/50 dark:bg-white/[0.06]">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-semibold text-foreground mb-8 text-center">
                Frequently Asked Questions
              </h2>
              <div className="space-y-4">
                {comparison.faqs.map((faq, i) => (
                  <div key={i} className="bg-white dark:bg-card rounded-xl p-6 shadow-sm shadow-primary/[0.04] dark:shadow-none">
                    <h3 className="font-semibold text-foreground mb-2">{faq.q}</h3>
                    <p className="text-muted-foreground">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Related Reading - cross-links to content hubs */}
          <section className="px-4 py-8">
            <div className="mx-auto max-w-3xl">
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
                <span className="text-muted-foreground font-medium">Related reading:</span>
                <Link href="/guides/telehealth-guide-australia" className="text-primary hover:underline">
                  Telehealth guide
                </Link>
                <Link href="/blog/telehealth-vs-gp-australia" className="text-primary hover:underline">
                  Telehealth vs GP
                </Link>
                <Link href="/conditions" className="text-primary hover:underline">
                  Health conditions
                </Link>
                <Link href="/symptoms" className="text-primary hover:underline">
                  Symptom checker
                </Link>
                <Link href="/blog/best-online-doctor-australia-comparison" className="text-primary hover:underline">
                  Best online doctors (2026)
                </Link>
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="px-4 py-16 bg-primary/5">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                Ready to try telehealth?
              </h2>
              <p className="text-muted-foreground mb-8">
                See why Australians choose InstantMed for their healthcare needs.
              </p>
              <Button asChild size="lg" className="h-14 px-10 rounded-full shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all">
                <Link href="/request">
                  Get started
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <span>AHPRA registered</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>Under 1 hour</span>
                </div>
              </div>
            </div>
          </section>

          {/* Medical Disclaimer */}
          <MedicalDisclaimer reviewedDate="2026-03" />
        </main>

        <Footer />
      </div>
    </>
  )
}
