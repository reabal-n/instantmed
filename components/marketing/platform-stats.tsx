"use client";

import NumberFlow from "@number-flow/react";
import { motion } from "framer-motion";
import React from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, Users, Clock, Award } from "lucide-react";

const statsData = [
  {
    icon: TrendingUp,
    value: 98.5,
    label: "Patient Satisfaction",
    suffix: "%",
    description: "Based on 1,000+ reviews",
    color: "bg-primary",
  },
  {
    icon: Clock,
    value: 12,
    label: "Average Response Time",
    suffix: " min",
    description: "Most requests approved in under 15 minutes",
    color: "bg-emerald-500",
  },
  {
    icon: Users,
    value: 50000,
    label: "Patients Helped",
    suffix: "+",
    description: "And growing every day",
    color: "bg-violet-500",
  },
  {
    icon: Award,
    value: 100,
    label: "AHPRA Registered",
    suffix: "%",
    description: "All our doctors are Australian registered",
    color: "bg-cyan-500",
  },
];

export function PlatformStats() {
  return (
    <section className="py-20 lg:py-28 relative overflow-hidden">
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-4xl lg:text-4xl font-bold text-foreground mb-4 tracking-tight">
            Trusted by thousands
          </h2>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            Real results, real people. Here&apos;s why Australians choose InstantMed.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsData.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group"
            >
              <div className="relative bg-card border border-border rounded-2xl p-6 hover:border-primary/30 transition-all duration-300 card-3d card-shine">
                {/* Icon */}
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
                  stat.color + "/10"
                )}>
                  <stat.icon className={cn("w-6 h-6", stat.color.replace("bg-", "text-"))} />
                </div>

                {/* Value with animation */}
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-bold text-foreground">
                    <NumberFlow 
                      value={stat.value}
                      format={{ 
                        notation: stat.value >= 10000 ? "compact" : "standard",
                        maximumFractionDigits: stat.value < 100 ? 1 : 0 
                      }}
                    />
                  </span>
                  <span className="text-2xl font-bold text-primary">{stat.suffix}</span>
                </div>

                {/* Label */}
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {stat.label}
                </h3>

                {/* Description */}
                <p className="text-sm text-muted-foreground">
                  {stat.description}
                </p>

                {/* Progress bar decoration */}
                <div className="mt-4 h-1 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className={cn("h-full rounded-full", stat.color)}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${Math.min(stat.value, 100)}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
