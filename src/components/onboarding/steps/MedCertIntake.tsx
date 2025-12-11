'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format, isBefore, startOfDay } from 'date-fns'
import { 
  ArrowRight, 
  ArrowLeft, 
  AlertTriangle, 
  Calendar as CalendarIcon,
  Info
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
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold mb-2 tracking-tight">
          Tell us about your condition
        </h2>
        <p className="text-muted-foreground">
          {step === 1 && 'Select your symptoms'}
          {step === 2 && 'When do you need the certificate for?'}
          {step === 3 && 'A few more details'}
        </p>
      </div>

      {/* Step 1: Symptoms */}
      {step === 1 && (
        <div className="space-y-4">
          <Label>What symptoms are you experiencing?</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SYMPTOMS.map((symptom) => (
              <div
                key={symptom.id}
                className={cn(
                  'flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all h-12',
                  selectedSymptoms.includes(symptom.id)
                    ? 'border-teal-600 bg-teal-50'
                    : 'border-gray-200 hover:border-teal-400',
                  symptom.isRedFlag && 'border-red-300 hover:border-red-400'
                )}
                onClick={() => handleSymptomToggle(symptom.id)}
              >
                <Checkbox
                  checked={selectedSymptoms.includes(symptom.id)}
                  onCheckedChange={() => handleSymptomToggle(symptom.id)}
                  className={cn(symptom.isRedFlag && 'border-destructive')}
                />
                <span className={cn(symptom.isRedFlag && 'text-destructive')}>
                  {symptom.label}
                </span>
                {symptom.isRedFlag && (
                  <AlertTriangle className="w-4 h-4 text-destructive ml-auto" />
                )}
              </div>
            ))}
          </div>
          {errors.symptoms && (
            <p className="text-sm text-destructive">{errors.symptoms.message}</p>
          )}

          <div className="space-y-2 pt-4">
            <Label htmlFor="symptomDetails">
              Please describe your symptoms in detail
            </Label>
            <textarea
              id="symptomDetails"
              {...register('symptomDetails')}
              className="w-full min-h-[120px] p-3 rounded-lg border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="E.g., I woke up with a sore throat and have been experiencing fever and body aches since yesterday..."
            />
            {errors.symptomDetails && (
              <p className="text-sm text-destructive">{errors.symptomDetails.message}</p>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Dates */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Certificate Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal touch-target',
                    !selectedDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(new Date(selectedDate), 'PPP') : 'Pick a date'}
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
              <p className="text-sm text-destructive">{errors.startDate.message}</p>
            )}
            
            {/* Backdating warning */}
            {isBackdated && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border-2 border-amber-200">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-900 tracking-tight">
                    Backdating requires clinical review (+$10)
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    Certificates for past dates require additional review by a doctor.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>How many days do you need?</Label>
            <Select
              value={selectedDuration}
              onValueChange={(value) => setValue('duration', value as MedCertIntakeForm['duration'], { shouldValidate: true })}
            >
              <SelectTrigger className="touch-target">
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
              <p className="text-sm text-destructive">{errors.duration.message}</p>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Additional Details */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="workType">
              What type of work do you do?
            </Label>
            <Input
              id="workType"
              {...register('workType')}
              placeholder="E.g., Office work, Retail, Construction..."
              className="h-12 rounded-xl focus:ring-2 focus:ring-teal-600"
            />
            {errors.workType && (
              <p className="text-sm text-destructive">{errors.workType.message}</p>
            )}
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="w-3 h-3" />
              This helps the doctor assess if rest is appropriate
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="additionalInfo">
              Anything else the doctor should know? (Optional)
            </Label>
            <textarea
              id="additionalInfo"
              {...register('additionalInfo')}
              className="w-full min-h-[100px] p-3 rounded-lg border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Any relevant medical history, allergies, or additional context..."
            />
          </div>
        </div>
      )}

      {/* Navigation - Sticky on mobile */}
      <div className="fixed bottom-0 left-0 right-0 md:relative md:bottom-auto md:left-auto md:right-auto bg-white/95 backdrop-blur-md border-t md:border-t-0 border-gray-200 p-4 md:p-0 md:bg-transparent md:backdrop-blur-none">
        <div className="flex gap-3 max-w-xl mx-auto">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-11 md:h-12 min-h-[44px]"
            onClick={prevIntakeStep}
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Back
          </Button>
          
          {step < 3 ? (
            <Button
              type="button"
              size="lg"
              className="flex-1 h-11 md:h-12 min-h-[44px] text-base bg-teal-600 hover:bg-teal-700 text-white"
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
              className="flex-1 h-11 md:h-12 min-h-[44px] text-base bg-teal-600 hover:bg-teal-700 text-white"
            >
              Continue
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </form>
  )
}

