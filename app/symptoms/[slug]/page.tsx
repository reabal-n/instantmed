import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getSymptomPageBySlug, getAllSymptomSlugs } from '@/lib/seo/symptoms'
import { getCanonicalUrl, getRobotsConfig } from '@/lib/seo/registry'
import { generateRelatedLinks } from '@/lib/seo/linking'
import { Navbar } from '@/components/shared/navbar'
import { Footer } from '@/components/shared/footer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, AlertTriangle, CheckCircle2, Info, Shield } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ slug: string }>
}

// Prevent static generation to avoid Clerk publishableKey build errors

export const dynamic = "force-dynamic"
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const page = getSymptomPageBySlug(slug)
  
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
  return getAllSymptomSlugs().map((slug) => ({ slug }))
}

export default async function SymptomPage({ params }: PageProps) {
  const { slug } = await params
  const page = getSymptomPageBySlug(slug)
  
  if (!page) notFound()
  
  const severityColors = {
    mild: 'bg-green-50 border-green-200 text-green-700',
    moderate: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    urgent: 'bg-orange-50 border-orange-200 text-orange-700',
    emergency: 'bg-red-50 border-red-200 text-red-700',
  }
  
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar variant="marketing" />
      <main className="flex-1 pt-20">
        <section className="px-4 py-12 bg-gradient-to-b from-muted/50">
          <div className="mx-auto max-w-4xl">
            <Badge className={`mb-4 ${severityColors[page.symptom.severity]}`}>
              {page.symptom.severity.toUpperCase()}
            </Badge>
            <h1 className="text-4xl font-bold mb-4">{page.h1}</h1>
            <p className="text-lg text-muted-foreground mb-8">{page.content.intro}</p>
          </div>
        </section>
        
        {page.causes.emergency.length > 0 && (
          <section className="px-4 py-6 bg-red-50 border-y border-red-200">
            <div className="mx-auto max-w-4xl">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 text-red-600 shrink-0" />
                <div>
                  <h2 className="font-bold text-red-900 mb-2">When to Call 000</h2>
                  <ul className="space-y-1">
                    {page.whenToSeekHelp.emergency.map((item, i) => (
                      <li key={i} className="text-sm text-red-800">• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>
        )}
        
        <section className="px-4 py-12">
          <div className="mx-auto max-w-4xl space-y-8">
            {page.content.uniqueBlocks.map((block) => (
              <div key={block.id} className="prose max-w-none">
                <p>{block.content}</p>
              </div>
            ))}
          </div>
        </section>
        
        <section className="px-4 py-12 bg-muted/30">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-2xl font-bold mb-6">Common Causes</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Info className="h-5 w-5 text-primary" />
                  Most Common
                </h3>
                <ul className="space-y-2">
                  {page.causes.common.map((cause, i) => (
                    <li key={i} className="text-sm">• {cause}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-3">Less Common</h3>
                <ul className="space-y-2">
                  {page.causes.lessCommon.map((cause, i) => (
                    <li key={i} className="text-sm text-muted-foreground">• {cause}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
        
        <section className="px-4 py-12">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-2xl font-bold mb-6">Self-Care Steps</h2>
            <div className="space-y-3">
              {page.selfCare.map((step, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <CheckCircle2 className="h-5 w-5 text-[#2563EB] shrink-0 mt-0.5" />
                  <span className="text-sm">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        <section className="px-4 py-12 bg-muted/30">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-2xl font-bold mb-6">When to Seek Medical Help</h2>
            <div className="space-y-4">
              <div className="p-5 rounded-xl bg-background border">
                <h3 className="font-semibold mb-3">See a GP if:</h3>
                <ul className="space-y-2">
                  {page.whenToSeekHelp.seeGPIf.map((item, i) => (
                    <li key={i} className="text-sm">• {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
        
        <section className="px-4 py-12 bg-[#2563EB]/5">
          <div className="mx-auto max-w-4xl">
            <div className="text-center mb-6">
              <Shield className="h-12 w-12 text-[#2563EB] mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-3">Online Treatment Available</h2>
              <p className="text-muted-foreground mb-6">
                Our Australian doctors can help with:
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 mb-8">
              {page.onlineTreatment.canHelpWith.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-lg bg-background">
                  <CheckCircle2 className="h-5 w-5 text-[#2563EB] shrink-0 mt-0.5" />
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>
            <div className="text-center">
              <Link href={page.onlineTreatment.ctaUrl}>
                <Button size="lg" className="bg-[#2563EB] hover:bg-[#2563EB]/90 text-[#0A0F1C]">
                  {page.onlineTreatment.ctaText}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
        
        {page.structured.faqs && page.structured.faqs.length > 0 && (
          <section className="px-4 py-12">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
              <div className="space-y-4">
                {page.structured.faqs.map((faq, i) => (
                  <div key={i} className="p-5 rounded-xl bg-muted/30 border">
                    <h3 className="font-semibold mb-2">{faq.question}</h3>
                    <p className="text-sm text-muted-foreground">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  )
}
