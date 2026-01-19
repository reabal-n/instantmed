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

// Stripe wordmark SVG - defined outside component to avoid re-creation on render
function StripeLogo() {
  return (
    <svg 
      viewBox="0 0 60 25" 
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-auto"
      aria-label="Stripe"
    >
      <path 
        fill="#635BFF" 
        d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a12.2 12.2 0 0 1-4.56.88c-4.18 0-6.94-2.29-6.94-6.93 0-4.09 2.44-6.96 6.33-6.96 3.78 0 6.02 2.83 6.02 6.58 0 .56-.04 1.03-.04 1.51zm-6.02-5.39c-1.2 0-2.21.94-2.36 2.73h4.66c-.11-1.76-.95-2.73-2.3-2.73zM41.14 18.92V6.54h4.2l.28 1.46c.9-1.05 2.16-1.74 3.68-1.74.69 0 1.24.09 1.62.24v4.01c-.45-.14-1.01-.23-1.72-.23-1.28 0-2.46.55-3.19 1.42v7.22h-4.87zm-5.94-12.65c1.55 0 2.8.48 2.8.48v3.6s-1.1-.42-2.24-.42c-1.22 0-1.82.42-1.82 1.09 0 .75.95 1.07 2.05 1.49 1.76.67 3.72 1.51 3.72 4.17 0 2.89-2.36 4.4-5.29 4.4-1.62 0-3.43-.49-3.43-.49v-3.63s1.51.56 3.01.56c1.13 0 1.87-.35 1.87-1.09 0-.74-.82-1.06-1.88-1.45-1.82-.67-3.9-1.52-3.9-4.18 0-2.75 2.15-4.53 5.11-4.53zm-11.59 0c1.97 0 3.37.56 4.3 1.16l-1.37 3.12c-.67-.4-1.67-.88-2.84-.88-.84 0-1.41.28-1.41.79 0 .65.95.93 2.05 1.32 1.76.62 3.72 1.41 3.72 4.06 0 2.95-2.36 4.46-5.44 4.46-1.77 0-3.61-.49-4.57-1.05l1.41-3.19c.84.49 2.05 1 3.23 1 .89 0 1.55-.28 1.55-.88 0-.65-.82-.93-1.87-1.32-1.83-.65-3.9-1.48-3.9-4.13 0-2.79 2.3-4.46 5.14-4.46zM8.66 0c2.28 0 3.75.98 3.75.98v3.42s-1.23-.7-2.65-.7c-1.34 0-2.12.56-2.12 1.44v1.4h3.98v3.53H7.64v8.85H2.77V6.54c0-4.02 2.94-6.54 5.89-6.54z"
      />
    </svg>
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
        "bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/40",
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
 * Payment method icons (Visa, Mastercard, Amex, Apple Pay, Google Pay)
 */
export function PaymentMethodIcons({ 
  showLabels = false,
  size = "sm",
  className 
}: { 
  showLabels?: boolean
  size?: "sm" | "md"
  className?: string 
}) {
  const iconSize = size === "sm" ? "h-5" : "h-7"
  
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Visa */}
      <div className={cn("bg-white dark:bg-slate-800 rounded px-1.5 py-1 border border-slate-200 dark:border-slate-700", showLabels && "flex items-center gap-1")}>
        <svg viewBox="0 0 50 16" className={cn(iconSize, "w-auto")} aria-label="Visa">
          <path fill="#1434CB" d="M19.13 15.34h-3.87l2.42-14.68h3.87l-2.42 14.68zM14.16 0.66l-3.68 10.06-0.43-2.19-1.3-6.63c-0.22-0.89-0.87-1.16-1.68-1.2H0.07l-0.07 0.34c1.46 0.37 2.76 0.91 3.87 1.59l3.22 12.71h4.04l6.17-14.68h-3.14zM46.2 15.34h3.57l-3.12-14.68h-3.12c-0.72 0-1.33 0.41-1.6 1.05l-5.65 13.63h3.96l0.78-2.18h4.84l0.34 2.18zM42.14 10.19l1.99-5.48 1.14 5.48h-3.13zM34.12 4.06l0.54-3.17c-0.84-0.31-1.72-0.52-2.63-0.52-2.89 0-4.93 1.53-4.95 3.72-0.02 1.62 1.45 2.52 2.55 3.06 1.13 0.55 1.51 0.91 1.5 1.4-0.01 0.76-0.9 1.1-1.73 1.1-1.16 0-1.77-0.17-2.72-0.58l-0.37-0.18-0.4 2.48c0.68 0.31 1.93 0.58 3.23 0.6 3.07 0 5.07-1.51 5.09-3.85 0.01-1.28-0.77-2.26-2.45-3.06-1.02-0.52-1.65-0.87-1.64-1.4 0-0.47 0.53-0.97 1.67-0.97 0.83 0 1.5 0.17 2.06 0.38l0.25 0.12z"/>
        </svg>
        {showLabels && <span className="text-[10px] text-muted-foreground">Visa</span>}
      </div>

      {/* Mastercard */}
      <div className={cn("bg-white dark:bg-slate-800 rounded px-1.5 py-1 border border-slate-200 dark:border-slate-700", showLabels && "flex items-center gap-1")}>
        <svg viewBox="0 0 32 20" className={cn(iconSize, "w-auto")} aria-label="Mastercard">
          <rect width="32" height="20" rx="2" fill="#fff"/>
          <circle cx="12" cy="10" r="7" fill="#EB001B"/>
          <circle cx="20" cy="10" r="7" fill="#F79E1B"/>
          <path d="M16 4.58c1.89 1.5 3.1 3.8 3.1 6.42s-1.21 4.92-3.1 6.42c-1.89-1.5-3.1-3.8-3.1-6.42s1.21-4.92 3.1-6.42z" fill="#FF5F00"/>
        </svg>
        {showLabels && <span className="text-[10px] text-muted-foreground">Mastercard</span>}
      </div>

      {/* Amex */}
      <div className={cn("bg-[#006FCF] rounded px-1.5 py-1", showLabels && "flex items-center gap-1")}>
        <svg viewBox="0 0 40 14" className={cn(iconSize, "w-auto")} aria-label="American Express">
          <text x="2" y="11" fill="white" fontSize="8" fontWeight="bold" fontFamily="Arial">AMEX</text>
        </svg>
        {showLabels && <span className="text-[10px] text-muted-foreground">Amex</span>}
      </div>

      {/* Apple Pay */}
      <div className={cn("bg-black rounded px-1.5 py-1", showLabels && "flex items-center gap-1")}>
        <svg viewBox="0 0 50 20" className={cn(iconSize, "w-auto")} aria-label="Apple Pay">
          <path fill="white" d="M9.6 5.39c-.56.67-1.47 1.19-2.36 1.11-.11-.89.32-1.83.83-2.42.56-.65 1.54-1.13 2.33-1.16.09.93-.27 1.83-.8 2.47zm.79 1.24c-1.3-.08-2.41.74-3.03.74-.62 0-1.58-.7-2.6-.68-1.34.02-2.57.78-3.26 1.98-1.39 2.41-.36 5.98.99 7.94.66.97 1.45 2.04 2.49 2 .99-.04 1.37-.64 2.57-.64 1.2 0 1.54.64 2.58.62 1.07-.02 1.75-.97 2.41-1.94.76-1.1 1.07-2.17 1.09-2.22-.02-.01-2.09-.8-2.11-3.18-.02-1.99 1.62-2.94 1.7-3-.93-1.37-2.37-1.52-2.83-1.56v-.06z"/>
          <path fill="white" d="M21.19 3.06c2.62 0 4.44 1.8 4.44 4.44 0 2.65-1.86 4.47-4.52 4.47h-2.9v4.63h-2.1V3.06h5.08zm-2.98 7.08h2.4c1.83 0 2.87-1 2.87-2.63 0-1.63-1.04-2.62-2.86-2.62h-2.41v5.25zM26.4 13.2c0-1.73 1.32-2.79 3.67-2.92l2.71-.15v-.76c0-1.1-.73-1.76-1.96-1.76-1.16 0-1.88.58-2.05 1.47h-1.92c.11-1.78 1.62-3.1 4.04-3.1 2.38 0 3.9 1.27 3.9 3.25v6.8h-1.95v-1.63h-.05c-.58 1.1-1.82 1.78-3.11 1.78-1.93 0-3.28-1.19-3.28-2.98zm6.38-.89v-.78l-2.44.15c-1.22.08-1.9.62-1.9 1.48 0 .87.71 1.44 1.79 1.44 1.4 0 2.55-.97 2.55-2.29zM36.2 19.64v-1.66c.15.04.49.04.64.04 1 0 1.54-.43 1.87-1.53l.2-.66-3.55-9.8h2.21l2.47 7.88h.04l2.47-7.88h2.15l-3.69 10.32c-.84 2.38-1.82 3.15-3.86 3.15-.15 0-.8-.02-.95-.06z"/>
        </svg>
        {showLabels && <span className="text-[10px] text-white">Apple Pay</span>}
      </div>

      {/* Google Pay */}
      <div className={cn("bg-white dark:bg-slate-800 rounded px-1.5 py-1 border border-slate-200 dark:border-slate-700", showLabels && "flex items-center gap-1")}>
        <svg viewBox="0 0 50 20" className={cn(iconSize, "w-auto")} aria-label="Google Pay">
          <path fill="#4285F4" d="M23.75 10.27V14h-1.5V4h3.98c.96-.01 1.88.35 2.57.99.71.62 1.11 1.51 1.11 2.5s-.4 1.88-1.11 2.5c-.69.64-1.61.99-2.57.99h-2.48v-.71zm0-4.77v3.27h2.51c.57.01 1.12-.21 1.52-.6.83-.77.87-2.07.09-2.89-.4-.43-.96-.66-1.54-.67h-2.58v.89z"/>
          <path fill="#34A853" d="M32.94 7.83c1.1 0 1.98.3 2.6.89.63.59.94 1.4.94 2.41V14h-1.43v-.92h-.06c-.59.76-1.4 1.14-2.4 1.14-.86 0-1.58-.25-2.15-.76-.56-.49-.86-1.14-.86-1.93 0-.82.32-1.47.96-1.97.64-.49 1.5-.74 2.56-.74.91 0 1.66.17 2.23.51v-.36c0-.5-.2-.98-.58-1.32-.38-.36-.89-.55-1.41-.54-.82 0-1.47.35-1.94 1.04l-1.32-.83c.7-.98 1.74-1.49 3.12-1.49h-.26zm-1.91 4.78c0 .38.17.73.47.96.31.26.7.4 1.1.39.59 0 1.17-.24 1.59-.66.45-.41.7-.99.7-1.6-.46-.39-1.1-.59-1.92-.59-.6 0-1.1.15-1.49.44-.37.28-.56.63-.56 1.06h.11z"/>
          <path fill="#4285F4" d="M44.27 8.06l-4.97 11.44h-1.55l1.85-3.99-3.27-7.45h1.64l2.35 5.66h.03l2.29-5.66h1.63z"/>
          <path fill="#EA4335" d="M16.68 9.45c0-.46-.04-.91-.12-1.35H9.5v2.56h4.03c-.08.56-.36 1.08-.77 1.47v1.2h1.93c1.13-1.04 1.78-2.57 1.99-3.88z"/>
          <path fill="#FBBC05" d="M9.5 14.76c1.56 0 2.87-.51 3.83-1.39l-1.93-1.2c-.52.35-1.18.55-1.9.55-1.46 0-2.7-.99-3.14-2.31H4.39v1.23c1.01 2 3.08 3.28 5.35 3.28l-.24-.16z"/>
          <path fill="#34A853" d="M6.36 10.41c-.24-.7-.24-1.46 0-2.17V7.01H4.39c-.8 1.58-.8 3.45 0 5.03l1.97-1.63z"/>
          <path fill="#EA4335" d="M9.5 5.93c.8-.01 1.56.29 2.14.83l1.59-1.59c-1-.94-2.35-1.46-3.73-1.44-2.27 0-4.34 1.28-5.35 3.28l1.97 1.63c.44-1.32 1.68-2.31 3.14-2.31l.24-.4z"/>
        </svg>
        {showLabels && <span className="text-[10px] text-muted-foreground">Google Pay</span>}
      </div>
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
          <span className="text-[10px] text-green-600 dark:text-green-400">Encrypted Connection</span>
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
        "bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700",
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
          <span className="text-[10px] text-blue-600 dark:text-blue-400">& Operated</span>
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
        "bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/40",
        className
      )}>
        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700/60 flex items-center justify-center shrink-0">
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
        <p className="text-[10px] text-muted-foreground/70 text-center">
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
