import { Article, defaultAuthor } from '../types'
import { blogImages } from '../images'

export const workplaceArticles: Article[] = [
  {
    slug: 'sick-leave-rights-australia',
    title: 'Your Sick Leave Rights in Australia',
    subtitle: 'Understanding your entitlements when you\'re unwell.',
    excerpt: 'Know your sick leave rights under Australian workplace law. Learn about entitlements, documentation, and what employers can and can\'t ask.',
    category: 'workplace-health',
    publishedAt: '2024-12-01',
    updatedAt: '2026-01-15',
    readingTime: 3,
    viewCount: 44320,
    author: defaultAuthor,
    heroImage: blogImages.sickLeaveRights,
    heroImageAlt: 'Employee understanding workplace rights',
    content: [
      { type: 'paragraph', content: 'Understanding your sick leave rights helps you take the time you need to recover without unnecessary stress. Here\'s what Australian workplace law says about sick leave.' },
      { type: 'heading', content: 'Your Basic Entitlements', level: 2 },
      { type: 'paragraph', content: 'Under the National Employment Standards (NES), full-time and part-time employees are entitled to:' },
      { type: 'list', content: '', items: ['10 days of paid personal/carer\'s leave per year', 'Leave accumulates year to year if unused', 'Part-time employees receive pro-rata entitlements', 'Casual employees don\'t get paid sick leave but can take unpaid leave'] },
      { type: 'callout', variant: 'info', content: 'Personal/carer\'s leave covers both your own illness and caring for sick family members. It comes from the same pool of 10 days.' },
      { type: 'heading', content: 'When You Can Take Sick Leave', level: 2 },
      { type: 'list', content: '', items: ['When you\'re ill or injured and unfit for work', 'When caring for an immediate family or household member who is ill', 'For unexpected family emergencies'] },
      { type: 'heading', content: 'What Employers Can Ask', level: 2 },
      { type: 'paragraph', content: 'Your employer can request evidence of your illness, but there are limits:' },
      { type: 'list', content: '', items: ['They can ask for a medical certificate or statutory declaration', 'They cannot demand specific diagnosis details', 'The certificate only needs to confirm you were unfit for work', 'They can\'t require you to see a specific doctor'] },
      { type: 'heading', content: 'Medical Certificate Requirements', level: 2 },
      { type: 'paragraph', content: 'Many employers require a certificate after 1-2 days off. Check your employment contract or workplace policy. A valid certificate should include:' },
      { type: 'list', content: '', items: ['Your name', 'Date of consultation', 'Period you\'re unfit for work', 'Doctor\'s signature and details', 'Does NOT need to include your diagnosis'] },
      { type: 'heading', content: 'If You Run Out of Sick Leave', level: 2 },
      { type: 'list', content: '', items: ['You may be able to use annual leave', 'Unpaid leave may be available', 'Your employer can\'t fire you just for being sick', 'Long-term illness may have other protections'] },
      { type: 'callout', variant: 'warning', content: 'If you\'re experiencing workplace pressure around sick leave, consider contacting the Fair Work Ombudsman for advice.' }
    ],
    faqs: [
      { question: 'Can my employer reject my medical certificate?', answer: 'Generally no, if it\'s from a registered doctor and covers the relevant dates. They can\'t demand a specific diagnosis.' },
      { question: 'Do I have to tell my employer why I\'m sick?', answer: 'No. You only need to say you\'re unwell and unfit for work. The medical certificate doesn\'t need to state your condition.' },
      { question: 'Can I be fired for taking too much sick leave?', answer: 'Not simply for using legitimate sick leave. However, patterns of absence may be discussed. Seek advice if you\'re concerned.' }
    ],
    relatedServices: [
      { title: 'Medical Certificate', description: 'Get a certificate for work', href: '/medical-certificate', icon: 'certificate' },
      { title: 'GP Consultation', description: 'Discuss your health', href: '/general-consult', icon: 'consult' }
    ],
    seo: { title: 'Sick Leave Rights in Australia | Employee Entitlements | InstantMed', description: 'Know your sick leave rights under Australian workplace law. Learn about entitlements, documentation requirements, and what employers can ask.', keywords: ['sick leave australia', 'sick leave rights', 'personal leave entitlements', 'medical certificate work'] }
  },
  {
    slug: 'working-from-home-when-sick',
    title: 'Working From Home When Sick: Should You?',
    subtitle: 'When to push through and when to properly rest.',
    excerpt: 'Remote work blurs the line between sick days and working through illness. Learn when it\'s okay to work from home sick and when you should properly rest.',
    category: 'workplace-health',
    publishedAt: '2024-12-05',
    updatedAt: '2026-01-12',
    readingTime: 3,
    viewCount: 38740,
    author: defaultAuthor,
    heroImage: blogImages.workFromHomeSick,
    heroImageAlt: 'Person considering whether to work while unwell',
    content: [
      { type: 'paragraph', content: 'Working from home has made it tempting to "push through" when sick. But just because you can work doesn\'t mean you should. Here\'s how to make the right call.' },
      { type: 'heading', content: 'When You Might Work From Home', level: 2 },
      { type: 'list', content: '', items: ['Very mild symptoms that don\'t affect concentration', 'End of an illness when you\'re mostly recovered', 'Conditions where rest isn\'t critical (mild allergies)', 'When you genuinely feel up to it, not pressured'] },
      { type: 'heading', content: 'When You Should Take Proper Sick Leave', level: 2 },
      { type: 'list', content: '', items: ['Fever or feeling genuinely unwell', 'Symptoms affecting your concentration', 'Contagious illness (to avoid spreading via shared docs/calls)', 'When you need medication that affects alertness', 'Mental health days — these need proper rest too', 'When your doctor recommends rest'] },
      { type: 'callout', variant: 'tip', content: 'Ask yourself: "If I were in the office, would I go home?" If yes, take proper sick leave even when working from home.' },
      { type: 'heading', content: 'The Problem With "Pushing Through"', level: 2 },
      { type: 'list', content: '', items: ['Recovery takes longer when you don\'t rest', 'Work quality suffers when you\'re unwell', 'You may make mistakes that create more work later', 'It sets an unhealthy precedent for yourself and colleagues', 'Burnout risk increases'] },
      { type: 'heading', content: 'Setting Boundaries', level: 2 },
      { type: 'paragraph', content: 'It\'s okay to take sick leave when working from home. You\'re entitled to it, and your health matters. Don\'t let the convenience of home become a reason to never properly rest.' },
      { type: 'heading', content: 'Talking to Your Manager', level: 2 },
      { type: 'paragraph', content: 'If your workplace culture makes you feel guilty about sick leave, a simple message works: "I\'m unwell and need to take today as sick leave to recover properly." You don\'t need to justify or over-explain.' }
    ],
    faqs: [
      { question: 'Can my employer make me work from home instead of taking sick leave?', answer: 'No. Sick leave is your entitlement. If you\'re unfit for work, you can take sick leave regardless of where you work.' },
      { question: 'Should I check emails when I\'m on sick leave?', answer: 'No. Sick leave means rest. Set an out-of-office message and disconnect. Checking emails isn\'t resting.' },
      { question: 'Can I take a mental health day as sick leave?', answer: 'Yes. Mental health conditions are legitimate reasons for sick leave. You don\'t need to specify the nature of your illness.' }
    ],
    relatedServices: [
      { title: 'Medical Certificate', description: 'Get a certificate for sick leave', href: '/medical-certificate', icon: 'certificate' },
      { title: 'GP Consultation', description: 'Discuss your symptoms', href: '/general-consult', icon: 'consult' }
    ],
    seo: { title: 'Working From Home When Sick | Should You? | InstantMed', description: 'Remote work blurs sick day boundaries. Learn when to work from home while unwell and when you should properly rest and recover.', keywords: ['working from home sick', 'sick leave remote work', 'should I work when sick', 'wfh sick day'] }
  },
  {
    slug: 'university-medical-certificates',
    title: 'Medical Certificates for University',
    subtitle: 'What you need to know about special consideration and extensions.',
    excerpt: 'Missed an exam or need an extension? Learn how medical certificates work for university students, including special consideration applications.',
    category: 'workplace-health',
    publishedAt: '2024-12-10',
    updatedAt: '2026-01-10',
    readingTime: 3,
    viewCount: 41580,
    author: defaultAuthor,
    heroImage: blogImages.universityMedCert,
    heroImageAlt: 'University student managing health and study',
    content: [
      { type: 'paragraph', content: 'University has different requirements for medical documentation than workplaces. Understanding what\'s needed helps you get the right support when illness affects your studies.' },
      { type: 'heading', content: 'When You Might Need Documentation', level: 2 },
      { type: 'list', content: '', items: ['Missed exams', 'Assignment extensions', 'Special consideration applications', 'Leave of absence', 'Reduced study load requests'] },
      { type: 'heading', content: 'What Universities Typically Require', level: 2 },
      { type: 'paragraph', content: 'University requirements are often more detailed than workplace certificates:' },
      { type: 'list', content: '', items: ['May need to indicate severity or impact on study', 'Often require certificates dated around the affected assessment', 'Some require specific university forms', 'Online consultations are generally accepted'] },
      { type: 'callout', variant: 'tip', content: 'Check your university\'s specific requirements before your consultation. Some have particular forms or require certain information to be included.' },
      { type: 'heading', content: 'Special Consideration', level: 2 },
      { type: 'paragraph', content: 'Special consideration is for circumstances beyond your control affecting assessment performance:' },
      { type: 'list', content: '', items: ['Illness during exam period', 'Acute illness affecting assignment completion', 'Ongoing conditions flaring up', 'Mental health impacts'] },
      { type: 'heading', content: 'Tips for Students', level: 2 },
      { type: 'list', content: '', items: ['See a doctor close to when you\'re affected — not weeks later', 'Keep copies of all documentation', 'Submit applications within your uni\'s timeframe', 'Be honest about how your condition affected your study', 'Don\'t wait until results come out to apply'] },
      { type: 'heading', content: 'If You Have an Ongoing Condition', level: 2 },
      { type: 'paragraph', content: 'Register with your university\'s disability or accessibility service. This can provide ongoing accommodations without needing certificates for each assessment.' }
    ],
    faqs: [
      { question: 'Can I get a certificate after I\'ve recovered?', answer: 'It\'s best to see a doctor while you\'re unwell. Retrospective certificates are harder to obtain and may be viewed less favourably.' },
      { question: 'Do online medical certificates work for university?', answer: 'Generally yes. Most universities accept certificates from any registered doctor, including telehealth consultations.' },
      { question: 'What if I was too sick to see a doctor?', answer: 'Some universities accept statutory declarations in exceptional circumstances. Check your university\'s policy and explain your situation.' }
    ],
    relatedServices: [
      { title: 'Medical Certificate', description: 'Get a certificate for university', href: '/medical-certificate', icon: 'certificate' },
      { title: 'GP Consultation', description: 'Discuss your health concerns', href: '/general-consult', icon: 'consult' }
    ],
    seo: { title: 'Medical Certificates for University | Special Consideration | InstantMed', description: 'Medical certificates for university students. Learn about special consideration, extensions, and what documentation you need.', keywords: ['university medical certificate', 'special consideration', 'uni extension medical certificate', 'student sick leave'] }
  },
  {
    slug: 'return-to-work-after-illness',
    title: 'Returning to Work After Illness',
    subtitle: 'When you\'re ready to go back and what to expect.',
    excerpt: 'Knowing when you\'re ready to return to work can be tricky. Learn about recovery timelines, fitness for work certificates, and easing back in.',
    category: 'workplace-health',
    publishedAt: '2024-12-15',
    updatedAt: '2026-01-08',
    readingTime: 3,
    viewCount: 22340,
    author: defaultAuthor,
    heroImage: blogImages.returnToWork,
    heroImageAlt: 'Person preparing to return to work after recovery',
    content: [
      { type: 'paragraph', content: 'After being unwell, it can be hard to judge when you\'re ready to return to work. Going back too early risks relapse, while staying off too long can have its own challenges.' },
      { type: 'heading', content: 'Signs You\'re Ready to Return', level: 2 },
      { type: 'list', content: '', items: ['Fever-free for at least 24 hours (without medication)', 'Energy levels improving', 'Able to concentrate for reasonable periods', 'Symptoms manageable without affecting work', 'No longer contagious (if that was a concern)'] },
      { type: 'heading', content: 'Common Recovery Timelines', level: 2 },
      { type: 'list', content: '', items: ['Cold: 7-10 days, often return earlier with lingering symptoms', 'Flu: 1-2 weeks for full recovery', 'Gastro: Usually 1-3 days after symptoms stop', 'COVID: Follow current guidelines (typically 5-7 days)', 'Surgery: Varies greatly — follow your surgeon\'s advice'] },
      { type: 'callout', variant: 'info', content: 'These are general guides. Your recovery may be faster or slower depending on your overall health and the severity of your illness.' },
      { type: 'heading', content: 'Fitness for Work Certificates', level: 2 },
      { type: 'paragraph', content: 'Some jobs require a doctor\'s clearance before returning, especially:' },
      { type: 'list', content: '', items: ['After extended absence', 'Jobs involving safety-critical tasks', 'Food handling roles (after gastro)', 'Healthcare workers', 'When your employer specifically requests one'] },
      { type: 'heading', content: 'Phased Return Options', level: 2 },
      { type: 'paragraph', content: 'After significant illness, you might not be ready for full duties immediately:' },
      { type: 'list', content: '', items: ['Reduced hours initially', 'Working from home if possible', 'Modified duties', 'Gradual increase in workload', 'Discuss options with your employer and doctor'] },
      { type: 'heading', content: 'When to Stay Home Longer', level: 2 },
      { type: 'list', content: '', items: ['Still running a fever', 'Symptoms significantly affecting concentration', 'Highly contagious (protect colleagues)', 'Doctor has recommended continued rest', 'You feel genuinely unfit for work'] }
    ],
    faqs: [
      { question: 'Do I need a certificate to return to work?', answer: 'Usually no, unless your employer has a specific policy or your job requires medical clearance. Ask your workplace if unsure.' },
      { question: 'Can I return part-time initially?', answer: 'This depends on your employer and your role. Discuss options with your manager. A doctor can support a phased return if medically appropriate.' },
      { question: 'What if I return and feel worse?', answer: 'It\'s okay to acknowledge you went back too early. Take more time to recover properly. Better to rest fully than keep yo-yoing.' }
    ],
    relatedServices: [
      { title: 'Medical Certificate', description: 'Clearance to return to work', href: '/medical-certificate', icon: 'certificate' },
      { title: 'GP Consultation', description: 'Discuss your recovery', href: '/general-consult', icon: 'consult' }
    ],
    seo: { title: 'Returning to Work After Illness | Recovery Guide | InstantMed', description: 'When are you ready to return to work after being sick? Learn about recovery timelines, fitness certificates, and easing back in.', keywords: ['return to work after illness', 'fitness for work certificate', 'when to go back to work sick', 'recovery from illness'] }
  }
]
