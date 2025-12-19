import { z } from 'zod'

// Medicare number validation (Australian format: 10 digits + 1 IRN digit)
// Format: XXXX XXXXX X (with or without spaces)
export const medicareNumberSchema = z
  .string()
  .transform((val) => val.replace(/\s/g, ''))
  .refine(
    (val) => /^\d{10}$/.test(val),
    'Medicare number must be exactly 10 digits'
  )
  .refine(
    (val) => {
      // Luhn check for Medicare numbers
      const weights = [1, 3, 7, 9, 1, 3, 7, 9]
      const digits = val.slice(0, 8).split('').map(Number)
      const checkDigit = parseInt(val[8])
      
      const sum = digits.reduce((acc, digit, idx) => acc + digit * weights[idx], 0)
      const calculatedCheck = sum % 10
      
      return calculatedCheck === checkDigit
    },
    'Invalid Medicare number'
  )

export const medicareIrnSchema = z
  .number()
  .min(1, 'IRN must be between 1 and 9')
  .max(9, 'IRN must be between 1 and 9')

export const medicareExpirySchema = z
  .string()
  .regex(/^\d{2}\/\d{4}$/, 'Expiry must be in MM/YYYY format')
  .refine((val) => {
    const [month, year] = val.split('/').map(Number)
    if (month < 1 || month > 12) return false
    
    const expiry = new Date(year, month - 1, 1)
    const today = new Date()
    today.setDate(1)
    today.setHours(0, 0, 0, 0)
    
    return expiry >= today
  }, 'Medicare card has expired')

// Service selection schema
export const serviceSelectionSchema = z.object({
  serviceType: z.enum(['sick_cert', 'prescription']),
})

// Medical certificate intake form schema
export const medCertIntakeSchema = z.object({
  symptoms: z
    .array(z.string())
    .min(1, 'Please select at least one symptom'),
  symptomDetails: z
    .string()
    .min(10, 'Please provide more details about your symptoms')
    .max(1000, 'Description is too long'),
  startDate: z.string().refine((val) => {
    const date = new Date(val)
    return !isNaN(date.getTime())
  }, 'Please select a valid date'),
  duration: z.enum(['1', '2', '3', '4', '5', '7', '14', 'other']),
  customDuration: z.string().optional(),
  workType: z.string().min(1, 'Please describe your work type'),
  additionalInfo: z.string().max(500).optional(),
})

// Prescription intake form schema
export const scriptIntakeSchema = z.object({
  medication: z
    .string()
    .min(2, 'Please enter the medication name')
    .max(200, 'Medication name is too long'),
  currentlyTaking: z.boolean(),
  lastPrescribed: z.string().optional(),
  prescribingDoctor: z.string().optional(),
  reason: z
    .string()
    .min(10, 'Please provide more details')
    .max(500, 'Description is too long'),
  allergies: z.array(z.string()),
  additionalInfo: z.string().max(500).optional(),
})

// Account creation schema
export const accountSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

// Patient details schema (with Medicare)
export const patientDetailsSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name is too long'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name is too long'),
  dateOfBirth: z.string().refine((val) => {
    const date = new Date(val)
    if (isNaN(date.getTime())) return false
    
    // Must be at least 18 years old
    const today = new Date()
    const age = today.getFullYear() - date.getFullYear()
    const monthDiff = today.getMonth() - date.getMonth()
    const dayDiff = today.getDate() - date.getDate()
    
    const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age
    return actualAge >= 18
  }, 'You must be at least 18 years old'),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']),
  medicareNumber: z
    .string()
    .transform((val) => val.replace(/\s/g, ''))
    .refine((val) => /^\d{10}$/.test(val), 'Medicare number must be 10 digits'),
  medicareIrn: z
    .string()
    .refine((val) => /^[1-9]$/.test(val), 'IRN must be a single digit 1-9'),
  medicareExpiry: z
    .string()
    .regex(/^\d{2}\/\d{4}$/, 'Format: MM/YYYY'),
})

// Login schema
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

// Type exports
export type ServiceSelectionForm = z.infer<typeof serviceSelectionSchema>
export type MedCertIntakeForm = z.infer<typeof medCertIntakeSchema>
export type ScriptIntakeForm = z.infer<typeof scriptIntakeSchema>
export type AccountForm = z.infer<typeof accountSchema>
export type PatientDetailsForm = z.infer<typeof patientDetailsSchema>
export type LoginForm = z.infer<typeof loginSchema>
