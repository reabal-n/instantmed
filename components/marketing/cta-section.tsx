'use client'

import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Button, Chip } from '@heroui/react'
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
            className="mb-8"
          >
            <Chip 
              color="primary" 
              variant="flat"
              startContent={<Sparkles className="w-4 h-4" />}
            >
              Ready when you are
            </Chip>
          </motion.div>
          
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            That&apos;s it. Pretty simple.
          </h2>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            If you need a med cert or a script, we can probably help. Takes a couple of minutes to find out.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              as={Link}
              href="/start"
              color="primary"
              size="lg"
              className="px-10 h-14 text-lg font-semibold"
              endContent={<ArrowRight className="h-5 w-5" />}
            >
              Get started
            </Button>
          </div>
          
          <p className="mt-8 text-sm text-muted-foreground">
            No account needed. You only pay if a doctor approves your request.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
