import { Article, defaultAuthor } from '../types'
import { blogImages } from '../images'

export const conditionArticles: Article[] = [
  {
    slug: 'hay-fever-allergies',
    title: 'Hay Fever & Seasonal Allergies',
    subtitle: 'Understanding allergic rhinitis and how to manage symptoms effectively.',
    excerpt: 'Hay fever affects millions of Australians. Learn about triggers, symptoms, treatment options, and when to see a doctor.',
    category: 'conditions',
    publishedAt: '2024-08-01',
    updatedAt: '2026-01-15',
    readingTime: 3,
    viewCount: 43250,
    author: defaultAuthor,
    heroImage: blogImages.hayFever,
    heroImageAlt: 'Person outdoors during spring with seasonal allergies',
    content: [
      { type: 'paragraph', content: 'Hay fever — medically known as allergic rhinitis — affects around 1 in 5 Australians. It\'s an allergic reaction to airborne particles where your immune system overreacts to normally harmless substances.', links: [{ text: 'allergic rhinitis', href: '/blog/telehealth-vs-in-person', title: 'When to see a doctor' }] },
      { type: 'heading', content: 'Common Triggers', level: 2 },
      { type: 'list', content: '', items: ['Grass pollen (most common in Australia)', 'Tree pollen (especially in spring)', 'Dust mites', 'Pet dander', 'Mould spores'] },
      { type: 'heading', content: 'Recognising Symptoms', level: 2 },
      { type: 'list', content: '', items: ['Runny or blocked nose', 'Sneezing, often in bursts', 'Itchy, watery eyes', 'Itchy throat, mouth, or ears', 'Fatigue from poor sleep'] },
      { type: 'callout', variant: 'info', content: 'Unlike a cold, hay fever doesn\'t cause fever or body aches. If you have these symptoms, you may have a viral infection instead.' },
      { type: 'heading', content: 'Treatment Options', level: 2 },
      { type: 'list', content: '', items: ['Antihistamines (tablets or nasal spray)', 'Corticosteroid nasal sprays for moderate-severe symptoms', 'Saline nasal rinses', 'Eye drops for itchy eyes', 'Immunotherapy for severe cases'] },
      { type: 'heading', content: 'When to See a Doctor', level: 2 },
      { type: 'list', content: '', items: ['Over-the-counter medications aren\'t working', 'Symptoms affect sleep or quality of life', 'You have asthma and hay fever is making it worse', 'You want to discuss long-term management'] },
      { type: 'callout', variant: 'warning', content: 'If you experience difficulty breathing or wheezing, seek medical attention. Hay fever can trigger asthma attacks in some people.' }
    ],
    faqs: [
      { question: 'Can hay fever develop later in life?', answer: 'Yes. While it often starts in childhood, hay fever can develop at any age.' },
      { question: 'Can I take antihistamines every day?', answer: 'Non-drowsy antihistamines are generally safe for daily use during allergy season. Avoid using decongestant nasal sprays for more than a few days.' }
    ],
    relatedServices: [
      { title: 'GP Consultation', description: 'Discuss treatment options', href: '/general-consult', icon: 'consult' },
      { title: 'Prescription Request', description: 'Request hay fever medication', href: '/repeat-prescription', icon: 'prescription' }
    ],
    seo: { title: 'Hay Fever & Seasonal Allergies | Treatment | InstantMed', description: 'Hay fever affects 1 in 5 Australians. Learn about allergic rhinitis symptoms, triggers, and treatment options.', keywords: ['hay fever australia', 'allergic rhinitis', 'seasonal allergies', 'hay fever treatment'] }
  },
  {
    slug: 'conjunctivitis-pink-eye',
    title: 'Conjunctivitis (Pink Eye)',
    subtitle: 'Understanding the different types of conjunctivitis and how to treat them.',
    excerpt: 'Pink eye is common and usually not serious. Learn about viral, bacterial, and allergic conjunctivitis.',
    category: 'conditions',
    publishedAt: '2024-08-10',
    updatedAt: '2026-01-12',
    readingTime: 2,
    viewCount: 28460,
    author: defaultAuthor,
    heroImage: blogImages.conjunctivitis,
    heroImageAlt: 'Close-up of healthy eye representing eye care',
    content: [
      { type: 'paragraph', content: 'Conjunctivitis — commonly called pink eye — is inflammation of the clear tissue covering the white of your eye. It\'s one of the most common eye conditions and is usually not serious.', links: [{ text: 'common eye conditions', href: '/blog/what-is-telehealth', title: 'Online consultations for common conditions' }] },
      { type: 'heading', content: 'Types of Conjunctivitis', level: 2 },
      { type: 'heading', content: 'Viral', level: 3 },
      { type: 'paragraph', content: 'Most common type. Watery discharge, highly contagious, resolves in 1-2 weeks without antibiotics.' },
      { type: 'heading', content: 'Bacterial', level: 3 },
      { type: 'paragraph', content: 'Thick yellow-green discharge, eyelids may stick together. Often responds to antibiotic drops.' },
      { type: 'heading', content: 'Allergic', level: 3 },
      { type: 'paragraph', content: 'Intense itching, affects both eyes, accompanies hay fever. Not contagious.' },
      { type: 'heading', content: 'Self-Care', level: 2 },
      { type: 'list', content: '', items: ['Apply cool or warm compresses', 'Gently clean discharge', 'Avoid touching or rubbing eyes', 'Don\'t wear contact lenses until resolved', 'Replace eye makeup'] },
      { type: 'callout', variant: 'info', content: 'Pink eye rarely affects vision. If you notice vision changes or severe pain, see a doctor promptly.' },
      { type: 'heading', content: 'When to See a Doctor', level: 2 },
      { type: 'list', content: '', items: ['Moderate to severe pain', 'Blurred vision or light sensitivity', 'Symptoms not improving after a week', 'You wear contact lenses', 'Newborn with eye discharge (urgent)'] }
    ],
    faqs: [
      { question: 'How long is pink eye contagious?', answer: 'Viral: about 10-14 days. Bacterial: usually not contagious 24-48 hours after starting antibiotics. Allergic: not contagious.' },
      { question: 'Do I always need antibiotic drops?', answer: 'No. Viral conjunctivitis doesn\'t respond to antibiotics. A doctor can determine if antibiotics are appropriate.' }
    ],
    relatedServices: [
      { title: 'GP Consultation', description: 'Get assessed and treated', href: '/general-consult', icon: 'consult' },
      { title: 'Medical Certificate', description: 'Certificate if you need time off', href: '/medical-certificate', icon: 'certificate' }
    ],
    seo: { title: 'Conjunctivitis (Pink Eye) | Symptoms & Treatment | InstantMed', description: 'Pink eye is common and usually not serious. Learn about viral, bacterial, and allergic conjunctivitis.', keywords: ['conjunctivitis', 'pink eye', 'pink eye treatment'] }
  },
  {
    slug: 'sinusitis',
    title: 'Sinusitis & Sinus Infections',
    subtitle: 'Understanding sinus inflammation and when antibiotics are needed.',
    excerpt: 'Sinusitis causes facial pain and congestion. Learn about home remedies and when to see a doctor.',
    category: 'conditions',
    publishedAt: '2024-08-15',
    updatedAt: '2026-01-10',
    readingTime: 3,
    viewCount: 44120,
    author: defaultAuthor,
    heroImage: blogImages.coldVsFlu,
    heroImageAlt: 'Person experiencing sinus discomfort',
    content: [
      { type: 'paragraph', content: 'Sinusitis is inflammation of the sinuses — air-filled spaces in your face. Most sinusitis starts with a viral infection that causes swelling, trapping mucus and creating pressure.' },
      { type: 'heading', content: 'Symptoms', level: 2 },
      { type: 'list', content: '', items: ['Facial pain or pressure (cheeks, forehead, eyes)', 'Blocked or stuffy nose', 'Thick, discoloured nasal discharge', 'Reduced sense of smell', 'Post-nasal drip', 'Headache'] },
      { type: 'callout', variant: 'info', content: 'Facial pain that worsens when leaning forward is a classic sign of sinusitis.' },
      { type: 'heading', content: 'Home Remedies', level: 2 },
      { type: 'list', content: '', items: ['Saline nasal rinse', 'Steam inhalation', 'Stay hydrated', 'Warm compresses on face', 'Rest', 'Sleep with head elevated'] },
      { type: 'heading', content: 'Do You Need Antibiotics?', level: 2 },
      { type: 'paragraph', content: 'Most sinusitis is viral and doesn\'t need antibiotics. Signs suggesting bacterial infection include symptoms lasting more than 10 days, severe symptoms, or symptoms that improve then worsen.' },
      { type: 'callout', variant: 'warning', content: 'Don\'t use decongestant nasal sprays for more than 3 days — this can cause rebound congestion.' },
      { type: 'heading', content: 'When to See a Doctor', level: 2 },
      { type: 'list', content: '', items: ['Symptoms lasting more than 10 days', 'High fever', 'Severe headache or facial pain', 'Vision changes or swelling around eyes', 'Recurrent sinus infections'] }
    ],
    faqs: [
      { question: 'How long does sinusitis last?', answer: 'Acute sinusitis typically lasts 2-4 weeks. Most improve within 10 days.' },
      { question: 'Is green mucus always infection?', answer: 'No. Green or yellow mucus is common with both viral and bacterial infections.' }
    ],
    relatedServices: [
      { title: 'GP Consultation', description: 'Discuss your sinus symptoms', href: '/general-consult', icon: 'consult' },
      { title: 'Medical Certificate', description: 'Certificate for time off', href: '/medical-certificate', icon: 'certificate' }
    ],
    seo: { title: 'Sinusitis & Sinus Infections | Treatment | InstantMed', description: 'Sinusitis causes facial pain and congestion. Learn about home remedies and when antibiotics are needed.', keywords: ['sinusitis', 'sinus infection', 'sinus infection treatment'] }
  },
  {
    slug: 'vertigo-dizziness',
    title: 'Vertigo & Dizziness',
    subtitle: 'Understanding different types of dizziness and when to be concerned.',
    excerpt: 'Dizziness has many causes, from inner ear problems to dehydration. Learn when to seek help.',
    category: 'conditions',
    publishedAt: '2024-08-20',
    updatedAt: '2026-01-08',
    readingTime: 3,
    viewCount: 41580,
    author: defaultAuthor,
    heroImage: blogImages.insomnia,
    heroImageAlt: 'Person experiencing balance and equilibrium issues',
    content: [
      { type: 'paragraph', content: 'Dizziness is a common complaint, but the word means different things. Understanding your type of dizziness helps identify the cause.' },
      { type: 'heading', content: 'Types of Dizziness', level: 2 },
      { type: 'list', content: '', items: ['Vertigo — spinning sensation, usually inner ear related', 'Lightheadedness — feeling faint, often blood pressure or dehydration', 'Unsteadiness — off-balance without spinning or faintness'] },
      { type: 'heading', content: 'Common Causes of Vertigo', level: 2 },
      { type: 'list', content: '', items: ['BPPV — crystals in inner ear cause brief spinning with head movement', 'Labyrinthitis — inner ear inflammation after infection', 'Meniere\'s disease — episodes with hearing loss and tinnitus'] },
      { type: 'heading', content: 'Managing at Home', level: 2 },
      { type: 'list', content: '', items: ['Sit or lie down immediately', 'Stay hydrated', 'Move slowly when changing positions', 'Avoid driving while dizzy'] },
      { type: 'callout', variant: 'tip', content: 'For BPPV, specific head exercises (Epley manoeuvre) can be very effective. A doctor or physio can teach you.' },
      { type: 'heading', content: 'When to Seek Urgent Care', level: 2 },
      { type: 'list', content: '', items: ['Dizziness with severe headache', 'Dizziness with chest pain or shortness of breath', 'Numbness, weakness, or slurred speech', 'After a head injury', 'Fainting'] },
      { type: 'callout', variant: 'emergency', content: 'If dizziness is with sudden headache, one-sided weakness, or difficulty speaking, call 000. These could be stroke signs.' }
    ],
    faqs: [
      { question: 'Is vertigo the same as dizziness?', answer: 'Vertigo is a type of dizziness (spinning sensation), but dizziness also includes lightheadedness and unsteadiness.' },
      { question: 'Can anxiety cause dizziness?', answer: 'Yes. Anxiety and panic attacks commonly cause dizziness and lightheadedness.' }
    ],
    relatedServices: [
      { title: 'GP Consultation', description: 'Discuss your symptoms', href: '/general-consult', icon: 'consult' },
      { title: 'Medical Certificate', description: 'Certificate if unfit for work', href: '/medical-certificate', icon: 'certificate' }
    ],
    seo: { title: 'Vertigo & Dizziness | Causes & Treatment | InstantMed', description: 'Dizziness has many causes. Learn about vertigo, BPPV, lightheadedness, and when to see a doctor.', keywords: ['vertigo', 'dizziness', 'BPPV', 'feeling dizzy'] }
  },
  {
    slug: 'shingles',
    title: 'Shingles (Herpes Zoster)',
    subtitle: 'Understanding shingles and why early treatment matters.',
    excerpt: 'Shingles causes a painful rash from the chickenpox virus reactivating. Learn about early treatment.',
    category: 'conditions',
    publishedAt: '2024-09-01',
    updatedAt: '2026-01-12',
    readingTime: 3,
    viewCount: 19340,
    author: defaultAuthor,
    heroImage: blogImages.genericMedical,
    heroImageAlt: 'Medical care and treatment concept',
    content: [
      { type: 'paragraph', content: 'Shingles is a painful rash caused by the varicella-zoster virus — the same virus that causes chickenpox. After chickenpox, the virus stays dormant and can reactivate years later as shingles.' },
      { type: 'heading', content: 'Who Gets Shingles?', level: 2 },
      { type: 'paragraph', content: 'About 1 in 3 people will get shingles. Risk increases with age over 50, weakened immune system, or significant stress.' },
      { type: 'heading', content: 'Recognising Shingles', level: 2 },
      { type: 'list', content: '', items: ['Pain, burning, or tingling before rash appears', 'Red rash in a band or strip pattern', 'Usually on one side of body only', 'Develops into fluid-filled blisters', 'Blisters crust over after 7-10 days'] },
      { type: 'callout', variant: 'warning', content: 'Antiviral medication works best within 72 hours of rash appearing. See a doctor quickly if you suspect shingles.' },
      { type: 'heading', content: 'Treatment', level: 2 },
      { type: 'list', content: '', items: ['Antiviral medications (most effective early)', 'Pain relief', 'Cool compresses', 'Keeping rash clean and dry'] },
      { type: 'heading', content: 'Complications', level: 2 },
      { type: 'paragraph', content: 'Postherpetic neuralgia (ongoing nerve pain) is the most common complication. Shingles near the eye requires urgent specialist assessment.' },
      { type: 'heading', content: 'Prevention', level: 2 },
      { type: 'paragraph', content: 'A shingles vaccine is recommended for adults over 50 and free for those 65+ under the National Immunisation Program.' }
    ],
    faqs: [
      { question: 'Can you get shingles more than once?', answer: 'Yes, though uncommon. About 5% of people have a second episode.' },
      { question: 'Is shingles contagious?', answer: 'You can\'t catch shingles, but someone who hasn\'t had chickenpox can catch chickenpox from shingles blisters.' }
    ],
    relatedServices: [
      { title: 'GP Consultation', description: 'Get assessed quickly', href: '/general-consult', icon: 'consult' },
      { title: 'Medical Certificate', description: 'Certificate for time off', href: '/medical-certificate', icon: 'certificate' }
    ],
    seo: { title: 'Shingles (Herpes Zoster) | Symptoms & Treatment | InstantMed', description: 'Shingles causes a painful rash. Learn why early treatment matters and about preventing complications.', keywords: ['shingles', 'herpes zoster', 'shingles treatment', 'shingles vaccine'] }
  },
  {
    slug: 'gout',
    title: 'Gout',
    subtitle: 'Understanding this painful form of arthritis.',
    excerpt: 'Gout causes sudden, severe joint pain — often in the big toe. Learn about treatment and prevention.',
    category: 'conditions',
    publishedAt: '2024-09-10',
    updatedAt: '2026-01-10',
    readingTime: 3,
    viewCount: 35720,
    author: defaultAuthor,
    heroImage: blogImages.backPain,
    heroImageAlt: 'Joint health and mobility concept',
    content: [
      { type: 'paragraph', content: 'Gout is inflammatory arthritis caused by uric acid crystals forming in joints. The big toe is most commonly affected, but gout can affect any joint.', links: [{ text: 'inflammatory arthritis', href: '/blog/medical-certificate-online-australia', title: 'Get a medical certificate if you cannot work' }] },
      { type: 'heading', content: 'Risk Factors', level: 2 },
      { type: 'list', content: '', items: ['Diet high in purines (red meat, seafood)', 'Alcohol, especially beer', 'Sugary drinks', 'Obesity', 'Certain medications', 'Kidney disease'] },
      { type: 'heading', content: 'Recognising Gout', level: 2 },
      { type: 'list', content: '', items: ['Sudden intense pain, often at night', 'Joint red, hot, and swollen', 'Pain peaks within 12-24 hours', 'Most commonly affects big toe'] },
      { type: 'callout', variant: 'info', content: 'Gout pain is often so severe that even a bedsheet touching the joint is unbearable.' },
      { type: 'heading', content: 'Treatment', level: 2 },
      { type: 'list', content: '', items: ['Anti-inflammatory medications (NSAIDs)', 'Colchicine — best if started early', 'Rest the affected joint', 'Ice packs', 'Stay hydrated'] },
      { type: 'heading', content: 'Prevention', level: 2 },
      { type: 'list', content: '', items: ['Limit high-purine foods', 'Reduce alcohol', 'Stay hydrated', 'Maintain healthy weight', 'Preventive medication for frequent attacks'] },
      { type: 'callout', variant: 'warning', content: 'A hot, swollen joint with fever could be joint infection. Seek urgent care if you feel very unwell.' }
    ],
    faqs: [
      { question: 'Can diet cure gout?', answer: 'Diet helps but rarely cures gout alone. Most uric acid is produced by the body. Diet plus medication (if needed) is most effective.' },
      { question: 'Can I get a certificate for gout?', answer: 'Yes. Severe gout pain can make it impossible to walk or work.' }
    ],
    relatedServices: [
      { title: 'GP Consultation', description: 'Get assessed and treated', href: '/general-consult', icon: 'consult' },
      { title: 'Medical Certificate', description: 'Certificate if you can\'t work', href: '/medical-certificate', icon: 'certificate' }
    ],
    seo: { title: 'Gout | Symptoms, Treatment & Prevention | InstantMed', description: 'Gout causes sudden, severe joint pain. Learn about causes, treatment, and prevention.', keywords: ['gout', 'gout treatment', 'gout symptoms', 'gout diet'] }
  },
  {
    slug: 'eczema-dermatitis',
    title: 'Eczema & Dermatitis',
    subtitle: 'Managing this common inflammatory skin condition.',
    excerpt: 'Eczema causes itchy, inflamed skin. Learn about triggers, treatments, and long-term management.',
    category: 'conditions',
    publishedAt: '2024-09-15',
    updatedAt: '2026-01-08',
    readingTime: 3,
    viewCount: 46890,
    author: defaultAuthor,
    heroImage: blogImages.eczema,
    heroImageAlt: 'Skin health and dermatology concept',
    content: [
      { type: 'paragraph', content: 'Eczema (atopic dermatitis) is a chronic skin condition causing dry, itchy, inflamed skin. It affects about 1 in 3 Australians at some point.', links: [{ text: 'chronic skin condition', href: '/blog/online-prescription-australia', title: 'Get treatment online' }] },
      { type: 'heading', content: 'Symptoms', level: 2 },
      { type: 'list', content: '', items: ['Dry, sensitive skin', 'Intense itching (often worse at night)', 'Red or brownish-grey patches', 'Thickened, cracked skin', 'Common on elbows, knees, hands, face'] },
      { type: 'heading', content: 'Common Triggers', level: 2 },
      { type: 'list', content: '', items: ['Dry skin', 'Irritants (soaps, detergents, fragrances)', 'Allergens (dust mites, pet dander, pollen)', 'Stress', 'Heat and sweating'] },
      { type: 'heading', content: 'Daily Skin Care', level: 2 },
      { type: 'list', content: '', items: ['Moisturise frequently (at least twice daily)', 'Use fragrance-free moisturisers', 'Apply moisturiser within 3 minutes of bathing', 'Take lukewarm showers', 'Use soap-free wash products'] },
      { type: 'callout', variant: 'tip', content: 'Moisturising is the foundation of eczema management. Even when skin looks clear, continue moisturising to prevent flares.' },
      { type: 'heading', content: 'Treating Flares', level: 2 },
      { type: 'list', content: '', items: ['Topical corticosteroids for inflammation', 'Topical calcineurin inhibitors (steroid-free option)', 'Antihistamines for itch'] },
      { type: 'heading', content: 'When to See a Doctor', level: 2 },
      { type: 'list', content: '', items: ['Not improving with moisturising', 'Sleep disturbed by itching', 'Signs of infection (weeping, crusting, fever)', 'Affecting quality of life'] }
    ],
    faqs: [
      { question: 'Can eczema be cured?', answer: 'No cure, but it can be well managed. Many children outgrow it. Good skin care keeps symptoms minimal.' },
      { question: 'Is eczema contagious?', answer: 'No. You cannot catch or spread eczema.' }
    ],
    relatedServices: [
      { title: 'GP Consultation', description: 'Discuss your eczema', href: '/general-consult', icon: 'consult' },
      { title: 'Prescription Request', description: 'Request treatment', href: '/repeat-prescription', icon: 'prescription' }
    ],
    seo: { title: 'Eczema & Dermatitis | Symptoms & Treatment | InstantMed', description: 'Eczema causes itchy, inflamed skin. Learn about triggers, treatment, and long-term management.', keywords: ['eczema', 'atopic dermatitis', 'eczema treatment', 'dermatitis'] }
  },
  {
    slug: 'ibs-digestive-issues',
    title: 'IBS & Digestive Issues',
    subtitle: 'Understanding irritable bowel syndrome.',
    excerpt: 'IBS affects up to 1 in 5 Australians. Learn about symptoms, triggers, and management.',
    category: 'conditions',
    publishedAt: '2024-09-20',
    updatedAt: '2026-01-15',
    readingTime: 3,
    viewCount: 48930,
    author: defaultAuthor,
    heroImage: blogImages.reflux,
    heroImageAlt: 'Digestive health and wellness concept',
    content: [
      { type: 'paragraph', content: 'Irritable bowel syndrome (IBS) is a common gut disorder causing abdominal pain, bloating, and changes in bowel habits. It\'s uncomfortable but doesn\'t damage the bowel.', links: [{ text: 'common gut disorder', href: '/blog/medical-certificate-food-poisoning', title: 'Medical certificates for digestive issues' }] },
      { type: 'heading', content: 'Types of IBS', level: 2 },
      { type: 'list', content: '', items: ['IBS-D: Diarrhea predominant', 'IBS-C: Constipation predominant', 'IBS-M: Mixed (alternating)'] },
      { type: 'heading', content: 'Symptoms', level: 2 },
      { type: 'list', content: '', items: ['Abdominal pain (often relieved by bowel movements)', 'Bloating', 'Diarrhea, constipation, or both', 'Excessive gas', 'Urgency'] },
      { type: 'callout', variant: 'info', content: 'IBS symptoms often worsen with stress, certain foods, or hormonal changes.' },
      { type: 'heading', content: 'The Low FODMAP Diet', level: 2 },
      { type: 'paragraph', content: 'FODMAPs are carbohydrates that can trigger IBS symptoms. A low FODMAP diet (with dietitian guidance) helps many people identify their triggers.' },
      { type: 'heading', content: 'Management', level: 2 },
      { type: 'list', content: '', items: ['Keep a food/symptom diary', 'Eat regular meals', 'Stay hydrated', 'Manage stress', 'Exercise regularly', 'Consider probiotics'] },
      { type: 'heading', content: 'When to See a Doctor', level: 2 },
      { type: 'list', content: '', items: ['Blood in stool', 'Unexplained weight loss', 'Symptoms started after age 50', 'Family history of bowel cancer', 'Symptoms not responding to self-care'] },
      { type: 'callout', variant: 'warning', content: 'Blood in stool, unexplained weight loss, or severe pain should always be investigated to rule out other conditions.' }
    ],
    faqs: [
      { question: 'Is IBS serious?', answer: 'IBS is uncomfortable but doesn\'t cause lasting bowel damage or increase cancer risk. However, it can significantly impact quality of life.' },
      { question: 'Can stress cause IBS?', answer: 'Stress doesn\'t cause IBS but often triggers or worsens symptoms. The gut-brain connection is strong.' }
    ],
    relatedServices: [
      { title: 'GP Consultation', description: 'Discuss your symptoms', href: '/general-consult', icon: 'consult' },
      { title: 'Medical Certificate', description: 'Certificate if needed', href: '/medical-certificate', icon: 'certificate' }
    ],
    seo: { title: 'IBS & Digestive Issues | Symptoms & Management | InstantMed', description: 'IBS affects 1 in 5 Australians. Learn about symptoms, the low FODMAP diet, and management.', keywords: ['IBS', 'irritable bowel syndrome', 'digestive issues', 'FODMAP'] }
  }
]
