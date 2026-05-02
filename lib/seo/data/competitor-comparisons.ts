/**
 * Competitor comparison data - InstantMed vs other AU telehealth services.
 *
 * These entries are consumed by `app/compare/[slug]/page.tsx` and rendered
 * through the shared comparison page template.
 *
 * Editorial rules:
 * - Stay factual. Only use publicly known information about competitors.
 * - Never defame. Frame each competitor as a legitimate choice for a segment.
 * - Never fabricate pricing - if unsure, use "Similar pricing" or "Varies".
 * - Each entry must have unique content (no copy/paste between pages).
 */

import { PRICING_DISPLAY } from "@/lib/constants"

export interface ComparisonRow {
  feature: string
  instantmed: string | boolean
  competitor: string | boolean
  winner?: "instantmed" | "competitor" | "tie"
}

export interface GuideSection {
  id: string
  title: string
  paragraphs: string[]
}

export interface ComparisonEntry {
  title: string
  slug: string
  description: string
  /** Per-page keywords for SEO - distinct from other comparison pages. */
  keywords?: string[]
  competitor: {
    name: string
    type: "gp" | "competitor" | "alternative"
  }
  heroText: string
  comparisonTable: ComparisonRow[]
  whenInstantMedBetter: string[]
  whenCompetitorBetter: string[]
  verdict: string
  faqs: Array<{ q: string; a: string }>
  guideContent: {
    title: string
    subtitle: string
    sections: GuideSection[]
  }
}

// =============================================================================
// InstantMed vs Hub Health
// =============================================================================

