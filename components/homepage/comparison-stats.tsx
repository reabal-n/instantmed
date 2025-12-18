"use client"

import NumberFlow from "@number-flow/react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

const css = `
.candy-bg {
  background-color: hsl(var(--muted) / 0.5);
  border: 1px solid hsl(var(--border) / 0.5);
}

.dark .candy-bg {
  background-color: hsl(var(--muted) / 0.3);
  border: 1px solid hsl(var(--border) / 0.3);
}`

const ComparisonStats = () => {
  return (
    <section className="py-20 sm:py-28 relative overflow-hidden">
      <style>{css}</style>
      
      {/* Background gradient */}
      <div className="absolute inset-0 bg-linear-to-b from-background via-[#00E2B5]/5 to-background" />
      
      <div className="container relative z-10">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 
            className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Why Aussies choose{" "}
            <span className="bg-linear-to-r from-[#00E2B5] to-[#06B6D4] bg-clip-text text-transparent">
              InstantMed
            </span>
          </h2>
          <p className="text-lg text-muted-foreground">
            We&apos;re not just faster—we&apos;re redefining what telehealth should be.
          </p>
        </div>
        
        <div className="relative mx-auto flex h-80 sm:h-96 max-w-4xl items-end justify-center gap-3 sm:gap-4">
          {[
            { 
              value: 35, 
              label: "GP Clinics", 
              sublabel: "3+ days wait",
              delay: 0.2,
              color: "bg-gray-400 dark:bg-gray-600"
            },
            { 
              value: 45, 
              label: "Other Telehealth", 
              sublabel: "4+ hours wait",
              delay: 0.4,
              color: "bg-gray-500 dark:bg-gray-500"
            },
            {
              value: 95,
              label: "InstantMed",
              sublabel: "45 min average",
              color: "bg-[#00E2B5]",
              showToolTip: true,
              delay: 0.6,
            },
            { 
              value: 40, 
              label: "Hospital ER", 
              sublabel: "6+ hours wait",
              delay: 0.8,
              color: "bg-gray-400 dark:bg-gray-600"
            },
          ].map((props, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.5,
                delay: index * 0.15,
                type: "spring",
                damping: 12,
              }}
              className="h-full w-full max-w-[120px] sm:max-w-[140px]"
            >
              <BarChart {...props} />
            </motion.div>
          ))}
        </div>
        
        <p className="text-center text-sm text-muted-foreground mt-8">
          *Patient satisfaction rate based on post-consultation surveys
        </p>
      </div>
    </section>
  )
}

export { ComparisonStats }

const BarChart = ({
  value,
  label,
  sublabel,
  color = "bg-primary/80",
  showToolTip = false,
  delay = 0,
}: {
  value: number
  label: string
  sublabel?: string
  color?: string
  showToolTip?: boolean
  delay?: number
}) => {
  return (
    <div className="group relative h-full w-full">
      <div className="candy-bg relative h-full w-full overflow-hidden rounded-2xl sm:rounded-3xl">
        <motion.div
          initial={{ opacity: 0, y: 100, height: 0 }}
          whileInView={{ opacity: 1, y: 0, height: `${value}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, type: "spring", damping: 15, delay }}
          className={cn(
            "absolute bottom-0 w-full rounded-2xl sm:rounded-3xl p-2 sm:p-3 text-white",
            color,
          )}
        >
          <div className="relative flex h-10 sm:h-12 w-full items-center justify-center gap-1 rounded-xl bg-white/20 text-lg sm:text-xl font-bold tracking-tight">
            <NumberFlow value={value} suffix="%" />
          </div>
        </motion.div>
      </div>

      {showToolTip && (
        <motion.div
          initial={{ opacity: 0, y: 100, height: 0 }}
          whileInView={{ opacity: 1, y: 0, height: `${value}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, type: "spring", damping: 12, delay }}
          className="absolute bottom-0 w-full pointer-events-none"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: delay + 0.3 }}
            className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-foreground px-3 py-1.5 text-sm font-medium text-background shadow-lg"
          >
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 rotate-45 w-2 h-2 bg-foreground" />
            🏆 Top rated
          </motion.div>
        </motion.div>
      )}
      
      <div className="mt-3 text-center">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {sublabel && (
          <p className="text-xs text-muted-foreground">{sublabel}</p>
        )}
      </div>
    </div>
  )
}
