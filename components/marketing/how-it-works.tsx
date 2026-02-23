'use client'

import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import Link from 'next/link'

const steps = [
  {
    number: "1",
    title: "Tell us what's going on",
    description: "Quick form — takes about 2 minutes.",
    time: "2 min",
  },
  {
    number: "2",
    title: "A GP reviews your request",
    description: "A real Australian doctor looks it over and makes the call.",
    time: "~1 hour",
  },
  {
    number: "3",
    title: "Sorted",
    description: "Certificate to your inbox, eScript to your phone. Done.",
    time: "Same day",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-14 lg:py-18 scroll-mt-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-start gap-10 lg:gap-14">
          {/* Steps — clean vertical list */}
          <div className="flex-1">
            {/* Section Header */}
            <motion.div
              className="mb-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2 tracking-tight">
                How it works
              </h2>
              <p className="text-sm text-muted-foreground">
                No appointments. No phone calls. Just results.
              </p>
            </motion.div>

            <div className="space-y-0">
              {steps.map((step, index) => (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="relative flex items-start gap-4 py-5"
                >
                  {/* Number + connector */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-semibold">
                      {step.number}
                    </div>
                    {index < steps.length - 1 && (
                      <div className="w-px h-full bg-border absolute top-12 left-4" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="text-base font-semibold text-foreground">
                        {step.title}
                      </h3>
                      <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                        {step.time}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* CTA */}
            <motion.div
              className="mt-6"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <Button
                asChild
                variant="default"
                size="lg"
                className="px-8 h-11 font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 transition-all"
              >
                <Link href="/request">
                  Start a request <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <p className="text-xs text-muted-foreground mt-2.5">
                Most people are sorted in under an hour
              </p>
            </motion.div>
          </div>

          {/* Image — laptop + certificate + coffee */}
          <motion.div
            className="hidden lg:block shrink-0 w-72 xl:w-80 aspect-square rounded-2xl overflow-hidden shadow-lg"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Image
              src="/images/home-2.jpeg"
              alt="Laptop showing InstantMed chat, phone, and medical certificate on desk"
              width={400}
              height={400}
              className="object-cover w-full h-full"
            />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
