'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  Tooltip, 
  TooltipContent, 
  TooltipTrigger 
} from '@/components/ui/tooltip'
import { HelpCircle } from 'lucide-react'
import type { QuestionConfig } from '@/lib/onboarding/types'

interface QuestionFieldProps {
  question: QuestionConfig
  value: unknown
  onChange: (value: unknown) => void
  error?: string
  className?: string
}

export function QuestionField({
  question,
  value,
  onChange,
  error,
  className,
}: QuestionFieldProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  const renderLabel = () => (
    <div className="flex items-start gap-2 mb-2">
      <Label 
        htmlFor={question.id}
        className={cn(
          'text-base font-medium leading-relaxed',
          question.required && "after:content-['*'] after:ml-0.5 after:text-destructive"
        )}
      >
        {question.question}
      </Label>
      {question.whyWeAsk && (
        <Tooltip open={showTooltip} onOpenChange={setShowTooltip}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setShowTooltip(!showTooltip)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            <p className="text-sm">{question.whyWeAsk}</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )

  const renderDescription = () => (
    question.description && (
      <p className="text-sm text-muted-foreground mb-3">
        {question.description}
      </p>
    )
  )

  const renderError = () => (
    error && (
      <p className="text-sm text-destructive mt-2">{error}</p>
    )
  )

  const renderField = () => {
    switch (question.type) {
      case 'text':
        return (
          <Input
            id={question.id}
            type="text"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder}
            className={cn(error && 'border-destructive')}
          />
        )

      case 'textarea':
        return (
          <Textarea
            id={question.id}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder}
            className={cn('min-h-[100px]', error && 'border-destructive')}
          />
        )

      case 'number':
        return (
          <Input
            id={question.id}
            type="number"
            value={(value as number) || ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
            placeholder={question.placeholder}
            min={question.min}
            max={question.max}
            className={cn('max-w-[200px]', error && 'border-destructive')}
          />
        )

      case 'date':
        return (
          <Input
            id={question.id}
            type="date"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            className={cn('max-w-[200px]', error && 'border-destructive')}
          />
        )

      case 'select':
        return (
          <Select
            value={(value as string) || ''}
            onValueChange={onChange}
          >
            <SelectTrigger className={cn('w-full', error && 'border-destructive')}>
              <SelectValue placeholder={question.placeholder || 'Select an option'} />
            </SelectTrigger>
            <SelectContent>
              {question.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'radio':
        return (
          <RadioGroup
            value={(value as string) || ''}
            onValueChange={onChange}
            className="space-y-3"
          >
            {question.options?.map((option) => (
              <label
                key={option.value}
                className={cn(
                  'flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all',
                  'hover:border-primary/50 hover:bg-primary/5',
                  value === option.value 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border'
                )}
              >
                <RadioGroupItem value={option.value} id={`${question.id}-${option.value}`} />
                <div className="flex-1">
                  <span className="font-medium">{option.label}</span>
                  {option.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {option.description}
                    </p>
                  )}
                </div>
              </label>
            ))}
          </RadioGroup>
        )

      case 'boolean':
        return (
          <RadioGroup
            value={value === true ? 'yes' : value === false ? 'no' : ''}
            onValueChange={(v) => onChange(v === 'yes')}
            className="flex gap-4"
          >
            <label
              className={cn(
                'flex items-center gap-2 px-6 py-3 rounded-lg border cursor-pointer transition-all',
                'hover:border-primary/50',
                value === true ? 'border-primary bg-primary/5' : 'border-border'
              )}
            >
              <RadioGroupItem value="yes" id={`${question.id}-yes`} />
              <span className="font-medium">Yes</span>
            </label>
            <label
              className={cn(
                'flex items-center gap-2 px-6 py-3 rounded-lg border cursor-pointer transition-all',
                'hover:border-primary/50',
                value === false ? 'border-primary bg-primary/5' : 'border-border'
              )}
            >
              <RadioGroupItem value="no" id={`${question.id}-no`} />
              <span className="font-medium">No</span>
            </label>
          </RadioGroup>
        )

      case 'checkbox':
      case 'multiselect':
        const selectedValues = (value as string[]) || []
        return (
          <div className="space-y-3">
            {question.options?.map((option) => (
              <label
                key={option.value}
                className={cn(
                  'flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all',
                  'hover:border-primary/50 hover:bg-primary/5',
                  selectedValues.includes(option.value)
                    ? 'border-primary bg-primary/5'
                    : 'border-border'
                )}
              >
                <Checkbox
                  checked={selectedValues.includes(option.value)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      // If selecting "none", clear others
                      if (option.value === 'none') {
                        onChange(['none'])
                      } else {
                        // Remove "none" if selecting other option
                        const filtered = selectedValues.filter(v => v !== 'none')
                        onChange([...filtered, option.value])
                      }
                    } else {
                      onChange(selectedValues.filter((v) => v !== option.value))
                    }
                  }}
                />
                <div className="flex-1">
                  <span className="font-medium">{option.label}</span>
                  {option.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {option.description}
                    </p>
                  )}
                </div>
              </label>
            ))}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      {renderLabel()}
      {renderDescription()}
      {renderField()}
      {renderError()}
    </div>
  )
}
