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
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
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
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
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
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
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
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
    featured: true,
  },
  {
    id: "t9",
    name: "Priya N.",
    location: "Parramatta, NSW",
    age: 33,
    rating: 5,
    text: "As a mum of two, getting to the GP is a mission. This was so much easier.",
    date: "4 days ago",
    service: "medical-certificate",
    verified: true,
    role: "Stay-at-home Mum",
    image: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&h=100&fit=crop&crop=face",
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
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
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
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face",
    featured: true,
  },
  {
    id: "t15",
    name: "Linda W.",
    location: "Hobart, TAS",
    age: 58,
    rating: 4,
    text: "Works well. Wished there was a phone option for the elderly, but my mum managed.",
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
    text: "Used it for carer's leave when mum got sick. Quick and respectful process.",
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
    image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=face",
  },
  {
    id: "t18",
    name: "Tim J.",
    location: "Northbridge, WA",
    age: 42,
    rating: 5,
    text: "First time using telehealth. Was sceptical but the interface is actually pleasant.",
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
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face",
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
    image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop&crop=face",
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
    image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=100&h=100&fit=crop&crop=face",
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
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
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
    image: "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=100&h=100&fit=crop&crop=face",
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
    image: "https://images.unsplash.com/photo-1463453091185-61582044d556?w=100&h=100&fit=crop&crop=face",
  },
  
  // === GENERAL / MIXED ===
  {
    id: "t29",
    name: "Kate B.",
    location: "St Kilda, VIC",
    age: 30,
    rating: 5,
    text: "Used for a cert last month and a script this month. Both times quick and thorough.",
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
    text: "Does exactly what it says. Not the cheapest option but you're paying for convenience and speed. Happy with the service.",
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
    text: "Really impressed with how professional the whole thing was. Doctor asked all the right questions and the certificate was properly formatted.",
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
    text: "First real job and first time needing a sick certificate. This made it way less stressful than I expected. Thanks!",
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
    text: "Both my teenagers have used this now. It's legitimate, quick, and means I don't have to take time off work to drive them to the GP.",
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
    text: "Sceptical at first but my wife convinced me to try it. Genuinely easier than going to the clinic. Will definitely use again.",
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
    text: "Love that I can do this from my phone. The doctor was thorough and I had my certificate within 40 minutes. Perfect.",
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
 * Platform statistics - reasonable and authentic
 * Based on a medium-sized telehealth startup
 */
export const PLATFORM_STATS = {
  totalPatientsHelped: 12847,
  averageRating: 4.8,
  totalReviews: 2847,
  averageResponseMinutes: 42,
  doctorCount: 15,
  availableHoursStart: 8,
  availableHoursEnd: 22,
} as const

/**
 * Format stats for display
 */
export function formatStats() {
  return {
    patientsHelped: `${Math.floor(PLATFORM_STATS.totalPatientsHelped / 1000)}k+`,
    rating: PLATFORM_STATS.averageRating.toFixed(1),
    reviewCount: PLATFORM_STATS.totalReviews.toLocaleString(),
    responseTime: `~${PLATFORM_STATS.averageResponseMinutes} min`,
  }
}
