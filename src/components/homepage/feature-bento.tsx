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
  Globe
} from 'lucide-react'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 260,
      damping: 20,
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
      viewport={{ once: true, margin: '-100px' }}
    >
      {/* Large feature card - AHPRA Registered */}
      <motion.div
        variants={itemVariants}
        className="lg:col-span-2 group relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 to-teal-700 p-8 text-white"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative">
          <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center mb-6">
            <Shield className="w-7 h-7" />
          </div>
          
          <h3 className="text-2xl font-bold mb-3">AHPRA Registered Doctors</h3>
          <p className="text-white/80 text-lg leading-relaxed max-w-lg">
            Every consultation is conducted by fully registered Australian doctors. 
            Your health is in qualified, professional hands.
          </p>
          
          <div className="flex items-center gap-6 mt-6 pt-6 border-t border-white/20">
            <div>
              <div className="text-3xl font-bold">100%</div>
              <div className="text-sm text-white/60">Verified Doctors</div>
            </div>
            <div>
              <div className="text-3xl font-bold">10K+</div>
              <div className="text-sm text-white/60">Consultations</div>
            </div>
            <div>
              <div className="text-3xl font-bold">4.9</div>
              <div className="text-sm text-white/60">Rating</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Fast Response */}
      <motion.div
        variants={itemVariants}
        className="group relative overflow-hidden rounded-2xl bg-white border border-slate-100 p-6 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300"
      >
        <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
          <Clock className="w-6 h-6 text-amber-600" />
        </div>
        
        <h3 className="text-lg font-semibold mb-2">Fast Response</h3>
        <p className="text-slate-600 text-sm leading-relaxed">
          Get your certificate or prescription within 2 hours. Priority review available for urgent requests.
        </p>
        
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="text-2xl font-bold text-teal-600">{"<"}2 hrs</div>
          <div className="text-xs text-slate-500">Average response time</div>
        </div>
      </motion.div>

      {/* Instant PDF Delivery */}
      <motion.div
        variants={itemVariants}
        className="group relative overflow-hidden rounded-2xl bg-white border border-slate-100 p-6 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300"
      >
        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
          <FileText className="w-6 h-6 text-blue-600" />
        </div>
        
        <h3 className="text-lg font-semibold mb-2">Instant PDF Delivery</h3>
        <p className="text-slate-600 text-sm leading-relaxed">
          Your medical certificate is sent directly to your email as a professional PDF document.
        </p>
        
        <div className="flex gap-2 mt-4">
          <span className="px-2 py-1 rounded-full bg-slate-100 text-xs font-medium text-slate-600">Email</span>
          <span className="px-2 py-1 rounded-full bg-slate-100 text-xs font-medium text-slate-600">PDF</span>
          <span className="px-2 py-1 rounded-full bg-slate-100 text-xs font-medium text-slate-600">Printable</span>
        </div>
      </motion.div>

      {/* Mobile Friendly */}
      <motion.div
        variants={itemVariants}
        className="group relative overflow-hidden rounded-2xl bg-white border border-slate-100 p-6 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300"
      >
        <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
          <Smartphone className="w-6 h-6 text-purple-600" />
        </div>
        
        <h3 className="text-lg font-semibold mb-2">Mobile Friendly</h3>
        <p className="text-slate-600 text-sm leading-relaxed">
          Complete your consultation from anywhere on any device. No app download required.
        </p>
        
        <div className="flex items-center gap-2 mt-4 text-sm text-slate-500">
          <Globe className="w-4 h-4" />
          <span>Works on all devices</span>
        </div>
      </motion.div>

      {/* Bank-Level Security - Wide card */}
      <motion.div
        variants={itemVariants}
        className="lg:col-span-2 group relative overflow-hidden rounded-2xl bg-slate-900 p-6 text-white"
      >
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0wIDBoNDB2NDBoLTQweiIvPjxwYXRoIGQ9Ik0xIDFoMnYyaC0yem0xMCAwaDJ2MmgtMnptMTAgMGgydjJoLTJ6bTEwIDBoMnYyaC0yem0tMzAgMTBoMnYyaC0yem0xMCAwaDJ2MmgtMnptMTAgMGgydjJoLTJ6bTEwIDBoMnYyaC0yem0tMzAgMTBoMnYyaC0yem0xMCAwaDJ2MmgtMnptMTAgMGgydjJoLTJ6bTEwIDBoMnYyaC0yem0tMzAgMTBoMnYyaC0yem0xMCAwaDJ2MmgtMnptMTAgMGgydjJoLTJ6bTEwIDBoMnYyaC0yeiIgZmlsbD0iI2ZmZiIgZmlsbC1vcGFjaXR5PSIuMDUiLz48L2c+PC9zdmc+')] opacity-50" />
        
        <div className="relative flex flex-col md:flex-row md:items-center gap-6">
          <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
            <Lock className="w-7 h-7" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-xl font-semibold mb-2">Bank-Level Security</h3>
            <p className="text-white/70 text-sm leading-relaxed">
              Your health information is protected with AES-256 encryption and stored in compliance with Australian Privacy Principles.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>AES-256</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>HTTPS</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Privacy Act</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Priority Review */}
      <motion.div
        variants={itemVariants}
        className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 p-6 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300"
      >
        <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
          <Zap className="w-6 h-6 text-amber-600" />
        </div>
        
        <h3 className="text-lg font-semibold mb-2">Priority Review</h3>
        <p className="text-slate-600 text-sm leading-relaxed">
          Need it urgently? Skip the queue and get reviewed within 30 minutes.
        </p>
        
        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 text-sm font-medium text-amber-800">
          <Zap className="w-3 h-3" />
          +$9.95
        </div>
      </motion.div>
    </motion.div>
  )
}
