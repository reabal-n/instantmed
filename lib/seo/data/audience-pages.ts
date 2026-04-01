/**
 * Audience/occupation page config
 * Used by app/for/[audience]/page.tsx for nurses, teachers, hospitality, etc.
 */

import type { LucideIcon } from "lucide-react"
import {
  Stethoscope,
  GraduationCap,
  Coffee,
  ShoppingBag,
  Briefcase,
  Users,
  Laptop,
  Car,
} from "lucide-react"

export interface AudiencePageConfig {
  slug: string
  badgeLabel: string
  h1: string
  heroSubtext: string
  heroTagline: string
  icon: LucideIcon
  metadata: {
    title: string
    description: string
    keywords: string[]
  }
  faqs: Array<{ q: string; a: string }>
  whyChoose: Array<{ title: string; desc: string }>
  testimonials: Array<{ name: string; role: string; quote: string }>
  /** Industry-specific context — 2-3 paragraphs of workplace health insight */
  industryContext?: string[]
  /** Common conditions for this workforce */
  commonConditions?: Array<{ name: string; slug: string; why: string }>
  /** Workplace rights and entitlements relevant to this audience */
  workplaceRights?: string[]
}

export const audiencePageConfigs: Record<string, AudiencePageConfig> = {
  nurses: {
    slug: "nurses",
    badgeLabel: "For Nurses & Healthcare Workers",
    h1: "Medical Certificates for Nurses",
    heroSubtext:
      "Hospital shifts don't match GP hours. Get your medical certificate online — 8am-10pm, 7 days. Accepted by all healthcare employers.",
    heroTagline: "Works around your roster • Hospitals accept • AHPRA doctors",
    icon: Stethoscope,
    metadata: {
      title: "Medical Certificates for Nurses | Online",
      description:
        "Nurses and healthcare workers: get a medical certificate without leaving home. Doctor-reviewed, usually under 1 hour. Accepted by hospitals and aged care. 8am-10pm, 7 days.",
      keywords: [
        "medical certificate nurses",
        "nurse sick certificate",
        "healthcare worker medical certificate",
        "hospital medical certificate online",
      ],
    },
    faqs: [
      {
        q: "Do hospitals accept online medical certificates?",
        a: "Yes. Our certificates are issued by AHPRA-registered doctors and are valid for all Australian employers, including public and private hospitals, aged care, and healthcare agencies.",
      },
      {
        q: "Can I get a certificate between shifts?",
        a: "Yes. We're available 8am-10pm AEST, 7 days a week. Complete the form during your break or before your next shift.",
      },
      {
        q: "What if I work night shift?",
        a: "Submit your request anytime. If it's after 10pm, we'll process it from 8am. You can also submit in the morning after a night shift.",
      },
      {
        q: "How much does a medical certificate cost?",
        a: "A 1-day certificate is $19.95, 2-day is $29.95, and 3-day is $39.95. No hidden fees. If our doctor is unable to issue your certificate, you receive a full refund.",
      },
      {
        q: "Can my employer see my diagnosis?",
        a: "No. Your certificate states that you were assessed and found unfit for work. It does not include your diagnosis, symptoms, or clinical notes. Your privacy is protected under Australian health privacy law.",
      },
      {
        q: "Can I get a carer's leave certificate?",
        a: "Yes. If you need time off to care for an unwell family member or household member, we can issue a carer's leave certificate. This uses your personal leave balance under the Fair Work Act.",
      },
      {
        q: "Are online medical certificates legally valid?",
        a: "Yes. Telehealth certificates issued by AHPRA-registered doctors have the same legal standing as in-person GP certificates under the Fair Work Act. There is no distinction in Australian law.",
      },
      {
        q: "Can I get a certificate for more than one day?",
        a: "Yes. We issue certificates for 1, 2, or 3 days. If you need longer, the doctor may recommend an in-person assessment.",
      },
      {
        q: "What if my hospital requires a certificate from day one?",
        a: "Many healthcare employers require a certificate for any absence. We can issue same-day certificates so you have documentation ready before your next rostered shift.",
      },
      {
        q: "Do I need to provide my Medicare card?",
        a: "No. Medicare is not required for medical certificates. You pay a flat fee and receive your certificate directly — no Medicare rebate applies, but no Medicare card is needed either.",
      },
      {
        q: "What happens if the doctor declines my request?",
        a: "If our doctor determines they cannot issue a certificate based on the information provided, you receive a full refund. They may also recommend you see a GP in person.",
      },
    ],
    whyChoose: [
      {
        title: "Healthcare hours, not GP hours",
        desc: "Your shifts don't align with clinic opening times. We're available when you need us.",
      },
      {
        title: "No waiting rooms when you're unwell",
        desc: "The last place you want to be when sick is around more sick people. Get your cert from home.",
      },
      {
        title: "Employers you know accept it",
        desc: "Hospitals, aged care, agencies — they all accept AHPRA-registered doctor certificates.",
      },
    ],
    testimonials: [
      { name: "Sarah M.", role: "Melbourne", quote: "Night shift then sick — got my cert at 7am before I even went to sleep." },
      { name: "James L.", role: "Brisbane", quote: "Couldn't get to a clinic between shifts. Did it on my phone instead." },
    ],
    industryContext: [
      "Nursing and healthcare work involves 12-hour shifts, rotating rosters, and exposure to infectious patients — making nurses among the most likely workers to need medical certificates. Yet standard GP clinics are closed during many of the hours nurses actually work. Telehealth fills this gap by providing doctor access at 8am when you come off a night shift, or at 9pm before an early start.",
      "Healthcare employers are among the most rigorous about requiring valid medical documentation for absences. Our certificates are issued by AHPRA-registered doctors and include all the details your HR department requires: doctor's name, provider number, dates of unfitness, and clinic details. They meet the same legal standard as any in-person GP certificate.",
      "Nurses and healthcare workers also face unique occupational health considerations — needle-stick injuries, patient aggression, and workplace stress all fall outside what telehealth can assess. For these, you need your workplace OHS process. But for common illnesses like gastro (with its mandatory 48-hour exclusion), cold and flu, or mental health days, telehealth is the practical choice.",
    ],
    commonConditions: [
      { name: "Gastroenteritis", slug: "gastro", why: "48-hour workplace exclusion required for healthcare workers — certificate documents compliance" },
      { name: "Cold & Flu", slug: "cold-and-flu", why: "High exposure risk from patients, plus duty not to attend work while infectious" },
      { name: "Back Pain", slug: "back-pain", why: "Manual patient handling is one of the leading causes of back injury in nursing" },
      { name: "Mental Health Day", slug: "mental-health-day", why: "Burnout rates among nurses are significantly higher than the general workforce" },
      { name: "COVID-19", slug: "covid-19", why: "Healthcare workers face higher exposure risk and strict return-to-work protocols" },
    ],
    workplaceRights: [
      "Under the Fair Work Act, you are entitled to 10 days of paid personal/carer's leave per year (pro-rata for part-time)",
      "Your employer can request a medical certificate but cannot demand to know your specific diagnosis",
      "Certificates from telehealth services are legally equivalent to in-person GP certificates",
      "Healthcare enterprise agreements often provide additional sick leave beyond the NES minimum",
      "If you are a casual nurse, you can still use InstantMed — you are not entitled to paid leave but may need documentation for regular shifts",
    ],
  },
  teachers: {
    slug: "teachers",
    badgeLabel: "For Teachers & Education Staff",
    h1: "Medical Certificates for Teachers",
    heroSubtext:
      "School hours = GP hours. Get your medical certificate online without leaving work. Accepted by DET, Catholic, and independent schools.",
    heroTagline: "No relief needed to see a doctor • All schools accept • Usually under 1 hour",
    icon: GraduationCap,
    metadata: {
      title: "Medical Certificates for Teachers | Online",
      description:
        "Teachers: get a medical certificate without taking time off. Doctor-reviewed, usually under 1 hour. Accepted by all Australian schools. Complete during lunch or after school.",
      keywords: [
        "medical certificate teachers",
        "teacher sick certificate",
        "DET medical certificate",
        "school staff medical certificate",
      ],
    },
    faqs: [
      {
        q: "Do education departments accept online certificates?",
        a: "Yes. Certificates from AHPRA-registered doctors meet standard requirements across Australian school systems — DET, Catholic, independent.",
      },
      {
        q: "Can I do this during school hours?",
        a: "Yes. The form takes 2 minutes. Complete it during a break or lunch. Certificate arrives via email.",
      },
      {
        q: "What about casual relief teachers?",
        a: "Same process. Get your certificate, forward to your agency or school. Valid for all employers.",
      },
      {
        q: "How much does a certificate cost?",
        a: "A 1-day certificate is $19.95, 2-day is $29.95, and 3-day is $39.95. If the doctor cannot issue your certificate, you receive a full refund.",
      },
      {
        q: "Will my school see my diagnosis on the certificate?",
        a: "No. The certificate confirms you were assessed and found unfit for work. It does not include your diagnosis or clinical details. Your school only needs to know you have a valid certificate.",
      },
      {
        q: "Can I get a certificate for a mental health day?",
        a: "Yes. Mental health is covered under personal leave provisions — the same as physical illness. The certificate will not specify the nature of your condition.",
      },
      {
        q: "Can I get a carer's leave certificate for my child?",
        a: "Yes. If your child is unwell and you need time off to care for them, we can issue a carer's leave certificate. This covers your absence from school work duties.",
      },
      {
        q: "Are these certificates valid under education department policies?",
        a: "Yes. Our certificates are issued by AHPRA-registered doctors and meet the requirements of all Australian education departments, Catholic education offices, and independent school authorities.",
      },
      {
        q: "What if I need a certificate before 8am for a morning absence?",
        a: "Our hours are 8am-10pm AEST. If you know you will be unwell, submit your request the evening before. Otherwise, submit at 8am and you will typically have your certificate within an hour.",
      },
      {
        q: "Can I get a multi-day certificate?",
        a: "Yes. We issue certificates for 1, 2, or 3 days. For longer absences, the doctor may recommend an in-person assessment.",
      },
      {
        q: "What happens if the doctor declines my request?",
        a: "You receive a full refund. The doctor may recommend you see a GP in person for a more thorough assessment.",
      },
    ],
    whyChoose: [
      {
        title: "No need to arrange relief",
        desc: "Taking time off to see a GP means finding someone to cover your class. We fit into your break.",
      },
      {
        title: "Schools accept it",
        desc: "All Australian education employers accept our certificates. No questions asked.",
      },
      {
        title: "Same-day when you need it",
        desc: "Wake up unwell? Get your cert before school starts or during your first free period.",
      },
    ],
    testimonials: [
      { name: "Emma T.", role: "Sydney", quote: "Did it during lunch. Had my cert before afternoon class." },
      { name: "David K.", role: "Perth", quote: "School accepted it no problem. Didn't have to take a half-day off." },
    ],
    industryContext: [
      "Teachers are frequently exposed to every virus circulating in the community — classrooms are enclosed spaces with limited ventilation and dozens of children who don't always cover their coughs. Most teachers report catching 3-5 illnesses per year, significantly more than the average adult. Despite this, getting a same-day GP appointment can mean missing a full day of school and disrupting lesson plans.",
      "The teaching profession also carries significant mental health demands. The Australian Principal Association reports that over 40% of school leaders experience burnout, and classroom teachers face similar pressures from workload, behaviour management, and administrative demands. A mental health day is a legitimate use of personal leave, and our certificates support this without requiring you to disclose your specific condition.",
      "For teachers employed under the Australian Education Union or state education department agreements, sick leave entitlements are typically generous (10-15 days per year). However, many schools request a certificate from day one of absence to arrange relief teachers. Telehealth lets you get your certificate before 8am — before the relief desk even opens.",
    ],
    commonConditions: [
      { name: "Cold & Flu", slug: "cold-and-flu", why: "Classroom exposure makes teachers one of the highest-risk groups for respiratory infections" },
      { name: "Sore Throat", slug: "sore-throat", why: "Voice strain combined with viral exposure — teachers lose their voice more than any other profession" },
      { name: "Mental Health Day", slug: "mental-health-day", why: "Teaching has one of the highest burnout rates of any Australian profession" },
      { name: "Migraine", slug: "migraine", why: "Classroom noise, fluorescent lighting, and screen time are common migraine triggers" },
      { name: "Gastroenteritis", slug: "gastro", why: "Schools are high-transmission environments, especially primary schools" },
    ],
    workplaceRights: [
      "Teachers under state education awards typically receive 10-15 days of paid sick leave per year",
      "Most schools require a medical certificate for absences of 2+ days, though some require one from day one",
      "You do not need to tell your school the specific nature of your illness — 'medical condition' on the certificate is sufficient",
      "Casual relief teachers can use InstantMed for documentation even without paid leave entitlements",
      "Mental health days are covered under personal leave provisions — the same as physical illness",
    ],
  },
  hospitality: {
    slug: "hospitality",
    badgeLabel: "For Hospitality Workers",
    h1: "Medical Certificates for Hospitality",
    heroSubtext:
      "Chefs, waitstaff, hotel workers — your hours don't match GP clinics. Get your certificate online, 8am-10pm, 7 days.",
    heroTagline: "Works around your roster • Restaurants & hotels accept • 7 days",
    icon: Coffee,
    metadata: {
      title: "Medical Certificates for Hospitality Workers",
      description:
        "Hospitality workers: get a medical certificate without missing a shift to see a GP. Doctor-reviewed, usually under 1 hour. Accepted by restaurants, hotels, venues.",
      keywords: [
        "medical certificate hospitality",
        "chef sick certificate",
        "waitstaff medical certificate",
        "hotel worker sick leave",
      ],
    },
    faqs: [
      {
        q: "Will my restaurant/hotel accept it?",
        a: "Yes. Our certificates are from AHPRA-registered doctors and are valid for all Australian employers.",
      },
      {
        q: "I work weekends — can I get a cert then?",
        a: "Yes. We're available 8am-10pm, 7 days a week including weekends.",
      },
      {
        q: "What if I need it before my evening shift?",
        a: "Medical certificates are available 24/7 and typically issued in under 30 minutes. Submit anytime.",
      },
      {
        q: "How much does a medical certificate cost?",
        a: "A 1-day certificate is $19.95, 2-day is $29.95, and 3-day is $39.95. No hidden fees. Full refund if the doctor is unable to issue your certificate.",
      },
      {
        q: "Will my employer see what I was sick with?",
        a: "No. The certificate confirms you were assessed and found unfit for work. It does not include your diagnosis, symptoms, or any clinical details. Your privacy is protected.",
      },
      {
        q: "Can I get a certificate for gastro with the 48-hour exclusion?",
        a: "Yes. Food handlers are legally required to stay away from work for 48 hours after symptoms stop. Our certificate documents this for your employer and satisfies food safety requirements.",
      },
      {
        q: "I'm a casual — do I still need a certificate?",
        a: "You may not have paid sick leave, but a certificate still protects your employment relationship. An unexplained absence is more likely to cost you shifts than a documented one.",
      },
      {
        q: "Can I get a certificate for a mental health day?",
        a: "Yes. Mental health is a valid reason for personal leave. The certificate will not specify the nature of your condition — your employer only sees that you were assessed by a doctor.",
      },
      {
        q: "Are these certificates valid under the Fair Work Act?",
        a: "Yes. Certificates from AHPRA-registered doctors — whether issued via telehealth or in person — have the same legal standing under Australian employment law.",
      },
      {
        q: "Can I get a multi-day certificate?",
        a: "Yes. We issue certificates for 1, 2, or 3 days. For longer absences, the doctor may recommend an in-person assessment.",
      },
      {
        q: "What happens if the doctor declines my request?",
        a: "You receive a full refund. The doctor may suggest you see a GP in person for further assessment.",
      },
    ],
    whyChoose: [
      {
        title: "Your roster, not the clinic's",
        desc: "Hospitality hours rarely overlap with GP opening times. We're here when you need us.",
      },
      {
        title: "No lost shifts",
        desc: "Get your certificate without missing work to queue at a clinic.",
      },
      {
        title: "Venues accept it",
        desc: "Restaurants, hotels, pubs, events — all accept AHPRA-registered certificates.",
      },
    ],
    testimonials: [
      { name: "Marcus P.", role: "Melbourne", quote: "My hours don't line up with clinic hours at all. This actually works around my roster." },
      { name: "Sophie R.", role: "Brisbane", quote: "Got sick on a Saturday. Had my cert before my Sunday shift." },
    ],
    industryContext: [
      "Hospitality workers face a unique combination of irregular hours, food safety obligations, and high physical demands. Shifts that start at 5am for breakfast service or end at 2am after closing mean GP clinics are rarely accessible during your free time. Telehealth fits around the hours that hospitality actually works.",
      "Food safety legislation in all Australian states requires food handlers to not attend work while experiencing vomiting, diarrhoea, or other symptoms of foodborne illness. The 48-hour exclusion rule applies strictly — and your employer may require documented evidence. A medical certificate from InstantMed satisfies this requirement.",
      "Hospitality also has one of the highest rates of casual employment in Australia, meaning many workers don't have paid sick leave. While a certificate won't change your entitlements, it does protect your employment relationship — an unexplained absence is far more likely to cause issues than a documented one.",
    ],
    commonConditions: [
      { name: "Gastroenteritis", slug: "gastro", why: "Mandatory 48-hour exclusion for food handlers — certificate documents compliance" },
      { name: "Food Poisoning", slug: "food-poisoning", why: "Occupational exposure to foodborne pathogens is higher in hospitality" },
      { name: "Back Pain", slug: "back-pain", why: "Long hours standing, carrying plates, and repetitive bending cause musculoskeletal strain" },
      { name: "Burnout", slug: "burnout", why: "Hospitality has the highest turnover rate of any Australian industry, often driven by burnout" },
    ],
    workplaceRights: [
      "Food handlers MUST stay home for 48 hours after vomiting or diarrhoea symptoms stop — this is a legal requirement, not optional",
      "Permanent and part-time hospitality workers receive 10 days paid personal leave per year under the Restaurant Industry Award",
      "Casual hospitality workers are not entitled to paid sick leave but should still document absences",
      "Your employer cannot force you to work while symptomatic with a gastrointestinal illness — food safety laws override roster requirements",
    ],
  },
  retail: {
    slug: "retail",
    badgeLabel: "For Retail Workers",
    h1: "Medical Certificates for Retail",
    heroSubtext:
      "Supermarkets, shops, warehouses — get your medical certificate online. No need to miss work to see a GP. 8am-10pm, 7 days.",
    heroTagline: "Works around your roster • All retailers accept • Usually under 1 hour",
    icon: ShoppingBag,
    metadata: {
      title: "Medical Certificates for Retail Workers",
      description:
        "Retail workers: get a medical certificate without a clinic visit. Doctor-reviewed, usually under 1 hour. Accepted by supermarkets, shops, and warehouses.",
      keywords: [
        "medical certificate retail",
        "retail worker sick certificate",
        "supermarket medical certificate",
        "warehouse sick leave",
      ],
    },
    faqs: [
      {
        q: "Will my store accept an online certificate?",
        a: "Yes. Certificates from AHPRA-registered doctors are valid for all Australian employers, including major retailers.",
      },
      {
        q: "I work irregular hours — when can I get one?",
        a: "We're available 8am-10pm AEST, 7 days. Submit when it suits you — before work, on a break, or after your shift.",
      },
      {
        q: "How much does a medical certificate cost?",
        a: "A 1-day certificate is $19.95, 2-day is $29.95, and 3-day is $39.95. Full refund if the doctor cannot issue your certificate.",
      },
      {
        q: "Will my manager see what I was sick with?",
        a: "No. The certificate states you were assessed and found unfit for work. No diagnosis, no symptoms, no clinical details. Your medical information stays private.",
      },
      {
        q: "I'm a casual retail worker — is a certificate still useful?",
        a: "Yes. Even without paid sick leave, a certificate protects your shifts. Managers are more understanding when an absence is documented. It also supports any future dispute under the Fair Work Act.",
      },
      {
        q: "Can I get a certificate for a mental health day?",
        a: "Yes. Mental health conditions are covered under personal leave. The certificate does not specify the nature of your illness — your employer only sees that a doctor assessed you.",
      },
      {
        q: "Are these certificates valid under the General Retail Industry Award?",
        a: "Yes. Our certificates meet all requirements under the General Retail Industry Award 2020 and the Fair Work Act. They are issued by AHPRA-registered doctors.",
      },
      {
        q: "Can I get a certificate on a weekend or public holiday?",
        a: "Yes. We operate 8am-10pm AEST, 7 days a week — including weekends and public holidays. Retail never stops, and neither do we.",
      },
      {
        q: "Can I get a carer's leave certificate?",
        a: "Yes. If you need time off to care for an unwell family member, we can issue a carer's leave certificate. This uses your personal leave balance.",
      },
      {
        q: "What happens if the doctor declines my request?",
        a: "You receive a full refund. The doctor may recommend you visit a GP in person for further assessment.",
      },
    ],
    whyChoose: [
      {
        title: "Retail hours vary",
        desc: "Early starts, late finishes, weekends — we're available when you're not at work.",
      },
      {
        title: "Quick and simple",
        desc: "2-minute form, doctor review. Certificate to your email.",
      },
      {
        title: "All employers accept",
        desc: "Coles, Woolworths, independents, warehouses — no exceptions.",
      },
    ],
    testimonials: [
      { name: "Emma T.", role: "Brisbane", quote: "Got sick on a Sunday. Had my cert to HR before Monday morning." },
      { name: "Liam S.", role: "Sydney", quote: "Early shifts meant I could never make it to a clinic. Did it from my phone instead." },
    ],
    industryContext: [
      "Retail is Australia's second-largest employer, with over 1.3 million workers — many of whom are casuals without paid sick leave. For these workers, an absence without documentation can mean lost shifts, damaged relationships with managers, or worse. A medical certificate protects your position even when you're not entitled to paid leave.",
      "Retail shifts often start early (5-6am for stock or opening) or run late (closing at 9-10pm), making standard GP hours impractical. Weekend work is the norm, not the exception. Telehealth provides certificate access during the hours retail workers actually need it — including weekends and evenings.",
      "The General Retail Industry Award 2020 provides 10 days of paid personal leave per year for permanent and part-time employees. Most retail employers require a certificate for absences of 2 or more consecutive days, or for absences on days adjacent to weekends or public holidays. Having your certificate ready before your manager even asks removes friction.",
    ],
    commonConditions: [
      { name: "Cold & Flu", slug: "cold-and-flu", why: "Customer-facing roles with high contact exposure, especially during winter" },
      { name: "Back Pain", slug: "back-pain", why: "Standing for long shifts, manual stock handling, and repetitive bending" },
      { name: "Mental Health Day", slug: "mental-health-day", why: "Customer-facing pressure combined with irregular hours and low pay contributes to burnout" },
      { name: "Muscle Strain", slug: "muscle-strain", why: "Lifting stock, unloading deliveries, and prolonged standing cause musculoskeletal injury" },
    ],
    workplaceRights: [
      "Permanent and part-time retail workers receive 10 days paid personal leave per year under the General Retail Industry Award",
      "Casual retail workers are not entitled to paid sick leave but can access unpaid leave — documentation protects your shifts",
      "Your employer can request a certificate but cannot ask what your specific illness is",
      "Sick leave accrues progressively and rolls over — unused leave from previous years is still available",
    ],
  },
  "office-workers": {
    slug: "office-workers",
    badgeLabel: "For Office Workers",
    h1: "Medical Certificates for Office Workers",
    heroSubtext:
      "Desk job doesn't mean you have time for a GP visit. Get your medical certificate online from your desk or home. Accepted by all employers.",
    heroTagline: "From your desk or home • Usually under 1 hour • All employers accept",
    icon: Briefcase,
    metadata: {
      title: "Medical Certificates for Office Workers",
      description:
        "Office workers: get a medical certificate without leaving work or home. Doctor-reviewed, usually under 1 hour. Accepted by corporate and government employers.",
      keywords: [
        "medical certificate office workers",
        "corporate sick certificate",
        "desk job medical certificate",
        "office sick leave",
      ],
    },
    faqs: [
      {
        q: "Will my corporate employer accept it?",
        a: "Yes. AHPRA-registered doctor certificates are valid for all Australian employers, including ASX-listed companies and government.",
      },
      {
        q: "Can I do this from work?",
        a: "Yes. The form takes 2 minutes. Complete it during a break. Your certificate arrives via email — forward to HR.",
      },
      {
        q: "How much does a medical certificate cost?",
        a: "A 1-day certificate is $19.95, 2-day is $29.95, and 3-day is $39.95. If the doctor cannot issue your certificate, you receive a full refund.",
      },
      {
        q: "Will HR see my diagnosis?",
        a: "No. The certificate confirms you were assessed and found unfit for work. It does not include your diagnosis, symptoms, or clinical notes. HR only sees what they need to process your leave.",
      },
      {
        q: "Can I use this for a mental health day?",
        a: "Yes. Mental health is covered under personal leave — the same entitlement as physical illness. Your certificate will not specify the nature of your condition.",
      },
      {
        q: "Are these certificates accepted by government employers?",
        a: "Yes. Commonwealth, state, and local government employers all accept certificates from AHPRA-registered doctors. Telehealth certificates carry the same legal weight as in-person ones.",
      },
      {
        q: "Can I get a carer's leave certificate?",
        a: "Yes. If you need time off to care for an unwell family member or household member, we can issue a carer's leave certificate that supports your leave application.",
      },
      {
        q: "What if my employer requires a certificate from day one?",
        a: "Some corporate policies require documentation for any absence. We issue certificates same-day, so you can have your documentation ready before you even email HR.",
      },
      {
        q: "Can I submit the certificate electronically?",
        a: "Yes. Your certificate is delivered as a secure PDF via email. Forwarding it to HR or uploading it to your leave management system is legally valid — no paper copy required.",
      },
      {
        q: "What happens if the doctor declines my request?",
        a: "You receive a full refund. The doctor may recommend you see a GP in person for a more thorough assessment.",
      },
    ],
    whyChoose: [
      {
        title: "No need to leave the office",
        desc: "Sick enough to stay home but need a cert? Do it from your couch. Or do it from your desk if you're in.",
      },
      {
        title: "HR accepts it",
        desc: "Corporate and government HR departments accept our certificates. Same as a GP's.",
      },
      {
        title: "Fits your schedule",
        desc: "Lunch break, before work, after work — whenever you have 2 minutes.",
      },
    ],
    testimonials: [
      { name: "Sarah L.", role: "Melbourne", quote: "Did it from my desk at lunch. HR accepted it straight away." },
      { name: "Tom W.", role: "Canberra", quote: "Employer accepted it, no questions. Didn't have to take time off to get it." },
    ],
    industryContext: [
      "For the millions of Australians who work in offices, getting sick often means a choice: drag yourself to work and infect your colleagues, or take a half-day off just to sit in a GP waiting room. Neither is a good option. Telehealth eliminates the paradox — get your certificate from your couch and email it to HR before your team even notices you're absent.",
      "Open-plan offices are incubators for respiratory infections. Studies show that cold and flu viruses spread 5x faster in open-plan environments. Your employer has a duty of care to other workers, which means coming to work sick isn't just unpleasant — it's counterproductive. A medical certificate from a telehealth consultation documents your absence and protects your leave balance.",
      "Many office workers also experience conditions related to sedentary work — back pain, neck pain, repetitive strain injuries, and eye strain. While these don't always require time off, a medical certificate can support a request for ergonomic adjustments or modified duties.",
    ],
    commonConditions: [
      { name: "Cold & Flu", slug: "cold-and-flu", why: "Open-plan offices accelerate virus transmission — you catch what your colleagues bring in" },
      { name: "Back Pain", slug: "back-pain", why: "Prolonged sitting with poor ergonomics is the leading cause of office-worker back pain" },
      { name: "Migraine", slug: "migraine", why: "Screens, fluorescent lighting, and air conditioning are common migraine triggers" },
      { name: "Stress", slug: "stress", why: "Workplace pressure and deadline-driven environments contribute to chronic stress" },
      { name: "Mental Health Day", slug: "mental-health-day", why: "Burnout from email overload, meetings, and always-on culture" },
    ],
    workplaceRights: [
      "Full-time office workers receive 10 days paid personal/carer's leave per year under the NES",
      "Most corporate employers require a certificate for 2+ consecutive days, but some require one from day one",
      "Your certificate can be submitted electronically — a PDF forwarded to HR is legally valid",
      "If you work from home while unwell, you are still entitled to take sick leave — you don't have to 'push through' just because you're at home",
    ],
  },
  parents: {
    slug: "parents",
    badgeLabel: "For Parents",
    h1: "Medical Certificates for Parents",
    heroSubtext:
      "When your child is sick, you need carer's leave — and sometimes a certificate. Get documentation for school or work online. No need to take a sick child to a clinic.",
    heroTagline: "Carer's leave • School absence • No clinic visit needed",
    icon: Users,
    metadata: {
      title: "Medical Certificates for Parents | Carer's Leave",
      description:
        "Parents: get a medical certificate for carer's leave or school absence when your child is sick. No need to take them to a clinic. Doctor-reviewed, usually under 1 hour.",
      keywords: [
        "medical certificate parents",
        "carers leave certificate",
        "sick child medical certificate",
        "school absence certificate",
      ],
    },
    faqs: [
      {
        q: "Can I get a certificate for my child's school absence?",
        a: "Yes. You complete the form on behalf of your child. The doctor assesses and may issue a certificate. Some cases may need a brief call.",
      },
      {
        q: "What about carer's leave for work?",
        a: "Yes. A carer's leave certificate documents that your child needed care. Your employer uses it to approve your leave.",
      },
      {
        q: "Do I need to take my child to a clinic?",
        a: "No. You describe their symptoms. For straightforward cases, we can issue documentation without a clinic visit. If they need urgent care, we'll advise.",
      },
      {
        q: "How much does it cost?",
        a: "A 1-day certificate is $19.95, 2-day is $29.95, and 3-day is $39.95. Full refund if the doctor is unable to issue the certificate.",
      },
      {
        q: "Will the certificate show my child's diagnosis?",
        a: "No. The certificate states that your child was assessed and found unfit for school or care. It does not include the specific diagnosis or clinical details.",
      },
      {
        q: "Can I use the same certificate for both school and my work?",
        a: "Yes. A single certificate documenting your child's illness covers their school absence and supports your carer's leave application at work. Two birds, one form.",
      },
      {
        q: "What age does my child need to be?",
        a: "We can issue certificates for children of any age. A parent or legal guardian completes the form on the child's behalf and provides details about their symptoms.",
      },
      {
        q: "Does my child need a Medicare card?",
        a: "No. Medicare is not required for medical certificates. You pay a flat fee and receive the certificate directly.",
      },
      {
        q: "Can I get a certificate for my own illness too?",
        a: "Yes. If you are also unwell — which happens often when kids bring something home — you can submit a separate request for your own certificate.",
      },
      {
        q: "What if the school requires a certificate for absences near holidays?",
        a: "Some schools request medical documentation for absences immediately before or after school holidays. Our certificates satisfy this requirement.",
      },
      {
        q: "Are online certificates accepted by daycare centres?",
        a: "Yes. Childcare centres, daycare, and early learning centres all accept certificates from AHPRA-registered doctors. The format is the same as any GP certificate.",
      },
      {
        q: "What happens if the doctor declines the request?",
        a: "You receive a full refund. The doctor may recommend you take your child to a GP in person for a more thorough assessment.",
      },
    ],
    whyChoose: [
      {
        title: "Sick kids shouldn't travel",
        desc: "The last thing a sick child needs is a trip to a clinic. Get your certificate from home.",
      },
      {
        title: "School and work sorted",
        desc: "One certificate can cover both — school absence and your carer's leave from work.",
      },
      {
        title: "Quick when you need it",
        desc: "Child woke up sick? Get your cert before you need to call work or the school.",
      },
    ],
    testimonials: [
      { name: "Jessica M.", role: "Sydney", quote: "Kid was too sick for school. Got the cert without dragging her to a clinic." },
      { name: "Chris D.", role: "Adelaide", quote: "Needed carer's leave for work. Sorted it online, HR accepted it." },
    ],
    industryContext: [
      "Carer's leave is one of the most underused workplace entitlements in Australia. Under the Fair Work Act, employees are entitled to use their personal leave to care for an immediate family member or household member who is unwell. This means you don't need separate 'carer's leave' — it comes from the same 10-day personal leave balance. Many parents don't realise a medical certificate for their child's illness also supports their own leave application.",
      "When your child wakes up sick, you're juggling three things simultaneously: caring for them, notifying their school, and telling your employer. Dragging a sick child to a GP waiting room adds a fourth. Telehealth lets you get a certificate from home while your child rests — often before you even need to call the school office.",
      "For parents of school-aged children, some schools require medical certificates for absences of 3+ days or for absences around school holidays. Our certificates cover the child's dates of illness and are accepted by all Australian schools. For your employer, the same certificate supports your carer's leave application.",
    ],
    commonConditions: [
      { name: "Cold & Flu", slug: "cold-and-flu", why: "Children bring home every virus from school and daycare — and pass it to parents" },
      { name: "Gastroenteritis", slug: "gastro", why: "Childcare and school outbreaks are common, and gastro spreads easily within families" },
      { name: "Mental Health Day", slug: "mental-health-day", why: "Parental burnout from juggling work, childcare, and household responsibilities" },
      { name: "Ear Infection", slug: "ear-infection", why: "Very common in children under 5 — may require your time off to care for them" },
    ],
    workplaceRights: [
      "You can use personal/carer's leave to care for an unwell immediate family member or household member",
      "Personal and carer's leave comes from the same 10-day annual balance under the NES",
      "Your employer can request evidence but cannot deny leave if you provide a certificate",
      "Part-time employees receive pro-rata personal leave (e.g. 3 days/week = 6 days leave/year)",
      "A single certificate covering your child's illness also supports your carer's leave application",
    ],
  },
  "remote-workers": {
    slug: "remote-workers",
    badgeLabel: "For Remote Workers",
    h1: "Medical Certificates for Remote Workers",
    heroSubtext:
      "Work from home? Live regionally? Get your medical certificate without leaving the house. Doctor-reviewed, usually under 1 hour. Accepted by all employers.",
    heroTagline: "From anywhere • No commute • All employers accept",
    icon: Laptop,
    metadata: {
      title: "Medical Certificates for Remote Workers",
      description:
        "Remote workers: get a medical certificate from home. No clinic visit, no commute. Doctor-reviewed, usually under 1 hour. Works for WFH and regional workers.",
      keywords: [
        "medical certificate remote workers",
        "work from home sick certificate",
        "regional medical certificate",
        "telehealth medical certificate",
      ],
    },
    faqs: [
      {
        q: "Do I need to see a doctor in person?",
        a: "No. Telehealth consultations are legally equivalent to in-person for medical certificates. Our doctors are AHPRA-registered.",
      },
      {
        q: "I live regionally — can I use this?",
        a: "Yes. Telehealth works anywhere in Australia with internet. Especially useful where GP access is limited.",
      },
      {
        q: "Will my employer accept it?",
        a: "Yes. Certificates from registered doctors are valid for all Australian employers, regardless of where you work from.",
      },
      {
        q: "How much does a certificate cost?",
        a: "A 1-day certificate is $19.95, 2-day is $29.95, and 3-day is $39.95. Full refund if the doctor cannot issue your certificate.",
      },
      {
        q: "Will my employer see my diagnosis?",
        a: "No. The certificate confirms you were assessed and found unfit for work. No diagnosis, no symptoms, no clinical notes. Your health information stays between you and the doctor.",
      },
      {
        q: "I work from home — do I really need a sick day?",
        a: "Yes. Working while unwell extends your recovery and reduces the quality of your output. You are entitled to sick leave whether you work from home or an office. Resting is not slacking.",
      },
      {
        q: "Can I get a certificate for a mental health day?",
        a: "Yes. Mental health is covered under personal leave — same as physical illness. The certificate does not specify the nature of your condition.",
      },
      {
        q: "I live regionally and can't get a GP appointment. Will this work?",
        a: "Yes. Telehealth works anywhere in Australia with internet access. Especially useful in areas where GP wait times can stretch to weeks.",
      },
      {
        q: "Can I get a carer's leave certificate?",
        a: "Yes. If you need time off to care for an unwell family member, we can issue a carer's leave certificate that supports your leave application.",
      },
      {
        q: "Can I submit the certificate digitally to my employer?",
        a: "Yes. The certificate is a secure PDF delivered to your email. Forward it to HR or upload it to your leave management system — no paper copy needed.",
      },
      {
        q: "What happens if the doctor declines my request?",
        a: "You receive a full refund. The doctor may recommend you visit a GP in person for a more thorough assessment.",
      },
    ],
    whyChoose: [
      {
        title: "You already work from home",
        desc: "Getting a certificate should be just as convenient. No need to leave the house.",
      },
      {
        title: "Regional access",
        desc: "Living outside the city? Telehealth brings healthcare to you.",
      },
      {
        title: "Same validity",
        desc: "Online certificates have the same legal standing as in-person. Employers accept them.",
      },
    ],
    testimonials: [
      { name: "Rachel K.", role: "Byron Bay", quote: "Couldn't get a local appointment for ages. Did it online from home." },
      { name: "Alex T.", role: "Melbourne", quote: "Sick and needed a cert. Did it from bed without getting up." },
    ],
    industryContext: [
      "Remote work has permanently changed healthcare access patterns. When your office is your spare room, 'popping out to the GP' means either a 30-minute drive or disrupting your entire day. And when you're working from a regional area or travelling, local GP availability may be limited. Telehealth is the natural healthcare model for remote workers — you're already online.",
      "A common misconception among remote workers is that because you can work from bed, you don't need a sick day. This is wrong and harmful. Working while unwell extends your recovery time, reduces the quality of your output, and normalises overwork. You are entitled to sick leave whether you work from home or an office. Taking a day off to recover is not being lazy — it's being sensible.",
      "For remote workers in regional Australia, telehealth may be the most practical option regardless of health status. GP availability in towns like Byron Bay, Noosa, or Margaret River can be severely limited, with wait times of weeks for non-urgent appointments. InstantMed provides same-day access from anywhere with internet.",
    ],
    commonConditions: [
      { name: "Back Pain", slug: "back-pain", why: "Home office ergonomics are often worse than corporate offices — dining chairs, laptop on couch" },
      { name: "Mental Health Day", slug: "mental-health-day", why: "Remote work isolation and blurred work-life boundaries contribute to burnout" },
      { name: "Insomnia", slug: "insomnia", why: "Screen time and lack of commute routine can disrupt sleep patterns" },
      { name: "Stress", slug: "stress", why: "Always-on culture and lack of physical separation between work and home" },
    ],
    workplaceRights: [
      "Remote workers have the same sick leave entitlements as office-based workers — 10 days per year under the NES",
      "You are entitled to take sick leave even when working from home — you don't have to 'just push through'",
      "Your employer can request a medical certificate but cannot deny leave if one is provided",
      "A telehealth certificate is especially appropriate for remote workers — it matches how you already work",
    ],
  },
  "gig-workers": {
    slug: "gig-workers",
    badgeLabel: "For Gig & Contract Workers",
    h1: "Medical Certificates for Gig Workers",
    heroSubtext:
      "Uber, Deliveroo, Airtasker — when you're sick you need documentation. Get your medical certificate online. No appointments, no waiting.",
    heroTagline: "No appointments • Usually under 1 hour • Platforms accept",
    icon: Car,
    metadata: {
      title: "Medical Certificates for Gig Workers",
      description:
        "Gig and contract workers: get a medical certificate when you're sick. Uber, Deliveroo, and other platforms accept our certificates. Doctor-reviewed, usually under 1 hour.",
      keywords: [
        "medical certificate gig workers",
        "uber driver sick certificate",
        "deliveroo medical certificate",
        "contractor sick leave",
      ],
    },
    faqs: [
      {
        q: "Do Uber/Deliveroo accept online certificates?",
        a: "Yes. Our certificates are from AHPRA-registered doctors and meet standard documentation requirements for Australian platforms.",
      },
      {
        q: "I don't get sick leave — do I still need a certificate?",
        a: "Some platforms require documentation for absences. Even without paid leave, a certificate documents your illness if needed.",
      },
      {
        q: "When are you available?",
        a: "8am-10pm AEST, 7 days a week. Submit when it suits you — between gigs or when you're resting.",
      },
      {
        q: "How much does a medical certificate cost?",
        a: "A 1-day certificate is $19.95, 2-day is $29.95, and 3-day is $39.95. Full refund if the doctor is unable to issue your certificate.",
      },
      {
        q: "I don't have an employer — why would I need a certificate?",
        a: "Certificates serve multiple purposes beyond employer leave: platform compliance for Uber and Deliveroo, income protection insurance claims, Centrelink mutual obligation evidence, and professional documentation for clients when deadlines slip.",
      },
      {
        q: "Will the certificate show my diagnosis?",
        a: "No. It confirms you were assessed by a doctor and found unfit for work. No diagnosis, no symptoms, no clinical details.",
      },
      {
        q: "Can I use this for a Centrelink mutual obligation exemption?",
        a: "A medical certificate can support your case for a temporary exemption from mutual obligations. Contact your Centrelink provider to confirm what documentation they require.",
      },
      {
        q: "Does this work for income protection insurance claims?",
        a: "Most income protection insurers require a medical certificate as evidence of inability to work. Our certificates include all standard details — doctor name, provider number, dates, and assessment.",
      },
      {
        q: "Can I get a certificate for a mental health day?",
        a: "Yes. Gig work isolation and income uncertainty take a real toll. Mental health is a valid reason for a certificate. The nature of your condition stays private.",
      },
      {
        q: "Are these certificates valid under the Fair Work Act?",
        a: "Yes. If you are later found to be an employee rather than a contractor, a certificate provides evidence of genuine illness. Either way, our certificates meet all legal requirements.",
      },
      {
        q: "Can I get a multi-day certificate?",
        a: "Yes. We issue certificates for 1, 2, or 3 days. For longer periods, the doctor may recommend an in-person assessment.",
      },
      {
        q: "What happens if the doctor declines my request?",
        a: "You receive a full refund. The doctor may suggest you see a GP in person for further assessment.",
      },
    ],
    whyChoose: [
      {
        title: "Your schedule is irregular",
        desc: "No 9-5 means no easy GP visits. We're available when you are.",
      },
      {
        title: "Platforms accept it",
        desc: "Major gig platforms accept AHPRA-registered doctor certificates.",
      },
      {
        title: "Quick when you need it",
        desc: "Sick today? Get your cert today. No waiting for an appointment.",
      },
    ],
    testimonials: [
      { name: "Jake M.", role: "Sydney", quote: "Couldn't work for 2 days. Got my cert and sent it through. Sorted." },
      { name: "Mia L.", role: "Brisbane", quote: "No sick leave so I needed documentation. Simple process, doctor was thorough." },
    ],
    industryContext: [
      "Gig workers — delivery drivers, rideshare operators, freelancers, and independent contractors — make up a growing segment of the Australian workforce, but they lack the safety net of paid sick leave. When you get sick, you don't earn. A medical certificate might seem pointless without paid leave, but it serves several important purposes: documenting absences for platform compliance, supporting insurance claims (if you have income protection), and providing evidence for Centrelink if illness prevents you from meeting mutual obligation requirements.",
      "For platform-based gig workers (Uber, DoorDash, Menulog, Airtasker), some platforms require documentation for extended absences or deactivation appeals. Having a medical certificate on file demonstrates that your downtime was genuine and not a performance issue. This is increasingly relevant as gig platforms implement rating and reliability systems.",
      "Freelancers and sole traders have a different challenge: no employer to report to, but clients who expect delivery. A medical certificate provides professional documentation when you need to push a deadline. It also supports any income protection insurance claim if you are unable to work for an extended period.",
    ],
    commonConditions: [
      { name: "Cold & Flu", slug: "cold-and-flu", why: "Driving, delivering, and working outdoors increases exposure — and you can't 'work from home'" },
      { name: "Back Pain", slug: "back-pain", why: "Delivery driving, cycling, and carrying packages cause musculoskeletal strain" },
      { name: "Mental Health Day", slug: "mental-health-day", why: "Gig work isolation, income uncertainty, and lack of workplace community take a toll" },
      { name: "Muscle Strain", slug: "muscle-strain", why: "Lifting, carrying, and physical delivery work without workplace OHS protections" },
    ],
    workplaceRights: [
      "Gig workers classified as independent contractors are NOT entitled to paid sick leave under the Fair Work Act",
      "If you are an employee misclassified as a contractor, you may have leave entitlements — seek advice from the Fair Work Ombudsman",
      "Medical certificates support Centrelink claims if illness prevents you from meeting mutual obligations",
      "Income protection insurance claims typically require a medical certificate as evidence of inability to work",
      "Platform deactivation appeals often require documentation — a medical certificate explains gaps in availability",
    ],
  },
}

export function getAudiencePageConfig(slug: string): AudiencePageConfig | undefined {
  return audiencePageConfigs[slug]
}

export function getAllAudiencePageSlugs(): string[] {
  return Object.keys(audiencePageConfigs)
}
