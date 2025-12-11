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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 animate-slide-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold mb-2">
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
                  'flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all',
                  selectedSymptoms.includes(symptom.id)
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50',
                  symptom.isRedFlag && 'border-destructive/50 hover:border-destructive'
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
              <div className="flex items-start gap-3 p-4 rounded-lg bg-warning/10 border border-warning/30">
                <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-warning-foreground">
                    Backdating Notice
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Backdating a medical certificate requires additional clinical review. 
                    An extra <span className="font-semibold">$10</span> fee will apply.
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
              className="touch-target"
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

      {/* Navigation */}
      <div className="sticky-bottom-button flex gap-3">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="touch-target"
          onClick={prevIntakeStep}
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Back
        </Button>
        
        {step < 3 ? (
          <Button
            type="button"
            size="lg"
            className="flex-1 touch-target text-base"
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
            className="flex-1 touch-target text-base"
          >
            Continue
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        )}
      </div>
    </form>
  )
}

