/**
 * Programmatic SEO Page Template
 * Renders condition, certificate, benefit, and resource pages
 */

'use client'

import Link from 'next/link'
import { Navbar } from '@/components/shared/navbar'
import { Footer } from '@/components/shared/footer'
import { Button, Accordion, AccordionItem } from '@/components/uix'
import {
  AlertCircle,
  Check,
  ChevronRight,
  FileCheck,
  Stethoscope,
} from 'lucide-react'
import type { ConditionPage, CertificatePage, BenefitPage, ResourcePage } from '@/lib/seo/pages'

type PageUnion = ConditionPage | CertificatePage | BenefitPage | ResourcePage

interface SEOPageProps {
  page: PageUnion
  pageType: 'condition' | 'certificate' | 'benefit' | 'resource'
}

export function SEOPageTemplate({ page, pageType }: SEOPageProps) {
  const isConditionPage = (p: PageUnion): p is ConditionPage => 'symptoms' in p
  const isCertificatePage = (p: PageUnion): p is CertificatePage => 'useCases' in p && 'howToUse' in p
  const isBenefitPage = (p: PageUnion): p is BenefitPage => 'sections' in p && pageType === 'benefit'
  const isResourcePage = (p: PageUnion): p is ResourcePage => 'sections' in p && pageType === 'resource'

  const condPage = isConditionPage(page) ? page : null
  const certPage = isCertificatePage(page) ? page : null
  const benefitPage = isBenefitPage(page) ? page : null
  const resourcePage = isResourcePage(page) ? page : null

  const heroText = 'heroText' in page ? page.heroText : ''

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant="marketing" />

      <main className="flex-1 bg-background">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800" />
          <div className="absolute top-20 right-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />

          <div className="container mx-auto px-4 relative">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-block px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 rounded-full text-sm font-medium text-indigo-700 dark:text-indigo-300 mb-6">
                {pageType === 'condition' && '🏥 Health Condition'}
                {pageType === 'certificate' && '📄 Certificate Type'}
                {pageType === 'benefit' && '✨ Why Choose Us'}
                {pageType === 'resource' && '📚 Information & FAQ'}
              </div>

              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6 leading-tight">
                {page.h1}
              </h1>

              <p className="text-lg text-slate-600 dark:text-slate-300 mb-8 max-w-2xl mx-auto">
                {heroText}
              </p>

              {pageType !== 'resource' && (
                <Button asChild size="lg" className="rounded-full shadow-lg">
                  <Link href="/start">
                    Start online consult
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-20 bg-white dark:bg-slate-950">
          <div className="container mx-auto px-4 max-w-3xl">
            {/* Condition Page: Symptoms & Red Flags */}
            {condPage && (
              <>
                {/* Symptoms */}
                <div className="mb-16">
                  <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">
                    Common symptoms
                  </h2>
                  <ul className="space-y-3">
                    {condPage.symptoms.map((symptom, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-700 dark:text-slate-300">{symptom}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* When to See GP (Red Flags) */}
                <div className="mb-16 p-6 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex items-start gap-3 mb-4">
                    <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0 dark:text-red-400" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      When to see a doctor in person
                    </h3>
                  </div>
                  <ul className="space-y-2">
                    {condPage.whenToSeeGP.map((flag, idx) => (
                      <li key={idx} className="text-slate-700 dark:text-slate-300 flex items-start gap-2">
                        <span className="text-red-600 dark:text-red-400 font-bold mt-0.5">•</span>
                        <span>{flag}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* When We Can Help */}
                <div className="mb-16">
                  <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">
                    When we can help
                  </h2>
                  <ul className="space-y-3">
                    {condPage.whenWeCanHelp.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <Stethoscope className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5 dark:text-indigo-400" />
                        <span className="text-slate-700 dark:text-slate-300">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* How We Help */}
                <div className="mb-16">
                  <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">
                    How it works
                  </h2>
                  <div className="space-y-4">
                    {condPage.howWeHelp.map((step, idx) => (
                      <div key={idx} className="flex gap-4">
                        <div className="flex-shrink-0">
                          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                            <span className="text-indigo-700 dark:text-indigo-300 font-bold">
                              {idx + 1}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-slate-700 dark:text-slate-300">{step}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Disclaimers */}
                <div className="mb-16 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-primary dark:border-primary">
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
                    Important disclaimers
                  </h3>
                  <ul className="space-y-2">
                    {condPage.disclaimers.map((disclaimer, idx) => (
                      <li key={idx} className="text-sm text-slate-700 dark:text-slate-300">
                        {disclaimer}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {/* Certificate Page */}
            {certPage && (
              <>
                {/* Use Cases */}
                <div className="mb-16">
                  <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">
                    Use cases
                  </h2>
                  <ul className="space-y-3">
                    {certPage.useCases.map((useCase, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-700 dark:text-slate-300">{useCase}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* How to Use */}
                <div className="mb-16">
                  <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">
                    How to use your certificate
                  </h2>
                  <div className="space-y-4">
                    {certPage.howToUse.map((step, idx) => (
                      <div key={idx} className="flex gap-4">
                        <div className="flex-shrink-0">
                          <FileCheck className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <p className="text-slate-700 dark:text-slate-300">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Backdating */}
                <div className="mb-16 p-6 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                    📅 Can we backdate certificates?
                  </h3>
                  <p className="text-slate-700 dark:text-slate-300 text-sm">
                    {certPage.backdatingInfo}
                  </p>
                </div>

                {/* Disclaimers */}
                <div className="mb-16 p-6 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
                    Important disclaimers
                  </h3>
                  <ul className="space-y-2">
                    {certPage.disclaimers.map((disclaimer, idx) => (
                      <li key={idx} className="text-sm text-slate-700 dark:text-slate-300">
                        {disclaimer}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {/* Benefit Page */}
            {benefitPage && (
              <>
                {benefitPage.sections.map((section, idx) => (
                  <div key={idx} className="mb-12">
                    <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">
                      {section.title}
                    </h2>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      {section.content}
                    </p>
                  </div>
                ))}
              </>
            )}

            {/* Resource Page */}
            {resourcePage && (
              <>
                {resourcePage.sections.map((section, idx) => (
                  <div key={idx} className="mb-12">
                    <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">
                      {section.title}
                    </h2>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      {section.content}
                    </p>
                  </div>
                ))}
              </>
            )}

            {/* CTA Section */}
            <div className="mt-16 p-8 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
              <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">
                Ready to get started?
              </h2>
              <p className="text-slate-700 dark:text-slate-300 mb-6">
                Complete your request in under 2 minutes. Only pay if we can help.
              </p>
              <Button asChild size="lg" className="rounded-full">
                <Link href="/start">
                  Start online consult
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 bg-slate-50 dark:bg-slate-900">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-3xl font-bold mb-12 text-center text-slate-900 dark:text-white">
              Frequently asked questions
            </h2>

            <Accordion variant="splitted" defaultExpandedKeys={["0"]}>
              {page.faqs.map((faq, idx) => (
                <AccordionItem
                  key={idx.toString()}
                  aria-label={faq.q}
                  title={faq.q}
                >
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {faq.a}
                  </p>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
