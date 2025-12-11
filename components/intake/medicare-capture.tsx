"use client"
import { useState, useCallback } from "react"
import { Check, AlertCircle, Clock, Sparkles } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { validateMedicareNumber, formatMedicareNumber } from "@/lib/validation/medicare"

interface MedicareCaptureProps {
  value: {
    number: string
    irn: number | null
    expiry: string
  }
  onChange: (value: { number: string; irn: number | null; expiry: string }) => void
  savedMedicare?: {
    number: string
    irn: number | null
    expiry?: string
  } | null
  onUseSaved?: () => void
}

export function MedicareCapture({ value, onChange, savedMedicare, onUseSaved }: MedicareCaptureProps) {
  const [numberValid, setNumberValid] = useState(false)
  const [numberError, setNumberError] = useState<string | null>(null)
  const [expiryError, setExpiryError] = useState<string | null>(null)

  // Validate Medicare number in real-time
  const handleNumberChange = useCallback(
    (input: string) => {
      const digits = input.replace(/\D/g, "")

      // Format: XXXX XXXXX X
      let formatted = ""
      for (let i = 0; i < digits.length && i < 10; i++) {
        if (i === 4 || i === 9) formatted += " "
        formatted += digits[i]
      }

      onChange({ ...value, number: formatted })

      // Validation
      if (digits.length === 0) {
        setNumberError(null)
        setNumberValid(false)
      } else if (digits.length < 10) {
        setNumberError(`${10 - digits.length} more digit${digits.length === 9 ? "" : "s"}`)
        setNumberValid(false)
      } else {
        const result = validateMedicareNumber(digits)
        if (result.valid) {
          setNumberError(null)
          setNumberValid(true)
        } else {
          setNumberError(result.error || "Check your Medicare number")
          setNumberValid(false)
        }
      }
    },
    [value, onChange],
  )

  // Validate expiry
  const handleExpiryChange = useCallback(
    (input: string) => {
      // Format as MM/YY
      const digits = input.replace(/\D/g, "")
      let formatted = digits
      if (digits.length >= 2) {
        formatted = digits.slice(0, 2) + "/" + digits.slice(2, 4)
      }

      onChange({ ...value, expiry: formatted })

      // Validation
      if (digits.length === 4) {
        const month = Number.parseInt(digits.slice(0, 2), 10)
        const year = Number.parseInt("20" + digits.slice(2, 4), 10)

        if (month < 1 || month > 12) {
          setExpiryError("Invalid month")
        } else {
          const now = new Date()
          const expiry = new Date(year, month - 1)
          if (expiry < now) {
            setExpiryError("Card has expired")
          } else {
            setExpiryError(null)
          }
        }
      } else {
        setExpiryError(null)
      }
    },
    [value, onChange],
  )

  // Use saved Medicare
  const handleUseSaved = useCallback(() => {
    if (savedMedicare) {
      onChange({
        number: formatMedicareNumber(savedMedicare.number),
        irn: savedMedicare.irn,
        expiry: savedMedicare.expiry || value.expiry,
      })
      setNumberValid(true)
      setNumberError(null)
      onUseSaved?.()
    }
  }, [savedMedicare, onChange, onUseSaved, value.expiry])

  return (
    <div className="rounded-2xl border bg-card p-5 space-y-5">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold">Medicare details</h3>
        <p className="text-sm text-muted-foreground mt-1">Needed to process your request</p>
      </div>

      {/* Same as last time */}
      {savedMedicare && (
        <button
          type="button"
          onClick={handleUseSaved}
          className="w-full p-3 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">
            Same as last time ({formatMedicareNumber(savedMedicare.number)})
          </span>
        </button>
      )}

      {/* Medicare number */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Card number</Label>
        <div className="relative">
          <Input
            type="text"
            inputMode="numeric"
            value={value.number}
            onChange={(e) => handleNumberChange(e.target.value)}
            placeholder="0000 00000 0"
            className={cn(
              "text-lg tracking-widest pr-10 h-12",
              numberValid && "border-green-500 focus-visible:ring-green-500",
              numberError && value.number.length === 12 && "border-destructive focus-visible:ring-destructive",
            )}
            maxLength={12}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {numberValid && <Check className="w-5 h-5 text-green-500" />}
            {numberError && value.number.length === 12 && <AlertCircle className="w-5 h-5 text-destructive" />}
          </div>
        </div>
        {numberError && (
          <p className={cn("text-xs", value.number.length === 12 ? "text-destructive" : "text-muted-foreground")}>
            {numberError}
          </p>
        )}
        {!numberError && value.number.length < 12 && (
          <p className="text-xs text-muted-foreground">10 digits on the front of your card</p>
        )}
      </div>

      {/* IRN + Expiry row */}
      <div className="grid grid-cols-2 gap-4">
        {/* IRN */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            IRN
            <span className="text-xs text-muted-foreground ml-1">(1-9)</span>
          </Label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onChange({ ...value, irn: n })}
                className={cn(
                  "w-8 h-10 rounded-lg text-sm font-medium transition-all",
                  value.irn === n ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80",
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Number next to your name</p>
        </div>

        {/* Expiry */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Expiry</Label>
          <div className="relative">
            <Input
              type="text"
              inputMode="numeric"
              value={value.expiry}
              onChange={(e) => handleExpiryChange(e.target.value)}
              placeholder="MM/YY"
              className={cn("h-10", expiryError && "border-destructive")}
              maxLength={5}
            />
            {expiryError && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Clock className="w-4 h-4 text-destructive" />
              </div>
            )}
          </div>
          {expiryError && <p className="text-xs text-destructive">{expiryError}</p>}
        </div>
      </div>
    </div>
  )
}
