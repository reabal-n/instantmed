"use client"

/**
 * Checkout Trust Badges
 *
 * Trust signals for checkout, payment, and onboarding flows.
 *
 * Exports:
 * - StripeBadge — Stripe branding badge
 * - PaymentMethodIcons — "Secured by Stripe" message
 * - AHPRAStatement — AHPRA registration badge (inline/card/minimal)
 * - CheckoutTrustStrip — Combined trust strip (compact/full/minimal)
 * - CheckoutSecurityFooter — Full footer with payment + security + AHPRA
 * - DataSecurityStrip — For onboarding/data entry forms
 * - OnboardingTrustFooter — Bottom-of-step trust footer
 */

import {
  Lock,
  Shield,
  ShieldCheck,
  Award,
  MapPin,
  EyeOff
} from "lucide-react"
import { cn } from "@/lib/utils"

// ── Stripe ──────────────────────────────────────────────────────────

function StripeLogo() {
  return (
    <span
      className="text-[#635BFF] font-bold text-base tracking-tight leading-none"
      aria-label="Stripe"
    >
      stripe
    </span>
  )
}

export function StripeBadge({
  variant = "powered-by",
  className
}: {
  variant?: "powered-by" | "secure" | "logo-only"
  className?: string
}) {
  if (variant === "logo-only") {
    return (
      <div className={cn("flex items-center", className)}>
        <StripeLogo />
      </div>
    )
  }

  if (variant === "secure") {
    return (
      <div className={cn(
        "inline-flex items-center gap-2 px-3 py-2 rounded-lg",
        "bg-white dark:bg-card border border-border/50 dark:border-white/10",
        className
      )}>
        <Lock className="w-4 h-4 text-[#635BFF]" />
        <span className="text-xs text-muted-foreground">Secure payment via</span>
        <StripeLogo />
      </div>
    )
  }

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 text-xs text-muted-foreground",
      className
    )}>
      <span>Powered by</span>
      <StripeLogo />
    </div>
  )
}

export function PaymentMethodIcons({
  className
}: {
  showLabels?: boolean
  size?: "sm" | "md"
  className?: string
}) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Lock className="w-3.5 h-3.5" />
        Secured by Stripe. Your payment details are encrypted.
      </p>
    </div>
  )
}

// ── AHPRA Statement ─────────────────────────────────────────────────

export function AHPRAStatement({
  variant = "inline",
  className
}: {
  variant?: "inline" | "card" | "minimal"
  className?: string
}) {
  if (variant === "card") {
    return (
      <div className={cn(
        "flex items-start gap-3 p-4 rounded-xl",
        "bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800",
        className
      )}>
        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
          <Award className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
            AHPRA-Registered Doctors
          </p>
          <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
            All consultations reviewed by Australian Health Practitioner Regulation Agency registered doctors.
          </p>
          <a
            href="https://www.ahpra.gov.au/Registration/Registers-of-Practitioners.aspx"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 underline underline-offset-2 mt-1 inline-block"
          >
            Verify on AHPRA →
          </a>
        </div>
      </div>
    )
  }

  if (variant === "minimal") {
    return (
      <div className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
        <Award className="w-3.5 h-3.5 text-emerald-600" />
        <span>AHPRA-registered doctors</span>
      </div>
    )
  }

  return (
    <div className={cn(
      "inline-flex items-center gap-2 px-3 py-2 rounded-lg",
      "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40",
      className
    )}>
      <Award className="w-4 h-4 text-emerald-600" />
      <span className="text-xs text-emerald-800 dark:text-emerald-200">
        All consultations reviewed by{" "}
        <a
          href="https://www.ahpra.gov.au"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium underline underline-offset-2 hover:text-emerald-600"
        >
          AHPRA-registered
        </a>{" "}
        Australian doctors
      </span>
    </div>
  )
}

// ── Combined Checkout Strips ────────────────────────────────────────

