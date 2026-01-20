import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { TiltCard } from "@/components/shared/tilt-card"
import { User, Clock, FileText, Shield, BadgeCheck, ArrowRight } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import type { Metadata } from "next"
import { getArticlesByCategory } from "@/lib/blog/articles"
import { BreadcrumbSchema } from "@/components/seo/healthcare-schema"

export const metadata: Metadata = {
  title: "Health Guides | Medical Certificates & Telehealth | InstantMed",
  description:
    "Doctor-reviewed health guides for Australians. Learn about medical certificates, telehealth, prescriptions, and common health conditions from AHPRA-registered doctors.",
  openGraph: {
    title: "InstantMed Health Guides",
    description: "Doctor-reviewed health guides from Australian medical professionals.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/blog",
  },
}

// Legacy posts for backward compatibility
const legacyPosts = [
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
      "Understanding telehealth prescriptions in Australia. When online scripts are appropriate, what medications can't be prescribed online, and how e-scripts work.",
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
      "Telehealth is convenient, but it's not right for everything. Learn when online healthcare is perfect and when you should book an in-person appointment instead.",
    author: "Dr. Sarah Chen",
    date: "2024-01-05",
    readTime: "6 min",
    category: "Telehealth",
    image: "/doctor-video-call-telehealth.jpg",
  },
]

