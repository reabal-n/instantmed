import { Article, defaultAuthor } from '../types'
import { blogImages } from '../images'

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
      { type: 'list', content: '', items: ['Original prescription = first supply', 'Each repeat = one additional supply', 'You collect repeats from the pharmacy when needed', 'Repeats have an expiry date (usually 12 months from original prescription)'] },
      { type: 'heading', content: 'How Many Repeats Can You Get?', level: 2 },
      { type: 'paragraph', content: 'The number of repeats depends on the medication and your condition:' },
      { type: 'list', content: '', items: ['Some medications: no repeats allowed', 'Short-term treatments: 0-2 repeats typical', 'Ongoing conditions: up to 5 repeats common', 'PBS medications have specific repeat limits', 'Controlled medications have stricter limits'] },
      { type: 'heading', content: 'When Repeats Run Out', level: 2 },
      { type: 'paragraph', content: 'When you\'ve used all your repeats, you\'ll need a new prescription. Options include:' },
      { type: 'list', content: '', items: ['See your regular GP', 'Use a telehealth service for eligible medications', 'Some pharmacists can provide emergency supplies in certain situations'] },
      { type: 'callout', variant: 'tip', content: 'Don\'t wait until you\'re completely out of medication to get a new prescription. Request a refill when you have about a week\'s supply left.' },
      { type: 'heading', content: 'Checking Your Repeats', level: 2 },
      { type: 'list', content: '', items: ['Check the "repeats remaining" on your eScript SMS', 'Ask your pharmacist when you collect medication', 'Check your Active Script List through MyGov (if set up)', 'Your pharmacy may send reminders'] },
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
      { title: 'GP Consultation', description: 'Discuss your medications', href: '/general-consult', icon: 'consult' }
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
      { type: 'heading', content: 'Controlled Medications (Schedule 8)', level: 2 },
      { type: 'paragraph', content: 'Schedule 8 medications are controlled drugs with potential for misuse or dependence. These generally require in-person consultations and have strict prescribing rules.' },
      { type: 'list', content: '', items: ['Strong opioid painkillers (morphine, oxycodone, fentanyl)', 'Stimulants for ADHD (dexamphetamine, methylphenidate)', 'Some anxiety medications (alprazolam)', 'Sleep medications with dependence risk'] },
      { type: 'callout', variant: 'info', content: 'Rules for controlled medications vary by state. Some states allow limited telehealth prescribing for established patients with ongoing treatment.' },
      { type: 'heading', content: 'Medications Requiring Specialist Prescribers', level: 2 },
      { type: 'list', content: '', items: ['Some psychiatric medications', 'Certain cancer treatments', 'Biologics for autoimmune conditions', 'Some HIV medications'] },
      { type: 'heading', content: 'Medications Needing Physical Assessment', level: 2 },
      { type: 'paragraph', content: 'Some conditions need examination before prescribing:' },
      { type: 'list', content: '', items: ['Medications for new, undiagnosed conditions', 'Treatments requiring blood pressure checks', 'Medications needing blood tests first', 'Injections requiring demonstration'] },
      { type: 'heading', content: 'What Telehealth CAN Prescribe', level: 2 },
      { type: 'paragraph', content: 'Most common medications can be prescribed via telehealth:' },
      { type: 'list', content: '', items: ['Antibiotics for diagnosed infections', 'Blood pressure medications (ongoing)', 'Cholesterol medications', 'Diabetes medications (ongoing)', 'Asthma and allergy medications', 'Contraceptives', 'Skin treatments', 'Many mental health medications'] },
      { type: 'heading', content: 'If You Need a Restricted Medication', level: 2 },
      { type: 'paragraph', content: 'You\'ll need to see a doctor in person, usually your regular GP or a specialist. Telehealth services will advise you when this is the case.' }
    ],
    faqs: [
      { question: 'Why can\'t some medications be prescribed online?', answer: 'Restrictions exist for safety — some medications need physical examination, have high misuse potential, or require specialist oversight.' },
      { question: 'Can I get my regular controlled medication via telehealth?', answer: 'It depends on your state and situation. Some states allow telehealth prescribing for established patients. Check with your usual prescriber.' },
      { question: 'What if I\'m travelling and need a controlled medication?', answer: 'Plan ahead with your regular doctor. They may provide extra supply or documentation. In emergencies, local GPs or hospitals may help.' }
    ],
    relatedServices: [
      { title: 'Prescription Request', description: 'Check if your medication is eligible', href: '/repeat-prescription', icon: 'prescription' },
      { title: 'GP Consultation', description: 'Discuss your medication needs', href: '/general-consult', icon: 'consult' }
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
      { type: 'heading', content: 'PBS Co-payment Amounts (2024)', level: 2 },
      { type: 'list', content: '', items: ['General patients: up to $31.60 per prescription', 'Concession card holders: up to $7.70 per prescription', 'Safety net thresholds reduce costs further for high users'] },
      { type: 'callout', variant: 'info', content: 'Co-payment amounts are updated each year on 1 January. Check the PBS website for current rates.' },
      { type: 'heading', content: 'Who Can Access PBS Pricing?', level: 2 },
      { type: 'list', content: '', items: ['Australian citizens', 'Permanent residents', 'Some visa holders', 'Visitors from countries with reciprocal healthcare agreements'] },
      { type: 'heading', content: 'PBS Safety Net', level: 2 },
      { type: 'paragraph', content: 'If you spend a lot on PBS medications, the Safety Net provides additional savings:' },
      { type: 'list', content: '', items: ['Track your spending with a Safety Net card from your pharmacy', 'Once you reach the threshold, costs reduce further', 'General threshold: $1,563.50 per year', 'Concession threshold: $262.80 per year'] },
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
      { title: 'Prescription Request', description: 'Request PBS-listed medications', href: '/repeat-prescription', icon: 'prescription' },
      { title: 'GP Consultation', description: 'Discuss medication options', href: '/general-consult', icon: 'consult' }
    ],
    seo: { title: 'Understanding the PBS | Pharmaceutical Benefits Scheme | InstantMed', description: 'The PBS subsidises prescription medications in Australia. Learn how it works, co-payment amounts, and how to access PBS pricing.', keywords: ['PBS', 'pharmaceutical benefits scheme', 'PBS medications', 'medication subsidy australia'] }
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
      { type: 'paragraph', content: 'When a pharmaceutical company develops a new medication, they hold a patent allowing exclusive sales for a period. Once the patent expires, other companies can make the same medication — these are called generics.', links: [{ text: 'generics', href: '/blog/pbs-pharmaceutical-benefits-scheme', title: 'PBS and medication costs' }] },
      { type: 'heading', content: 'What Makes Generics Different?', level: 2 },
      { type: 'paragraph', content: 'Generic medications contain the same active ingredient in the same dose as the brand name. Differences may include:' },
      { type: 'list', content: '', items: ['Different inactive ingredients (fillers, colours)', 'Different shape, size, or colour of tablet', 'Different packaging', 'Different name', 'Lower price'] },
      { type: 'heading', content: 'Are Generics as Effective?', level: 2 },
      { type: 'paragraph', content: 'Yes. In Australia, the Therapeutic Goods Administration (TGA) requires generics to be "bioequivalent" — meaning they work the same way in your body as the brand name version.' },
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
      { title: 'GP Consultation', description: 'Ask about your medications', href: '/general-consult', icon: 'consult' }
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
      { type: 'heading', content: 'Drug-Drug Interactions', level: 3 },
      { type: 'paragraph', content: 'One medication affects how another works. This can make medications stronger, weaker, or cause new side effects.' },
      { type: 'heading', content: 'Drug-Food Interactions', level: 3 },
      { type: 'paragraph', content: 'Some foods affect medication absorption or effectiveness. Common examples include grapefruit with certain medications, and dairy with some antibiotics.' },
      { type: 'heading', content: 'Drug-Supplement Interactions', level: 3 },
      { type: 'paragraph', content: 'Vitamins, minerals, and herbal supplements can interact with medications. St John\'s Wort, for example, affects many medications.' },
      { type: 'heading', content: 'Common Interactions to Know', level: 2 },
      { type: 'list', content: '', items: ['Blood thinners (warfarin) — many interactions with food and other medications', 'Grapefruit — affects cholesterol medications, some blood pressure drugs', 'Antacids — can reduce absorption of other medications', 'St John\'s Wort — affects antidepressants, contraceptives, many others', 'Alcohol — interacts with many medications'] },
      { type: 'callout', variant: 'warning', content: 'Always tell your doctor and pharmacist about all medications, supplements, and herbal products you take — even if they seem unrelated to your current health concern.' },
      { type: 'heading', content: 'Protecting Yourself', level: 2 },
      { type: 'list', content: '', items: ['Use one pharmacy when possible — they keep records', 'Keep an updated list of all your medications', 'Include over-the-counter medications and supplements', 'Ask about interactions when starting new medications', 'Read medication information leaflets', 'Don\'t stop medications without medical advice'] },
      { type: 'heading', content: 'Signs of an Interaction', level: 2 },
      { type: 'list', content: '', items: ['New or worsening side effects', 'Medication seems less effective', 'Unexpected symptoms after starting something new', 'Feeling unusually unwell'] }
    ],
    faqs: [
      { question: 'Do I need to mention vitamins and supplements?', answer: 'Yes. Many supplements interact with medications. Always include these in your medication list.' },
      { question: 'Can I check interactions myself?', answer: 'Some websites and apps check interactions, but they\'re not comprehensive. Always confirm with your pharmacist or doctor.' },
      { question: 'What if I forgot to mention a medication?', answer: 'Tell your doctor or pharmacist as soon as you remember. It\'s never too late to update your medication list.' }
    ],
    relatedServices: [
      { title: 'GP Consultation', description: 'Review your medications', href: '/general-consult', icon: 'consult' },
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
      { type: 'heading', content: 'General Storage Rules', level: 2 },
      { type: 'list', content: '', items: ['Store in a cool, dry place (unless refrigeration required)', 'Keep away from direct sunlight', 'Keep out of reach of children', 'Store in original packaging with label', 'Don\'t transfer to other containers'] },
      { type: 'heading', content: 'The Bathroom Myth', level: 2 },
      { type: 'paragraph', content: 'Despite the name "medicine cabinet," bathrooms are often poor storage locations. Heat and humidity from showers can degrade medications. A bedroom drawer or kitchen cupboard (away from the stove) is usually better.' },
      { type: 'callout', variant: 'tip', content: 'A cool, dark drawer or cupboard away from heat sources and moisture is ideal for most medications.' },
      { type: 'heading', content: 'Refrigerated Medications', level: 2 },
      { type: 'paragraph', content: 'Some medications need refrigeration:' },
      { type: 'list', content: '', items: ['Check the label or ask your pharmacist', 'Store in the main body of the fridge, not the door', 'Don\'t freeze unless instructed', 'Keep in original packaging', 'Check temperature if power outage occurs'] },
      { type: 'heading', content: 'Expiry Dates', level: 2 },
      { type: 'list', content: '', items: ['Check expiry dates regularly', 'Expired medications may be less effective', 'Some expired medications can be harmful', 'Don\'t use eye drops or liquids past expiry', 'When in doubt, don\'t use it'] },
      { type: 'heading', content: 'Disposing of Medications', level: 2 },
      { type: 'paragraph', content: 'Don\'t throw medications in the bin or flush them. Return unwanted or expired medications to your pharmacy for safe disposal through the Return Unwanted Medicines (RUM) program — it\'s free.' },
      { type: 'heading', content: 'Travelling with Medications', level: 2 },
      { type: 'list', content: '', items: ['Keep medications in carry-on luggage', 'Bring original packaging with labels', 'Carry a letter from your doctor for controlled medications', 'Check destination country\'s rules for restricted medications', 'Consider time zone changes for timing-sensitive medications'] }
    ],
    faqs: [
      { question: 'Can I use medication after the expiry date?', answer: 'Generally no. Expired medications may be less effective or potentially harmful. Some exceptions exist for solid medications stored correctly, but it\'s safest not to use expired medications.' },
      { question: 'Where can I dispose of old medications?', answer: 'Return them to any pharmacy. The RUM (Return Unwanted Medicines) program provides safe disposal at no cost.' },
      { question: 'My medication changed colour/texture — is it still okay?', answer: 'Changes in appearance may indicate degradation. Check with your pharmacist before using it.' }
    ],
    relatedServices: [
      { title: 'Prescription Request', description: 'Get fresh medication supply', href: '/repeat-prescription', icon: 'prescription' },
      { title: 'GP Consultation', description: 'Discuss your medications', href: '/general-consult', icon: 'consult' }
    ],
    seo: { title: 'Storing Medications Safely | Medication Storage Tips | InstantMed', description: 'Proper storage keeps medications effective and safe. Learn how to store, check expiry dates, and dispose of medications correctly.', keywords: ['medication storage', 'storing medicines', 'medication expiry', 'dispose medications australia'] }
  }
]
