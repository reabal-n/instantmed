'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button, Card, CardBody } from '@heroui/react'
import { motion } from 'framer-motion'
import { SparklesPremium, ClockPremium, ShieldPremiumAlt } from '@/components/icons/certification-logos'
import { GradientBorderChase, MagneticCard } from '@/components/ui/glowing-effect'

// Credit card icon inline since we only need it once
function CreditCardIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="5" width="20" height="14" rx="2" fill="currentColor" fillOpacity="0.1" />
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10H22" />
      <path d="M6 14H10" strokeLinecap="round" />
    </svg>
  )
}

const features = [
  { Icon: ClockPremium, text: "15 min typical turnaround" },
  { Icon: ShieldPremiumAlt, text: "AHPRA registered doctors" },
  { Icon: CreditCardIcon, text: "Pay only if approved" },
]

export function CTASection() {
  return (
    <section className="py-16 lg:py-20 relative overflow-hidden section-premium">
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <MagneticCard intensity={5} scale={1.01} borderRadius="1.5rem">
            <GradientBorderChase 
              colors={['#2563EB', '#4f46e5', '#4f46e5', '#EC4899', '#2563EB']}
              duration={4}
              borderWidth={2}
              borderRadius="1.5rem"
            >
              <Card className="bg-linear-to-br from-primary/5 via-secondary/5 to-primary/5 border-0 overflow-hidden">
              <CardBody className="p-8 sm:p-12 text-center">
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="mb-6"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 interactive-pill cursor-default">
                  <SparklesPremium className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Ready when you are</span>
                </div>
              </motion.div>
              
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 tracking-tight">
                Get started in minutes
              </h2>
              <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                Need a med cert or script? Takes 2 minutes to find out if we can help.
              </p>
              
              {/* Features */}
              <div className="flex flex-wrap justify-center gap-4 mb-8">
                {features.map((feature) => (
                  <div
                    key={feature.text}
                    className="flex items-center gap-2 text-sm text-muted-foreground px-3 py-1.5 rounded-full bg-background/50 border border-divider interactive-pill"
                  >
                    <feature.Icon className="h-4 w-4 text-primary" />
                    <span>{feature.text}</span>
                  </div>
                ))}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  as={Link}
                  href="/start"
                  color="primary"
                  size="lg"
                  className="px-8 h-12 font-semibold magnetic-button shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 transition-all glow-pulse"
                  endContent={<ArrowRight className="h-4 w-4" />}
                >
                  Start your request
                </Button>
              </div>
              
              <p className="mt-6 text-xs text-muted-foreground">
                No account required • Pay only if approved
              </p>
            </CardBody>
          </Card>
            </GradientBorderChase>
          </MagneticCard>
        </motion.div>
      </div>
    </section>
  )
}
