/**
 * Prescription guides -- SEO guide page data
 * Part of the guides data split. See ./index.ts for the combined export.
 */

import { PRICING_DISPLAY } from "@/lib/constants"

import type { GuideData } from "../guides"

export const prescriptionGuides: Record<string, GuideData> = {
  "how-to-get-repeat-prescription-online": {
    title: "How to Get a Repeat Prescription Online in Australia",
    slug: "how-to-get-repeat-prescription-online",
    description: "Need a repeat prescription but can't get to your GP? Learn how to get prescriptions renewed online in Australia.",
    lastUpdated: "April 2026",
    readTime: "5 min read",
    intro: "Repeat prescriptions for stable conditions can often be renewed via telehealth. If you're running low on medication and can't get a GP appointment, online services may be able to help - as long as your condition is suitable for remote assessment.",
    steps: [
      {
        title: "Check if your medication can be prescribed online",
        content: "Many common medications can be prescribed via telehealth: blood pressure meds, cholesterol drugs, contraceptives, asthma preventers, and some antibiotics. Schedule 8 drugs (opioids, stimulants) cannot be prescribed online. Some medications need recent blood tests or in-person review.",
        tips: ["Most S4 medications can be prescribed online", "Schedule 8 always requires in-person", "Check the telehealth service's medication list"]
      },
      {
        title: "Gather your information",
        content: "You'll need to provide your current medication name, dose, how long you've been taking it, and who prescribed it. For some medications, recent blood pressure readings or other monitoring may be required. Have your Medicare card ready if the service bulk bills.",
        tips: ["Know your exact medication and dose", "Have your last prescription or pharmacy record", "Some services need a brief health questionnaire"]
      },
      {
        title: "Request your prescription",
        content: "Complete the online form or consultation. The doctor will review your history and, if appropriate, issue an eScript. You'll receive a QR code or token via SMS to take to any pharmacy. The pharmacy dispenses your medication - same as a paper script.",
        tips: ["eScripts work at any Australian pharmacy", "No need to collect a paper script", "Keep the SMS until you've collected your medication"]
      }
    ],
    importantNotes: [
      "Not all medications can be prescribed online - check first",
      "You may need to see your regular GP for some repeats",
      "eScripts are legally equivalent to paper prescriptions",
      "Schedule 8 drugs require in-person assessment"
    ],
    faqs: [
      { q: "Can I get any repeat prescription online?", a: "No. Schedule 8 drugs, some psychiatric medications, and medications requiring monitoring typically need in-person review. Common S4 medications are often available." },
      { q: "How do eScripts work?", a: "You receive a QR code or token via SMS. Take it to any pharmacy - they scan it and dispense your medication. No paper needed." },
      { q: "Will my regular GP know?", a: "Only if you or the telehealth service shares the information. For continuity, consider asking for a summary to be sent to your GP." }
    ],
    cta: { text: "Request a repeat prescription", href: "/prescriptions", subtext: `${PRICING_DISPLAY.FROM_SCRIPT} · eScript to your phone` }
  },
  "escript-vs-paper-prescription": {
    title: "eScript vs Paper Prescription in Australia: Complete Guide",
    slug: "escript-vs-paper-prescription",
    description: "Everything you need to know about electronic prescriptions (eScripts) in Australia - how they work, where they're accepted, repeats, and common questions.",
    lastUpdated: "April 2026",
    readTime: "6 min read",
    intro: "Australia has largely transitioned from paper prescriptions to electronic prescriptions (eScripts). Instead of a paper script you can lose or forget, you receive a QR code on your phone that any pharmacy can scan. Here's how the system works, what happens with repeats, and answers to common questions.",
    steps: [
      {
        title: "How eScripts work in practice",
        content: "When a doctor prescribes medication - whether in person or via telehealth - they generate an electronic prescription. You receive an SMS or email containing a QR code (called a 'token'). Walk into any pharmacy in Australia, show the QR code on your phone, and the pharmacist scans it to dispense your medication. The entire system is managed through the Australian Digital Health Agency's Electronic Prescription Service, which all pharmacies are connected to.",
        tips: [
          "You receive the token instantly via SMS - no waiting for paper",
          "The QR code contains encrypted prescription details the pharmacist can read",
          "eScripts are stored on the prescription exchange - they don't 'live' on your phone",
          "If you delete the SMS, the prescription still exists and can be retrieved"
        ]
      },
      {
        title: "How repeats work with eScripts",
        content: "If your doctor prescribes repeats, they're all encoded in the same token. When the pharmacist dispenses your first supply, the remaining repeats stay in the system. For your next repeat, you can return to any pharmacy - they look up the prescription by your details or a new token. Some pharmacy apps (like MedView or your pharmacy's app) can manage your repeat reminders automatically. You don't need to keep the original SMS for repeats, though it's handy for the first fill.",
        tips: [
          "Repeats are tracked digitally - no separate paper repeat forms",
          "Any pharmacy can access your remaining repeats (with your consent)",
          "Pharmacy apps can send you reminders when repeats are due",
          "Your pharmacist can tell you how many repeats remain"
        ]
      },
      {
        title: "Advantages over paper prescriptions",
        content: "eScripts solve several long-standing problems with paper prescriptions. You can't lose them (they're digital and retrievable). They work seamlessly with telehealth - no need to visit a clinic to collect paper. You're not locked into one pharmacy - any pharmacy nationwide can fill them. Doctors can issue them after-hours without you needing to pick up paper. And they're more secure - harder to forge or alter than paper scripts.",
        tips: [
          "No lost prescriptions - the token can be reissued if needed",
          "Use any pharmacy in Australia - no geographic lock-in",
          "Perfect for telehealth - prescription arrives on your phone within minutes",
          "More secure than paper - encrypted and tamper-resistant",
          "Environmentally better - no paper waste"
        ]
      },
      {
        title: "When you might still encounter paper",
        content: "While eScripts are now the default, some situations may still involve paper prescriptions. A small number of very old prescribing systems haven't transitioned yet. Some patients prefer paper - you can ask your doctor for a printed version. Certain hospital discharge prescriptions may still be on paper. And some compounding pharmacies prefer paper for complex preparations. In all cases, paper scripts remain legally valid alongside eScripts.",
        tips: [
          "You can request a paper script if you prefer - just ask your doctor",
          "Some hospital discharge scripts may still be paper",
          "Paper and electronic prescriptions have identical legal standing",
          "Pharmacies accept both - they won't refuse a valid paper script"
        ]
      }
    ],
    importantNotes: [
      "eScripts are legally equivalent to paper prescriptions under Australian law",
      "All Australian pharmacies - chains and independents - can dispense from eScripts",
      "You don't need a smartphone - the token code can be read out or printed",
      "eScripts work for PBS (subsidised) and private prescriptions",
      "Schedule 8 (controlled substance) prescriptions have additional requirements that vary by state"
    ],
    faqs: [
      { q: "Do all pharmacies accept eScripts?", a: "Yes. Every community pharmacy in Australia is connected to the Electronic Prescription Service. This includes all chains (Chemist Warehouse, Priceline, TerryWhite) and independent pharmacies." },
      { q: "What if I lose my eScript SMS?", a: "The prescription still exists on the prescription exchange. Contact your doctor or telehealth service to resend the token. Alternatively, your pharmacist can look up the prescription using your details." },
      { q: "Can I use an eScript at a different pharmacy than usual?", a: "Yes. eScripts work at any pharmacy in Australia. You're not locked into one pharmacy. This is especially useful when travelling or if your regular pharmacy is closed." },
      { q: "How do I know how many repeats I have left?", a: "Ask your pharmacist - they can check the system. Many pharmacy apps also track your active prescriptions and remaining repeats." },
      { q: "Can someone else collect my medication with my eScript?", a: "Yes. You can forward the SMS token to a family member or friend. They present it at the pharmacy with appropriate identification. The same process as having someone collect a paper script on your behalf." }
    ],
    cta: { text: "Get an eScript", href: "/prescriptions", subtext: "Prescriptions sent to your phone" }
  },
  "telehealth-for-prescriptions-australia": {
    title: "Getting Prescriptions Through Telehealth in Australia",
    slug: "telehealth-for-prescriptions-australia",
    description: "Can you get a prescription through telehealth? Learn what medications can be prescribed online and how the process works.",
    lastUpdated: "April 2026",
    readTime: "6 min read",
    intro: "Yes, Australian doctors can prescribe medications through telehealth consultations. It's legal, regulated, and increasingly common. But there are rules about what can and can't be prescribed online. Here's what you need to know.",
    steps: [
      {
        title: "Understand what can be prescribed online",
        content: "Most common medications can be prescribed via telehealth - blood pressure medication, contraceptives, antibiotics, inhalers, skin treatments, and many more. However, some medications have restrictions. Schedule 8 controlled substances (strong painkillers, some ADHD medications) generally can't be prescribed through telehealth without an established doctor-patient relationship.",
        tips: ["Common repeat medications are well-suited to telehealth", "Schedule 4 medications (most prescriptions) can be prescribed online", "Schedule 8 (controlled substances) have strict rules"]
      },
      {
        title: "Complete a telehealth consultation",
        content: "You'll complete a health questionnaire or have a consultation with the doctor. They'll review your medical history, current medications, and the reason for your request. The doctor makes an independent clinical decision - they'll only prescribe if it's appropriate.",
        tips: ["Have your current medication list ready", "Know the name and dosage of what you need", "The doctor may ask about side effects or changes"]
      },
      {
        title: "Receive your eScript",
        content: "If prescribed, you'll receive an eScript (electronic prescription) via SMS or email. Take this to any pharmacy in Australia. For repeats, the pharmacist can manage subsequent dispensing from the same eScript.",
        tips: ["eScripts work at any pharmacy", "Repeats are included in the same eScript", "No paper script to lose"]
      }
    ],
    importantNotes: [
      "Telehealth prescribing is regulated by AHPRA and state/territory legislation",
      "Doctors must make independent clinical decisions - prescriptions aren't guaranteed",
      "Schedule 8 controlled substances have additional restrictions for telehealth",
      "Always tell the doctor about all medications you're currently taking"
    ],
    faqs: [
      { q: "Can I get antibiotics through telehealth?", a: "Yes, if the doctor assesses that antibiotics are appropriate for your condition. They won't prescribe antibiotics for conditions that don't need them." },
      { q: "Can I renew my regular medication online?", a: "Yes. Repeat prescriptions for established medications are one of the most common telehealth uses." },
      { q: "Why can't some medications be prescribed online?", a: "Schedule 8 medications (strong painkillers, some stimulants) have regulatory restrictions requiring established doctor-patient relationships and sometimes in-person assessment." },
      { q: "Do I need Medicare for a telehealth prescription?", a: "For prescription renewals and consultations, Medicare eligibility affects rebates but you can still use telehealth services without Medicare." }
    ],
    cta: { text: "Get a prescription", href: "/request?service=prescription", subtext: "eScripts sent to your phone. Accepted at any Australian pharmacy." }
  },
}