export default function BlogPage() {
  // Get featured articles by category (inside component for SSG compatibility)
  const medCertArticles = getArticlesByCategory('medical-certificates')
  const conditionArticles = getArticlesByCategory('conditions')
  const telehealthArticles = getArticlesByCategory('telehealth')
  const medicationArticles = getArticlesByCategory('medications')
  const workplaceArticles = getArticlesByCategory('workplace-health')

  return (
    <>
      <BreadcrumbSchema 
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Health Guides", url: "https://instantmed.com.au/blog" }
        ]} 
      />
      
      <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-24">
          {/* Hero */}
          <section className="px-4 py-12 text-center">
            <div className="mx-auto max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <BadgeCheck className="w-4 h-4" />
                Doctor-Reviewed Content
              </div>
              <h1 className="text-3xl font-bold sm:text-4xl mb-4" style={{ fontFamily: "var(--font-display)" }}>
                Health Guides
              </h1>
              <p className="text-muted-foreground max-w-xl mx-auto text-lg">
                Practical health information reviewed by AHPRA-registered doctors. 
                Clear, accurate guidance for Australians.
              </p>
              
              {/* Trust signals */}
              <div className="flex flex-wrap justify-center gap-4 mt-8">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span>AHPRA Verified Authors</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Regularly Updated</span>
                </div>
              </div>
            </div>
          </section>

          {/* Medical Certificates Section - Featured */}
          {medCertArticles.length > 0 && (
            <section className="px-4 py-12 bg-white dark:bg-slate-900">
              <div className="mx-auto max-w-6xl">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Medical Certificates</h2>
                    <p className="text-muted-foreground">
                      Everything you need to know about getting medical certificates in Australia
                    </p>
                  </div>
                </div>
                
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {medCertArticles.slice(0, 8).map((article) => (
                    <Link key={article.slug} href={`/blog/${article.slug}`} className="group">
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl overflow-hidden h-full border border-slate-200 dark:border-slate-700 hover:border-primary/50 transition-all hover:shadow-lg">
                        <div className="relative h-36 bg-slate-200 dark:bg-slate-700">
                          <Image 
                            src={article.heroImage} 
                            alt={article.heroImageAlt} 
                            fill 
                            className="object-cover" 
                          />
                          <div className="absolute top-3 left-3">
                            <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 text-primary">
                              {article.readingTime} min read
                            </span>
                          </div>
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-2 mb-2">
                            {article.title}
                          </h3>
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                            {article.excerpt}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <BadgeCheck className="w-3 h-3 text-emerald-600" />
                            <span>{article.author.name}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Common Conditions Section */}
          {conditionArticles.length > 0 && (
            <section className="px-4 py-12">
              <div className="mx-auto max-w-6xl">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Common Health Conditions</h2>
                    <p className="text-muted-foreground">
                      Understanding symptoms, treatments, and when to seek help
                    </p>
                  </div>
                </div>
                
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {conditionArticles.slice(0, 8).map((article) => (
                    <Link key={article.slug} href={`/blog/${article.slug}`} className="group">
                      <div className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden h-full border border-slate-200 dark:border-slate-700 hover:border-primary/50 transition-all hover:shadow-lg">
                        <div className="relative h-36 bg-slate-200 dark:bg-slate-700">
                          <Image 
                            src={article.heroImage} 
                            alt={article.heroImageAlt} 
                            fill 
                            className="object-cover" 
                          />
                          <div className="absolute top-3 left-3">
                            <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 text-primary">
                              {article.readingTime} min read
                            </span>
                          </div>
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-2 mb-2">
                            {article.title}
                          </h3>
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                            {article.excerpt}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <BadgeCheck className="w-3 h-3 text-emerald-600" />
                            <span>{article.author.name}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Telehealth Section */}
          {telehealthArticles.length > 0 && (
            <section className="px-4 py-12 bg-white dark:bg-slate-900">
              <div className="mx-auto max-w-6xl">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Telehealth Guides</h2>
                    <p className="text-muted-foreground">
                      Understanding online healthcare and how to make the most of it
                    </p>
                  </div>
                </div>
                
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {telehealthArticles.slice(0, 6).map((article) => (
                    <Link key={article.slug} href={`/blog/${article.slug}`} className="group">
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl overflow-hidden h-full border border-slate-200 dark:border-slate-700 hover:border-primary/50 transition-all hover:shadow-lg">
                        <div className="relative h-36 bg-slate-200 dark:bg-slate-700">
                          <Image 
                            src={article.heroImage} 
                            alt={article.heroImageAlt} 
                            fill 
                            className="object-cover" 
                          />
                          <div className="absolute top-3 left-3">
                            <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 text-primary">
                              {article.readingTime} min read
                            </span>
                          </div>
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-2 mb-2">
                            {article.title}
                          </h3>
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                            {article.excerpt}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <BadgeCheck className="w-3 h-3 text-emerald-600" />
                            <span>{article.author.name}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Medications Section */}
          {medicationArticles.length > 0 && (
            <section className="px-4 py-12">
              <div className="mx-auto max-w-6xl">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Medications & Prescriptions</h2>
                    <p className="text-muted-foreground">
                      Understanding your medications, prescriptions, and how to use them safely
                    </p>
                  </div>
                </div>
                
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {medicationArticles.slice(0, 6).map((article) => (
                    <Link key={article.slug} href={`/blog/${article.slug}`} className="group">
                      <div className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden h-full border border-slate-200 dark:border-slate-700 hover:border-primary/50 transition-all hover:shadow-lg">
                        <div className="relative h-36 bg-slate-200 dark:bg-slate-700">
                          <Image 
                            src={article.heroImage} 
                            alt={article.heroImageAlt} 
                            fill 
                            className="object-cover" 
                          />
                          <div className="absolute top-3 left-3">
                            <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 text-primary">
                              {article.readingTime} min read
                            </span>
                          </div>
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-2 mb-2">
                            {article.title}
                          </h3>
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                            {article.excerpt}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <BadgeCheck className="w-3 h-3 text-emerald-600" />
                            <span>{article.author.name}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Workplace & Study Section */}
          {workplaceArticles.length > 0 && (
            <section className="px-4 py-12 bg-white dark:bg-slate-900">
              <div className="mx-auto max-w-6xl">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Workplace & Study Health</h2>
                    <p className="text-muted-foreground">
                      Managing health in the workplace and at university
                    </p>
                  </div>
                </div>
                
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {workplaceArticles.slice(0, 4).map((article) => (
                    <Link key={article.slug} href={`/blog/${article.slug}`} className="group">
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl overflow-hidden h-full border border-slate-200 dark:border-slate-700 hover:border-primary/50 transition-all hover:shadow-lg">
                        <div className="relative h-36 bg-slate-200 dark:bg-slate-700">
                          <Image 
                            src={article.heroImage} 
                            alt={article.heroImageAlt} 
                            fill 
                            className="object-cover" 
                          />
                          <div className="absolute top-3 left-3">
                            <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 text-primary">
                              {article.readingTime} min read
                            </span>
                          </div>
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-2 mb-2">
                            {article.title}
                          </h3>
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                            {article.excerpt}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <BadgeCheck className="w-3 h-3 text-emerald-600" />
                            <span>{article.author.name}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Legacy Posts Section */}
          <section className="px-4 py-12">
            <div className="mx-auto max-w-6xl">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold mb-2">More Health Articles</h2>
                  <p className="text-muted-foreground">
                    Additional guides on telehealth and prescriptions
                  </p>
                </div>
              </div>
              
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {legacyPosts.map((post) => (
                  <Link key={post.slug} href={`/blog/${post.slug}`} className="group">
                    <TiltCard className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden h-full border border-slate-200 dark:border-slate-700 hover:border-primary/50 transition-all">
                      <div className="relative h-40 bg-slate-200 dark:bg-slate-700">
                        <Image src={post.image || "/placeholder.svg"} alt={post.title} fill className="object-cover" />
                      </div>
                      <div className="p-5">
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          {post.category}
                        </span>
                        <h3 className="font-semibold mt-2 mb-2 group-hover:text-primary transition-colors line-clamp-2">
                          {post.title}
                        </h3>
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

          {/* CTA Section */}
          <section className="px-4 py-16 bg-white dark:bg-slate-900">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold mb-4">Need a Medical Certificate?</h2>
              <p className="text-muted-foreground mb-8">
                Get assessed by an AHPRA-registered doctor. Most requests reviewed within an hour.
              </p>
              <Link 
                href="/start"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors"
              >
                Get started
                <ArrowRight className="w-4 h-4" />
              </Link>
              <p className="text-sm text-muted-foreground mt-4">
                From $19.95 · No Medicare card required
              </p>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  )
}