const instantmedVsHubHealth: ComparisonEntry = {
  title: "InstantMed vs Hub Health: Which Telehealth Service Is Right for You?",
  slug: "instantmed-vs-hub-health",
  description:
    "Compare InstantMed and Hub Health across pricing, service scope, and membership models. Pay-per-request telehealth versus subscription-based care in Australia.",
  keywords: [
    "instantmed vs hub health",
    "hub health alternative",
    "hub.health comparison",
    "telehealth membership vs pay per use",
    "australian telehealth subscription",
  ],
  competitor: { name: "Hub Health", type: "competitor" },
  heroText:
    "Hub Health and InstantMed both offer legitimate telehealth care with AHPRA-registered doctors, but they're built for different kinds of patients. Hub Health runs a membership model built around ongoing treatment programs. InstantMed is pay-per-request with no subscription. Here's how the two actually compare.",
  comparisonTable: [
    { feature: "Pricing model", instantmed: "Pay-per-request, no subscription", competitor: "Membership-based programs", winner: "tie" },
    { feature: "Medical certificate available", instantmed: PRICING_DISPLAY.FROM_MED_CERT, competitor: "Not a core focus", winner: "instantmed" },
    { feature: "Repeat prescription", instantmed: PRICING_DISPLAY.REPEAT_SCRIPT, competitor: "Included in program fees", winner: "tie" },
    { feature: "Hair loss treatment", instantmed: PRICING_DISPLAY.HAIR_LOSS, competitor: "Program-based, ongoing", winner: "tie" },
    { feature: "Weight management", instantmed: PRICING_DISPLAY.WEIGHT_LOSS, competitor: "Subscription program", winner: "tie" },
    { feature: "Ongoing nurse/coach support", instantmed: "Doctor messaging per request", competitor: "Program care team", winner: "competitor" },
    { feature: "Commitment required", instantmed: "None - one-off", competitor: "Ongoing subscription", winner: "instantmed" },
    { feature: "Median doctor response", instantmed: "~20 min for med certs", competitor: "Varies by program", winner: "instantmed" },
    { feature: "Cancel anytime", instantmed: "No subscription to cancel", competitor: "Yes, via account", winner: "tie" },
    { feature: "AHPRA-registered doctors", instantmed: true, competitor: true, winner: "tie" },
    { feature: "Refund on declined request", instantmed: "100% on med cert/Rx, 50% on consults", competitor: "Varies by program", winner: "instantmed" },
  ],
  whenInstantMedBetter: [
    "You need a single service - a medical certificate, a repeat script, or a one-off consult",
    "You don't want another monthly subscription on your card",
    "You want an upfront, transparent price for the thing you need today",
    "You need a medical certificate quickly (often in about 20 minutes)",
    "You prefer per-request care over an ongoing program structure",
  ],
  whenCompetitorBetter: [
    "You want a structured, long-running treatment program (hair loss, skin, weight)",
    "You value a care team and regular follow-ups baked into the price",
    "You prefer predictable monthly billing instead of paying per request",
    "You're specifically looking for a membership-style telehealth brand",
  ],
  verdict:
    "Hub Health is built for patients who want an ongoing treatment program with a care team. InstantMed is built for patients who want a single clinical outcome - a certificate, a script, a consult - without signing up for anything. If your needs are episodic, InstantMed's pay-per-request model is usually simpler and cheaper. If you're committed to a long-running program like weight or hair loss, Hub Health's membership may suit you better.",
  faqs: [
    {
      q: "Is InstantMed cheaper than Hub Health?",
      a: `It depends on how often you need care. For a single request, InstantMed's pay-per-request pricing - ${PRICING_DISPLAY.FROM_MED_CERT} for a medical certificate, ${PRICING_DISPLAY.REPEAT_SCRIPT} for a repeat script - is usually cheaper than a membership. For ongoing treatment programs where you need multiple touchpoints a month, a membership can work out similar or better. Compare the total monthly spend, not just the headline number.`,
    },
    {
      q: "Can I switch from Hub Health to InstantMed?",
      a: "Yes. There's nothing stopping you from using both, or moving between them. If you're currently on a Hub Health program, cancel through their account portal when you're ready. InstantMed requires no sign-up beyond creating an account at checkout - you only pay for what you use.",
    },
    {
      q: "Does InstantMed offer the same treatment programs as Hub Health?",
      a: "InstantMed offers one-off consults for hair loss, weight management, and men's and women's health. Hub Health's model is more structured around ongoing programs with a care team. If you want a single doctor review and an eScript, InstantMed will handle that. If you want a multi-month coached program, Hub Health is purpose-built for that.",
    },
    {
      q: "Are both services legitimate and AHPRA-registered?",
      a: "Yes. Both InstantMed and Hub Health use AHPRA-registered Australian doctors and operate under the same regulatory framework. You can verify any doctor's registration on the AHPRA public register. Both services comply with Australian Privacy Act requirements for handling health information.",
    },
    {
      q: "What happens if my request is declined on InstantMed?",
      a: "Medical certificate and prescription requests that a doctor declines receive a 100% refund. Consult requests that are declined receive a 50% refund - the doctor has still reviewed your case and written a clinical note. Hub Health's refund policy varies by program; check their terms before subscribing.",
    },
    {
      q: "Do I have to commit to anything with InstantMed?",
      a: "No. InstantMed has no subscription and no ongoing commitment. You pay for the service you need, once. The only recurring option is the repeat prescription subscription ($19.95/mo) for patients who specifically want automated monthly repeats - and that's opt-in at checkout, not a default.",
    },
    {
      q: "Which service is faster for a medical certificate?",
      a: "InstantMed is optimised for fast medical certificate turnaround - most requests are reviewed in about 20 minutes, 24/7. Hub Health isn't primarily built around same-day medical certificates, so InstantMed will usually be the faster option if that's what you need.",
    },
    {
      q: "Can I use a Medicare rebate on either service?",
      a: "Both services operate as private telehealth without routinely billing Medicare for async consultations. If Medicare rebates are important to you, a bulk-billed GP (in person or telehealth) is the better fit. Both private services are paid out-of-pocket.",
    },
  ],
  guideContent: {
    title: "How to Choose Between InstantMed and Hub Health",
    subtitle: "Two legitimate telehealth services, two very different business models. Here's how to think about the decision.",
    sections: [
      {
        id: "models",
        title: "Subscription vs Pay-Per-Request: The Core Difference",
        paragraphs: [
          "The biggest difference between these two services isn't clinical quality - it's business model. Hub Health runs structured, ongoing treatment programs. You join a program, pay a recurring fee, and receive regular clinical touchpoints, often with a dedicated care team alongside the doctor. It's designed for conditions where continuity of care genuinely matters - weight management, skin, hair - where a single consult isn't usually enough.",
          "InstantMed runs on the opposite philosophy: you pay once for the specific thing you need, and when it's done, nothing recurs. That maps well to episodic needs - a medical certificate when you're unwell, a repeat script for a medication you already take, a one-off consult about a new symptom. There's no program to join and no monthly bill.",
          "Neither model is objectively better. They serve different use cases. The right question isn't 'which service is best' - it's 'what kind of care do I actually need, and which model fits that shape?'",
        ],
      },
      {
        id: "cost",
        title: "Working Out the True Cost",
        paragraphs: [
          "For a single request, pay-per-request is almost always cheaper. If you need one medical certificate this year, paying InstantMed's $19.95 is hard to beat. The membership model only starts to look better when you're using multiple services a month and the per-service value exceeds the membership fee.",
          "For treatment programs, the calculation is different. A weight management program typically involves multiple doctor reviews, medication, coaching, and support over months. If Hub Health bundles those into one monthly fee and you'd be paying for each of those components separately elsewhere, the membership can win on total cost - even though the headline number is higher.",
          "The honest answer: do the maths on your actual usage, not a hypothetical heavy user. Most Australians use telehealth episodically, not continuously. For that profile, pay-per-request usually wins.",
        ],
      },
      {
        id: "who-for",
        title: "Who Each Service Is Actually Designed For",
        paragraphs: [
          "Hub Health's target patient is someone committing to an ongoing treatment journey - often in hair loss, weight management, or skin care - where the clinical work extends over months and benefits from a dedicated care team. If that's what you're looking for, a structured program service makes sense.",
          "InstantMed's target patient is someone who needs a specific clinical outcome and wants to get on with their day. Most of our volume is medical certificates, repeat scripts, and quick consults - services that are well-suited to async telehealth and don't require an ongoing relationship. We deliberately don't try to be a long-running program provider.",
          "These are complementary, not directly competing. It's perfectly reasonable to use Hub Health for a long-running program and InstantMed for a same-day medical certificate in the same month. Different tools, different jobs.",
        ],
      },
    ],
  },
}

// =============================================================================
// InstantMed vs Doctors on Demand
// =============================================================================

