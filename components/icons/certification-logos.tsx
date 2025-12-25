"use client"

import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  style?: React.CSSProperties
}

// LegitScript Certified Logo
export function LegitScriptLogo({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 32 32" className={cn("w-6 h-6", className)} fill="none">
      <rect width="32" height="32" rx="6" fill="#00A651" />
      <path
        d="M8 16.5L13 21.5L24 10.5"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="16" r="11" stroke="white" strokeWidth="2" opacity="0.3" />
    </svg>
  )
}

// ISO 27001 Certified Logo
export function ISOLogo({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 32 32" className={cn("w-6 h-6", className)} fill="none">
      <rect width="32" height="32" rx="6" fill="#1E40AF" />
      <text x="16" y="13" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold" fontFamily="system-ui">ISO</text>
      <text x="16" y="22" textAnchor="middle" fill="white" fontSize="6" fontFamily="system-ui" opacity="0.9">27001</text>
      <rect x="4" y="25" width="24" height="3" rx="1.5" fill="white" opacity="0.3" />
    </svg>
  )
}

// AHPRA Registered Logo
export function AHPRALogo({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 32 32" className={cn("w-6 h-6", className)} fill="none">
      <rect width="32" height="32" rx="6" fill="#4F46E5" />
      <path
        d="M16 6L20 14H12L16 6Z"
        fill="white"
      />
      <circle cx="16" cy="19" r="6" stroke="white" strokeWidth="2" fill="none" />
      <path d="M13 19L15 21L19 17" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// TGA Approved Logo
export function TGALogo({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 32 32" className={cn("w-6 h-6", className)} fill="none">
      <rect width="32" height="32" rx="6" fill="#7C3AED" />
      <text x="16" y="14" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="system-ui">TGA</text>
      <path
        d="M10 20H22M10 24H18"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  )
}

// HIPAA Compliant Logo
export function HIPAALogo({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 32 32" className={cn("w-6 h-6", className)} fill="none">
      <rect width="32" height="32" rx="6" fill="#059669" />
      <path
        d="M16 5L26 10V16C26 21.5 21.5 26 16 27C10.5 26 6 21.5 6 16V10L16 5Z"
        fill="white"
        fillOpacity="0.2"
        stroke="white"
        strokeWidth="1.5"
      />
      <path
        d="M12 16L15 19L20 13"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// SOC 2 Logo
export function SOC2Logo({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 32 32" className={cn("w-6 h-6", className)} fill="none">
      <rect width="32" height="32" rx="6" fill="#0284C7" />
      <circle cx="16" cy="14" r="7" stroke="white" strokeWidth="2" fill="none" />
      <path d="M13 14L15 16L19 12" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <text x="16" y="26" textAnchor="middle" fill="white" fontSize="5" fontFamily="system-ui" opacity="0.8">TYPE II</text>
    </svg>
  )
}

// SSL Encrypted Logo
export function SSLLogo({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 32 32" className={cn("w-6 h-6", className)} fill="none">
      <rect width="32" height="32" rx="6" fill="#D97706" />
      <rect x="10" y="14" width="12" height="10" rx="2" fill="white" />
      <path
        d="M12 14V11C12 8.79 13.79 7 16 7C18.21 7 20 8.79 20 11V14"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="16" cy="19" r="1.5" fill="#D97706" />
    </svg>
  )
}

// PCI DSS Logo
export function PCIDSSLogo({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 32 32" className={cn("w-6 h-6", className)} fill="none">
      <rect width="32" height="32" rx="6" fill="#DC2626" />
      <rect x="7" y="10" width="18" height="12" rx="2" fill="white" fillOpacity="0.2" stroke="white" strokeWidth="1.5" />
      <rect x="7" y="14" width="18" height="3" fill="white" fillOpacity="0.4" />
      <circle cx="22" cy="19" r="2" fill="white" />
      <circle cx="18" cy="19" r="2" fill="white" fillOpacity="0.6" />
    </svg>
  )
}

// Medicare Logo (for Australian context)
export function MedicareLogo({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 32 32" className={cn("w-6 h-6", className)} fill="none">
      <rect width="32" height="32" rx="6" fill="#16A34A" />
      <path
        d="M8 16L12 12V20L8 16Z"
        fill="white"
      />
      <path
        d="M14 10L18 16L14 22V10Z"
        fill="white"
        fillOpacity="0.8"
      />
      <path
        d="M20 12L24 16L20 20V12Z"
        fill="white"
        fillOpacity="0.6"
      />
    </svg>
  )
}

// Trustpilot-style Star Logo
export function TrustpilotLogo({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 32 32" className={cn("w-6 h-6", className)} fill="none">
      <rect width="32" height="32" rx="6" fill="#00B67A" />
      <path
        d="M16 7L18.47 13.04L25 13.64L20.09 17.86L21.56 24.23L16 20.77L10.44 24.23L11.91 17.86L7 13.64L13.53 13.04L16 7Z"
        fill="white"
      />
    </svg>
  )
}

// Australian Government Logo
export function AusGovLogo({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 32 32" className={cn("w-6 h-6", className)} fill="none">
      <rect width="32" height="32" rx="6" fill="#1E3A5F" />
      <circle cx="16" cy="12" r="5" fill="#FFD700" />
      <path
        d="M10 20H22L20 26H12L10 20Z"
        fill="white"
        fillOpacity="0.9"
      />
      <path
        d="M14 22H18V26H14V22Z"
        fill="#1E3A5F"
      />
    </svg>
  )
}

// Shield Check Premium Icon
export function ShieldCheckPremium({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("w-5 h-5", className)} fill="none" stroke="currentColor" strokeWidth="1.5">
      <defs>
        <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      <path
        d="M12 2L3 7V12C3 17.5 7.5 22 12 23C16.5 22 21 17.5 21 12V7L12 2Z"
        fill="url(#shieldGrad)"
        fillOpacity="0.1"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 12.5L11 15L15.5 10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Clock Premium Icon
export function ClockPremium({ className, style }: LogoProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("w-5 h-5", className)} style={style} fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity="0.1" />
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6V12L16 14" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  )
}

// Document Premium Icon
export function DocumentPremium({ className, style }: LogoProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("w-5 h-5", className)} style={style} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path
        d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"
        fill="currentColor"
        fillOpacity="0.1"
      />
      <path
        d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14 2V8H20" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 13H16M8 17H13" strokeLinecap="round" />
    </svg>
  )
}

// Pill/Medication Premium Icon
export function PillPremium({ className, style }: LogoProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("w-5 h-5", className)} style={style} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path
        d="M8.5 3.5L20.5 15.5C21.6046 16.6046 21.6046 18.3954 20.5 19.5C19.3954 20.6046 17.6046 20.6046 16.5 19.5L4.5 7.5C3.39543 6.39543 3.39543 4.60457 4.5 3.5C5.60457 2.39543 7.39543 2.39543 8.5 3.5Z"
        fill="currentColor"
        fillOpacity="0.1"
      />
      <path
        d="M8.5 3.5L20.5 15.5C21.6046 16.6046 21.6046 18.3954 20.5 19.5C19.3954 20.6046 17.6046 20.6046 16.5 19.5L4.5 7.5C3.39543 6.39543 3.39543 4.60457 4.5 3.5C5.60457 2.39543 7.39543 2.39543 8.5 3.5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M6.5 11.5L12.5 5.5" />
    </svg>
  )
}

