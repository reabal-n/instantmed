'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  Check,
  Pill,
  Clock,
  AlertTriangle,
  Info,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Plus,
} from 'lucide-react'
import { FlowContent } from '../flow-content'
import { MedicationSearch, type MedicationSelection } from '../medication-search'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useFlowStore, useFlowAnswers } from '@/lib/flow'
import { cn } from '@/lib/utils'

// ============================================
// TYPES
// ============================================

interface PrescriptionData {
  prescriptionType: 'repeat' | 'new' | null
  medication: MedicationSelection | null
  condition: string
  duration: string
  controlLevel: 'well_controlled' | 'somewhat_controlled' | 'not_controlled' | null
  sideEffects: 'none' | 'mild' | 'moderate' | 'severe' | null
  symptoms: string
  lastPrescribed: string
  prescribingDoctor: string
  pharmacyPreference: 'e_script' | 'pharmacy' | null
  pharmacyName: string
  allergies: string[]
  additionalInfo: string
}

interface AccordionSectionProps {
  id: string
  title: string
  isOpen: boolean
  isComplete: boolean
  onClick: () => void
  children: React.ReactNode
  badge?: string
}

// ============================================
// ACCORDION SECTION
// ============================================

function AccordionSection({
  id,
  title,
  isOpen,
  isComplete,
  onClick,
  children,
  badge,
}: AccordionSectionProps) {
  return (
    <div
      className={cn(
        'border-2 rounded-xl overflow-hidden transition-all',
        isOpen ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-200 bg-white'
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold',
              isComplete
                ? 'bg-emerald-500 text-white'
                : isOpen
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-100 text-slate-500'
            )}
          >
            {isComplete ? <Check className="w-4 h-4" /> : id}
          </div>
          <span
            className={cn(
              'font-medium',
              isOpen ? 'text-slate-900' : 'text-slate-700'
            )}
          >
            {title}
          </span>
          {badge && !isComplete && (
            <Badge variant="secondary" className="text-xs">
              {badge}
            </Badge>
          )}
        </div>
        <ChevronDown
          className={cn(
            'w-5 h-5 text-slate-400 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 pb-4 pt-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

interface PrescriptionDetailsStepProps {
  onComplete?: () => void
}

export function PrescriptionDetailsStep({ onComplete }: PrescriptionDetailsStepProps) {
  const answers = useFlowAnswers()
  const { updateAnswer, nextStep } = useFlowStore()

  // Form state
  const [data, setData] = useState<PrescriptionData>({
    prescriptionType: (answers.prescriptionType as 'repeat' | 'new') || null,
    medication: (answers.medication as MedicationSelection) || null,
    condition: (answers.condition as string) || '',
    duration: (answers.duration as string) || '',
    controlLevel: (answers.controlLevel as PrescriptionData['controlLevel']) || null,
    sideEffects: (answers.sideEffects as PrescriptionData['sideEffects']) || null,
    symptoms: (answers.symptoms as string) || '',
    lastPrescribed: (answers.lastPrescribed as string) || '',
    prescribingDoctor: (answers.prescribingDoctor as string) || '',
    pharmacyPreference: (answers.pharmacyPreference as 'e_script' | 'pharmacy') || null,
    pharmacyName: (answers.pharmacyName as string) || '',
    allergies: (answers.allergies as string[]) || [],
    additionalInfo: (answers.additionalInfo as string) || '',
  })

  // Accordion state
  const [openSection, setOpenSection] = useState<number>(1)

  // Update store when data changes
  useEffect(() => {
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        updateAnswer(key, value)
      }
    })
  }, [data, updateAnswer])

  // Helper to update data
  const updateData = <K extends keyof PrescriptionData>(
    key: K,
    value: PrescriptionData[K]
  ) => {
    setData((prev) => ({ ...prev, [key]: value }))
  }

  // Section completion checks
  const isSectionComplete = (section: number): boolean => {
    switch (section) {
      case 1:
        return data.prescriptionType !== null
      case 2:
        return data.medication !== null
      case 3:
        return (
          data.condition.trim().length > 0 &&
          data.controlLevel !== null
        )
      case 4:
        return data.pharmacyPreference !== null
      default:
        return false
    }
  }

  // Can continue?
  const canContinue = useMemo(() => {
    return (
      data.prescriptionType !== null &&
      data.medication !== null &&
      data.condition.trim().length > 0 &&
      data.controlLevel !== null &&
      data.pharmacyPreference !== null
    )
  }, [data])

  // Handle continue
  const handleContinue = () => {
    if (canContinue) {
      onComplete?.()
      nextStep()
    }
  }

  // Auto-advance sections
  useEffect(() => {
    if (isSectionComplete(openSection) && openSection < 4) {
      const timer = setTimeout(() => {
        setOpenSection(openSection + 1)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [data, openSection])

  return (
    <FlowContent
      title="Prescription details"
      description="Tell us about the medication you need"
    >
      <div className="space-y-4">
        {/* Section 1: Prescription Type */}
        <AccordionSection
          id="1"
          title="Prescription type"
          isOpen={openSection === 1}
          isComplete={isSectionComplete(1)}
          onClick={() => setOpenSection(openSection === 1 ? 0 : 1)}
        >
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => updateData('prescriptionType', 'repeat')}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                data.prescriptionType === 'repeat'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-slate-200 hover:border-slate-300'
              )}
            >
              <RefreshCw
                className={cn(
                  'w-6 h-6',
                  data.prescriptionType === 'repeat'
                    ? 'text-emerald-600'
                    : 'text-slate-400'
                )}
              />
              <span className="font-medium text-slate-900">Repeat</span>
              <span className="text-xs text-slate-500 text-center">
                I take this regularly
              </span>
            </button>

            <button
              type="button"
              onClick={() => updateData('prescriptionType', 'new')}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                data.prescriptionType === 'new'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-slate-200 hover:border-slate-300'
              )}
            >
              <Plus
                className={cn(
                  'w-6 h-6',
                  data.prescriptionType === 'new'
                    ? 'text-emerald-600'
                    : 'text-slate-400'
                )}
              />
              <span className="font-medium text-slate-900">New</span>
              <span className="text-xs text-slate-500 text-center">
                First time or been a while
              </span>
            </button>
          </div>

          {/* Repeat prescription extra fields */}
          {data.prescriptionType === 'repeat' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4 grid gap-3 sm:grid-cols-2"
            >
              <div>
                <Label className="text-sm text-slate-600">Last prescribed</Label>
                <Input
                  value={data.lastPrescribed}
                  onChange={(e) => updateData('lastPrescribed', e.target.value)}
                  placeholder="e.g., 3 months ago"
                  className="mt-1 h-11"
                />
              </div>
              <div>
                <Label className="text-sm text-slate-600">Prescribing doctor</Label>
                <Input
                  value={data.prescribingDoctor}
                  onChange={(e) => updateData('prescribingDoctor', e.target.value)}
                  placeholder="Doctor or clinic name"
                  className="mt-1 h-11"
                />
              </div>
            </motion.div>
          )}
        </AccordionSection>

        {/* Section 2: Medication */}
        <AccordionSection
          id="2"
          title="Medication"
          isOpen={openSection === 2}
          isComplete={isSectionComplete(2)}
          onClick={() => setOpenSection(openSection === 2 ? 0 : 2)}
          badge={data.prescriptionType ? undefined : 'Complete step 1 first'}
        >
          <div className="space-y-4">
            <MedicationSearch
              value={data.medication}
              onChange={(med) => updateData('medication', med)}
              placeholder="Search by name or brand..."
              disabled={!data.prescriptionType}
            />

            {/* Quick common medications */}
            {!data.medication && (
              <div>
                <p className="text-xs text-slate-500 mb-2">Common medications:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Blood pressure',
                    'Cholesterol',
                    'Thyroid',
                    'Contraception',
                    'Asthma',
                  ].map((label) => (
                    <Badge
                      key={label}
                      variant="secondary"
                      className="cursor-pointer hover:bg-slate-200"
                      onClick={() => {
                        // This would ideally search for this category
                        updateData('medication', {
                          medicationId: null,
                          name: label + ' medication',
                          isManualEntry: true,
                        })
                      }}
                    >
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </AccordionSection>

        {/* Section 3: Health Details */}
        <AccordionSection
          id="3"
          title="Health details"
          isOpen={openSection === 3}
          isComplete={isSectionComplete(3)}
          onClick={() => setOpenSection(openSection === 3 ? 0 : 3)}
          badge={data.medication ? undefined : 'Complete step 2 first'}
        >
          <div className="space-y-5">
            {/* Condition */}
            <div>
              <Label className="text-sm font-medium text-slate-700">
                What condition is this for? *
              </Label>
              <Input
                value={data.condition}
                onChange={(e) => updateData('condition', e.target.value)}
                placeholder="e.g., High blood pressure, asthma, anxiety"
                className="mt-1.5 h-11"
                disabled={!data.medication}
              />
            </div>

            {/* Compact grid for key questions */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* How long taking */}
              <div>
                <Label className="text-sm font-medium text-slate-700">
                  How long have you been taking this?
                </Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {['< 3 months', '3-12 months', '1-5 years', '5+ years'].map(
                    (opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => updateData('duration', opt)}
                        className={cn(
                          'px-3 py-1.5 text-sm rounded-lg border transition-colors',
                          data.duration === opt
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 hover:border-slate-300 text-slate-600'
                        )}
                      >
                        {opt}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Control level */}
              <div>
                <Label className="text-sm font-medium text-slate-700">
                  How well controlled? *
                </Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[
                    { value: 'well_controlled', label: 'Well', color: 'emerald' },
                    { value: 'somewhat_controlled', label: 'Okay', color: 'amber' },
                    { value: 'not_controlled', label: 'Poor', color: 'red' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        updateData(
                          'controlLevel',
                          opt.value as PrescriptionData['controlLevel']
                        )
                      }
                      className={cn(
                        'px-3 py-1.5 text-sm rounded-lg border transition-colors',
                        data.controlLevel === opt.value
                          ? opt.color === 'emerald'
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : opt.color === 'amber'
                            ? 'border-amber-500 bg-amber-50 text-amber-700'
                            : 'border-red-500 bg-red-50 text-red-700'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Side effects */}
              <div className="sm:col-span-2">
                <Label className="text-sm font-medium text-slate-700">
                  Any side effects?
                </Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[
                    { value: 'none', label: 'None' },
                    { value: 'mild', label: 'Mild' },
                    { value: 'moderate', label: 'Moderate' },
                    { value: 'severe', label: 'Severe' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        updateData(
                          'sideEffects',
                          opt.value as PrescriptionData['sideEffects']
                        )
                      }
                      className={cn(
                        'px-3 py-1.5 text-sm rounded-lg border transition-colors',
                        data.sideEffects === opt.value
                          ? opt.value === 'severe'
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : opt.value === 'moderate'
                            ? 'border-amber-500 bg-amber-50 text-amber-700'
                            : 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Symptoms (conditional - show if poor control or side effects) */}
            {(data.controlLevel === 'not_controlled' ||
              data.sideEffects === 'moderate' ||
              data.sideEffects === 'severe') && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <Label className="text-sm font-medium text-slate-700">
                  Please describe your symptoms or concerns
                </Label>
                <textarea
                  value={data.symptoms}
                  onChange={(e) => updateData('symptoms', e.target.value)}
                  placeholder="Tell us more so the doctor can help..."
                  className="mt-1.5 w-full min-h-[80px] p-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-0 resize-none text-sm"
                />
              </motion.div>
            )}

            {/* Additional info */}
            <div>
              <Label className="text-sm font-medium text-slate-700">
                Anything else? (allergies, other meds)
              </Label>
              <textarea
                value={data.additionalInfo}
                onChange={(e) => updateData('additionalInfo', e.target.value)}
                placeholder="e.g., Also taking blood thinners, allergic to penicillin..."
                className="mt-1.5 w-full min-h-[60px] p-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-0 resize-none text-sm"
              />
            </div>
          </div>
        </AccordionSection>

        {/* Section 4: Delivery */}
        <AccordionSection
          id="4"
          title="How to receive"
          isOpen={openSection === 4}
          isComplete={isSectionComplete(4)}
          onClick={() => setOpenSection(openSection === 4 ? 0 : 4)}
          badge={isSectionComplete(3) ? undefined : 'Complete step 3 first'}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => updateData('pharmacyPreference', 'e_script')}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                  data.pharmacyPreference === 'e_script'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-200 hover:border-slate-300'
                )}
              >
                <Pill
                  className={cn(
                    'w-6 h-6',
                    data.pharmacyPreference === 'e_script'
                      ? 'text-emerald-600'
                      : 'text-slate-400'
                  )}
                />
                <span className="font-medium text-slate-900 text-sm">E-script</span>
                <span className="text-xs text-slate-500 text-center">
                  Sent to your phone
                </span>
              </button>

              <button
                type="button"
                onClick={() => updateData('pharmacyPreference', 'pharmacy')}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                  data.pharmacyPreference === 'pharmacy'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-200 hover:border-slate-300'
                )}
              >
                <Clock
                  className={cn(
                    'w-6 h-6',
                    data.pharmacyPreference === 'pharmacy'
                      ? 'text-emerald-600'
                      : 'text-slate-400'
                  )}
                />
                <span className="font-medium text-slate-900 text-sm">Pharmacy</span>
                <span className="text-xs text-slate-500 text-center">
                  Sent directly there
                </span>
              </button>
            </div>

            {data.pharmacyPreference === 'pharmacy' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <Label className="text-sm text-slate-600">Pharmacy name & suburb</Label>
                <Input
                  value={data.pharmacyName}
                  onChange={(e) => updateData('pharmacyName', e.target.value)}
                  placeholder="e.g., Chemist Warehouse Bondi"
                  className="mt-1 h-11"
                />
              </motion.div>
            )}
          </div>
        </AccordionSection>

        {/* Info notices */}
        <div className="space-y-3 pt-2">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              Some medications (like Schedule 8 controlled substances) can't be prescribed
              online. The doctor will let you know if an in-person visit is needed.
            </p>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-emerald-800">
              Your script will be sent securely via eScript or directly to your chosen
              pharmacy.
            </p>
          </div>
        </div>

        {/* Continue button */}
        <Button
          onClick={handleContinue}
          disabled={!canContinue}
          className="w-full h-12 mt-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
        >
          Continue
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </FlowContent>
  )
}