const instantmedVsDoctorsOnDemand: ComparisonEntry = {
  title: "InstantMed vs Doctors on Demand: Async Certificates or Video Consults?",
  slug: "instantmed-vs-doctors-on-demand",
  description:
    "Compare InstantMed and Doctors on Demand. Async, form-based telehealth versus video consultations - which one suits your needs, budget, and timeline.",
  keywords: [
    "instantmed vs doctors on demand",
    "doctors on demand alternative",
    "async telehealth vs video consult",
    "online doctor video consult australia",
    "telehealth medical certificate australia",
  ],
  competitor: { name: "Doctors on Demand", type: "competitor" },
  heroText:
    "Doctors on Demand is a well-established Australian telehealth service built around video consultations. InstantMed is an async, form-based service optimised for speed. Both use AHPRA-registered doctors - the difference is how, when, and how much you pay for the consult.",
  comparisonTable: [
    { feature: "Consultation format", instantmed: "Async form + doctor messaging", competitor: "Video consultation", winner: "tie" },
    { feature: "Need to book a time slot", instantmed: "No - submit anytime", competitor: "Yes, scheduled", winner: "instantmed" },
    { feature: "Medical certificate price", instantmed: PRICING_DISPLAY.FROM_MED_CERT, competitor: "Higher (video consult)", winner: "instantmed" },
    { feature: "General consult price", instantmed: PRICING_DISPLAY.FROM_CONSULT, competitor: "Premium video pricing", winner: "instantmed" },
    { feature: "Prescription available", instantmed: true, competitor: true, winner: "tie" },
    { feature: "Face-to-face with doctor", instantmed: "No - written exchange", competitor: "Yes - video", winner: "competitor" },
    { feature: "After-hours availability", instantmed: "24/7 for med certs", competitor: "Extended hours", winner: "instantmed" },
    { feature: "Suitable for complex conditions", instantmed: "Simple to moderate", competitor: "Can handle wider scope", winner: "competitor" },
    { feature: "Requires working camera/mic", instantmed: "No - any device", competitor: "Yes", winner: "instantmed" },
    { feature: "AHPRA-registered doctors", instantmed: true, competitor: true, winner: "tie" },
    { feature: "Refund guarantee", instantmed: "100% on med cert/Rx declines, 50% on consults", competitor: "Varies", winner: "instantmed" },
  ],
  whenInstantMedBetter: [
    "You want a medical certificate without scheduling a video call",
    "You're looking for the lowest-cost path to a valid Australian medical certificate",
    "You don't have a quiet, private space for a video consultation right now",
    "Your issue is straightforward and doesn't require face-to-face assessment",
    "You want 24/7 availability for medical certificates",
    "You feel more comfortable describing symptoms in writing than on camera",
  ],
  whenCompetitorBetter: [
    "You want to see and speak with a doctor face-to-face over video",
    "Your condition benefits from real-time conversation and visual assessment",
    "You have a more complex issue that needs back-and-forth discussion",
    "You specifically prefer scheduled video consults to async exchanges",
    "You're already comfortable and set up for telehealth video calls",
  ],
  verdict:
    "Doctors on Demand is a strong choice if you want a video-based doctor consultation that feels closer to an in-person visit. InstantMed is the better choice if you want speed, a lower price, and don't need a face-to-face conversation for what's essentially a straightforward request. For a medical certificate or a repeat script, video is overkill - async wins on both time and cost. For nuanced discussions, video has genuine clinical advantages.",
  faqs: [
    {
      q: "Why is InstantMed cheaper than Doctors on Demand?",
      a: "Video consultations require scheduled doctor time - a 15-minute slot is reserved for you whether you use all of it or not. Async consultations let a doctor review multiple requests efficiently, which lowers the cost per patient. That efficiency is passed on in the price. It's not about cutting clinical corners; it's about a different workflow for different kinds of care.",
    },
    {
      q: "Is an async medical certificate as valid as one from a video consult?",
      a: "Yes. The Fair Work Act requires a medical certificate from a registered health practitioner. An AHPRA-registered doctor issuing a certificate based on an async clinical assessment is legally identical to one issuing it after a video consult. Your employer can't reject a valid certificate based on the consultation format.",
    },
    {
      q: "When should I choose a video consult over an async request?",
      a: "Video makes sense when your issue benefits from real-time discussion - new symptoms you're worried about, something that needs visual assessment, a condition you haven't been able to explain in writing. For repeat scripts, medical certificates, and straightforward cases, async is faster and cheaper without clinical downside.",
    },
    {
      q: "Can I switch from Doctors on Demand to InstantMed?",
      a: "Yes. Both services are standalone - you don't need to cancel anything or transfer records to try the other. Your clinical records stay with the service that created them, but you can access both services independently whenever you need them.",
    },
    {
      q: "Does InstantMed offer video consultations if I want one?",
      a: "Currently InstantMed is async-first by design. If you specifically want a video consultation with a doctor, Doctors on Demand or a similar video-first service will suit you better. For the services async can handle well - certificates, scripts, common consults - we focus on doing that well rather than offering every format.",
    },
    {
      q: "Which is faster: InstantMed or Doctors on Demand?",
      a: "For medical certificates, InstantMed is usually faster - reviews typically happen in around 20 minutes and the service runs 24/7. For scheduled video consults, Doctors on Demand is fast once your slot comes up, but you may wait hours or days for the next available appointment depending on demand.",
    },
    {
      q: "Can both services prescribe the same medications?",
      a: "Both services can prescribe most common medications through Australia's eScript system. Both follow the same prescribing rules set by the TGA and state authorities. Controlled substances (Schedule 8) generally require an in-person assessment regardless of the telehealth service.",
    },
    {
      q: "Is my health information more secure with one over the other?",
      a: "Both services are bound by the Australian Privacy Act and the Australian Privacy Principles for health information. Both use encryption in transit and at rest. The specific data handling practices are in each service's privacy policy, which you should read before using either.",
    },
  ],
  guideContent: {
    title: "Async vs Video Telehealth: Choosing the Right Format",
    subtitle: "Both formats have legitimate clinical uses. The right choice depends on your condition, your preferences, and your budget.",
    sections: [
      {
        id: "format-differences",
        title: "How Async and Video Consultations Actually Differ",
        paragraphs: [
          "An async consultation works like a structured medical history - you fill in a form with your symptoms, relevant background, and what you're asking for. A doctor reviews it on their own time, often within an hour for common services. If they need clarification, they message you. If they're satisfied, they approve and issue whatever you need - a certificate, a script, a referral.",
          "A video consultation is closer to the experience of an in-person GP visit. You book a slot, a doctor joins a video call at the scheduled time, and you have a live conversation. The doctor can ask follow-up questions in real time, observe you, and guide the conversation dynamically. It takes longer - typically 10 to 20 minutes - and the doctor's time is dedicated to you for that period.",
          "Neither format is universally better. Async is efficient; video is interactive. The match depends on what you're trying to get done.",
        ],
      },
      {
        id: "clinical-scope",
        title: "Which Format Suits Which Condition",
        paragraphs: [
          "Async telehealth handles structured, rule-based care very well. Medical certificates, repeat prescriptions, common infections with clear presentations, and follow-ups for established conditions all fit the async format. The clinical decisions in these cases rely on history and documented symptoms more than live observation - and async lets the doctor focus on the record without the constraints of a live call.",
          "Video telehealth has an edge when you genuinely need real-time interaction. A new symptom you're trying to describe but can't put into words, a condition where the doctor wants to observe your skin tone or breathing, a consultation where you have many questions and want to feel heard. These cases benefit from live conversation.",
          "A useful heuristic: if you could send the doctor a detailed email and get a useful answer, async is fine. If you'd find yourself saying 'it's easier if I just show you,' video is probably the better fit.",
        ],
      },
      {
        id: "cost-time",
        title: "Cost and Time Trade-Offs",
        paragraphs: [
          "Video consultations cost more because they require dedicated doctor time. Async consultations spread that doctor time across more patients per hour, which lowers the per-patient cost. For services where the clinical work is genuinely similar - like a repeat prescription review - paying the premium for video doesn't give you better care, just a different delivery format.",
          "The time trade-off runs the other direction. Async services can be submitted anytime and reviewed whenever the doctor gets to them - which is often very quick, but not guaranteed to a specific minute. Video consultations give you a fixed appointment time, which is predictable but requires you to be available then.",
          "For most Australians, the right approach is to pick the tool that fits the job. Pay for video when real-time interaction matters; use async when it doesn't. Both are legitimate telehealth models, and both deliver clinically valid care.",
        ],
      },
    ],
  },
}

