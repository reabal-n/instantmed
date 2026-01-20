import { Article, defaultAuthor, articleSeries } from '../types'
import { blogImages } from '../images'

export const telehealthArticles: Article[] = [
  {
    slug: 'what-is-telehealth',
    title: 'What Is Telehealth?',
    subtitle: 'A complete guide to online healthcare in Australia.',
    excerpt: 'Telehealth lets you consult a doctor remotely. Learn how it works, what it can treat, and how it fits into Australian healthcare.',
    category: 'telehealth',
    tags: ['telehealth', 'online-doctor', 'video-consult'],
    publishedAt: '2024-10-01',
    updatedAt: '2026-01-15',
    readingTime: 3,
    viewCount: 47340,
    series: { ...articleSeries['telehealth-guide'], order: 1 },
    author: defaultAuthor,
    heroImage: blogImages.whatIsTelehealth,
    heroImageAlt: 'Doctor consulting with patient via video call',
    content: [
      { type: 'paragraph', content: 'Telehealth is healthcare delivered remotely using technology. Instead of visiting a clinic, you consult with a doctor via video call, phone, or secure messaging. It\'s been part of Australian healthcare for years, but has become much more common and accessible.' },
      { type: 'heading', content: 'How Telehealth Works', level: 2 },
      { type: 'list', content: '', items: ['You request a consultation online or via an app', 'A doctor reviews your information', 'You consult via video, phone, or messaging (depending on the service)', 'The doctor provides advice, prescriptions, referrals, or certificates as needed', 'Follow-up is arranged if required'] },
      { type: 'heading', content: 'What Can Telehealth Treat?', level: 2 },
      { type: 'paragraph', content: 'Telehealth is well-suited for many common health concerns:' },
      { type: 'list', content: '', items: ['Cold and flu symptoms', 'Skin conditions (with photos)', 'Mental health concerns', 'Medication refills and reviews', 'Medical certificates', 'Sexual health consultations', 'Chronic disease management', 'General health advice'] },
      { type: 'callout', variant: 'info', content: 'Telehealth works best for conditions that don\'t require physical examination. A good telehealth service will tell you when an in-person visit is more appropriate.' },
      { type: 'heading', content: 'What Telehealth Can\'t Do', level: 2 },
      { type: 'list', content: '', items: ['Physical examinations (listening to chest, checking ears)', 'Emergency care', 'Procedures or injections', 'Some specialist assessments', 'Conditions requiring immediate hands-on treatment'] },
      { type: 'heading', content: 'Is Telehealth Safe?', level: 2 },
      { type: 'paragraph', content: 'Yes. Telehealth services in Australia must comply with the same regulations as in-person healthcare. Doctors are AHPRA-registered and follow the same clinical guidelines. Reputable services use secure, encrypted platforms to protect your information.' },
      { type: 'heading', content: 'Telehealth and Medicare', level: 2 },
      { type: 'paragraph', content: 'Some telehealth consultations are covered by Medicare, particularly video consultations with your regular GP. Private telehealth services may charge a fee but often offer more immediate access and convenience.' },
      { type: 'heading', content: 'Choosing a Telehealth Service', level: 2 },
      { type: 'list', content: '', items: ['Check doctors are AHPRA-registered', 'Look for clear pricing', 'Read reviews from other patients', 'Ensure they\'ll refer you in-person if needed', 'Check their privacy and security policies'] }
    ],
    faqs: [
      { question: 'Is telehealth as good as seeing a doctor in person?', answer: 'For many conditions, yes. Telehealth is effective for consultations that don\'t require physical examination. For conditions needing hands-on assessment, in-person care is better.' },
      { question: 'Can I get a prescription through telehealth?', answer: 'Yes. Doctors can prescribe most medications via telehealth, sent as an eScript to your phone. Some controlled medications have restrictions.' },
      { question: 'Is my telehealth consultation private?', answer: 'Reputable services use encrypted platforms and follow strict privacy laws. Your consultation is confidential, just like an in-person visit.' }
    ],
    relatedServices: [
      { title: 'GP Consultation', description: 'Consult a doctor online', href: '/general-consult', icon: 'consult' },
      { title: 'Medical Certificate', description: 'Get a certificate online', href: '/medical-certificate', icon: 'certificate' }
    ],
    seo: { title: 'What Is Telehealth? | Online Healthcare Guide | InstantMed', description: 'Telehealth lets you consult a doctor remotely. Learn how it works, what it can treat, and how it fits into Australian healthcare.', keywords: ['telehealth', 'telehealth australia', 'online doctor', 'virtual healthcare'] }
  },
  {
    slug: 'telehealth-vs-in-person',
    title: 'Telehealth vs In-Person: When to Use Each',
    subtitle: 'Knowing when online care is right — and when it\'s not.',
    excerpt: 'Telehealth is convenient, but not suitable for everything. Learn when online healthcare is appropriate and when to see a doctor in person.',
    category: 'telehealth',
    tags: ['telehealth', 'online-doctor', 'video-consult'],
    publishedAt: '2024-10-10',
    updatedAt: '2026-01-12',
    readingTime: 3,
    viewCount: 42150,
    series: { ...articleSeries['telehealth-guide'], order: 2 },
    author: defaultAuthor,
    heroImage: blogImages.telehealthVsInPerson,
    heroImageAlt: 'Comparing telehealth and in-person consultations',
    content: [
      { type: 'paragraph', content: 'Both telehealth and in-person care have their place. Understanding when each is appropriate helps you get the right care at the right time.' },
      { type: 'heading', content: 'When Telehealth Works Well', level: 2 },
      { type: 'list', content: '', items: ['Cold, flu, and minor infections', 'Skin issues that can be shown via photo/video', 'Mental health check-ins and counselling', 'Medication refills for stable conditions', 'Medical certificates for common illnesses', 'Sexual health advice and treatment', 'Follow-up consultations', 'Health questions and advice'] },
      { type: 'heading', content: 'When to See a Doctor In Person', level: 2 },
      { type: 'list', content: '', items: ['Chest pain, difficulty breathing, or other emergencies (call 000)', 'Conditions requiring physical examination', 'Lumps, moles, or skin changes needing hands-on assessment', 'Ear or throat infections in children', 'Injuries requiring examination', 'When your doctor recommends it', 'Complex or worsening symptoms'] },
      { type: 'callout', variant: 'warning', content: 'If you\'re experiencing a medical emergency, call 000 immediately. Telehealth is not appropriate for emergencies.' },
      { type: 'heading', content: 'The Advantages of Telehealth', level: 2 },
      { type: 'list', content: '', items: ['No travel or waiting rooms', 'Often faster access than GP appointments', 'Convenient when you\'re unwell', 'Good for people in rural/remote areas', 'Flexible timing options', 'Reduced exposure to other sick patients'] },
      { type: 'heading', content: 'The Advantages of In-Person Care', level: 2 },
      { type: 'list', content: '', items: ['Physical examination possible', 'Procedures and tests can be done', 'Better for complex conditions', 'Continuity with your regular GP', 'Some people prefer face-to-face interaction'] },
      { type: 'heading', content: 'Using Both Together', level: 2 },
      { type: 'paragraph', content: 'Many people use telehealth for convenience and minor issues, while maintaining a relationship with their regular GP for ongoing care and conditions needing examination. This combination gives you the best of both approaches.' },
      { type: 'callout', variant: 'tip', content: 'A good telehealth service will tell you if your condition needs in-person assessment. If a doctor recommends you see someone in person, follow that advice.' }
    ],
    faqs: [
      { question: 'Can a telehealth doctor refer me to a specialist?', answer: 'Yes. Telehealth doctors can provide referrals to specialists, just like your regular GP.' },
      { question: 'Should I use telehealth if I have a regular GP?', answer: 'You can use both. Telehealth is useful for after-hours care, minor issues, or when you can\'t get a GP appointment quickly. Your regular GP remains important for ongoing care.' },
      { question: 'What if the telehealth doctor can\'t help me?', answer: 'They\'ll advise you to see a doctor in person and can often provide a referral or guidance on where to go.' }
    ],
    relatedServices: [
      { title: 'GP Consultation', description: 'Consult a doctor online', href: '/general-consult', icon: 'consult' },
      { title: 'Medical Certificate', description: 'Get a certificate online', href: '/medical-certificate', icon: 'certificate' }
    ],
    seo: { title: 'Telehealth vs In-Person Doctor | When to Use Each | InstantMed', description: 'Telehealth is convenient but not for everything. Learn when online healthcare is appropriate and when to see a doctor in person.', keywords: ['telehealth vs gp', 'online doctor vs in person', 'when to use telehealth'] }
  },
  {
    slug: 'how-escripts-work',
    title: 'How eScripts Work in Australia',
    subtitle: 'Understanding electronic prescriptions and how to use them.',
    excerpt: 'eScripts are digital prescriptions sent to your phone. Learn how they work, where to use them, and common questions answered.',
    category: 'telehealth',
    tags: ['escript', 'prescription', 'pharmacy', 'telehealth'],
    publishedAt: '2024-10-15',
    updatedAt: '2026-01-10',
    readingTime: 3,
    viewCount: 48920,
    series: { ...articleSeries['telehealth-guide'], order: 3 },
    author: defaultAuthor,
    heroImage: blogImages.eScripts,
    heroImageAlt: 'Electronic prescription on smartphone',
    content: [
      { type: 'paragraph', content: 'Electronic prescriptions (eScripts) are the digital version of paper prescriptions. Instead of a printed script, you receive a text message with a QR code or token that any pharmacy can scan to dispense your medication.' },
      { type: 'heading', content: 'How eScripts Work', level: 2 },
      { type: 'list', content: '', items: ['Your doctor creates an electronic prescription', 'You receive an SMS with a link to your eScript', 'The SMS contains a QR code and a token number', 'Take your phone to any pharmacy in Australia', 'The pharmacist scans the QR code or enters the token', 'You receive your medication'] },
      { type: 'callout', variant: 'info', content: 'eScripts are sent directly to your phone via SMS. You don\'t need a special app — just your phone\'s messaging and camera.' },
      { type: 'heading', content: 'Benefits of eScripts', level: 2 },
      { type: 'list', content: '', items: ['No paper to lose or forget', 'Can\'t be damaged by washing machine accidents', 'Use at any pharmacy — not locked to one location', 'Easy to manage repeats', 'More convenient for telehealth consultations', 'Better for the environment'] },
      { type: 'heading', content: 'Using Your eScript at the Pharmacy', level: 2 },
      { type: 'paragraph', content: 'Simply show your phone screen to the pharmacist. They\'ll scan the QR code or enter the token number. For repeats, you\'ll receive a new SMS each time a repeat is available.' },
      { type: 'heading', content: 'Managing Repeats', level: 2 },
      { type: 'paragraph', content: 'If your prescription has repeats, you\'ll receive an SMS when it\'s time for your next repeat. You don\'t need to keep track of the original — the system manages it for you.' },
      { type: 'heading', content: 'What If I Lose the SMS?', level: 2 },
      { type: 'paragraph', content: 'The SMS should remain in your phone\'s message history. If you accidentally delete it, contact your prescribing doctor or the service that issued it — they can often resend or help you retrieve it.' },
      { type: 'heading', content: 'Active Script List (Optional)', level: 2 },
      { type: 'paragraph', content: 'You can optionally store your eScripts in the Active Script List through MyGov/My Health Record. This creates a central record of all your prescriptions, which can be useful if you use multiple pharmacies or doctors.' }
    ],
    faqs: [
      { question: 'Can I use an eScript at any pharmacy?', answer: 'Yes. Unlike paper scripts that some people leave at one pharmacy, eScripts work at any pharmacy in Australia.' },
      { question: 'Do I need internet to use an eScript?', answer: 'You need internet to receive the SMS, but once received, the QR code on your phone works offline at the pharmacy.' },
      { question: 'What if the pharmacy can\'t scan my screen?', answer: 'They can manually enter the token number included in the SMS. Screen brightness and screen protectors can sometimes affect scanning.' },
      { question: 'Are eScripts secure?', answer: 'Yes. eScripts use secure encryption and can only be dispensed once per fill. They\'re actually harder to forge than paper prescriptions.' }
    ],
    relatedServices: [
      { title: 'Prescription Request', description: 'Request a prescription online', href: '/repeat-prescription', icon: 'prescription' },
      { title: 'GP Consultation', description: 'Consult a doctor', href: '/general-consult', icon: 'consult' }
    ],
    seo: { title: 'How eScripts Work in Australia | Electronic Prescriptions | InstantMed', description: 'eScripts are digital prescriptions sent to your phone. Learn how they work, where to use them, and common questions answered.', keywords: ['escript', 'electronic prescription', 'escript australia', 'digital prescription'] }
  },
  {
    slug: 'telehealth-privacy-security',
    title: 'Telehealth Privacy & Security',
    subtitle: 'How your health information is protected during online consultations.',
    excerpt: 'Concerned about privacy with telehealth? Learn how Australian telehealth services protect your personal health information.',
    category: 'telehealth',
    publishedAt: '2024-10-20',
    updatedAt: '2026-01-08',
    readingTime: 3,
    viewCount: 23470,
    author: defaultAuthor,
    heroImage: blogImages.telehealthPrivacy,
    heroImageAlt: 'Secure digital healthcare and privacy concept',
    content: [
      { type: 'paragraph', content: 'Your health information is sensitive. Understanding how telehealth services protect your privacy can help you feel confident using online healthcare.' },
      { type: 'heading', content: 'Legal Protections', level: 2 },
      { type: 'paragraph', content: 'Australian telehealth services are bound by:' },
      { type: 'list', content: '', items: ['Privacy Act 1988 and Australian Privacy Principles', 'State and territory health records legislation', 'AHPRA codes of conduct for registered health practitioners', 'TGA requirements for therapeutic goods'] },
      { type: 'heading', content: 'How Services Protect Your Data', level: 2 },
      { type: 'list', content: '', items: ['Encrypted video and messaging platforms', 'Secure storage of health records', 'Access controls limiting who can see your information', 'Regular security audits and updates', 'Staff training on privacy obligations'] },
      { type: 'heading', content: 'What Information Is Collected?', level: 2 },
      { type: 'paragraph', content: 'Telehealth services typically collect:' },
      { type: 'list', content: '', items: ['Your contact details and identity verification', 'Medical history relevant to your consultation', 'Details of your current health concern', 'Any photos or documents you upload', 'Records of consultations and treatments', 'Payment information (processed securely)'] },
      { type: 'heading', content: 'Who Can Access Your Information?', level: 2 },
      { type: 'list', content: '', items: ['The doctor consulting with you', 'Support staff who need access to help with your care', 'Other healthcare providers if you consent to sharing', 'You (you can request copies of your records)'] },
      { type: 'callout', variant: 'info', content: 'Your information is not shared with employers, insurers, or other third parties without your explicit consent, except where required by law.' },
      { type: 'heading', content: 'Tips for Protecting Your Privacy', level: 2 },
      { type: 'list', content: '', items: ['Use a private space for video consultations', 'Use secure Wi-Fi, not public networks', 'Keep your account login details secure', 'Log out of shared devices', 'Review the service\'s privacy policy'] },
      { type: 'heading', content: 'Your Rights', level: 2 },
      { type: 'list', content: '', items: ['Access your health records', 'Request corrections to inaccurate information', 'Know how your information is used', 'Complain if you believe your privacy has been breached', 'Withdraw consent for non-essential uses'] }
    ],
    faqs: [
      { question: 'Can my employer see my telehealth records?', answer: 'No. Your employer cannot access your telehealth records. The only thing they might see is a medical certificate you choose to give them, which contains limited information.' },
      { question: 'Is video consultation recorded?', answer: 'Policies vary by service. Most do not record video consultations, but may keep written notes. Check the service\'s privacy policy.' },
      { question: 'What happens to my data if the service closes?', answer: 'Services are required to maintain records for minimum periods and have plans for secure transfer or destruction of records.' }
    ],
    relatedServices: [
      { title: 'GP Consultation', description: 'Secure online consultations', href: '/general-consult', icon: 'consult' },
      { title: 'Our Privacy Policy', description: 'Read our privacy practices', href: '/privacy', icon: 'certificate' }
    ],
    seo: { title: 'Telehealth Privacy & Security | Is Online Healthcare Safe? | InstantMed', description: 'How Australian telehealth services protect your personal health information. Your privacy rights and security measures explained.', keywords: ['telehealth privacy', 'telehealth security', 'online doctor privacy', 'health data protection'] }
  },
  {
    slug: 'preparing-for-telehealth',
    title: 'How to Prepare for a Telehealth Consultation',
    subtitle: 'Get the most out of your online doctor appointment.',
    excerpt: 'A little preparation helps you get the most from telehealth. Tips for before, during, and after your online consultation.',
    category: 'telehealth',
    publishedAt: '2024-10-25',
    updatedAt: '2026-01-12',
    readingTime: 3,
    viewCount: 31280,
    author: defaultAuthor,
    heroImage: blogImages.prepareForTelehealth,
    heroImageAlt: 'Person preparing for telehealth consultation at home',
    content: [
      { type: 'paragraph', content: 'Telehealth consultations are most effective when you\'re prepared. A few minutes of preparation can help you communicate clearly and ensure the doctor has the information they need.' },
      { type: 'heading', content: 'Before Your Consultation', level: 2 },
      { type: 'heading', content: 'Technical Setup', level: 3 },
      { type: 'list', content: '', items: ['Check your internet connection is stable', 'Ensure your device is charged', 'Test your camera and microphone', 'Find a quiet, private space with good lighting', 'Have the consultation link or app ready'] },
      { type: 'heading', content: 'Medical Preparation', level: 3 },
      { type: 'list', content: '', items: ['List your symptoms and when they started', 'Note any medications you\'re currently taking', 'Write down questions you want to ask', 'Have your Medicare card and ID ready if required', 'Gather any relevant previous test results'] },
      { type: 'callout', variant: 'tip', content: 'If you need to show something to the doctor (like a rash or swelling), make sure the area is accessible and you have good lighting.' },
      { type: 'heading', content: 'During Your Consultation', level: 2 },
      { type: 'list', content: '', items: ['Be honest and thorough about your symptoms', 'Mention any medications, including over-the-counter and supplements', 'Ask questions if you don\'t understand something', 'Take notes on the doctor\'s advice', 'Confirm next steps before ending the call'] },
      { type: 'heading', content: 'After Your Consultation', level: 2 },
      { type: 'list', content: '', items: ['Follow the treatment plan provided', 'Collect any prescriptions from the pharmacy', 'Book any follow-up appointments recommended', 'Monitor your symptoms and seek further care if needed', 'Contact the service if you have questions'] },
      { type: 'heading', content: 'What to Have Ready', level: 2 },
      { type: 'list', content: '', items: ['Your symptoms list', 'Current medications', 'Allergies', 'Relevant medical history', 'Medicare card (if applicable)', 'Photo ID', 'Payment method'] }
    ],
    faqs: [
      { question: 'What if my internet drops during the consultation?', answer: 'Most services will attempt to reconnect or call you back. Have a phone number ready as a backup.' },
      { question: 'Can someone else be in the room during my consultation?', answer: 'Yes, if you want. Some people find it helpful to have a family member present. Let the doctor know at the start.' },
      { question: 'Should I wear anything specific?', answer: 'Wear whatever is comfortable, but consider what you might need to show the doctor. If discussing a skin issue on your arm, wear something with easy sleeve access.' }
    ],
    relatedServices: [
      { title: 'GP Consultation', description: 'Start your consultation', href: '/general-consult', icon: 'consult' },
      { title: 'Medical Certificate', description: 'Request a certificate', href: '/medical-certificate', icon: 'certificate' }
    ],
    seo: { title: 'How to Prepare for Telehealth | Tips for Online Doctor Visits | InstantMed', description: 'Get the most from your telehealth consultation. Tips for preparing, what to have ready, and making the most of your online doctor appointment.', keywords: ['telehealth preparation', 'online doctor tips', 'telehealth consultation tips'] }
  },
  {
    slug: 'telehealth-after-hours',
    title: 'After-Hours Telehealth: When Your GP Is Closed',
    subtitle: 'Healthcare options when you need a doctor outside business hours.',
    excerpt: 'Feeling unwell at night or on the weekend? Learn about after-hours healthcare options including telehealth, when to use them, and when to go to emergency.',
    category: 'telehealth',
    publishedAt: '2024-11-01',
    updatedAt: '2026-01-10',
    readingTime: 3,
    viewCount: 45690,
    author: defaultAuthor,
    heroImage: blogImages.telehealthAfterHours,
    heroImageAlt: 'After hours healthcare access concept',
    content: [
      { type: 'paragraph', content: 'Health problems don\'t always happen during business hours. When your GP is closed, you have several options depending on how urgent your situation is.' },
      { type: 'heading', content: 'Assessing Urgency', level: 2 },
      { type: 'heading', content: 'Emergency (Call 000)', level: 3 },
      { type: 'list', content: '', items: ['Chest pain or difficulty breathing', 'Signs of stroke (facial drooping, arm weakness, speech problems)', 'Severe allergic reaction', 'Heavy bleeding that won\'t stop', 'Loss of consciousness', 'Serious injury'] },
      { type: 'callout', variant: 'emergency', content: 'For life-threatening emergencies, call 000 immediately. Don\'t delay to try telehealth first.' },
      { type: 'heading', content: 'Urgent but Not Emergency', level: 3 },
      { type: 'list', content: '', items: ['High fever that\'s not responding to medication', 'Severe pain', 'Worsening infection', 'Dehydration from vomiting/diarrhea', 'Mental health crisis (call Lifeline 13 11 14 or go to ED)'] },
      { type: 'heading', content: 'Can Wait or Use Telehealth', level: 3 },
      { type: 'list', content: '', items: ['Cold and flu symptoms', 'Minor infections', 'Medication advice', 'Medical certificates for illness', 'Non-urgent health questions', 'Prescription refills'] },
      { type: 'heading', content: 'After-Hours Options', level: 2 },
      { type: 'heading', content: 'Telehealth Services', level: 3 },
      { type: 'paragraph', content: 'Many telehealth services operate 24/7 or extended hours. They\'re ideal for non-emergency issues that can\'t wait until your GP opens.' },
      { type: 'heading', content: 'After-Hours GP Services', level: 3 },
      { type: 'paragraph', content: 'Some areas have after-hours GP clinics or home-visiting doctor services. These are useful for conditions needing physical examination.' },
      { type: 'heading', content: 'Hospital Emergency Departments', level: 3 },
      { type: 'paragraph', content: 'For genuine emergencies or conditions that might be serious. Be prepared for potential long waits for non-urgent issues.' },
      { type: 'heading', content: 'Healthdirect Helpline', level: 3 },
      { type: 'paragraph', content: 'Call 1800 022 222 for free health advice 24/7. Nurses can help you decide what level of care you need.' },
      { type: 'heading', content: 'Making the Right Choice', level: 2 },
      { type: 'paragraph', content: 'Consider:' },
      { type: 'list', content: '', items: ['How severe are your symptoms?', 'Are they getting worse?', 'Can this safely wait until morning?', 'Do you need physical examination?', 'Is this a known condition you can manage?'] },
      { type: 'callout', variant: 'tip', content: 'When in doubt about urgency, call Healthdirect on 1800 022 222. They can help you decide the best option.' }
    ],
    faqs: [
      { question: 'Is after-hours telehealth more expensive?', answer: 'Prices vary by service. Some charge the same rate, others have after-hours premiums. Check before booking.' },
      { question: 'Can I get a prescription after hours?', answer: 'Yes. Telehealth doctors can issue eScripts 24/7. However, you\'ll need a 24-hour pharmacy to fill it immediately.' },
      { question: 'Should I go to emergency for a medical certificate?', answer: 'No. Emergency departments are for emergencies. Use telehealth or wait for your GP for medical certificates.' }
    ],
    relatedServices: [
      { title: 'GP Consultation', description: 'Available extended hours', href: '/general-consult', icon: 'consult' },
      { title: 'Medical Certificate', description: 'Get a certificate when you need it', href: '/medical-certificate', icon: 'certificate' }
    ],
    seo: { title: 'After-Hours Telehealth | When Your GP Is Closed | InstantMed', description: 'Healthcare options when you need a doctor outside business hours. Learn about after-hours telehealth, urgent care, and when to go to emergency.', keywords: ['after hours doctor', 'after hours telehealth', 'night doctor', 'weekend doctor australia'] }
  }
]
