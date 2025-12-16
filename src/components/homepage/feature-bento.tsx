'use client'

import { motion } from 'framer-motion'
import { 
  Shield, 
  Clock, 
  FileText, 
  Smartphone, 
  Lock, 
  Zap,
  CheckCircle2,
  Heart
} from 'lucide-react'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 400,
      damping: 25,
    },
  },
}

export function FeatureBento() {
  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
    >
      {/* Large feature card - AHPRA Registered */}
      <motion.div
        variants={itemVariants}
        className="lg:col-span-2 group relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 p-7 text-white"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4 blur-2xl" />
        
        <div className="relative">
          <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center mb-5">
            <Shield className="w-6 h-6" />
          </div>
          
          <h3 className="text-xl font-bold mb-2">Real Australian GPs 🇦🇺</h3>
          <p className="text-white/80 text-sm leading-relaxed max-w-md mb-6">
            Every consultation is reviewed by an AHPRA-registered doctor actively practicing in Australia. 
            You're in good hands.
          </p>
          
          <div className="flex items-center gap-8">
            <div>
              <div className="text-2xl font-bold">100%</div>
              <div className="text-xs text-white/60">Verified</div>
            </div>
            <div>
              <div className="text-2xl font-bold">10K+</div>
              <div className="text-xs text-white/60">Consultations</div>
            </div>
            <div>
              <div className="text-2xl font-bold">4.9</div>
              <div className="text-xs text-white/60">Rating</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Fast Response */}
      <motion.div
        variants={itemVariants}
        className="group rounded-2xl bg-white border border-slate-100 p-6 hover:shadow-lg hover:shadow-slate-200/50 transition-shadow duration-300"
      >
        <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center mb-4">
          <Clock className="w-5 h-5 text-amber-600" />
        </div>
        
        <h3 className="text-base font-semibold text-slate-900 mb-1.5">Fast when you need it</h3>
        <p className="text-slate-500 text-sm leading-relaxed mb-4">
          Most requests done in ~1 hour. Need it faster? Priority option gets you to the front.
        </p>
        
        <div className="text-xl font-bold text-teal-600">&lt;2 hrs</div>
        <div className="text-xs text-slate-400">Average response</div>
      </motion.div>

      {/* Instant PDF Delivery */}
      <motion.div
        variants={itemVariants}
        className="group rounded-2xl bg-white border border-slate-100 p-6 hover:shadow-lg hover:shadow-slate-200/50 transition-shadow duration-300"
      >
        <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
          <FileText className="w-5 h-5 text-blue-600" />
        </div>
        
        <h3 className="text-base font-semibold text-slate-900 mb-1.5">Straight to your inbox</h3>
        <p className="text-slate-500 text-sm leading-relaxed mb-4">
          Certificates arrive as a clean PDF. Print it, forward it, done.
        </p>
        
        <div className="flex gap-2">
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-xs font-medium text-slate-600">Email</span>
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-xs font-medium text-slate-600">PDF</span>
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-xs font-medium text-slate-600">Print</span>
        </div>
      </motion.div>

      {/* Mobile Friendly */}
      <motion.div
        variants={itemVariants}
        className="group rounded-2xl bg-white border border-slate-100 p-6 hover:shadow-lg hover:shadow-slate-200/50 transition-shadow duration-300"
      >
        <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center mb-4">
          <Smartphone className="w-5 h-5 text-purple-600" />
        </div>
        
        <h3 className="text-base font-semibold text-slate-900 mb-1.5">Use any device</h3>
        <p className="text-slate-500 text-sm leading-relaxed mb-4">
          Phone, tablet, laptop — whatever you've got. No app to download.
        </p>
        
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Heart className="w-4 h-4 text-rose-400" />
          <span>Mobile-first design</span>
        </div>
      </motion.div>

      {/* Bank-Level Security - Wide card */}
      <motion.div
        variants={itemVariants}
        className="lg:col-span-2 group rounded-2xl bg-slate-900 p-6 text-white"
      >
        <div className="flex flex-col md:flex-row md:items-center gap-5">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-base font-semibold mb-1.5">Your data stays locked 🔒</h3>
            <p className="text-white/60 text-sm leading-relaxed">
              AES-256 encryption, Australian Privacy Principles compliant. Your health info isn't going anywhere.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>AES-256</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>HTTPS</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Privacy Act</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Priority Review */}
      <motion.div
        variants={itemVariants}
        className="group rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100/50 p-6 hover:shadow-lg hover:shadow-amber-200/30 transition-shadow duration-300"
      >
        <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center mb-4">
          <Zap className="w-5 h-5 text-amber-600" />
        </div>
        
        <h3 className="text-base font-semibold text-slate-900 mb-1.5">In a rush?</h3>
        <p className="text-slate-600 text-sm leading-relaxed mb-4">
          Priority gets you reviewed in ~30 minutes. For when you really can't wait.
        </p>
        
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-xs font-semibold text-amber-800">
          <Zap className="w-3.5 h-3.5" />
          +$9.95
        </div>
      </motion.div>
    </motion.div>
  )
}
