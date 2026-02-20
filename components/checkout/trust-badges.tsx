"use client"

/**
 * Checkout Trust Badges
 * 
 * Comprehensive trust signals for checkout and payment flows.
 * Includes payment providers, security badges, policy badges,
 * AHPRA statement, and Privacy Act compliance.
 */

import { 
  Lock, 
  Shield, 
  ShieldCheck,
  CheckCircle2, 
  Award,
  MapPin,
  Eye,
  EyeOff
} from "lucide-react"
import { cn } from "@/lib/utils"

// ============================================
// PAYMENT PROVIDER BADGES
// ============================================

// Stripe wordmark - using text with correct brand font weight instead of SVG path
// (SVG path was rendering as jumbled characters on some systems)
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

/**
 * Stripe badge with official branding
 */
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
        "bg-white/60 dark:bg-white/5 border border-white/50 dark:border-white/10",
        className
      )}>
        <Lock className="w-4 h-4 text-[#635BFF]" />
        <span className="text-xs text-muted-foreground">Secure payment via</span>
        <StripeLogo />
      </div>
    )
  }

  // Default: powered-by
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

/**
 * Payment method icons - simplified to just show Stripe security message
 * Card logos were looking deformed, so replaced with clean text
 */
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

// ============================================
// SECURITY BADGES
// ============================================

/**
 * SSL Encryption badge
 */
export function SSLBadge({ 
  variant = "inline",
  className 
}: { 
  variant?: "inline" | "badge"
  className?: string 
}) {
  if (variant === "badge") {
    return (
      <div className={cn(
        "inline-flex items-center gap-2 px-3 py-2 rounded-lg",
        "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/40",
        className
      )}>
        <Lock className="w-4 h-4 text-green-600" />
        <div className="flex flex-col">
          <span className="text-xs font-medium text-green-800 dark:text-green-200">256-bit SSL</span>
          <span className="text-xs text-green-600 dark:text-green-400">Encrypted Connection</span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
      <Lock className="w-3.5 h-3.5 text-green-600" />
      <span>256-bit SSL Encrypted</span>
    </div>
  )
}

/**
 * PCI Compliance badge
 */
export function PCIBadge({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
      <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
      <span>PCI-DSS Compliant</span>
    </div>
  )
}

/**
 * Secure Checkout badge - combines SSL + PCI
 */
export function SecureCheckoutBadge({ 
  variant = "inline",
  className 
}: { 
  variant?: "inline" | "card"
  className?: string 
}) {
  if (variant === "card") {
    return (
      <div className={cn(
        "flex items-center gap-3 p-3 rounded-xl",
        "bg-green-50/80 dark:bg-green-950/20 border border-green-200/60 dark:border-green-800/30",
        "hover:shadow-md hover:shadow-green-500/10 hover:border-green-300/80 dark:hover:border-green-700/50 transition-all duration-300",
        className
      )}>
        <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0">
          <Shield className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-green-900 dark:text-green-100">Secure Checkout</p>
          <p className="text-xs text-green-700 dark:text-green-400">256-bit encryption • PCI compliant</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      "inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
      "bg-green-50 dark:bg-green-950/30 border border-green-200/60 dark:border-green-800/40",
      className
    )}>
      <Shield className="w-3.5 h-3.5 text-green-600" />
      <span className="text-xs text-green-800 dark:text-green-200 font-medium">Secure Checkout</span>
    </div>
  )
}

// ============================================
// POLICY BADGES
// ============================================

/**
 * 100% Confidential badge
 */
export function ConfidentialBadge({ 
  variant = "inline",
  className 
}: { 
  variant?: "inline" | "badge"
  className?: string 
}) {
  if (variant === "badge") {
    return (
      <div className={cn(
        "inline-flex items-center gap-2 px-3 py-2 rounded-lg",
        "bg-white/60 dark:bg-white/5 border border-white/50 dark:border-white/10",
        className
      )}>
        <EyeOff className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">100% Confidential</span>
      </div>
    )
  }

  return (
    <div className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
      <EyeOff className="w-3.5 h-3.5" />
      <span>100% Confidential</span>
    </div>
  )
}

/**
 * Australian-owned badge
 */
export function AustralianOwnedBadge({ 
  variant = "inline",
  className 
}: { 
  variant?: "inline" | "badge"
  className?: string 
}) {
  if (variant === "badge") {
    return (
      <div className={cn(
        "inline-flex items-center gap-2 px-3 py-2 rounded-lg",
        "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40",
        className
      )}>
        <MapPin className="w-4 h-4 text-blue-600" />
        <div className="flex flex-col">
          <span className="text-xs font-medium text-blue-800 dark:text-blue-200">Australian Owned</span>
          <span className="text-xs text-blue-600 dark:text-blue-400">& Operated</span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
      <MapPin className="w-3.5 h-3.5 text-blue-600" />
      <span>Australian-owned & operated</span>
    </div>
  )
}

// ============================================
// AHPRA STATEMENT
// ============================================

/**
 * AHPRA Statement - for checkout/payment flows
 */
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
        "bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/30",
        className
      )}>
        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
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

  // Inline variant with link
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

