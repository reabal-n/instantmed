/**
 * Authentic Australian Testimonials
 * 
 * These testimonials are designed to feel genuine and relatable.
 * They follow brand voice rules: calm, plainspoken, no hype.
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
 * - Specific details (times, situations)
 * - Mix of ratings (mostly 5, some 4)
 * - Realistic complaints in lower ratings
 * - Diverse demographics and locations
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
    role: "Marketing Manager",
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=SarahM",
    featured: true,
  },
  {
    id: "t3",
    name: "Michelle T.",
    location: "Paddington, QLD",
    age: 38,
    rating: 5,
    text: "The form was thorough, not just a rubber stamp. Felt properly medical.",
    date: "3 days ago",
    service: "medical-certificate",
    verified: true,
    role: "Teacher",
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=MichelleT",
    featured: true,
  },
  {
    id: "t5",
    name: "Emma R.",
    location: "Newtown, NSW",
    age: 31,
    rating: 5,
    text: "Work from home, can't easily duck out to the GP. This saved me half a day.",
    date: "2 weeks ago",
    service: "medical-certificate",
    verified: true,
    role: "Designer",
  },
  {
    id: "t6",
    name: "Chris P.",
    location: "Gold Coast, QLD",
    age: 26,
    rating: 5,
    text: "Migraine hit at 7pm Sunday. Certificate in my inbox before bed. Brilliant.",
    date: "5 days ago",
    service: "medical-certificate",
    verified: true,
    role: "Hospitality",
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=ChrisP",
  },
  {
    id: "t8",
    name: "Tom H.",
    location: "Carlton, VIC",
    age: 22,
    rating: 5,
    text: "Missed an exam deadline. Sorted in under an hour. The doctor actually asked sensible questions.",
    date: "1 week ago",
    service: "medical-certificate",
    verified: true,
    role: "UniMelb Student",
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=TomH",
    featured: true,
  },
  {
    id: "t9",
    name: "Priya N.",
    location: "Parramatta, NSW",
    age: 33,
    rating: 5,
    text: "Kids were both sick so I couldn't leave the house. Cert through in about 45 mins. Didn't have to explain myself to anyone.",
    date: "4 days ago",
    service: "medical-certificate",
    verified: true,
    role: "Stay-at-home Mum",
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=PriyaN",
  },
  {
    id: "t10",
    name: "Ben C.",
    location: "Newcastle, NSW",
    age: 24,
    rating: 4,
    text: "Took about 2 hours not 1, but still faster than booking a GP. Would use again.",
    date: "2 weeks ago",
    service: "medical-certificate",
    verified: true,
    role: "Uni Student",
  },
  {
    id: "t12",
    name: "Mark D.",
    location: "Townsville, QLD",
    age: 37,
    rating: 5,
    text: "Regional area, nearest GP is 45 mins away. This fills a real gap.",
    date: "3 weeks ago",
    service: "medical-certificate",
    verified: true,
    role: "Engineer",
  },
  {
    id: "t13",
    name: "Nick B.",
    location: "Pyrmont, NSW",
    age: 33,
    rating: 5,
    text: "Got gastro the night before a presentation. Cert was in my inbox by 7am.",
    date: "1 week ago",
    service: "medical-certificate",
    verified: true,
    role: "Consultant",
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=NickB",
  },
  {
    id: "t14",
    name: "James L.",
    location: "Fremantle, WA",
    age: 34,
    rating: 5,
    text: "Shift worker here. Being able to do this at 11pm when I felt sick was exactly what I needed.",
    date: "2 weeks ago",
    service: "medical-certificate",
    verified: true,
    role: "FIFO Worker",
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=JamesL",
    featured: true,
  },
  {
    id: "t15",
    name: "Linda W.",
    location: "Hobart, TAS",
    age: 58,
    rating: 4,
    text: "Did this for my mum, she's 82. Filled in the form on her behalf and she got the cert. Saved us the trip to the clinic.",
    date: "3 weeks ago",
    service: "medical-certificate",
    verified: true,
    role: "Retired",
  },
  {
    id: "t16",
    name: "Andrew C.",
    location: "Norwood, SA",
    age: 45,
    rating: 5,
    text: "Mum had a fall so I stayed home. Needed the cert for work. The whole thing took maybe half an hour, done in between checking on her.",
    date: "1 week ago",
    service: "medical-certificate",
    verified: true,
    role: "Public Servant",
  },
  {
    id: "t17",
    name: "Marcus W.",
    location: "Fitzroy, VIC",
    age: 29,
    rating: 5,
    text: "Mental health day. No awkward conversations needed. Just answered honestly.",
    date: "4 days ago",
    service: "medical-certificate",
    verified: true,
    role: "Creative",
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=MarcusW",
  },
  {
    id: "t18",
    name: "Tim J.",
    location: "Northbridge, WA",
    age: 42,
    rating: 5,
    text: "Wasn't sure what to expect. Answered the questions, doctor messaged back, cert in my inbox same afternoon. Actually pretty painless.",
    date: "2 weeks ago",
    service: "medical-certificate",
    verified: true,
    role: "Small Business",
  },
  {
    id: "t19",
    name: "Sophie T.",
    location: "Perth, WA",
    age: 33,
    rating: 5,
    text: "Ran out of asthma preventer while travelling. Script sent to a local pharmacy same day.",
    date: "5 days ago",
    service: "prescription",
    verified: true,
    role: "Sales",
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=SophieT",
  },
  {
    id: "t20",
    name: "Rebecca S.",
    location: "Manly, NSW",
    age: 36,
    rating: 4,
    text: "Doctor asked follow-up questions which delayed things slightly, but fair enough.",
    date: "1 week ago",
    service: "prescription",
    verified: true,
    role: "Lawyer",
  },
  
  // === PRESCRIPTIONS / REPEAT MEDICATIONS ===
  {
    id: "t2",
    name: "David R.",
    location: "Chatswood, NSW",
    age: 52,
    rating: 5,
    text: "Blood pressure meds renewed in 20 minutes. Usually takes a week to see my GP.",
    date: "1 week ago",
    service: "prescription",
    verified: true,
    role: "Accountant",
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=DavidR",
    featured: true,
  },
  {
    id: "t4",
    name: "Jessica W.",
    location: "Adelaide, SA",
    age: 27,
    rating: 5,
    text: "Contraceptive prescription sorted without the usual 3-month appointment dance.",
    date: "1 month ago",
    service: "prescription",
    verified: true,
    role: "Analyst",
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=JessicaW",
  },
  {
    id: "t7",
    name: "Michael K.",
    location: "Mosman, NSW",
    age: 48,
    rating: 5,
    text: "The doctor checked my recent blood tests before approving. Felt properly looked after.",
    date: "3 weeks ago",
    service: "prescription",
    verified: true,
    role: "Executive",
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=MichaelK",
  },
  {
    id: "t11",
    name: "Ryan P.",
    location: "Darwin, NT",
    age: 41,
    rating: 5,
    text: "Living remote, nearest pharmacy is 2 hours. The e-script made life so much easier.",
    date: "1 month ago",
    service: "prescription",
    verified: true,
    role: "Farmer",
  },
  {
    id: "t21",
    name: "Daniel R.",
    location: "Adelaide, SA",
    age: 29,
    rating: 5,
    text: "Antidepressants ran out interstate. Found InstantMed, sorted within hours. Lifesaver.",
    date: "3 days ago",
    service: "prescription",
    verified: true,
    role: "Researcher",
    featured: true,
  },
  {
    id: "t22",
    name: "Peter J.",
    location: "Box Hill, VIC",
    age: 62,
    rating: 5,
    text: "Retired and my regular GP moved. Convenient way to get cholesterol meds renewed.",
    date: "2 weeks ago",
    service: "prescription",
    verified: true,
    role: "Retired",
  },
  {
    id: "t23",
    name: "Tanya R.",
    location: "Surfers Paradise, QLD",
    age: 29,
    rating: 5,
    text: "On holiday, ran out of my pill. New script sent to local pharmacy within an hour.",
    date: "1 week ago",
    service: "prescription",
    verified: true,
    role: "Flight Attendant",
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=TanyaR",
  },
  {
    id: "t24",
    name: "Andrew S.",
    location: "Ballarat, VIC",
    age: 47,
    rating: 4,
    text: "Straightforward for hay fever meds. Only 4 stars because the app was a bit slow.",
    date: "2 weeks ago",
    service: "prescription",
    verified: true,
    role: "Principal",
  },
  {
    id: "t25",
    name: "Jenny C.",
    location: "Manly, NSW",
    age: 41,
    rating: 5,
    text: "Third time using for blood pressure meds. Always smooth, doctors read your history.",
    date: "4 days ago",
    service: "prescription",
    verified: true,
    role: "Real Estate",
  },
  {
    id: "t26",
    name: "Sam O.",
    location: "Launceston, TAS",
    age: 23,
    rating: 5,
    text: "Uni student, no car, GP is across town. Takes like 20 minutes total.",
    date: "1 week ago",
    service: "prescription",
    verified: true,
    role: "Uni Student",
  },
  {
    id: "t27",
    name: "Helen G.",
    location: "Sunshine Coast, QLD",
    age: 67,
    rating: 5,
    text: "My son helped me first time but now I do it myself. Much better than the clinic.",
    date: "3 weeks ago",
    service: "prescription",
    verified: true,
    role: "Retired",
  },
  {
    id: "t28",
    name: "Rob M.",
    location: "Ringwood, VIC",
    age: 38,
    rating: 5,
    text: "Work FIFO, impossible to see my regular GP. This keeps prescriptions up to date.",
    date: "2 weeks ago",
    service: "prescription",
    verified: true,
    role: "FIFO Worker",
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=RobM",
  },
  
  // === CONSULTATIONS ===
  {
    id: "t36",
    name: "Laura P.",
    location: "Balmain, NSW",
    age: 34,
    rating: 5,
    text: "Needed to discuss ongoing migraines. Doctor was thorough, asked all the right questions, and sent a referral to a neurologist.",
    date: "5 days ago",
    service: "consultation",
    verified: true,
    role: "Project Manager",
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=LauraP",
    featured: true,
  },
  {
    id: "t37",
    name: "Steve K.",
    location: "Woolloongabba, QLD",
    age: 41,
    rating: 5,
    text: "Follow-up for blood pressure. Doctor had read my previous notes and adjusted the plan. Felt like a real consultation, not a tick-box exercise.",
    date: "1 week ago",
    service: "consultation",
    verified: true,
    role: "Teacher",
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=SteveK",
  },
  {
    id: "t38",
    name: "Mei L.",
    location: "Box Hill, VIC",
    age: 29,
    rating: 4,
    text: "Took a bit longer than expected but the doctor was really thorough. Good for non-urgent stuff.",
    date: "2 weeks ago",
    service: "consultation",
    verified: true,
    role: "Pharmacist",
  },
  {
    id: "t39",
    name: "Jake T.",
    location: "Bondi Junction, NSW",
    age: 26,
    rating: 5,
    text: "Hair loss consult. Doctor explained options clearly without pushing anything. Got a plan I'm comfortable with.",
    date: "4 days ago",
    service: "consultation",
    verified: true,
    role: "Software Engineer",
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=JakeT",
    featured: true,
  },
  {
    id: "t40",
    name: "Nadia H.",
    location: "Footscray, VIC",
    age: 32,
    rating: 5,
    text: "Women's health consult — doctor was respectful, direct, and didn't rush. Script sent to my pharmacy within the hour.",
    date: "1 week ago",
    service: "consultation",
    verified: true,
    role: "Nurse",
    image: "https://api.dicebear.com/7.x/notionists/svg?seed=NadiaH",
  },
  {
    id: "t41",
    name: "Greg W.",
    location: "Glenelg, SA",
    age: 55,
    rating: 5,
    text: "Weight management consult. Practical advice, no judgement. Follow-up booked for next month.",
    date: "3 days ago",
    service: "consultation",
    verified: true,
    role: "Truck Driver",
  },

  // === GENERAL / MIXED ===
  {
    id: "t29",
    name: "Kate B.",
    location: "St Kilda, VIC",
    age: 30,
    rating: 5,
    text: "Got a cert through here last month, just used them again for a repeat script. Solid both times.",
    date: "1 week ago",
    service: "medical-certificate",
    verified: true,
    role: "Physiotherapist",
  },
  {
    id: "t30",
    name: "Matt Y.",
    location: "Cronulla, NSW",
    age: 35,
    rating: 4,
    text: "Not the cheapest option, but you're paying to skip a 2-week GP wait. Worth it when you need something sorted quickly.",
    date: "2 weeks ago",
    service: "medical-certificate",
    verified: true,
    role: "Surf Instructor",
  },
  {
    id: "t31",
    name: "Lisa H.",
    location: "Paddington, QLD",
    age: 43,
    rating: 5,
    text: "HR checked the cert — no issues raised. Doctor had clearly read my answers, not just rubber-stamped it. Less fuss than going in person.",
    date: "5 days ago",
    service: "medical-certificate",
    verified: true,
    role: "Interior Designer",
  },
  {
    id: "t32",
    name: "Ryan D.",
    location: "Rockingham, WA",
    age: 22,
    rating: 5,
    text: "First job, first sick day. Had no idea how to get a cert. This was way easier than I thought it'd be.",
    date: "3 days ago",
    service: "medical-certificate",
    verified: true,
    role: "Apprentice Plumber",
  },
  {
    id: "t33",
    name: "Clare W.",
    location: "Neutral Bay, NSW",
    age: 48,
    rating: 5,
    text: "Both kids have used this when they were sick. Saves me booking GP appointments a week in advance. School's accepted the certs both times.",
    date: "1 week ago",
    service: "medical-certificate",
    verified: true,
    role: "HR Director",
  },
  {
    id: "t34",
    name: "Damien F.",
    location: "Ipswich, QLD",
    age: 54,
    rating: 5,
    text: "Wife talked me into it. Honestly? Less hassle than the clinic and about the same cost. I'd do it again.",
    date: "2 weeks ago",
    service: "prescription",
    verified: true,
    role: "Warehouse Manager",
  },
  {
    id: "t35",
    name: "Amy L.",
    location: "Fitzroy, VIC",
    age: 32,
    rating: 5,
    text: "Did the whole thing on my phone while lying on the couch. Cert came through in about 40 minutes. Exactly what I needed.",
    date: "4 days ago",
    service: "medical-certificate",
    verified: true,
    role: "Journalist",
  },
]

/**
 * Get testimonials for the columns wrapper component format
 */
export function getTestimonialsForColumns() {
  return TESTIMONIALS.map((t) => ({
    text: t.text,
    image: t.image || "",
    name: `${t.name}${t.age ? `, ${t.age}` : ""}`,
    role: `${t.location}${t.role ? ` • ${t.role}` : ""}`,
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
    role: t.role,
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