// Stethoscope Premium Icon  
export function StethoscopePremium({ className, style }: LogoProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("w-5 h-5", className)} style={style} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path
        d="M4.8 2.3C4.8 2.3 4 3.1 4 4.5C4 5.9 4.8 8 4.8 8H6C6 8 5.2 6 5.2 4.5C5.2 3 6 2.3 6 2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.8 2.3C8.8 2.3 8 3.1 8 4.5C8 5.9 8.8 8 8.8 8H10C10 8 9.2 6 9.2 4.5C9.2 3 10 2.3 10 2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 8H8.8V12C8.8 14.2091 7.00914 16 4.8 16H4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="19" cy="16" r="3" fill="currentColor" fillOpacity="0.2" stroke="currentColor" />
      <path d="M19 13V9C19 7.5 18 7 17 7H15" strokeLinecap="round" />
      <circle cx="19" cy="16" r="1" fill="currentColor" />
    </svg>
  )
}

// Video Call Premium Icon
export function VideoCallPremium({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("w-5 h-5", className)} fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="5" width="14" height="14" rx="2" fill="currentColor" fillOpacity="0.1" stroke="currentColor" />
      <path d="M16 9L22 5V19L16 15V9Z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeLinejoin="round" />
      <circle cx="9" cy="12" r="2" fill="currentColor" fillOpacity="0.5" />
    </svg>
  )
}

