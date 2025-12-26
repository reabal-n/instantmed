'use client'

import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, ArrowLeft, User, CreditCard, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { patientDetailsSchema, type PatientDetailsForm } from '@/lib/validations'

interface PatientDetailsProps {
  onNext: (data: PatientDetailsForm) => void
  onBack: () => void
  isLoading?: boolean
  defaultValues?: Partial<PatientDetailsForm>
}

// Format Medicare number with spaces (XXXX XXXXX X)
const formatMedicareNumber = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 10)
  if (digits.length <= 4) return digits
  if (digits.length <= 9) return `${digits.slice(0, 4)} ${digits.slice(4)}`
  return `${digits.slice(0, 4)} ${digits.slice(4, 9)} ${digits.slice(9)}`
}

// Format Medicare expiry (MM/YYYY)
const formatMedicareExpiry = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 6)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

export function PatientDetails({ onNext, onBack, isLoading, defaultValues }: PatientDetailsProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PatientDetailsForm>({
    resolver: zodResolver(patientDetailsSchema),
    defaultValues: {
      firstName: defaultValues?.firstName || '',
      lastName: defaultValues?.lastName || '',
      dateOfBirth: defaultValues?.dateOfBirth || '',
      gender: defaultValues?.gender,
      medicareNumber: defaultValues?.medicareNumber || '',
      medicareIrn: defaultValues?.medicareIrn || '',
      medicareExpiry: defaultValues?.medicareExpiry || '',
    },
  })

  const gender = watch('gender')

  const onSubmit = (data: PatientDetailsForm) => {
    onNext(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <motion.div 
        className="text-center mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 mb-4 shadow-lg shadow-teal-500/30">
          <User className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold mb-2 tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
          Patient Details
        </h2>
        <p className="text-slate-600">
          We need these details for your medical certificate
        </p>
      </motion.div>

      {/* Personal Information */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-4">
          <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
            <User className="w-4 h-4 text-teal-600" />
          </div>
          Personal Information
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-slate-700 font-medium">First Name</Label>
            <Input
              id="firstName"
              {...register('firstName')}
              placeholder="Enter your first name"
              className="touch-target h-12 rounded-xl border-2 border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 bg-white"
            />
            {errors.firstName && (
              <p className="text-sm text-destructive">{errors.firstName.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-slate-700 font-medium">Last Name</Label>
            <Input
              id="lastName"
              {...register('lastName')}
              placeholder="Enter your last name"
              className="touch-target h-12 rounded-xl border-2 border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 bg-white"
            />
            {errors.lastName && (
              <p className="text-sm text-destructive">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="dateOfBirth" className="text-slate-700 font-medium">Date of Birth</Label>
            <Input
              id="dateOfBirth"
              type="date"
              {...register('dateOfBirth')}
              className="touch-target h-12 rounded-xl border-2 border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 bg-white"
            />
            {errors.dateOfBirth && (
              <p className="text-sm text-destructive">{errors.dateOfBirth.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label className="text-slate-700 font-medium">Gender</Label>
            <Select
              value={gender}
              onValueChange={(value) => setValue('gender', value as PatientDetailsForm['gender'], { shouldValidate: true })}
            >
              <SelectTrigger className="touch-target h-12 rounded-xl border-2 border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 bg-white">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
                <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
            {errors.gender && (
              <p className="text-sm text-destructive">{errors.gender.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Medicare Information */}
      <div className="space-y-4 pt-6 border-t border-slate-200">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-4">
          <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center">
            <CreditCard className="w-4 h-4 text-cyan-600" />
          </div>
          Medicare Details
        </div>
        
        <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-50 to-teal-50 border border-cyan-200/50">
          <p className="text-sm text-slate-700 flex items-start gap-2">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-cyan-600" />
            Medicare details help verify your identity and may enable PBS benefits on prescriptions.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="medicareNumber" className="text-slate-700 font-medium">Medicare Card Number</Label>
          <Input
            id="medicareNumber"
            {...register('medicareNumber')}
            placeholder="1234 56789 0"
            className={cn('touch-target h-12 rounded-xl border-2 bg-white', errors.medicareNumber ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20')}
            onChange={(e) => {
              const formatted = formatMedicareNumber(e.target.value)
              setValue('medicareNumber', formatted, { shouldValidate: true })
            }}
          />
          {errors.medicareNumber && (
            <p className="text-sm text-destructive">{errors.medicareNumber.message}</p>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="medicareIrn" className="text-slate-700 font-medium">Reference Number (IRN)</Label>
            <Input
              id="medicareIrn"
              {...register('medicareIrn')}
              placeholder="1-9"
              maxLength={1}
              className="touch-target h-12 rounded-xl border-2 border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 bg-white"
            />
            {errors.medicareIrn && (
              <p className="text-sm text-destructive">{errors.medicareIrn.message}</p>
            )}
            <p className="text-xs text-slate-500">
              The number next to your name on the card
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="medicareExpiry" className="text-slate-700 font-medium">Expiry Date</Label>
            <Input
              id="medicareExpiry"
              {...register('medicareExpiry')}
              placeholder="MM/YYYY"
              className="touch-target h-12 rounded-xl border-2 border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 bg-white"
              onChange={(e) => {
                const formatted = formatMedicareExpiry(e.target.value)
                setValue('medicareExpiry', formatted, { shouldValidate: true })
              }}
            />
            {errors.medicareExpiry && (
              <p className="text-sm text-destructive">{errors.medicareExpiry.message}</p>
            )}
          </div>
        </div>

        {/* Medicare card visual helper */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-600 via-teal-600 to-green-600 text-white shadow-xl shadow-teal-500/30">
          <div className="text-xs opacity-90 mb-3 font-medium">Medicare Card Preview</div>
          <div className="font-mono text-xl tracking-wider mb-3 font-semibold">
            {watch('medicareNumber') || 'XXXX XXXXX X'}
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">{watch('firstName') || 'FIRST'} {watch('lastName') || 'LAST'}</span>
            <span className="font-medium">Ref: {watch('medicareIrn') || 'X'}</span>
          </div>
          <div className="text-xs mt-3 opacity-90">
            Valid to: {watch('medicareExpiry') || 'MM/YYYY'}
          </div>
        </div>
      </div>

      {/* Navigation - Glassmorphism footer */}
      <div className="fixed bottom-0 left-0 right-0 md:relative md:bottom-auto md:left-auto md:right-auto glass border-t md:border-t-0 border-teal-100/50 p-4 md:p-0 md:bg-transparent md:backdrop-blur-none shadow-lg md:shadow-none">
        <div className="flex gap-3 max-w-xl mx-auto">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-12 min-h-[48px] rounded-xl border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
            onClick={onBack}
            disabled={isLoading}
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Back
          </Button>
          
          <Button
            type="submit"
            size="lg"
            className="flex-1 h-12 min-h-[48px] text-base bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white rounded-xl shadow-lg shadow-teal-500/30 transition-all"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              <>
                Continue to Payment
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  )
}

