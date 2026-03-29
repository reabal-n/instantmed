export interface LegacyPost {
  title: string
  excerpt: string
  content: string[]
  author: string
  authorBio: string
  date: string
  readTime: string
  category: string
  image: string
  relatedLinks: { href: string; text: string }[]
}

export const legacyPosts: Record<string, LegacyPost> = {
  "how-to-get-medical-certificate-online-australia": {
    title: "How to Get a Medical Certificate Online in Australia",
    excerpt:
      "A step-by-step guide to getting a valid medical certificate without leaving your bed. What employers accept, what to expect, and when you might need to see a GP in person instead.",
    content: [
      "Getting sick is inconvenient enough without having to drag yourself to a waiting room. The good news? In Australia, you can now get a legitimate medical certificate online from an AHPRA-registered doctor.",
      "## How Online Medical Certificates Work",
      "Online telehealth services like InstantMed allow you to complete a health questionnaire from your phone or computer. A real doctor reviews your information and, if appropriate, issues a medical certificate.",
      "The process typically takes under an hour during business hours. You'll receive a PDF certificate that's legally valid and accepted by Australian employers.",
      "## What You'll Need",
      "- A valid Medicare card\n- Your symptoms and how long you've been unwell\n- The dates you need covered\n- Your employer's name (optional)",
      "## When to See a GP In Person Instead",
      "Online certificates work well for common illnesses like colds, flu, gastro, and migraines. However, you should see a doctor in person if you have:\n- Chest pain or difficulty breathing\n- Severe symptoms lasting more than a few days\n- A condition that needs physical examination\n- Symptoms that concern you",
      "## Are Online Medical Certificates Legitimate?",
      "Yes. When issued by an AHPRA-registered doctor, online medical certificates are legally valid under Australian law. Fair Work Australia recognises telehealth consultations as legitimate medical appointments.",
    ],
    author: "Dr. Sarah Chen",
    authorBio: "GP with 12 years experience. AHPRA registered.",
    date: "2024-01-15",
    readTime: "5 min",
    category: "Medical Certificates",
    image: "/images/consult-1.jpeg",
    relatedLinks: [
      { href: "/medical-certificate/request", text: "Get a Medical Certificate" },
      { href: "/locations", text: "Find your city" },
      { href: "/faq", text: "FAQs" },
    ],
  },
  "can-you-get-prescription-without-seeing-doctor": {
    title: "Can You Get a Prescription Without Seeing a Doctor?",
    excerpt:
      "Understanding telehealth prescriptions in Australia. When online scripts are appropriate, what medications can't be prescribed online, and how e-scripts work.",
    content: [
      "The short answer is no — you always need a doctor to prescribe medication in Australia. But thanks to telehealth, you don't always need to see them face-to-face.",
      "## How Telehealth Prescriptions Work",
      "Services like InstantMed connect you with AHPRA-registered doctors who review your medical history and current needs. If a prescription is appropriate, they can issue an electronic prescription (e-script) that's sent directly to your phone.",
      "## What Can Be Prescribed Online?",
      "Many common medications can be prescribed via telehealth, including:\n- Blood pressure medication (repeats)\n- Contraceptive pills\n- Cholesterol medication\n- Some antibiotics (for UTIs, skin infections)\n- Asthma preventers",
      "## What Can't Be Prescribed Online?",
      "Some medications require in-person assessment:\n- Schedule 8 drugs (opioids, stimulants)\n- Benzodiazepines\n- Some psychiatric medications\n- Medications requiring physical examination first",
      "## How E-Scripts Work",
      "When a doctor prescribes medication online, you receive an SMS with a QR code. Take this to any pharmacy in Australia, and they'll dispense your medication. It's that simple.",
    ],
    author: "Dr. James Liu",
    authorBio: "GP with special interest in digital health. AHPRA registered.",
    date: "2024-01-10",
    readTime: "7 min",
    category: "Prescriptions",
    image: "/prescription-medication-pharmacy.jpg",
    relatedLinks: [
      { href: "/request?service=prescription", text: "Request a Prescription" },
      { href: "/locations", text: "Available in 25+ cities" },
      { href: "/faq", text: "FAQs" },
    ],
  },
  "telehealth-vs-gp-when-to-use-each": {
    title: "Telehealth vs GP: When to Use Each",
    excerpt:
      "Telehealth is convenient, but it's not right for everything. Learn when online healthcare is perfect and when you should book an in-person appointment instead.",
    content: [
      "Telehealth has transformed how Australians access healthcare. But knowing when to use it — and when to see a GP in person — can be confusing.",
      "## When Telehealth Works Best",
      "Online consultations are ideal for:\n- Medical certificates for common illnesses\n- Repeat prescriptions for stable conditions\n- Referrals to specialists you've already discussed\n- Follow-up appointments\n- Mental health check-ins\n- Minor skin conditions (with photos)",
      "## When to See a GP In Person",
      "Book a face-to-face appointment when you need:\n- Physical examination (lumps, breathing sounds, etc.)\n- Vaccinations or injections\n- Procedures (skin checks, wound care)\n- New or complex symptoms\n- Children under 2 years old",
      "## The Hybrid Approach",
      "Many patients use both. Telehealth for convenience when appropriate, and in-person visits when needed. Your regular GP can still access telehealth consultation notes, so care remains coordinated.",
      "## Making the Right Choice",
      "Ask yourself: Does this require a doctor to touch me or look at something in person? If not, telehealth might save you time while still providing quality care.",
    ],
    author: "Dr. Sarah Chen",
    authorBio: "GP with 12 years experience. AHPRA registered.",
    date: "2024-01-05",
    readTime: "6 min",
    category: "Telehealth",
    image: "/images/consult-2.jpeg",
    relatedLinks: [
      { href: "/how-it-works", text: "How InstantMed Works" },
      { href: "/locations", text: "Serving 25+ Australian cities" },
      { href: "/faq", text: "FAQs" },
    ],
  },
}
