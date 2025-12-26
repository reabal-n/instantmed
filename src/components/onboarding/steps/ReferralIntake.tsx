'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle, Stethoscope, Info, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

// Validation schema for referral intake
const referralIntakeSchema = z.object({
  specialistType: z.string().min(1, 'Please select a specialist type'),
  specificSpecialist: z.string().optional(),
  reason: z.string().min(10, 'Please describe why you need this referral'),
  symptoms: z.string().optional(),
  duration: z.string().optional(),
  previousTreatment: z.string().optional(),
  urgency: z.enum(['routine', 'soon', 'urgent']),
  preferredLocation: z.string().optional(),
  additionalInfo: z.string().optional(),
})

export type ReferralIntakeForm = z.infer<typeof referralIntakeSchema>

interface ReferralIntakeProps {
  onNext: (data: ReferralIntakeForm) => void
  onBack: () => void
  defaultValues?: Partial<ReferralIntakeForm>
}

const SPECIALIST_TYPES = [
  { id: 'dermatologist', label: 'Dermatologist', description: 'Skin conditions, acne, moles' },
  { id: 'cardiologist', label: 'Cardiologist', description: 'Heart & cardiovascular health' },
  { id: 'gastroenterologist', label: 'Gastroenterologist', description: 'Digestive system issues' },
  { id: 'endocrinologist', label: 'Endocrinologist', description: 'Hormones, thyroid, diabetes' },
  { id: 'neurologist', label: 'Neurologist', description: 'Brain & nervous system' },
  { id: 'psychiatrist', label: 'Psychiatrist', description: 'Mental health specialist' },
  { id: 'orthopedic', label: 'Orthopedic Surgeon', description: 'Bones, joints, muscles' },
  { id: 'gynecologist', label: 'Gynaecologist', description: "Women's health" },
  { id: 'urologist', label: 'Urologist', description: 'Urinary & male reproductive' },
  { id: 'ent', label: 'ENT Specialist', description: 'Ear, nose & throat' },
  { id: 'ophthalmologist', label: 'Ophthalmologist', description: 'Eye specialist' },
  { id: 'other', label: 'Other Specialist', description: 'Specify below' },
]

const URGENCY_OPTIONS = [
  { id: 'routine', label: 'Routine', description: 'Within 4-6 weeks', color: 'teal' },
  { id: 'soon', label: 'Soon', description: 'Within 1-2 weeks', color: 'amber' },
  { id: 'urgent', label: 'Urgent', description: 'As soon as possible', color: 'red' },
]

