import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { FileText, Shield, BadgeCheck, ArrowRight } from "lucide-react"
import Link from "next/link"
import type { Metadata } from "next"
import { allArticles } from "@/lib/blog/articles"
import { BreadcrumbSchema } from "@/components/seo/healthcare-schema"
import { ArticlesPage } from "@/components/blog/articles-page"

export const metadata: Metadata = {
  title: "Health Guides | Medical Certificates & Telehealth | InstantMed",
  description:
    "Doctor-reviewed health guides for Australians. Learn about medical certificates, telehealth, prescriptions, and common health conditions from AHPRA-registered doctors.",
  openGraph: {
    title: "InstantMed Health Guides",
    description: "Doctor-reviewed health guides from Australian medical professionals.",
    url: "https://instantmed.com.au/blog",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "InstantMed Health Guides",
    description: "Doctor-reviewed health guides from Australian medical professionals.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/blog",
  },
}

export default function BlogPage() {
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
              <h1 className="text-2xl font-bold sm:text-3xl mb-4" style={{ fontFamily: "var(--font-display)" }}>
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

          {/* Articles with Search, Filter, Pagination */}
          <section className="px-4 py-8">
            <div className="mx-auto max-w-6xl">
              <ArticlesPage articles={allArticles} />
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
                href="/request"
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
