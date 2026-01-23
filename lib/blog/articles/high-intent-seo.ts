import { Article, contentAuthors } from '../types'
import { blogImages } from '../images'

export const highIntentSeoArticles: Article[] = [
  {
    slug: 'medical-certificate-for-work',
    title: 'Medical Certificates for Work: Complete Guide',
    subtitle: 'Everything you need to know about getting a medical certificate for your employer.',
    excerpt: 'Need a medical certificate for work? Learn what employers can ask for, your rights, and how to get one quickly in Australia.',
    category: 'medical-certificates',
    tags: ['medical-certificate', 'work', 'sick-leave', 'employer'],
    publishedAt: '2026-01-20',
    updatedAt: '2026-01-23',
    readingTime: 4,
    viewCount: 0,
    author: contentAuthors.emmaWilson,
    heroImage: blogImages.medCertWork,
    heroImageAlt: 'Professional reviewing workplace documentation',
    content: [
      {
        type: 'paragraph',
        content: 'A medical certificate is a document from a registered health practitioner confirming you\'re unfit for work due to illness or injury. Most Australian employers will ask for one if you take sick leave, especially for absences longer than a day or two.',
        links: [{ text: 'sick leave', href: '/blog/sick-leave-rights-australia', title: 'Your sick leave rights' }]
      },
      { type: 'heading', content: 'When Do You Need a Medical Certificate?', level: 2 },
      {
        type: 'paragraph',
        content: 'Your employer\'s policy determines when you need a certificate. Common requirements include:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Absences of two or more consecutive days',
          'Any absence on a Monday, Friday, or adjacent to public holidays',
          'If you\'ve had multiple short absences recently',
          'When your workplace policy specifically requires one',
          'For workers\' compensation claims'
        ]
      },
      {
        type: 'callout',
        variant: 'info',
        content: 'Check your employment contract or workplace policy for specific requirements. If it\'s not clear, a quick question to HR can save confusion.'
      },
      { type: 'heading', content: 'What Should a Medical Certificate Include?', level: 2 },
      {
        type: 'paragraph',
        content: 'A valid medical certificate for work should contain:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Your full name',
          'Date of the consultation',
          'Statement that you\'re unfit for work',
          'The dates you\'re covered for',
          'The practitioner\'s name, signature, and registration details',
          'Practice contact information'
        ]
      },
      {
        type: 'callout',
        variant: 'tip',
        content: 'Your certificate does NOT need to include your diagnosis. "Medical condition" is sufficient, and your employer cannot demand more detail.'
      },
      { type: 'heading', content: 'What Employers Can and Can\'t Ask', level: 2 },
      { type: 'heading', content: 'Employers CAN:', level: 3 },
      {
        type: 'list',
        content: '',
        items: [
          'Request a medical certificate as evidence',
          'Ask when you expect to return',
          'Request a fitness for work clearance for safety-critical roles'
        ]
      },
      { type: 'heading', content: 'Employers CANNOT:', level: 3 },
      {
        type: 'list',
        content: '',
        items: [
          'Demand to know your specific diagnosis',
          'Require you to see a specific doctor',
          'Contact your doctor without your consent',
          'Reject a valid certificate from a registered practitioner'
        ]
      },
      { type: 'heading', content: 'How to Get a Medical Certificate', level: 2 },
      {
        type: 'paragraph',
        content: 'You have several options for obtaining a medical certificate:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Your regular GP — ideal if they know your medical history',
          'A walk-in clinic — useful if your GP is unavailable',
          'Telehealth services — convenient when you\'re unwell at home',
          'Hospital emergency department — only for genuine emergencies'
        ]
      },
      {
        type: 'paragraph',
        content: 'For straightforward illnesses like cold, flu, or gastro, telehealth is often the most convenient option. You don\'t need to travel while unwell, and you can receive your certificate digitally.',
        links: [{ text: 'telehealth', href: '/blog/what-is-telehealth', title: 'What is telehealth?' }]
      },
      { type: 'heading', content: 'Same-Day Medical Certificates', level: 2 },
      {
        type: 'paragraph',
        content: 'If you wake up sick and need a certificate for work that day, your options include:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Early morning GP appointments (if available)',
          'Walk-in clinics that open early',
          'Telehealth services operating from early morning',
          'After-hours medical services'
        ]
      },
      {
        type: 'callout',
        variant: 'info',
        content: 'Many telehealth services can issue certificates within an hour during business hours. Check the service\'s typical turnaround time.'
      },
      { type: 'heading', content: 'Medical Certificates for Multiple Days', level: 2 },
      {
        type: 'paragraph',
        content: 'When you need time off for several days, the doctor will assess your condition and recommend an appropriate duration. For common illnesses:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Cold or flu: typically 2-5 days',
          'Gastro: usually 1-3 days',
          'Minor injuries: varies based on your job requirements',
          'Mental health: 1-3 days initially, with follow-up recommended for longer periods'
        ]
      },
      { type: 'heading', content: 'Returning to Work', level: 2 },
      {
        type: 'paragraph',
        content: 'Most employers simply require you to be well enough to perform your duties. However, some roles may require a fitness for work certificate, particularly:',
        links: [{ text: 'fitness for work certificate', href: '/blog/return-to-work-after-illness', title: 'Returning to work after illness' }]
      },
      {
        type: 'list',
        content: '',
        items: [
          'Safety-critical positions (operating machinery, driving)',
          'Food handling roles after gastro',
          'Healthcare workers after infectious illness',
          'After extended absences'
        ]
      },
      { type: 'heading', content: 'If Your Employer Questions Your Certificate', level: 2 },
      {
        type: 'paragraph',
        content: 'A valid certificate from a registered practitioner should be accepted. If your employer has concerns, they can:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Request you attend an independent medical examination (at their expense)',
          'Discuss patterns of absence with you',
          'Review their sick leave policy with HR'
        ]
      },
      {
        type: 'paragraph',
        content: 'They cannot simply reject a legitimate certificate or demand you provide more medical detail than the certificate contains.'
      },
      {
        type: 'callout',
        variant: 'warning',
        content: 'If you feel you\'re being treated unfairly regarding sick leave, the Fair Work Ombudsman provides free advice and can investigate complaints.'
      }
    ],
    faqs: [
      {
        question: 'Can I get a medical certificate online?',
        answer: 'Yes. Telehealth services can issue valid medical certificates for many common conditions. The certificate is just as valid as one from an in-person consultation.'
      },
      {
        question: 'How long should my medical certificate be for?',
        answer: 'The duration depends on your condition. The doctor will recommend what\'s appropriate based on your symptoms and recovery needs. Don\'t feel pressured to return before you\'re ready.'
      },
      {
        question: 'Can my employer ask why I was sick?',
        answer: 'No. They can ask for evidence you were unwell (a certificate), but they cannot demand to know your diagnosis. "Medical condition" is sufficient.'
      },
      {
        question: 'What if I can\'t afford to see a doctor?',
        answer: 'Some telehealth services offer competitive pricing. Bulk-billing clinics are free with Medicare. In some cases, a statutory declaration can substitute for a certificate.'
      },
      {
        question: 'Do casual workers need medical certificates?',
        answer: 'Casual workers don\'t get paid sick leave, but employers may still request certificates for absences. Check your workplace policy.'
      }
    ],
    relatedServices: [
      { title: 'Medical Certificate', description: 'Get a certificate for work', href: '/medical-certificate', icon: 'certificate' },
      { title: 'GP Consultation', description: 'Discuss your health', href: '/general-consult', icon: 'consult' }
    ],
    seo: {
      title: 'Medical Certificate for Work | Complete Guide | InstantMed',
      description: 'Need a medical certificate for work? Learn what employers can ask, your rights, and how to get one quickly.',
      keywords: ['medical certificate for work', 'sick note for work', 'work medical certificate', 'employer medical certificate']
    }
  },
  {
    slug: 'doctors-note-australia',
    title: 'Doctor\'s Note vs Medical Certificate: What\'s the Difference?',
    subtitle: 'Understanding the terminology and what Australian employers actually need.',
    excerpt: 'Is a doctor\'s note the same as a medical certificate? Learn the difference and what your employer actually requires in Australia.',
    category: 'medical-certificates',
    tags: ['doctors-note', 'medical-certificate', 'work', 'terminology'],
    publishedAt: '2026-01-20',
    updatedAt: '2026-01-23',
    readingTime: 3,
    viewCount: 0,
    author: contentAuthors.jamesPatel,
    heroImage: blogImages.doctorsNote,
    heroImageAlt: 'Medical documentation and paperwork',
    content: [
      {
        type: 'paragraph',
        content: 'In Australia, "doctor\'s note" and "medical certificate" are often used interchangeably, but technically they can mean different things. Here\'s what you need to know to give your employer the right documentation.'
      },
      { type: 'heading', content: 'What\'s the Difference?', level: 2 },
      { type: 'heading', content: 'Medical Certificate', level: 3 },
      {
        type: 'paragraph',
        content: 'A medical certificate is a formal document that:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'States you\'re unfit for work due to illness or injury',
          'Includes specific dates of incapacity',
          'Is signed by a registered health practitioner',
          'Contains the practitioner\'s registration details',
          'Is the standard evidence for sick leave in Australia'
        ]
      },
      { type: 'heading', content: 'Doctor\'s Note', level: 3 },
      {
        type: 'paragraph',
        content: '"Doctor\'s note" is an informal term that can mean:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'A medical certificate (most common usage)',
          'A letter from a doctor about your health',
          'A recommendation or referral',
          'Any written communication from a doctor'
        ]
      },
      {
        type: 'callout',
        variant: 'info',
        content: 'When your employer asks for a "doctor\'s note," they almost always mean a medical certificate. If unsure, ask them to clarify.'
      },
      { type: 'heading', content: 'What Australian Employers Accept', level: 2 },
      {
        type: 'paragraph',
        content: 'Under the Fair Work Act, employers can request "evidence" of illness. This is typically satisfied by:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'A medical certificate from a registered medical practitioner',
          'A certificate from a registered nurse practitioner',
          'A statutory declaration (in some circumstances)',
          'Evidence from a pharmacist (limited situations)'
        ]
      },
      { type: 'heading', content: 'Who Can Issue Valid Certificates?', level: 2 },
      {
        type: 'paragraph',
        content: 'In Australia, medical certificates can be issued by:',
        links: [{ text: 'medical certificates', href: '/blog/are-online-medical-certificates-valid', title: 'Are online certificates valid?' }]
      },
      {
        type: 'list',
        content: '',
        items: [
          'AHPRA-registered doctors (GPs, specialists)',
          'Registered nurse practitioners',
          'Dentists (for dental-related conditions)',
          'Some other registered health practitioners for specific purposes'
        ]
      },
      {
        type: 'callout',
        variant: 'tip',
        content: 'Telehealth doctors can issue valid medical certificates just like in-person doctors. The delivery method doesn\'t affect validity.'
      },
      { type: 'heading', content: 'Common Terminology Confusion', level: 2 },
      {
        type: 'list',
        content: '',
        items: [
          '"Sick note" — informal term for medical certificate',
          '"Fit note" — UK term, not commonly used in Australia',
          '"Med cert" — abbreviation for medical certificate',
          '"Doctor\'s certificate" — same as medical certificate',
          '"Statutory declaration" — sworn statement, alternative to certificate in some cases'
        ]
      },
      { type: 'heading', content: 'When a Letter Is Required Instead', level: 2 },
      {
        type: 'paragraph',
        content: 'Sometimes employers or institutions need more than a standard certificate:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Ongoing condition requiring workplace adjustments',
          'Return to work after extended absence',
          'Workers\' compensation claims',
          'Disability support applications',
          'Immigration or visa purposes'
        ]
      },
      {
        type: 'paragraph',
        content: 'In these cases, you may need a detailed medical letter or report from your treating doctor. This usually requires an in-person consultation.'
      },
      { type: 'heading', content: 'Getting the Right Document', level: 2 },
      {
        type: 'paragraph',
        content: 'To ensure you get what you need:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Ask your employer exactly what they need',
          'Request a "medical certificate" rather than a "note"',
          'Specify the dates you need covered',
          'Mention if you need it for a specific purpose (Centrelink, insurance, etc.)'
        ]
      }
    ],
    faqs: [
      {
        question: 'Is a doctor\'s note the same as a medical certificate?',
        answer: 'In common usage, yes. When Australians say "doctor\'s note," they usually mean a medical certificate. If your employer asks for one, a standard medical certificate will almost always be accepted.'
      },
      {
        question: 'Can a pharmacist give me a doctor\'s note?',
        answer: 'Pharmacists cannot issue medical certificates. However, in some limited circumstances, employers may accept other forms of evidence. A medical certificate from a doctor is the standard requirement.'
      },
      {
        question: 'Does my doctor\'s note need to say what\'s wrong with me?',
        answer: 'No. A medical certificate only needs to state that you\'re unfit for work due to a medical condition. Your diagnosis is private.'
      },
      {
        question: 'Can I get a doctor\'s note online?',
        answer: 'Yes. Telehealth services can issue valid medical certificates. They\'re legally equivalent to certificates from in-person consultations.'
      }
    ],
    relatedServices: [
      { title: 'Medical Certificate', description: 'Get a certificate quickly', href: '/medical-certificate', icon: 'certificate' },
      { title: 'GP Consultation', description: 'Speak with a doctor', href: '/general-consult', icon: 'consult' }
    ],
    seo: {
      title: 'Doctor\'s Note vs Medical Certificate | Australia | InstantMed',
      description: 'Is a doctor\'s note the same as a medical certificate? Learn the difference and what Australian employers require.',
      keywords: ['doctors note australia', 'doctor note vs medical certificate', 'sick note australia', 'medical certificate australia']
    }
  },
  {
    slug: 'online-doctor-after-hours',
    title: 'After-Hours Online Doctor: When & How to Get Help',
    subtitle: 'Your options when you need medical care outside business hours.',
    excerpt: 'Need a doctor after hours? Learn about online doctor services available at night and on weekends, and when to use them.',
    category: 'telehealth',
    tags: ['after-hours', 'telehealth', 'online-doctor', 'weekend'],
    publishedAt: '2026-01-20',
    updatedAt: '2026-01-23',
    readingTime: 4,
    viewCount: 0,
    author: contentAuthors.marcusThompson,
    heroImage: blogImages.afterHoursDoctor,
    heroImageAlt: 'Person using phone for healthcare at night',
    content: [
      {
        type: 'paragraph',
        content: 'Health issues don\'t keep business hours. Whether it\'s late at night, early morning, or over the weekend, online doctor services provide a convenient option when your regular GP isn\'t available.',
        links: [{ text: 'online doctor services', href: '/blog/what-is-telehealth', title: 'What is telehealth?' }]
      },
      { type: 'heading', content: 'What After-Hours Telehealth Can Help With', level: 2 },
      {
        type: 'paragraph',
        content: 'After-hours online doctors can assist with many non-emergency conditions:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Cold and flu symptoms',
          'Urinary tract infections',
          'Skin rashes and irritations',
          'Minor injuries and pain',
          'Mental health support',
          'Medication advice and refills',
          'Medical certificates for the next day',
          'General health questions'
        ]
      },
      {
        type: 'callout',
        variant: 'emergency',
        content: 'For emergencies — chest pain, difficulty breathing, severe bleeding, or stroke symptoms — call 000 immediately. Telehealth is not for emergencies.'
      },
      { type: 'heading', content: 'After-Hours Service Hours', level: 2 },
      {
        type: 'paragraph',
        content: 'Different services operate different hours. Common patterns include:'
      },
      {
        type: 'list',
        content: '',
        items: [
          '24/7 services — available anytime, including public holidays',
          'Extended hours — typically 7am-10pm or similar',
          'After-hours only — evenings and weekends when GPs are closed',
          'On-demand services — you request when you need'
        ]
      },
      { type: 'heading', content: 'How After-Hours Telehealth Works', level: 2 },
      {
        type: 'list',
        content: '',
        items: [
          'You submit your request via app or website',
          'Provide your symptoms and relevant details',
          'A doctor reviews your information',
          'You consult via video, phone, or messaging',
          'Receive advice, prescriptions, or certificates as needed'
        ]
      },
      {
        type: 'paragraph',
        content: 'Wait times vary by service and time. Late-night slots may have longer waits than evening or weekend appointments.'
      },
      { type: 'heading', content: 'Getting Prescriptions After Hours', level: 2 },
      {
        type: 'paragraph',
        content: 'After-hours doctors can prescribe most medications via eScript. Keep in mind:',
        links: [{ text: 'eScript', href: '/blog/how-escripts-work', title: 'How eScripts work' }]
      },
      {
        type: 'list',
        content: '',
        items: [
          'You\'ll need a 24-hour pharmacy to fill it immediately',
          'Some medications have prescribing restrictions',
          'Controlled substances may not be available via telehealth',
          'The eScript is sent to your phone via SMS'
        ]
      },
      {
        type: 'callout',
        variant: 'tip',
        content: 'Search "24-hour pharmacy" plus your suburb to find late-night pharmacies near you. Major cities have several options.'
      },
      { type: 'heading', content: 'Medical Certificates After Hours', level: 2 },
      {
        type: 'paragraph',
        content: 'You can get a medical certificate after hours for:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Illness that started in the evening or overnight',
          'Weekend illness when you need a certificate for Monday',
          'Conditions that worsened outside business hours',
          'When you simply couldn\'t see a doctor during the day'
        ]
      },
      { type: 'heading', content: 'Costs of After-Hours Services', level: 2 },
      {
        type: 'paragraph',
        content: 'After-hours telehealth may cost more than daytime services. Pricing varies by provider:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Some charge the same rate 24/7',
          'Others have after-hours premiums',
          'Bulk-billing may not be available after hours',
          'Private services have set fees regardless of time'
        ]
      },
      { type: 'heading', content: 'Choosing Between Options', level: 2 },
      { type: 'heading', content: 'Online Doctor', level: 3 },
      {
        type: 'paragraph',
        content: 'Best for: non-urgent issues, prescriptions, certificates, general advice when you can wait for a response.'
      },
      { type: 'heading', content: 'After-Hours GP Clinic', level: 3 },
      {
        type: 'paragraph',
        content: 'Best for: conditions needing physical examination, when you prefer face-to-face care.'
      },
      { type: 'heading', content: 'Hospital Emergency', level: 3 },
      {
        type: 'paragraph',
        content: 'Best for: genuine emergencies only. Not appropriate for minor illness or certificates.'
      },
      { type: 'heading', content: 'Healthdirect Helpline', level: 3 },
      {
        type: 'paragraph',
        content: 'Call 1800 022 222 for free health advice 24/7. Nurses can help you decide what level of care you need.'
      }
    ],
    faqs: [
      {
        question: 'Can I see an online doctor at 2am?',
        answer: 'Yes, some services operate 24/7. Wait times may be longer in the middle of the night, but you can usually get a consultation.'
      },
      {
        question: 'Is after-hours telehealth more expensive?',
        answer: 'It depends on the service. Some charge the same rate around the clock, while others have after-hours premiums. Check before you book.'
      },
      {
        question: 'Can I get a prescription filled at 3am?',
        answer: 'Only if you can find a 24-hour pharmacy. Major cities have them, but regional areas may not. The prescription itself can be issued anytime.'
      },
      {
        question: 'Should I go to emergency or use telehealth?',
        answer: 'Emergency is for life-threatening situations. If you\'re unsure, call Healthdirect on 1800 022 222 — they can advise the appropriate level of care.'
      }
    ],
    relatedServices: [
      { title: 'GP Consultation', description: 'Available extended hours', href: '/general-consult', icon: 'consult' },
      { title: 'Prescription Request', description: 'Get medications when you need them', href: '/repeat-prescription', icon: 'prescription' }
    ],
    seo: {
      title: 'After-Hours Online Doctor | Night & Weekend | InstantMed',
      description: 'Need a doctor after hours? Learn about online doctor services available at night and on weekends in Australia.',
      keywords: ['online doctor after hours', 'after hours doctor australia', 'night doctor online', 'weekend doctor telehealth']
    }
  },
  {
    slug: 'telehealth-bulk-billing-vs-private',
    title: 'Telehealth Costs: Bulk Billing vs Private',
    subtitle: 'Understanding what you\'ll pay for online doctor consultations.',
    excerpt: 'How much does telehealth cost? Compare bulk-billed vs private telehealth, what\'s covered by Medicare, and how to find affordable options.',
    category: 'telehealth',
    tags: ['bulk-billing', 'telehealth', 'costs', 'medicare'],
    publishedAt: '2026-01-20',
    updatedAt: '2026-01-23',
    readingTime: 4,
    viewCount: 0,
    author: contentAuthors.sarahChen,
    heroImage: blogImages.bulkBilling,
    heroImageAlt: 'Healthcare payment and billing concept',
    content: [
      {
        type: 'paragraph',
        content: 'Telehealth costs vary significantly depending on the service you choose. Understanding your options helps you access affordable care that suits your needs.'
      },
      { type: 'heading', content: 'Bulk-Billed Telehealth', level: 2 },
      {
        type: 'paragraph',
        content: 'Bulk billing means Medicare pays the full cost — you pay nothing. For telehealth to be bulk-billed:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'You must have a Medicare card',
          'The provider must offer bulk billing',
          'The consultation must meet Medicare requirements',
          'It\'s typically available for existing patients at some practices'
        ]
      },
      {
        type: 'callout',
        variant: 'info',
        content: 'Bulk-billed telehealth is less common than bulk-billed in-person consultations. Many telehealth services charge private fees.'
      },
      { type: 'heading', content: 'Private Telehealth Services', level: 2 },
      {
        type: 'paragraph',
        content: 'Private telehealth services set their own fees. You typically pay:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'A flat fee per consultation',
          'Different rates for different services (certificates, prescriptions, consults)',
          'The full amount upfront',
          'Potentially more on weekends or after hours'
        ]
      },
      { type: 'heading', content: 'What Affects Telehealth Costs?', level: 2 },
      {
        type: 'list',
        content: '',
        items: [
          'Type of service — certificates may cost less than full consultations',
          'Time of day — after-hours may have premiums',
          'Provider type — GP vs specialist',
          'Consultation length — longer consults may cost more',
          'Follow-up requirements — some include free follow-ups'
        ]
      },
      { type: 'heading', content: 'Medicare Rebates for Telehealth', level: 2 },
      {
        type: 'paragraph',
        content: 'If the telehealth service charges privately but you have Medicare, you may be able to claim a rebate. This applies when:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'The consultation is with a Medicare-registered provider',
          'It meets Medicare telehealth requirements',
          'You have an existing relationship with the provider (for some items)',
          'The service provides a valid invoice for claiming'
        ]
      },
      {
        type: 'paragraph',
        content: 'Many private telehealth services for medical certificates or specific consultations don\'t attract Medicare rebates, even if you have Medicare.'
      },
      { type: 'heading', content: 'Comparing Costs', level: 2 },
      { type: 'heading', content: 'Typical Price Ranges', level: 3 },
      {
        type: 'list',
        content: '',
        items: [
          'Medical certificates: $15-$40',
          'Standard consultations: $30-$80',
          'Prescription renewals: $20-$50',
          'Specialist consultations: $100-$300+',
          'Mental health consultations: $50-$150'
        ]
      },
      {
        type: 'callout',
        variant: 'tip',
        content: 'Compare services before you need them. Having a preferred provider ready means less stress when you\'re unwell.'
      },
      { type: 'heading', content: 'Is Cheaper Always Better?', level: 2 },
      {
        type: 'paragraph',
        content: 'Consider what you\'re getting for the price:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Response time — faster may cost more',
          'Doctor qualifications — ensure AHPRA registration',
          'Follow-up care — is it included?',
          'After-hours availability — premium services often include this',
          'Customer support — helpful if something goes wrong'
        ]
      },
      { type: 'heading', content: 'Finding Affordable Care', level: 2 },
      {
        type: 'list',
        content: '',
        items: [
          'Ask your regular GP if they offer telehealth (often bulk-billed for existing patients)',
          'Check if your health insurance covers telehealth',
          'Compare services for your specific need',
          'Consider value, not just price',
          'Look for services with transparent pricing'
        ]
      },
      { type: 'heading', content: 'Without Medicare', level: 2 },
      {
        type: 'paragraph',
        content: 'If you don\'t have Medicare (international students, visitors, some visa holders), telehealth options include:',
        links: [{ text: 'don\'t have Medicare', href: '/blog/medical-certificate-without-medicare', title: 'Getting care without Medicare' }]
      },
      {
        type: 'list',
        content: '',
        items: [
          'Private telehealth services (same price as Medicare holders)',
          'Travel insurance telehealth options',
          'University health services for students',
          'Some community health centres'
        ]
      }
    ],
    faqs: [
      {
        question: 'Is telehealth free with Medicare?',
        answer: 'Only if the provider bulk-bills. Many telehealth services charge private fees even if you have Medicare. Check with the specific service.'
      },
      {
        question: 'Why don\'t all telehealth services bulk-bill?',
        answer: 'Medicare rebates for telehealth have specific requirements. Many telehealth-only services operate as private providers and set their own fees.'
      },
      {
        question: 'Can I claim telehealth on my health insurance?',
        answer: 'It depends on your policy. Some private health funds cover telehealth consultations. Check with your insurer.'
      },
      {
        question: 'Is telehealth cheaper than seeing a GP?',
        answer: 'It varies. A bulk-billed GP is free, while private telehealth has a fee. However, telehealth saves travel costs and time. For many, the convenience justifies the cost.'
      }
    ],
    relatedServices: [
      { title: 'GP Consultation', description: 'Online doctor consultation', href: '/general-consult', icon: 'consult' },
      { title: 'Medical Certificate', description: 'Get a certificate', href: '/medical-certificate', icon: 'certificate' }
    ],
    seo: {
      title: 'Telehealth Costs: Bulk Billing vs Private | InstantMed',
      description: 'How much does telehealth cost? Compare bulk-billed vs private telehealth, what Medicare covers, and find affordable options.',
      keywords: ['telehealth bulk billing', 'telehealth cost australia', 'online doctor cost', 'bulk billing telehealth']
    }
  },
  {
    slug: 'medical-certificate-backdating',
    title: 'Can You Backdate a Medical Certificate?',
    subtitle: 'The rules around backdating and what to do if you forgot to see a doctor.',
    excerpt: 'Can a doctor backdate your medical certificate? Learn the rules, why it\'s difficult, and what options you have if you were too sick to see a doctor.',
    category: 'medical-certificates',
    tags: ['medical-certificate', 'backdating', 'work', 'sick-leave'],
    publishedAt: '2026-01-20',
    updatedAt: '2026-01-23',
    readingTime: 3,
    viewCount: 0,
    author: contentAuthors.jamesPatel,
    heroImage: blogImages.backdating,
    heroImageAlt: 'Calendar and medical documentation concept',
    content: [
      {
        type: 'paragraph',
        content: 'You were sick last week but too unwell to see a doctor. Now you need a medical certificate. Can a doctor backdate it? Here\'s what you need to know.'
      },
      { type: 'heading', content: 'Can Doctors Backdate Certificates?', level: 2 },
      {
        type: 'paragraph',
        content: 'Generally, no. Medical certificates are statements about your health at the time of consultation. Doctors can only certify what they\'ve actually assessed.'
      },
      {
        type: 'callout',
        variant: 'warning',
        content: 'Backdating a medical certificate can be considered professional misconduct. Most doctors will decline requests to backdate.'
      },
      { type: 'heading', content: 'Why Backdating Is Problematic', level: 2 },
      {
        type: 'list',
        content: '',
        items: [
          'The doctor didn\'t examine you at that time',
          'They can\'t verify you were actually unwell',
          'It\'s a form of false documentation',
          'It puts the doctor\'s registration at risk',
          'It can be considered fraud in some circumstances'
        ]
      },
      { type: 'heading', content: 'What Doctors CAN Do', level: 2 },
      {
        type: 'paragraph',
        content: 'While strict backdating isn\'t possible, there are legitimate options:'
      },
      { type: 'heading', content: 'Retrospective Certificate', level: 3 },
      {
        type: 'paragraph',
        content: 'A doctor may issue a certificate that states "Patient reports being unwell from [date]" if:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'You see them soon after the illness',
          'Your current condition supports your account',
          'There\'s evidence (test results, previous records)',
          'The timeframe is reasonable (usually days, not weeks)'
        ]
      },
      { type: 'heading', content: 'Supporting Letter', level: 3 },
      {
        type: 'paragraph',
        content: 'Some doctors will provide a letter explaining the situation, stating that based on your current presentation and reported symptoms, it\'s consistent with you having been unwell during the previous period.'
      },
      { type: 'heading', content: 'What If You Were Too Sick to See a Doctor?', level: 2 },
      {
        type: 'paragraph',
        content: 'This is the most common reason people need backdated certificates. Options include:',
        links: [{ text: 'Too Sick to See a Doctor', href: '/blog/sick-leave-rights-australia', title: 'Your sick leave rights' }]
      },
      {
        type: 'list',
        content: '',
        items: [
          'See a doctor as soon as you can and explain the situation',
          'Provide a statutory declaration if your employer accepts it',
          'Ask about telehealth — you could have consulted from bed',
          'Check your workplace policy for alternatives'
        ]
      },
      {
        type: 'callout',
        variant: 'tip',
        content: 'For future reference, telehealth makes it much easier to get a certificate when you\'re unwell. You don\'t need to leave home.'
      },
      { type: 'heading', content: 'Statutory Declarations', level: 2 },
      {
        type: 'paragraph',
        content: 'A statutory declaration is a sworn statement that can sometimes substitute for a medical certificate. It\'s appropriate when:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'You couldn\'t reasonably access a doctor',
          'Your employer\'s policy allows it',
          'The absence was brief (typically 1-2 days)',
          'It\'s not a frequent occurrence'
        ]
      },
      { type: 'heading', content: 'Talking to Your Employer', level: 2 },
      {
        type: 'paragraph',
        content: 'If you\'re in this situation, honest communication helps:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Explain you were too unwell to see a doctor',
          'Provide what documentation you can get',
          'Ask what alternatives they\'ll accept',
          'Offer a statutory declaration if appropriate'
        ]
      },
      {
        type: 'paragraph',
        content: 'Most reasonable employers understand that sometimes you\'re too sick to leave the house. If it\'s an occasional occurrence and you\'ve been honest, it rarely becomes an issue.'
      },
      { type: 'heading', content: 'Preventing This Situation', level: 2 },
      {
        type: 'list',
        content: '',
        items: [
          'Use telehealth when you\'re unwell — consult from home',
          'See a doctor on day one if you think you\'ll need a certificate',
          'Know your workplace policy before you need it',
          'Keep records of any evidence of illness (pharmacy receipts, etc.)'
        ]
      }
    ],
    faqs: [
      {
        question: 'Can any doctor backdate a medical certificate?',
        answer: 'Legitimate doctors won\'t backdate certificates as it\'s considered professional misconduct. Some may provide retrospective certificates with appropriate wording, but not actual backdating.'
      },
      {
        question: 'I was sick last week — what can I do?',
        answer: 'See a doctor as soon as possible. They may be able to provide a retrospective certificate or supporting letter based on your current condition and reported history.'
      },
      {
        question: 'Will my employer accept a statutory declaration?',
        answer: 'Many do, especially for short absences. Check your workplace policy or ask HR. It\'s a legitimate alternative when you couldn\'t access a doctor.'
      },
      {
        question: 'Can I get in trouble for asking for a backdated certificate?',
        answer: 'Asking isn\'t illegal, but the doctor will likely decline. If you attempt to use a falsely backdated certificate, that could have serious consequences.'
      }
    ],
    relatedServices: [
      { title: 'Medical Certificate', description: 'Get a certificate today', href: '/medical-certificate', icon: 'certificate' },
      { title: 'GP Consultation', description: 'Discuss your situation', href: '/general-consult', icon: 'consult' }
    ],
    seo: {
      title: 'Can You Backdate a Medical Certificate? | Australia | InstantMed',
      description: 'Can a doctor backdate your medical certificate? Learn the rules and what options you have if you were too sick to see a doctor.',
      keywords: ['backdate medical certificate', 'backdated sick note', 'medical certificate after being sick', 'retrospective medical certificate']
    }
  },
  {
    slug: 'work-from-home-sick-certificate',
    title: 'Do You Need a Medical Certificate to Work From Home Sick?',
    subtitle: 'Navigating sick leave when remote work blurs the lines.',
    excerpt: 'If you\'re sick but can work from home, do you still need a medical certificate? Understand your options and workplace expectations.',
    category: 'workplace-health',
    tags: ['wfh', 'sick-leave', 'medical-certificate', 'remote-work'],
    publishedAt: '2026-01-20',
    updatedAt: '2026-01-23',
    readingTime: 3,
    viewCount: 0,
    author: contentAuthors.emmaWilson,
    heroImage: blogImages.wfhSick,
    heroImageAlt: 'Person working from home while unwell',
    content: [
      {
        type: 'paragraph',
        content: 'Remote work has changed how we think about sick days. If you\'re unwell but could theoretically work from your couch, what are the rules? Here\'s what you need to know.',
        links: [{ text: 'sick days', href: '/blog/working-from-home-when-sick', title: 'Working from home when sick' }]
      },
      { type: 'heading', content: 'The Short Answer', level: 2 },
      {
        type: 'paragraph',
        content: 'If you\'re genuinely unwell and taking sick leave, the rules are the same whether you normally work in an office or from home. A medical certificate may be required based on your workplace policy, regardless of your work location.'
      },
      { type: 'heading', content: 'Three Scenarios', level: 2 },
      { type: 'heading', content: '1. Taking Proper Sick Leave', level: 3 },
      {
        type: 'paragraph',
        content: 'If you\'re too unwell to work at all (fever, severe symptoms, need to rest), you take sick leave. Standard certificate requirements apply based on your workplace policy.'
      },
      { type: 'heading', content: '2. Working From Home While Mildly Unwell', level: 3 },
      {
        type: 'paragraph',
        content: 'If you\'re well enough to work but have mild symptoms (slight cold, minor discomfort), you might work from home to avoid spreading illness. This usually doesn\'t require a certificate since you\'re not taking leave.'
      },
      { type: 'heading', content: '3. Partial Day/Reduced Hours', level: 3 },
      {
        type: 'paragraph',
        content: 'If you work a half day then need to rest, your employer\'s policy determines whether you need a certificate for the sick leave portion.'
      },
      {
        type: 'callout',
        variant: 'info',
        content: 'Working from home while sick is not the same as sick leave. If you\'re working, you\'re working. If you\'re on leave, you\'re on leave.'
      },
      { type: 'heading', content: 'When You Definitely Need a Certificate', level: 2 },
      {
        type: 'list',
        content: '',
        items: [
          'You\'re taking sick leave (not working at all)',
          'Your absence exceeds your workplace\'s threshold (often 2+ days)',
          'It\'s around a public holiday or weekend',
          'Your manager specifically requests one',
          'You have a pattern of similar absences'
        ]
      },
      { type: 'heading', content: 'When You Probably Don\'t Need One', level: 2 },
      {
        type: 'list',
        content: '',
        items: [
          'You\'re working from home (not taking leave)',
          'Your workplace doesn\'t require certificates for short absences',
          'Your manager says a certificate isn\'t needed',
          'You\'re using flexitime rather than sick leave'
        ]
      },
      { type: 'heading', content: 'The Real Question: Should You Work?', level: 2 },
      {
        type: 'paragraph',
        content: 'Just because you can work from home doesn\'t mean you should when you\'re sick. Consider:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Will working delay your recovery?',
          'Are you actually capable of productive work?',
          'Would you go home if you were in the office?',
          'Is rest what you actually need?'
        ]
      },
      {
        type: 'callout',
        variant: 'tip',
        content: 'Sick leave exists for a reason. If you\'re unwell, taking proper time off to recover is usually better than pushing through at reduced capacity.'
      },
      { type: 'heading', content: 'Communicating With Your Manager', level: 2 },
      {
        type: 'paragraph',
        content: 'Clear communication prevents confusion:'
      },
      {
        type: 'list',
        content: '',
        items: [
          '"I\'m unwell and taking sick leave today" — clear, certificate may be required',
          '"I have a cold but can work from home" — working, no certificate needed',
          '"I\'m not feeling great, can I work from home?" — discuss expectations'
        ]
      },
      { type: 'heading', content: 'If Your Employer Pressures You to Work', level: 2 },
      {
        type: 'paragraph',
        content: 'You have the right to take legitimate sick leave. If you\'re unwell and unfit for work, your employer cannot require you to work from home instead. This would undermine your sick leave entitlements.'
      },
      {
        type: 'paragraph',
        content: 'If you feel pressured, document your communications and consider seeking advice from the Fair Work Ombudsman.'
      }
    ],
    faqs: [
      {
        question: 'Can my employer make me work from home instead of taking sick leave?',
        answer: 'No. If you\'re genuinely unwell and unfit for work, you\'re entitled to sick leave. Your employer cannot require you to work from home to avoid using leave.'
      },
      {
        question: 'Do I need a certificate if I work from home while mildly unwell?',
        answer: 'If you\'re working (not taking leave), you typically don\'t need a certificate. You\'re just working from a different location.'
      },
      {
        question: 'Can I work from home some days and take sick leave others?',
        answer: 'Yes. Your situation might change day to day. Just be clear with your employer about which days you\'re working versus taking leave.'
      },
      {
        question: 'Should I get a certificate just in case?',
        answer: 'If you\'re unsure, it doesn\'t hurt to have one. Telehealth makes it easy to get a certificate without leaving home when you\'re unwell.'
      }
    ],
    relatedServices: [
      { title: 'Medical Certificate', description: 'Get a certificate from home', href: '/medical-certificate', icon: 'certificate' },
      { title: 'GP Consultation', description: 'Discuss your health', href: '/general-consult', icon: 'consult' }
    ],
    seo: {
      title: 'WFH Sick Certificate | Do You Need One? | InstantMed',
      description: 'If you\'re sick but can work from home, do you need a medical certificate? Understand your options and workplace expectations.',
      keywords: ['wfh sick certificate', 'work from home sick leave', 'remote work sick note', 'medical certificate working from home']
    }
  }
]