export function ReferralIntake({ onNext, onBack, defaultValues }: ReferralIntakeProps) {
  const [step, setStep] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ReferralIntakeForm>({
    resolver: zodResolver(referralIntakeSchema),
    defaultValues: {
      specialistType: defaultValues?.specialistType || '',
      specificSpecialist: defaultValues?.specificSpecialist || '',
      reason: defaultValues?.reason || '',
      symptoms: defaultValues?.symptoms || '',
      duration: defaultValues?.duration || '',
      previousTreatment: defaultValues?.previousTreatment || '',
      urgency: defaultValues?.urgency || 'routine',
      preferredLocation: defaultValues?.preferredLocation || '',
      additionalInfo: defaultValues?.additionalInfo || '',
    },
  })

  const selectedSpecialist = watch('specialistType')
  const urgency = watch('urgency')

  const filteredSpecialists = searchTerm
    ? SPECIALIST_TYPES.filter(s => 
        s.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : SPECIALIST_TYPES

  const onSubmit = (data: ReferralIntakeForm) => {
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
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-50 text-violet-600 text-sm font-medium mb-4">
          <Stethoscope className="w-4 h-4" />
          <span>Step {step} of 2</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold mb-2 text-slate-900">
          {step === 1 && 'Which specialist do you need?'}
          {step === 2 && 'Tell us more'}
        </h2>
        <p className="text-slate-500">
          {step === 1 && "We'll prepare a referral valid for 12 months"}
          {step === 2 && 'Details help the specialist prepare for your visit'}
        </p>
      </motion.div>

      {/* Step 1: Specialist Selection */}
      {step === 1 && (
        <motion.div 
          className="space-y-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search specialists..."
              className="h-12 pl-12 rounded-xl border-2 border-slate-100 focus:border-teal-500 focus:ring-0"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-slate-700 font-medium">Select a specialist</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
              {filteredSpecialists.map((specialist) => {
                const isSelected = selectedSpecialist === specialist.id
                return (
                  <motion.div
                    key={specialist.id}
                    className={cn(
                      'flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all',
                      isSelected
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-slate-100 hover:border-teal-200 bg-white'
                    )}
                    onClick={() => setValue('specialistType', specialist.id, { shouldValidate: true })}
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
                          {specialist.label}
                        </span>
                        <span className="text-xs text-slate-400">{specialist.description}</span>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
            {errors.specialistType && (
              <p className="text-sm text-red-500 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Please select a specialist type
              </p>
            )}
          </div>

          {selectedSpecialist === 'other' && (
            <motion.div 
              className="space-y-3"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              <Label className="text-slate-700 font-medium">
                Which specialist do you need?
              </Label>
              <Input
                {...register('specificSpecialist')}
                placeholder="e.g., Rheumatologist, Allergist..."
                className="h-12 rounded-xl border-2 border-slate-100 focus:border-teal-500 focus:ring-0"
              />
            </motion.div>
          )}

          <div className="space-y-3">
            <Label className="text-slate-700 font-medium">
              Why do you need this referral?
            </Label>
            <p className="text-sm text-slate-400">
              Briefly describe your concern
            </p>
            <textarea
              {...register('reason')}
              className="w-full min-h-[100px] p-4 rounded-xl border-2 border-slate-100 bg-white resize-none focus:outline-none focus:ring-0 focus:border-teal-500 transition-colors text-slate-700 placeholder:text-slate-400"
              placeholder="e.g., I've noticed some skin changes I'd like checked..."
            />
            {errors.reason && (
              <p className="text-sm text-red-500 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Please explain why you need this referral
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
              What symptoms are you experiencing?
            </Label>
            <textarea
              {...register('symptoms')}
              className="w-full min-h-[80px] p-4 rounded-xl border-2 border-slate-100 bg-white resize-none focus:outline-none focus:ring-0 focus:border-teal-500 transition-colors text-slate-700 placeholder:text-slate-400"
              placeholder="Describe your symptoms..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">
                How long have you had these symptoms?
              </Label>
              <Input
                {...register('duration')}
                placeholder="e.g., 2 weeks, 3 months"
                className="h-12 rounded-xl border-2 border-slate-100 focus:border-teal-500 focus:ring-0"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">
                Any previous treatment?
              </Label>
              <Input
                {...register('previousTreatment')}
                placeholder="e.g., Over-the-counter creams"
                className="h-12 rounded-xl border-2 border-slate-100 focus:border-teal-500 focus:ring-0"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-slate-700 font-medium">How urgent is this?</Label>
            <div className="grid grid-cols-3 gap-3">
              {URGENCY_OPTIONS.map((option) => {
                const isSelected = urgency === option.id
                const colorClasses = {
                  teal: isSelected ? 'border-teal-500 bg-teal-50' : 'border-slate-100 hover:border-teal-200',
                  amber: isSelected ? 'border-amber-500 bg-amber-50' : 'border-slate-100 hover:border-amber-200',
                  red: isSelected ? 'border-red-500 bg-red-50' : 'border-slate-100 hover:border-red-200',
                }[option.color]
                
                return (
                  <motion.div
                    key={option.id}
                    className={cn(
                      'flex flex-col items-center p-4 rounded-xl border-2 cursor-pointer transition-all text-center',
                      colorClasses,
                      'bg-white'
                    )}
                    onClick={() => setValue('urgency', option.id as 'routine' | 'soon' | 'urgent')}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className={cn(
                      'font-medium text-sm',
                      isSelected ? `text-${option.color}-700` : 'text-slate-700'
                    )}>
                      {option.label}
                    </span>
                    <span className="text-xs text-slate-400">{option.description}</span>
                  </motion.div>
                )
              })}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-slate-700 font-medium">
              Preferred specialist location (optional)
            </Label>
            <Input
              {...register('preferredLocation')}
              placeholder="e.g., Near Sydney CBD, or suburb name"
              className="h-12 rounded-xl border-2 border-slate-100 focus:border-teal-500 focus:ring-0"
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="additionalInfo" className="text-slate-700 font-medium">
              Anything else the specialist should know?
            </Label>
            <textarea
              id="additionalInfo"
              {...register('additionalInfo')}
              className="w-full min-h-[80px] p-4 rounded-xl border-2 border-slate-100 bg-white resize-none focus:outline-none focus:ring-0 focus:border-teal-500 transition-colors text-slate-700 placeholder:text-slate-400"
              placeholder="Medical history, current medications, allergies..."
            />
          </div>

          {/* Info notice */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-violet-50 border border-violet-100">
            <Info className="w-5 h-5 text-violet-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-violet-800">
                <strong>Medicare rebate:</strong> Most specialist visits attract a Medicare rebate. 
                Check with the specialist about their fees and gap payments.
              </p>
            </div>
          </div>

          {/* Reassurance */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-teal-50 border border-teal-100">
            <CheckCircle2 className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-teal-800">
                Your referral will be valid for 12 months from the date of issue.
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
              disabled={!selectedSpecialist || !watch('reason')}
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
