/**
 * Payment method logo components using brand SVGs from /public/logos/payment/
 *
 * Exports:
 * - StripeWordmark       - "stripe" wordmark in brand purple (text-based, no SVG needed)
 * - ApplePayLogo         - Apple Pay card badge
 * - GooglePayLogo        - Google Pay card badge (dark-mode aware)
 * - VisaLogo             - Visa card badge
 * - MastercardLogo       - Mastercard card badge
 * - AmexBadge            - Amex inline badge (no external SVG)
 * - PaymentLogos         - Combined row: Stripe + Visa + Mastercard + Apple Pay + Google Pay
 * - StripePaymentLogos   - Compact row for sticky CTAs: Stripe + Apple Pay + Google Pay
 */

import { cn } from "@/lib/utils"

// ── Individual logos ─────────────────────────────────────────────────

export function StripeWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn("text-[#635BFF] font-semibold tracking-tight leading-none", className)}
      aria-label="Stripe"
    >
      stripe
    </span>
  )
}

export function ApplePayLogo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logos/payment/apple-pay.svg"
      alt="Apple Pay"
      width={30}
      height={20}
      className={cn("h-5 w-auto", className)}
    />
  )
}

export function GooglePayLogo({ className }: { className?: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logos/payment/google-pay-black.svg"
        alt="Google Pay"
        width={30}
        height={20}
        className={cn("h-5 w-auto dark:hidden", className)}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logos/payment/google-pay-white.svg"
        alt=""
        aria-hidden="true"
        width={30}
        height={20}
        className={cn("h-5 w-auto hidden dark:block", className)}
      />
    </>
  )
}

export function VisaLogo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logos/payment/visa.svg"
      alt="Visa"
      width={30}
      height={20}
      className={cn("h-5 w-auto", className)}
    />
  )
}

export function MastercardLogo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logos/payment/mastercard.svg"
      alt="Mastercard"
      width={30}
      height={20}
      className={cn("h-5 w-auto", className)}
    />
  )
}

export function AmexBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded px-1.5 h-5 font-bold text-[8px] tracking-wider text-white bg-[#016FD0]",
        className
      )}
      aria-label="American Express"
    >
      AMEX
    </span>
  )
}

// ── Combined strips ──────────────────────────────────────────────────

/**
 * Full payment method row — Stripe + Visa + Mastercard + Apple Pay + Google Pay
 * Use in checkout steps, pricing sections.
 */
export function PaymentLogos({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-1.5", className)}>
      <StripeWordmark className="text-[10px]" />
      <span className="text-border/60" aria-hidden="true">·</span>
      <VisaLogo className="h-4" />
      <MastercardLogo className="h-4" />
      <AmexBadge className="h-4 text-[7px]" />
      <ApplePayLogo className="h-4" />
      <GooglePayLogo className="h-4" />
    </div>
  )
}

/**
 * Compact strip for sticky CTAs — Stripe + Apple Pay + Google Pay
 */
export function StripePaymentLogos({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <StripeWordmark className="text-[9px]" />
      <span className="text-muted-foreground/30" aria-hidden="true">·</span>
      <ApplePayLogo className="h-[15px]" />
      <GooglePayLogo className="h-[15px]" />
    </div>
  )
}
