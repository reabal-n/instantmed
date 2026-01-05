import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { Button } from "@/components/ui/button"
import { ArrowLeft, User, Clock, Calendar } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

// Blog post content
const posts: Record<
  string,
  {
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
> = {
  "how-to-get-medical-certificate-online-australia": {
    title: "How to Get a Medical Certificate Online in Australia",
    excerpt:
      "A step-by-step guide to getting a valid medical certificate without leaving your bed. What employers accept, what to expect, and when you might need to see a GP in person instead.",
    content: [
      "Getting sick is inconvenient enough without having to drag yourself to a waiting room. The good news? In Australia, you can now get a legitimate medical certificate online from an AHPRA-registered doctor.",
      "## How Online Medical Certificates Work",
      "Online telehealth services like InstantMed allow you to complete a health questionnaire from your phone or computer. A real doctor reviews your information and, if appropriate, issues a medical certificate.",
      "The process typically takes under an hour during business hours. You'll receive a PDF certificate that&apos;s legally valid and accepted by Australian employers.",
      "## What You'll Need",
      "- A valid Medicare card\n- Your symptoms and how long you&apos;ve been unwell\n- The dates you need covered\n- Your employer's name (optional)",
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
    image: "/woman-sick-at-home-laptop.jpg",
    relatedLinks: [
      { href: "/medical-certificate/request", text: "Get a Medical Certificate" },
      { href: "/faq", text: "FAQs" },
    ],
  },
  "can-you-get-prescription-without-seeing-doctor": {
    title: "Can You Get a Prescription Without Seeing a Doctor?",
    excerpt:
      "Understanding telehealth prescriptions in Australia. When online scripts are appropriate, what medications can&apos;t be prescribed online, and how e-scripts work.",
    content: [
      "The short answer is no — you always need a doctor to prescribe medication in Australia. But thanks to telehealth, you don&apos;t always need to see them face-to-face.",
      "## How Telehealth Prescriptions Work",
      "Services like InstantMed connect you with AHPRA-registered doctors who review your medical history and current needs. If a prescription is appropriate, they can issue an electronic prescription (e-script) that&apos;s sent directly to your phone.",
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
      { href: "/prescriptions/request", text: "Request a Prescription" },
      { href: "/faq", text: "FAQs" },
    ],
  },
  "telehealth-vs-gp-when-to-use-each": {
    title: "Telehealth vs GP: When to Use Each",
    excerpt:
      "Telehealth is convenient, but it&apos;s not right for everything. Learn when online healthcare is perfect and when you should book an in-person appointment instead.",
    content: [
      "Telehealth has transformed how Australians access healthcare. But knowing when to use it — and when to see a GP in person — can be confusing.",
      "## When Telehealth Works Best",
      "Online consultations are ideal for:\n- Medical certificates for common illnesses\n- Repeat prescriptions for stable conditions\n- Referrals to specialists you&apos;ve already discussed\n- Follow-up appointments\n- Mental health check-ins\n- Minor skin conditions (with photos)",
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
    image: "/doctor-video-call-telehealth.jpg",
    relatedLinks: [
      { href: "/how-it-works", text: "How InstantMed Works" },
      { href: "/faq", text: "FAQs" },
    ],
  },
}

interface PageProps {
  params: Promise<{ slug: string }>
}

// Prevent static generation to avoid Clerk publishableKey build errors

export const dynamic = "force-dynamic"
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const post = posts[slug]
  if (!post) return {}

  return {
    title: `${post.title} | InstantMed Blog`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
    },
  }
}

export async function generateStaticParams() {
  return Object.keys(posts).map((slug) => ({ slug }))
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params
  const post = posts[slug]

  if (!post) {
    notFound()
  }

  // Article schema
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    author: {
      "@type": "Person",
      name: post.author,
    },
    datePublished: post.date,
    publisher: {
      "@type": "Organization",
      name: "InstantMed",
    },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />

      <div className="flex min-h-screen flex-col bg-hero">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-24">
          {/* Hero */}
          <article className="px-4 py-12">
            <div className="mx-auto max-w-2xl">
              <Link
                href="/blog"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Blog
              </Link>

              <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-[#00E2B5]/10 text-[#00E2B5] mb-4">
                {post.category}
              </span>

              <h1 className="text-2xl font-bold sm:text-3xl mb-4" style={{ fontFamily: "var(--font-display)" }}>
                {post.title}
              </h1>

              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8">
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>{post.author}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(post.date).toLocaleDateString("en-AU", { dateStyle: "medium" })}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{post.readTime} read</span>
                </div>
              </div>

              <div className="relative h-64 rounded-xl overflow-hidden mb-8">
                <Image src={post.image || "/placeholder.svg"} alt={post.title} fill className="object-cover" />
              </div>

              {/* Content */}
              <div className="prose prose-sm max-w-none">
                {post.content.map((paragraph, index) => {
                  if (paragraph.startsWith("## ")) {
                    return (
                      <h2 key={index} className="text-lg font-semibold mt-6 mb-3">
                        {paragraph.replace("## ", "")}
                      </h2>
                    )
                  }
                  if (paragraph.includes("\n-")) {
                    const items = paragraph.split("\n").filter((item) => item.startsWith("-"))
                    return (
                      <ul key={index} className="list-disc pl-5 space-y-1 text-muted-foreground">
                        {items.map((item, i) => (
                          <li key={i}>{item.replace("- ", "")}</li>
                        ))}
                      </ul>
                    )
                  }
                  return (
                    <p key={index} className="text-muted-foreground leading-relaxed mb-4">
                      {paragraph}
                    </p>
                  )
                })}
              </div>

              {/* Author bio */}
              <div className="mt-8 pt-8 border-t">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold">{post.author}</p>
                    <p className="text-sm text-muted-foreground">{post.authorBio}</p>
                  </div>
                </div>
              </div>

              {/* Related links */}
              <div className="mt-8 pt-8 border-t">
                <h3 className="font-semibold mb-4">Related</h3>
                <div className="flex flex-wrap gap-3">
                  {post.relatedLinks.map((link) => (
                    <Link key={link.href} href={link.href}>
                      <Button variant="outline" size="sm">
                        {link.text}
                      </Button>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </article>
        </main>

        <Footer />
      </div>
    </>
  )
}
