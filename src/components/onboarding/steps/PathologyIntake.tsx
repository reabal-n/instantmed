'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle, FlaskConical, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

// Validation schema for pathology intake
const pathologyIntakeSchema = z.object({
  testType: z.string().min(1, 'Please select a test type'),
  reason: z.string().min(10, 'Please describe why you need this test'),
  symptoms: z.string().optional(),
  previousTests: z.boolean(),
  previousTestDetails: z.string().optional(),
  preferredLocation: z.string().optional(),
  fastingAware: z.boolean().optional(),
  additionalInfo: z.string().optional(),
})

export type PathologyIntakeForm = z.infer<typeof pathologyIntakeSchema>

interface PathologyIntakeProps {
  onNext: (data: PathologyIntakeForm) => void
  onBack: () => void
  defaultValues?: Partial<PathologyIntakeForm>
}

const COMMON_TESTS = [
  { id: 'full_blood_count', label: 'Full Blood Count (FBC)', description: 'General health check' },
  { id: 'liver_function', label: 'Liver Function Test (LFT)', description: 'Liver health assessment' },
  { id: 'kidney_function', label: 'Kidney Function Test', description: 'Kidney health assessment' },
  { id: 'thyroid', label: 'Thyroid Function', description: 'TSH, T3, T4 levels' },
  { id: 'iron_studies', label: 'Iron Studies', description: 'Iron deficiency check' },
  { id: 'vitamin_d', label: 'Vitamin D', description: 'Vitamin D levels' },
  { id: 'lipid_panel', label: 'Lipid Panel / Cholesterol', description: 'Heart health markers' },
  { id: 'hba1c', label: 'HbA1c / Diabetes Screen', description: 'Blood sugar levels' },
  { id: 'sti_screen', label: 'STI Screening', description: 'Sexual health check' },
  { id: 'other', label: 'Other Test', description: 'Specify below' },
]

