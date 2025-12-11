'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, ArrowLeft, Info, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { scriptIntakeSchema, type ScriptIntakeForm } from '@/lib/validations'

interface ScriptIntakeProps {
  onNext: (data: ScriptIntakeForm) => void
  onBack: () => void
  defaultValues?: Partial<ScriptIntakeForm>
}

const COMMON_MEDICATIONS = [
  'Blood Pressure Medication',
  'Cholesterol Medication',
  'Thyroid Medication',
  'Contraceptive Pill',
  'Asthma Inhaler',
  'Antidepressant',
  'Other',
]

export function ScriptIntake({ onNext, onBack, defaultValues }: ScriptIntakeProps) {
  const [step, setStep] = useState(1)
  const [allergyInput, setAllergyInput] = useState('')
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ScriptIntakeForm>({
    resolver: zodResolver(scriptIntakeSchema),
    defaultValues: {
      medication: defaultValues?.medication || '',
      currentlyTaking: defaultValues?.currentlyTaking ?? true,
      lastPrescribed: defaultValues?.lastPrescribed || '',
      prescribingDoctor: defaultValues?.prescribingDoctor || '',
      reason: defaultValues?.reason || '',
      allergies: defaultValues?.allergies || [],
      additionalInfo: defaultValues?.additionalInfo || '',
    },
  })

  const selectedMedication = watch('medication')
  const currentlyTaking = watch('currentlyTaking')
  const allergies = watch('allergies')

  const addAllergy = () => {
    if (allergyInput.trim() && !allergies.includes(allergyInput.trim())) {
      setValue('allergies', [...allergies, allergyInput.trim()])
      setAllergyInput('')
    }
  }

  const removeAllergy = (allergy: string) => {
    setValue('allergies', allergies.filter((a) => a !== allergy))
  }

  const onSubmit = (data: ScriptIntakeForm) => {
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
      <motion.div 
        className="text-center mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <h2 className="text-2xl md:text-3xl font-bold mb-2 tracking-tight">
          Prescription Request
        </h2>
        <p className="text-muted-foreground">
          {step === 1 && 'Tell us about your medication'}
          {step === 2 && 'Medical history & allergies'}
        </p>
      </motion.div>

      {/* Step 1: Medication Details */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="medication">
              What medication do you need?
            </Label>
            <Input
              id="medication"
              {...register('medication')}
              placeholder="Enter medication name (e.g., Lipitor 20mg)"
              className="touch-target"
            />
            {errors.medication && (
              <p className="text-sm text-destructive">{errors.medication.message}</p>
            )}
            
            {/* Quick select */}
            <div className="flex flex-wrap gap-2 pt-2">
              {COMMON_MEDICATIONS.map((med) => (
                <Badge
                  key={med}
                  variant={selectedMedication === med ? 'default' : 'secondary'}
                  className="cursor-pointer"
                  onClick={() => setValue('medication', med, { shouldValidate: true })}
                >
                  {med}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div
              className={cn(
                'flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all',
                currentlyTaking
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              )}
              onClick={() => setValue('currentlyTaking', true)}
            >
              <Checkbox
                checked={currentlyTaking === true}
                onCheckedChange={() => setValue('currentlyTaking', true)}
              />
              <div>
                <span className="font-medium">I&apos;m currently taking this medication</span>
                <p className="text-sm text-muted-foreground">
                  This is a repeat prescription request
                </p>
              </div>
            </div>

            <div
              className={cn(
                'flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all',
                !currentlyTaking
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              )}
              onClick={() => setValue('currentlyTaking', false)}
            >
              <Checkbox
                checked={currentlyTaking === false}
                onCheckedChange={() => setValue('currentlyTaking', false)}
              />
              <div>
                <span className="font-medium">I&apos;ve taken this before but not currently</span>
                <p className="text-sm text-muted-foreground">
                  Previous medication history
                </p>
              </div>
            </div>
          </div>

          {currentlyTaking && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="lastPrescribed">
                  When was it last prescribed?
                </Label>
                <Input
                  id="lastPrescribed"
                  {...register('lastPrescribed')}
                  placeholder="E.g., 3 months ago"
                  className="touch-target"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prescribingDoctor">
                  Who prescribed it?
                </Label>
                <Input
                  id="prescribingDoctor"
                  {...register('prescribingDoctor')}
                  placeholder="Doctor's name or clinic"
                  className="touch-target"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">
              Why do you need this medication?
            </Label>
            <textarea
              id="reason"
              {...register('reason')}
              className="w-full min-h-[100px] p-3 rounded-lg border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Please describe your condition and why you need this medication..."
            />
            {errors.reason && (
              <p className="text-sm text-destructive">{errors.reason.message}</p>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Allergies & Additional Info */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>
              Do you have any allergies?
            </Label>
            <div className="flex gap-2">
              <Input
                value={allergyInput}
                onChange={(e) => setAllergyInput(e.target.value)}
                placeholder="Enter allergy (e.g., Penicillin)"
                className="touch-target"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addAllergy()
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="touch-target flex-shrink-0"
                onClick={addAllergy}
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
            
            {allergies.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {allergies.map((allergy) => (
                  <Badge
                    key={allergy}
                    variant="destructive"
                    className="gap-1"
                  >
                    {allergy}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeAllergy(allergy)}
                    />
                  </Badge>
                ))}
              </div>
            )}
            
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="w-3 h-3" />
              Press Enter or click + to add each allergy
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="additionalInfo">
              Any other medical history the doctor should know? (Optional)
            </Label>
            <textarea
              id="additionalInfo"
              {...register('additionalInfo')}
              className="w-full min-h-[120px] p-3 rounded-lg border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="E.g., Other medications you're taking, medical conditions, pregnancy status..."
            />
          </div>

          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Important:</strong> Our doctors can only prescribe 
              medications that are appropriate for telehealth consultations. S8 (controlled) 
              substances cannot be prescribed through this service.
            </p>
          </div>
        </div>
      )}

      {/* Navigation - Glassmorphism footer */}
      <div className="fixed bottom-0 left-0 right-0 md:relative md:bottom-auto md:left-auto md:right-auto bg-white/95 backdrop-blur-md border-t md:border-t-0 border-slate-200/50 p-4 md:p-0 md:bg-transparent md:backdrop-blur-none dark:bg-slate-900/95 dark:border-slate-700/50">
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
          
          {step < 2 ? (
            <Button
              type="button"
              size="lg"
              className="flex-1 h-11 md:h-12 min-h-[44px] text-base bg-teal-600 hover:bg-teal-700 text-white"
              onClick={nextIntakeStep}
              disabled={!selectedMedication || !watch('reason')}
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

