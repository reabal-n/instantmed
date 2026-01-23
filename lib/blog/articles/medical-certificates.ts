import { Article, defaultAuthor, articleSeries } from '../types'
import { blogImages } from '../images'

export const medicalCertificateArticles: Article[] = [
  {
    slug: 'medical-certificate-mental-health-day',
    title: 'Medical Certificates for Mental Health Days',
    subtitle: 'Your mental health is a valid reason to take time off work. Here\'s how it works.',
    excerpt: 'Mental health is just as important as physical health. Learn how to get a medical certificate for a mental health day in Australia.',
    category: 'medical-certificates',
    tags: ['mental-health', 'sick-leave', 'work', 'stress', 'anxiety'],
    publishedAt: '2024-06-15',
    updatedAt: '2026-01-15',
    readingTime: 3,
    viewCount: 47420,
    series: { ...articleSeries['medical-certificates-101'], order: 1 },
    author: defaultAuthor,
    heroImage: blogImages.mentalHealthDay,
    heroImageAlt: 'Person taking a peaceful break at home for mental health self-care',
    content: [
      {
        type: 'paragraph',
        content: 'Mental health conditions are legitimate medical concerns. Taking time off to manage anxiety, stress, depression, or burnout is not only valid — it\'s often necessary for your overall wellbeing and long-term productivity.',
        links: [{ text: 'Taking time off', href: '/blog/how-long-medical-certificate', title: 'Medical certificate duration guide' }]
      },
      {
        type: 'heading',
        content: 'Can You Get a Medical Certificate for Mental Health?',
        level: 2
      },
      {
        type: 'paragraph',
        content: 'Yes. In Australia, mental health conditions are treated the same as physical health conditions under workplace law. If you\'re unwell due to a mental health issue and can\'t work, you\'re entitled to take personal leave — and a medical certificate supports this.',
        links: [{ text: 'personal leave', href: '/blog/sick-leave-rights-australia', title: 'Your sick leave rights' }]
      },
      {
        type: 'paragraph',
        content: 'Fair Work Australia recognises that "personal illness or injury" includes mental health conditions. Your employer cannot legally distinguish between physical and mental health when it comes to sick leave entitlements.'
      },
      {
        type: 'heading',
        content: 'What Your Certificate Will Say',
        level: 2
      },
      {
        type: 'paragraph',
        content: 'Medical certificates don\'t need to disclose your specific condition. A doctor will typically write something like "unfit for work due to a medical condition" — your employer doesn\'t have a right to know your diagnosis.'
      },
      {
        type: 'callout',
        variant: 'info',
        content: 'Your medical certificate will state that you are unfit for work for a specified period. It will not disclose details of your mental health condition unless you specifically request it.'
      },
      {
        type: 'heading',
        content: 'When to Take a Mental Health Day',
        level: 2
      },
      {
        type: 'paragraph',
        content: 'Consider taking time off if you\'re experiencing:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Overwhelming anxiety affecting your ability to concentrate or function',
          'Symptoms of depression such as persistent low mood or fatigue',
          'Burnout or emotional exhaustion from work stress',
          'Panic attacks or severe stress responses',
          'Sleep disturbances that leave you unable to work safely',
          'A mental health condition that temporarily worsens'
        ]
      },
      {
        type: 'heading',
        content: 'The Process for Getting a Certificate',
        level: 2
      },
      {
        type: 'paragraph',
        content: 'Getting a medical certificate for mental health follows the same process as any other condition:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Complete a brief health questionnaire describing how you\'re feeling',
          'A doctor reviews your information and assesses your situation',
          'If appropriate, they issue a certificate for the recommended time off',
          'You receive your certificate digitally, usually within an hour'
        ]
      },
      {
        type: 'heading',
        content: 'How Many Days Can You Take?',
        level: 2
      },
      {
        type: 'paragraph',
        content: 'The duration depends on your individual circumstances. For acute stress or a difficult period, 1-2 days may be appropriate. For more significant mental health challenges, longer periods might be recommended.'
      },
      {
        type: 'paragraph',
        content: 'The doctor will recommend a duration based on what you describe. If your situation requires more extended leave, they may suggest ongoing support from a GP or mental health professional.'
      },
      {
        type: 'heading',
        content: 'Your Rights at Work',
        level: 2
      },
      {
        type: 'paragraph',
        content: 'Under Australian law, you have the right to:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Use your personal/sick leave for mental health conditions',
          'Keep your diagnosis private — certificates don\'t need to specify the condition',
          'Not face discrimination for taking mental health leave',
          'Request reasonable workplace adjustments for ongoing conditions'
        ]
      },
      {
        type: 'callout',
        variant: 'tip',
        content: 'If you\'re frequently needing time off for mental health, consider speaking with a GP about a Mental Health Care Plan, which provides access to subsidised psychology sessions.'
      },
      {
        type: 'heading',
        content: 'When to Seek More Support',
        level: 2
      },
      {
        type: 'paragraph',
        content: 'A medical certificate helps with immediate time off, but if you\'re struggling regularly, additional support can make a real difference:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Your GP can create a Mental Health Care Plan for subsidised psychology',
          'Employee Assistance Programs (EAP) offer free confidential counselling',
          'Beyond Blue (1300 22 4636) provides 24/7 support',
          'Lifeline (13 11 14) is available for crisis support'
        ]
      },
      {
        type: 'callout',
        variant: 'emergency',
        content: 'If you\'re experiencing thoughts of self-harm or suicide, please contact Lifeline on 13 11 14, or call 000 in an emergency. These services are free and available 24/7.'
      }
    ],
    faqs: [
      {
        question: 'Will my employer know it\'s for mental health?',
        answer: 'No. Medical certificates state that you\'re unfit for work due to a medical condition. They do not disclose your specific diagnosis. Your mental health is private.'
      },
      {
        question: 'Can I get a mental health certificate online?',
        answer: 'Yes. Telehealth doctors can assess mental health concerns and issue valid medical certificates. Many people find it more comfortable to discuss mental health remotely.'
      },
      {
        question: 'How many mental health days can I take per year?',
        answer: 'There\'s no separate allocation for mental health days. They come from your personal/sick leave entitlement (typically 10 days per year for full-time employees). You can use as many as you need, provided you have the leave available.'
      },
      {
        question: 'Can my employer ask why I\'m taking sick leave?',
        answer: 'Employers can ask for evidence you were unwell (a medical certificate), but they cannot require you to disclose your diagnosis. "Medical condition" is sufficient.'
      },
      {
        question: 'What if I need longer than a few days?',
        answer: 'If you need extended leave, the doctor may recommend you see a GP for ongoing support. For longer absences, a Mental Health Care Plan or workplace accommodations might be appropriate.'
      }
    ],
    relatedServices: [
      {
        title: 'Medical Certificate',
        description: 'Get a valid certificate for time off work',
        href: '/medical-certificate',
        icon: 'certificate'
      },
      {
        title: 'GP Consultation',
        description: 'Speak with a doctor about your mental health',
        href: '/general-consult',
        icon: 'consult'
      }
    ],
    seo: {
      title: 'Medical Certificate for Mental Health Day | Australia | InstantMed',
      description: 'Can you get a medical certificate for a mental health day in Australia? Yes. Learn about your rights, the process, and how to get a certificate online.',
      keywords: [
        'medical certificate mental health',
        'mental health day certificate',
        'sick leave mental health australia',
        'mental health certificate online',
        'can you get sick note for anxiety'
      ]
    }
  },
  {
    slug: 'medical-certificate-food-poisoning',
    title: 'Medical Certificate for Food Poisoning',
    subtitle: 'Food poisoning can strike suddenly and leave you unable to work. Here\'s what you need to know.',
    excerpt: 'Food poisoning is a valid reason for sick leave. Learn how to get a medical certificate and when you\'re safe to return to work.',
    category: 'medical-certificates',
    tags: ['food-poisoning', 'sick-leave', 'work', 'stomach', 'nausea'],
    publishedAt: '2024-07-20',
    updatedAt: '2026-01-10',
    readingTime: 3,
    viewCount: 45230,
    series: { ...articleSeries['medical-certificates-101'], order: 2 },
    author: defaultAuthor,
    heroImage: blogImages.foodPoisoning,
    heroImageAlt: 'Person resting at home recovering from food poisoning',
    content: [
      {
        type: 'paragraph',
        content: 'Food poisoning is unpleasant, often sudden, and definitely a valid reason to stay home from work. If you\'ve eaten something that\'s made you sick, here\'s what you need to know about getting time off and returning to work safely.'
      },
      {
        type: 'heading',
        content: 'Common Symptoms of Food Poisoning',
        level: 2
      },
      {
        type: 'paragraph',
        content: 'Food poisoning typically causes:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Nausea and vomiting',
          'Diarrhea (often watery)',
          'Stomach cramps and abdominal pain',
          'Fever and chills',
          'Fatigue and weakness',
          'Loss of appetite'
        ]
      },
      {
        type: 'paragraph',
        content: 'Symptoms usually appear within 1-24 hours of eating contaminated food, though some types can take longer to develop.'
      },
      {
        type: 'heading',
        content: 'Getting a Medical Certificate',
        level: 2
      },
      {
        type: 'paragraph',
        content: 'You can get a medical certificate for food poisoning through a telehealth consultation. The doctor will assess your symptoms and, if appropriate, provide a certificate for the time you need to recover.',
        links: [{ text: 'telehealth consultation', href: '/blog/what-is-telehealth', title: 'What is telehealth?' }]
      },
      {
        type: 'paragraph',
        content: 'Most cases of food poisoning resolve within 1-3 days. Your certificate will typically cover this period, with guidance on when it\'s safe to return to work.'
      },
      {
        type: 'heading',
        content: 'When You Must Stay Home',
        level: 2
      },
      {
        type: 'callout',
        variant: 'warning',
        content: 'If you work with food, healthcare, aged care, or childcare, you must stay home until 48 hours after your last episode of vomiting or diarrhea. This is a legal requirement to prevent spreading illness to vulnerable people.'
      },
      {
        type: 'paragraph',
        content: 'Even if you feel better, the 48-hour rule is important because you can still be contagious. Food Safety Australia requires this for anyone handling food or working with vulnerable populations.'
      },
      {
        type: 'heading',
        content: 'Recovery Tips',
        level: 2
      },
      {
        type: 'list',
        content: '',
        items: [
          'Stay hydrated — small sips of water, clear broth, or oral rehydration solution',
          'Rest as much as possible',
          'Avoid solid food until vomiting stops, then start with bland foods',
          'Avoid dairy, caffeine, alcohol, and fatty foods until fully recovered',
          'Wash hands thoroughly and frequently to prevent spreading'
        ]
      },
      {
        type: 'heading',
        content: 'When to Seek Urgent Care',
        level: 2
      },
      {
        type: 'paragraph',
        content: 'While most food poisoning resolves on its own, some situations need urgent medical attention:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Blood in vomit or stool',
          'High fever (over 39°C)',
          'Severe dehydration (dark urine, dizziness, confusion)',
          'Symptoms lasting more than 3 days',
          'You\'re pregnant, elderly, or have a weakened immune system'
        ]
      },
      {
        type: 'callout',
        variant: 'emergency',
        content: 'If you experience severe dehydration, blood in vomit or stool, or symptoms aren\'t improving after 3 days, seek in-person medical care or call 000 in an emergency.'
      },
      {
        type: 'heading',
        content: 'Returning to Work',
        level: 2
      },
      {
        type: 'paragraph',
        content: 'For most office workers, you can return once you feel well enough and symptoms have settled. For food handlers and those working with vulnerable people, wait 48 hours after your last symptoms before returning.'
      },
      {
        type: 'paragraph',
        content: 'If your workplace requires a clearance certificate before returning, a doctor can provide this once you\'ve been symptom-free for the appropriate period.'
      }
    ],
    faqs: [
      {
        question: 'How long should I stay off work with food poisoning?',
        answer: 'Most people need 1-3 days to recover. Food handlers must wait 48 hours after their last symptoms before returning. Your medical certificate will specify the recommended time off.'
      },
      {
        question: 'Can I get a medical certificate for food poisoning online?',
        answer: 'Yes. Telehealth doctors can assess your symptoms and issue a valid medical certificate for food poisoning without you needing to leave home.'
      },
      {
        question: 'Do I need to see a doctor for food poisoning?',
        answer: 'Mild cases often resolve on their own with rest and hydration. However, if you need a medical certificate for work, or if symptoms are severe or lasting more than 3 days, you should consult a doctor.'
      },
      {
        question: 'What if I work with food?',
        answer: 'Food handlers must not return to work until 48 hours after vomiting and diarrhea have stopped. This is a legal requirement under Australian food safety regulations.'
      }
    ],
    relatedServices: [
      {
        title: 'Medical Certificate',
        description: 'Get a certificate for food poisoning',
        href: '/medical-certificate',
        icon: 'certificate'
      },
      {
        title: 'Gastro Assessment',
        description: 'Speak with a doctor about your symptoms',
        href: '/conditions/gastro',
        icon: 'consult'
      }
    ],
    seo: {
      title: 'Medical Certificate for Food Poisoning | Get One Online | InstantMed',
      description: 'Need a medical certificate for food poisoning? Learn how long to stay off work, when you can return, and how to get a certificate online in Australia.',
      keywords: [
        'medical certificate food poisoning',
        'sick note food poisoning',
        'food poisoning time off work',
        'food handler sick certificate',
        'gastro medical certificate'
      ]
    }
  },
  {
    slug: 'medical-certificate-period-pain',
    title: 'Medical Certificate for Period Pain',
    subtitle: 'Severe period pain is a legitimate medical condition. You don\'t need to push through.',
    excerpt: 'Period pain (dysmenorrhea) can be debilitating. Learn about getting medical certificates and when to seek further help.',
    category: 'medical-certificates',
    tags: ['womens-health', 'sick-leave', 'work', 'chronic'],
    publishedAt: '2024-08-05',
    updatedAt: '2026-01-12',
    readingTime: 3,
    viewCount: 42150,
    series: { ...articleSeries['medical-certificates-101'], order: 3 },
    author: defaultAuthor,
    heroImage: blogImages.periodPain,
    heroImageAlt: 'Woman resting comfortably at home during period',
    content: [
      {
        type: 'paragraph',
        content: 'Severe period pain — medically called dysmenorrhea — affects many women and can significantly impact daily activities, including work. If your period pain is preventing you from working, you have every right to take sick leave.',
        links: [{ text: 'sick leave', href: '/blog/sick-leave-rights-australia', title: 'Your sick leave rights' }]
      },
      {
        type: 'heading',
        content: 'Period Pain Is a Valid Medical Reason',
        level: 2
      },
      {
        type: 'paragraph',
        content: 'Let\'s be clear: period pain is a legitimate medical condition. While some people experience mild discomfort, others have pain severe enough to cause nausea, vomiting, dizziness, and an inability to function normally.'
      },
      {
        type: 'paragraph',
        content: 'Under Australian workplace law, personal leave covers any illness or injury that prevents you from working. Period pain qualifies just like any other condition.'
      },
      {
        type: 'callout',
        variant: 'info',
        content: 'Your medical certificate will state you\'re unfit for work due to a medical condition. It won\'t specify "period pain" unless you request it — your reproductive health is private.'
      },
      {
        type: 'heading',
        content: 'Symptoms That Warrant Time Off',
        level: 2
      },
      {
        type: 'paragraph',
        content: 'Consider taking sick leave if you\'re experiencing:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Severe cramping that prevents normal activities',
          'Pain that doesn\'t respond to over-the-counter medication',
          'Nausea, vomiting, or diarrhea with your period',
          'Heavy bleeding that requires frequent changes',
          'Fatigue or dizziness that makes working unsafe',
          'Migraines triggered by your menstrual cycle'
        ]
      },
      {
        type: 'heading',
        content: 'Getting a Medical Certificate',
        level: 2
      },
      {
        type: 'paragraph',
        content: 'You can get a medical certificate for period pain through a telehealth consultation. The process is straightforward and discreet:',
        links: [{ text: 'telehealth consultation', href: '/blog/what-is-telehealth', title: 'What is telehealth?' }]
      },
      {
        type: 'list',
        content: '',
        items: [
          'Complete a brief questionnaire about your symptoms',
          'A doctor reviews your information',
          'If appropriate, they issue a certificate for 1-2 days',
          'You receive your certificate digitally'
        ]
      },
      {
        type: 'heading',
        content: 'When Period Pain Might Be Something More',
        level: 2
      },
      {
        type: 'paragraph',
        content: 'While period pain is common, severe or worsening pain could indicate an underlying condition:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Endometriosis — tissue similar to the uterine lining grows outside the uterus',
          'Adenomyosis — uterine lining grows into the muscular wall of the uterus',
          'Fibroids — non-cancerous growths in the uterus',
          'Pelvic inflammatory disease — infection of the reproductive organs'
        ]
      },
      {
        type: 'callout',
        variant: 'warning',
        content: 'If your period pain is getting worse over time, you\'re regularly missing work or activities, or pain medication isn\'t helping, see your GP for investigation. These symptoms deserve attention.'
      },
      {
        type: 'heading',
        content: 'Managing Severe Period Pain',
        level: 2
      },
      {
        type: 'paragraph',
        content: 'While there\'s no instant fix, several approaches can help:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Heat packs on the lower abdomen',
          'Anti-inflammatory medication (like ibuprofen) taken at the first sign of pain',
          'Gentle movement or stretching when possible',
          'Hormonal contraceptives — many reduce or eliminate period pain',
          'Prescription options for severe cases'
        ]
      },
      {
        type: 'heading',
        content: 'Your Workplace Rights',
        level: 2
      },
      {
        type: 'paragraph',
        content: 'You\'re entitled to use your personal leave for period pain. Your employer cannot ask for details of your condition — "medical condition" on a certificate is sufficient.'
      },
      {
        type: 'paragraph',
        content: 'Some Australian organisations are beginning to introduce menstrual leave policies, though this isn\'t yet mandatory. Regardless, your existing sick leave entitlements cover period-related illness.'
      }
    ],
    faqs: [
      {
        question: 'Can I get a medical certificate just for period pain?',
        answer: 'Yes. Period pain is a legitimate medical condition. If it\'s preventing you from working, you can get a medical certificate like any other illness.'
      },
      {
        question: 'Will my certificate say it\'s for period pain?',
        answer: 'No, unless you specifically request it. Certificates typically state "unfit for work due to a medical condition" without specifying details.'
      },
      {
        question: 'How many days can I take off for period pain?',
        answer: 'This depends on your symptoms. Typically 1-2 days per cycle is common for severe pain. If you\'re regularly needing more, it\'s worth investigating underlying causes with your GP.'
      },
      {
        question: 'Should I see a doctor about my period pain?',
        answer: 'If your period pain is severe, worsening, or doesn\'t respond to over-the-counter medication, yes. These could be signs of conditions like endometriosis that benefit from treatment.'
      }
    ],
    relatedServices: [
      {
        title: 'Medical Certificate',
        description: 'Get a certificate for time off work',
        href: '/medical-certificate',
        icon: 'certificate'
      },
      {
        title: 'Women\'s Health',
        description: 'Speak with a doctor about ongoing symptoms',
        href: '/womens-health',
        icon: 'consult'
      }
    ],
    seo: {
      title: 'Medical Certificate for Period Pain | Dysmenorrhea | InstantMed',
      description: 'Can you get a medical certificate for period pain in Australia? Yes. Learn about your rights, when to seek help, and how to get a certificate online.',
      keywords: [
        'medical certificate period pain',
        'sick leave period pain australia',
        'dysmenorrhea medical certificate',
        'period pain work absence',
        'menstrual leave australia'
      ]
    }
  },
  {
    slug: 'medical-certificate-centrelink',
    title: 'Medical Certificates for Centrelink',
    subtitle: 'Understanding medical evidence requirements for Centrelink payments.',
    excerpt: 'Centrelink often requires medical certificates as evidence. Learn about requirements for different payments and how to get appropriate documentation.',
    category: 'medical-certificates',
    tags: ['medical-certificate', 'centrelink', 'chronic', 'management'],
    publishedAt: '2024-09-10',
    updatedAt: '2026-01-08',
    readingTime: 3,
    viewCount: 38940,
    author: defaultAuthor,
    heroImage: blogImages.centrelink,
    heroImageAlt: 'Person organizing important Centrelink documents',
    content: [
      {
        type: 'paragraph',
        content: 'Centrelink requires medical evidence for various payments and circumstances. Understanding what\'s needed can help you get the right documentation and avoid delays in your claims.',
        links: [{ text: 'medical evidence', href: '/blog/are-online-medical-certificates-valid', title: 'Are online certificates valid?' }]
      },
      {
        type: 'heading',
        content: 'Types of Medical Evidence Centrelink Accepts',
        level: 2
      },
      {
        type: 'paragraph',
        content: 'Depending on your situation, Centrelink may accept:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Standard medical certificates for short-term illness',
          'Centrelink Medical Certificate (SU415) for capacity assessments',
          'Medical reports from treating doctors',
          'Specialist reports for specific conditions',
          'Hospital discharge summaries'
        ]
      },
      {
        type: 'callout',
        variant: 'info',
        content: 'For most simple situations like temporary illness affecting job search, a standard medical certificate from any registered doctor is sufficient. More complex claims may require specific Centrelink forms.'
      },
      {
        type: 'heading',
        content: 'JobSeeker and Mutual Obligations',
        level: 2
      },
      {
        type: 'paragraph',
        content: 'If you\'re on JobSeeker and too unwell to meet your mutual obligations (like job search requirements or appointments), you may need a medical certificate.'
      },
      {
        type: 'list',
        content: '',
        items: [
          'A standard certificate can cover short absences (up to 14 days)',
          'For longer periods, Centrelink may require an Exemption from Mutual Obligations',
          'Your employment services provider should be notified of your incapacity',
          'Keep copies of all certificates for your records'
        ]
      },
      {
        type: 'heading',
        content: 'Disability Support Pension (DSP)',
        level: 2
      },
      {
        type: 'paragraph',
        content: 'DSP has specific medical evidence requirements that are more comprehensive than a standard certificate:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Medical evidence must be from your treating doctor(s)',
          'Conditions must be diagnosed, reasonably treated, and stabilised',
          'You\'ll likely need specialist reports for your conditions',
          'The Impairment Tables are used to assess your functional capacity'
        ]
      },
      {
        type: 'callout',
        variant: 'warning',
        content: 'DSP applications require comprehensive medical documentation usually gathered over time with your regular GP and specialists. A single telehealth certificate is not sufficient for DSP applications.'
      },
      {
        type: 'heading',
        content: 'Carer Payment and Carer Allowance',
        level: 2
      },
      {
        type: 'paragraph',
        content: 'If you\'re applying for carer payments, you\'ll need medical evidence about the person you\'re caring for:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Treating Doctor\'s Report form from their doctor',
          'Details of their condition and care needs',
          'Information about the level of care required',
          'For children, a Child Disability Assessment Tool (CDAT) may be needed'
        ]
      },
      {
        type: 'heading',
        content: 'What Telehealth Certificates Can Cover',
        level: 2
      },
      {
        type: 'paragraph',
        content: 'A telehealth medical certificate is appropriate for:',
        links: [{ text: 'telehealth medical certificate', href: '/blog/medical-certificate-online-australia', title: 'Get a medical certificate online' }]
      },
      {
        type: 'list',
        content: '',
        items: [
          'Short-term illness affecting your ability to meet obligations',
          'Temporary incapacity for work or job search',
          'Brief periods of being unfit for activities',
          'Follow-up certificates for ongoing conditions (with existing documentation)'
        ]
      },
      {
        type: 'paragraph',
        content: 'For more complex claims, your regular GP who knows your full medical history is usually better placed to provide comprehensive documentation.'
      },
      {
        type: 'heading',
        content: 'Tips for Centrelink Medical Evidence',
        level: 2
      },
      {
        type: 'list',
        content: '',
        items: [
          'Keep copies of all medical certificates and reports',
          'Ask your doctor to be specific about limitations and duration',
          'Submit evidence promptly to avoid payment delays',
          'If in doubt about what\'s required, contact Centrelink first',
          'For complex claims, work with your regular treating team'
        ]
      }
    ],
    faqs: [
      {
        question: 'Will Centrelink accept an online medical certificate?',
        answer: 'Yes, for standard situations. Centrelink accepts medical certificates from any AHPRA-registered doctor, including those issued through telehealth. For complex claims like DSP, you\'ll need comprehensive evidence from your regular treating doctors.'
      },
      {
        question: 'How long can a medical certificate cover for Centrelink?',
        answer: 'Standard certificates typically cover up to 14 days. For longer periods of incapacity, you may need an Exemption from Mutual Obligations, which requires more detailed medical evidence.'
      },
      {
        question: 'Can I get a Centrelink medical certificate online?',
        answer: 'For short-term illness or temporary incapacity, yes. For specific Centrelink forms like the SU415, check with your regular GP as these often require more detailed assessment.'
      },
      {
        question: 'What if Centrelink rejects my medical certificate?',
        answer: 'If your certificate is rejected, contact Centrelink to understand what additional information they need. You may need a more detailed certificate or specific forms from your treating doctor.'
      }
    ],
    relatedServices: [
      {
        title: 'Medical Certificate',
        description: 'Get a standard medical certificate',
        href: '/medical-certificate',
        icon: 'certificate'
      },
      {
        title: 'GP Consultation',
        description: 'Discuss your situation with a doctor',
        href: '/general-consult',
        icon: 'consult'
      }
    ],
    seo: {
      title: 'Medical Certificate for Centrelink | Requirements & How to Get One | InstantMed',
      description: 'What medical certificates does Centrelink accept? Requirements for JobSeeker, DSP, and when online certificates work.',
      keywords: [
        'centrelink medical certificate',
        'medical certificate jobseeker',
        'centrelink sick certificate',
        'medical evidence centrelink',
        'disability support pension medical evidence'
      ]
    }
  },
  {
    slug: 'medical-certificate-carers-leave',
    title: 'Medical Certificate for Carer\'s Leave',
    subtitle: 'Taking time off to care for a sick family member? Here\'s what you need to know.',
    excerpt: 'Carer\'s leave allows you to take time off to care for an ill family member. Learn about your entitlements and documentation requirements.',
    category: 'medical-certificates',
    tags: ['carer', 'family', 'sick-leave', 'work', 'children'],
    publishedAt: '2024-10-01',
    updatedAt: '2026-01-05',
    readingTime: 3,
    viewCount: 24680,
    series: { ...articleSeries['medical-certificates-101'], order: 4 },
    author: defaultAuthor,
    heroImage: blogImages.carersLeave,
    heroImageAlt: 'Person providing care and support to a family member',
    content: [
      {
        type: 'paragraph',
        content: 'When a family member or household member is ill and needs your care, you\'re entitled to take carer\'s leave. This comes from the same pool as your personal/sick leave under Australian workplace law.',
        links: [{ text: 'personal/sick leave', href: '/blog/sick-leave-rights-australia', title: 'Your sick leave rights' }]
      },
      {
        type: 'heading',
        content: 'Your Carer\'s Leave Entitlements',
        level: 2
      },
      {
        type: 'paragraph',
        content: 'Under the Fair Work Act, full-time and part-time employees get 10 days of paid personal/carer\'s leave per year. You can use this leave to:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Care for an immediate family member who is ill or injured',
          'Support a household member who is unwell',
          'Handle unexpected emergencies involving family members',
          'Take time during a family member\'s medical crisis'
        ]
      },
      {
        type: 'callout',
        variant: 'info',
        content: 'Immediate family includes spouse/partner, children, parents, grandparents, grandchildren, and siblings. It also includes these relations for your partner.'
      },
      {
        type: 'heading',
        content: 'What Evidence You Need',
        level: 2
      },
      {
        type: 'paragraph',
        content: 'Your employer can request evidence that you needed to take carer\'s leave. This typically means:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'A medical certificate for the person you\'re caring for',
          'Or a statutory declaration if a certificate isn\'t practical',
          'The certificate should indicate the person requires care',
          'It doesn\'t need to disclose their specific diagnosis'
        ]
      },
      {
        type: 'heading',
        content: 'Getting the Right Certificate',
        level: 2
      },
      {
        type: 'paragraph',
        content: 'For carer\'s leave, you need a certificate for the person who is ill — not yourself. The certificate should:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Confirm the person has a medical condition',
          'Indicate they require care or support',
          'Cover the dates you took leave',
          'Be from a registered medical practitioner'
        ]
      },
      {
        type: 'paragraph',
        content: 'If you can\'t reasonably get a certificate (for example, if the illness was very brief), a statutory declaration is an acceptable alternative.'
      },
      {
        type: 'heading',
        content: 'Common Situations',
        level: 2
      },
      {
        type: 'heading',
        content: 'Caring for a Sick Child',
        level: 3
      },
      {
        type: 'paragraph',
        content: 'When your child is unwell and can\'t attend school or childcare, you can use carer\'s leave. For brief illnesses, many employers accept a simple notification. For longer absences, a certificate from the child\'s doctor may be requested.'
      },
      {
        type: 'heading',
        content: 'Caring for an Elderly Parent',
        level: 3
      },
      {
        type: 'paragraph',
        content: 'If your parent needs care due to illness, injury, or a medical appointment they can\'t attend alone, carer\'s leave applies. Their doctor can provide a certificate confirming they needed assistance.'
      },
      {
        type: 'heading',
        content: 'Caring for a Partner',
        level: 3
      },
      {
        type: 'paragraph',
        content: 'When your partner is ill and needs care — whether from surgery recovery, acute illness, or a flare-up of a chronic condition — you can take carer\'s leave to support them.'
      },
      {
        type: 'heading',
        content: 'What If You Run Out of Leave?',
        level: 2
      },
      {
        type: 'paragraph',
        content: 'If you\'ve used all your paid personal leave, you may be able to take:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Unpaid carer\'s leave (2 days per occasion)',
          'Annual leave, with your employer\'s agreement',
          'Leave without pay, if your employer approves',
          'Long service leave, if you\'re eligible and employer agrees'
        ]
      },
      {
        type: 'callout',
        variant: 'tip',
        content: 'Some workplaces offer additional carer\'s support through EAP programs, flexible work arrangements, or supplementary leave policies. Check your workplace policies or enterprise agreement.'
      }
    ],
    faqs: [
      {
        question: 'Do I need a medical certificate for carer\'s leave?',
        answer: 'Your employer can request evidence you needed to take carer\'s leave. This is usually a medical certificate for the person you were caring for, or a statutory declaration if a certificate isn\'t practical.'
      },
      {
        question: 'Can I get a medical certificate for my child online?',
        answer: 'Yes, if the doctor can assess your child\'s condition through telehealth (often via you describing symptoms for young children), they can issue a certificate. Some conditions may need in-person assessment.'
      },
      {
        question: 'How many days of carer\'s leave can I take?',
        answer: 'Carer\'s leave comes from your 10 days of personal/carer\'s leave per year. Once that\'s exhausted, you may be entitled to 2 days unpaid carer\'s leave per occasion.'
      },
      {
        question: 'Who counts as a family member for carer\'s leave?',
        answer: 'Immediate family (spouse, children, parents, grandparents, grandchildren, siblings) and their equivalents for your partner. Household members who live with you are also included.'
      }
    ],
    relatedServices: [
      {
        title: 'Medical Certificate',
        description: 'Certificate for the person being cared for',
        href: '/medical-certificate',
        icon: 'certificate'
      },
      {
        title: 'GP Consultation',
        description: 'Speak with a doctor about care needs',
        href: '/general-consult',
        icon: 'consult'
      }
    ],
    seo: {
      title: 'Medical Certificate for Carer\'s Leave | Australia | InstantMed',
      description: 'Taking carer\'s leave to look after a sick family member? Learn about your entitlements, what evidence you need, and how to get documentation.',
      keywords: [
        'carers leave medical certificate',
        'carer leave australia',
        'medical certificate for family member',
        'sick leave caring for family',
        'carers leave entitlements'
      ]
    }
  },
  {
    slug: 'medical-certificate-surgery-recovery',
    title: 'Medical Certificate After Surgery',
    subtitle: 'Recovering from surgery takes time. Here\'s what to know about time off work.',
    excerpt: 'After surgery, you\'ll need time to recover. Learn about getting medical certificates for post-operative recovery and returning to work safely.',
    category: 'medical-certificates',
    publishedAt: '2024-10-15',
    updatedAt: '2026-01-03',
    readingTime: 3,
    viewCount: 31450,
    author: defaultAuthor,
    heroImage: blogImages.surgeryRecovery,
    heroImageAlt: 'Person recovering comfortably at home after surgery',
    content: [
      {
        type: 'paragraph',
        content: 'Surgery — whether minor or major — requires recovery time. Your body needs time to heal, and returning to work too early can compromise your recovery or risk complications.'
      },
      {
        type: 'heading',
        content: 'Getting Clearance From Your Surgeon',
        level: 2
      },
      {
        type: 'paragraph',
        content: 'Your surgeon or hospital will typically provide initial documentation covering your expected recovery period. This usually includes:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Hospital discharge summary with expected recovery time',
          'Post-operative instructions and restrictions',
          'Initial medical certificate for your employer',
          'Follow-up appointment schedule'
        ]
      },
      {
        type: 'callout',
        variant: 'info',
        content: 'If you didn\'t receive a medical certificate at discharge, contact the hospital\'s medical records department. They can often provide one retrospectively.'
      },
      {
        type: 'heading',
        content: 'Typical Recovery Times',
        level: 2
      },
      {
        type: 'paragraph',
        content: 'Recovery times vary greatly depending on the type of surgery and your overall health. Some general guidelines:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Minor procedures (skin lesions, scope procedures): 1-3 days',
          'Laparoscopic surgery: 1-2 weeks',
          'Abdominal surgery: 2-6 weeks',
          'Joint replacement: 6-12 weeks',
          'Major surgery: 6 weeks or more'
        ]
      },
      {
        type: 'paragraph',
        content: 'These are general estimates only. Your actual recovery depends on factors like your age, fitness, the specific procedure, and how your body heals.'
      },
      {
        type: 'heading',
        content: 'When You Need Additional Certificates',
        level: 2
      },
      {
        type: 'paragraph',
        content: 'Sometimes recovery takes longer than initially anticipated. You may need additional certificates if:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Your initial certificate is expiring but you\'re not ready to return',
          'You experience complications requiring extended recovery',
          'Your job has physical demands that require longer healing',
          'Your employer requests updated documentation'
        ]
      },
      {
        type: 'heading',
        content: 'Getting Follow-Up Certificates',
        level: 2
      },
      {
        type: 'paragraph',
        content: 'For follow-up certificates after surgery, you have options:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Your surgeon at your follow-up appointment',
          'Your regular GP who can assess your recovery',
          'Telehealth consultation if you have documentation of your surgery'
        ]
      },
      {
        type: 'callout',
        variant: 'warning',
        content: 'For telehealth certificates after surgery, you\'ll need to provide details of your procedure (discharge summary or surgeon\'s letter). The doctor needs to understand what surgery you had to assess appropriate recovery time.'
      },
      {
        type: 'heading',
        content: 'Returning to Work After Surgery',
        level: 2
      },
      {
        type: 'paragraph',
        content: 'Before returning to work, consider:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Have you been cleared by your surgeon or treating doctor?',
          'Can you safely perform your job duties?',
          'Do you need modified duties or a graduated return?',
          'Are there any ongoing restrictions (lifting, driving, standing)?'
        ]
      },
      {
        type: 'heading',
        content: 'Modified Duties and Graduated Return',
        level: 2
      },
      {
        type: 'paragraph',
        content: 'Many people benefit from a graduated return to work. Your doctor can provide a certificate specifying:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Reduced hours initially (e.g., half days)',
          'Restrictions on physical tasks (no lifting over X kg)',
          'Requirement for rest breaks',
          'Duration of modified duties before full return'
        ]
      },
      {
        type: 'paragraph',
        content: 'Your employer has obligations under workplace health and safety laws to accommodate reasonable requests for modified duties during recovery.'
      }
    ],
    faqs: [
      {
        question: 'Can I get a medical certificate for surgery recovery online?',
        answer: 'For follow-up certificates when your initial certificate has expired, yes — provided you can share documentation of your surgery. For initial certificates, these typically come from your surgeon or hospital.'
      },
      {
        question: 'How long can I take off work after surgery?',
        answer: 'This depends entirely on the type of surgery and your job. Your surgeon will advise on expected recovery time. For desk work, you may return sooner than physical jobs. Always get clearance before returning.'
      },
      {
        question: 'What if my recovery takes longer than expected?',
        answer: 'Recovery times are estimates. If you need longer, your treating doctor can provide additional certificates. Don\'t rush back before you\'re ready — this can lead to complications or re-injury.'
      },
      {
        question: 'Can I do light duties while recovering from surgery?',
        answer: 'Possibly. Your doctor can provide a certificate specifying what activities are safe. Some surgeries require complete rest initially, while others allow light duties from the start.'
      }
    ],
    relatedServices: [
      {
        title: 'Medical Certificate',
        description: 'Get a follow-up recovery certificate',
        href: '/medical-certificate',
        icon: 'certificate'
      },
      {
        title: 'GP Consultation',
        description: 'Discuss your recovery progress',
        href: '/general-consult',
        icon: 'consult'
      }
    ],
    seo: {
      title: 'Medical Certificate After Surgery | Recovery Time Off Work | InstantMed',
      description: 'Need a medical certificate after surgery? Learn about typical recovery times, getting follow-up certificates, and returning to work safely.',
      keywords: [
        'medical certificate after surgery',
        'post surgery recovery certificate',
        'time off work after surgery',
        'surgery recovery medical certificate',
        'return to work after surgery'
      ]
    }
  },
  {
    slug: 'medical-certificate-pregnancy-related-absence',
    title: 'Medical Certificate for Pregnancy-Related Absence',
    subtitle: 'Morning sickness, fatigue, and pregnancy complications are valid reasons for time off.',
    excerpt: 'Pregnancy-related illness is a legitimate medical condition. Learn about getting certificates for morning sickness, fatigue, and complications.',
    category: 'medical-certificates',
    publishedAt: '2024-11-01',
    updatedAt: '2026-01-06',
    readingTime: 3,
    viewCount: 28730,
    author: defaultAuthor,
    heroImage: blogImages.pregnancy,
    heroImageAlt: 'Pregnant woman resting comfortably at home',
    content: [
      {
        type: 'paragraph',
        content: 'Pregnancy affects every woman differently. Some sail through with minimal symptoms, while others experience severe nausea, fatigue, or complications that make working impossible. All pregnancy-related illness is a valid reason for sick leave.'
      },
      {
        type: 'heading',
        content: 'Pregnancy-Related Conditions Requiring Time Off',
        level: 2
      },
      {
        type: 'paragraph',
        content: 'Common pregnancy symptoms that may warrant sick leave include:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Severe morning sickness (hyperemesis gravidarum)',
          'Extreme fatigue, especially in first and third trimesters',
          'Back pain or pelvic girdle pain',
          'Pregnancy-related anaemia',
          'High blood pressure or pre-eclampsia',
          'Gestational diabetes management',
          'Threatened miscarriage or bleeding',
          'Mental health concerns during pregnancy'
        ]
      },
      {
        type: 'callout',
        variant: 'info',
        content: 'Pregnancy-related sick leave comes from your personal leave entitlement, separate from parental leave. You can use your sick leave for pregnancy illness before your parental leave starts.'
      },
      {
        type: 'heading',
        content: 'Getting a Medical Certificate',
        level: 2
      },
      {
        type: 'paragraph',
        content: 'You can get a medical certificate for pregnancy-related illness like any other condition. The certificate will state you\'re unfit for work without necessarily disclosing pregnancy details unless you want it to.'
      },
      {
        type: 'paragraph',
        content: 'For ongoing pregnancy care and complications, your treating obstetrician, midwife, or GP is usually the best source of certificates as they know your full situation.'
      },
      {
        type: 'heading',
        content: 'Morning Sickness and Hyperemesis',
        level: 2
      },
      {
        type: 'paragraph',
        content: 'Morning sickness affects up to 80% of pregnant women. For most, it\'s manageable, but severe morning sickness (hyperemesis gravidarum) can be debilitating.'
      },
      {
        type: 'paragraph',
        content: 'Signs you may need time off for morning sickness:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Unable to keep food or fluids down',
          'Vomiting multiple times per day',
          'Weight loss due to inability to eat',
          'Dehydration symptoms',
          'Too unwell to safely work or commute'
        ]
      },
      {
        type: 'callout',
        variant: 'warning',
        content: 'If you can\'t keep fluids down for 24 hours, are losing significant weight, or feel very unwell, see your doctor or midwife promptly. Severe hyperemesis may need medical treatment.'
      },
      {
        type: 'heading',
        content: 'Your Workplace Rights',
        level: 2
      },
      {
        type: 'paragraph',
        content: 'Pregnant employees have specific protections under Australian law:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'You cannot be discriminated against for pregnancy-related illness',
          'You can use sick leave for pregnancy symptoms like any other illness',
          'You can request modified duties or "light duties" if your job poses risks',
          'You have the right to a safe workplace throughout pregnancy',
          'Your employer cannot make you take parental leave early due to illness'
        ]
      },
      {
        type: 'heading',
        content: 'Pregnancy Complications',
        level: 2
      },
      {
        type: 'paragraph',
        content: 'Some pregnancy complications require immediate rest and medical attention:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Bleeding at any stage — contact your midwife or hospital',
          'Severe abdominal pain',
          'Signs of preterm labour',
          'High blood pressure or pre-eclampsia symptoms',
          'Reduced foetal movement'
        ]
      },
      {
        type: 'callout',
        variant: 'emergency',
        content: 'If you experience heavy bleeding, severe pain, or significantly reduced baby movement, contact your hospital maternity unit immediately or call 000. These require urgent assessment.'
      },
      {
        type: 'heading',
        content: 'Telehealth During Pregnancy',
        level: 2
      },
      {
        type: 'paragraph',
        content: 'Telehealth can be appropriate for:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Medical certificates for morning sickness or fatigue',
          'General advice about managing symptoms',
          'Mental health support during pregnancy',
          'Follow-up after hospital assessments'
        ]
      },
      {
        type: 'paragraph',
        content: 'However, your regular pregnancy care should continue with your obstetrician, midwife, or GP who can monitor you and your baby properly.'
      }
    ],
    faqs: [
      {
        question: 'Can I get a medical certificate for morning sickness?',
        answer: 'Yes. Morning sickness is a legitimate medical condition. If it\'s preventing you from working, you can get a medical certificate like any other illness.'
      },
      {
        question: 'Does sick leave for pregnancy reduce my parental leave?',
        answer: 'No. Sick leave (personal leave) is separate from parental leave. You can use your sick leave for pregnancy-related illness before your parental leave begins.'
      },
      {
        question: 'Will my certificate say I\'m pregnant?',
        answer: 'Not unless you want it to. Certificates typically state "unfit for work due to a medical condition" without specifying details. Your pregnancy is private information.'
      },
      {
        question: 'Can my employer make me start maternity leave early if I\'m sick?',
        answer: 'No. Pregnancy-related illness is treated like any other illness. Your parental leave starts when you choose (up to 6 weeks before the due date), not when your employer decides.'
      }
    ],
    relatedServices: [
      {
        title: 'Medical Certificate',
        description: 'Get a certificate for pregnancy-related illness',
        href: '/medical-certificate',
        icon: 'certificate'
      },
      {
        title: 'Women\'s Health',
        description: 'Speak with a doctor about your symptoms',
        href: '/womens-health',
        icon: 'consult'
      }
    ],
    seo: {
      title: 'Medical Certificate for Pregnancy-Related Absence | Morning Sickness | InstantMed',
      description: 'Can you get a medical certificate for morning sickness or pregnancy complications? Yes. Learn about your rights and getting documentation.',
      keywords: [
        'medical certificate morning sickness',
        'pregnancy sick leave',
        'medical certificate pregnancy',
        'hyperemesis gravidarum certificate',
        'pregnancy related illness work'
      ]
    }
  },
  {
    slug: 'how-long-can-medical-certificate-cover',
    title: 'How Many Days Can a Medical Certificate Cover?',
    subtitle: 'Understanding certificate durations, extensions, and what\'s typical for different conditions.',
    excerpt: 'Medical certificate durations vary based on your condition. Learn what\'s typical, when you can get extensions, and what doctors consider.',
    category: 'medical-certificates',
    publishedAt: '2024-11-15',
    updatedAt: '2026-01-10',
    readingTime: 3,
    viewCount: 52180,
    author: defaultAuthor,
    heroImage: blogImages.certificateDuration,
    heroImageAlt: 'Calendar showing medical certificate duration planning',
    content: [
      {
        type: 'paragraph',
        content: 'One of the most common questions about medical certificates is how many days they can cover. The short answer: it depends on your condition and the doctor\'s clinical judgment.'
      },
      {
        type: 'heading',
        content: 'What Determines Certificate Duration?',
        level: 2
      },
      {
        type: 'paragraph',
        content: 'When deciding how many days to certify, doctors consider:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'The nature of your illness or injury',
          'Typical recovery times for that condition',
          'Your job requirements and physical demands',
          'Your overall health and any complicating factors',
          'Whether you\'ve already been unwell for some time'
        ]
      },
      {
        type: 'heading',
        content: 'Typical Durations for Common Conditions',
        level: 2
      },
      {
        type: 'paragraph',
        content: 'While every case is individual, here are typical ranges:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Cold and flu: 1-5 days',
          'Gastroenteritis: 1-3 days (48 hours symptom-free for food handlers)',
          'Migraine: 1-2 days per episode',
          'Back pain (acute): 2-7 days',
          'Minor surgery: 3-14 days depending on procedure',
          'Mental health: 1-5 days initially, with review',
          'COVID-19: 5-7 days typically'
        ]
      },
      {
        type: 'callout',
        variant: 'info',
        content: 'These are general guides only. Your certificate may be shorter or longer based on your specific situation. The doctor will recommend what\'s clinically appropriate.'
      },
      {
        type: 'heading',
        content: 'Can Certificates Be Backdated?',
        level: 2
      },
      {
        type: 'paragraph',
        content: 'Doctors can certify that you were unwell in the recent past if it\'s clinically reasonable. For example, if you were too sick to seek medical attention on Monday but see a doctor on Wednesday, they may backdate to cover Monday and Tuesday.'
      },
      {
        type: 'paragraph',
        content: 'However, there are limits. Doctors generally won\'t:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Backdate certificates for extended periods (weeks or months)',
          'Certify illness without reasonable evidence you were unwell',
          'Provide certificates for pre-planned absences disguised as illness',
          'Cover dates far in the past without strong clinical reasons'
        ]
      },
      {
        type: 'heading',
        content: 'What If You Need More Time?',
        level: 2
      },
      {
        type: 'paragraph',
        content: 'If your initial certificate is expiring but you\'re still unwell, you can request an extension. The doctor will assess whether continued time off is appropriate.'
      },
      {
        type: 'paragraph',
        content: 'For extension certificates, it helps to explain:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Your current symptoms and how they\'re affecting your ability to work',
          'Whether you\'ve improved, stayed the same, or worsened',
          'Any treatments you\'ve tried',
          'Your original condition and when it started'
        ]
      },
      {
        type: 'heading',
        content: 'Workplace Requirements',
        level: 2
      },
      {
        type: 'paragraph',
        content: 'Your employer\'s policies may influence certificate needs:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Many workplaces only require certificates for absences over 2 days',
          'Some require certificates from day 1 — check your policy',
          'Awards or enterprise agreements may have specific requirements',
          'Excessive absences may trigger a requirement for certificates'
        ]
      },
      {
        type: 'callout',
        variant: 'tip',
        content: 'If you\'re frequently needing medical certificates, it may be worth speaking with your GP about underlying conditions that could be better managed, or workplace adjustments that might help.'
      },
      {
        type: 'heading',
        content: 'Extended Absences',
        level: 2
      },
      {
        type: 'paragraph',
        content: 'For absences longer than 1-2 weeks, a single telehealth certificate may not be appropriate. Extended absences usually need:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Assessment by your regular GP who knows your history',
          'Possible specialist input depending on the condition',
          'Regular reviews and updated certificates',
          'A graduated return-to-work plan in many cases'
        ]
      }
    ],
    faqs: [
      {
        question: 'What\'s the maximum days a medical certificate can cover?',
        answer: 'There\'s no legal maximum, but duration should be appropriate to the condition. Most telehealth certificates cover 1-7 days. Longer absences typically require assessment by your regular GP.'
      },
      {
        question: 'Can I get a certificate for just one day?',
        answer: 'Yes. Single-day certificates are common for conditions like migraines, period pain, or brief acute illnesses.'
      },
      {
        question: 'Can I get a medical certificate backdated?',
        answer: 'Doctors can certify recent illness if it\'s clinically reasonable. For example, covering yesterday and today. They won\'t backdate for weeks or certify without evidence of illness.'
      },
      {
        question: 'What if my employer wants more days than the certificate says?',
        answer: 'Certificates cover the period the doctor deems appropriate. If you recover faster and want to return early, you can. If you need longer, you\'ll need a new or extended certificate.'
      }
    ],
    relatedServices: [
      {
        title: 'Medical Certificate',
        description: 'Get a certificate for time off work',
        href: '/medical-certificate',
        icon: 'certificate'
      },
      {
        title: 'GP Consultation',
        description: 'Discuss your health with a doctor',
        href: '/general-consult',
        icon: 'consult'
      }
    ],
    seo: {
      title: 'How Many Days Can a Medical Certificate Cover? | Duration Guide | InstantMed',
      description: 'How long can a medical certificate be for? Learn about typical durations, backdating, extensions, and what doctors consider when certifying time off.',
      keywords: [
        'medical certificate duration',
        'how many days medical certificate',
        'medical certificate length',
        'backdate medical certificate',
        'extend medical certificate'
      ]
    }
  }
]
