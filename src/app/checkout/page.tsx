'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  FileText, Pill, Stethoscope, Scale, User, 
  ChevronRight, Shield, Clock, CreditCard,
  Check, AlertCircle, Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  useFlowStore, 
  useFlowService, 
  useFlowAnswers, 
  getFlowConfig 
} from '@/lib/flow'
import { cn } from '@/lib/utils'

// Icon mapping
const SERVICE_ICONS: Record<string, React.ElementType> = {
  'medical-certificate': FileText,
  'common-scripts': Pill,
  'prescription': Pill,
  'weight-management': Scale,
  'mens-health': User,
  'referral': Stethoscope,
}

interface SummaryItem {
  label: string
  value: string
  editStep?: string
}

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const serviceSlug = useFlowService()
  const answers = useFlowAnswers()
  const { goToStep } = useFlowStore()
  
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Get service config
  const config = serviceSlug ? getFlowConfig(serviceSlug) : null
  
  // Redirect if no service selected
  useEffect(() => {
    if (!serviceSlug) {
      router.push('/start')
    }
  }, [serviceSlug, router])
  
  if (!config || !serviceSlug) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    )
  }
  
  const Icon = SERVICE_ICONS[serviceSlug] || FileText
  
  // Build summary items from answers
  const getSummaryItems = (): SummaryItem[] => {
    const items: SummaryItem[] = []
    
    // Service-specific summaries
    if (serviceSlug === 'medical-certificate') {
      if (answers.certificate_type) {
        const typeLabels: Record<string, string> = {
          sick_leave: 'Sick leave',
          carers_leave: 'Carer\'s leave',
          fitness: 'Fitness certificate',
          medical_appointment: 'Medical appointment',
        }
        items.push({ 
          label: 'Certificate type', 
          value: typeLabels[answers.certificate_type as string] || String(answers.certificate_type),
          editStep: 'questions'
        })
      }
      if (answers.absence_dates) {
        const dateLabels: Record<string, string> = {
          today: 'Today',
          yesterday: 'Yesterday',
          multi_day: 'Multiple days',
        }
        items.push({ 
          label: 'Duration', 
          value: dateLabels[answers.absence_dates as string] || String(answers.absence_dates),
          editStep: 'questions'
        })
      }
      if (answers.reason_category) {
        items.push({
          label: 'Reason',
          value: String(answers.reason_category).replace(/_/g, ' '),
          editStep: 'questions'
        })
      }
    }
    
    if (serviceSlug === 'common-scripts' || serviceSlug === 'prescription') {
      if (answers.medication_name) {
        items.push({
          label: 'Medication',
          value: String(answers.medication_name),
          editStep: 'questions'
        })
      }
      if (answers.script_type) {
        items.push({
          label: 'Type',
          value: answers.script_type === 'repeat' ? 'Repeat script' : 'New prescription',
          editStep: 'questions'
        })
      }
      if (answers.delivery_method) {
        items.push({
          label: 'Delivery',
          value: answers.delivery_method === 'escript' ? 'E-script to phone' : 'Send to pharmacy',
          editStep: 'questions'
        })
      }
    }
    
    if (serviceSlug === 'weight-management') {
      if (answers.weight_kg && answers.height_cm) {
        const bmi = Number(answers.weight_kg) / Math.pow(Number(answers.height_cm) / 100, 2)
        items.push({
          label: 'Current BMI',
          value: bmi.toFixed(1),
          editStep: 'questions'
        })
      }
      if (answers.goal_weight) {
        items.push({
          label: 'Goal weight',
          value: `${answers.goal_weight} kg`,
          editStep: 'questions'
        })
      }
    }
    
    if (serviceSlug === 'mens-health') {
      if (answers.concern_type) {
        const concernLabels: Record<string, string> = {
          ed: 'Erectile function',
          pe: 'Premature concerns',
          hair: 'Hair loss',
          testosterone: 'Low energy / testosterone',
          sti_test: 'STI testing',
          other: 'Other',
        }
        items.push({
          label: 'Concern',
          value: concernLabels[answers.concern_type as string] || String(answers.concern_type),
          editStep: 'questions'
        })
      }
    }
    
    if (serviceSlug === 'referral') {
      if (answers.specialist_type) {
        items.push({
          label: 'Specialist type',
          value: String(answers.specialist_type).replace(/_/g, ' '),
          editStep: 'questions'
        })
      }
      if (answers.urgency) {
        const urgencyLabels: Record<string, string> = {
          routine: 'Routine',
          soon: 'Within 1-2 weeks',
          urgent: 'Urgent',
        }
        items.push({
          label: 'Urgency',
          value: urgencyLabels[answers.urgency as string] || String(answers.urgency),
          editStep: 'questions'
        })
      }
    }
    
    return items
  }
  
  const summaryItems = getSummaryItems()
  
  // Calculate fees
  const baseFee = config.pricing.basePriceCents / 100
  const priorityFee = 0 // Could be toggled
  const totalFee = baseFee + priorityFee
  
  // Handle edit
  const handleEdit = (step: string) => {
    goToStep(step as any)
    router.push('/start')
  }
  
  // Handle payment
  const handlePay = async () => {
    setIsProcessing(true)
    setError(null)
    
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Redirect to submitted page
      router.push(`/submitted?service=${serviceSlug}`)
    } catch (err) {
      setError('Payment failed. Please try again.')
      setIsProcessing(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      {/* Noise texture */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.015] z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-100">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <button 
            onClick={() => router.back()}
            className="text-slate-600 hover:text-slate-900 text-sm font-medium flex items-center gap-1"
          >
            ← Back
          </button>
          <h1 className="text-sm font-semibold text-slate-900">Review & Pay</h1>
          <div className="w-16" />
        </div>
      </header>
      
      <main className="relative z-10 max-w-2xl mx-auto px-4 py-8 pb-40">
        {/* Service Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 overflow-hidden mb-6"
        >
          {/* Service header */}
          <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-white">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Icon className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">{config.serviceName}</h2>
                <p className="text-sm text-slate-500">{config.serviceDescription}</p>
              </div>
            </div>
          </div>
          
          {/* Summary items */}
          <div className="divide-y divide-slate-100">
            {summaryItems.map((item, idx) => (
              <div key={idx} className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">{item.label}</p>
                  <p className="text-sm font-medium text-slate-900">{item.value}</p>
                </div>
                {item.editStep && (
                  <button
                    onClick={() => handleEdit(item.editStep!)}
                    className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                  >
                    Change
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
            
            {summaryItems.length === 0 && (
              <div className="px-5 py-6 text-center text-slate-500 text-sm">
                No details to display
              </div>
            )}
          </div>
        </motion.div>
        
        {/* Fee Breakdown Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 overflow-hidden mb-6"
        >
          <div className="p-5 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Fee breakdown</h3>
          </div>
          
          <div className="p-5 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Consultation fee</span>
              <span className="font-medium text-slate-900">${baseFee.toFixed(2)}</span>
            </div>
            
            {priorityFee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Priority review</span>
                <span className="font-medium text-slate-900">${priorityFee.toFixed(2)}</span>
              </div>
            )}
            
            <div className="pt-3 mt-3 border-t border-slate-100 flex justify-between">
              <span className="font-semibold text-slate-900">Total</span>
              <span className="text-xl font-bold text-emerald-600">${totalFee.toFixed(2)}</span>
            </div>
          </div>
        </motion.div>
        
        {/* What happens next */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-50 rounded-2xl p-5 mb-6"
        >
          <h3 className="font-semibold text-slate-900 mb-4">What happens next</h3>
          
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Doctor review within 1 hour</p>
                <p className="text-xs text-slate-500">During operating hours (8am–10pm AEST)</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">We may message you</p>
                <p className="text-xs text-slate-500">If we need more info, you'll get a secure message</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <Check className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Receive your document</p>
                <p className="text-xs text-slate-500">Sent securely to your email and dashboard</p>
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap justify-center gap-4 text-xs text-slate-500 mb-8"
        >
          <span className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-emerald-500" />
            256-bit encryption
          </span>
          <span className="flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-emerald-500" />
            Secure payment
          </span>
        </motion.div>
        
        {/* Error message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-center"
          >
            <p className="text-sm text-red-700">{error}</p>
          </motion.div>
        )}
      </main>
      
      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-slate-100 p-4">
        <div className="max-w-2xl mx-auto">
          <Button
            onClick={handlePay}
            disabled={isProcessing}
            size="lg"
            className={cn(
              'w-full h-14 text-base font-semibold rounded-xl',
              'bg-emerald-600 hover:bg-emerald-700 text-white',
              'shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30',
              'disabled:bg-slate-300 disabled:shadow-none',
              'transition-all duration-200'
            )}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing payment...
              </>
            ) : (
              <>
                Pay ${totalFee.toFixed(2)}
                <CreditCard className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
          
          <p className="text-xs text-slate-400 text-center mt-3">
            By paying, you agree to our{' '}
            <a href="/terms" className="text-emerald-600 hover:underline">Terms</a>
            {' '}and{' '}
            <a href="/privacy" className="text-emerald-600 hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <CheckoutContent />
    </Suspense>
  )
}