// =============================================================================
// InstantMed vs Cleanbill
// =============================================================================

const instantmedVsCleanbill: ComparisonEntry = {
  title: "InstantMed vs Cleanbill: Finding a Bulk-Billed GP or Using Telehealth",
  slug: "instantmed-vs-cleanbill",
  description:
    "Compare InstantMed's telehealth service with Cleanbill's bulk-billed GP search. Two different tools solving two different problems in Australian healthcare.",
  keywords: [
    "instantmed vs cleanbill",
    "cleanbill alternative",
    "bulk billed gp vs telehealth",
    "find bulk billed gp australia",
    "telehealth when no bulk billed gp",
  ],
  competitor: { name: "Cleanbill", type: "alternative" },
  heroText:
    "Cleanbill and InstantMed aren't really competitors - they solve different problems. Cleanbill helps you find a bulk-billed GP near you. InstantMed is a telehealth service you can use when an in-person GP visit isn't practical or available. Many Australians use both.",
  comparisonTable: [
    { feature: "What the service does", instantmed: "Provides telehealth consultations", competitor: "Searches for bulk-billing GPs", winner: "tie" },
    { feature: "Cost to use", instantmed: PRICING_DISPLAY.FROM_MED_CERT, competitor: "Free directory", winner: "competitor" },
    { feature: "Care provided directly", instantmed: true, competitor: false, winner: "instantmed" },
    { feature: "Need to leave home", instantmed: "No", competitor: "Yes - book and attend clinic", winner: "instantmed" },
    { feature: "Medicare rebate", instantmed: "Private - no rebate", competitor: "Bulk billed = no out-of-pocket", winner: "competitor" },
    { feature: "Medical certificate turnaround", instantmed: "~20 min, 24/7", competitor: "Depends on appointment availability", winner: "instantmed" },
    { feature: "Physical examination", instantmed: "Not available", competitor: "Available at the clinic", winner: "competitor" },
    { feature: "Works after hours", instantmed: true, competitor: "Limited to clinic hours", winner: "instantmed" },
    { feature: "Complex or ongoing care", instantmed: "Not the primary use case", competitor: "Regular GP is ideal for this", winner: "competitor" },
    { feature: "AHPRA-registered doctors", instantmed: true, competitor: true, winner: "tie" },
  ],
  whenInstantMedBetter: [
    "No bulk-billed GP has availability in a reasonable timeframe",
    "You need a medical certificate quickly and can't wait for a GP appointment",
    "You're unwell and would rather not travel to a clinic",
    "You need care outside normal GP hours (nights, weekends, public holidays)",
    "You're in a rural area where bulk-billed GPs are scarce",
    "Your issue is straightforward and doesn't need an in-person exam",
  ],
  whenCompetitorBetter: [
    "Cost is the primary factor and you're happy to wait for a free appointment",
    "You need a physical examination, procedure, or vaccination",
    "You want to build an ongoing relationship with a regular GP",
    "You have a complex or chronic condition that benefits from continuity of care",
    "You're planning ahead and can fit a clinic appointment into your schedule",
  ],
  verdict:
    "Cleanbill helps you find free GP care when it exists nearby. InstantMed helps when it doesn't - or when you need something quickly and can't wait for a clinic slot. These tools complement each other rather than competing. For ongoing care, having a regular GP (ideally bulk-billed) is the gold standard. For urgent or episodic needs that don't require physical examination, telehealth fills the gaps that in-person care leaves open.",
  faqs: [
    {
      q: "Is Cleanbill a telehealth service?",
      a: "No. Cleanbill is a search and discovery tool that helps Australians find GPs who still bulk bill. They don't provide medical care themselves - they point you at clinics that do. InstantMed, by contrast, is a telehealth provider that offers direct clinical services.",
    },
    {
      q: "If there's a bulk-billed GP near me, should I use InstantMed at all?",
      a: "If you have a bulk-billed GP who can see you when you need them, they're usually the best choice - especially for complex or ongoing care. InstantMed is a good fit when the bulk-billed GP is fully booked, you're unwell outside clinic hours, or you need something like a medical certificate faster than the next available appointment allows.",
    },
    {
      q: "Why is it so hard to find a bulk-billed GP in Australia?",
      a: "Bulk-billing rates have declined over the past decade, particularly in metro areas. Medicare rebates haven't kept pace with the cost of running a practice, which has forced many GPs to charge a gap fee. This is the gap that Cleanbill helps Australians navigate. For people who can't find bulk-billed care in a reasonable timeframe, private telehealth services like InstantMed provide an alternative.",
    },
    {
      q: "Do I still need a regular GP if I use telehealth?",
      a: "Yes, ideally. A regular GP who knows your medical history provides continuity of care that telehealth can't replicate. For chronic conditions, preventive health, and complex medical issues, a long-term GP relationship is genuinely valuable. Use telehealth as a complement to your GP care, not a replacement for it.",
    },
    {
      q: "Can InstantMed issue the same medical certificates a bulk-billed GP would?",
      a: `Yes. Medical certificates from InstantMed are issued by AHPRA-registered Australian doctors and are legally identical to certificates from an in-person GP visit. The Fair Work Act doesn't distinguish between certificates from telehealth and those from clinic visits. The main trade-off is cost: InstantMed charges ${PRICING_DISPLAY.FROM_MED_CERT}; a bulk-billed GP is free but may have longer wait times.`,
    },
    {
      q: "Is it worth paying for telehealth when bulk billing is free?",
      a: "It depends on the cost of waiting. If your bulk-billed GP can see you today and you have the time, bulk billing is the cheaper option. If the next available appointment is in a week and you need a certificate for tomorrow, paying $20 for telehealth is often a reasonable trade-off. Neither choice is wrong - they serve different urgencies.",
    },
    {
      q: "Does InstantMed help me find a bulk-billing GP?",
      a: "No - that's what Cleanbill is for. InstantMed focuses on providing telehealth services directly. If you're looking for an in-person bulk-billing GP, Cleanbill's directory is a useful resource, as is the HealthDirect service finder.",
    },
    {
      q: "Can I get a prescription through both services?",
      a: "InstantMed can prescribe directly through AHPRA-registered doctors on our platform, delivered as an eScript. Cleanbill isn't a prescriber - you'd book an appointment with a GP found through their directory, and that GP would prescribe. Both pathways result in a valid Australian prescription.",
    },
  ],
  guideContent: {
    title: "Bulk-Billed GPs and Telehealth: How They Fit Together",
    subtitle: "Two different tools for two different problems in Australian primary care - and how to choose between them.",
    sections: [
      {
        id: "different-problems",
        title: "The Two Different Problems Each Solves",
        paragraphs: [
          "Cleanbill exists because finding a bulk-billed GP in Australia has become genuinely hard. It's a directory and discovery tool - you tell it where you are, and it tells you which clinics still bulk bill and who might be taking new patients. That's a valuable problem to solve, and the service has filled a real gap in the healthcare market.",
          "InstantMed exists because even when bulk-billed GPs are available, they're often fully booked for days or weeks ahead. If you need a medical certificate tomorrow, a repeat script today, or a consultation outside clinic hours, a directory doesn't help you - you need a doctor now. That's where telehealth comes in.",
          "Neither tool makes the other redundant. Cleanbill helps with the long game of finding affordable regular care. Telehealth helps with the short game of getting care right now when you need it. The same patient can reasonably use both in the same month.",
        ],
      },
      {
        id: "when-bulk-billing-works",
        title: "When Bulk-Billed Care Is Still the Better Choice",
        paragraphs: [
          "If you have time to wait and cost matters, a bulk-billed GP is almost always the right call. You pay nothing at the point of service, you get a physical examination if you need one, and your GP can handle anything from a certificate to a complex workup in the same visit. For ongoing health concerns, preventive care, and anything that benefits from continuity, nothing beats a regular GP who knows you.",
          "The practical challenge is access. In metro Sydney, Melbourne, and Brisbane, finding a bulk-billing GP taking new patients often means calling multiple clinics and accepting a wait of 1-2 weeks. Cleanbill speeds up the search; it doesn't speed up the appointments themselves.",
          "For people who can't find bulk-billed availability - or who need care outside clinic hours - the choice isn't 'bulk billing vs telehealth.' It's 'telehealth vs waiting.' Framed that way, paying for a fast telehealth consultation is often a rational trade-off.",
        ],
      },
      {
        id: "gap-filling",
        title: "How Telehealth Fills the Gaps",
        paragraphs: [
          "Telehealth isn't a replacement for bulk-billed primary care - and any honest telehealth provider will tell you that. What it is, is a useful gap-filler. When your regular GP is fully booked, when it's 9pm on a Sunday, when you're too unwell to travel, or when you need a certificate for a shift starting in six hours, telehealth gives you a path to care that doesn't require waiting for the clinic to open.",
          "The cost matters. Paying $19.95 for a same-day medical certificate is a choice that makes sense when the alternative is missing work, losing a shift, or driving an hour to an after-hours clinic. It doesn't always make sense - if your bulk-billed GP can see you tomorrow, the free option is obviously better. The decision depends on urgency.",
          "Used well, telehealth and bulk-billed GP care complement each other. Use your GP for continuity, complex issues, and anything that needs physical examination. Use telehealth for the episodic, time-sensitive needs that a traditional clinic schedule can't absorb.",
        ],
      },
    ],
  },
}

