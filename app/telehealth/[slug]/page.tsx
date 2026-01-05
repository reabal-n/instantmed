import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getIntentPageBySlug, getAllIntentSlugs } from '@/lib/seo/intents'
import { getCanonicalUrl, getRobotsConfig } from '@/lib/seo/registry'
import { generateRelatedLinks } from '@/lib/seo/linking'
import { Navbar } from '@/components/shared/navbar'
import { Footer } from '@/components/shared/footer'
import { Button } from '@/components/ui/button'
import { ArrowRight, CheckCircle2, AlertTriangle, Clock, Zap } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ slug: string }>
}

// Prevent static generation to avoid Clerk publishableKey build errors

export const dynamic = "force-dynamic"
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const page = getIntentPageBySlug(slug)
  
  if (!page) return {}
  
  const canonical = getCanonicalUrl(page)
  
  return {
    title: page.title,
    description: page.description,
    keywords: page.metadata.keywords,
    alternates: { canonical },
  }
}

export async function generateStaticParams() {
  return getAllIntentSlugs().map((slug) => ({ slug }))
}

export default async function IntentPage({ params }: PageProps) {
  const { slug } = await params
  const page = getIntentPageBySlug(slug)
  
  if (!page) notFound()
  
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar variant="marketing" />
      <main className="flex-1 pt-20">
        <section className="px-4 py-12">
          <div className="mx-auto max-w-4xl">
            <h1 className="text-4xl font-bold mb-4">{page.h1}</h1>
            <p className="text-lg text-muted-foreground mb-8">{page.content.intro}</p>
            <Link href={page.conversion.ctaUrl}>
              <Button size="lg" className="bg-[#2563EB] hover:bg-[#2563EB]/90 text-[#0A0F1C]">
                {page.conversion.primaryCTA}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