// Men's Health Icon - Modern male silhouette
export function MensHealthIcon({ className, style }: LogoProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("w-5 h-5", className)} style={style} fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="7" r="4" fill="currentColor" fillOpacity="0.15" stroke="currentColor" />
      <path d="M6 21V19C6 17.3431 7.34315 16 9 16H15C16.6569 16 18 17.3431 18 19V21" stroke="currentColor" strokeLinecap="round" />
      <path d="M17 3L21 3M21 3L21 7M21 3L17 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Women's Health Icon - Modern female with heart
export function WomensHealthIcon({ className, style }: LogoProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("w-5 h-5", className)} style={style} fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="8" r="4" fill="currentColor" fillOpacity="0.15" stroke="currentColor" />
      <path d="M6 21V19C6 17.3431 7.34315 16 9 16H15C16.6569 16 18 17.3431 18 19V21" stroke="currentColor" strokeLinecap="round" />
      <path 
        d="M19 8C19 9.5 18 11 17 11C16 11 15 9.5 15 8C15 6.5 17 5 17 5C17 5 19 6.5 19 8Z" 
        fill="currentColor" 
        fillOpacity="0.4"
        stroke="currentColor"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Weight Loss Icon - Scale with down arrow
export function WeightLossIcon({ className, style }: LogoProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("w-5 h-5", className)} style={style} fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="8" width="18" height="12" rx="2" fill="currentColor" fillOpacity="0.1" stroke="currentColor" />
      <path d="M3 12H21" stroke="currentColor" strokeOpacity="0.5" />
      <circle cx="12" cy="15" r="2" fill="currentColor" fillOpacity="0.3" stroke="currentColor" />
      <path d="M12 3V7M9 5L12 7L15 5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Hair Loss Icon - Head with hair strands
export function HairLossIcon({ className, style }: LogoProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("w-5 h-5", className)} style={style} fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="13" r="7" fill="currentColor" fillOpacity="0.1" stroke="currentColor" />
      <path d="M8 10C8 7.5 9.5 6 12 6C14.5 6 16 7.5 16 10" stroke="currentColor" strokeLinecap="round" />
      <path d="M9 4C9 4 10 6 12 6C14 6 15 4 15 4" stroke="currentColor" strokeLinecap="round" />
      <path d="M7 5L8.5 7" stroke="currentColor" strokeLinecap="round" strokeOpacity="0.6" />
      <path d="M17 5L15.5 7" stroke="currentColor" strokeLinecap="round" strokeOpacity="0.6" />
      <circle cx="10" cy="13" r="1" fill="currentColor" />
      <circle cx="14" cy="13" r="1" fill="currentColor" />
      <path d="M10 16C10 16 11 17 12 17C13 17 14 16 14 16" stroke="currentColor" strokeLinecap="round" />
    </svg>
  )
}