// =============================================================================
// InstantMed vs Qoctor
// =============================================================================

const instantmedVsQoctor: ComparisonEntry = {
  title: "InstantMed vs Qoctor: Two Australian Telehealth Services Compared",
  slug: "instantmed-vs-qoctor",
  description:
    "Compare InstantMed and Qoctor, two established Australian telehealth services offering medical certificates, scripts, and consultations. See how they line up.",
  keywords: [
    "instantmed vs qoctor",
    "qoctor alternative",
    "qoctor comparison",
    "australian telehealth services",
    "online medical certificate australia",
  ],
  competitor: { name: "Qoctor", type: "competitor" },
  heroText:
    "Qoctor is one of the longer-running Australian telehealth services, with a similar core offering to InstantMed - medical certificates, online scripts, and simple consultations. Both use AHPRA-registered doctors. The differences come down to workflow, pricing transparency, and specific service details.",
  comparisonTable: [
    { feature: "AHPRA-registered doctors", instantmed: true, competitor: true, winner: "tie" },
    { feature: "Medical certificate", instantmed: PRICING_DISPLAY.FROM_MED_CERT, competitor: "Similar pricing", winner: "tie" },
    { feature: "Repeat prescription", instantmed: PRICING_DISPLAY.REPEAT_SCRIPT, competitor: "Similar pricing", winner: "tie" },
    { feature: "General consultation", instantmed: PRICING_DISPLAY.FROM_CONSULT, competitor: "Similar pricing", winner: "tie" },
    { feature: "Async form-based workflow", instantmed: true, competitor: true, winner: "tie" },
    { feature: "Doctor messaging on request", instantmed: true, competitor: "Varies", winner: "instantmed" },
    { feature: "24/7 medical certificates", instantmed: true, competitor: "Extended hours", winner: "instantmed" },
    { feature: "Priority review option", instantmed: `Express Review +${PRICING_DISPLAY.PRIORITY_FEE}`, competitor: "Not advertised", winner: "instantmed" },
    { feature: "Refund on declined request", instantmed: "100% on med cert/Rx, 50% on consults", competitor: "Refund policy varies", winner: "instantmed" },
    { feature: "Repeat prescription subscription", instantmed: "$19.95/mo optional", competitor: "Per-request only", winner: "tie" },
  ],
  whenInstantMedBetter: [
    "You want a clearly documented refund guarantee (100% on med cert/Rx declines)",
    "You need 24/7 availability for medical certificates",
    "You want the option to fast-track your review for a small add-on fee",
    "You prefer direct doctor messaging when clinical questions come up",
    "You're looking for an optional monthly subscription for ongoing repeat scripts",
  ],
  whenCompetitorBetter: [
    "You've used Qoctor before, trust their process, and want continuity",
    "Qoctor's specific workflow suits your preferences better",
    "You want to compare two services and use whichever has better availability right now",
    "You have an existing relationship with a specific doctor on their platform",
  ],
  verdict:
    "Qoctor and InstantMed are genuinely similar services serving similar patients. Both are legitimate, both use AHPRA-registered doctors, and both charge comparable prices. InstantMed's differentiators are the explicit refund policy, 24/7 medical certificate availability, and the Express Review option. If you're already using Qoctor and it's working, there's no strong reason to switch. If you're choosing for the first time and value those specific features, InstantMed will suit you better.",
  faqs: [
    {
      q: "Are InstantMed and Qoctor essentially the same service?",
      a: "They're similar in category - both are async, form-based Australian telehealth services using AHPRA-registered doctors for medical certificates, scripts, and consultations. They differ in workflow details, refund policies, hours, and specific features. The core clinical value proposition is genuinely comparable.",
    },
    {
      q: "Is one service safer or more regulated than the other?",
      a: "No. Both services operate under the same Australian regulatory framework: AHPRA registration for doctors, TGA prescribing rules, Australian Privacy Act for data handling, and Medical Board of Australia telehealth guidelines. Regulatory safety is equivalent.",
    },
    {
      q: "How do the prices actually compare?",
      a: `Both services charge comparable prices for the same core offerings. InstantMed's medical certificates start at ${PRICING_DISPLAY.FROM_MED_CERT}, repeat scripts at ${PRICING_DISPLAY.REPEAT_SCRIPT}, and general consults at ${PRICING_DISPLAY.FROM_CONSULT}. Qoctor's pricing is in a similar range. Check both sites for the specific service you need - small differences may apply depending on the request type.`,
    },
    {
      q: "Can I switch between InstantMed and Qoctor?",
      a: "Yes. Neither service locks you into an ongoing relationship. You can use one for one request and the other for the next. Your clinical records stay with the service that created them - if you want unified records, you'd need to ask each service for a summary to share with your regular GP.",
    },
    {
      q: "Which service is faster for a medical certificate?",
      a: "InstantMed targets around 20 minutes for most medical certificate reviews and runs 24/7. Qoctor's typical turnaround is similar during their operating hours. For out-of-hours requests, InstantMed's 24/7 availability is a tangible difference - if you submit at 2am, you'll get a response faster with a 24/7 service than one that's business-hours only.",
    },
    {
      q: "Do both services let me message the doctor if they have questions?",
      a: "InstantMed supports direct doctor-patient messaging within a request, so you can clarify symptoms or respond to questions before a decision is made. Qoctor's messaging functionality varies. If back-and-forth communication matters to you, check whichever service you're considering to see how they handle it.",
    },
    {
      q: "What happens if my request is declined?",
      a: "InstantMed refunds 100% of the fee if a medical certificate or prescription request is declined, and 50% if a consult request is declined (the doctor has still reviewed your case and produced a clinical note). Qoctor's refund policy should be checked directly on their terms - different services handle this differently.",
    },
    {
      q: "Which service should I choose if I've never used telehealth before?",
      a: "Either is a reasonable starting point for simple requests like a medical certificate or repeat script. Read each service's refund policy, check their hours for the service you need, and go with whichever's workflow looks cleaner to you. Both are legitimate - this isn't a case where one service is obviously 'better' across the board.",
    },
  ],
  guideContent: {
    title: "Choosing Between Established Australian Telehealth Services",
    subtitle: "When multiple services offer similar core products, the details determine which one fits your situation best.",
    sections: [
      {
        id: "similar-but-different",
        title: "Why Similar Services Aren't Identical",
        paragraphs: [
          "On the surface, InstantMed and Qoctor look alike - both are Australian telehealth services, both offer medical certificates and repeat scripts at comparable prices, and both use AHPRA-registered doctors. For a lot of patients, either would do the job. That similarity isn't a problem; it reflects a healthy market where legitimate services compete on execution rather than fundamentally different clinical approaches.",
          "The real differences emerge when you look at how each service handles edge cases. What happens when your request is declined? How long do you wait on a Sunday afternoon? Can you ask the doctor a follow-up question without paying again? What's the experience like when something doesn't go smoothly? Those details don't appear in the headline pitch, but they shape how you actually feel about a service over time.",
          "InstantMed has deliberately built around a few specific commitments: a clear refund policy, 24/7 availability for medical certificates, direct doctor messaging, and an optional priority review. Whether those matter to you depends on what you're trying to get done.",
        ],
      },
      {
        id: "refunds",
        title: "Why Refund Policies Actually Matter",
        paragraphs: [
          "The refund policy is one of the most underrated factors in choosing a telehealth service. Most patients assume their request will be approved - and usually it is - but the handling of declined requests reveals a lot about how a service treats patients. If a doctor decides your case isn't suitable for telehealth, do you still pay? Partially? Fully? Does the service explain why, or just take the money and move on?",
          "InstantMed refunds 100% of the fee for declined medical certificate and prescription requests. For declined consult requests, you receive a 50% refund, because the doctor has still reviewed your case in detail and written a clinical note. The 50% retention isn't a penalty - it reflects the work that's already been done, and the patient still gets that clinical assessment.",
          "A clear refund policy also filters the doctor's incentive structure. When refunds are guaranteed, there's no financial pressure to approve borderline cases. That makes the clinical decision cleaner, and it protects patients from inappropriate approvals just as much as from inappropriate declines.",
        ],
      },
      {
        id: "availability",
        title: "Hours of Operation and Why They Matter",
        paragraphs: [
          "24/7 availability isn't a marketing gimmick when the thing you need is a medical certificate for a shift that starts in four hours. Most Australians needing urgent certificates don't plan for it - they wake up unwell at 5am and need evidence of illness before 8am. A service that only operates during business hours can't help with that.",
          "InstantMed accepts requests 24/7. Medical certificates are the fastest 24/7 pathway; prescriptions and consults can still be submitted at any time, with doctor review usually handled during extended review hours (8am-10pm AEST). This isn't a criticism of services with different hours - different trade-offs for different use cases.",
          "If you only ever need a certificate during business hours, the hours difference doesn't matter. If you regularly need one at odd times, it genuinely does.",
        ],
      },
    ],
  },
}

