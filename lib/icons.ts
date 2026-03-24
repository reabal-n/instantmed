"use client"

/**
 * Icon barrel file — Phosphor Icons with duotone default
 *
 * Maps lucide-react names → Phosphor equivalents so the migration
 * only changes the import path in each consuming file.
 *
 * Default weight: "duotone" (Phosphor's signature premium look).
 * Override per-icon with the `weight` prop when needed.
 *
 * @see https://phosphoricons.com
 */

// Re-export the Phosphor type system
export type { Icon as LucideIcon, Icon as IconType, IconProps, IconWeight } from "@phosphor-icons/react"
export { IconContext } from "@phosphor-icons/react"

// ─── Direct name matches ─────────────────────────────────────────────
export {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bell,
  BookOpen,
  Brain,
  Briefcase,
  Bug,
  Calendar,
  Check,
  Circle,
  Clock,
  Cloud,
  Coffee,
  Copy,
  CreditCard,
  Database,
  Download,
  Eye,
  Gift,
  Globe,
  HardHat,
  Heart,
  Hospital,
  Info,
  Keyboard,
  Lock,
  MapPin,
  Minus,
  Monitor,
  Moon,
  Phone,
  Pill,
  Plus,
  Scissors,
  Shield,
  Sparkle,
  Star,
  Stethoscope,
  Sun,
  Syringe,
  Target,
  Timer,
  Trophy,
  User,
  Wrench,
  X,
  XCircle,
} from "@phosphor-icons/react"

