'use client'

import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@heroui/react'
import { motion } from 'framer-motion'

export function CTASection() {
  return (
    <section className="py-20 lg:py-28 relative overflow-hidden">
      
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full liquid-glass-pill cursor-pointer group">
              <Sparkles className="w-4 h-4 text-primary group-hover:animate-spin" />
              <span className="text-sm font-medium text-foreground/90 group-hover:text-foreground transition-colors">Ready when you are</span>
            </div>
          </motion.div>
          
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            That&apos;s it. Pretty simple.
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Need a med cert or script? Takes 2 minutes to find out if we can help.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              as={Link}
              href="/start"
              color="primary"
              size="lg"
              className="px-8 h-12 text-sm font-semibold shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all"
              endContent={<ArrowRight className="h-4 w-4" />}
            >
              Get started free
            </Button>
          </div>
          
          <p className="mt-6 text-xs text-muted-foreground">
            No account needed • Pay only if approved
          </p>
        </motion.div>
      </div>
    </section>
  )
}