// ============================================
// PRIVACY ACT COMPLIANCE
// ============================================

/**
 * Privacy Act Compliance badge (Australian Privacy Principles)
 */
export function PrivacyActBadge({ 
  variant = "inline",
  className 
}: { 
  variant?: "inline" | "card"
  className?: string 
}) {
  if (variant === "card") {
    return (
      <div className={cn(
        "flex items-start gap-3 p-4 rounded-xl",
        "bg-white/60 dark:bg-white/5 border border-white/50 dark:border-white/10",
        className
      )}>
        <div className="w-10 h-10 rounded-xl bg-white/60 dark:bg-white/10 flex items-center justify-center shrink-0">
          <Eye className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
            Privacy Act Compliant
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            We comply with the Australian Privacy Principles (APP) under the Privacy Act 1988.
          </p>
          <a 
            href="/privacy"
            className="text-xs text-primary hover:underline underline-offset-2 mt-1 inline-block"
          >
            Read our Privacy Policy →
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
      <Eye className="w-3.5 h-3.5" />
      <span>Privacy Act compliant</span>
    </div>
  )
}

// ============================================
// COMBINED COMPONENTS
// ============================================

/**
 * Comprehensive checkout trust strip - all badges in one row
 */
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
        <SSLBadge />
        <PCIBadge />
        <AHPRAStatement variant="minimal" />
      </div>
    )
  }

  if (variant === "full") {
    return (
      <div className={cn("space-y-4", className)}>
        {/* Payment methods */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-muted-foreground">Accepted payment methods</span>
          <PaymentMethodIcons size="md" />
        </div>

        {/* Security badges */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          <SSLBadge />
          <PCIBadge />
          <StripeBadge variant="powered-by" />
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          <AHPRAStatement variant="minimal" />
          <ConfidentialBadge />
          <AustralianOwnedBadge />
          <PrivacyActBadge />
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
        <Lock className="w-3.5 h-3.5 text-green-600" />
        <span>SSL Encrypted</span>
      </div>
      <div className="flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
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

/**
 * Checkout footer with payment methods and security badges
 */
export function CheckoutSecurityFooter({ className }: { className?: string }) {
  return (
    <div className={cn(
      "border-t border-border/50 pt-4 space-y-4",
      className
    )}>
      {/* Payment methods */}
      <div className="flex flex-col items-center gap-2">
        <PaymentMethodIcons />
        <StripeBadge variant="powered-by" />
      </div>

      {/* Security strip */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
        <SSLBadge />
        <PCIBadge />
        <ConfidentialBadge />
      </div>

      {/* AHPRA & Privacy */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
        <AHPRAStatement variant="minimal" />
        <AustralianOwnedBadge />
        <PrivacyActBadge />
      </div>
    </div>
  )
}

/**
 * Compact payment trust row - for near payment buttons
 */
export function PaymentTrustRow({ className }: { className?: string }) {
  return (
    <div className={cn(
      "flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6",
      className
    )}>
      <PaymentMethodIcons />
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-green-600" />
          <span>Secure</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
          <span>Stripe</span>
        </div>
      </div>
    </div>
  )
}

// ============================================
// ONBOARDING/DATA COLLECTION BADGES
// ============================================

/**
 * Data security trust strip for onboarding flows
 * Reassures users when entering sensitive personal/Medicare data
 */
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
          <Lock className="w-3 h-3 text-green-600" />
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
        "flex flex-col items-center gap-2 p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30",
        className
      )}>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-green-600" />
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
        <Lock className="w-3.5 h-3.5 text-green-600" />
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

/**
 * Onboarding trust footer - for bottom of onboarding steps
 */
export function OnboardingTrustFooter({ className }: { className?: string }) {
  return (
    <div className={cn(
      "flex flex-col items-center gap-2 pt-4 border-t border-border/30",
      className
    )}>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-green-600" />
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

/**
 * Hero trust badges - for landing page hero sections
 */
export function HeroTrustBadges({ 
  variant = "default",
  className 
}: { 
  variant?: "default" | "compact" | "dark"
  className?: string 
}) {
  const isDark = variant === "dark"
  
  return (
    <div className={cn(
      "flex flex-wrap items-center justify-center gap-3 sm:gap-4",
      className
    )}>
      <div className={cn(
        "flex items-center gap-1.5 text-xs",
        isDark ? "text-white/80" : "text-muted-foreground"
      )}>
        <ShieldCheck className={cn("w-4 h-4", isDark ? "text-green-400" : "text-green-600")} />
        <span>AHPRA-registered doctors</span>
      </div>
      <div className={cn(
        "flex items-center gap-1.5 text-xs",
        isDark ? "text-white/80" : "text-muted-foreground"
      )}>
        <Lock className={cn("w-4 h-4", isDark ? "text-green-400" : "text-green-600")} />
        <span>256-bit SSL</span>
      </div>
      <div className={cn(
        "flex items-center gap-1.5 text-xs",
        isDark ? "text-white/80" : "text-muted-foreground"
      )}>
        <Eye className={cn("w-4 h-4", isDark ? "text-blue-400" : "text-blue-600")} />
        <span>Privacy Act compliant</span>
      </div>
    </div>
  )
}