// Performance Anxiety Icon - Microphone with pulse
export function PerformanceAnxietyIcon({ className, style }: LogoProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("w-5 h-5", className)} style={style} fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="9" y="2" width="6" height="10" rx="3" fill="currentColor" fillOpacity="0.15" stroke="currentColor" />
      <path d="M5 10C5 13.866 8.13401 17 12 17C15.866 17 19 13.866 19 10" stroke="currentColor" strokeLinecap="round" />
      <path d="M12 17V21M8 21H16" stroke="currentColor" strokeLinecap="round" />
      <path d="M2 12H4M20 12H22" stroke="currentColor" strokeLinecap="round" strokeOpacity="0.5" />
      <path d="M3 9L5 12L3 15" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" />
      <path d="M21 9L19 12L21 15" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" />
    </svg>
  )
}

// Shield Premium - For trust/security sections
export function ShieldPremiumAlt({ className, style }: LogoProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("w-5 h-5", className)} style={style} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path 
        d="M12 2L3 7V12C3 17.5 7 21.5 12 23C17 21.5 21 17.5 21 12V7L12 2Z" 
        fill="currentColor" 
        fillOpacity="0.1"
        stroke="currentColor"
        strokeLinejoin="round"
      />
      <path d="M12 8V12M12 16H12.01" stroke="currentColor" strokeLinecap="round" />
    </svg>
  )
}

// Zap/Lightning Premium Icon
export function ZapPremium({ className, style }: LogoProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("w-5 h-5", className)} style={style} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path 
        d="M13 2L3 14H12L11 22L21 10H12L13 2Z" 
        fill="currentColor" 
        fillOpacity="0.15"
        stroke="currentColor"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Help Circle Premium
export function HelpCirclePremium({ className, style }: LogoProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("w-5 h-5", className)} style={style} fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.1" stroke="currentColor" />
      <path d="M9.09 9C9.3251 8.33167 9.78915 7.76811 10.4 7.40913C11.0108 7.05016 11.7289 6.91894 12.4272 7.03871C13.1255 7.15849 13.7588 7.52152 14.2151 8.06353C14.6713 8.60553 14.9211 9.29152 14.92 10C14.92 12 11.92 13 11.92 13" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="currentColor" />
    </svg>
  )
}

// Sparkles Premium Icon
export function SparklesPremium({ className, style }: LogoProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("w-5 h-5", className)} style={style} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 3L13.5 8.5L19 10L13.5 11.5L12 17L10.5 11.5L5 10L10.5 8.5L12 3Z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeLinejoin="round" />
      <path d="M19 15L19.5 17L21.5 17.5L19.5 18L19 20L18.5 18L16.5 17.5L18.5 17L19 15Z" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeLinejoin="round" />
      <path d="M5 2L5.5 4L7.5 4.5L5.5 5L5 7L4.5 5L2.5 4.5L4.5 4L5 2Z" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeLinejoin="round" />
    </svg>
  )
}

// Clipboard List Premium Icon
export function ClipboardListPremium({ className, style }: LogoProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("w-5 h-5", className)} style={style} fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="4" y="3" width="16" height="18" rx="2" fill="currentColor" fillOpacity="0.1" stroke="currentColor" />
      <path d="M9 3V5H15V3" stroke="currentColor" />
      <rect x="8" y="7" width="2" height="2" rx="0.5" fill="currentColor" />
      <path d="M12 8H16" stroke="currentColor" strokeLinecap="round" />
      <rect x="8" y="11" width="2" height="2" rx="0.5" fill="currentColor" fillOpacity="0.7" />
      <path d="M12 12H16" stroke="currentColor" strokeLinecap="round" />
      <rect x="8" y="15" width="2" height="2" rx="0.5" fill="currentColor" fillOpacity="0.4" />
      <path d="M12 16H14" stroke="currentColor" strokeLinecap="round" />
    </svg>
  )
}

// File Check Premium Icon
export function FileCheckPremium({ className, style }: LogoProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("w-5 h-5", className)} style={style} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path
        d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"
        fill="currentColor"
        fillOpacity="0.1"
      />
      <path
        d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14 2V8H20" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 15L11 17L15 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
