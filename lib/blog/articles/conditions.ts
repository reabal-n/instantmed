import { blogImages } from '../images'
import { Article, defaultAuthor } from '../types'

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
      { type: 'paragraph', content: 'Hay fever - medically known as allergic rhinitis - affects around 1 in 5 Australians. It\'s an allergic reaction to airborne particles where your immune system overreacts to normally harmless substances.', links: [{ text: 'allergic rhinitis', href: '/conditions/allergic-rhinitis', title: 'Allergic rhinitis symptoms and treatment' }] },
      { type: 'heading', content: 'Common Triggers', level: 2 },
      { type: 'table', content: '', headers: ['Trigger', 'When it peaks', 'How to reduce exposure'], rows: [
        ['Grass pollen', 'Spring and summer (most common in Australia)', 'Check pollen forecasts, keep windows closed on high-pollen days'],
        ['Tree pollen', 'Late winter to spring', 'Avoid outdoor activities in the morning when pollen is highest'],
        ['Dust mites', 'Year-round', 'Wash bedding weekly in hot water, use dust-mite-proof covers'],
        ['Pet dander', 'Year-round (cats worst)', 'Keep pets out of bedrooms, vacuum regularly'],
        ['Mould spores', 'Damp or humid conditions', 'Address indoor moisture, run exhaust fans in bathrooms'],
      ]},
      { type: 'heading', content: 'Recognising Symptoms', level: 2 },
      { type: 'list', content: '', items: ['Runny or blocked nose', 'Sneezing, often in bursts', 'Itchy, watery eyes', 'Itchy throat, mouth, or ears', 'Fatigue from poor sleep'] },
      { type: 'callout', variant: 'info', content: 'Unlike a cold, hay fever does not cause fever or body aches. If you have those symptoms, you may have a viral infection instead.' },
      { type: 'heading', content: 'Treatment Options', level: 2 },
      { type: 'table', content: '', headers: ['Treatment', 'How it works', 'Best for'], rows: [
        ['Non-drowsy antihistamine tablets', 'Blocks histamine response', 'Mild to moderate symptoms, daily use'],
        ['Antihistamine nasal spray', 'Local antihistamine effect in the nose', 'Nasal symptoms without eye involvement'],
        ['Corticosteroid nasal spray', 'Reduces nasal inflammation', 'Moderate to severe or persistent symptoms'],
        ['Antihistamine eye drops', 'Relieves itchy, watery eyes', 'Eye symptoms (alone or alongside tablets)'],
        ['Saline nasal rinse', 'Clears pollen and mucus from nasal passages', 'All severities - safe to use daily'],
        ['Immunotherapy', 'Gradually desensitises immune system', 'Severe hay fever not controlled by medication'],
      ]},
      { type: 'heading', content: 'When to See a Doctor', level: 2 },
      { type: 'list', content: '', items: ['Over-the-counter medications are not working after 2-4 weeks', 'Symptoms are affecting your sleep or quality of life', 'You have asthma and hay fever is making it worse', 'You want to discuss long-term management or immunotherapy'] },
      { type: 'callout', variant: 'warning', content: 'If you experience difficulty breathing or wheezing, seek medical attention. Hay fever can trigger asthma attacks in some people.' }
    ],
    faqs: [
      { question: 'Can hay fever develop later in life?', answer: 'Yes. While it often starts in childhood, hay fever can develop at any age.' },
      { question: 'Can I take antihistamines every day?', answer: 'Non-drowsy antihistamines are generally safe for daily use during allergy season. Avoid using decongestant nasal sprays for more than a few days.' }
    ],
    relatedServices: [
      { title: 'GP Consultation', description: 'Discuss treatment options', href: '/consult', icon: 'consult' },
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
      { type: 'paragraph', content: 'Conjunctivitis - commonly called pink eye - is inflammation of the clear tissue covering the white of your eye. It\'s one of the most common eye conditions and is usually not serious.', links: [{ text: 'common eye conditions', href: '/blog/what-is-telehealth', title: 'Online consultations for common conditions' }] },
      { type: 'heading', content: 'Types of Conjunctivitis', level: 2 },
      { type: 'table', content: '', headers: ['Type', 'Discharge', 'Contagious?', 'Treatment'], rows: [
        ['Viral', 'Watery, clear', 'Yes - highly contagious', 'Resolves in 1-2 weeks without antibiotics'],
        ['Bacterial', 'Thick yellow-green, lids may stick together', 'Yes', 'Antibiotic eye drops prescribed by a doctor'],
        ['Allergic', 'Watery with intense itching, both eyes', 'No', 'Antihistamine drops, treat underlying allergy'],
      ]},
      { type: 'heading', content: 'Self-Care', level: 2 },
      { type: 'steps', content: '', items: [
        'Apply a cool or warm compress to the closed eye for a few minutes to ease discomfort.',
        'Gently clean away any discharge using a clean cloth or cotton pad dampened with cooled boiled water.',
        'Avoid touching or rubbing your eyes - this spreads infection and worsens irritation.',
        'Do not wear contact lenses until symptoms have fully resolved.',
        'Replace any eye makeup used during or just before the infection started.',
      ]},
      { type: 'callout', variant: 'info', content: 'Pink eye rarely affects vision. If you notice vision changes or severe pain, see a doctor promptly.' },
      { type: 'heading', content: 'When to See a Doctor', level: 2 },
      { type: 'list', content: '', items: ['Moderate to severe pain', 'Blurred vision or light sensitivity', 'Symptoms not improving after a week', 'You wear contact lenses', 'Newborn with eye discharge (urgent)'] }
    ],
    faqs: [
      { question: 'How long is pink eye contagious?', answer: 'Viral: about 10-14 days. Bacterial: usually not contagious 24-48 hours after starting antibiotics. Allergic: not contagious.' },
      { question: 'Do I always need antibiotic drops?', answer: 'No. Viral conjunctivitis doesn\'t respond to antibiotics. A doctor can determine if antibiotics are appropriate.' }
    ],
    relatedServices: [
      { title: 'GP Consultation', description: 'Get assessed and treated', href: '/consult', icon: 'consult' },
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
      { type: 'paragraph', content: 'Sinusitis is inflammation of the sinuses - air-filled spaces in your face. Most sinusitis starts with a viral infection that causes swelling, trapping mucus and creating pressure.' },
      { type: 'heading', content: 'Symptoms', level: 2 },
      { type: 'list', content: '', items: ['Facial pain or pressure (cheeks, forehead, eyes)', 'Blocked or stuffy nose', 'Thick, discoloured nasal discharge', 'Reduced sense of smell', 'Post-nasal drip', 'Headache'] },
      { type: 'callout', variant: 'info', content: 'Facial pain that worsens when leaning forward is a classic sign of sinusitis.' },
      { type: 'heading', content: 'Home Remedies', level: 2 },
      { type: 'steps', content: '', items: [
        'Rinse your nasal passages with a saline solution using a neti pot or squeeze bottle. Clears mucus and reduces swelling.',
        'Inhale steam - a bowl of hot water with a towel over your head, or a long warm shower. Helps loosen congestion.',
        'Stay well hydrated. Fluids thin the mucus and support recovery.',
        'Apply a warm compress over your face (cheeks and forehead) to ease sinus pressure.',
        'Rest and sleep with your head elevated on extra pillows to help sinuses drain overnight.',
      ]},
      { type: 'heading', content: 'Do You Need Antibiotics?', level: 2 },
      { type: 'paragraph', content: 'Most sinusitis is viral and does not need antibiotics. Signs suggesting bacterial infection include symptoms lasting more than 10 days, severe symptoms, or symptoms that improve then worsen.' },
      { type: 'callout', variant: 'warning', content: 'Don\'t use decongestant nasal sprays for more than 3 days - this can cause rebound congestion.' },
      { type: 'heading', content: 'When to See a Doctor', level: 2 },
      { type: 'list', content: '', items: ['Symptoms lasting more than 10 days', 'High fever', 'Severe headache or facial pain', 'Vision changes or swelling around eyes', 'Recurrent sinus infections'] }
    ],
    faqs: [
      { question: 'How long does sinusitis last?', answer: 'Acute sinusitis typically lasts 2-4 weeks. Most improve within 10 days.' },
      { question: 'Is green mucus always infection?', answer: 'No. Green or yellow mucus is common with both viral and bacterial infections.' }
    ],
    relatedServices: [
      { title: 'GP Consultation', description: 'Discuss your sinus symptoms', href: '/consult', icon: 'consult' },
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
      { type: 'table', content: '', headers: ['Type', 'What it feels like', 'Common causes'], rows: [
        ['Vertigo', 'A spinning sensation - like the room is moving around you', 'Inner ear problems (BPPV, labyrinthitis, Meniere\'s disease)'],
        ['Lightheadedness', 'Feeling faint or like you might pass out', 'Low blood pressure, dehydration, standing up too quickly'],
        ['Unsteadiness', 'Off-balance or uncoordinated without spinning', 'Neurological conditions, medication side effects, inner ear damage'],
      ]},
      { type: 'heading', content: 'Common Causes of Vertigo', level: 2 },
      { type: 'table', content: '', headers: ['Cause', 'What it is', 'Key feature'], rows: [
        ['BPPV', 'Tiny crystals dislodge in the inner ear', 'Brief spinning triggered by head movements'],
        ['Labyrinthitis', 'Inner ear inflammation, often after a viral infection', 'Persistent vertigo, sometimes with hearing loss'],
        ['Meniere\'s disease', 'Fluid pressure changes in the inner ear', 'Recurring episodes with hearing loss and ringing (tinnitus)'],
      ]},
      { type: 'heading', content: 'Managing at Home', level: 2 },
      { type: 'steps', content: '', items: [
        'Sit or lie down immediately when dizziness strikes to reduce fall risk.',
        'Stay hydrated - dehydration commonly worsens dizziness.',
        'Move slowly when changing positions, especially going from lying to standing.',
        'Avoid driving or operating machinery while dizzy.',
      ]},
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
      { title: 'GP Consultation', description: 'Discuss your symptoms', href: '/consult', icon: 'consult' },
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
      { type: 'paragraph', content: 'Shingles is a painful rash caused by the varicella-zoster virus - the same virus that causes chickenpox. After chickenpox, the virus stays dormant and can reactivate years later as shingles.' },
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
      { title: 'GP Consultation', description: 'Get assessed quickly', href: '/consult', icon: 'consult' },
      { title: 'Medical Certificate', description: 'Certificate for time off', href: '/medical-certificate', icon: 'certificate' }
    ],
    seo: { title: 'Shingles (Herpes Zoster) | Symptoms & Treatment | InstantMed', description: 'Shingles causes a painful rash. Learn why early treatment matters and about preventing complications.', keywords: ['shingles', 'herpes zoster', 'shingles treatment', 'shingles vaccine'] }
  },
  {
    slug: 'gout',
    title: 'Gout',
    subtitle: 'Understanding this painful form of arthritis.',
    excerpt: 'Gout causes sudden, severe joint pain - often in the big toe. Learn about treatment and prevention.',
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
      { type: 'steps', content: '', items: [
        'Rest the affected joint completely. Do not put weight on it or move it unnecessarily during an acute attack.',
        'Apply ice wrapped in a cloth for 20 minutes at a time to reduce swelling and pain.',
        'Take anti-inflammatory medication (NSAIDs) as soon as the attack starts - early treatment gives better relief.',
        'Colchicine is very effective for gout if started within the first 12-24 hours of an attack.',
        'Stay well hydrated - fluids help flush uric acid from the body.',
      ]},
      { type: 'heading', content: 'Prevention', level: 2 },
      { type: 'table', content: '', headers: ['Approach', 'What to do'], rows: [
        ['Reduce high-purine foods', 'Limit red meat, offal, and seafood (especially anchovies, sardines, mussels)'],
        ['Cut alcohol', 'Beer is the highest risk. Reduce or eliminate, especially during attacks'],
        ['Stay hydrated', 'Aim for 2+ litres of water per day - helps kidneys flush uric acid'],
        ['Maintain a healthy weight', 'Being overweight increases uric acid production'],
        ['Preventive medication', 'Allopurinol lowers uric acid long-term - discuss with your doctor if attacks are frequent'],
      ]},
      { type: 'callout', variant: 'warning', content: 'A hot, swollen joint with fever could be joint infection. Seek urgent care if you feel very unwell.' }
    ],
    faqs: [
      { question: 'Can diet cure gout?', answer: 'Diet helps but rarely cures gout alone. Most uric acid is produced by the body. Diet plus medication (if needed) is most effective.' },
      { question: 'Can I get a certificate for gout?', answer: 'Yes. Severe gout pain can make it impossible to walk or work.' }
    ],
    relatedServices: [
      { title: 'GP Consultation', description: 'Get assessed and treated', href: '/consult', icon: 'consult' },
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
      { type: 'paragraph', content: 'Eczema (atopic dermatitis) is a chronic skin condition causing dry, itchy, inflamed skin. It affects about 1 in 3 Australians at some point in their lives - but with the right management, most people keep it well under control.', links: [{ text: 'skin rash', href: '/conditions/skin-rash', title: 'Skin rash causes and treatment' }, { text: 'contact dermatitis', href: '/conditions/contact-dermatitis', title: 'Contact dermatitis information' }] },
      { type: 'heading', content: 'Recognising Eczema: Common Symptoms', level: 2 },
      { type: 'list', content: '', items: [
        'Dry, sensitive skin that feels rough or tight',
        'Intense itching - often worse at night, disrupting sleep',
        'Red, inflamed patches (may appear brown or grey on darker skin tones)',
        'Thickened or cracked skin in chronic cases',
        'Most commonly on elbows, knees, hands, neck, and around the eyes',
      ]},
      { type: 'heading', content: 'Common Triggers to Track', level: 2 },
      { type: 'table', content: '', headers: ['Trigger category', 'Common examples', 'How to reduce exposure'], rows: [
        ['Skin irritants', 'Soap, detergents, fragrances', 'Switch to fragrance-free, pH-balanced products'],
        ['Environmental allergens', 'Dust mites, pet dander, pollen', 'Wash bedding weekly, HEPA filters'],
        ['Weather', 'Cold air, dry indoor heating', 'Humidifier, extra moisturising in winter'],
        ['Stress', 'Work pressure, anxiety', 'Stress management, routine skin care'],
        ['Heat and sweat', 'Exercise, hot showers', 'Lukewarm showers, cool-down after exercise'],
        ['Certain foods', 'Dairy, eggs, nuts (varies)', 'Track with a food/symptom diary'],
      ]},
      { type: 'heading', content: 'Daily Skin Care: The Foundation of Management', level: 2 },
      { type: 'steps', content: '', items: [
        'Moisturise at least twice daily - morning and night. Use a thick cream or ointment, not a light lotion.',
        'Bathe in lukewarm water (not hot). Limit showers to 5-10 minutes.',
        'Apply moisturiser within 3 minutes of getting out of the shower, while skin is still slightly damp.',
        'Use soap-free, fragrance-free wash products. Regular soap strips the skin barrier.',
        'Continue moisturising even when your skin looks clear - prevention is far easier than treating a flare.',
      ]},
      { type: 'callout', variant: 'tip', content: 'Moisturising is the single most effective thing you can do for eczema. If you only do one thing, do this consistently.' },
      { type: 'heading', content: 'Treating Flares', level: 2 },
      { type: 'table', content: '', headers: ['Treatment', 'What it does', 'When used'], rows: [
        ['Topical corticosteroids', 'Reduces inflammation rapidly', 'Active flares - short courses'],
        ['Calcineurin inhibitors', 'Steroid-free anti-inflammatory', 'Sensitive areas (face, eyelids)'],
        ['Antihistamines', 'Reduces itch to help sleep', 'Itching disrupting sleep'],
        ['Wet wrap therapy', 'Intensified moisturising', 'Severe flares - doctor guidance'],
        ['Biologics (dupilumab)', 'Targets immune pathways', 'Moderate-severe, specialist referral'],
      ]},
      { type: 'heading', content: 'When to See a Doctor', level: 2 },
      { type: 'list', content: '', items: [
        'Skin isn\'t improving after 2 weeks of consistent moisturising',
        'Sleep is regularly disrupted by itching',
        'Signs of skin infection: weeping, crusting, increasing redness, fever',
        'Eczema is affecting daily life, work, or mental health',
        'You\'ve needed multiple short courses of steroids in one year',
      ]},
      { type: 'callout', variant: 'warning', content: 'If your skin is weeping, crusted, or you have a fever alongside an eczema flare, see a doctor promptly - this may indicate a bacterial infection (impetigo) requiring antibiotics.' },
    ],
    faqs: [
      { question: 'Can eczema be cured?', answer: 'No cure, but it can be well managed. Many children outgrow it. Good skin care keeps symptoms minimal.' },
      { question: 'Is eczema contagious?', answer: 'No. You cannot catch or spread eczema.' }
    ],
    relatedServices: [
      { title: 'GP Consultation', description: 'Discuss your eczema', href: '/consult', icon: 'consult' },
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
      { type: 'paragraph', content: 'Irritable bowel syndrome (IBS) is a common gut condition affecting about 1 in 5 Australians. It causes abdominal pain, bloating, and changes in bowel habits - but unlike inflammatory bowel disease, it doesn\'t damage the bowel or increase cancer risk.', links: [{ text: 'acid reflux', href: '/conditions/acid-reflux', title: 'Acid reflux symptoms and management' }, { text: 'gastritis', href: '/conditions/gastritis', title: 'Gastritis information' }] },
      { type: 'heading', content: 'Types of IBS', level: 2 },
      { type: 'table', content: '', headers: ['Type', 'Main symptom pattern', 'Prevalence'], rows: [
        ['IBS-D (diarrhoea-predominant)', 'Frequent loose stools, urgency', 'Most common'],
        ['IBS-C (constipation-predominant)', 'Infrequent, hard stools, straining', 'Common'],
        ['IBS-M (mixed)', 'Alternating diarrhoea and constipation', 'Common'],
        ['IBS-U (unsubtyped)', 'Doesn\'t fit the above patterns clearly', 'Less common'],
      ]},
      { type: 'heading', content: 'Recognising IBS Symptoms', level: 2 },
      { type: 'list', content: '', items: [
        'Abdominal pain or cramping that is often relieved by a bowel movement',
        'Bloating and a feeling of fullness or distension',
        'Changes in stool form - too loose, too hard, or both at different times',
        'Excessive gas and urgency (feeling you must go immediately)',
        'Symptoms that come and go - often worse during stressful periods',
      ]},
      { type: 'callout', variant: 'info', content: 'IBS is a diagnosis of exclusion - your doctor will rule out other conditions like inflammatory bowel disease, coeliac disease, and infection before confirming IBS.' },
      { type: 'heading', content: 'What Triggers IBS?', level: 2 },
      { type: 'table', content: '', headers: ['Trigger', 'Why it affects IBS', 'What helps'], rows: [
        ['High-FODMAP foods', 'Ferment in the gut, cause gas and bloating', 'Low FODMAP diet (with dietitian)'],
        ['Stress and anxiety', 'Gut-brain axis amplifies symptoms', 'Gut-directed hypnotherapy, CBT'],
        ['Hormonal changes', 'Menstrual cycle affects bowel function', 'Track patterns with a diary'],
        ['Large meals', 'Gastrocolic reflex triggers symptoms', 'Smaller, more frequent meals'],
        ['Caffeine and alcohol', 'Stimulate gut motility', 'Reduce or eliminate'],
        ['Antibiotics', 'Disrupt gut bacteria balance', 'Probiotics after antibiotic courses'],
      ]},
      { type: 'heading', content: 'The Low FODMAP Diet Explained', level: 2 },
      { type: 'paragraph', content: 'FODMAPs are short-chain carbohydrates that ferment in the large bowel, producing gas and drawing in water - both of which worsen IBS symptoms. A low FODMAP diet has strong clinical evidence behind it, with around 70% of IBS patients experiencing symptom improvement.' },
      { type: 'callout', variant: 'tip', content: 'The Low FODMAP diet is a 3-phase process: elimination (2-6 weeks), reintroduction (one food at a time), and personalisation. A dietitian experienced in IBS makes this far more effective.' },
      { type: 'heading', content: 'When to See a Doctor', level: 2 },
      { type: 'list', content: '', items: [
        'Blood in your stool - always investigate promptly',
        'Unexplained weight loss',
        'Symptoms that started after age 50',
        'Family history of bowel cancer or IBD',
        'Symptoms not responding to 3+ months of self-management',
        'Waking from sleep with bowel symptoms (IBS typically doesn\'t do this)',
      ]},
      { type: 'callout', variant: 'warning', content: 'Blood in stool, unexplained weight loss, or nocturnal symptoms should always be investigated - these are not typical of IBS and need to rule out other conditions.' },
    ],
    faqs: [
      { question: 'Is IBS serious?', answer: 'IBS is uncomfortable but doesn\'t cause lasting bowel damage or increase cancer risk. However, it can significantly impact quality of life.' },
      { question: 'Can stress cause IBS?', answer: 'Stress doesn\'t cause IBS but often triggers or worsens symptoms. The gut-brain connection is strong.' }
    ],
    relatedServices: [
      { title: 'GP Consultation', description: 'Discuss your symptoms', href: '/consult', icon: 'consult' },
      { title: 'Medical Certificate', description: 'Certificate if needed', href: '/medical-certificate', icon: 'certificate' }
    ],
    seo: { title: 'IBS & Digestive Issues | Symptoms & Management | InstantMed', description: 'IBS affects 1 in 5 Australians. Learn about symptoms, the low FODMAP diet, and management.', keywords: ['IBS', 'irritable bowel syndrome', 'digestive issues', 'FODMAP'] }
  }
]