// ─── Name remappings (lucide alias → phosphor export) ────────────────
export { Pulse as Activity } from "@phosphor-icons/react"
export { WarningCircle as AlertCircle } from "@phosphor-icons/react"
export { Warning as AlertTriangle } from "@phosphor-icons/react"
export { ArrowsDownUp as ArrowUpDown } from "@phosphor-icons/react"
export { Trophy as Award } from "@phosphor-icons/react"
export { SealCheck as BadgeCheck } from "@phosphor-icons/react"
export { Prohibit as Ban } from "@phosphor-icons/react"
export { ChartBar as BarChart3 } from "@phosphor-icons/react"
export { Buildings as Building } from "@phosphor-icons/react"
export { BuildingOffice as Building2 } from "@phosphor-icons/react"
export { CalendarBlank as CalendarIcon } from "@phosphor-icons/react"
export { CalendarDots as CalendarDays } from "@phosphor-icons/react"
export { Checks as CheckCheck } from "@phosphor-icons/react"
export { CheckCircle } from "@phosphor-icons/react"
export { CheckCircle as CheckCircle2 } from "@phosphor-icons/react"
export { CheckCircle as CircleCheck } from "@phosphor-icons/react"
export { Check as CheckIcon } from "@phosphor-icons/react"
export { CaretDown as ChevronDown } from "@phosphor-icons/react"
export { CaretDown as ChevronDownIcon } from "@phosphor-icons/react"
export { CaretLeft as ChevronLeft } from "@phosphor-icons/react"
export { CaretRight as ChevronRight } from "@phosphor-icons/react"
export { CaretRight as ChevronRightIcon } from "@phosphor-icons/react"
export { CaretUp as ChevronUp } from "@phosphor-icons/react"
export { Circle as CircleIcon } from "@phosphor-icons/react"
export { ClipboardText as ClipboardList } from "@phosphor-icons/react"
export { CloudSlash as CloudOff } from "@phosphor-icons/react"
export { CurrencyDollar as DollarSign } from "@phosphor-icons/react"
export { Drop as Droplet } from "@phosphor-icons/react"
export { Drop as Drops } from "@phosphor-icons/react"
export { PencilSimple as Edit2 } from "@phosphor-icons/react"
export { ArrowSquareOut as ExternalLink } from "@phosphor-icons/react"
export { EyeSlash as EyeOff } from "@phosphor-icons/react"
export { SealCheck as FileCheck } from "@phosphor-icons/react"
export { FileMagnifyingGlass as FileSearch } from "@phosphor-icons/react"
export { FileText } from "@phosphor-icons/react"
export { Funnel as Filter } from "@phosphor-icons/react"
export { FolderOpen } from "@phosphor-icons/react"
export { GraduationCap } from "@phosphor-icons/react"
export { Heartbeat as HeartPulse } from "@phosphor-icons/react"
export { Question as HelpCircle } from "@phosphor-icons/react"
export { ClockCounterClockwise as History } from "@phosphor-icons/react"
export { House as Home } from "@phosphor-icons/react"
export { Bank as Landmark } from "@phosphor-icons/react"
export { Lightbulb } from "@phosphor-icons/react"
export { SpinnerGap as Loader2 } from "@phosphor-icons/react"
export { SignIn as LogIn } from "@phosphor-icons/react"
export { EnvelopeSimple as Mail } from "@phosphor-icons/react"
export { ChatCircle as MessageCircle } from "@phosphor-icons/react"
export { ChatText as MessageSquare } from "@phosphor-icons/react"
export { DotsThree as MoreHorizontal } from "@phosphor-icons/react"
export { ArrowCounterClockwise as RefreshCcw } from "@phosphor-icons/react"
export { ArrowClockwise as RefreshCw } from "@phosphor-icons/react"
export { ArrowCounterClockwise as RotateCcw } from "@phosphor-icons/react"
export { ArrowCounterClockwise as RotateCw } from "@phosphor-icons/react"
export { FloppyDisk as Save } from "@phosphor-icons/react"
export { Scales as Scale } from "@phosphor-icons/react"
export { MagnifyingGlass as Search } from "@phosphor-icons/react"
export { PaperPlaneTilt as Send } from "@phosphor-icons/react"
export { HardDrives as Server } from "@phosphor-icons/react"
export { HardDrives as ServerOff } from "@phosphor-icons/react"
export { Gear as Settings } from "@phosphor-icons/react"
export { ShieldWarning as ShieldAlert } from "@phosphor-icons/react"
export { ShieldCheck } from "@phosphor-icons/react"
export { DeviceMobile as Smartphone } from "@phosphor-icons/react"
export { Sparkle as Sparkles } from "@phosphor-icons/react"
export { ClipboardText as Tablet } from "@phosphor-icons/react"
export { Timer as TimerOff } from "@phosphor-icons/react"
export { TrendDown as TrendingDown } from "@phosphor-icons/react"
export { TrendUp as TrendingUp } from "@phosphor-icons/react"
export { LockOpen as Unlock } from "@phosphor-icons/react"
export { UserCheck } from "@phosphor-icons/react"
export { UserMinus as UserX } from "@phosphor-icons/react"
export { Users } from "@phosphor-icons/react"
export { WifiSlash as WifiOff } from "@phosphor-icons/react"
export { Lightning as Zap } from "@phosphor-icons/react"

