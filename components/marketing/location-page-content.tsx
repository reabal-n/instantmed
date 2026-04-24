"use client"

import { motion } from "framer-motion"
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  HelpCircle,
  Pill,
  Shield,
  Star,
  Stethoscope,
  TrendingUp,
} from "lucide-react"
import Link from "next/link"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { useReducedMotion } from "@/components/ui/motion"
import { SectionPill } from "@/components/ui/section-pill"
import { PRICING_DISPLAY } from "@/lib/constants"
import { stagger } from "@/lib/motion"
import { autoLinkParagraph } from "@/lib/seo/auto-linker"
import type { DeepCityContent } from "@/lib/seo/data/deep-city-content"

interface LocationPageContentProps {
  city: string
  cityData: {
    name: string
    state: string
    population: string
    localTestimonial?: { name: string; quote: string }
  }
  cityContent?: string
  deepContent?: DeepCityContent
  faqs: Array<{ q: string; a: string }>
  otherCities: Array<{ name: string; slug: string }>
}

const SERVICES = [
  {
    name: "Medical Certificates",
    desc: "Same-day work and study absence notes",
    href: "/medical-certificate",
    Icon: FileText,
    price: PRICING_DISPLAY.FROM_MED_CERT,
  },
  {
    name: "Prescriptions",
    desc: "eScript sent direct to your phone",
    href: "/prescriptions",
    Icon: Pill,
    price: PRICING_DISPLAY.FROM_SCRIPT,
  },
  {
    name: "GP Consultation",
    desc: "General health concerns, no appointment",
    href: "/consult",
    Icon: Stethoscope,
    price: PRICING_DISPLAY.FROM_CONSULT,
  },
]

const RELATED = [
  {
    title: "How to Get a Med Cert Online",
    desc: "Step-by-step guide without visiting a clinic",
    href: "/blog/how-to-get-medical-certificate-online-australia",
  },
  {
    title: "Telehealth vs In-Person GP",
    desc: "When telehealth is the right choice for your needs",
    href: "/blog/telehealth-vs-gp-when-to-use-each",
  },
]

const FADE_UP = { duration: 0.4, ease: [0.23, 1, 0.32, 1] as const }
const VIEWPORT = { once: true, margin: "-50px" as const }

const ITEM_VARIANTS = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: FADE_UP },
}

