import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { TiltCard } from "@/components/shared/tilt-card"
import { User, Clock } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import type { Metadata } from "next"

// Prevent static generation to avoid Clerk publishableKey build errors

export const dynamic = "force-dynamic"
export const metadata: Metadata = {
  title: "Health Blog | Telehealth Tips & Guides | Lumen Health",
  description:
    "Expert health articles from Australian doctors. Learn about telehealth, medical certificates, prescriptions, and when to see a GP in person.",
  openGraph: {
    title: "Lumen Health Health Blog",
    description: "Health tips and telehealth guides from Australian doctors.",
  },
}

const posts = [
  {
    slug: "how-to-get-medical-certificate-online-australia",
    title: "How to Get a Medical Certificate Online in Australia",
    excerpt:
      "A step-by-step guide to getting a valid medical certificate without leaving your bed. What employers accept, what to expect, and when you might need to see a GP in person instead.",
    author: "Dr. Sarah Chen",
    date: "2024-01-15",
    readTime: "5 min",
    category: "Medical Certificates",
    image: "/woman-sick-at-home-laptop.jpg",
  },
  {
    slug: "can-you-get-prescription-without-seeing-doctor",
    title: "Can You Get a Prescription Without Seeing a Doctor?",
    excerpt:
      "Understanding telehealth prescriptions in Australia. When online scripts are appropriate, what medications can&apos;t be prescribed online, and how e-scripts work.",
    author: "Dr. James Liu",
    date: "2024-01-10",
    readTime: "7 min",
    category: "Prescriptions",
    image: "/prescription-medication-pharmacy.jpg",
  },
  {
    slug: "telehealth-vs-gp-when-to-use-each",
    title: "Telehealth vs GP: When to Use Each",
    excerpt:
      "Telehealth is convenient, but it&apos;s not right for everything. Learn when online healthcare is perfect and when you should book an in-person appointment instead.",
    author: "Dr. Sarah Chen",
    date: "2024-01-05",
    readTime: "6 min",
    category: "Telehealth",
    image: "/doctor-video-call-telehealth.jpg",
  },
]

export default function BlogPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant="marketing" />

      <main className="flex-1 pt-24">
        {/* Hero */}
        <section className="px-4 py-12 text-center">
          <h1 className="text-3xl font-bold sm:text-4xl mb-4" style={{ fontFamily: "var(--font-display)" }}>
            Health Blog
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Expert health articles and telehealth guides from Australian doctors.
          </p>
        </section>

        {/* Posts Grid */}
        <section className="px-4 py-12">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <Link key={post.slug} href={`/blog/${post.slug}`} className="group">
                  <TiltCard className="glass-card rounded-xl overflow-hidden h-full hover-lift">
                    <div className="relative h-40 bg-muted">
                      <Image src={post.image || "/placeholder.svg"} alt={post.title} fill className="object-cover" />
                    </div>
                    <div className="p-5">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#2563EB]/10 text-[#2563EB]">
                        {post.category}
                      </span>
                      <h2 className="font-semibold mt-2 mb-2 group-hover:text-[#2563EB] transition-colors line-clamp-2">
                        {post.title}
                      </h2>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{post.excerpt}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{post.author}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{post.readTime}</span>
                        </div>
                      </div>
                    </div>
                  </TiltCard>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