// ─── Additional mappings (found during typecheck) ────────────────────
export { ClipboardText as ClipboardCheck } from "@phosphor-icons/react"
export { SignOut as LogOut } from "@phosphor-icons/react"
export { Cursor as MousePointer } from "@phosphor-icons/react"
export { Scroll as ScrollText } from "@phosphor-icons/react"
export { Robot as Bot } from "@phosphor-icons/react"
export { WebhooksLogo as Webhook } from "@phosphor-icons/react"
export { Upload } from "@phosphor-icons/react"
export { Image } from "@phosphor-icons/react"
export { Pencil } from "@phosphor-icons/react"
export { PencilSimple as Edit } from "@phosphor-icons/react"
export { PencilLine as Edit3 } from "@phosphor-icons/react"
export { Trash as Trash2 } from "@phosphor-icons/react"
export { Receipt } from "@phosphor-icons/react"
export { ToggleLeft } from "@phosphor-icons/react"
export { Megaphone } from "@phosphor-icons/react"
export { DotsSixVertical as GripVertical } from "@phosphor-icons/react"
export { Power } from "@phosphor-icons/react"
export { Power as PowerOff } from "@phosphor-icons/react"
export { TestTube } from "@phosphor-icons/react"
export { Note as StickyNote } from "@phosphor-icons/react"
export { Flag } from "@phosphor-icons/react"
export { DotsThreeVertical as MoreVertical } from "@phosphor-icons/react"
export { Pause } from "@phosphor-icons/react"
export { Play } from "@phosphor-icons/react"
export { PhoneSlash as PhoneOff } from "@phosphor-icons/react"
export { Thermometer } from "@phosphor-icons/react"
export { Thermometer as ThermometerSun } from "@phosphor-icons/react"
export { Fingerprint } from "@phosphor-icons/react"
export { Tag } from "@phosphor-icons/react"
export { Link as Link2 } from "@phosphor-icons/react"
export { LinkedinLogo as Linkedin } from "@phosphor-icons/react"
export { XLogo as Twitter } from "@phosphor-icons/react"
export { FacebookLogo as Facebook } from "@phosphor-icons/react"
export { List } from "@phosphor-icons/react"
export { List as Menu } from "@phosphor-icons/react"
export { ListNumbers as ListOrdered } from "@phosphor-icons/react"
export { TextB as Bold } from "@phosphor-icons/react"
export { TextItalic as Italic } from "@phosphor-icons/react"
export { TextHTwo as Heading2 } from "@phosphor-icons/react"
export { ArrowUUpLeft as Undo2 } from "@phosphor-icons/react"
export { SquaresFour as LayoutDashboard } from "@phosphor-icons/react"
export { GearSix as Cog } from "@phosphor-icons/react"
export { Gauge } from "@phosphor-icons/react"
export { PenNib as PenTool } from "@phosphor-icons/react"
export { Mailbox } from "@phosphor-icons/react"
export { Tray as Inbox } from "@phosphor-icons/react"
export { Wind } from "@phosphor-icons/react"
export { ShareNetwork as Share2 } from "@phosphor-icons/react"
export { Code } from "@phosphor-icons/react"
export { PaperPlaneTilt as SendHorizonal } from "@phosphor-icons/react"
export { QrCode } from "@phosphor-icons/react"
export { GraduationCap as School } from "@phosphor-icons/react"
export { Signature as FileSignature } from "@phosphor-icons/react"
export { Gear as ServerCog } from "@phosphor-icons/react"
export { Stack as Layers } from "@phosphor-icons/react"
export { GitDiff as GitCompare } from "@phosphor-icons/react"
export { Drop as Droplets } from "@phosphor-icons/react"
export { EnvelopeOpen as MailOpen } from "@phosphor-icons/react"
export { EnvelopeSimple as MailCheck } from "@phosphor-icons/react"
export { ListChecks } from "@phosphor-icons/react"
export { Handbag as ShoppingBag } from "@phosphor-icons/react"
export { Laptop } from "@phosphor-icons/react"
export { Car } from "@phosphor-icons/react"

// ─── Icon size tokens ────────────────────────────────────────────────
// Standardized size classes for consistent icon sizing across the app.
// Usage: <Shield className={iconSize.md} /> or <Clock className={iconSize.lg} />
export const iconSize = {
  /** 14px — inline text, badges, tiny indicators */
  xs: "w-3.5 h-3.5",
  /** 16px — form inputs, small buttons, list items */
  sm: "w-4 h-4",
  /** 20px — default, matches IconProvider size. Nav items, cards */
  md: "w-5 h-5",
  /** 24px — section headings, feature grids */
  lg: "w-6 h-6",
  /** 28px — hero decorative, large feature icons */
  xl: "w-7 h-7",
  /** 32px — page-level status, empty states */
  "2xl": "w-8 h-8",
  /** 40px — success/error splash screens */
  "3xl": "w-10 h-10",
} as const
