/**
 * Competitor comparison articles - telehealth landscape and GP comparison
 * Target: Australians searching for telehealth service comparisons
 */

import { Article, contentAuthors, articleSeries } from '../types'
import { blogImages } from '../images'

export const competitorComparisonArticles: Article[] = [
  // Article 1: Best Online Doctor Services in Australia
  {
    slug: 'best-online-doctor-australia-comparison',
    title: 'Best Online Doctor Services in Australia (2026 Comparison)',
    subtitle:
      'An honest look at telehealth providers - including our own. Take our opinion with a grain of salt. Or a whole shaker.',
    excerpt:
      'We compared the major online doctor services in Australia across pricing, services, wait times, and patient experience. We built InstantMed, so we are obviously biased - here is our honest take on the landscape.',
    category: 'telehealth',
    tags: ['telehealth', 'online-doctor'],
    publishedAt: '2026-04-01',
    updatedAt: '2026-04-01',
    readingTime: 9,
    viewCount: 0,
    author: contentAuthors.marcusThompson,
    heroImage: blogImages.telehealthConsultation,
    heroImageAlt:
      'Laptop showing a telehealth consultation interface with Australian healthcare context',
    content: [
      {
        type: 'paragraph',
        content:
          'We built InstantMed, so let us get the obvious out of the way: we are biased. Every founder thinks their product is the best, and we are no different. But we also know the telehealth landscape well enough to respect what competitors do right - and honest enough to acknowledge what we do not do well. Here is our take on the major online doctor services available to Australians in 2026.',
      },
      {
        type: 'callout',
        variant: 'info',
        content:
          'Pricing and features listed here are based on publicly available information as of April 2026. Services update their offerings regularly, so check each provider directly for the latest details.',
      },
      {
        type: 'heading',
        content: 'The Major Players at a Glance',
        level: 2,
      },
      {
        type: 'paragraph',
        content:
          'Australia has a growing number of telehealth providers, each with a slightly different model. Some focus on video consultations, others on asynchronous (form-based) care. Some are generalists, others specialise in specific conditions. Here is how the key services compare on the metrics that actually matter.',
      },
      {
        type: 'list',
        content: 'Key comparison metrics across major providers:',
        items: [
          'InstantMed - Async (form-based), no appointment needed. Med certs from $19.95, repeat scripts from $29.95, consults from $49.95. AHPRA-registered doctors. 8am-10pm AEST, 7 days. No subscription.',
          'InstantConsult - Video telehealth with appointments. Similar pricing (~$35-55 per consult). More traditional model with scheduled video calls. Established player in the market.',
          'Rosemary Health - Prescription-focused (weight management, hair, skin, ED). Subscription model, ~$30-60 per consult. Strong in specialised treatment pathways.',
          'Eucalyptus (Pilot, Kin, Software, Juniper) - Multi-brand, subscription-focused. Pilot for men, Kin for women, Software for skin, Juniper for weight. Well-funded startup with specialised pathways for each brand.',
          'Youly - Women\'s health telehealth. Contraception, UTI treatment, and other women\'s health services. Focused offering for a specific audience.',
          'HotDoc - Primarily a GP booking platform with telehealth features. Connects you to your existing GP\'s practice. Not a standalone telehealth provider.',
          'Others (13SICK, MyHealth1st, Telehealth Dr) - Various models across the telehealth spectrum. Some offer after-hours GP access, others focus on booking infrastructure.',
        ],
      },
      {
        type: 'heading',
        content: 'InstantConsult',
        level: 2,
      },
      {
        type: 'paragraph',
        content:
          'InstantConsult is probably the closest to a traditional GP experience delivered online. They use video consultations, which means you actually speak with a doctor in real time. For people who value that face-to-face interaction - even through a screen - this is a genuine advantage. Their doctors can assess things visually, ask follow-up questions on the spot, and adjust their approach mid-consultation.',
      },
      {
        type: 'paragraph',
        content:
          'The trade-off is that you need to schedule an appointment and be available for the call. If you are filling out a form at midnight because you woke up sick and need a medical certificate for work tomorrow, InstantConsult requires you to wait for an available appointment slot. Their pricing is competitive, generally in the $35-55 range depending on the service.',
      },
      {
        type: 'paragraph',
        content:
          'Best for: People who want a video consultation and prefer real-time interaction with a doctor. If your situation is straightforward enough that a form covers it, you are paying for interaction you may not need.',
      },
      {
        type: 'heading',
        content: 'Rosemary Health',
        level: 2,
      },
      {
        type: 'paragraph',
        content:
          'Rosemary has carved out a solid niche in specialised prescribing pathways - particularly weight management, hair loss, skin conditions, and ED. Their subscription model means ongoing treatment is relatively seamless: your doctor monitors your progress and adjusts treatment over time. If you need ongoing management of a specific condition, this continuity has real clinical value.',
      },
      {
        type: 'paragraph',
        content:
          'The subscription model is not for everyone, though. If you just need a one-off repeat script or a medical certificate, paying for a subscription is like buying a gym membership to use the shower once. Their specialised pathways are genuinely good - they have clearly put thought into the clinical workflows - but the model assumes you want ongoing care.',
      },
      {
        type: 'paragraph',
        content:
          'Best for: People seeking ongoing treatment for specific conditions (weight, hair, skin). Less suitable for one-off requests or general medical certificates.',
      },
      {
        type: 'heading',
        content: 'Eucalyptus (Pilot, Kin, Software, Juniper)',
        level: 2,
      },
      {
        type: 'paragraph',
        content:
          'Eucalyptus is the most well-funded player in the Australian telehealth space, and it shows. Their multi-brand approach (Pilot for men\'s health, Kin for women\'s health, Software for skin, Juniper for weight management) means each brand can speak directly to its audience without trying to be everything to everyone. The user experience across their platforms is polished, and their treatment pathways are well-designed.',
      },
      {
        type: 'paragraph',
        content:
          'Like Rosemary, Eucalyptus is subscription-focused. This works brilliantly if you are on a long-term treatment plan, but less so for acute needs. They also do not offer general medical certificates or broad-scope consultations - each brand stays in its lane. If you need a med cert for work tomorrow and also want to start a treatment plan for something else, you are looking at two different services.',
      },
      {
        type: 'paragraph',
        content:
          'Best for: People who want a premium, well-designed experience for specific ongoing treatments. Their brand segmentation is clever but means you cannot get everything in one place.',
      },
      {
        type: 'heading',
        content: 'Youly',
        level: 2,
      },
      {
        type: 'paragraph',
        content:
          'Youly focuses exclusively on women\'s health - contraception, UTI treatment, and related services. There is real value in a service that understands its audience deeply rather than trying to serve everyone. Women dealing with recurrent UTIs or needing contraception refills know exactly what they need, and Youly makes that process efficient.',
      },
      {
        type: 'paragraph',
        content:
          'The limitation is obvious: if you are not seeking women\'s health services, Youly is not for you. But within their niche, they do it well.',
      },
      {
        type: 'heading',
        content: 'HotDoc',
        level: 2,
      },
      {
        type: 'paragraph',
        content:
          'HotDoc is a different beast entirely. It is primarily a booking platform that connects patients with existing GP practices. Many GPs offer telehealth through HotDoc, which means you can see your own regular GP via video call. This continuity of care is genuinely valuable - your GP knows your history, your medications, and your context.',
      },
      {
        type: 'paragraph',
        content:
          'The downside is availability. Your specific GP might not have telehealth slots when you need one, and you are still subject to whatever pricing and availability your practice offers. HotDoc is not a telehealth provider - it is a bridge to your existing GP.',
      },
      {
        type: 'paragraph',
        content:
          'Best for: People who want to see their regular GP via telehealth. Not a replacement for standalone telehealth when your GP is unavailable or you do not have one.',
      },
      {
        type: 'heading',
        content: 'InstantMed - Our Own Honest Assessment',
        level: 2,
      },
      {
        type: 'paragraph',
        content:
          'Right, the bit where we talk about ourselves. InstantMed uses an asynchronous model: you fill in a detailed form, and an AHPRA-registered doctor reviews your request within hours. No appointment, no video call, no sitting in a virtual waiting room. For straightforward requests - medical certificates, repeat prescriptions, common conditions - this is genuinely faster and more convenient than booking a video consult.',
      },
      {
        type: 'paragraph',
        content:
          'Our pricing is transparent and competitive: med certs from $19.95, repeat scripts from $29.95, consults from $49.95. No subscriptions, no ongoing fees. You pay for what you need, when you need it. We are available 8am to 10pm AEST, seven days a week.',
      },
      {
        type: 'paragraph',
        content:
          'Now the limitations, because every service has them. We do not offer video consultations - if your situation needs real-time discussion, we are not the right choice. We cannot prescribe Schedule 8 (controlled) substances. We do not bulk bill. And for anything requiring a physical examination, you need to see a GP in person. We are not trying to replace your GP - we are trying to handle the straightforward stuff so your GP can focus on the complex stuff.',
      },
      {
        type: 'callout',
        variant: 'tip',
        content:
          'If you are unsure whether your situation suits async telehealth, a good rule of thumb: if you could explain everything a doctor needs to know in a detailed form, async works well. If you need back-and-forth discussion, consider a video consult or in-person visit.',
      },
      {
        type: 'heading',
        content: 'How to Choose the Right Service',
        level: 2,
      },
      {
        type: 'paragraph',
        content:
          'The best telehealth service depends entirely on what you need. There is no single "best" - just the best fit for your situation right now.',
      },
      {
        type: 'list',
        content: 'A quick decision guide:',
        items: [
          'Need a medical certificate for work or study? A generalist service like InstantMed or InstantConsult will be most cost-effective.',
          'Need a repeat prescription for a medication you are already taking? Any generalist telehealth provider can handle this, provided it is not a controlled substance.',
          'Want ongoing treatment for weight, hair, skin, or ED? Subscription services like Rosemary or Eucalyptus are designed for this.',
          'Prefer video consultations? InstantConsult or your GP via HotDoc.',
          'Want to see your regular GP online? HotDoc is your best bet.',
          'Need women\'s health services specifically? Youly or Kin (Eucalyptus) are focused on this.',
          'Need something urgent or complex? See a GP in person, or call 000 for emergencies.',
        ],
      },
      {
        type: 'heading',
        content: 'A Note on Quality and Safety',
        level: 2,
      },
      {
        type: 'paragraph',
        content:
          'Every telehealth provider listed here uses AHPRA-registered doctors bound by the same prescribing rules, clinical standards, and professional obligations as any GP you would see in a clinic. The delivery model differs, but the regulatory framework does not. A doctor reviewing your request through InstantMed has exactly the same obligations as one you see face-to-face.',
      },
      {
        type: 'paragraph',
        content:
          'That said, telehealth has inherent limitations. No online service can replace a physical examination when one is needed. Responsible telehealth providers - including us - will decline requests that require in-person assessment and refer you appropriately. If a service never declines or never suggests you see someone in person, that is a red flag worth noting.',
      },
      {
        type: 'heading',
        content: 'The Bottom Line',
        level: 2,
      },
      {
        type: 'paragraph',
        content:
          'The Australian telehealth market is competitive, which is good for patients. Each service has found its niche: InstantConsult in video consultations, Eucalyptus and Rosemary in specialised subscriptions, Youly in women\'s health, HotDoc as a bridge to your GP, and InstantMed in async, no-appointment care for straightforward requests. The best choice is the one that matches what you actually need.',
      },
      {
        type: 'paragraph',
        content:
          'And if none of these suit your situation? See your GP. Seriously. Telehealth is a complement to traditional healthcare, not a replacement for it.',
      },
    ],
    faqs: [
      {
        question: 'Which online doctor service is cheapest in Australia?',
        answer:
          'Pricing varies by service type. For medical certificates, InstantMed starts at $19.95. For general consultations, most providers charge between $35 and $60. Subscription services may offer lower per-consult costs for ongoing treatment but require a commitment. Bulk-billed GP telehealth through HotDoc can be free if your GP offers it.',
      },
      {
        question:
          'Are online doctors in Australia legitimate?',
        answer:
          'Yes. All reputable telehealth providers in Australia use AHPRA-registered doctors who are bound by the same standards and regulations as GPs in a clinic. Check that any service you use clearly states their doctors are AHPRA-registered.',
      },
      {
        question:
          'Can online doctors prescribe any medication?',
        answer:
          'Online doctors can prescribe most medications, but not Schedule 8 (controlled) substances like strong opioids or certain stimulants. These require an in-person consultation. Each telehealth provider may also have additional clinical policies about what they will and will not prescribe.',
      },
      {
        question:
          'Do I need a Medicare card to use telehealth in Australia?',
        answer:
          'It depends on the service. InstantMed does not require Medicare for medical certificates but does for prescriptions and consultations. Some services bulk bill through Medicare, while others are private-pay only. Check with each provider.',
      },
      {
        question:
          'What is the difference between async and video telehealth?',
        answer:
          'Async (asynchronous) telehealth means you fill out a detailed form and a doctor reviews it without a real-time conversation. Video telehealth is a live video call with a doctor. Async is more convenient for straightforward requests; video is better when your situation needs discussion or visual assessment.',
      },
      {
        question:
          'Can I use telehealth for my children?',
        answer:
          'Most telehealth providers focus on adults (18+). Children generally need to be seen by a GP in person, especially for prescriptions. Some video-based services may consult on children\'s health with parental consent, but check each provider\'s age policies.',
      },
    ],
    relatedServices: [
      {
        title: 'Medical Certificate',
        description: 'Get a medical certificate from $19.95',
        href: '/medical-certificate/sick-leave',
        icon: 'certificate',
      },
      {
        title: 'Repeat Prescription',
        description: 'Renew your prescription online',
        href: '/repeat-prescriptions',
        icon: 'prescription',
      },
      {
        title: 'GP Consultation',
        description: 'Consult with a doctor online',
        href: '/consult',
        icon: 'consult',
      },
    ],
    relatedArticles: [
      'telehealth-vs-gp-honest-comparison',
      'what-is-telehealth',
      'telehealth-privacy-security',
    ],
    series: {
      ...articleSeries['telehealth-guide'],
      order: 5,
    },
    seo: {
      title:
        'Best Online Doctor Services in Australia (2026 Comparison) | InstantMed',
      description:
        'Honest comparison of Australia\'s top online doctor services - InstantMed, InstantConsult, Rosemary Health, Eucalyptus, Youly, and HotDoc. Pricing, features, and who each is best for.',
      keywords: [
        'best online doctor australia',
        'cheapest online doctor',
        'telehealth comparison australia',
        'online doctor reviews',
        'instantconsult vs instantmed',
        'eucalyptus telehealth',
        'rosemary health review',
        'telehealth australia 2026',
        'online doctor services australia',
      ],
    },
  },

  // Article 2: InstantMed vs Going to the GP
  {
    slug: 'telehealth-vs-gp-honest-comparison',
    title: 'InstantMed vs Going to the GP: An Honest Comparison',
    subtitle:
      'Different tools for different situations. We are not trying to replace your GP - and here is why.',
    excerpt:
      'An honest look at when telehealth makes sense and when you should see your GP in person. Spoiler: the answer is usually "use both."',
    category: 'telehealth',
    tags: ['telehealth', 'online-doctor'],
    publishedAt: '2026-04-01',
    updatedAt: '2026-04-01',
    readingTime: 8,
    viewCount: 0,
    author: contentAuthors.jamesPatel,
    heroImage: blogImages.telehealthVsInPerson,
    heroImageAlt:
      'Split image showing a telehealth consultation on one side and a GP clinic on the other',
    content: [
      {
        type: 'paragraph',
        content:
          'Let us get this out of the way upfront: InstantMed is not trying to replace your GP. We do not want to, and frankly, we could not even if we tried. Your GP is a cornerstone of the Australian healthcare system - someone who knows your history, manages your ongoing care, and can physically examine you when needed. What we are trying to do is handle the straightforward stuff so you do not have to take a half-day off work to get a medical certificate for the cold you obviously have.',
      },
      {
        type: 'paragraph',
        content:
          'This is an honest comparison. We will tell you when telehealth is genuinely better, when the GP is genuinely better, and when the answer is "it depends." We will use real numbers, not marketing spin.',
      },
      {
        type: 'heading',
        content: 'When Telehealth Wins',
        level: 2,
      },
      {
        type: 'paragraph',
        content:
          'There are situations where dragging yourself to a GP clinic is unnecessary, inconvenient, or borderline absurd. These are telehealth\'s strengths.',
      },
      {
        type: 'list',
        content: '',
        items: [
          'Convenience - You are sick in bed and need a medical certificate. Getting dressed, driving to a clinic, sitting in a waiting room full of other sick people, then driving home does not make you better faster. It just makes you more miserable.',
          'Cost predictability - You know exactly what you will pay before you start. No wondering whether your GP charges a gap, how much the gap is, or whether the receptionist will surprise you at checkout.',
          'No waiting rooms - The average GP waiting time in Australia is 20-40 minutes, on top of whatever time it took to get there. With async telehealth, you fill in a form when it suits you and get on with your day.',
          'After-hours access - InstantMed is available 8am to 10pm AEST, seven days a week. Many GP clinics close at 5pm on weekdays and are not open on weekends. After-hours clinics exist but often have long waits.',
          'Rural and remote access - If the nearest GP is an hour\'s drive away, telehealth for a straightforward request is not just convenient - it is practical.',
          'Repeat prescriptions - You have been on the same medication for years. Your doctor has reviewed it recently. You just need the script renewed. A 15-minute GP appointment for a 30-second clinical decision is not a good use of anyone\'s time.',
        ],
      },
      {
        type: 'heading',
        content: 'When the GP Wins',
        level: 2,
      },
      {
        type: 'paragraph',
        content:
          'There are situations where no amount of technology can replace a doctor who can see you, touch you, listen to your chest, and look in your ears. These are the GP\'s strengths, and they are not trivial.',
      },
      {
        type: 'list',
        content: '',
        items: [
          'Physical examinations - Telehealth cannot listen to your lungs, feel a lump, check your blood pressure, or look at a rash properly. If your situation needs hands-on assessment, see a GP.',
          'Complex or ongoing conditions - Diabetes management, heart disease, mental health that needs close monitoring. Your GP\'s longitudinal knowledge of your health is irreplaceable.',
          'Children - Kids under 18 generally need in-person consultations, especially for prescriptions. Their symptoms can change quickly, and visual and physical assessment matters more.',
          'Controlled substances - Schedule 8 medications (strong painkillers, certain ADHD medications, etc.) cannot be prescribed via telehealth. Full stop.',
          'Procedures - Skin checks, wound care, injections, minor surgery. Obvious, but worth stating.',
          'New or concerning symptoms - If something is new, unusual, or worrying you, a GP who can examine you is the right call. Telehealth is better for known, straightforward conditions.',
          'Health assessments and screening - Medicare-funded health assessments, pap smears, vaccination programs. These are designed for in-person care.',
        ],
      },
      {
        type: 'heading',
        content: 'The Real Cost Breakdown',
        level: 2,
      },
      {
        type: 'paragraph',
        content:
          'Cost is one of the most common reasons people consider telehealth, so let us look at the actual numbers rather than vague claims.',
      },
      {
        type: 'list',
        content: 'What you actually pay:',
        items: [
          'Bulk-billed GP - Free to the patient. Medicare covers the full cost. The catch: finding a bulk-billing GP is increasingly difficult, especially in metro areas. Many practices have shifted to mixed or private billing.',
          'Private GP (with Medicare rebate) - Total fee typically $60-120. Medicare rebates ~$41 for a standard consult, leaving you with a gap of $20-80 out of pocket. Some practices charge more.',
          'After-hours GP clinic - Gap payments are often higher, typically $40-100+ out of pocket after Medicare rebate.',
          'InstantMed medical certificate - $19.95 to $39.95 depending on duration (1-3 days). No Medicare rebate, but the total cost is often less than a private GP gap payment.',
          'InstantMed repeat prescription - $29.95. Again, no Medicare rebate, but predictable and often comparable to or less than a private GP gap.',
          'InstantMed general consultation - $49.95. This is where the comparison gets closer to GP pricing. For a complex issue, a bulk-billed GP is clearly cheaper (free). For a straightforward issue at a private GP, it is roughly comparable.',
          'Specialised InstantMed consultations - $49.95 to $89.95 depending on the type. Competitive with private GP pricing for equivalent services.',
        ],
      },
      {
        type: 'callout',
        variant: 'info',
        content:
          'The hidden cost most people forget: time. A GP visit including travel, waiting, and the appointment itself typically takes 1-2 hours. If you earn $30-50 per hour, that time has real value - especially for a 5-minute interaction.',
      },
      {
        type: 'heading',
        content: 'The GP Shortage Reality',
        level: 2,
      },
      {
        type: 'paragraph',
        content:
          'Here is the elephant in the room: many Australians cannot get in to see a GP when they need to. The Royal Australian College of General Practitioners has been sounding the alarm for years. GP numbers are declining relative to population growth, bulk billing rates are falling, and rural areas are particularly affected.',
      },
      {
        type: 'paragraph',
        content:
          'In some areas, the wait for a non-urgent GP appointment is measured in weeks, not days. If you wake up sick on a Monday and cannot get a GP appointment until Thursday, what do you do? You either go to work sick (bad for everyone), use an after-hours clinic (expensive, long waits), visit an emergency department for a non-emergency (please do not), or use telehealth.',
      },
      {
        type: 'paragraph',
        content:
          'This is not a criticism of GPs. They are overworked, underfunded, and dealing with increasing demand. Telehealth can take some of the straightforward, low-complexity work off their plate - freeing them to spend more time on patients who genuinely need in-person care.',
      },
      {
        type: 'heading',
        content: 'Quality and Safety: Same Rules, Different Delivery',
        level: 2,
      },
      {
        type: 'paragraph',
        content:
          'A question we get regularly: "Is an online doctor as good as a real doctor?" The answer is that an online doctor is a real doctor. AHPRA-registered, with the same qualifications, the same prescribing authority, and the same professional obligations. The difference is delivery method, not quality of care.',
      },
      {
        type: 'paragraph',
        content:
          'That said, delivery method matters. A GP who can examine you will always have more clinical information available than a doctor reviewing a form. For straightforward situations, that additional information would not change the outcome. For complex situations, it absolutely could. Good telehealth providers recognise this boundary and decline requests that need in-person assessment.',
      },
      {
        type: 'callout',
        variant: 'warning',
        content:
          'Any telehealth service that claims to handle everything a GP can is overpromising. If a provider never declines requests or suggests in-person follow-up, question their clinical governance.',
      },
      {
        type: 'heading',
        content: 'The Best Approach: Use Both',
        level: 2,
      },
      {
        type: 'paragraph',
        content:
          'The smartest approach is not choosing between telehealth and a GP - it is using both for what each does best. Keep your regular GP for ongoing care, annual check-ups, complex conditions, and anything that needs physical examination. Use telehealth for straightforward, acute needs that do not require hands-on assessment.',
      },
      {
        type: 'list',
        content: 'A practical framework:',
        items: [
          'Regular GP check-ups (annually or as recommended) - See your GP',
          'Ongoing chronic condition management - See your GP',
          'Sick with a cold and need a certificate for work - Telehealth',
          'Need a repeat script for a stable medication - Telehealth',
          'New symptom you are worried about - See your GP',
          'Something that needs examination (rash, lump, pain) - See your GP',
          'Cannot get a GP appointment for a straightforward issue - Telehealth',
          'After-hours need that is not an emergency - Telehealth or after-hours clinic',
          'Emergency - Call 000. Not telehealth, not a GP clinic.',
        ],
      },
      {
        type: 'paragraph',
        content:
          'This is not an either/or decision. The Australian healthcare system works best when each part does what it is designed for. GPs provide comprehensive, longitudinal care. Telehealth provides accessible, convenient care for straightforward needs. Emergency departments handle emergencies. Everyone stays in their lane, and patients get better outcomes.',
      },
      {
        type: 'heading',
        content: 'What We Would Tell a Friend',
        level: 2,
      },
      {
        type: 'paragraph',
        content:
          'If a friend asked us "should I use InstantMed or see my GP?", we would ask one question: what do you need? If the answer is a medical certificate for a day off sick or a repeat of a medication they are already taking, we would say use InstantMed. If the answer involves anything that requires examination, ongoing management, or clinical complexity, we would say see your GP.',
      },
      {
        type: 'paragraph',
        content:
          'That is not a sales pitch. It is just the practical answer.',
      },
    ],
    faqs: [
      {
        question: 'Is an online doctor as qualified as my GP?',
        answer:
          'Yes. All doctors on reputable telehealth platforms are AHPRA-registered, with the same qualifications and professional obligations as your GP. The difference is the delivery method (online vs in-person), not the quality or training of the doctor.',
      },
      {
        question: 'Can telehealth replace my regular GP?',
        answer:
          'No, and it should not try to. Telehealth is best for straightforward, acute needs like medical certificates and repeat prescriptions. Your regular GP provides ongoing, longitudinal care that telehealth cannot replicate - they know your history and can examine you physically.',
      },
      {
        question: 'Is telehealth cheaper than seeing a GP?',
        answer:
          'It depends. A bulk-billed GP is free, which is cheaper than any telehealth service. But if your GP charges a gap (common in many areas), the out-of-pocket cost is often $20-80+. InstantMed medical certificates start at $19.95 - often less than a private GP gap payment. Factor in the time saved, and the real cost comparison shifts further.',
      },
      {
        question:
          'What if the online doctor thinks I need to see someone in person?',
        answer:
          'Responsible telehealth providers will decline your request and recommend you see a GP in person. This is not a bad outcome - it means the system is working as intended. You will receive a full refund if your request is declined.',
      },
      {
        question: 'Can I use telehealth if I do not have a Medicare card?',
        answer:
          'Yes. InstantMed does not require Medicare for medical certificates. For prescriptions and consultations, a Medicare card is required. Some other telehealth services have different policies - check with each provider.',
      },
      {
        question: 'Should I tell my GP I used telehealth?',
        answer:
          'It is a good idea, especially if you received a prescription. Your GP can add it to your medical record, which helps them maintain a complete picture of your health. Telehealth is meant to complement your GP, not work around them.',
      },
    ],
    relatedServices: [
      {
        title: 'Medical Certificate',
        description: 'Get a medical certificate without a clinic visit',
        href: '/medical-certificate/sick-leave',
        icon: 'certificate',
      },
      {
        title: 'Repeat Prescription',
        description: 'Renew your prescription online',
        href: '/repeat-prescriptions',
        icon: 'prescription',
      },
      {
        title: 'GP Consultation',
        description: 'Consult an AHPRA-registered doctor',
        href: '/consult',
        icon: 'consult',
      },
    ],
    relatedArticles: [
      'best-online-doctor-australia-comparison',
      'what-is-telehealth',
      'prepare-for-telehealth',
    ],
    series: {
      ...articleSeries['telehealth-guide'],
      order: 6,
    },
    seo: {
      title:
        'InstantMed vs Going to the GP: An Honest Comparison | InstantMed',
      description:
        'When should you use telehealth and when should you see your GP? An honest comparison of online doctors vs in-person GP visits - pricing, quality, convenience, and limitations.',
      keywords: [
        'online doctor vs gp australia',
        'telehealth vs in person doctor',
        'should i see a gp or use telehealth',
        'telehealth vs gp cost',
        'online doctor quality australia',
        'telehealth limitations',
        'gp shortage australia',
        'telehealth complement gp',
      ],
    },
  },
]
