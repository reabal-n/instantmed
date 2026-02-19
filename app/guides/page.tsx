import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { Button } from "@/components/ui/button"
import { ArrowRight, Clock, BookOpen } from "lucide-react"
import Link from "next/link"
import type { Metadata } from "next"
import { BreadcrumbSchema } from "@/components/seo/healthcare-schema"

export const metadata: Metadata = {
  title: "Healthcare Guides | How-To Articles",
  description: "Practical guides on getting medical certificates, using telehealth in Australia, and navigating the healthcare system. Written and reviewed by healthcare professionals.",
  openGraph: {
    title: "Healthcare Guides | InstantMed",
    description: "Practical guides on telehealth and healthcare in Australia.",
  },
}

const guides = [
  {
    slug: "how-to-get-medical-certificate-for-work",
    title: "How to Get a Medical Certificate for Work",
    description: "A complete guide to getting a valid medical certificate for work in Australia. Learn your options, what employers accept, and the fastest ways to get one.",
    readTime: "6 min read",
    category: "Medical Certificates"
  },
  {
    slug: "how-to-get-sick-note-for-uni",
    title: "How to Get a Sick Note for University",
    description: "Need a medical certificate for a missed exam, assignment extension, or university absence? Here's how to get one quickly.",
    readTime: "5 min read",
    category: "Medical Certificates"
  },
  {
    slug: "telehealth-guide-australia",
    title: "Complete Guide to Telehealth in Australia",
    description: "Everything you need to know about telehealth — what it is, how it works, what can be treated, and how to choose a service.",
    readTime: "8 min read",
    category: "Telehealth"
  },
]

export default function GuidesIndexPage() {
  return (
    <>
      <BreadcrumbSchema 
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Guides", url: "https://instantmed.com.au/guides" }
        ]} 
      />

      <div className="flex min-h-screen flex-col bg-white/50 dark:bg-black">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-20">
          {/* Hero */}
          <section className="px-4 py-16 border-b border-slate-200 dark:border-slate-800">
            <div className="mx-auto max-w-4xl text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                <BookOpen className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Healthcare Guides</span>
              </div>
              <h1 className="text-4xl font-bold text-foreground mb-4">
                Practical Healthcare Guides
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Clear, practical information on getting medical certificates, using telehealth, 
                and navigating Australia&apos;s healthcare system.
              </p>
            </div>
          </section>

          {/* Guides List */}
          <section className="px-4 py-16">
            <div className="mx-auto max-w-3xl">
              <div className="space-y-6">
                {guides.map((guide) => (
                  <Link
                    key={guide.slug}
                    href={`/guides/${guide.slug}`}
                    className="group block bg-white/60 dark:bg-white/5 rounded-2xl border border-white/50 dark:border-white/10 p-6 hover:border-primary/50 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <span className="text-xs font-medium px-2 py-1 bg-primary/10 text-primary rounded-full">
                          {guide.category}
                        </span>
                        <h2 className="text-xl font-semibold text-foreground mt-3 mb-2 group-hover:text-primary transition-colors">
                          {guide.title}
                        </h2>
                        <p className="text-muted-foreground mb-4">
                          {guide.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            <span>{guide.readTime}</span>
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0 mt-2" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="px-4 py-16 bg-primary/5">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Need a Medical Certificate Now?
              </h2>
              <p className="text-muted-foreground mb-8">
                Skip the reading — our doctors can help you in under an hour.
              </p>
              <Button asChild size="lg" className="rounded-full">
                <Link href="/request">
                  Get started
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  )
}
