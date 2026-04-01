import { Article, contentAuthors } from '../types'
import { blogImages } from '../images'

export const transactionalSeoArticles: Article[] = [
  // Article 1: Medical Certificate Online Australia
  {
    slug: 'medical-certificate-online-australia',
    title: 'Can You Get a Medical Certificate Online in Australia?',
    subtitle: 'Yes. Here\'s how telehealth certificates work, what they cost, and whether your employer will accept one.',
    excerpt: 'Medical certificates are available online through regulated telehealth services in Australia. Learn how the process works, what qualifies, and what to expect.',
    category: 'medical-certificates',
    tags: ['medical-certificate', 'telehealth', 'online-doctor', 'work', 'sick-leave'],
    publishedAt: '2026-04-01',
    updatedAt: '2026-04-01',
    readingTime: 9,
    viewCount: 0,
    author: contentAuthors.sarahChen,
    heroImage: blogImages.sickLeaveCertOnline,
    heroImageAlt: 'Person using a laptop at home while unwell',
    content: [
      {
        type: 'paragraph',
        content: 'Short answer: yes. You can get a medical certificate online in Australia, and it carries the same legal weight as one issued in a GP\'s office. Telehealth has been part of the Australian healthcare system for years, and medical certificates issued through legitimate telehealth services are recognised under the same legislation that governs in-person consultations.'
      },
      {
        type: 'paragraph',
        content: 'The longer answer involves understanding how the process works, what conditions qualify, and what the limits are. Because while online medical certificates are entirely legitimate, they\'re not a free pass. A registered doctor still has to assess your situation and make a clinical judgement. The only thing that changes is the medium.'
      },
      { type: 'heading', content: 'How Online Medical Certificates Work', level: 2 },
      {
        type: 'paragraph',
        content: 'The process is straightforward, which is partly the point. You fill in a brief health questionnaire describing your symptoms, how long you\'ve been unwell, and the dates you need covered. This isn\'t a tick-box exercise — it\'s the same clinical information a GP would ask you in person, just collected in writing rather than across a desk.'
      },
      {
        type: 'paragraph',
        content: 'An AHPRA-registered doctor reviews your request. They assess whether your symptoms are consistent with the time off you\'re requesting, whether anything in your history raises a flag, and whether a certificate is clinically appropriate. If everything checks out, your certificate is generated and delivered digitally — usually within a few hours. If the doctor has concerns or needs more information, they\'ll follow up.'
      },
      {
        type: 'paragraph',
        content: 'At InstantMed, the process takes three steps: complete a short health form, a doctor reviews your request, and your certificate appears in your patient dashboard. No phone call required for most requests. Because getting sick doesn\'t wait for business hours, and neither should the paperwork.',
        links: [{ text: 'complete a short health form', href: '/request?service=medical-certificate', title: 'Start a medical certificate request' }]
      },
      { type: 'heading', content: 'What Conditions Qualify for an Online Medical Certificate?', level: 2 },
      {
        type: 'paragraph',
        content: 'Most acute illnesses that would keep you home from work are appropriate for an online certificate. The standard is the same as any GP consultation — the doctor needs to form a reasonable clinical opinion that you\'re unfit for work based on the information provided.'
      },
      {
        type: 'list',
        content: 'Common conditions that qualify:',
        items: [
          'Cold, flu, and upper respiratory infections',
          'Gastroenteritis and food poisoning',
          'Migraine and severe headache',
          'Back pain and musculoskeletal issues',
          'Mental health days — stress, anxiety, burnout',
          'Period pain and menstrual conditions',
          'Minor injuries that prevent work duties',
          'Carer\'s leave when looking after a family member'
        ]
      },
      {
        type: 'paragraph',
        content: 'Mental health days deserve a specific mention. They\'re legitimate medical reasons for time off, and a telehealth doctor can assess and certify them just as effectively as an in-person visit. You don\'t need to justify yourself beyond the clinical information. The certificate won\'t specify your diagnosis to your employer.',
        links: [{ text: 'Mental health days', href: '/blog/mental-health-day-medical-certificate', title: 'Medical certificates for mental health' }]
      },
      { type: 'heading', content: 'What Won\'t Get Approved', level: 2 },
      {
        type: 'paragraph',
        content: 'An online medical certificate isn\'t a rubber stamp. Doctors assess every request on its merits, and there are situations where a certificate will be declined — or where you\'ll be advised to seek in-person care instead.'
      },
      {
        type: 'list',
        content: 'Requests that won\'t be approved:',
        items: [
          'Backdated certificates — a doctor can only certify what they assess at the time. If you were sick last week but didn\'t seek medical attention, it\'s too late for a certificate covering those dates.',
          'Suspicious patterns — requesting certificates for every Monday or the day after every public holiday is going to raise clinical red flags. Doctors notice patterns.',
          'Emergency conditions — chest pain, difficulty breathing, sudden severe symptoms, or anything that sounds like it needs urgent care. You\'ll be directed to call 000 or attend an emergency department.',
          'Extended periods without justification — requesting two weeks off for a cold will get questions. The time off needs to be proportionate to the condition.',
          'Workplace injury claims — these typically require in-person examination and specific documentation for workers\' compensation.'
        ]
      },
      {
        type: 'callout',
        variant: 'warning',
        content: 'If you\'re experiencing a medical emergency, call 000 or go to your nearest emergency department. Telehealth services are not designed for emergencies.'
      },
      { type: 'heading', content: 'Do Employers Accept Online Medical Certificates?', level: 2 },
      {
        type: 'paragraph',
        content: 'Yes. Under the Fair Work Act 2009, a medical certificate from any registered health practitioner is valid evidence for personal leave. The Act doesn\'t distinguish between certificates issued via telehealth and those issued in person. An AHPRA-registered doctor is an AHPRA-registered doctor, regardless of whether they assessed you across a desk or through a digital health form.'
      },
      {
        type: 'paragraph',
        content: 'Your employer cannot legally reject a valid medical certificate simply because it was issued via telehealth. The certificate contains the same information — the practitioner\'s registration details, the dates of unfitness, and the clinical opinion that you\'re unable to work. That said, if your employer has questions, the best approach is usually a calm conversation pointing to the Fair Work Act rather than a dramatic standoff.',
        links: [{ text: 'employer cannot legally reject', href: '/blog/employer-accept-online-medical-certificate', title: 'Do employers accept online medical certificates?' }]
      },
      { type: 'heading', content: 'How Much Does It Cost?', level: 2 },
      {
        type: 'paragraph',
        content: 'At InstantMed, a one-day medical certificate costs $19.95, a two-day certificate is $29.95, and a three-day certificate is $39.95. There\'s no Medicare rebate for telehealth medical certificates — this is an out-of-pocket cost.'
      },
      {
        type: 'paragraph',
        content: 'For context, a standard GP visit costs between $60 and $120 if you\'re not bulk-billed. And bulk-billed appointments are increasingly hard to come by — the average wait for a bulk-billing GP in Australian capital cities is now measured in weeks, not days. So while $19.95 isn\'t free, it compares favourably to the alternative of sitting in a waiting room for two hours while actively unwell. Your couch is more comfortable, and the magazines are better.'
      },
      { type: 'heading', content: 'Privacy: What Your Employer Sees', level: 2 },
      {
        type: 'paragraph',
        content: 'Your medical certificate will show the dates you\'re certified as unfit for work, the assessing doctor\'s details, and the clinic information. It will not include your specific diagnosis. Your employer is entitled to know you\'re unwell and for how long. They\'re not entitled to know what\'s wrong with you.'
      },
      {
        type: 'paragraph',
        content: 'This is the same standard that applies to in-person certificates. A GP might write "medical condition" rather than specifying your actual illness, and telehealth certificates follow the same convention. Your health information is protected under the Privacy Act 1988 and the Australian Privacy Principles.'
      },
      { type: 'heading', content: 'When You Should See a Doctor in Person', level: 2 },
      {
        type: 'paragraph',
        content: 'Online certificates are convenient, but they\'re not appropriate for every situation. You should see a doctor in person if:'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Your symptoms are severe or getting worse — high fever, persistent vomiting, or symptoms lasting more than a week',
          'You need a physical examination — rashes that need visual assessment, abdominal pain that needs palpation, ear infections',
          'It\'s a workplace injury that may require workers\' compensation documentation',
          'You need a fitness-for-duty assessment to return to a safety-critical role',
          'You\'re experiencing mental health symptoms that need ongoing management, not just a day off',
          'You have a chronic condition that needs monitoring and adjustment'
        ]
      },
      {
        type: 'paragraph',
        content: 'Telehealth and in-person care aren\'t competitors. They serve different needs, and the best approach is usually a combination of both depending on the situation.'
      },
      { type: 'heading', content: 'Frequently Asked Questions', level: 2 }
    ],
    faqs: [
      {
        question: 'Is an online medical certificate legal in Australia?',
        answer: 'Yes. Telehealth consultations are regulated by AHPRA and state health departments. Medical certificates issued by AHPRA-registered doctors through telehealth services carry the same legal standing as those issued in person.'
      },
      {
        question: 'Can I get a medical certificate without a video call?',
        answer: 'Yes. Many telehealth services, including InstantMed, use asynchronous assessments where you complete a health questionnaire and a doctor reviews it. A phone or video call is only required if the doctor needs additional information.'
      },
      {
        question: 'How long does it take to get an online medical certificate?',
        answer: 'At InstantMed, most certificates are reviewed and issued within a few hours during operating hours (8am-10pm AEST, 7 days). The process is designed to be same-day for straightforward requests.'
      },
      {
        question: 'Can I get a backdated medical certificate online?',
        answer: 'No. A doctor can only certify your unfitness for work based on an assessment conducted at the time. If you were sick last week and didn\'t seek medical attention, a certificate cannot be issued retroactively.'
      },
      {
        question: 'Do I need a Medicare card to get an online medical certificate?',
        answer: 'No. Medical certificates through InstantMed don\'t require a Medicare card. The fee is a flat rate paid directly — there\'s no Medicare rebate involved regardless of your Medicare status.'
      },
      {
        question: 'Can my employer tell it was issued online?',
        answer: 'The certificate will show the issuing clinic\'s details, which will indicate it was a telehealth service. However, this doesn\'t affect the certificate\'s validity. Employers cannot reject a certificate based on the method of consultation.'
      },
      {
        question: 'What if my employer rejects my online medical certificate?',
        answer: 'Under the Fair Work Act 2009, a medical certificate from any registered health practitioner is valid evidence for personal leave. If your employer rejects it, you can refer them to the legislation. If the issue persists, the Fair Work Ombudsman can provide guidance.'
      },
      {
        question: 'Can I get a medical certificate for mental health reasons?',
        answer: 'Yes. Mental health is a legitimate reason for personal leave, and a telehealth doctor can assess and certify mental health-related unfitness for work. Your certificate won\'t specify the nature of your condition to your employer.'
      }
    ],
    relatedServices: [
      {
        title: 'Medical Certificates',
        description: 'Get an AHPRA-certified medical certificate from your couch.',
        href: '/request?service=medical-certificate',
        icon: 'certificate'
      },
      {
        title: 'General Consultation',
        description: 'Speak with a doctor about your health concerns.',
        href: '/request?service=consult',
        icon: 'consult'
      }
    ],
    seo: {
      title: 'Can You Get a Medical Certificate Online in Australia? | InstantMed',
      description: 'Yes, online medical certificates are legal in Australia. Learn how telehealth certs work, what they cost ($19.95), and whether employers accept them.',
      keywords: ['medical certificate online australia', 'sick note online', 'online medical certificate', 'can you get a medical certificate without seeing a doctor', 'telehealth medical certificate']
    }
  },

  // Article 2: Employer Acceptance
  {
    slug: 'employer-accept-online-medical-certificate',
    title: 'Do Employers Accept Online Medical Certificates in Australia?',
    subtitle: 'The legal position, common objections, and what to do if your boss pushes back.',
    excerpt: 'Online medical certificates have the same legal standing as in-person ones under Australian law. Here\'s the framework, your rights, and how to handle pushback.',
    category: 'workplace-health',
    tags: ['medical-certificate', 'work', 'employer', 'telehealth', 'sick-leave'],
    publishedAt: '2026-04-01',
    updatedAt: '2026-04-01',
    readingTime: 8,
    viewCount: 0,
    author: contentAuthors.emmaWilson,
    heroImage: blogImages.employerReject,
    heroImageAlt: 'Two people having a professional workplace conversation',
    content: [
      {
        type: 'paragraph',
        content: 'Yes, employers are required to accept online medical certificates in Australia. A certificate issued by an AHPRA-registered doctor through a telehealth consultation is legally indistinguishable from one issued in a clinic. The law doesn\'t care whether the doctor was across a desk or across an internet connection.'
      },
      {
        type: 'paragraph',
        content: 'But knowing the legal position and navigating a sceptical manager are two different things. So let\'s walk through the framework, the common objections, and the practical reality of using online medical certificates in Australian workplaces.'
      },
      { type: 'heading', content: 'The Legal Framework', level: 2 },
      {
        type: 'paragraph',
        content: 'The Fair Work Act 2009 is the starting point. Section 107 sets out what constitutes valid evidence for personal leave, and it\'s broader than most people realise. An employee can provide either a medical certificate or a statutory declaration — not both, just one or the other.'
      },
      {
        type: 'paragraph',
        content: 'The Act defines a medical certificate as a certificate from a "registered health practitioner." It doesn\'t specify that the consultation must be in person, face to face, or conducted in any particular setting. A registered health practitioner is anyone registered with AHPRA — the Australian Health Practitioner Regulation Agency. This includes doctors who practise via telehealth.'
      },
      {
        type: 'paragraph',
        content: 'Telehealth itself is regulated under the same AHPRA standards as in-person practice. A doctor conducting a telehealth consultation is bound by the same Medical Board of Australia code of conduct, the same prescribing guidelines, and the same professional obligations. They don\'t get a discount on accountability because they\'re using a computer.'
      },
      {
        type: 'callout',
        variant: 'info',
        content: 'Key legislation: Fair Work Act 2009 (Cth), s.107 — notice and evidence requirements for personal/carer\'s leave. A "medical certificate" from a "registered health practitioner" is explicitly listed as valid evidence.'
      },
      { type: 'heading', content: 'What Makes a Medical Certificate Valid?', level: 2 },
      {
        type: 'paragraph',
        content: 'Whether issued online or in person, a valid medical certificate needs to contain specific information. The format matters less than the substance.'
      },
      {
        type: 'list',
        content: 'A valid medical certificate includes:',
        items: [
          'The patient\'s full name',
          'The date the assessment was conducted',
          'A professional opinion that the patient is unfit for work',
          'The period of unfitness (specific dates)',
          'The practitioner\'s name and AHPRA registration number',
          'The clinic or practice name and contact details',
          'The practitioner\'s signature (or digital equivalent)'
        ]
      },
      {
        type: 'paragraph',
        content: 'Notice what\'s not on that list: a diagnosis. Your employer is entitled to know that a qualified doctor assessed you and determined you were unfit for work. They are not entitled to know why. "Medical condition" as a reason is perfectly acceptable, and any employer demanding a specific diagnosis is overstepping their legal boundaries.'
      },
      { type: 'heading', content: 'Common Employer Objections (and How to Respond)', level: 2 },
      {
        type: 'paragraph',
        content: 'Most employers accept online medical certificates without issue. But occasionally you\'ll encounter resistance, usually from managers who haven\'t kept up with how healthcare delivery has evolved. Here are the common objections and sensible responses.'
      },
      { type: 'heading', content: '"We don\'t accept telehealth certificates"', level: 3 },
      {
        type: 'paragraph',
        content: 'This isn\'t a policy an employer can legally enforce. Under the Fair Work Act, any certificate from a registered health practitioner is valid evidence. An employer can\'t create a workplace policy that contradicts federal legislation. A calm reference to section 107 usually resolves this.'
      },
      { type: 'heading', content: '"How do we know the doctor actually examined you?"', level: 3 },
      {
        type: 'paragraph',
        content: 'A telehealth assessment is a clinical consultation. The doctor reviews your symptoms, medical history, and the clinical picture to form a professional opinion. Not every condition requires a physical examination — a cold, gastro, or migraine doesn\'t need a stethoscope. The doctor\'s AHPRA registration is verifiable on the AHPRA website, which tends to settle the question.'
      },
      { type: 'heading', content: '"Anyone could fill out an online form and get a certificate"', level: 3 },
      {
        type: 'paragraph',
        content: 'This misunderstands how telehealth works. You fill out a form; a doctor decides whether to issue a certificate. Requests are declined regularly — for inadequate clinical information, inconsistent symptoms, or patterns that suggest misuse. The doctor exercises the same clinical judgement as in any consultation. The form is the intake, not the assessment.'
      },
      { type: 'heading', content: '"Our policy requires a certificate from your regular GP"', level: 3 },
      {
        type: 'paragraph',
        content: 'No workplace policy can require you to see a specific doctor, and this would likely be challenged if tested. The Fair Work Act refers to "a registered health practitioner" — not "your regular GP" or "a doctor approved by your employer." Employees have the right to choose their healthcare provider.'
      },
      { type: 'heading', content: 'What to Do If Your Employer Pushes Back', level: 2 },
      {
        type: 'paragraph',
        content: 'The diplomatic approach works better than the confrontational one, even when you\'re legally in the right. Start with information, not threats.'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Provide the certificate promptly — don\'t give your employer a procedural reason to object',
          'If questioned, calmly point out that the certificate is from an AHPRA-registered doctor and meets the requirements of the Fair Work Act',
          'Offer to show the AHPRA registration check if they\'re unsure about the doctor\'s credentials',
          'Put your response in writing (email) so there\'s a record',
          'If the issue persists, contact the Fair Work Ombudsman on 13 13 94 for advice',
          'Consider speaking with your union representative if applicable'
        ]
      },
      {
        type: 'callout',
        variant: 'tip',
        content: 'The goal is resolution, not vindication. Most employer pushback comes from unfamiliarity rather than bad faith. A brief, factual explanation resolves the vast majority of cases without escalation.'
      },
      { type: 'heading', content: 'When In-Person Certificates Are Actually Required', level: 2 },
      {
        type: 'paragraph',
        content: 'There are legitimate situations where an in-person medical assessment is necessary, and it\'s worth knowing the difference.'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Pre-employment medical assessments — these often require specific physical tests and measurements',
          'Workplace injury and workers\' compensation claims — these typically need physical examination and specific documentation',
          'Fitness-for-duty assessments for safety-critical roles — mining, aviation, heavy vehicle operation',
          'Return-to-work assessments after extended illness or injury',
          'Drug and alcohol testing — for obvious reasons, this can\'t be done remotely'
        ]
      },
      {
        type: 'paragraph',
        content: 'For routine personal leave — you woke up sick, you need a day or two off — an online certificate is entirely appropriate. The situations requiring in-person assessment are specific and usually involve employer-initiated processes rather than employee-initiated sick leave.'
      },
      { type: 'heading', content: 'The Bigger Picture', level: 2 },
      {
        type: 'paragraph',
        content: 'Telehealth isn\'t a loophole. It\'s a regulated healthcare delivery method that\'s been part of the Australian system for years and was significantly expanded during the pandemic. The Medical Board of Australia\'s position is clear: telehealth consultations are held to the same standards as in-person ones.'
      },
      {
        type: 'paragraph',
        content: 'If anything, the trend is moving toward greater acceptance. The Australian government has permanently integrated many telehealth items into the Medicare Benefits Schedule, and workplace policies are steadily catching up with reality. The workplace that rejects a telehealth certificate today is the one that looks outdated tomorrow.'
      },
      { type: 'heading', content: 'Frequently Asked Questions', level: 2 }
    ],
    faqs: [
      {
        question: 'Can my employer legally reject a telehealth medical certificate?',
        answer: 'No. Under the Fair Work Act 2009 (s.107), a medical certificate from any registered health practitioner is valid evidence for personal leave. The method of consultation — in person or via telehealth — is not a basis for rejection.'
      },
      {
        question: 'Does the certificate need to say it was a telehealth consultation?',
        answer: 'Certificates will typically show the issuing practice\'s details, which may indicate it\'s a telehealth service. This doesn\'t affect validity. There\'s no legal requirement to hide or disclose the consultation method.'
      },
      {
        question: 'What if my employer has a specific policy against online certificates?',
        answer: 'A workplace policy cannot override federal legislation. The Fair Work Act accepts certificates from any registered health practitioner. If your employer insists on an in-person certificate for routine sick leave, this may be challengeable through the Fair Work Ombudsman.'
      },
      {
        question: 'Can I verify my doctor\'s registration?',
        answer: 'Yes. All AHPRA-registered practitioners can be verified on the AHPRA website (ahpra.gov.au). You can search by name or registration number to confirm their registration status and any conditions.'
      },
      {
        question: 'Should I tell my employer in advance that I\'m using telehealth?',
        answer: 'There\'s no obligation to do so, and it\'s generally unnecessary. Submit your medical certificate as you normally would. If questions arise, address them factually.'
      },
      {
        question: 'What if I work in a safety-critical role?',
        answer: 'For routine sick leave, a telehealth certificate is still valid. However, return-to-work or fitness-for-duty assessments in safety-critical industries may require specific in-person evaluations depending on your industry\'s regulations.'
      }
    ],
    relatedServices: [
      {
        title: 'Medical Certificates',
        description: 'Get an AHPRA-certified medical certificate online.',
        href: '/request?service=medical-certificate',
        icon: 'certificate'
      },
      {
        title: 'General Consultation',
        description: 'Discuss your health concerns with a registered doctor.',
        href: '/request?service=consult',
        icon: 'consult'
      }
    ],
    seo: {
      title: 'Do Employers Accept Online Medical Certificates? | InstantMed',
      description: 'Yes. Online medical certificates are legally valid under the Fair Work Act 2009. Learn your rights and how to handle employer pushback.',
      keywords: ['do employers accept online medical certificates', 'is online medical certificate valid', 'employer reject telehealth certificate', 'fair work medical certificate', 'online sick note employer']
    }
  },

  // Article 3: Repeat Prescription Online
  {
    slug: 'repeat-prescription-online-australia',
    title: 'How to Get a Repeat Prescription Online in Australia (2026)',
    subtitle: 'The process, what medications qualify, and what to expect from a telehealth prescription service.',
    excerpt: 'Getting a repeat prescription online in Australia is straightforward for most routine medications. Here\'s how the process works, what\'s excluded, and what it costs.',
    category: 'medications',
    tags: ['prescription', 'medication', 'telehealth', 'online-doctor', 'escript', 'pharmacy'],
    publishedAt: '2026-04-01',
    updatedAt: '2026-04-01',
    readingTime: 9,
    viewCount: 0,
    author: contentAuthors.jamesPatel,
    heroImage: blogImages.repeatPrescriptionOnline,
    heroImageAlt: 'Person checking their phone for a digital prescription',
    content: [
      {
        type: 'paragraph',
        content: 'If you\'re on a stable medication and your prescription has run out, you don\'t necessarily need to sit in a waiting room to get it renewed. Telehealth services in Australia can issue repeat prescriptions for most routine medications, and the process is considerably less painful than booking a GP appointment three weeks from now.'
      },
      {
        type: 'paragraph',
        content: 'There are limits, of course. Some medications can\'t be prescribed online, and new prescriptions generally require a more thorough consultation. But for the straightforward scenario — you\'ve been taking the same medication for months or years, nothing has changed, and you just need a refill — online prescriptions are a practical option.'
      },
      { type: 'heading', content: 'What Medications Can Be Prescribed via Telehealth?', level: 2 },
      {
        type: 'paragraph',
        content: 'Most routine medications that you\'re already stable on can be prescribed through a telehealth consultation. The key word is "stable" — the doctor needs to be satisfied that the medication is working, you\'re not experiencing side effects, and there\'s no reason to change the treatment plan.'
      },
      {
        type: 'list',
        content: 'Common medications prescribed via telehealth include:',
        items: [
          'Blood pressure medications',
          'Cholesterol-lowering medications',
          'Oral contraceptives and hormonal contraception',
          'Antidepressants and anti-anxiety medications (on a stable dose)',
          'Asthma inhalers and preventers',
          'Thyroid medications',
          'Reflux and acid-reducing medications',
          'Skin treatments for acne, eczema, and rosacea',
          'Antihistamines and allergy medications (prescription-strength)',
          'Diabetes medications (stable, well-managed)'
        ]
      },
      {
        type: 'paragraph',
        content: 'The common thread is stability. If you\'ve been on the medication for a while, your condition is well-managed, and nothing has changed, a telehealth doctor can assess your situation and issue a new prescription. This covers the majority of routine renewals.'
      },
      { type: 'heading', content: 'What Can\'t Be Prescribed Online', level: 2 },
      {
        type: 'paragraph',
        content: 'This is the important part, and there are no exceptions. Some medications are legally restricted from telehealth prescribing, and legitimate services will be upfront about this.'
      },
      {
        type: 'list',
        content: 'Medications that cannot be prescribed through telehealth:',
        items: [
          'Schedule 8 controlled substances — this includes strong opioid painkillers, benzodiazepines (for anxiety and sleep), ADHD medications, and testosterone',
          'Any medication requiring a physical examination for safe prescribing',
          'Medications where the dose is still being adjusted or titrated',
          'New psychiatric medications that haven\'t been stabilised',
          'Medications that require recent blood tests or monitoring that hasn\'t been completed'
        ]
      },
      {
        type: 'callout',
        variant: 'warning',
        content: 'If a telehealth service offers to prescribe Schedule 8 controlled substances (strong painkillers, benzodiazepines, stimulants), that\'s a red flag. These medications require in-person assessment and are subject to strict state-based monitoring programs.'
      },
      {
        type: 'paragraph',
        content: 'This isn\'t bureaucracy for the sake of it. Controlled substances carry genuine risks of dependency and misuse, and the regulatory framework exists to protect patients. Any legitimate telehealth service will decline these requests and direct you to your regular GP. If they don\'t, you should be concerned about everything else they\'re doing.'
      },
      { type: 'heading', content: 'The Process, Step by Step', level: 2 },
      {
        type: 'paragraph',
        content: 'Getting a repeat prescription online follows a structured process. It\'s designed to collect the information a doctor needs to make a safe prescribing decision without requiring a synchronous appointment.'
      },
      { type: 'heading', content: '1. Complete the intake form', level: 3 },
      {
        type: 'paragraph',
        content: 'You provide details about the medication you need, how long you\'ve been taking it, your dosage, any side effects, and your relevant medical history. You\'ll also confirm that you have a Medicare card — this is required for prescription services to ensure PBS eligibility can be assessed.',
        links: [{ text: 'Complete the intake form', href: '/request?service=repeat-prescription', title: 'Start a repeat prescription request' }]
      },
      { type: 'heading', content: '2. Doctor review', level: 3 },
      {
        type: 'paragraph',
        content: 'An AHPRA-registered doctor reviews your request. They\'ll check whether the medication is appropriate for telehealth prescribing, whether your history is consistent with the request, and whether there are any clinical concerns. If they need more information, they\'ll reach out. If everything checks out, they issue the prescription.'
      },
      { type: 'heading', content: '3. eScript delivery', level: 3 },
      {
        type: 'paragraph',
        content: 'Your prescription is delivered as an electronic prescription (eScript) via SMS to your phone. You take this to any pharmacy in Australia — it\'s not tied to a specific chemist. The pharmacist scans the QR code, dispenses your medication, and that\'s it. No paper scripts, no collecting from a clinic.'
      },
      { type: 'heading', content: 'How eScripts Work', level: 2 },
      {
        type: 'paragraph',
        content: 'Electronic prescriptions replaced paper scripts as the default in Australia. When your doctor issues a prescription, you receive an SMS with a unique token and QR code. This is your prescription.',
        links: [{ text: 'Electronic prescriptions', href: '/blog/what-are-escripts', title: 'Understanding eScripts' }]
      },
      {
        type: 'list',
        content: 'Key things to know about eScripts:',
        items: [
          'The SMS contains a QR code — show this at any pharmacy',
          'You\'re not locked to a specific pharmacy. Any chemist in Australia can dispense from an eScript',
          'If your prescription includes repeats, the same token covers all of them',
          'eScripts don\'t expire differently from paper scripts — the same validity periods apply',
          'You can save the SMS or take a screenshot as a backup',
          'If you lose the SMS, your prescribing doctor or pharmacist can help retrieve it'
        ]
      },
      { type: 'heading', content: 'Cost Comparison', level: 2 },
      {
        type: 'paragraph',
        content: 'At InstantMed, a repeat prescription costs $29.95. This is the consultation fee for the doctor\'s assessment and the eScript. Your medication cost at the pharmacy is separate and depends on whether it\'s PBS-listed and your concession status.'
      },
      {
        type: 'paragraph',
        content: 'For comparison, a private GP visit typically costs $60 to $120 out of pocket, with a Medicare rebate of approximately $41 for a standard consultation (leaving $19-$79 gap). A bulk-billed appointment costs nothing, but the wait time in many areas is now two to four weeks. If you need your medication this week, $29.95 for a telehealth prescription is a reasonable alternative to running out of a medication you take daily.'
      },
      { type: 'heading', content: 'Medicare and PBS Considerations', level: 2 },
      {
        type: 'paragraph',
        content: 'You need a valid Medicare card to use InstantMed\'s prescription service. This is because prescriptions interact with the Pharmaceutical Benefits Scheme (PBS), and Medicare eligibility determines your subsidised pricing at the pharmacy.'
      },
      {
        type: 'paragraph',
        content: 'The prescription itself is a private consultation — the $29.95 fee is not covered by Medicare. However, once you have the eScript, your medication at the pharmacy is subsidised under the PBS exactly the same as any other prescription. You pay the standard PBS co-payment (currently $31.60 for general patients or $7.70 for concession card holders). The source of the prescription — GP or telehealth — makes no difference to the PBS subsidy.'
      },
      {
        type: 'callout',
        variant: 'info',
        content: 'PBS subsidies apply at the pharmacy regardless of how the prescription was issued. A telehealth prescription and a GP prescription are treated identically under the Pharmaceutical Benefits Scheme.'
      },
      { type: 'heading', content: 'When You Need an In-Person Appointment Instead', level: 2 },
      {
        type: 'paragraph',
        content: 'Telehealth prescriptions cover the routine renewals. But there are situations where you genuinely need to see a doctor face to face.'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Starting a new medication for the first time — the doctor needs to conduct a fuller assessment',
          'Dose adjustments — particularly for medications where getting the dose wrong has consequences',
          'Controlled substances (Schedule 8) — no telehealth service can legally prescribe these',
          'Medications requiring recent blood tests — if your bloods are overdue, you\'ll need pathology first',
          'Complex medication interactions — if you\'re on multiple medications and something has changed',
          'If your condition has changed — new symptoms, worsening symptoms, or side effects'
        ]
      },
      {
        type: 'paragraph',
        content: 'Think of telehealth prescriptions as handling the steady state. When things are working and nothing has changed, a telehealth renewal is efficient and appropriate. When things need adjusting, an in-person consultation is the right call.'
      },
      { type: 'heading', content: 'Frequently Asked Questions', level: 2 }
    ],
    faqs: [
      {
        question: 'Can I get a new prescription (not a repeat) via telehealth?',
        answer: 'In some cases, yes — for straightforward conditions where the diagnosis is clear. However, many new prescriptions require a more thorough assessment than telehealth can provide. Your doctor will advise if an in-person visit is more appropriate.'
      },
      {
        question: 'Do I need to provide proof of my previous prescription?',
        answer: 'It helps to know your medication name, dose, and how long you\'ve been taking it. You don\'t need to provide the original prescription, but accurate information helps the doctor make a safe assessment.'
      },
      {
        question: 'Can I use any pharmacy with an eScript?',
        answer: 'Yes. Electronic prescriptions can be dispensed at any pharmacy in Australia. You\'re not restricted to a specific chemist or location.'
      },
      {
        question: 'What happens if the doctor declines my prescription request?',
        answer: 'If a doctor determines that telehealth isn\'t appropriate for your medication request, they\'ll explain why and recommend you see a doctor in person. You\'ll receive a full refund in this case.'
      },
      {
        question: 'How long is the eScript valid for?',
        answer: 'eScripts follow the same validity rules as paper prescriptions. Most prescriptions are valid for 12 months from the date of issue, including any repeats.'
      },
      {
        question: 'Can I get the oral contraceptive pill prescribed online?',
        answer: 'Yes, if you\'re already on a stable regimen with no concerns. The oral contraceptive pill is one of the most commonly prescribed medications via telehealth.'
      },
      {
        question: 'Why can\'t controlled substances be prescribed via telehealth?',
        answer: 'Schedule 8 medications carry risks of dependency and misuse. Australian regulations require in-person assessment, patient identification, and often participation in state-based monitoring programs. These requirements can\'t be met through telehealth.'
      },
      {
        question: 'Do I need a Medicare card?',
        answer: 'Yes, a valid Medicare card is required for prescription services at InstantMed. This ensures PBS eligibility can be assessed and your medication is correctly subsidised at the pharmacy.'
      }
    ],
    relatedServices: [
      {
        title: 'Repeat Prescriptions',
        description: 'Renew your regular medications with a doctor-reviewed eScript.',
        href: '/request?service=repeat-prescription',
        icon: 'prescription'
      },
      {
        title: 'General Consultation',
        description: 'Discuss your health or medications with a registered doctor.',
        href: '/request?service=consult',
        icon: 'consult'
      }
    ],
    seo: {
      title: 'How to Get a Repeat Prescription Online in Australia (2026) | InstantMed',
      description: 'Get repeat prescriptions online in Australia for $29.95. Learn what medications qualify, how eScripts work, and what can\'t be prescribed via telehealth.',
      keywords: ['repeat prescription online australia', 'how to renew prescription without seeing doctor', 'online prescription australia', 'telehealth prescription', 'escript australia']
    }
  },

  // Article 4: Telehealth vs GP
  {
    slug: 'telehealth-vs-gp-australia',
    title: 'Telehealth vs GP: What\'s Actually Different in Australia?',
    subtitle: 'An honest comparison of when telehealth makes sense, when it doesn\'t, and why the answer is usually "both."',
    excerpt: 'Telehealth isn\'t better or worse than seeing a GP in person — it\'s different. Here\'s a balanced comparison of cost, wait times, quality of care, and when each option makes sense.',
    category: 'telehealth',
    tags: ['telehealth', 'online-doctor', 'work'],
    publishedAt: '2026-04-01',
    updatedAt: '2026-04-01',
    readingTime: 10,
    viewCount: 0,
    author: contentAuthors.marcusThompson,
    heroImage: blogImages.telehealthVsInPerson,
    heroImageAlt: 'Split image comparing a doctor consultation and a telehealth screen',
    content: [
      {
        type: 'paragraph',
        content: 'The question isn\'t whether telehealth is better than seeing a GP, because that\'s the wrong question. It\'s like asking whether email is better than a phone call. It depends on what you\'re trying to do. Sometimes you need a conversation, sometimes you need a document, and sometimes you need someone to physically look at the thing that hurts.'
      },
      {
        type: 'paragraph',
        content: 'Telehealth has carved out a clear role in the Australian healthcare system — not as a replacement for general practice, but as a complement to it. Understanding where each option works best saves you time, money, and the particular frustration of sitting in a waiting room reading a 2019 magazine while genuinely unwell.'
      },
      { type: 'heading', content: 'What Telehealth Does Well', level: 2 },
      {
        type: 'paragraph',
        content: 'Telehealth excels at tasks that are primarily informational — where the clinical decision depends on what you tell the doctor rather than what the doctor physically finds. This covers more of healthcare than most people assume.'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Repeat prescriptions — you\'ve been on the medication, nothing has changed, you need a refill',
          'Medical certificates — you woke up with gastro and need a sick note, not a stethoscope',
          'Mental health follow-ups — check-ins on existing treatment plans, medication reviews',
          'Straightforward acute illnesses — cold, flu, mild infections where the diagnosis is based on symptoms',
          'Referral requests — when you know you need a specialist and just need the paperwork',
          'Health advice — "is this worth seeing a doctor about?" is a perfectly valid telehealth question',
          'Sexual health consultations — where privacy and convenience genuinely matter',
          'Chronic condition management — stable conditions with established treatment plans'
        ]
      },
      {
        type: 'paragraph',
        content: 'The common thread is that these situations rely on history and reported symptoms. The doctor doesn\'t need to press on your abdomen, look in your ears, or listen to your chest. They need to hear what\'s happening, assess the clinical picture, and make a decision. That works perfectly well through a screen — or, for asynchronous services, through a well-designed health questionnaire.'
      },
      { type: 'heading', content: 'What Requires In-Person Care', level: 2 },
      {
        type: 'paragraph',
        content: 'There\'s no telehealth equivalent for a physical examination, and some clinical decisions genuinely require one. Knowing this boundary is important.'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Physical examinations — anything requiring palpation, auscultation (listening with a stethoscope), or visual assessment that a photo can\'t capture',
          'Procedures — wound closure, excisions, joint injections, IUD insertion',
          'New complex conditions — first presentation of symptoms that could be many things',
          'Children under 2 — paediatric assessment relies heavily on physical examination',
          'Acute emergencies — chest pain, stroke symptoms, severe allergic reactions (call 000)',
          'Musculoskeletal assessment — range of motion, strength testing, neurological examination',
          'Skin conditions that need close visual inspection — not everything photographs well',
          'Pre-employment and fitness-for-duty medicals — these require standardised physical assessments'
        ]
      },
      {
        type: 'callout',
        variant: 'info',
        content: 'A good telehealth service will tell you when you need to see someone in person. That honesty is part of what makes it trustworthy. If a service claims it can handle everything remotely, that\'s a service you should avoid.'
      },
      { type: 'heading', content: 'The Regulatory Framework', level: 2 },
      {
        type: 'paragraph',
        content: 'One of the most persistent misconceptions about telehealth is that it operates in some kind of regulatory grey area — a less rigorous version of "real" medicine. This isn\'t the case in Australia.'
      },
      {
        type: 'paragraph',
        content: 'Doctors providing telehealth services are registered with AHPRA and governed by the Medical Board of Australia, subject to the same code of conduct and professional standards as any GP in a clinic. The Therapeutic Goods Administration (TGA) regulates what can be prescribed, and telehealth prescribing follows the same guidelines. The Privacy Act 1988 and Australian Privacy Principles protect your health information regardless of how the consultation occurs.'
      },
      {
        type: 'paragraph',
        content: 'Telehealth doesn\'t get a lighter regulatory touch. If anything, telehealth services face additional scrutiny because they\'re newer and more visible. A telehealth doctor who prescribes inappropriately faces the same consequences as a GP who does the same — AHPRA investigation, potential deregistration, and possible criminal charges for serious breaches.'
      },
      { type: 'heading', content: 'Cost Comparison', level: 2 },
      {
        type: 'paragraph',
        content: 'This is where things get practical. The cost difference between telehealth and in-person GP visits depends heavily on whether you can access bulk billing.'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Bulk-billed GP: Free (if you can find one taking new patients and get an appointment within a reasonable timeframe)',
          'Private GP consultation: $60-$120 out of pocket, with a Medicare rebate of approximately $41 — leaving a gap of $19-$79',
          'After-hours GP or house call: $150-$300+',
          'Telehealth medical certificate: $19.95-$39.95 (no Medicare rebate)',
          'Telehealth repeat prescription: $29.95 (no Medicare rebate)',
          'Telehealth general consultation: $49.95 (no Medicare rebate)'
        ]
      },
      {
        type: 'paragraph',
        content: 'The honest comparison isn\'t "telehealth vs free GP" — it\'s "telehealth vs the GP you can actually access." If you\'re in an area with readily available bulk-billing GPs and you\'re happy to wait for an appointment, the in-person route is cheaper. If bulk billing isn\'t available in your area, or the wait is weeks, or you need something today, the cost equation looks different.'
      },
      { type: 'heading', content: 'Wait Time Comparison', level: 2 },
      {
        type: 'paragraph',
        content: 'This is often the deciding factor. The median wait for a GP appointment in Australia varies dramatically by location and whether you\'re seeking bulk billing.'
      },
      {
        type: 'list',
        content: '',
        items: [
          'Bulk-billed GP in a capital city: 2-4 weeks for a routine appointment',
          'Private GP in a capital city: 1-5 days',
          'Rural or regional GP: highly variable — some areas have month-long waits or no local GP at all',
          'Walk-in clinic: same-day, but expect 1-3 hours in the waiting room',
          'Telehealth (InstantMed): same-day review, typically within a few hours'
        ]
      },
      {
        type: 'paragraph',
        content: 'When you\'re unwell today and need a certificate or prescription today, waiting two weeks for a GP appointment isn\'t a realistic option. This is where telehealth fills a genuine gap — not by being superior, but by being available when the alternative isn\'t.'
      },
      { type: 'heading', content: 'Quality of Care', level: 2 },
      {
        type: 'paragraph',
        content: 'The evidence on telehealth quality is nuanced but generally positive for appropriate conditions. Multiple Australian studies have found that telehealth consultations for routine matters produce comparable outcomes to in-person visits. Patient satisfaction tends to be high, particularly for convenience and accessibility.'
      },
      {
        type: 'paragraph',
        content: 'The quality question isn\'t "is telehealth as good as in-person?" — it\'s "is telehealth appropriate for this specific clinical scenario?" For a repeat prescription where nothing has changed, telehealth quality is effectively identical to in-person. For a complex diagnostic workup, in-person care is clearly superior. The quality depends on matching the right delivery method to the right clinical need.'
      },
      {
        type: 'paragraph',
        content: 'Where telehealth can\'t match in-person care, it shouldn\'t try. Where it can — routine, informational, follow-up — the research supports its use.'
      },
      { type: 'heading', content: 'The Hybrid Approach', level: 2 },
      {
        type: 'paragraph',
        content: 'The most practical approach isn\'t choosing between telehealth and a GP — it\'s using both for what they\'re good at. Keep your regular GP for ongoing care, complex issues, and physical examinations. Use telehealth for the routine, time-sensitive, or convenience-driven needs that don\'t require hands-on assessment.'
      },
      {
        type: 'paragraph',
        content: 'This is how most healthcare systems are evolving globally. The GP relationship remains central for continuity of care and complex management. Telehealth handles the overflow — the prescription renewal that doesn\'t warrant a 30-minute appointment, the sick note when you can\'t get out of bed, the quick question that doesn\'t need a physical exam.'
      },
      {
        type: 'paragraph',
        content: 'Your GP is your healthcare home base. Telehealth is the convenience store on the corner — it doesn\'t replace the supermarket, but it\'s genuinely useful when you need milk at 9pm and the supermarket closed at five.'
      },
      { type: 'heading', content: 'Frequently Asked Questions', level: 2 }
    ],
    faqs: [
      {
        question: 'Is a telehealth doctor a "real" doctor?',
        answer: 'Yes. Telehealth doctors in Australia must be registered with AHPRA, hold the same qualifications as any GP, and meet the same professional standards. The consultation method is different; the medical training and obligations are identical.'
      },
      {
        question: 'Can telehealth replace my regular GP entirely?',
        answer: 'No, and it shouldn\'t. Telehealth is best used as a complement to your regular GP for specific, appropriate needs. Continuity of care — having a doctor who knows your full medical history — remains valuable for ongoing health management.'
      },
      {
        question: 'Is telehealth covered by Medicare?',
        answer: 'Some telehealth consultations are covered by Medicare (GP-initiated video or phone consults), but many private telehealth services like InstantMed operate outside Medicare with flat-fee pricing. Check with your provider about costs before booking.'
      },
      {
        question: 'What happens if the telehealth doctor can\'t help me?',
        answer: 'A responsible telehealth service will tell you when your needs are beyond what they can safely address remotely and recommend you see a doctor in person. At InstantMed, if your request is declined, you receive a full refund.'
      },
      {
        question: 'Is telehealth safe for older Australians?',
        answer: 'Yes, when used for appropriate conditions. The medical assessment is the same; only the delivery method differs. Many older Australians find telehealth helpful for medication renewals and routine follow-ups, particularly those with mobility limitations.'
      },
      {
        question: 'Can I use telehealth in rural or remote areas?',
        answer: 'This is one of telehealth\'s strongest use cases. If you\'re hours from the nearest GP, telehealth provides access to medical consultations that might otherwise require significant travel. You\'ll need a reliable internet or phone connection.'
      }
    ],
    relatedServices: [
      {
        title: 'Medical Certificates',
        description: 'Get an AHPRA-certified medical certificate online.',
        href: '/request?service=medical-certificate',
        icon: 'certificate'
      },
      {
        title: 'Repeat Prescriptions',
        description: 'Renew your regular medications without a clinic visit.',
        href: '/request?service=repeat-prescription',
        icon: 'prescription'
      },
      {
        title: 'General Consultation',
        description: 'Discuss health concerns with a registered doctor.',
        href: '/request?service=consult',
        icon: 'consult'
      }
    ],
    seo: {
      title: 'Telehealth vs GP: What\'s Actually Different in Australia? | InstantMed',
      description: 'Honest comparison of telehealth vs in-person GP visits in Australia. Cost, wait times, quality, and when each option makes sense.',
      keywords: ['telehealth vs gp', 'is telehealth as good as seeing a doctor', 'online doctor vs in person', 'telehealth australia pros cons', 'telehealth comparison']
    }
  }
]
