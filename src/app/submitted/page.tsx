'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { 
  CheckCircle2, Clock, MessageSquare, FileText, 
  Bell, ArrowRight, Loader2, Home, User
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusTimeline } from '@/components/flow/status-timeline'
import { SLACountdown } from '@/components/flow/sla-countdown'
import { getFlowConfig } from '@/lib/flow'
import { cn } from '@/lib/utils'

function SubmittedContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const serviceSlug = searchParams.get('service')
  
  const config = serviceSlug ? getFlowConfig(serviceSlug) : null
  
  // Simulated request data
  const [requestData] = useState({
    id: `REQ-${Date.now().toString(36).toUpperCase()}`,
    submittedAt: new Date().toISOString(),
    status: 'pending_review' as const,
    estimatedCompletionAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
  })
  
  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-slate-50">
      {/* Noise texture */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.015] z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
      
      <main className="relative z-10 max-w-2xl mx-auto px-4 py-8 sm:py-12">
        {/* Success animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
          className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 rounded-full bg-emerald-100 flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
          >
            <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-600" />
          </motion.div>
        </motion.div>
        
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-8"
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
            Request submitted!
          </h1>
          <p className="text-slate-600">
            Your {config.serviceName.toLowerCase()} request is being reviewed.
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Reference: {requestData.id}
          </p>
        </motion.div>
        
        {/* SLA Countdown Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <SLACountdown 
            targetTime={requestData.estimatedCompletionAt}
            status={requestData.status}
          />
        </motion.div>
        
        {/* Status Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 overflow-hidden mb-6"
        >
          <div className="p-5 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Progress</h2>
          </div>
          <div className="p-5">
            <StatusTimeline 
              currentStatus={requestData.status}
              submittedAt={requestData.submittedAt}
            />
          </div>
        </motion.div>
        
        {/* Message Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-blue-50 rounded-2xl p-5 mb-6"
        >
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-1">We may message you</h3>
              <p className="text-sm text-slate-600 mb-3">
                If the doctor needs more information, you'll receive a secure message. 
                Please check your email and messages regularly.
              </p>
              <Link
                href="/messages"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                <MessageSquare className="w-4 h-4" />
                View secure messages
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </motion.div>
        
        {/* What's next card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 p-5 mb-8"
        >
          <h3 className="font-semibold text-slate-900 mb-4">What happens next?</h3>
          
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-slate-500">
                1
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Doctor reviews your request</p>
                <p className="text-xs text-slate-500">Usually within 1 hour during business hours</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-slate-500">
                2
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Receive notification</p>
                <p className="text-xs text-slate-500">We'll email and SMS you when ready</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-slate-500">
                3
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Download or receive document</p>
                <p className="text-xs text-slate-500">Available in your dashboard or sent to pharmacy</p>
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* Notification opt-in */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center mb-8"
        >
          <button className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
            <Bell className="w-4 h-4" />
            Enable push notifications
          </button>
        </motion.div>
        
        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <Button
            onClick={() => router.push('/dashboard')}
            variant="outline"
            className="flex-1 h-12 rounded-xl"
          >
            <User className="w-4 h-4 mr-2" />
            Go to dashboard
          </Button>
          
          <Button
            onClick={() => router.push('/')}
            className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700"
          >
            <Home className="w-4 h-4 mr-2" />
            Return home
          </Button>
        </motion.div>
      </main>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
    </div>
  )
}

export default function SubmittedPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <SubmittedContent />
    </Suspense>
  )
}
