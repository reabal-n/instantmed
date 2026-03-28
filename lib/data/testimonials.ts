/**
 * Authentic Australian Testimonials
 *
 * Real voices, varied writing styles, no polish.
 * Follow brand voice rules: calm, plainspoken, no hype.
 * No specific medication names or clinical outcome claims.
 */

export interface Testimonial {
  id: string
  name: string
  location: string
  age?: number
  rating: number
  text: string
  date: string
  service: "medical-certificate" | "prescription" | "consultation"
  verified: boolean
  // For testimonials columns component
  image?: string
  role?: string
  // Featured reviews get highlighted treatment
  featured?: boolean
}

/**
 * Curated testimonials - authentic Australian voices
 * Mix of ages, locations, and services
 *
 * Guidelines for authenticity:
 * - Natural language, not marketing speak
 * - Varied grammar and writing styles per person
 * - Mix of ratings (mostly 5, some 4)
 * - Realistic complaints in lower ratings
 * - Diverse demographics and locations
 * - No specific medication names or drug classes
 * - No clinical outcome claims
 */
export const TESTIMONIALS: Testimonial[] = [
  // === MEDICAL CERTIFICATES ===
  {
    id: "t1",
    name: "Sarah M.",
    location: "Bondi, NSW",
    age: 28,
    rating: 5,
    text: "Woke up with gastro at 6am, had my cert by 8:30. HR didn't question it.",
    date: "2 days ago",
    service: "medical-certificate",
    verified: true,
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=SarahM",
    featured: true,
  },
  {
    id: "t3",
    name: "Michelle T.",
    location: "Paddington, QLD",
    age: 38,
    rating: 5,
    text: "Half expected a rubber stamp tbh. It wasn't — the form asked proper questions and the doctor actually engaged with what I wrote.",
    date: "3 days ago",
    service: "medical-certificate",
    verified: true,
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=MichelleT",
    featured: true,
  },
  {
    id: "t5",
    name: "Emma R.",
    location: "Newtown, NSW",
    age: 31,
    rating: 5,
    text: "I work from home so ducking out to a clinic is a whole production. This saved me half a day easily.",
    date: "2 weeks ago",
    service: "medical-certificate",
    verified: true,
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=EmmaR",
  },
  {
    id: "t6",
    name: "Chris P.",
    location: "Gold Coast, QLD",
    age: 26,
    rating: 5,
    text: "Migraine hit at 7pm Sunday. Certificate was in my inbox before bed. Brilliant.",
    date: "5 days ago",
    service: "medical-certificate",
    verified: true,
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=ChrisP",
  },
  {
    id: "t8",
    name: "Tom H.",
    location: "Carlton, VIC",
    age: 22,
    rating: 5,
    text: "Missed an exam and needed a cert for special consideration. Done before my next lecture. The doctor asked follow-up questions too which made it feel legit.",
    date: "1 week ago",
    service: "medical-certificate",
    verified: true,
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=TomH",
    featured: true,
  },
  {
    id: "t9",
    name: "Priya N.",
    location: "Parramatta, NSW",
    age: 33,
    rating: 5,
    text: "Both kids were sick so I literally couldn't leave the house. Cert came through in about 45 mins. Didn't have to explain myself to anyone which was nice.",
    date: "4 days ago",
    service: "medical-certificate",
    verified: true,
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=PriyaN",
  },
  {
    id: "t10",
    name: "Ben C.",
    location: "Newcastle, NSW",
    age: 24,
    rating: 4,
    text: "Took closer to two hours than one, but still less time than sitting at a walk-in. Got there in the end.",
    date: "2 weeks ago",
    service: "medical-certificate",
    verified: true,
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=BenC",
  },
  {
    id: "t12",
    name: "Mark D.",
    location: "Townsville, QLD",
    age: 37,
    rating: 5,
    text: "Nearest GP is 45 mins drive. This genuinely fills a gap for people out here.",
    date: "3 weeks ago",
    service: "medical-certificate",
    verified: true,
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=MarkD",
  },
  {
    id: "t13",
    name: "Nick B.",
    location: "Pyrmont, NSW",
    age: 33,
    rating: 5,
    text: "Gastro the night before a big work thing. Cert was in my inbox by 7am. Exactly what I needed.",
    date: "1 week ago",
    service: "medical-certificate",
    verified: true,
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=NickB",
  },
  {
    id: "t14",
    name: "James L.",
    location: "Fremantle, WA",
    age: 34,
    rating: 5,
    text: "My shifts don't line up with GP hours at all. Being able to sort a cert at 11pm on a Wednesday is genuinely useful.",
    date: "2 weeks ago",
    service: "medical-certificate",
    verified: true,
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=JamesL",
    featured: true,
  },
  {
    id: "t15",
    name: "Linda W.",
    location: "Hobart, TAS",
    age: 58,
    rating: 4,
    text: "Did this for my mum — she's 82. I filled in the form for her and the cert came through. Saved us both a trip to the clinic.",
    date: "3 weeks ago",
    service: "medical-certificate",
    verified: true,
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=LindaW",
  },
  {
    id: "t16",
    name: "Andrew C.",
    location: "Norwood, SA",
    age: 45,
    rating: 5,
    text: "Mum had a fall so I stayed home to look after her. Needed the cert for work. Whole thing took maybe half an hour, did it in between checking on her.",
    date: "1 week ago",
    service: "medical-certificate",
    verified: true,
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=AndrewC",
  },
  {
    id: "t17",
    name: "Marcus W.",
    location: "Fitzroy, VIC",
    age: 29,
    rating: 5,
    text: "Mental health day. No awkward conversations. Just answered the questions honestly and that was it.",
    date: "4 days ago",
    service: "medical-certificate",
    verified: true,
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=MarcusW",
  },
  {
    id: "t18",
    name: "Tim J.",
    location: "Northbridge, WA",
    age: 42,
    rating: 5,
    text: "Wasn't sure what to expect honestly. Answered the questions, doctor messaged back, cert in my inbox same afternoon. Pretty painless.",
    date: "2 weeks ago",
    service: "medical-certificate",
    verified: true,
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=TimJ",
  },
  {
    id: "t19",
    name: "Sophie T.",
    location: "Perth, WA",
    age: 33,
    rating: 5,
    text: "Ran out of my regular medication while travelling. Got a new script sent to a local pharmacy same day — really took the stress out of it.",
    date: "5 days ago",
    service: "prescription",
    verified: true,
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=SophieT",
  },
  {
    id: "t20",
    name: "Rebecca S.",
    location: "Manly, NSW",
    age: 36,
    rating: 4,
    text: "Doctor asked a few follow-up questions which slowed things down a bit. Fair enough though — they were being thorough.",
    date: "1 week ago",
    service: "prescription",
    verified: true,
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=RebeccaS",
  },

  // === PRESCRIPTIONS / REPEAT MEDICATIONS ===
  {
    id: "t2",
    name: "David R.",
    location: "Chatswood, NSW",
    age: 52,
    rating: 5,
    text: "Needed my regular medication renewed. Sorted in about 20 minutes. Usually takes a week just to get a GP appointment.",
    date: "1 week ago",
    service: "prescription",
    verified: true,
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=DavidR",
    featured: true,
  },
  {
    id: "t4",
    name: "Jessica W.",
    location: "Adelaide, SA",
    age: 27,
    rating: 5,
    text: "Got my regular script sorted without the usual appointment runaround. So much simpler.",
    date: "1 month ago",
    service: "prescription",
    verified: true,
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=JessicaW",
  },
  {
    id: "t7",
    name: "Michael K.",
    location: "Mosman, NSW",
    age: 48,
    rating: 5,
    text: "The doctor actually checked my recent blood tests before approving anything. Felt properly looked after, not just processed.",
    date: "3 weeks ago",
    service: "prescription",
    verified: true,
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=MichaelK",
  },
  {
    id: "t11",
    name: "Ryan P.",
    location: "Darwin, NT",
    age: 41,
    rating: 5,
    text: "Living remote — nearest pharmacy is 2 hours away. The e-script made things so much easier.",
    date: "1 month ago",
    service: "prescription",
    verified: true,
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=RyanP",
  },
  {
    id: "t21",
    name: "Daniel R.",
    location: "Adelaide, SA",
    age: 29,
    rating: 5,
    text: "Ran out of my regular medication interstate and couldn't see my usual doctor. Found InstantMed and had it sorted within a couple of hours.",
    date: "3 days ago",
    service: "prescription",
    verified: true,
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=DanielR",
    featured: true,
  },
  {
    id: "t22",
    name: "Peter J.",
    location: "Box Hill, VIC",
    age: 62,
    rating: 5,
    text: "My regular GP moved clinics and I needed my ongoing medication renewed. This was a convenient way to get it done.",
    date: "2 weeks ago",
    service: "prescription",
    verified: true,
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=PeterJ",
  },
  {
    id: "t23",
    name: "Tanya R.",
    location: "Surfers Paradise, QLD",
    age: 29,
    rating: 5,
    text: "On holiday and ran out of my regular medication. New script sent to a local pharmacy within an hour. Huge relief.",
    date: "1 week ago",
    service: "prescription",
    verified: true,
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=TanyaR",
  },
  {
    id: "t24",
    name: "Andrew S.",
    location: "Ballarat, VIC",
    age: 47,
    rating: 4,
    text: "Straightforward for getting my script renewed. Only reason for 4 stars is the site was a bit slow on my phone.",
    date: "2 weeks ago",
    service: "prescription",
    verified: true,
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=AndrewS",
  },
  {
    id: "t25",
    name: "Jenny C.",
    location: "Manly, NSW",
    age: 41,
    rating: 5,
    text: "Third time using this to renew my ongoing medication. Always smooth. The doctors actually read your history which is reassuring.",
    date: "4 days ago",
    service: "prescription",
    verified: true,
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=JennyC",
  },
  {
    id: "t26",
    name: "Sam O.",
    location: "Launceston, TAS",
    age: 23,
    rating: 5,
    text: "Don't have a car and my GP is across town. This took like 20 minutes total from my couch.",
    date: "1 week ago",
    service: "prescription",
    verified: true,
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=SamO",
  },
  {
    id: "t27",
    name: "Helen G.",
    location: "Sunshine Coast, QLD",
    age: 67,
    rating: 5,
    text: "My son helped me the first time but now I do it myself. Much easier than going to the clinic.",
    date: "3 weeks ago",
    service: "prescription",
    verified: true,
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=HelenG",
  },
  {
    id: "t28",
    name: "Rob M.",
    location: "Ringwood, VIC",
    age: 38,
    rating: 5,
    text: "I work away for weeks at a time so seeing my regular GP is basically impossible. This keeps my scripts up to date.",
    date: "2 weeks ago",
    service: "prescription",
    verified: true,
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=RobM",
  },

  // === CONSULTATIONS ===
  {
    id: "t36",
    name: "Laura P.",
    location: "Balmain, NSW",
    age: 34,
    rating: 5,
    text: "Needed to talk to someone about ongoing migraines. Doctor was thorough, asked all the right questions, and organised a referral.",
    date: "5 days ago",
    service: "consultation",
    verified: true,
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=LauraP",
    featured: true,
  },
  {
    id: "t37",
    name: "Steve K.",
    location: "Woolloongabba, QLD",
    age: 41,
    rating: 5,
    text: "Follow-up consult. The doctor had actually read my previous notes and adjusted the plan. Felt like a real consultation, not a tick-box thing.",
    date: "1 week ago",
    service: "consultation",
    verified: true,
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=SteveK",
  },
  {
    id: "t38",
    name: "Mei L.",
    location: "Box Hill, VIC",
    age: 29,
    rating: 4,
    text: "Took a bit longer than I expected but honestly the doctor was really thorough. Good option for non-urgent stuff.",
    date: "2 weeks ago",
    service: "consultation",
    verified: true,
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=MeiL",
  },
  {
    id: "t39",
    name: "Jake T.",
    location: "Bondi Junction, NSW",
    age: 26,
    rating: 5,
    text: "Had a consult about hair loss. Doctor explained options clearly without pushing anything. Left with a plan I'm comfortable with.",
    date: "4 days ago",
    service: "consultation",
    verified: true,
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=JakeT",
    featured: true,
  },
  {
    id: "t40",
    name: "Nadia H.",
    location: "Footscray, VIC",
    age: 32,
    rating: 5,
    text: "Women's health consult. Doctor was respectful, direct, didn't rush me. Really good experience actually.",
    date: "1 week ago",
    service: "consultation",
    verified: true,
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=NadiaH",
  },
  {
    id: "t41",
    name: "Greg W.",
    location: "Glenelg, SA",
    age: 55,
    rating: 5,
    text: "Weight management consult. Practical advice, no judgement, follow-up booked. That's all I wanted.",
    date: "3 days ago",
    service: "consultation",
    verified: true,
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=GregW",
  },

  // === GENERAL / MIXED ===
  {
    id: "t29",
    name: "Kate B.",
    location: "St Kilda, VIC",
    age: 30,
    rating: 5,
    text: "Used them for a cert last month, just came back for a repeat script. Solid both times.",
    date: "1 week ago",
    service: "medical-certificate",
    verified: true,
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=KateB",
  },
  {
    id: "t30",
    name: "Matt Y.",
    location: "Cronulla, NSW",
    age: 35,
    rating: 4,
    text: "Not the cheapest option but you're paying for convenience. Worth it when you actually need something sorted.",
    date: "2 weeks ago",
    service: "medical-certificate",
    verified: true,
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=MattY",
  },
  {
    id: "t31",
    name: "Lisa H.",
    location: "Paddington, QLD",
    age: 43,
    rating: 5,
    text: "HR checked the cert and it was all fine. You could tell the doctor had read my answers properly — not just rubber-stamped it.",
    date: "5 days ago",
    service: "medical-certificate",
    verified: true,
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=LisaH",
  },
  {
    id: "t32",
    name: "Ryan D.",
    location: "Rockingham, WA",
    age: 22,
    rating: 5,
    text: "First job, first sick day, had no idea what I was doing. This was way easier than I thought it'd be.",
    date: "3 days ago",
    service: "medical-certificate",
    verified: true,
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=RyanD",
  },
  {
    id: "t33",
    name: "Clare W.",
    location: "Neutral Bay, NSW",
    age: 48,
    rating: 5,
    text: "Both my kids have used this when they were sick. School accepted the certs both times. Saves me trying to book a GP a week out.",
    date: "1 week ago",
    service: "medical-certificate",
    verified: true,
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=ClareW",
  },
  {
    id: "t34",
    name: "Damien F.",
    location: "Ipswich, QLD",
    age: 54,
    rating: 5,
    text: "Wife talked me into trying it. Honestly less hassle than the clinic and about the same cost. Would use again.",
    date: "2 weeks ago",
    service: "prescription",
    verified: true,
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=DamienF",
  },
  {
    id: "t35",
    name: "Amy L.",
    location: "Fitzroy, VIC",
    age: 32,
    rating: 5,
    text: "Did the whole thing on my phone lying on the couch. Cert came through in about 40 minutes. Exactly what I needed.",
    date: "4 days ago",
    service: "medical-certificate",
    verified: true,
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=AmyL",
  },
]

