import {
  AlertCircle,
  BadgeCheck,
  Building2,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileCheck,
  FileText,
  HelpCircle,
  Lock,
  Mail,
  MessageCircle,
  Phone,
  Pill,
  RefreshCw,
  Shield,
  Sparkles,
  Star,
  Stethoscope,
  Users,
} from 'lucide-react'
import type React from 'react'

import type { StickerIconName } from '@/components/icons/stickers'

// ===========================================
// TYPE DEFINITIONS (canonical source: @/types/marketing)
// ===========================================

export type { ServiceFunnelConfig } from "@/types/marketing"

// ===========================================
// COLOR CLASSES
// ===========================================

export const colorClasses = {
  emerald: {
    gradient: 'from-emerald-500 to-teal-600',
    light: 'bg-success-light',
    text: 'text-success',
    border: 'border-success-border',
    button: 'bg-emerald-600 hover:bg-emerald-700',
    ring: 'ring-emerald-500/20',
  },
  blue: {
    gradient: 'from-blue-500 to-sky-600',
    light: 'bg-info-light',
    text: 'text-info',
    border: 'border-info-border',
    button: 'bg-blue-600 hover:bg-blue-700',
    ring: 'ring-blue-500/20',
  },
  sky: {
    gradient: 'from-sky-500 to-blue-600',
    light: 'bg-sky-50 dark:bg-sky-950/30',
    text: 'text-sky-600 dark:text-sky-400',
    border: 'border-sky-200 dark:border-sky-800',
    button: 'bg-sky-600 hover:bg-sky-700',
    ring: 'ring-sky-500/20',
  },
}

export type ColorClasses = typeof colorClasses[keyof typeof colorClasses]

// ===========================================
// ICON MAP
// ===========================================

export const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Shield, Clock, Lock, Check, Building2, Users, Star, FileText, Pill,
  Stethoscope, ClipboardList, FileCheck, MessageCircle, AlertCircle,
  Phone, Mail, RefreshCw, BadgeCheck, HelpCircle, Sparkles, CheckCircle2,
}

export const STICKER_ICON_MAP: Record<string, StickerIconName> = {
  ClipboardList: 'medical-history',
  FileCheck: 'medical-history',
  FileText: 'medical-history',
  Stethoscope: 'stethoscope',
  Mail: 'email',
  Shield: 'security-shield',
  Clock: 'clock',
  BadgeCheck: 'verified-badge',
  CheckCircle2: 'checkmark',
  Sparkles: 'hair-brush',
  Pill: 'pill-bottle',
  Lightning: 'lightning',
}