export function PathologyIntake({ onNext, onBack, defaultValues }: PathologyIntakeProps) {
  const [step, setStep] = useState(1)
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PathologyIntakeForm>({
    resolver: zodResolver(pathologyIntakeSchema),
    defaultValues: {
      testType: defaultValues?.testType || '',
      reason: defaultValues?.reason || '',
      symptoms: defaultValues?.symptoms || '',
      previousTests: defaultValues?.previousTests ?? false,
      previousTestDetails: defaultValues?.previousTestDetails || '',
      preferredLocation: defaultValues?.preferredLocation || '',
      fastingAware: defaultValues?.fastingAware ?? false,
      additionalInfo: defaultValues?.additionalInfo || '',
    },
  })

  const selectedTest = watch('testType')
  const previousTests = watch('previousTests')

  const onSubmit = (data: PathologyIntakeForm) => {
    onNext(data)
  }

  const nextIntakeStep = () => {
    if (step < 2) setStep(step + 1)
  }

  const prevIntakeStep = () => {
    if (step > 1) setStep(step - 1)
    else onBack()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Header with step indicator */}
      <motion.div 
        className="text-center mb-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 text-sm font-medium mb-4">
          <FlaskConical className="w-4 h-4" />
          <span>Step {step} of 2</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold mb-2 text-slate-900">
          {step === 1 && 'What test do you need?'}
          {step === 2 && 'A bit more info'}
        </h2>
        <p className="text-slate-500">
          {step === 1 && "Select the pathology or imaging test you're after"}
          {step === 2 && 'Help us prepare your referral'}
        </p>
      </motion.div>

      {/* Step 1: Test Selection */}
      {step === 1 && (
        <motion.div 
          className="space-y-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <div className="space-y-3">
            <Label className="text-slate-700 font-medium">Select a test type</Label>
            <p className="text-sm text-slate-400">
              Most tests are bulk-billed at collection centres
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {COMMON_TESTS.map((test) => {
                const isSelected = selectedTest === test.id
                return (
                  <motion.div
                    key={test.id}
                    className={cn(
                      'flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all',
                      isSelected
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-slate-100 hover:border-teal-200 bg-white'
                    )}
                    onClick={() => setValue('testType', test.id, { shouldValidate: true })}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors',
                        isSelected ? 'border-teal-500 bg-teal-500' : 'border-slate-300'
                      )}>
                        {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1">
                        <span className={cn(
                          'font-medium text-sm block',
                          isSelected ? 'text-teal-700' : 'text-slate-700'
                        )}>
                          {test.label}
                        </span>
                        <span className="text-xs text-slate-400">{test.description}</span>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
            {errors.testType && (
              <p className="text-sm text-red-500 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Please select a test type
              </p>
            )}
          </div>

          {selectedTest === 'other' && (
            <motion.div 
              className="space-y-3"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              <Label className="text-slate-700 font-medium">
                What specific test do you need?
              </Label>
              <Input
                {...register('reason')}
                placeholder="e.g., Cortisol levels, Allergy panel..."
                className="h-12 rounded-xl border-2 border-slate-100 focus:border-teal-500 focus:ring-0"
              />
            </motion.div>
          )}

          <div className="space-y-3">
            <Label className="text-slate-700 font-medium">
              Why do you need this test?
            </Label>
            <p className="text-sm text-slate-400">
              Brief explanation helps the doctor approve faster
            </p>
            <textarea
              {...register('reason')}
              className="w-full min-h-[100px] p-4 rounded-xl border-2 border-slate-100 bg-white resize-none focus:outline-none focus:ring-0 focus:border-teal-500 transition-colors text-slate-700 placeholder:text-slate-400"
              placeholder="e.g., I've been feeling tired lately and want to check my iron levels..."
            />
            {errors.reason && (
              <p className="text-sm text-red-500 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Please explain why you need this test
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* Step 2: Additional Details */}
      {step === 2 && (
        <motion.div 
          className="space-y-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <div className="space-y-3">
            <Label className="text-slate-700 font-medium">
              Any symptoms you&apos;re experiencing?
            </Label>
            <textarea
              {...register('symptoms')}
              className="w-full min-h-[80px] p-4 rounded-xl border-2 border-slate-100 bg-white resize-none focus:outline-none focus:ring-0 focus:border-teal-500 transition-colors text-slate-700 placeholder:text-slate-400"
              placeholder="e.g., Fatigue, dizziness, shortness of breath..."
            />
          </div>

          <div className="space-y-3">
            <Label className="text-slate-700 font-medium">Have you had this test before?</Label>
            <div className="grid grid-cols-2 gap-3">
              <motion.div
                className={cn(
                  'flex items-center justify-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all',
                  previousTests
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-slate-100 hover:border-teal-200 bg-white'
                )}
                onClick={() => setValue('previousTests', true)}
                whileTap={{ scale: 0.98 }}
              >
                <div className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                  previousTests ? 'border-teal-500 bg-teal-500' : 'border-slate-300'
                )}>
                  {previousTests && <CheckCircle2 className="w-3 h-3 text-white" />}
                </div>
                <span className="font-medium text-slate-700">Yes</span>
              </motion.div>

              <motion.div
                className={cn(
                  'flex items-center justify-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all',
                  !previousTests
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-slate-100 hover:border-teal-200 bg-white'
                )}
                onClick={() => setValue('previousTests', false)}
                whileTap={{ scale: 0.98 }}
              >
                <div className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                  !previousTests ? 'border-teal-500 bg-teal-500' : 'border-slate-300'
                )}>
                  {!previousTests && <CheckCircle2 className="w-3 h-3 text-white" />}
                </div>
                <span className="font-medium text-slate-700">No</span>
              </motion.div>
            </div>
          </div>

          {previousTests && (
            <motion.div 
              className="space-y-3"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              <Label className="text-slate-700 font-medium">
                When and what were the results?
              </Label>
              <Input
                {...register('previousTestDetails')}
                placeholder="e.g., 6 months ago, iron was low"
                className="h-12 rounded-xl border-2 border-slate-100 focus:border-teal-500 focus:ring-0"
              />
            </motion.div>
          )}

          <div className="space-y-3">
            <Label className="text-slate-700 font-medium">
              Preferred collection location (optional)
            </Label>
            <Input
              {...register('preferredLocation')}
              placeholder="e.g., Near Sydney CBD, or suburb name"
              className="h-12 rounded-xl border-2 border-slate-100 focus:border-teal-500 focus:ring-0"
            />
            <p className="text-xs text-slate-400">
              We&apos;ll include nearby options in your referral
            </p>
          </div>

          <div className="space-y-3">
            <Label htmlFor="additionalInfo" className="text-slate-700 font-medium">
              Anything else we should know?
            </Label>
            <textarea
              id="additionalInfo"
              {...register('additionalInfo')}
              className="w-full min-h-[80px] p-4 rounded-xl border-2 border-slate-100 bg-white resize-none focus:outline-none focus:ring-0 focus:border-teal-500 transition-colors text-slate-700 placeholder:text-slate-400"
              placeholder="Medical conditions, medications, allergies..."
            />
          </div>

          {/* Info notice */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-800">
                <strong>Fasting note:</strong> Some blood tests (like lipids and glucose) require 
                8-12 hours of fasting. We&apos;ll let you know if yours does.
              </p>
            </div>
          </div>

          {/* Reassurance */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-teal-50 border border-teal-100">
            <CheckCircle2 className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-teal-800">
                Your referral will be valid for 12 months and can be used at any pathology centre.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Navigation - Sticky on mobile */}
      <div className="fixed bottom-0 left-0 right-0 md:relative md:bottom-auto md:left-auto md:right-auto bg-white/95 backdrop-blur-md border-t md:border-t-0 border-slate-100 p-4 md:p-0 md:pt-6 md:bg-transparent md:backdrop-blur-none">
        <div className="flex gap-3 max-w-xl mx-auto">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-12 min-h-[48px] rounded-xl border-2 border-slate-200 hover:border-slate-300 text-slate-600"
            onClick={prevIntakeStep}
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Back
          </Button>
          
          {step < 2 ? (
            <Button
              type="button"
              size="lg"
              className="flex-1 h-12 min-h-[48px] text-base bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-lg shadow-teal-600/20"
              onClick={nextIntakeStep}
              disabled={!selectedTest || !watch('reason')}
            >
              Continue
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="lg"
              className="flex-1 h-12 min-h-[48px] text-base bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-lg shadow-teal-600/20"
            >
              Review & continue
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </form>
  )
}
