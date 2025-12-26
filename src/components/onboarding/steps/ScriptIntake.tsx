'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, ArrowLeft, Info, Plus, X, CheckCircle2, AlertTriangle, Pill } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
      {/* Header with step indicator */}
      <motion.div 
        className="text-center mb-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 text-purple-600 text-sm font-medium mb-4">
          <Pill className="w-4 h-4" />
          <span>Step {step} of 2</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold mb-2 text-slate-900">
          {step === 1 && 'What medication do you need?'}
          {step === 2 && 'Quick health check'}
        </h2>
        <p className="text-slate-500">
          {step === 1 && "Tell us about your prescription — we'll get it to your pharmacy"}
          {step === 2 && 'Just a few safety questions for the doctor'}
        </p>
      </motion.div>

      {/* Step 1: Medication Details */}
      {step === 1 && (
        <motion.div 
          className="space-y-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <div className="space-y-3">
            <Label htmlFor="medication" className="text-slate-700 font-medium">
              Medication name
            </Label>
            <p className="text-sm text-slate-400">
              Include the strength if you know it (e.g., Lipitor 20mg)
            </p>
            <Input
              id="medication"
              {...register('medication')}
              placeholder="Start typing your medication..."
              className="h-12 rounded-xl border-2 border-slate-100 focus:border-teal-500 focus:ring-0"
            />
            {errors.medication && (
              <p className="text-sm text-red-500 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Please enter the medication name
              </p>
            )}
            
            {/* Quick select */}
            <div className="pt-2">
              <p className="text-xs text-slate-400 mb-2">Common medications:</p>
              <div className="flex flex-wrap gap-2">
                {COMMON_MEDICATIONS.map((med) => (
                  <Badge
                    key={med}
                    variant="secondary"
                    className={cn(
                      "cursor-pointer transition-colors",
                      selectedMedication === med 
                        ? 'bg-purple-100 text-purple-700 hover:bg-purple-100' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}
                    onClick={() => setValue('medication', med, { shouldValidate: true })}
                  >
                    {med}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-slate-700 font-medium">Are you currently taking this?</Label>
            <div className="grid gap-3">
              <motion.div
                className={cn(
                  'flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all',
                  currentlyTaking
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-slate-100 hover:border-teal-200 bg-white'
                )}
                onClick={() => setValue('currentlyTaking', true)}
                whileTap={{ scale: 0.98 }}
              >
                <div className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                  currentlyTaking ? 'border-teal-500 bg-teal-500' : 'border-slate-300'
                )}>
                  {currentlyTaking && <CheckCircle2 className="w-3 h-3 text-white" />}
                </div>
                <div>
                  <span className="font-medium text-slate-700">Yes, I take this regularly</span>
                  <p className="text-sm text-slate-500">
                    This is a repeat prescription
                  </p>
                </div>
              </motion.div>

              <motion.div
                className={cn(
                  'flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all',
                  !currentlyTaking
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-slate-100 hover:border-teal-200 bg-white'
                )}
                onClick={() => setValue('currentlyTaking', false)}
                whileTap={{ scale: 0.98 }}
              >
                <div className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                  !currentlyTaking ? 'border-teal-500 bg-teal-500' : 'border-slate-300'
                )}>
                  {!currentlyTaking && <CheckCircle2 className="w-3 h-3 text-white" />}
                </div>
                <div>
                  <span className="font-medium text-slate-700">I&apos;ve taken it before</span>
                  <p className="text-sm text-slate-500">
                    Not currently, but I have history with this medication
                  </p>
                </div>
              </motion.div>
            </div>
          </div>

          {currentlyTaking && (
            <motion.div 
              className="grid gap-4 md:grid-cols-2"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              <div className="space-y-2">
                <Label htmlFor="lastPrescribed" className="text-slate-700 font-medium">
                  Last prescribed?
                </Label>
                <Input
                  id="lastPrescribed"
                  {...register('lastPrescribed')}
                  placeholder="e.g., 3 months ago"
                  className="h-12 rounded-xl border-2 border-slate-100 focus:border-teal-500 focus:ring-0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prescribingDoctor" className="text-slate-700 font-medium">
                  Who prescribed it?
                </Label>
                <Input
                  id="prescribingDoctor"
                  {...register('prescribingDoctor')}
                  placeholder="Doctor or clinic name"
                  className="h-12 rounded-xl border-2 border-slate-100 focus:border-teal-500 focus:ring-0"
                />
              </div>
            </motion.div>
          )}

          <div className="space-y-3">
            <Label htmlFor="reason" className="text-slate-700 font-medium">
              Why do you need this medication?
            </Label>
            <p className="text-sm text-slate-400">
              Briefly explain your condition or reason for the prescription
            </p>
            <textarea
              id="reason"
              {...register('reason')}
              className="w-full min-h-[100px] p-4 rounded-xl border-2 border-slate-100 bg-white resize-none focus:outline-none focus:ring-0 focus:border-teal-500 transition-colors text-slate-700 placeholder:text-slate-400"
              placeholder="e.g., I have high blood pressure and have been taking this medication for 2 years..."
            />
            {errors.reason && (
              <p className="text-sm text-red-500 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Please explain why you need this medication
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* Step 2: Allergies & Additional Info */}
      {step === 2 && (
        <motion.div 
          className="space-y-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <div className="space-y-3">
            <Label className="text-slate-700 font-medium">
              Any allergies we should know about?
            </Label>
            <p className="text-sm text-slate-400">
              Type each allergy and press Enter or tap + to add
            </p>
            <div className="flex gap-2">
              <Input
                value={allergyInput}
                onChange={(e) => setAllergyInput(e.target.value)}
                placeholder="e.g., Penicillin"
                className="h-12 rounded-xl border-2 border-slate-100 focus:border-teal-500 focus:ring-0"
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
                className="h-12 w-12 rounded-xl border-2 border-slate-100 hover:border-teal-200 flex-shrink-0"
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
                    className="gap-1.5 bg-red-100 text-red-700 hover:bg-red-100"
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

            {allergies.length === 0 && (
              <p className="text-sm text-slate-400 italic">
                No allergies added — that&apos;s okay if you don&apos;t have any
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Label htmlFor="additionalInfo" className="text-slate-700 font-medium">
              Anything else the doctor should know?
            </Label>
            <p className="text-sm text-slate-400">
              Other medications, conditions, or relevant health info
            </p>
            <textarea
              id="additionalInfo"
              {...register('additionalInfo')}
              className="w-full min-h-[120px] p-4 rounded-xl border-2 border-slate-100 bg-white resize-none focus:outline-none focus:ring-0 focus:border-teal-500 transition-colors text-slate-700 placeholder:text-slate-400"
              placeholder="e.g., I'm also taking blood thinners, or I'm pregnant..."
            />
          </div>

          {/* Important notice */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-100">
            <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-800">
                <strong>Good to know:</strong> Some medications (like S8 controlled substances) 
                can&apos;t be prescribed online. Our doctor will let you know if you need to see someone in person.
              </p>
            </div>
          </div>

          {/* Reassurance */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-teal-50 border border-teal-100">
            <CheckCircle2 className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-teal-800">
                Your prescription will be sent directly to your chosen pharmacy via eScript.
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
              disabled={!selectedMedication || !watch('reason')}
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
