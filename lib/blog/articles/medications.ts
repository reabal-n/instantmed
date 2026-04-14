import { blogImages } from '../images'
import { Article, defaultAuthor } from '../types'

export const medicationArticles: Article[] = [
  {
    slug: 'repeat-prescriptions-australia',
    title: 'Repeat Prescriptions in Australia',
    subtitle: 'Understanding how prescription repeats work and how to get them.',
    excerpt: 'Learn how repeat prescriptions work in Australia, when you can get them, and your options when repeats run out.',
    category: 'medications',
    publishedAt: '2024-11-01',
    updatedAt: '2026-01-15',
    readingTime: 3,
    viewCount: 42450,
    author: defaultAuthor,
    heroImage: blogImages.repeatPrescriptions,
    heroImageAlt: 'Prescription medication at pharmacy',
    content: [
      { type: 'paragraph', content: 'Repeat prescriptions allow you to get additional supplies of your medication without seeing a doctor each time. Understanding how they work helps you manage your medications effectively.', links: [{ text: 'manage your medications', href: '/blog/how-escripts-work', title: 'How eScripts work' }] },
      { type: 'heading', content: 'How Repeats Work', level: 2 },
      { type: 'paragraph', content: 'When a doctor prescribes medication, they can authorise a certain number of repeats. Each repeat allows you to get one more supply of the medication from the pharmacy.' },
      { type: 'table', content: '', headers: ['Supply type', 'What it is', 'How you get it'], rows: [
        ['Original prescription', 'First fill of the medication', 'Doctor sends eScript to your phone or gives you a paper script'],
        ['Each repeat', 'One additional supply per authorised repeat', 'Return to any pharmacy - they scan your eScript or hold your paper script'],
        ['Repeat expiry', 'Unused repeats expire 12 months from prescription date', 'Request a new prescription before expiry if repeats are unused'],
      ]},
      { type: 'heading', content: 'How Many Repeats Can You Get?', level: 2 },
      { type: 'table', content: '', headers: ['Medication type', 'Typical repeats allowed'], rows: [
        ['Short-term treatments (e.g. antibiotics)', '0-2 repeats'],
        ['Ongoing conditions (e.g. blood pressure, cholesterol)', 'Up to 5 repeats'],
        ['Controlled medications (Schedule 8)', 'Strict limits - often no repeats'],
        ['PBS-listed medications', 'Specific limits set by PBS rules'],
      ]},
      { type: 'heading', content: 'When Repeats Run Out', level: 2 },
      { type: 'paragraph', content: 'When you\'ve used all your repeats, you\'ll need a new prescription. Options include seeing your regular GP, using a telehealth service for eligible medications, or in some states a pharmacist can provide a limited emergency supply.' },
      { type: 'callout', variant: 'tip', content: 'Do not wait until you are completely out of medication. Request a refill when you have about a week\'s supply left.' },
      { type: 'heading', content: 'Checking Your Repeats', level: 2 },
      { type: 'steps', content: '', items: [
        'Check your eScript SMS - it shows how many repeats are remaining each time you fill.',
        'Ask your pharmacist when you collect your medication - they can see your full history.',
        'Set up the Active Script List through MyGov for a complete view of all your current scripts.',
        'Enable pharmacy reminders if your pharmacy offers them - many will contact you when a repeat is due.',
      ]},
      { type: 'heading', content: 'Expired Prescriptions', level: 2 },
      { type: 'paragraph', content: 'Prescriptions and their repeats typically expire 12 months from the date they were written. After this, you\'ll need a new prescription, even if you had repeats remaining.' }
    ],
    faqs: [
      { question: 'Can I get repeats from a different doctor?', answer: 'You\'ll need a new prescription from the new doctor. They can\'t add repeats to another doctor\'s prescription.' },
      { question: 'Can I get all my repeats at once?', answer: 'Generally no. PBS rules require appropriate intervals between supplies. However, if you\'re travelling, your doctor may provide an authority for early supply.' },
      { question: 'What if I lose my prescription with repeats?', answer: 'For eScripts, contact the prescribing doctor or service to resend. For paper scripts, you\'ll likely need a new prescription.' }
    ],
    relatedServices: [
      { title: 'Prescription Request', description: 'Request a prescription renewal', href: '/repeat-prescription', icon: 'prescription' },
      { title: 'GP Consultation', description: 'Discuss your medications', href: '/consult', icon: 'consult' }
    ],
    seo: { title: 'Repeat Prescriptions in Australia | How They Work | InstantMed', description: 'Learn how repeat prescriptions work in Australia, when you can get them, and your options when repeats run out.', keywords: ['repeat prescription', 'prescription repeats australia', 'medication refill', 'script repeats'] }
  },
  {
    slug: 'medications-not-prescribed-online',
    title: 'Medications That Can\'t Be Prescribed Online',
    subtitle: 'Understanding restrictions on telehealth prescribing.',
    excerpt: 'Some medications require in-person consultations. Learn which medications have restrictions and why.',
    category: 'medications',
    publishedAt: '2024-11-05',
    updatedAt: '2026-01-12',
    readingTime: 3,
    viewCount: 37820,
    author: defaultAuthor,
    heroImage: blogImages.medicationsNotOnline,
    heroImageAlt: 'Prescription medications with restrictions',
    content: [
      { type: 'paragraph', content: 'While telehealth can prescribe many medications, some have restrictions requiring in-person assessment. These restrictions exist for patient safety and regulatory compliance.', links: [{ text: 'telehealth', href: '/blog/is-telehealth-legal-australia', title: 'Telehealth regulations' }] },
      { type: 'heading', content: 'What Telehealth Can and Cannot Prescribe', level: 2 },
      { type: 'table', content: '', headers: ['Can be prescribed via telehealth', 'Requires in-person care'], rows: [
        ['Antibiotics for diagnosed infections', 'Schedule 8 controlled drugs (strong opioids, stimulants)'],
        ['Blood pressure medications (ongoing)', 'Medications requiring specialist prescriber authority'],
        ['Cholesterol medications', 'Treatments for new, undiagnosed conditions needing examination'],
        ['Diabetes medications (ongoing)', 'Medications requiring blood tests before prescribing'],
        ['Asthma and allergy medications', 'Biologics for autoimmune conditions'],
        ['Contraceptives', 'Some anxiety or sleep medications with dependence risk'],
        ['Skin treatments', 'Injections requiring demonstration'],
        ['Many mental health medications', ''],
      ]},
      { type: 'callout', variant: 'info', content: 'Rules for controlled medications vary by state. Some states allow limited telehealth prescribing for established patients with ongoing treatment. A telehealth service will advise you when in-person care is needed.' },
      { type: 'heading', content: 'If You Need a Restricted Medication', level: 2 },
      { type: 'paragraph', content: 'You\'ll need to see a doctor in person, usually your regular GP or a specialist. Telehealth services will advise you when this is the case.' }
    ],
    faqs: [
      { question: 'Why can\'t some medications be prescribed online?', answer: 'Restrictions exist for safety - some medications need physical examination, have high misuse potential, or require specialist oversight.' },
      { question: 'Can I get my regular controlled medication via telehealth?', answer: 'It depends on your state and situation. Some states allow telehealth prescribing for established patients. Check with your usual prescriber.' },
      { question: 'What if I\'m travelling and need a controlled medication?', answer: 'Plan ahead with your regular doctor. They may provide extra supply or documentation. In emergencies, local GPs or hospitals may help.' }
    ],
    relatedServices: [
      { title: 'Prescription Request', description: 'Check if your medication is eligible', href: '/repeat-prescription', icon: 'prescription' },
      { title: 'GP Consultation', description: 'Discuss your medication needs', href: '/consult', icon: 'consult' }
    ],
    seo: { title: 'Medications That Can\'t Be Prescribed Online | InstantMed', description: 'Some medications require in-person consultations. Learn which medications have telehealth restrictions and why.', keywords: ['medications not prescribed online', 'telehealth restrictions', 'controlled medications australia'] }
  },
  {
    slug: 'pbs-pharmaceutical-benefits-scheme',
    title: 'Understanding the PBS',
    subtitle: 'How the Pharmaceutical Benefits Scheme makes medications affordable.',
    excerpt: 'The PBS subsidises prescription medications in Australia. Learn how it works and how to access PBS pricing.',
    category: 'medications',
    publishedAt: '2024-11-10',
    updatedAt: '2026-01-10',
    readingTime: 3,
    viewCount: 29540,
    author: defaultAuthor,
    heroImage: blogImages.genericHealth,
    heroImageAlt: 'Subsidised medications through PBS',
    content: [
      { type: 'paragraph', content: 'The Pharmaceutical Benefits Scheme (PBS) is an Australian Government program that subsidises the cost of prescription medications, making them more affordable for everyone.', links: [{ text: 'prescription medications', href: '/blog/online-prescription-australia', title: 'Get a prescription online' }] },
      { type: 'heading', content: 'How the PBS Works', level: 2 },
      { type: 'paragraph', content: 'The government negotiates prices with pharmaceutical companies and pays part of the cost. You pay a set co-payment amount, and the government covers the rest.' },
      { type: 'heading', content: 'PBS Co-payment Amounts (2025-26)', level: 2 },
      { type: 'table', content: '', headers: ['Patient type', 'Co-payment per script', 'Who qualifies'], rows: [
        ['Concession card holder', 'Up to $7.70', 'Pensioner Concession Card, Health Care Card, Commonwealth Seniors Health Card'],
        ['General patient', 'Up to $31.60', 'All other Medicare-eligible patients'],
        ['Safety net (concession)', 'Free', 'After spending $262.80 in a calendar year'],
        ['Safety net (general)', 'Concession rate', 'After spending $1,563.50 in a calendar year'],
      ]},
      { type: 'callout', variant: 'info', content: 'Co-payment amounts are updated each year on 1 January. Check the PBS website for current rates.' },
      { type: 'heading', content: 'Who Can Access PBS Pricing?', level: 2 },
      { type: 'list', content: '', items: ['Australian citizens', 'Permanent residents', 'Some visa holders', 'Visitors from countries with reciprocal healthcare agreements'] },
      { type: 'heading', content: 'PBS Safety Net', level: 2 },
      { type: 'paragraph', content: 'If you spend a lot on PBS medications, the Safety Net provides additional savings. Track your spending with a Safety Net card from your pharmacy - ask for one if you do not already have it. Once you reach the annual threshold, costs reduce significantly for the rest of that calendar year.' },
      { type: 'heading', content: 'Non-PBS Medications', level: 2 },
      { type: 'paragraph', content: 'Not all medications are on the PBS. For non-PBS medications, you pay the full price. Your pharmacist can tell you if a medication is PBS-listed.' },
      { type: 'heading', content: 'Getting PBS Pricing', level: 2 },
      { type: 'list', content: '', items: ['Provide your Medicare card at the pharmacy', 'Concession card holders should show their card', 'The pharmacist applies the correct pricing automatically'] }
    ],
    faqs: [
      { question: 'Why is my medication not on the PBS?', answer: 'Not all medications are PBS-listed. New medications take time to be added. Some medications may be listed only for specific conditions.' },
      { question: 'Can I get PBS pricing without a Medicare card?', answer: 'You generally need Medicare eligibility. Visitors from some countries with reciprocal agreements may qualify.' },
      { question: 'What if I can\'t afford my medication?', answer: 'Ask your pharmacist about generic alternatives. Check if you qualify for a concession card. Some pharmaceutical companies have patient assistance programs.' }
    ],
    relatedServices: [
      { title: 'Prescription Request', description: 'Request PBS-listed medications', href: '/prescriptions', icon: 'prescription' },
      { title: 'GP Consultation', description: 'Discuss medication options', href: '/consult', icon: 'consult' }
    ],
    seo: { title: 'PBS Pharmaceutical Benefits Scheme Explained | InstantMed', description: 'PBS co-payments: $31.60 (general) or $7.70 (concession) per script. How the PBS works, safety net thresholds, and who qualifies for subsidised medications.', keywords: ['PBS', 'pharmaceutical benefits scheme', 'PBS medications', 'PBS co-payment', 'medication subsidy australia', 'PBS safety net'] }
  },
  {
    slug: 'generic-vs-brand-medications',
    title: 'Generic vs Brand Name Medications',
    subtitle: 'Are generic medications as good as brand names?',
    excerpt: 'Generic medications can save you money. Learn the difference between generic and brand name drugs and when generics are appropriate.',
    category: 'medications',
    publishedAt: '2024-11-15',
    updatedAt: '2026-01-08',
    readingTime: 3,
    viewCount: 18760,
    author: defaultAuthor,
    heroImage: blogImages.antibioticsGuide,
    heroImageAlt: 'Generic and brand name medication comparison',
    content: [
      { type: 'paragraph', content: 'When a pharmaceutical company develops a new medication, they hold a patent allowing exclusive sales for a period. Once the patent expires, other companies can make the same medication - these are called generics.', links: [{ text: 'generics', href: '/blog/pbs-pharmaceutical-benefits-scheme', title: 'PBS and medication costs' }] },
      { type: 'heading', content: 'Generic vs. Brand: What\'s the Same, What\'s Different', level: 2 },
      { type: 'table', content: '', headers: ['Feature', 'Generic', 'Brand name'], rows: [
        ['Active ingredient', 'Identical', 'Identical'],
        ['Dose and strength', 'Identical', 'Identical'],
        ['Bioequivalence (TGA-tested)', 'Required for approval', 'Original standard'],
        ['Inactive ingredients', 'May differ (fillers, dyes)', 'Original formulation'],
        ['Appearance (shape, colour)', 'Often different', 'Consistent'],
        ['Price', 'Usually lower', 'Higher'],
      ]},
      { type: 'heading', content: 'Are Generics as Effective?', level: 2 },
      { type: 'paragraph', content: 'Yes. In Australia, the Therapeutic Goods Administration (TGA) requires generics to be "bioequivalent" - meaning they work the same way in your body as the brand name version.' },
      { type: 'callout', variant: 'info', content: 'Generic medications must meet the same quality, safety, and efficacy standards as brand name medications to be approved in Australia.' },
      { type: 'heading', content: 'Why Are Generics Cheaper?', level: 2 },
      { type: 'list', content: '', items: ['No research and development costs to recover', 'Competition between manufacturers', 'PBS pricing policies encourage generic use', 'Lower marketing costs'] },
      { type: 'heading', content: 'When to Consider Brand Names', level: 2 },
      { type: 'paragraph', content: 'Most people can use generics without issue. However, in some situations, consistency may matter:' },
      { type: 'list', content: '', items: ['Medications with narrow therapeutic windows (epilepsy, thyroid)', 'If you\'ve had issues switching between brands', 'Some mental health medications where consistency helps', 'If your doctor specifically recommends a brand'] },
      { type: 'heading', content: 'Asking About Generics', level: 2 },
      { type: 'paragraph', content: 'You can ask your pharmacist if a generic is available. Under PBS rules, pharmacists must offer the cheapest available option, which is often a generic.' }
    ],
    faqs: [
      { question: 'Can I request the brand name instead of generic?', answer: 'Yes, but you may pay a brand premium on top of the PBS co-payment. Discuss with your pharmacist.' },
      { question: 'Why does my medication look different this time?', answer: 'Your pharmacy may have switched to a different generic manufacturer. The active ingredient is the same, but appearance may differ.' },
      { question: 'Should I always choose the cheapest option?', answer: 'For most medications, yes. If you have concerns about a specific medication, discuss with your doctor or pharmacist.' }
    ],
    relatedServices: [
      { title: 'Prescription Request', description: 'Discuss medication options', href: '/repeat-prescription', icon: 'prescription' },
      { title: 'GP Consultation', description: 'Ask about your medications', href: '/consult', icon: 'consult' }
    ],
    seo: { title: 'Generic vs Brand Name Medications | Are Generics Safe? | InstantMed', description: 'Generic medications can save money. Learn the difference between generic and brand name drugs and when generics are appropriate.', keywords: ['generic medications', 'generic vs brand', 'generic drugs australia', 'medication savings'] }
  },
  {
    slug: 'medication-interactions',
    title: 'Medication Interactions',
    subtitle: 'Why telling your doctor about all medications matters.',
    excerpt: 'Medications can interact with each other, food, and supplements. Learn about common interactions and how to stay safe.',
    category: 'medications',
    publishedAt: '2024-11-20',
    updatedAt: '2026-01-12',
    readingTime: 3,
    viewCount: 26390,
    author: defaultAuthor,
    heroImage: blogImages.medicationSideEffects,
    heroImageAlt: 'Multiple medications requiring interaction awareness',
    content: [
      { type: 'paragraph', content: 'When you take multiple medications, they can interact with each other in ways that change how they work or cause side effects. This is why it\'s important to tell your doctor and pharmacist about everything you take.' },
      { type: 'heading', content: 'Types of Interactions', level: 2 },
      { type: 'table', content: '', headers: ['Interaction type', 'What happens', 'Common examples'], rows: [
        ['Drug-drug', 'One medication makes another stronger, weaker, or causes new side effects', 'Blood thinners + aspirin; antidepressants + certain pain medications'],
        ['Drug-food', 'Food affects how a medication is absorbed or works', 'Grapefruit with cholesterol drugs; dairy with some antibiotics'],
        ['Drug-supplement', 'Herbal or vitamin products interfere with prescribed medications', 'St John\'s Wort with antidepressants and contraceptives; fish oil with blood thinners'],
        ['Drug-alcohol', 'Alcohol amplifies sedation, affects liver metabolism of medications', 'Sedatives, antihistamines, many pain medications'],
      ]},
      { type: 'callout', variant: 'warning', content: 'Always tell your doctor and pharmacist about all medications, supplements, and herbal products you take - even if they seem unrelated to your current health concern.' },
      { type: 'heading', content: 'Protecting Yourself', level: 2 },
      { type: 'steps', content: '', items: [
        'Use one pharmacy for all your medications when possible - they keep a complete record and can check for interactions automatically.',
        'Keep an up-to-date list of all your medications including doses, over-the-counter drugs, vitamins, and herbal supplements.',
        'Ask your pharmacist or doctor about interactions every time you start a new medication, including purchases from the supermarket.',
        'Read the medication information leaflet - interactions are listed. Do not ignore warnings.',
        'Never stop prescribed medications without medical advice - this can cause its own problems.',
      ]},
      { type: 'heading', content: 'Signs of an Interaction', level: 2 },
      { type: 'list', content: '', items: ['New or worsening side effects', 'Medication seems less effective', 'Unexpected symptoms after starting something new', 'Feeling unusually unwell'] }
    ],
    faqs: [
      { question: 'Do I need to mention vitamins and supplements?', answer: 'Yes. Many supplements interact with medications. Always include these in your medication list.' },
      { question: 'Can I check interactions myself?', answer: 'Some websites and apps check interactions, but they\'re not comprehensive. Always confirm with your pharmacist or doctor.' },
      { question: 'What if I forgot to mention a medication?', answer: 'Tell your doctor or pharmacist as soon as you remember. It\'s never too late to update your medication list.' }
    ],
    relatedServices: [
      { title: 'GP Consultation', description: 'Review your medications', href: '/consult', icon: 'consult' },
      { title: 'Prescription Request', description: 'Discuss your medication needs', href: '/repeat-prescription', icon: 'prescription' }
    ],
    seo: { title: 'Medication Interactions | Drug Safety | InstantMed', description: 'Medications can interact with each other, food, and supplements. Learn about common interactions and how to stay safe.', keywords: ['medication interactions', 'drug interactions', 'medication safety', 'drug food interactions'] }
  },
  {
    slug: 'storing-medications-safely',
    title: 'Storing Medications Safely',
    subtitle: 'Proper storage keeps medications effective and safe.',
    excerpt: 'Learn how to store medications correctly, check expiry dates, and dispose of old medications safely.',
    category: 'medications',
    publishedAt: '2024-11-25',
    updatedAt: '2026-01-10',
    readingTime: 3,
    viewCount: 41250,
    author: defaultAuthor,
    heroImage: blogImages.travelMedications,
    heroImageAlt: 'Safe medication storage at home',
    content: [
      { type: 'paragraph', content: 'Proper storage keeps medications effective and safe. Incorrect storage can reduce effectiveness or even make medications harmful.' },
      { type: 'heading', content: 'Storage by Location', level: 2 },
      { type: 'table', content: '', headers: ['Location', 'Suitable?', 'Why'], rows: [
        ['Cool, dry cupboard or drawer', 'Best option', 'Stable temperature, away from moisture and light'],
        ['Bathroom medicine cabinet', 'Avoid', 'Heat and humidity from showers degrade medications'],
        ['Kitchen cupboard (away from stove)', 'Good option', 'Cool and dry - just avoid near heat sources'],
        ['Fridge (if required)', 'Required for some', 'Store in main body, not door - more stable temperature'],
        ['Car glove box', 'Avoid', 'Extreme heat in Australian summers degrades medications fast'],
        ['Windowsill', 'Never', 'Direct sunlight breaks down most medications'],
      ]},
      { type: 'callout', variant: 'tip', content: 'The "bathroom medicine cabinet" is usually the worst place for medications - heat and humidity from showers can degrade them. A bedroom drawer is almost always better.' },
      { type: 'heading', content: 'Refrigerated Medications', level: 2 },
      { type: 'list', content: '', items: ['Check the label or ask your pharmacist if refrigeration is required', 'Store in the main body of the fridge, not the door - temperature is more stable', 'Do not freeze unless specifically instructed', 'Keep in original packaging to prevent moisture entry', 'Check temperature after a power outage - discard if unsure'] },
      { type: 'heading', content: 'Expiry Dates', level: 2 },
      { type: 'list', content: '', items: ['Check expiry dates regularly and dispose of anything expired', 'Expired medications may be less effective or harmful', 'Never use expired eye drops or liquid medications - highest risk of degradation', 'When in doubt, return it to the pharmacy and get a fresh supply'] },
      { type: 'heading', content: 'Disposing of Medications', level: 2 },
      { type: 'paragraph', content: 'Do not throw medications in the bin or flush them down the toilet. Return unwanted or expired medications to your pharmacy for safe disposal through the Return Unwanted Medicines (RUM) program - it is free and available at most Australian pharmacies.' },
      { type: 'heading', content: 'Travelling with Medications', level: 2 },
      { type: 'steps', content: '', items: [
        'Pack medications in your carry-on luggage - checked bags can be lost, and holds can experience extreme temperatures.',
        'Keep medications in their original packaging with the pharmacy label showing your name and dosage.',
        'Carry a letter from your doctor for controlled medications - some countries require documentation at customs.',
        'Check the destination country\'s rules for restricted medications before travelling - what is legal in Australia may not be elsewhere.',
        'Plan for time zone changes if your medications are time-sensitive - ask your doctor or pharmacist about adjusting the schedule.',
      ]}
    ],
    faqs: [
      { question: 'Can I use medication after the expiry date?', answer: 'Generally no. Expired medications may be less effective or potentially harmful. Some exceptions exist for solid medications stored correctly, but it\'s safest not to use expired medications.' },
      { question: 'Where can I dispose of old medications?', answer: 'Return them to any pharmacy. The RUM (Return Unwanted Medicines) program provides safe disposal at no cost.' },
      { question: 'My medication changed colour/texture - is it still okay?', answer: 'Changes in appearance may indicate degradation. Check with your pharmacist before using it.' }
    ],
    relatedServices: [
      { title: 'Prescription Request', description: 'Get fresh medication supply', href: '/repeat-prescription', icon: 'prescription' },
      { title: 'GP Consultation', description: 'Discuss your medications', href: '/consult', icon: 'consult' }
    ],
    seo: { title: 'Storing Medications Safely | Medication Storage Tips | InstantMed', description: 'Proper storage keeps medications effective and safe. Learn how to store, check expiry dates, and dispose of medications correctly.', keywords: ['medication storage', 'storing medicines', 'medication expiry', 'dispose medications australia'] }
  }
]