// =============================================================================
// InstantMed vs InstantScripts
// =============================================================================

const instantmedVsInstantScripts: ComparisonEntry = {
  title: "InstantMed vs InstantScripts: Comparing Two Australian Telehealth Services",
  slug: "instantmed-vs-instantscripts",
  description:
    "Compare InstantMed and InstantScripts. Two script-and-certificate-focused Australian telehealth services - how pricing, scope, and experience compare.",
  keywords: [
    "instantmed vs instantscripts",
    "instantscripts alternative",
    "instantscripts comparison",
    "online script australia",
    "telehealth medical certificate",
  ],
  competitor: { name: "InstantScripts", type: "competitor" },
  heroText:
    "InstantScripts is one of the largest script-focused telehealth services in Australia. InstantMed offers a similar core - medical certificates, repeat scripts, and consultations - with a slightly different workflow and commitments. Here's an honest, side-by-side look.",
  comparisonTable: [
    { feature: "AHPRA-registered doctors", instantmed: true, competitor: true, winner: "tie" },
    { feature: "Medical certificate", instantmed: PRICING_DISPLAY.FROM_MED_CERT, competitor: "Similar pricing", winner: "tie" },
    { feature: "Repeat prescription", instantmed: PRICING_DISPLAY.REPEAT_SCRIPT, competitor: "Similar pricing", winner: "tie" },
    { feature: "General consultation", instantmed: PRICING_DISPLAY.FROM_CONSULT, competitor: "Similar pricing", winner: "tie" },
    { feature: "eScript delivery", instantmed: true, competitor: true, winner: "tie" },
    { feature: "Priority / Express review", instantmed: `+${PRICING_DISPLAY.PRIORITY_FEE} fast-track option`, competitor: "Varies", winner: "instantmed" },
    { feature: "Repeat script subscription", instantmed: "$19.95/mo optional", competitor: "Per-request", winner: "tie" },
    { feature: "24/7 medical certificates", instantmed: true, competitor: "Extended hours", winner: "instantmed" },
    { feature: "Direct doctor messaging", instantmed: true, competitor: "Varies by request", winner: "instantmed" },
    { feature: "Refund on declined request", instantmed: "100% med cert/Rx, 50% consults", competitor: "Refund policy varies", winner: "instantmed" },
    { feature: "Brand recognition in Australia", instantmed: "Newer service", competitor: "Well established", winner: "competitor" },
  ],
  whenInstantMedBetter: [
    "You value a clearly documented refund guarantee for declined requests",
    "You want 24/7 availability for medical certificates",
    "You want the Express Review option to fast-track your request",
    "You prefer direct doctor messaging as part of the review process",
    "You want an opt-in monthly repeat prescription subscription",
  ],
  whenCompetitorBetter: [
    "You prefer a service with broader name recognition and longer track record",
    "You've used InstantScripts before and the workflow suits you",
    "You specifically need a service or medication category that InstantScripts is set up for",
    "You want to compare both and use whichever has the better fit for your particular request",
  ],
  verdict:
    "InstantScripts is an established, well-known Australian telehealth service with a strong script-focused offering. InstantMed is a newer service with comparable core pricing and a few deliberate differentiators - explicit refund policy, 24/7 medical certificate availability, Express Review, and direct messaging. Neither is objectively 'better' across the board. If you value the InstantMed differentiators, choose InstantMed. If name recognition and a longer track record matter more to you, InstantScripts is a reasonable choice.",
  faqs: [
    {
      q: "Are InstantMed and InstantScripts the same company?",
      a: "No. Despite the similar-sounding names, they are separate Australian telehealth services with different owners, teams, and workflows. Both use AHPRA-registered doctors and both offer similar core services (scripts, certificates, consults), but they are independent businesses.",
    },
    {
      q: "Which service has been around longer?",
      a: "InstantScripts has been operating in the Australian telehealth market for longer and is one of the more recognised script-focused services nationally. InstantMed is a newer entrant. Track record matters to some patients and not to others - neither is a quality signal on its own, since both use the same regulated clinical framework.",
    },
    {
      q: "Do both services cover the same types of requests?",
      a: `Both offer medical certificates, repeat prescriptions, and online consultations for common conditions. InstantMed also offers specific consults like hair loss, weight management, men's and women's health. The exact catalogue on each service can change, so check current offerings before committing.`,
    },
    {
      q: "How do the prices compare?",
      a: `Both services charge similar prices in the same ballpark. InstantMed's medical certificates start at ${PRICING_DISPLAY.FROM_MED_CERT}, repeat scripts at ${PRICING_DISPLAY.REPEAT_SCRIPT}, and consults at ${PRICING_DISPLAY.FROM_CONSULT}. Specific InstantScripts pricing should be checked directly on their site. In practice, the cost difference between similar services is usually small - a few dollars at most for the same service type.`,
    },
    {
      q: "Can I switch from InstantScripts to InstantMed?",
      a: "Yes. Neither service requires you to commit to them long-term. You can use one for one request and the other for the next. If you're on a recurring InstantScripts subscription, cancel through their account portal when you're ready. InstantMed requires no subscription to start using - you only pay per request.",
    },
    {
      q: "Is my script from InstantMed accepted at the same pharmacies as one from InstantScripts?",
      a: "Yes. Both services deliver prescriptions through the Australian eScript system, which is accepted at essentially all pharmacies in Australia. The eScript token or QR code works the same regardless of which telehealth service issued it. Your pharmacy choice isn't restricted.",
    },
    {
      q: "What's the refund policy difference?",
      a: "InstantMed has a clearly documented policy: 100% refund on declined medical certificate and prescription requests, 50% refund on declined consult requests. InstantScripts handles refunds through their own terms - check their policy directly. Services with explicit refund commitments reduce the financial risk of trying them for the first time.",
    },
    {
      q: "Which service should I try first?",
      a: "Both are legitimate options. If you're risk-averse and want a guaranteed refund if things don't work out, InstantMed's explicit refund policy makes it a safer trial. If you value an established brand and InstantScripts has worked well for friends or family, starting there is reasonable. There's no wrong answer - and you can always try the other one for your next request.",
    },
  ],
  guideContent: {
    title: "How to Compare Script-Focused Telehealth Services",
    subtitle: "When multiple Australian telehealth services offer similar core products, the smaller details are what actually differentiate them.",
    sections: [
      {
        id: "core-equivalence",
        title: "Where the Two Services Are Essentially the Same",
        paragraphs: [
          "For a routine repeat prescription on a stable medication, there's very little practical difference between any two reputable Australian telehealth services. The doctor reviews your history, checks for red flags, and issues the eScript if it's appropriate. The clinical bar is the same, set by the Medical Board of Australia's telehealth guidelines. The eScript goes to the same national infrastructure and is filled at the same pharmacies. The patient experience is largely interchangeable.",
          "Pricing in this segment has converged. Most services charge similar amounts for similar services, and the differences are measured in dollars rather than tens of dollars. For patients used to comparing prices between supermarkets, this can feel underwhelming - but it reflects a maturing market where competition has squeezed margins. Any service charging dramatically less is worth inspecting carefully; any service charging dramatically more needs to justify the premium.",
          "This is why comparing services on headline features alone often leads nowhere. The real differences are in what happens at the edges: declined requests, unusual hours, follow-up questions, refund handling.",
        ],
      },
      {
        id: "edge-cases",
        title: "What the Edge Cases Reveal",
        paragraphs: [
          "The clearest differentiator between similar services is how they handle things going wrong. A declined request is the clearest example. Most patients assume they'll be approved - and usually they are - but the handling of declines tells you a lot about the service's incentives. A service that refunds fully for declined certificates and scripts has no financial motive to push borderline approvals. A service that keeps the fee regardless of the outcome has subtly different incentives.",
          "Hours of operation matter more than the brochure suggests. If you regularly need care at 11pm on a Sunday, the difference between '24/7' and 'extended hours' is the difference between getting help and waiting for Monday morning. Most patients think they'll only ever need care during standard hours - until they don't.",
          "Communication during a request matters for anything non-trivial. If a doctor has a question about your symptoms and needs to clarify, can you respond directly inside the request, or does the case just get declined? Services that support back-and-forth messaging handle borderline cases more gracefully - and that matters more when the case isn't straightforward.",
        ],
      },
      {
        id: "how-to-decide",
        title: "A Practical Way to Decide",
        paragraphs: [
          "If you're choosing between two similar telehealth services for the first time, the fastest path to a decision isn't to compare every feature - it's to read each service's refund policy and hours page. These two documents encode most of the operational differences. A service with an explicit refund commitment and 24/7 availability for the service you need is a safer first trial, because the cost of 'getting it wrong' is lower.",
          "For patients with a specific, unusual need - a particular medication, a specialised consult type, a niche service - the right question is 'which service actually supports this?' rather than 'which is best overall.' Both InstantMed and InstantScripts may not cover every niche equally. Check the specific service pages for the thing you actually need before committing.",
          "And as with any telehealth decision: if the service that works today doesn't work tomorrow, switching is trivial. You're not locked in. Using two services for different things over the course of a year is completely reasonable, and often the practical answer for people who want options.",
        ],
      },
    ],
  },
}

// =============================================================================
// Exported map
// =============================================================================

export const COMPETITOR_COMPARISONS: Record<string, ComparisonEntry> = {
  [instantmedVsHubHealth.slug]: instantmedVsHubHealth,
  [instantmedVsDoctorsOnDemand.slug]: instantmedVsDoctorsOnDemand,
  [instantmedVsCleanbill.slug]: instantmedVsCleanbill,
  [instantmedVsQoctor.slug]: instantmedVsQoctor,
  [instantmedVsInstantScripts.slug]: instantmedVsInstantScripts,
}

export const COMPETITOR_COMPARISON_SLUGS = Object.keys(COMPETITOR_COMPARISONS) as Array<
  keyof typeof COMPETITOR_COMPARISONS
>