export function CheckoutTrustStrip({
  variant = "compact",
  className
}: {
  variant?: "compact" | "full" | "minimal"
  className?: string
}) {
  if (variant === "minimal") {
    return (
      <div className={cn(
        "flex flex-wrap items-center justify-center gap-3 py-2 text-xs text-muted-foreground",
        className
      )}>
        <div className="flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-emerald-600" />
          <span>256-bit SSL Encrypted</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>PCI-DSS Compliant</span>
        </div>
        <AHPRAStatement variant="minimal" />
      </div>
    )
  }

  if (variant === "full") {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-muted-foreground">Accepted payment methods</span>
          <PaymentMethodIcons size="md" />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>256-bit SSL</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>PCI Compliant</span>
          </div>
          <StripeBadge variant="powered-by" />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
          <AHPRAStatement variant="minimal" />
          <div className="flex items-center gap-1.5">
            <EyeOff className="w-3.5 h-3.5" />
            <span>100% Confidential</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-blue-600" />
            <span>Australian-owned & operated</span>
          </div>
        </div>
      </div>
    )
  }

  // Compact variant (default)
  return (
    <div className={cn(
      "flex flex-wrap items-center justify-center gap-4 py-3 text-xs text-muted-foreground",
      className
    )}>
      <div className="flex items-center gap-1.5">
        <Lock className="w-3.5 h-3.5 text-emerald-600" />
        <span>SSL Encrypted</span>
      </div>
      <div className="flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span>PCI Compliant</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Award className="w-3.5 h-3.5 text-emerald-600" />
        <span>AHPRA Doctors</span>
      </div>
      <div className="flex items-center gap-1.5">
        <MapPin className="w-3.5 h-3.5 text-blue-600" />
        <span>Australian-owned</span>
      </div>
    </div>
  )
}

export function CheckoutSecurityFooter({ className }: { className?: string }) {
  return (
    <div className={cn(
      "border-t border-border/50 pt-4 space-y-4",
      className
    )}>
      <div className="flex flex-col items-center gap-2">
        <PaymentMethodIcons />
        <StripeBadge variant="powered-by" />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-emerald-600" />
          <span>256-bit SSL</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>PCI Compliant</span>
        </div>
        <div className="flex items-center gap-1.5">
          <EyeOff className="w-3.5 h-3.5" />
          <span>Confidential</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
        <AHPRAStatement variant="minimal" />
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-blue-600" />
          <span>Australian-owned</span>
        </div>
      </div>
    </div>
  )
}

// ── Onboarding / Data Entry ─────────────────────────────────────────

export function DataSecurityStrip({
  variant = "default",
  className
}: {
  variant?: "default" | "compact" | "medicare"
  className?: string
}) {
  if (variant === "compact") {
    return (
      <div className={cn(
        "flex items-center justify-center gap-3 text-xs text-muted-foreground",
        className
      )}>
        <div className="flex items-center gap-1">
          <Lock className="w-3 h-3 text-emerald-600" />
          <span>Encrypted</span>
        </div>
        <div className="flex items-center gap-1">
          <EyeOff className="w-3 h-3 text-blue-600" />
          <span>Private</span>
        </div>
      </div>
    )
  }

  if (variant === "medicare") {
    return (
      <div className={cn(
        "flex flex-col items-center gap-2 p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800",
        className
      )}>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>256-bit encrypted</span>
          </div>
          <div className="flex items-center gap-1.5">
            <EyeOff className="w-3.5 h-3.5 text-blue-600" />
            <span>Never stored unencrypted</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground/70 text-center">
          Your Medicare details are protected under the Privacy Act 1988
        </p>
      </div>
    )
  }

  return (
    <div className={cn(
      "flex flex-wrap items-center justify-center gap-4 py-2 text-xs text-muted-foreground",
      className
    )}>
      <div className="flex items-center gap-1.5">
        <Lock className="w-3.5 h-3.5 text-emerald-600" />
        <span>256-bit SSL</span>
      </div>
      <div className="flex items-center gap-1.5">
        <EyeOff className="w-3.5 h-3.5 text-blue-600" />
        <span>Data never shared</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Shield className="w-3.5 h-3.5 text-emerald-600" />
        <span>Privacy Act compliant</span>
      </div>
    </div>
  )
}

export function OnboardingTrustFooter({ className }: { className?: string }) {
  return (
    <div className={cn(
      "flex flex-col items-center gap-2 pt-4 border-t border-border/30",
      className
    )}>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-emerald-600" />
          <span>Secure & encrypted</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Award className="w-3.5 h-3.5 text-emerald-600" />
          <span>AHPRA doctors</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-blue-600" />
          <span>Australian-owned</span>
        </div>
      </div>
    </div>
  )
}