export function LocationPageContent({
  cityData,
  cityContent,
  deepContent,
  faqs,
  otherCities,
}: LocationPageContentProps) {
  const reduced = useReducedMotion()

  const fu = (delay = 0) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 8 },
          whileInView: { opacity: 1, y: 0 },
          viewport: VIEWPORT,
          transition: { ...FADE_UP, delay },
        }

  const staggerProps = (staggerChildren = 0.06, delayChildren = 0.1) =>
    reduced
      ? {}
      : {
          initial: "initial",
          whileInView: "animate",
          viewport: VIEWPORT,
          variants: {
            initial: {},
            animate: { transition: { staggerChildren, delayChildren } },
          } as typeof stagger.container,
        }

  const itemProps = reduced ? {} : { variants: ITEM_VARIANTS }

  return (
    <>
      {/* Hero */}
      <section className="px-4 py-12 sm:py-16 bg-linear-to-b from-primary/5 to-transparent">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div {...fu(0)} className="mb-6">
            <SectionPill>
              Serving {cityData.name}, {cityData.state}
            </SectionPill>
          </motion.div>

          <motion.h1
            {...fu(0.06)}
            className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4"
          >
            Online Doctor in {cityData.name}
          </motion.h1>

          <motion.p
            {...fu(0.12)}
            className="text-muted-foreground text-lg max-w-xl mx-auto mb-8"
          >
            Skip the waiting room. Get medical certificates and prescriptions online, reviewed by
            Australian doctors and delivered to your phone.
          </motion.p>

          <motion.div {...fu(0.18)}>
            <Link href="/request">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-base px-8"
              >
                Get Started
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </motion.div>

          <motion.div
            {...fu(0.24)}
            className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground"
          >
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-foreground">{PRICING_DISPLAY.FROM_MED_CERT}</span>
              <span>med certs</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-primary" />
              <span>Usually under 1 hour</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-primary" />
              <span>AHPRA-registered</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-dawn-400 text-dawn-400" />
              <span>4.9 &middot; 200+ patients</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* City-specific paragraph */}
      {cityContent && (
        <section className="px-4 py-10">
          <motion.div {...fu(0)} className="mx-auto max-w-2xl">
            <p className="text-muted-foreground leading-relaxed text-center">{cityContent}</p>
          </motion.div>
        </section>
      )}

      {/* Deep content */}
      {deepContent && (
        <>
          {/* Health Stats Strip */}
          <section className="px-4 py-10 bg-muted/30">
            <div className="mx-auto max-w-3xl">
              <motion.div
                className="grid gap-4 grid-cols-2 sm:grid-cols-4"
                {...staggerProps(0.07, 0.05)}
              >
                {deepContent.healthStats.map((stat) => (
                  <motion.div
                    key={stat.label}
                    {...itemProps}
                    className="text-center p-4 rounded-xl bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.05]"
                  >
                    <div className="flex items-center justify-center gap-1.5 mb-2">
                      <TrendingUp className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground mb-0.5">{stat.value}</p>
                    <p className="text-xs text-muted-foreground leading-tight">{stat.context}</p>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </section>

          {/* Editorial sections */}
          {deepContent.sections.map((section) => (
            <section key={section.title} className="px-4 py-10">
              <motion.div {...fu(0)} className="mx-auto max-w-2xl">
                <h2 className="text-xl font-semibold text-foreground mb-4">{section.title}</h2>
                {section.paragraphs.map((p, i) => (
                  <p key={i} className="text-muted-foreground leading-relaxed mb-4 last:mb-0">
                    {autoLinkParagraph(p)}
                  </p>
                ))}
              </motion.div>
            </section>
          ))}

          {/* Pharmacy info */}
          <section className="px-4 py-10 bg-muted/30">
            <motion.div {...fu(0)} className="mx-auto max-w-2xl">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                {deepContent.pharmacyInfo.title}
              </h2>
              {deepContent.pharmacyInfo.paragraphs.map((p, i) => (
                <p key={i} className="text-muted-foreground leading-relaxed mb-4 last:mb-0">
                  {p}
                </p>
              ))}
            </motion.div>
          </section>

          {/* Telehealth regulations */}
          <section className="px-4 py-10">
            <motion.div {...fu(0)} className="mx-auto max-w-2xl">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                {deepContent.telehealthRegulations.title}
              </h2>
              {deepContent.telehealthRegulations.paragraphs.map((p, i) => (
                <p key={i} className="text-muted-foreground leading-relaxed mb-4 last:mb-0">
                  {p}
                </p>
              ))}
            </motion.div>
          </section>
        </>
      )}

      {/* Services */}
      <section className="px-4 py-12">
        <div className="mx-auto max-w-3xl">
          <motion.h2 {...fu(0)} className="text-2xl font-bold mb-2 text-center">
            Services Available in {cityData.name}
          </motion.h2>
          <motion.p
            {...fu(0.06)}
            className="text-center text-sm text-muted-foreground mb-8"
          >
            No appointment needed. Reviewed by AHPRA-registered Australian doctors.
          </motion.p>

          <motion.div
            className="grid gap-4 sm:grid-cols-3"
            {...staggerProps(0.08, 0.1)}
          >
            {SERVICES.map((service) => (
              <motion.div key={service.href} {...itemProps}>
                <Link href={service.href} className="block group h-full">
                  <div className="h-full p-5 rounded-xl bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06] group-hover:border-primary/30 group-hover:shadow-lg group-hover:shadow-primary/[0.08] transition-all duration-200">
                    <service.Icon className="h-5 w-5 text-primary mb-3" />
                    <h3 className="font-semibold text-foreground mb-1">{service.name}</h3>
                    <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                      {service.desc}
                    </p>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-sm font-medium text-primary">{service.price}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-150" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Local Testimonial */}
      {cityData.localTestimonial && (
        <section className="px-4 py-12 bg-muted/30">
          <motion.div {...fu(0)} className="mx-auto max-w-2xl text-center">
            <div className="flex justify-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-dawn-400 text-dawn-400" />
              ))}
            </div>
            <blockquote className="text-lg mb-4">
              &quot;{cityData.localTestimonial.quote}&quot;
            </blockquote>
            <p className="text-sm text-muted-foreground">
              {cityData.localTestimonial.name}, {cityData.name}
            </p>
          </motion.div>
        </section>
      )}

      {/* How It Works */}
      <section className="px-4 py-12">
        <div className="mx-auto max-w-3xl">
          <motion.h2 {...fu(0)} className="text-2xl font-bold mb-8 text-center">
            How It Works for {cityData.name} Patients
          </motion.h2>
          <motion.div
            className="grid gap-4 sm:grid-cols-3"
            {...staggerProps(0.09, 0.1)}
          >
            {[
              {
                step: "1",
                title: "Tell us what you need",
                desc: "Answer a few quick questions about your health concern",
              },
              {
                step: "2",
                title: "Doctor reviews",
                desc: "An Australian doctor reviews your request, usually within 1 hour",
              },
              {
                step: "3",
                title: "Get your result",
                desc: "Certificate, script, or referral sent to your phone",
              },
            ].map((item) => (
              <motion.div
                key={item.step}
                {...itemProps}
                className="text-center p-5 rounded-xl bg-white dark:bg-card border border-border/50 shadow-sm shadow-primary/[0.04]"
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <span className="font-bold text-primary text-sm">{item.step}</span>
                </div>
                <h3 className="font-semibold mb-2 text-sm">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Why Choose */}
      <section className="px-4 py-12 bg-muted/30">
        <div className="mx-auto max-w-3xl">
          <motion.h2 {...fu(0)} className="text-2xl font-bold mb-8 text-center">
            Why {cityData.name} Residents Choose InstantMed
          </motion.h2>
          <motion.div
            className="grid gap-3 sm:grid-cols-2"
            {...staggerProps(0.05, 0.05)}
          >
            {[
              "No need to leave home or work",
              "Skip the waiting room",
              "Same-day service, most requests",
              "eScripts sent to your phone",
              "Valid for all Australian employers",
              "Reviewed by real Australian doctors",
            ].map((benefit) => (
              <motion.div
                key={benefit}
                {...itemProps}
                className="flex items-center gap-3 p-3 rounded-lg bg-background"
              >
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm">{benefit}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <motion.h2
            {...fu(0)}
            className="text-2xl font-bold mb-8 text-center flex items-center justify-center gap-2"
          >
            <HelpCircle className="h-5 w-5 text-primary" />
            Frequently Asked Questions
          </motion.h2>
          <motion.div {...fu(0.06)}>
            <Accordion type="multiple" className="space-y-2">
              {faqs.map((faq, i) => (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  className="border border-border/50 rounded-xl px-4 overflow-hidden bg-card"
                >
                  <AccordionTrigger className="text-sm font-medium text-left py-4 hover:no-underline">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-12 bg-muted/30">
        <motion.div {...fu(0)} className="mx-auto max-w-xl text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-muted-foreground mb-6">
            Join thousands of {cityData.name} residents who trust InstantMed for their telehealth
            needs.
          </p>
          <Link href="/request">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Get started
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Related Resources */}
      <section className="px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <motion.p
            {...fu(0)}
            className="text-xs font-semibold text-muted-foreground mb-4 text-center uppercase tracking-wider"
          >
            Related Resources
          </motion.p>
          <motion.div
            className="grid gap-3 sm:grid-cols-2"
            {...staggerProps(0.07, 0.05)}
          >
            {RELATED.map((resource) => (
              <motion.div key={resource.href} {...itemProps}>
                <Link href={resource.href} className="block group">
                  <div className="flex items-start gap-3 p-4 rounded-xl border border-border/50 hover:border-primary/20 hover:bg-muted/30 transition-all duration-200">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                        {resource.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {resource.desc}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-all duration-150" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Other Cities */}
      <section className="px-4 py-8 border-t">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm text-muted-foreground text-center">
            Also serving:{" "}
            {otherCities.map((c, i, arr) => (
              <span key={c.slug}>
                <Link href={`/locations/${c.slug}`} className="text-primary hover:underline">
                  {c.name}
                </Link>
                {i < arr.length - 1 && " \u00b7 "}
              </span>
            ))}
            {" \u00b7 "}
            <Link href="/locations" className="text-primary hover:underline font-medium">
              View all locations
            </Link>
          </p>
        </div>
      </section>
    </>
  )
}
