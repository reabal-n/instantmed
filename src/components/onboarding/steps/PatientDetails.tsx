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
        <h2 className="text-2xl md:text-3xl font-bold mb-2 tracking-tight">
          Patient Details
        </h2>
        <p className="text-muted-foreground">
          We need these details for your medical certificate
        </p>
      </motion.div>

      {/* Personal Information */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <User className="w-4 h-4" />
          Personal Information
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              {...register('firstName')}
              placeholder="Enter your first name"
              className="touch-target"
            />
            {errors.firstName && (
              <p className="text-sm text-destructive">{errors.firstName.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              {...register('lastName')}
              placeholder="Enter your last name"
              className="touch-target"
            />
            {errors.lastName && (
              <p className="text-sm text-destructive">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Input
              id="dateOfBirth"
              type="date"
              {...register('dateOfBirth')}
              className="touch-target"
            />
            {errors.dateOfBirth && (
              <p className="text-sm text-destructive">{errors.dateOfBirth.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label>Gender</Label>
            <Select
              value={gender}
              onValueChange={(value) => setValue('gender', value as PatientDetailsForm['gender'], { shouldValidate: true })}
            >
              <SelectTrigger className="touch-target">
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
      <div className="space-y-4 pt-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <CreditCard className="w-4 h-4" />
          Medicare Details
        </div>
        
        <div className="p-4 rounded-lg bg-muted/50 border border-border">
          <p className="text-sm text-muted-foreground flex items-start gap-2">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            Medicare details help verify your identity and may enable PBS benefits on prescriptions.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="medicareNumber">Medicare Card Number</Label>
          <Input
            id="medicareNumber"
            {...register('medicareNumber')}
            placeholder="1234 56789 0"
            className={cn('touch-target medicare-input', errors.medicareNumber && 'border-destructive')}
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
            <Label htmlFor="medicareIrn">Reference Number (IRN)</Label>
            <Input
              id="medicareIrn"
              {...register('medicareIrn')}
              placeholder="1-9"
              maxLength={1}
              className="touch-target"
            />
            {errors.medicareIrn && (
              <p className="text-sm text-destructive">{errors.medicareIrn.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              The number next to your name on the card
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="medicareExpiry">Expiry Date</Label>
            <Input
              id="medicareExpiry"
              {...register('medicareExpiry')}
              placeholder="MM/YYYY"
              className="touch-target"
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
        <div className="p-4 rounded-lg bg-gradient-to-r from-green-600 to-green-700 text-white">
          <div className="text-xs opacity-80 mb-2">Medicare Card Preview</div>
          <div className="font-mono text-lg tracking-wider mb-2">
            {watch('medicareNumber') || 'XXXX XXXXX X'}
          </div>
          <div className="flex justify-between text-sm">
            <span>{watch('firstName') || 'FIRST'} {watch('lastName') || 'LAST'}</span>
            <span>Ref: {watch('medicareIrn') || 'X'}</span>
          </div>
          <div className="text-xs mt-2 opacity-80">
            Valid to: {watch('medicareExpiry') || 'MM/YYYY'}
          </div>
        </div>
      </div>

      {/* Navigation - Glassmorphism footer */}
      <div className="fixed bottom-0 left-0 right-0 md:relative md:bottom-auto md:left-auto md:right-auto bg-white/95 backdrop-blur-md border-t md:border-t-0 border-slate-200/50 p-4 md:p-0 md:bg-transparent md:backdrop-blur-none dark:bg-slate-900/95 dark:border-slate-700/50">
        <div className="flex gap-3 max-w-xl mx-auto">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-11 md:h-12 min-h-[44px]"
            onClick={onBack}
            disabled={isLoading}
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Back
          </Button>
          
          <Button
            type="submit"
            size="lg"
            className="flex-1 h-11 md:h-12 min-h-[44px] text-base bg-teal-600 hover:bg-teal-700 text-white"
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

