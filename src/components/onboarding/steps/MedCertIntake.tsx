'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format, isBefore, startOfDay } from 'date-fns'
import { motion } from 'framer-motion'
import { 
  ArrowRight, 
  ArrowLeft, 
  AlertTriangle, 
  Calendar as CalendarIcon,
  Info,
  CheckCircle2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { medCertIntakeSchema, type MedCertIntakeForm } from '@/lib/validations'
import { RED_FLAG_SYMPTOMS } from '@/lib/types'

interface MedCertIntakeProps {
  onNext: (data: MedCertIntakeForm) => void
  onBack: () => void
  onEmergency: () => void
  defaultValues?: Partial<MedCertIntakeForm>
  isBackdated?: boolean
  backdatingFee?: number
}

const SYMPTOMS = [
  { id: 'cold_flu', label: 'Cold / Flu symptoms' },
  { id: 'headache', label: 'Headache / Migraine' },
  { id: 'stomach', label: 'Stomach upset / Gastro' },
  { id: 'fatigue', label: 'Fatigue / Tiredness' },
  { id: 'back_pain', label: 'Back pain' },
  { id: 'mental_health', label: 'Mental health day' },
  { id: 'injury', label: 'Minor injury' },
  { id: 'other', label: 'Other' },
  // Red flag symptoms - will trigger emergency alert
  { id: 'chest_pain', label: 'Chest pain', isRedFlag: true },
  { id: 'severe_breathlessness', label: 'Severe breathlessness', isRedFlag: true },
]

const DURATIONS = [
  { value: '1', label: '1 day' },
  { value: '2', label: '2 days' },
  { value: '3', label: '3 days' },
  { value: '4', label: '4 days' },
  { value: '5', label: '5 days' },
  { value: '7', label: '1 week' },
  { value: '14', label: '2 weeks' },
]

export function MedCertIntake({ onNext, onBack, onEmergency, defaultValues }: MedCertIntakeProps) {
  const [step, setStep] = useState(1)
  const [isBackdated, setIsBackdated] = useState(false)
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<MedCertIntakeForm>({
    resolver: zodResolver(medCertIntakeSchema),
    defaultValues: {
      symptoms: defaultValues?.symptoms || [],
      symptomDetails: defaultValues?.symptomDetails || '',
      startDate: defaultValues?.startDate || format(new Date(), 'yyyy-MM-dd'),
      duration: defaultValues?.duration || '1',
      workType: defaultValues?.workType || '',
      additionalInfo: defaultValues?.additionalInfo || '',
    },
  })

  const selectedSymptoms = watch('symptoms')
  const selectedDate = watch('startDate')
  const selectedDuration = watch('duration')

  // Check for red flag symptoms
  useEffect(() => {
    const hasRedFlag = selectedSymptoms.some((symptom) =>
      RED_FLAG_SYMPTOMS.includes(symptom as (typeof RED_FLAG_SYMPTOMS)[number])
    )
    if (hasRedFlag) {
      onEmergency()
    }
  }, [selectedSymptoms, onEmergency])

  // Check if date is backdated
  useEffect(() => {
    if (selectedDate) {
      const selected = startOfDay(new Date(selectedDate))
      const today = startOfDay(new Date())
      setIsBackdated(isBefore(selected, today))
    }
  }, [selectedDate])

  const handleSymptomToggle = (symptomId: string) => {
    const current = selectedSymptoms || []
    const updated = current.includes(symptomId)
      ? current.filter((s) => s !== symptomId)
      : [...current, symptomId]
    setValue('symptoms', updated, { shouldValidate: true })
  }

  const onSubmit = (data: MedCertIntakeForm) => {
    onNext(data)
  }

  const nextIntakeStep = () => {
    if (step < 3) setStep(step + 1)
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
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-teal-50 to-cyan-50 text-teal-700 text-sm font-semibold mb-4 border border-teal-100">
          <span>Step {step} of 3</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold mb-2 bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
          {step === 1 && "What's bothering you?"}
          {step === 2 && 'When do you need time off?'}
          {step === 3 && 'Almost there!'}
        </h2>
        <p className="text-slate-600">
          {step === 1 && "Select all that apply — we'll tailor your certificate"}
          {step === 2 && 'Pick the dates for your medical certificate'}
          {step === 3 && 'Just a few more details for the doctor'}
        </p>
      </motion.div>

      {/* Step 1: Symptoms */}
      {step === 1 && (
        <motion.div 
          className="space-y-5"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <div>
            <Label className="text-slate-700 font-semibold mb-3 block text-base">How are you feeling?</Label>
            <p className="text-sm text-slate-500 mb-5">Tap all the symptoms that match how you&apos;re feeling</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SYMPTOMS.map((symptom) => {
              const isSelected = selectedSymptoms.includes(symptom.id)
              return (
                <motion.div
                  key={symptom.id}
                  className={cn(
                    'flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all shadow-sm',
                    isSelected
                      ? 'border-teal-500 bg-gradient-to-br from-teal-50 to-cyan-50 shadow-md shadow-teal-500/20'
                      : 'border-slate-200 hover:border-teal-300 hover:bg-slate-50 bg-white',
                    symptom.isRedFlag && !isSelected && 'border-red-200 hover:border-red-300 bg-red-50/30'
                  )}
                  onClick={() => handleSymptomToggle(symptom.id)}
                  whileTap={{ scale: 0.98 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className={cn(
                    'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                    isSelected ? 'border-teal-500 bg-gradient-to-br from-teal-500 to-cyan-500 shadow-sm' : 'border-slate-300'
                  )}>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </div>
                  <span className={cn(
                    'text-sm font-medium',
                    isSelected ? 'text-teal-700' : 'text-slate-700',
                    symptom.isRedFlag && !isSelected && 'text-red-700'
                  )}>
                    {symptom.label}
                  </span>
                  {symptom.isRedFlag && (
                    <AlertTriangle className="w-4 h-4 text-red-500 ml-auto" />
                  )}
                </motion.div>
              )
            })}
          </div>
          {errors.symptoms && (
            <p className="text-sm text-red-500 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              Please select at least one symptom
            </p>
          )}

          <div className="space-y-2 pt-4">
            <Label htmlFor="symptomDetails" className="text-slate-700 font-semibold text-base">
              Tell us a bit more
            </Label>
            <p className="text-sm text-slate-500 mb-3">
              This helps the doctor understand your situation better
            </p>
            <textarea
              id="symptomDetails"
              {...register('symptomDetails')}
              className="w-full min-h-[120px] p-4 rounded-xl border-2 border-slate-200 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-slate-700 placeholder:text-slate-400 shadow-sm"
              placeholder="For example: I woke up yesterday with a sore throat and have been feeling feverish since then..."
            />
            {errors.symptomDetails && (
              <p className="text-sm text-red-500 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Please describe your symptoms
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* Step 2: Dates */}
      {step === 2 && (
        <motion.div 
          className="space-y-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <div className="space-y-3">
            <Label className="text-slate-700 font-medium">When did you start feeling unwell?</Label>
            <p className="text-sm text-slate-400">
              This will be the start date on your certificate
            </p>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal h-12 rounded-xl border-2 border-slate-100 hover:border-teal-200',
                    !selectedDate && 'text-slate-400'
                  )}
                >
                  <CalendarIcon className="mr-3 h-5 w-5 text-slate-400" />
                  {selectedDate ? format(new Date(selectedDate), 'EEEE, d MMMM yyyy') : 'Choose a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate ? new Date(selectedDate) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      setValue('startDate', format(date, 'yyyy-MM-dd'), { shouldValidate: true })
                    }
                  }}
                  disabled={(date) => {
                    // Allow up to 7 days in the past, and up to 7 days in the future
                    const sevenDaysAgo = new Date()
                    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
                    const sevenDaysFromNow = new Date()
                    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
                    return date < sevenDaysAgo || date > sevenDaysFromNow
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.startDate && (
              <p className="text-sm text-red-500 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Please select a date
              </p>
            )}
            
            {/* Backdating warning */}
            {isBackdated && (
              <motion.div 
                className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 shadow-sm"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-amber-800 text-sm">
                    Backdating adds +$10
                  </p>
                  <p className="text-sm text-amber-700 mt-0.5">
                    Past dates need extra review by a doctor
                  </p>
                </div>
              </motion.div>
            )}
          </div>

          <div className="space-y-3">
            <Label className="text-slate-700 font-medium">How long do you need off?</Label>
            <p className="text-sm text-slate-400">
              Most employers accept 1-3 days without extra questions
            </p>
            <Select
              value={selectedDuration}
              onValueChange={(value) => setValue('duration', value as MedCertIntakeForm['duration'], { shouldValidate: true })}
            >
              <SelectTrigger className="h-12 rounded-xl border-2 border-slate-100 hover:border-teal-200">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                {DURATIONS.map((duration) => (
                  <SelectItem key={duration.value} value={duration.value}>
                    {duration.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.duration && (
              <p className="text-sm text-red-500 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Please select a duration
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* Step 3: Additional Details */}
      {step === 3 && (
        <motion.div 
          className="space-y-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <div className="space-y-3">
            <Label htmlFor="workType" className="text-slate-700 font-medium">
              What kind of work do you do?
            </Label>
            <p className="text-sm text-slate-400">
              This helps us recommend the right amount of rest
            </p>
            <Input
              id="workType"
              {...register('workType')}
              placeholder="e.g., Office work, Retail, Construction..."
              className="h-12 rounded-xl border-2 border-slate-100 focus:border-teal-500 focus:ring-0"
            />
            {errors.workType && (
              <p className="text-sm text-red-500 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Please enter your work type
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Label htmlFor="additionalInfo" className="text-slate-700 font-medium">
              Anything else we should know?
            </Label>
            <p className="text-sm text-slate-400">
              Optional — but helpful if you have allergies, conditions, or relevant history
            </p>
            <textarea
              id="additionalInfo"
              {...register('additionalInfo')}
              className="w-full min-h-[100px] p-4 rounded-xl border-2 border-slate-100 bg-white resize-none focus:outline-none focus:ring-0 focus:border-teal-500 transition-colors text-slate-700 placeholder:text-slate-400"
              placeholder="e.g., I have asthma, or I'm currently taking medication for..."
            />
          </div>
          
          {/* Reassurance message */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-teal-50 to-cyan-50 border-2 border-teal-200 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-sm text-teal-800 font-medium">
                Your information is secure and only shared with your reviewing doctor.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Navigation - Sticky on mobile */}
      <div className="fixed bottom-0 left-0 right-0 md:relative md:bottom-auto md:left-auto md:right-auto glass border-t md:border-t-0 border-teal-100/50 p-4 md:p-0 md:pt-6 md:bg-transparent md:backdrop-blur-none shadow-lg md:shadow-none">
        <div className="flex gap-3 max-w-xl mx-auto">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-12 min-h-[48px] rounded-xl border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600"
            onClick={prevIntakeStep}
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Back
          </Button>
          
          {step < 3 ? (
            <Button
              type="button"
              size="lg"
              className="flex-1 h-12 min-h-[48px] text-base bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white rounded-xl shadow-lg shadow-teal-500/30 transition-all"
              onClick={nextIntakeStep}
              disabled={step === 1 && (selectedSymptoms.length === 0 || !watch('symptomDetails'))}
            >
              Continue
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="lg"
              className="flex-1 h-12 min-h-[48px] text-base bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white rounded-xl shadow-lg shadow-teal-500/30 transition-all"
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

