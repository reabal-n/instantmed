'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, ArrowLeft, Eye, EyeOff, Mail, Lock, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { accountSchema, type AccountForm } from '@/lib/validations'

interface AccountCreationProps {
  onNext: (data: AccountForm) => void
  onBack: () => void
  isLoading?: boolean
  error?: string
}

export function AccountCreation({ onNext, onBack, isLoading, error }: AccountCreationProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AccountForm>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  const password = watch('password')

  // Password requirements
  const requirements = [
    { label: 'At least 8 characters', met: password?.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password || '') },
    { label: 'One lowercase letter', met: /[a-z]/.test(password || '') },
    { label: 'One number', met: /[0-9]/.test(password || '') },
  ]

  const onSubmit = (data: AccountForm) => {
    onNext(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 animate-slide-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold mb-2">
          Create Your Account
        </h2>
        <p className="text-muted-foreground">
          Save your progress and receive your documents
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="you@example.com"
              className="pl-10 touch-target"
              autoComplete="email"
            />
          </div>
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              {...register('password')}
              placeholder="Create a strong password"
              className="pl-10 pr-10 touch-target"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
          
          {/* Password requirements */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            {requirements.map((req, idx) => (
              <div
                key={idx}
                className={cn(
                  'flex items-center gap-2 text-xs transition-colors',
                  req.met ? 'text-green-600' : 'text-muted-foreground'
                )}
              >
                <CheckCircle2 className={cn('h-3.5 w-3.5', req.met && 'fill-green-600 text-white')} />
                {req.label}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              {...register('confirmPassword')}
              placeholder="Confirm your password"
              className="pl-10 pr-10 touch-target"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>
      </div>

      <div className="p-4 rounded-lg bg-muted/50 border border-border">
        <p className="text-sm text-muted-foreground">
          By creating an account, you agree to our{' '}
          <a href="/terms" className="text-primary hover:underline">Terms of Service</a>
          {' '}and{' '}
          <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.
        </p>
      </div>

      {/* Navigation */}
      <div className="sticky-bottom-button flex gap-3">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="touch-target"
          onClick={onBack}
          disabled={isLoading}
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Back
        </Button>
        
        <Button
          type="submit"
          size="lg"
          className="flex-1 touch-target text-base"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creating Account...
            </span>
          ) : (
            <>
              Create Account
              <ArrowRight className="ml-2 h-5 w-5" />
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