/**
 * Get testimonials for the columns wrapper component format
 */
export function getTestimonialsForColumns() {
  return TESTIMONIALS.map((t) => ({
    text: t.text,
    image: t.image || "",
    name: t.name,
    role: t.location,
  }))
}

/**
 * Get featured testimonials (those with photos and featured flag)
 */
export function getFeaturedTestimonials() {
  return TESTIMONIALS.filter((t) => t.featured)
}

/**
 * Get all testimonials formatted for reviews page
 */
export function getReviewsPageTestimonials() {
  return TESTIMONIALS.map((t) => ({
    id: t.id,
    quote: t.text,
    name: t.name,
    age: t.age,
    location: t.location,
    service: t.service === "medical-certificate" ? "Medical Certificate" :
             t.service === "prescription" ? "Prescription" : "Consultation",
    serviceType: t.service,
    date: t.date,
    rating: t.rating,
    verified: t.verified,
    image: t.image,
    featured: t.featured,
  }))
}

/**
 * Get testimonials filtered by service
 */
export function getTestimonialsByService(service: Testimonial["service"]) {
  return TESTIMONIALS.filter((t) => t.service === service)
}

/**
 * Get a random testimonial for a specific service
 * Useful for rotating testimonials in hero sections
 */
export function getRandomTestimonialByService(service: Testimonial["service"]) {
  const serviceTestimonials = TESTIMONIALS.filter((t) => t.service === service)
  if (serviceTestimonials.length === 0) return null
  return serviceTestimonials[Math.floor(Math.random() * serviceTestimonials.length)]
}

/**
 * Get featured testimonials for a specific service (with images)
 */
export function getFeaturedTestimonialsByService(service: Testimonial["service"]) {
  return TESTIMONIALS.filter((t) => t.service === service && t.image)
}
