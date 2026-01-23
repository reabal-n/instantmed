import { Article, contentAuthors } from '../types'
import { blogImages } from '../images'

export const trustBuildingArticles: Article[] = [
  {
    slug: 'ahpra-registered-doctor-meaning',
    title: 'What Does AHPRA-Registered Mean?',
    subtitle: 'Understanding doctor registration in Australia.',
    excerpt: 'You\'ve seen "AHPRA-registered" on healthcare websites. Learn what it means, why it matters, and how to verify a doctor\'s registration.',
    category: 'telehealth',
    tags: ['ahpra', 'doctor-registration', 'trust', 'safety'],
    publishedAt: '2026-01-20',
    updatedAt: '2026-01-23',
    readingTime: 3,
    viewCount: 0,
    author: contentAuthors.jamesPatel,
    heroImage: blogImages.ahpraRegistered,
    heroImageAlt: 'Healthcare professional credentials concept',
    content: [
      {
        type: 'paragraph',
        content: 'When choosing an online doctor or healthcare service, you\'ll often see "AHPRA-registered" mentioned. But what does it actually mean, and why should you care?'
      },
      { type: 'heading', content: 'What Is AHPRA?', level: 2 },
      {
        type: 'paragraph',
        content: 'AHPRA stands for the Australian Health Practitioner Regulation Agency. It\'s the national body responsible for registering and regulating health practitioners across Australia.'
      },
      {
        type: 'paragraph',
        content: 'AHPRA works with 15 National Boards that set standards for different health professions, including doctors, nurses, pharmacists, psychologists, and more.'
      },
      { type: 'heading', content: 'What AHPRA Registration Means', level: 2 },
      {
        type: 'paragraph',
        content: 'When a doctor is AHPRA-registered, it means they have:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Completed an approved medical degree',
          'Met the Medical Board of Australia\'s requirements',
          'Passed required examinations and assessments',
          'Met English language requirements',
          'No conditions preventing them from practising safely',
          'Agreed to follow professional standards and codes of conduct'
        ]
      },
      {
        type: 'callout',
        variant: 'info',
        content: 'Registration isn\'t a one-time thing. Doctors must renew annually and meet ongoing requirements including continuing professional development.'
      },
      { type: 'heading', content: 'Why It Matters for Telehealth', level: 2 },
      {
        type: 'paragraph',
        content: 'When using online health services, AHPRA registration is your assurance that:',
        links: [{ text: 'online health services', href: '/blog/what-is-telehealth', title: 'What is telehealth?' }]
      },
      {
        type: 'list',
        content: '',
        items: [
          'The doctor is legally qualified to practise in Australia',
          'They\'re held to the same standards as any other doctor',
          'There\'s oversight and accountability',
          'You can verify their credentials yourself',
          'There\'s a complaints process if something goes wrong'
        ]
      },
      { type: 'heading', content: 'How to Verify a Doctor\'s Registration', level: 2 },
      {
        type: 'paragraph',
        content: 'You can check any health practitioner\'s registration on the AHPRA public register:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Visit ahpra.gov.au and click "Check a practitioner"',
          'Search by name and profession',
          'View their registration status, type, and any conditions',
          'See which specialty (if any) they\'re registered in'
        ]
      },
      {
        type: 'callout',
        variant: 'tip',
        content: 'Legitimate telehealth services will openly display their doctors\' names and registration details. If a service won\'t tell you who your doctor is, that\'s a red flag.'
      },
      { type: 'heading', content: 'Types of Medical Registration', level: 2 },
      {
        type: 'list',
        content: '',
        items: [
          'General registration — standard registration for practising doctors',
          'Specialist registration — for doctors with specialist qualifications',
          'Provisional registration — for doctors completing supervised training',
          'Limited registration — for specific purposes with conditions'
        ]
      },
      { type: 'heading', content: 'What If There\'s a Problem?', level: 2 },
      {
        type: 'paragraph',
        content: 'AHPRA handles complaints about registered health practitioners. If you have concerns about a doctor\'s conduct or care, you can:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Lodge a complaint through AHPRA\'s website',
          'Contact the Health Care Complaints Commission in your state',
          'Raise concerns with the service provider first',
          'Seek a second opinion if you\'re unsure about advice received'
        ]
      },
      { type: 'heading', content: 'Beyond AHPRA: Other Quality Indicators', level: 2 },
      {
        type: 'paragraph',
        content: 'While AHPRA registration is essential, other factors indicate a quality telehealth service:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Clear privacy policies and data protection',
          'Transparent pricing',
          'Responsive customer support',
          'Clear information about their doctors',
          'Appropriate clinical governance',
          'Willingness to refer when telehealth isn\'t suitable'
        ]
      }
    ],
    faqs: [
      {
        question: 'Are telehealth doctors "real" doctors?',
        answer: 'Yes. Telehealth doctors are AHPRA-registered medical practitioners, the same as any GP or specialist. The only difference is they consult via technology rather than in person.'
      },
      {
        question: 'Can overseas doctors practise via Australian telehealth?',
        answer: 'Only if they hold Australian AHPRA registration. A doctor registered overseas but not in Australia cannot legally provide telehealth to patients in Australia.'
      },
      {
        question: 'How often do doctors need to renew registration?',
        answer: 'Annually. Doctors must meet continuing requirements each year, including professional development, to maintain their registration.'
      },
      {
        question: 'What happens if a doctor loses their registration?',
        answer: 'They can no longer legally practise medicine in Australia. AHPRA publishes information about practitioners who have had their registration cancelled or suspended.'
      }
    ],
    relatedServices: [
      { title: 'GP Consultation', description: 'Consult with AHPRA-registered doctors', href: '/general-consult', icon: 'consult' },
      { title: 'About Our Doctors', description: 'Meet our medical team', href: '/about', icon: 'certificate' }
    ],
    seo: {
      title: 'What Does AHPRA-Registered Mean? | Doctor Registration | InstantMed',
      description: 'What does AHPRA-registered mean? Learn about doctor registration in Australia and how to verify credentials.',
      keywords: ['ahpra registered', 'ahpra meaning', 'doctor registration australia', 'verify doctor australia']
    }
  },
  {
    slug: 'can-employer-reject-medical-certificate',
    title: 'Can Your Employer Reject a Medical Certificate?',
    subtitle: 'Know your rights when your sick leave is questioned.',
    excerpt: 'Can your employer refuse to accept your medical certificate? Learn about your workplace rights and what to do if there\'s a dispute.',
    category: 'workplace-health',
    tags: ['employer', 'medical-certificate', 'workplace-rights', 'sick-leave'],
    publishedAt: '2026-01-20',
    updatedAt: '2026-01-23',
    readingTime: 4,
    viewCount: 0,
    author: contentAuthors.emmaWilson,
    heroImage: blogImages.employerReject,
    heroImageAlt: 'Workplace discussion about documentation',
    content: [
      {
        type: 'paragraph',
        content: 'You\'ve provided a medical certificate, but your employer is questioning it. Can they actually reject it? Understanding your rights helps you navigate this stressful situation.',
        links: [{ text: 'medical certificate', href: '/blog/medical-certificate-for-work', title: 'Medical certificates for work' }]
      },
      { type: 'heading', content: 'The Short Answer', level: 2 },
      {
        type: 'paragraph',
        content: 'Generally, an employer cannot reject a valid medical certificate from an AHPRA-registered practitioner. However, there are some limited circumstances where they may question or seek additional information.'
      },
      { type: 'heading', content: 'What Makes a Certificate Valid?', level: 2 },
      {
        type: 'paragraph',
        content: 'A valid medical certificate should include:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Your name',
          'Date of consultation',
          'Statement that you\'re unfit for work',
          'Dates covered',
          'Practitioner\'s name, signature, and registration details',
          'Practice contact information'
        ]
      },
      {
        type: 'callout',
        variant: 'info',
        content: 'The certificate does NOT need to include your diagnosis. "Medical condition" or "unfit for work" is sufficient.'
      },
      { type: 'heading', content: 'When an Employer Might Question a Certificate', level: 2 },
      {
        type: 'paragraph',
        content: 'While they can\'t usually reject a valid certificate, employers may have concerns if:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'There\'s a pattern of absences (e.g., always around weekends or holidays)',
          'The certificate is from a suspicious source',
          'The dates don\'t match what you reported',
          'There are apparent inconsistencies (e.g., you posted holiday photos while "sick")',
          'The certificate appears altered or fraudulent'
        ]
      },
      { type: 'heading', content: 'What Employers CAN Do', level: 2 },
      {
        type: 'list',
        content: '',
        items: [
          'Request you attend an independent medical examination (at their expense)',
          'Discuss patterns of absence with you',
          'Ask questions about the certificate (though not your diagnosis)',
          'Request a second certificate for extended absences',
          'Refer the matter to HR for review'
        ]
      },
      { type: 'heading', content: 'What Employers CANNOT Do', level: 2 },
      {
        type: 'list',
        content: '',
        items: [
          'Demand to know your specific diagnosis',
          'Contact your doctor without your consent',
          'Require you to see a specific doctor for the initial certificate',
          'Simply refuse to pay sick leave if you\'ve provided valid evidence',
          'Discipline you solely for using legitimate sick leave'
        ]
      },
      { type: 'heading', content: 'Telehealth Certificates', level: 2 },
      {
        type: 'paragraph',
        content: 'Some employers have questioned telehealth certificates, but they should not be treated differently:',
        links: [{ text: 'telehealth certificates', href: '/blog/are-online-medical-certificates-valid', title: 'Are online certificates valid?' }]
      },
      {
        type: 'list',
        content: '',
        items: [
          'Telehealth consultations are legitimate medical consultations',
          'Certificates from AHPRA-registered doctors are valid regardless of delivery method',
          'Medicare and Fair Work recognise telehealth as equivalent to in-person care',
          'The certificate itself has the same legal standing'
        ]
      },
      { type: 'heading', content: 'If Your Employer Disputes Your Certificate', level: 2 },
      {
        type: 'list',
        content: '',
        items: [
          'Ask them to explain their specific concerns in writing',
          'Provide any additional information you\'re comfortable sharing',
          'Offer to attend an independent medical examination if they request',
          'Document all communications',
          'Consider seeking advice from Fair Work or your union'
        ]
      },
      {
        type: 'callout',
        variant: 'warning',
        content: 'Keep copies of all certificates and correspondence. Documentation is crucial if a dispute escalates.'
      },
      { type: 'heading', content: 'Getting Help', level: 2 },
      {
        type: 'paragraph',
        content: 'If you believe you\'re being treated unfairly:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Fair Work Ombudsman provides free advice (fairwork.gov.au)',
          'Your union can assist if you\'re a member',
          'Community legal centres offer free employment advice',
          'HR should be able to clarify workplace policy'
        ]
      },
      { type: 'heading', content: 'Fraudulent Certificates', level: 2 },
      {
        type: 'paragraph',
        content: 'A note on fake certificates: using a fraudulent medical certificate is serious and can result in:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Termination of employment',
          'Criminal charges in some cases',
          'Difficulty finding future employment',
          'Damage to your professional reputation'
        ]
      },
      {
        type: 'paragraph',
        content: 'If you\'re genuinely unwell, getting a legitimate certificate is easy — there\'s no reason to risk using a fake one.'
      }
    ],
    faqs: [
      {
        question: 'Can my employer fire me for taking sick leave?',
        answer: 'Not for taking legitimate sick leave. However, if they believe you\'ve been dishonest (e.g., fake certificate, not actually sick), that could be grounds for disciplinary action.'
      },
      {
        question: 'My employer says they don\'t accept telehealth certificates. Is that allowed?',
        answer: 'They should accept them — certificates from AHPRA-registered doctors are valid regardless of how the consultation occurred. You may need to escalate to HR or seek external advice.'
      },
      {
        question: 'Can they require me to see their doctor?',
        answer: 'They can request you attend an independent medical examination, usually at their expense. This is different from requiring their doctor for the initial certificate.'
      },
      {
        question: 'What if my employer keeps questioning my sick leave?',
        answer: 'Document everything and seek advice from Fair Work or a union. Patterns of harassment around sick leave can constitute bullying or discrimination.'
      }
    ],
    relatedServices: [
      { title: 'Medical Certificate', description: 'Get a valid certificate', href: '/medical-certificate', icon: 'certificate' },
      { title: 'GP Consultation', description: 'Discuss your health', href: '/general-consult', icon: 'consult' }
    ],
    seo: {
      title: 'Can Your Employer Reject a Medical Certificate? | InstantMed',
      description: 'Can your employer refuse to accept your medical certificate? Learn your workplace rights and what to do if there\'s a dispute.',
      keywords: ['employer reject medical certificate', 'sick leave dispute', 'workplace rights sick leave', 'medical certificate rejected']
    }
  },
  {
    slug: 'medical-certificate-without-medicare',
    title: 'Getting a Medical Certificate Without Medicare',
    subtitle: 'Options for international students, visitors, and those without Medicare.',
    excerpt: 'No Medicare card? You can still get a medical certificate in Australia. Learn about your options and what to expect.',
    category: 'medical-certificates',
    tags: ['medicare', 'international', 'visitors', 'students'],
    publishedAt: '2026-01-20',
    updatedAt: '2026-01-23',
    readingTime: 3,
    viewCount: 0,
    author: contentAuthors.sarahChen,
    heroImage: blogImages.noMedicare,
    heroImageAlt: 'International traveller accessing healthcare',
    content: [
      {
        type: 'paragraph',
        content: 'Whether you\'re an international student, a tourist, here on a work visa, or simply don\'t have Medicare, you can still access medical certificates in Australia. Here\'s how.'
      },
      { type: 'heading', content: 'Who Doesn\'t Have Medicare?', level: 2 },
      {
        type: 'list',
        content: '',
        items: [
          'International students (most visa types)',
          'Tourists and short-term visitors',
          'Some working visa holders',
          'New migrants waiting for Medicare processing',
          'Visitors from countries without reciprocal healthcare agreements'
        ]
      },
      { type: 'heading', content: 'Your Options Without Medicare', level: 2 },
      { type: 'heading', content: 'Private Telehealth Services', level: 3 },
      {
        type: 'paragraph',
        content: 'Many telehealth services don\'t require Medicare. You pay a flat fee for the consultation, the same as any other patient.',
        links: [{ text: 'telehealth services', href: '/blog/what-is-telehealth', title: 'What is telehealth?' }]
      },
      {
        type: 'list',
        content: '',
        items: [
          'Usually same price for everyone regardless of Medicare status',
          'Quick and convenient',
          'No need to find a clinic that accepts non-Medicare patients',
          'Certificates delivered digitally'
        ]
      },
      { type: 'heading', content: 'Private GP Clinics', level: 3 },
      {
        type: 'paragraph',
        content: 'You can visit any GP clinic — you\'ll just pay privately. Expect to pay around $70-$120 for a standard consultation.'
      },
      { type: 'heading', content: 'University Health Services', level: 3 },
      {
        type: 'paragraph',
        content: 'If you\'re a student, your university likely has a health service that caters to international students. Many offer reduced rates or are covered by your Overseas Student Health Cover (OSHC).'
      },
      { type: 'heading', content: 'Using Your Health Insurance', level: 2 },
      { type: 'heading', content: 'Overseas Student Health Cover (OSHC)', level: 3 },
      {
        type: 'paragraph',
        content: 'International students must have OSHC. This covers:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'GP visits (you may pay and claim back)',
          'Some specialist consultations',
          'Hospital treatment',
          'Some prescription medications'
        ]
      },
      {
        type: 'callout',
        variant: 'tip',
        content: 'Check if your OSHC provider has preferred GPs or telehealth partners — you may pay less or get direct billing.'
      },
      { type: 'heading', content: 'Travel Insurance', level: 3 },
      {
        type: 'paragraph',
        content: 'If you\'re a visitor, your travel insurance may cover medical consultations. Check your policy for:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Coverage for general illness (not just accidents)',
          'Whether telehealth is covered',
          'Claim process (pay upfront or direct billing)',
          'Any excess or deductibles'
        ]
      },
      { type: 'heading', content: 'Reciprocal Healthcare Agreements', level: 2 },
      {
        type: 'paragraph',
        content: 'Australia has healthcare agreements with some countries. Visitors from these countries may access Medicare:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'United Kingdom',
          'Ireland',
          'New Zealand',
          'Belgium, Finland, Italy, Malta, Netherlands, Norway, Slovenia, Sweden'
        ]
      },
      {
        type: 'paragraph',
        content: 'Coverage varies by country. Check the Services Australia website for details specific to your country.'
      },
      { type: 'heading', content: 'What to Expect Without Medicare', level: 2 },
      {
        type: 'list',
        content: '',
        items: [
          'You\'ll pay upfront for consultations',
          'Fees may be higher than bulk-billed services',
          'Prescription medications won\'t be PBS-subsidised',
          'You\'ll need to manage your own health records',
          'Follow-up care is your responsibility to arrange'
        ]
      },
      { type: 'heading', content: 'Tips for Accessing Care', level: 2 },
      {
        type: 'list',
        content: '',
        items: [
          'Keep your health insurance details handy',
          'Ask about fees upfront',
          'Request itemised receipts for insurance claims',
          'Use telehealth when appropriate — often simpler than finding clinics',
          'For ongoing conditions, establish care with a regular GP'
        ]
      },
      {
        type: 'callout',
        variant: 'info',
        content: 'Your medical certificate will be just as valid as anyone else\'s. Medicare status doesn\'t affect the legitimacy of the certificate.'
      }
    ],
    faqs: [
      {
        question: 'Will my employer accept a certificate if I don\'t have Medicare?',
        answer: 'Yes. Your Medicare status is irrelevant to the validity of a medical certificate. What matters is that it\'s from an AHPRA-registered doctor.'
      },
      {
        question: 'How much does a medical certificate cost without Medicare?',
        answer: 'Telehealth certificates typically cost $15-$40. GP visits cost $70-$120 depending on the clinic. Your health insurance may cover some or all of this.'
      },
      {
        question: 'Can I use telehealth without Medicare?',
        answer: 'Absolutely. Many telehealth services are private and charge the same fee regardless of Medicare status.'
      },
      {
        question: 'What if I can\'t afford a doctor?',
        answer: 'Some community health centres offer low-cost care. University health services often have reduced rates for students. Some charities provide free medical care for those in need.'
      }
    ],
    relatedServices: [
      { title: 'Medical Certificate', description: 'No Medicare required', href: '/medical-certificate', icon: 'certificate' },
      { title: 'GP Consultation', description: 'Private telehealth consultations', href: '/general-consult', icon: 'consult' }
    ],
    seo: {
      title: 'Medical Certificate Without Medicare | Australia | InstantMed',
      description: 'No Medicare card? You can still get a medical certificate. Options for international students, visitors, and those without Medicare.',
      keywords: ['medical certificate without medicare', 'no medicare doctor', 'international student doctor australia', 'visitor healthcare australia']
    }
  },
  {
    slug: 'telehealth-for-elderly-parents',
    title: 'Setting Up Telehealth for Elderly Parents',
    subtitle: 'Help your parents access online healthcare with confidence.',
    excerpt: 'Want to set up telehealth for an elderly parent? A practical guide to helping seniors access online healthcare comfortably and safely.',
    category: 'telehealth',
    tags: ['elderly', 'seniors', 'family', 'setup', 'accessibility'],
    publishedAt: '2026-01-20',
    updatedAt: '2026-01-23',
    readingTime: 4,
    viewCount: 0,
    author: contentAuthors.marcusThompson,
    heroImage: blogImages.elderlyTelehealth,
    heroImageAlt: 'Senior person using technology for healthcare',
    content: [
      {
        type: 'paragraph',
        content: 'Telehealth can be especially valuable for elderly parents — no driving, no waiting rooms, no exposure to sick people. But getting them comfortable with the technology takes some planning.',
        links: [{ text: 'Telehealth', href: '/blog/what-is-telehealth', title: 'What is telehealth?' }]
      },
      { type: 'heading', content: 'Why Telehealth Works for Seniors', level: 2 },
      {
        type: 'list',
        content: '',
        items: [
          'No need to travel or arrange transport',
          'Consult from the comfort of home',
          'Reduced exposure to other sick patients',
          'Family can participate in consultations',
          'Good for mobility-limited individuals',
          'Easier for those in regional areas'
        ]
      },
      { type: 'heading', content: 'Choosing the Right Device', level: 2 },
      {
        type: 'paragraph',
        content: 'The best device is one they\'re already comfortable with:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Tablet — larger screen, good for video calls',
          'Smartphone — familiar if they already use one',
          'Computer — if they\'re comfortable with it',
          'Landline — some services offer phone-only consultations'
        ]
      },
      {
        type: 'callout',
        variant: 'tip',
        content: 'If buying a new device, tablets are often the best choice for seniors — larger screens and simpler interfaces than computers.'
      },
      { type: 'heading', content: 'Setting Up: A Step-by-Step Guide', level: 2 },
      { type: 'heading', content: '1. Choose a Service', level: 3 },
      {
        type: 'paragraph',
        content: 'Look for services that are:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Easy to use without apps (web-based is often simpler)',
          'Offer phone consultations as an option',
          'Have clear, large fonts',
          'Provide good customer support'
        ]
      },
      { type: 'heading', content: '2. Create an Account', level: 3 },
      {
        type: 'paragraph',
        content: 'Set this up in advance — not when they\'re sick:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Use an email they can access (or set up a new one)',
          'Write down login details somewhere safe',
          'Add their Medicare card details',
          'Save payment information securely'
        ]
      },
      { type: 'heading', content: '3. Do a Test Run', level: 3 },
      {
        type: 'paragraph',
        content: 'Practice before they actually need it:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Log in together and navigate the site',
          'Test the camera and microphone',
          'Practice on a video call with you first',
          'Make sure they know where the login details are'
        ]
      },
      { type: 'heading', content: 'Making It Easier', level: 2 },
      {
        type: 'list',
        content: '',
        items: [
          'Bookmark the service on their device\'s home screen',
          'Write simple step-by-step instructions on paper',
          'Use large, clear font on any printed instructions',
          'Offer to join their first real consultation remotely',
          'Set up the consultation for them if needed'
        ]
      },
      { type: 'heading', content: 'Joining Remotely', level: 2 },
      {
        type: 'paragraph',
        content: 'Many seniors appreciate having family involved. Options include:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Being present in the room during the call',
          'Joining the video call from your own device (if the service allows)',
          'Being available by phone to help with technology',
          'Following up afterwards to discuss what the doctor said'
        ]
      },
      {
        type: 'callout',
        variant: 'info',
        content: 'Let the doctor know if a family member is joining. They need to confirm your parent consents to you being present.'
      },
      { type: 'heading', content: 'Common Concerns Addressed', level: 2 },
      { type: 'heading', content: '"I don\'t trust technology"', level: 3 },
      {
        type: 'paragraph',
        content: 'Telehealth services use secure, encrypted connections. Their information is protected the same as at any doctor\'s office.'
      },
      { type: 'heading', content: '"The doctor can\'t examine me properly"', level: 3 },
      {
        type: 'paragraph',
        content: 'True for some things, but many conditions don\'t require physical examination. A good telehealth service will recommend in-person care when it\'s needed.'
      },
      { type: 'heading', content: '"What if something goes wrong?"', level: 3 },
      {
        type: 'paragraph',
        content: 'Customer support can help with technical issues. For medical emergencies, they should call 000 — telehealth isn\'t for emergencies anyway.'
      },
      { type: 'heading', content: 'When Telehealth Might Not Be Right', level: 2 },
      {
        type: 'paragraph',
        content: 'In-person care may be better for:',
        links: [{ text: 'In-person care', href: '/blog/telehealth-vs-in-person', title: 'Telehealth vs in-person' }]
      },
      {
        type: 'list',
        content: '',
        items: [
          'Conditions requiring physical examination',
          'Significant hearing or vision impairment affecting communication',
          'Cognitive issues making video calls confusing',
          'Complex conditions requiring ongoing relationship with a GP',
          'If they simply prefer face-to-face care'
        ]
      }
    ],
    faqs: [
      {
        question: 'Can I set up an account for my elderly parent?',
        answer: 'You can help set it up, but the account should be in their name. They\'ll need to consent to consultations themselves unless you have formal authority (like power of attorney for health matters).'
      },
      {
        question: 'Can I speak to the doctor on their behalf?',
        answer: 'Only with their consent. The doctor needs to confirm your parent agrees to you being involved. For formal authority, you\'d need a medical power of attorney.'
      },
      {
        question: 'What if they can\'t use video?',
        answer: 'Many services offer phone-only consultations. This works well for simple issues like medication refills or medical certificates.'
      },
      {
        question: 'Are eScripts difficult for seniors to use?',
        answer: 'They just need to show their phone screen at the pharmacy. No app required. You might help them save the SMS so it\'s easy to find.'
      }
    ],
    relatedServices: [
      { title: 'GP Consultation', description: 'Simple online consultations', href: '/general-consult', icon: 'consult' },
      { title: 'Prescription Request', description: 'Medication renewals made easy', href: '/repeat-prescription', icon: 'prescription' }
    ],
    seo: {
      title: 'Telehealth for Elderly Parents | Setup Guide | InstantMed',
      description: 'Help your elderly parents access telehealth. A practical guide to setting up and using online healthcare for seniors.',
      keywords: ['telehealth for elderly', 'telehealth seniors', 'help parents with telehealth', 'online doctor elderly']
    }
  },
  {
    slug: 'when-to-go-to-emergency-vs-telehealth',
    title: 'Emergency vs Telehealth: Making the Right Choice',
    subtitle: 'Know when to call 000, go to ED, or use telehealth.',
    excerpt: 'Should you go to emergency or try telehealth? Learn how to make the right call about your health — when time matters and when it doesn\'t.',
    category: 'telehealth',
    tags: ['emergency', 'telehealth', 'decision-making', 'urgent-care'],
    publishedAt: '2026-01-20',
    updatedAt: '2026-01-23',
    readingTime: 4,
    viewCount: 0,
    author: contentAuthors.sarahChen,
    heroImage: blogImages.emergencyVsTelehealth,
    heroImageAlt: 'Healthcare decision-making concept',
    content: [
      {
        type: 'paragraph',
        content: 'When you\'re unwell, deciding where to seek help can be stressful. Getting it right matters — for your health and to keep emergency services available for those who truly need them.'
      },
      { type: 'heading', content: 'Call 000 Immediately For:', level: 2 },
      {
        type: 'list',
        content: '',
        items: [
          'Chest pain or tightness',
          'Difficulty breathing or shortness of breath',
          'Signs of stroke — facial drooping, arm weakness, speech problems (remember FAST)',
          'Severe allergic reaction (anaphylaxis)',
          'Heavy bleeding that won\'t stop',
          'Loss of consciousness',
          'Serious injury or trauma',
          'Overdose or poisoning',
          'Thoughts of suicide with a plan (or call Lifeline 13 11 14)'
        ]
      },
      {
        type: 'callout',
        variant: 'emergency',
        content: 'Don\'t hesitate if you think it\'s an emergency. Call 000. It\'s better to call and not need emergency care than to delay when you do.'
      },
      { type: 'heading', content: 'Go to Emergency Department For:', level: 2 },
      {
        type: 'list',
        content: '',
        items: [
          'Severe pain that\'s getting worse',
          'Possible broken bones or serious injuries',
          'Severe abdominal pain',
          'High fever with serious symptoms (stiff neck, confusion)',
          'Sudden severe headache ("worst headache of life")',
          'Significant burns',
          'Eye injuries',
          'Psychiatric crisis requiring immediate safety intervention'
        ]
      },
      { type: 'heading', content: 'Telehealth or GP Is Appropriate For:', level: 2 },
      {
        type: 'list',
        content: '',
        items: [
          'Cold and flu symptoms',
          'Minor infections (UTI, mild skin infections)',
          'Skin rashes and irritations',
          'Mild to moderate pain',
          'Mental health check-ins',
          'Medication refills and reviews',
          'Medical certificates',
          'Health questions and advice',
          'Chronic disease management',
          'Follow-up care after treatment'
        ]
      },
      { type: 'heading', content: 'When You\'re Unsure', level: 2 },
      {
        type: 'paragraph',
        content: 'If you\'re uncertain about urgency, these resources can help:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Healthdirect Helpline: 1800 022 222 — free health advice 24/7',
          'Poisons Information Centre: 13 11 26',
          'Lifeline: 13 11 14 for mental health crisis',
          'Your GP\'s after-hours voicemail often has guidance'
        ]
      },
      { type: 'heading', content: 'Questions to Ask Yourself', level: 2 },
      {
        type: 'list',
        content: '',
        items: [
          'Is this life-threatening? (Yes = 000)',
          'Is it getting rapidly worse? (Consider ED)',
          'Could it wait until morning? (Maybe telehealth tonight, GP tomorrow)',
          'Is this something I\'d normally see a GP for? (Telehealth is probably fine)',
          'Have I had this before and know what it is? (Telehealth can often help)'
        ]
      },
      { type: 'heading', content: 'The Cost of Emergency for Non-Emergencies', level: 2 },
      {
        type: 'paragraph',
        content: 'Emergency departments prioritise by urgency (triage). If your condition isn\'t urgent, you\'ll wait — sometimes many hours. Meanwhile:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'You\'re exposed to other sick people',
          'Staff are stretched dealing with true emergencies',
          'A telehealth consult might have resolved things in 20 minutes',
          'You\'ve used resources meant for emergencies'
        ]
      },
      {
        type: 'callout',
        variant: 'info',
        content: 'This isn\'t about making you feel guilty — if you genuinely thought it was an emergency, that\'s the right call. It\'s about helping you make better decisions next time.'
      },
      { type: 'heading', content: 'What Telehealth Can\'t Do', level: 2 },
      {
        type: 'paragraph',
        content: 'Be realistic about telehealth\'s limitations:',
        links: [{ text: 'telehealth\'s limitations', href: '/blog/when-telehealth-cant-help', title: 'When telehealth isn\'t right' }]
      },
      {
        type: 'list',
        content: '',
        items: [
          'Can\'t physically examine you',
          'Can\'t run tests or take samples',
          'Can\'t provide emergency treatment',
          'Can\'t handle conditions requiring hands-on care',
          'May not be appropriate for complex or worsening symptoms'
        ]
      },
      { type: 'heading', content: 'After-Hours Options Between ED and Telehealth', level: 2 },
      {
        type: 'list',
        content: '',
        items: [
          'After-hours GP clinics — for conditions needing examination but not emergency',
          'Home-visiting doctor services — doctor comes to you',
          'Hospital urgent care centres — lower acuity than ED, where available'
        ]
      }
    ],
    faqs: [
      {
        question: 'What if I go to ED and it turns out not to be an emergency?',
        answer: 'That\'s okay. Medical professionals would rather assess you and find nothing serious than have you delay care for something urgent. Just learn from it for next time.'
      },
      {
        question: 'Can I use telehealth for a child?',
        answer: 'Yes, for minor issues. However, children (especially young children) can deteriorate quickly. When in doubt with kids, err on the side of caution and seek in-person care.'
      },
      {
        question: 'What if telehealth says I need emergency care?',
        answer: 'Follow their advice. A telehealth doctor will tell you if they think you need urgent in-person assessment. That\'s part of safe telehealth practice.'
      },
      {
        question: 'Should I go to ED for a medical certificate?',
        answer: 'No. Emergency departments are for emergencies. Use telehealth, a GP, or a walk-in clinic for certificates.'
      }
    ],
    relatedServices: [
      { title: 'GP Consultation', description: 'Non-emergency consultations', href: '/general-consult', icon: 'consult' },
      { title: 'Medical Certificate', description: 'Not appropriate for ED', href: '/medical-certificate', icon: 'certificate' }
    ],
    seo: {
      title: 'Emergency vs Telehealth | When to Go to ED | InstantMed',
      description: 'Should you go to emergency or try telehealth? Learn when to call 000, visit ED, or use online healthcare.',
      keywords: ['emergency or telehealth', 'when to go to emergency', 'ED vs telehealth', 'when to call 000']
    }
  },
  {
    slug: 'doctors-certificate-university-extension',
    title: 'Medical Certificates for University Extensions',
    subtitle: 'Special consideration, extensions, and what documentation you need.',
    excerpt: 'Need a medical certificate for a university extension or special consideration? Learn what\'s required and how to get the right documentation.',
    category: 'workplace-health',
    tags: ['university', 'students', 'extension', 'special-consideration'],
    publishedAt: '2026-01-20',
    updatedAt: '2026-01-23',
    readingTime: 4,
    viewCount: 0,
    author: contentAuthors.oliviaNguyen,
    heroImage: blogImages.uniExtension,
    heroImageAlt: 'University student managing assignments and health',
    content: [
      {
        type: 'paragraph',
        content: 'Illness during exam period or when assignments are due is stressful. Australian universities have processes for this — here\'s how to navigate them.',
        links: [{ text: 'universities have processes', href: '/blog/university-medical-certificates', title: 'Medical certificates for university' }]
      },
      { type: 'heading', content: 'Types of Accommodation', level: 2 },
      { type: 'heading', content: 'Assignment Extensions', level: 3 },
      {
        type: 'paragraph',
        content: 'Additional time to complete an assignment. Usually 1-7 days depending on the situation.'
      },
      { type: 'heading', content: 'Special Consideration', level: 3 },
      {
        type: 'paragraph',
        content: 'For circumstances affecting exam performance or major assessments. May result in adjusted marks, supplementary assessment, or other accommodations.'
      },
      { type: 'heading', content: 'Deferred Exam', level: 3 },
      {
        type: 'paragraph',
        content: 'Sitting the exam at a later date, usually the supplementary exam period.'
      },
      { type: 'heading', content: 'What Documentation You Need', level: 2 },
      {
        type: 'paragraph',
        content: 'University requirements are often more detailed than workplace certificates. Typically, your documentation should:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Be dated close to the affected assessment (ideally same day or within a few days)',
          'State the dates you were affected',
          'Indicate the severity or impact on your capacity to study/attend exams',
          'Come from an appropriate practitioner (usually doctor, psychologist, or counsellor)',
          'For some universities, use a specific form'
        ]
      },
      {
        type: 'callout',
        variant: 'tip',
        content: 'Check your university\'s specific requirements BEFORE your consultation. Some require particular forms or specific wording.'
      },
      { type: 'heading', content: 'Getting the Right Certificate', level: 2 },
      {
        type: 'paragraph',
        content: 'When you consult with a doctor:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Explain it\'s for university, not work',
          'Mention what assessment is affected (exam, assignment due date)',
          'Ask if they can comment on the impact on your study capacity',
          'If your uni has a form, bring it or have it ready to share',
          'Be honest about your symptoms and their timing'
        ]
      },
      { type: 'heading', content: 'Telehealth for Student Certificates', level: 2 },
      {
        type: 'paragraph',
        content: 'Telehealth is particularly convenient for students:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'No need to leave home when unwell before exams',
          'Can consult from your room',
          'Often faster than getting a GP appointment during busy periods',
          'Digital certificate can be uploaded directly to university systems'
        ]
      },
      {
        type: 'paragraph',
        content: 'Most universities accept telehealth certificates — they\'re from registered doctors just like in-person consultations.'
      },
      { type: 'heading', content: 'Timing Matters', level: 2 },
      {
        type: 'paragraph',
        content: 'Key points about timing:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'See a doctor as close to the affected date as possible',
          'Retrospective certificates (after you\'ve recovered) are harder to obtain',
          'Submit your application within your university\'s timeframe (often 3-5 days)',
          'Don\'t wait until results are out to apply',
          'If you\'re too sick to see a doctor, document this and explain in your application'
        ]
      },
      {
        type: 'callout',
        variant: 'warning',
        content: 'Don\'t wait until after you get a bad result to apply for special consideration. Apply when you\'re affected, not when you\'re disappointed.'
      },
      { type: 'heading', content: 'If You Have an Ongoing Condition', level: 2 },
      {
        type: 'paragraph',
        content: 'For chronic conditions or disabilities, register with your university\'s accessibility or disability service. Benefits include:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Ongoing accommodations without needing certificates each time',
          'Exam adjustments (extra time, separate room, rest breaks)',
          'Assignment flexibility',
          'Support services and counselling'
        ]
      },
      { type: 'heading', content: 'Mental Health Considerations', level: 2 },
      {
        type: 'paragraph',
        content: 'Mental health conditions are valid reasons for special consideration. You might consult:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Your university counselling service (often free)',
          'A GP or psychologist',
          'Your regular mental health practitioner',
          'Telehealth mental health services'
        ]
      },
      { type: 'heading', content: 'Common Mistakes to Avoid', level: 2 },
      {
        type: 'list',
        content: '',
        items: [
          'Waiting too long to see a doctor',
          'Not checking your uni\'s specific requirements',
          'Applying after results are released',
          'Submitting a certificate that doesn\'t cover the assessment date',
          'Using the same certificate for multiple semesters of issues',
          'Not keeping copies of everything'
        ]
      }
    ],
    faqs: [
      {
        question: 'Will my university accept a telehealth certificate?',
        answer: 'Generally yes. Most universities accept certificates from any registered doctor. Check your specific university\'s policy if unsure.'
      },
      {
        question: 'Can I get a certificate after I\'ve already recovered?',
        answer: 'It\'s difficult. Doctors certify what they can assess at the time of consultation. See someone while you\'re unwell if at all possible.'
      },
      {
        question: 'What if I was too sick to see a doctor?',
        answer: 'Explain this in your special consideration application. Some universities accept statutory declarations. See a doctor as soon as you can for supporting documentation.'
      },
      {
        question: 'Can I get special consideration for stress about exams?',
        answer: 'General exam stress usually isn\'t grounds for special consideration. However, diagnosed anxiety disorders, acute mental health episodes, or significant personal circumstances may qualify. Consult your doctor or university counsellor.'
      },
      {
        question: 'Does my certificate need to mention the exam or assignment?',
        answer: 'Not necessarily, but it should cover the relevant dates and indicate you were unfit for study/attendance. Check your uni\'s requirements.'
      }
    ],
    relatedServices: [
      { title: 'Medical Certificate', description: 'Get a certificate for university', href: '/medical-certificate', icon: 'certificate' },
      { title: 'GP Consultation', description: 'Discuss your health', href: '/general-consult', icon: 'consult' }
    ],
    seo: {
      title: 'Medical Certificate for University Extension | Special Consideration | InstantMed',
      description: 'Need a medical certificate for university extension or special consideration? What documentation you need and how to get it.',
      keywords: ['university extension medical certificate', 'special consideration certificate', 'uni extension sick', 'student medical certificate']
    }
  }
]
