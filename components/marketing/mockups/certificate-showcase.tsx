"use client"

import { motion, type Variants } from "framer-motion"
import { BadgeCheck, Shield } from "lucide-react"

import { useReducedMotion } from "@/components/ui/motion"

/**
 * Faithful mockup of the real InstantMed medical certificate.
 * Used on the med cert landing page to show patients exactly what they'll receive.
 * Animated: elements appear sequentially on scroll.
 */
export function CertificateShowcaseMockup() {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  // Dynamic date so the mockup never looks stale
  const now = new Date()
  const day = now.getDate()
  const month = now.toLocaleString("en-AU", { month: "long" })
  const year = now.getFullYear()
  const dateShort = `${String(day).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${year}`
  const dateLong = `${day} ${month} ${year}`

  const stagger: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: animate ? 0.08 : 0 },
    },
  }

  const fadeUp: Variants = animate
    ? {
        hidden: { opacity: 0, y: 8 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
      }
    : { hidden: { opacity: 1 }, visible: { opacity: 1 } }

  return (
    <div className="relative">
      {/* Certificate document */}
      {/* Always white - real PDFs are white paper regardless of system theme */}
      <motion.div
        className="relative rounded-xl bg-white border border-border/50 dark:border-white/20 shadow-2xl shadow-primary/[0.08] dark:shadow-black/20 overflow-hidden max-w-[340px] mx-auto"
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
      >
        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-primary/40 via-primary/60 to-primary/40" />

        {/*
          Force light-mode colors inside the document.
          Real PDFs are always white paper with dark text - the mockup
          should look identical regardless of system theme.
          Floating badges outside this wrapper remain theme-aware.
        */}
        <div className="px-6 py-5 space-y-4 text-gray-900">
          {/* Header: logo + clinic details */}
          <motion.div variants={fadeUp} className="flex items-start justify-between">
            <div className="text-base font-semibold italic text-gray-700 tracking-tight">
              <span className="text-primary/70">i</span>Med
            </div>
            <div className="text-right">
              <p className="text-[9px] font-semibold text-gray-600">InstantMed Telehealth Clinic</p>
              <p className="text-[8px] text-gray-400 leading-relaxed">
                Level 1, 459 Elizabeth Street<br />
                SURRY HILLS, NSW, 2010<br />
                instantmed.com.au
              </p>
            </div>
          </motion.div>

          {/* Date */}
          <motion.div variants={fadeUp} className="text-right">
            <span className="text-[9px] text-gray-500">{dateShort}</span>
          </motion.div>

          {/* Title */}
          <motion.h3
            variants={fadeUp}
            className="text-center text-lg font-semibold text-gray-900 tracking-tight"
          >
            Medical Certificate
          </motion.h3>

          {/* Body */}
          <motion.div variants={fadeUp} className="space-y-2.5">
            <p className="text-[9px] italic text-gray-500">To whom it may concern,</p>
            <p className="text-[9px] text-gray-600 leading-[1.6]">
              This is to certify that <span className="inline-block w-20 h-2.5 rounded bg-gray-200/70 align-middle" /> (DOB: <span className="inline-block w-14 h-2.5 rounded bg-gray-200/70 align-middle" />) has been reviewed and assessed on {dateLong}. In my clinical opinion, they are medically unfit to attend work or fulfil their usual occupational duties on {dateLong}.
            </p>
            <p className="text-[9px] text-gray-600 leading-[1.6]">
              They are advised to rest and recover and are expected to return to work the following day.
            </p>
          </motion.div>

          {/* Signature block + seal */}
          <motion.div variants={fadeUp} className="flex items-end justify-between pt-6">
            <div className="space-y-0.5">
              <p className="text-[10px] font-semibold text-gray-700 flex items-center gap-1">Dr. <span className="inline-block w-16 h-2.5 rounded bg-gray-200/70 align-middle" /></p>
              <p className="text-[8px] text-gray-400">MBBS, FRACGP</p>
              <p className="text-[8px] text-gray-400">Medical Practitioner</p>
              <p className="text-[8px] text-gray-400">AHPRA: MED00XXXXXXXX</p>
              {/* Signature scribble */}
              <svg width="60" height="20" viewBox="0 0 60 20" className="mt-1 text-gray-300">
                <path
                  d="M2 15 C8 5, 12 5, 18 12 S28 5, 34 10 S42 3, 50 8 L56 6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            {/* Circular seal */}
            <div className="w-12 h-12 rounded-full border-2 border-primary/15 flex items-center justify-center shrink-0">
              <div className="w-9 h-9 rounded-full border border-primary/20 flex items-center justify-center">
                <span className="text-[7px] font-semibold text-primary/40 text-center leading-tight">
                  INSTANT<br />MED
                </span>
              </div>
            </div>
          </motion.div>

          {/* Divider */}
          <motion.div variants={fadeUp}>
            <div className="border-t border-primary/10 pt-2">
              <p className="text-[7px] text-center text-gray-400 font-mono">
                CERTIFICATE ID: IM-WORK-{year}{String(now.getMonth() + 1).padStart(2, "0")}{String(day).padStart(2, "0")}-XXXXXXXX
              </p>
            </div>
          </motion.div>

          {/* Verification footer */}
          <motion.div variants={fadeUp}>
            <p className="text-[7px] text-center text-gray-400/80 italic leading-relaxed">
              To verify the authenticity of this medical certificate, visit instantmed.com.au/verify or contact our clinic directly.
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* Floating badges */}
      <motion.div
        className="absolute -top-3 -right-3 sm:-right-6 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-card border border-border/50 shadow-lg shadow-primary/[0.06] dark:shadow-none"
        initial={animate ? { scale: 0.8 } : {}}
        whileInView={animate ? { opacity: 1, scale: 1 } : undefined}
        viewport={{ once: true }}
        transition={{ duration: 0.3, delay: 0.6 }}
      >
        <BadgeCheck className="w-3.5 h-3.5 text-emerald-500" />
        <span className="text-[10px] font-medium text-foreground">Accepted everywhere</span>
      </motion.div>

      <motion.div
        className="absolute -bottom-3 -left-3 sm:-left-6 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-card border border-border/50 shadow-lg shadow-primary/[0.06] dark:shadow-none"
        initial={animate ? { scale: 0.8 } : {}}
        whileInView={animate ? { opacity: 1, scale: 1 } : undefined}
        viewport={{ once: true }}
        transition={{ duration: 0.3, delay: 0.8 }}
      >
        <Shield className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
        <span className="text-[10px] font-medium text-foreground">Unique verification ID</span>
      </motion.div>

      {/* Verified badge - pulsing dot signals live verification */}
      <motion.div
        className="absolute -bottom-3 right-4 sm:right-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-card border border-success/30 shadow-lg shadow-success/[0.08] dark:shadow-none"
        initial={animate ? { scale: 0.8 } : {}}
        whileInView={animate ? { opacity: 1, scale: 1 } : undefined}
        viewport={{ once: true }}
        transition={{ duration: 0.3, delay: 1.0 }}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success/60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
        </span>
        <span className="text-[10px] font-medium text-success">Verified just now</span>
      </motion.div>
    </div>
  )
}
