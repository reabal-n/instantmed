"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  BarChart3, 
  Download, 
  ListOrdered,
  ClipboardList,
  Settings,
  Zap,
  Palette,
  Building2,
  Shield,
  Keyboard,
  Mail,
  CreditCard,
  ChevronRight,
  Activity,
  FileImage,
  Edit3,
  Database,
  Globe,
  Lock
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { KeyboardShortcutsModal } from "@/components/doctor/keyboard-shortcuts-modal"
import { Badge } from "@/components/ui/badge"

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: boolean
  badgeCount?: number
  description?: string
}

interface NavSection {
  title: string
  items: NavItem[]
  defaultExpanded?: boolean
  variant: "primary" | "secondary" | "tools"
}

interface DashboardSidebarProps {
  variant: "patient" | "doctor" | "admin"
  userName?: string
  userRole?: string
  isAdmin?: boolean
  pendingCount?: number
  requestCount?: number
}

// Patient Navigation - Simple and focused
const patientNavSections: NavSection[] = [
  {
    title: "My Health",
    variant: "primary",
    defaultExpanded: true,
    items: [
      { href: "/patient", label: "Dashboard", icon: LayoutDashboard, description: "Overview of your requests" },
      { href: "/patient/intakes", label: "My Requests", icon: ClipboardList, badge: true, description: "Track your medical requests" },
    ]
  },
  {
    title: "Account",
    variant: "secondary",
    defaultExpanded: false,
    items: [
      { href: "/patient/settings", label: "Settings", icon: Settings, description: "Manage your profile" },
    ]
  }
]

// Doctor Navigation - Clinical workflow focused
const doctorNavSections: NavSection[] = [
  {
    title: "Clinical Workflow",
    variant: "primary",
    defaultExpanded: true,
    items: [
      { href: "/doctor", label: "Review Queue", icon: ListOrdered, badge: true, description: "Patient requests awaiting review" },
      { href: "/doctor/patients", label: "My Patients", icon: Users, description: "Patient management and history" },
      { href: "/doctor/analytics", label: "My Analytics", icon: BarChart3, description: "Personal performance metrics" },
      { href: "/doctor/settings/identity", label: "Settings", icon: Settings, description: "Professional profile and preferences" },
    ]
  },
  {
    title: "Tools",
    variant: "tools",
    defaultExpanded: false,
    items: [
      { href: "/doctor/admin", label: "All Requests", icon: FileText, description: "View all platform requests" },
      { href: "#export", label: "Export Data", icon: Download, description: "Download patient data" },
    ]
  }
]

// Admin Navigation - Platform management focused
const adminNavSections: NavSection[] = [
  {
    title: "Platform Overview",
    variant: "primary",
    defaultExpanded: true,
    items: [
      { href: "/admin", label: "Overview", icon: LayoutDashboard, description: "System dashboard and metrics" },
      { href: "/admin/queue", label: "Request Management", icon: FileText, badge: true, description: "Manage all medical requests" },
      { href: "/admin/patients", label: "User Management", icon: Users, description: "Patient and doctor accounts" },
      { href: "/admin/analytics", label: "Analytics & Reports", icon: BarChart3, description: "Platform analytics and insights" },
      { href: "/admin/settings", label: "System Settings", icon: Settings, description: "Platform configuration" },
    ]
  },
  {
    title: "Communications",
    variant: "secondary",
    defaultExpanded: false,
    items: [
      { href: "/admin/email-hub", label: "Email Hub", icon: Mail, description: "Central email management" },
      { href: "/admin/emails", label: "Email Templates", icon: Edit3, description: "Template management" },
      { href: "/admin/email-test", label: "Email Test Studio", icon: Palette, description: "Design and test emails" },
    ]
  },
  {
    title: "Content & Design",
    variant: "secondary",
    defaultExpanded: false,
    items: [
      { href: "/admin/studio", label: "Certificate Studio", icon: FileImage, description: "Certificate design and templates" },
      { href: "/admin/content", label: "Content Editor", icon: Globe, description: "Website content management" },
    ]
  },
  {
    title: "Operations",
    variant: "tools",
    defaultExpanded: false,
    items: [
      { href: "/admin/ops", label: "Ops Center", icon: Activity, description: "System operations overview" },
      { href: "/admin/finance", label: "Finance", icon: CreditCard, description: "Financial management" },
      { href: "/admin/webhooks", label: "Webhooks", icon: Database, description: "Integration management" },
      { href: "/admin/audit", label: "Audit Logs", icon: Lock, description: "System audit trail" },
    ]
  }
]

// Admin-only sections for doctors
const doctorAdminSections: NavSection[] = [
  {
    title: "Admin Tools",
    variant: "tools",
    defaultExpanded: false,
    items: [
      { href: "/admin/studio", label: "Certificate Studio", icon: Palette },
      { href: "/admin/clinic", label: "Clinic Settings", icon: Building2 },
      { href: "/admin", label: "Admin Dashboard", icon: Shield },
    ]
  }
]

export function DashboardSidebarV2({ 
  variant, 
  userName = "User",
  userRole,
  isAdmin = false,
  pendingCount = 0, 
  requestCount = 0 
}: DashboardSidebarProps) {
  const pathname = usePathname()
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  // Get navigation sections based on variant
  const getNavSections = () => {
    switch (variant) {
      case "patient":
        return patientNavSections
      case "doctor":
        const sections = [...doctorNavSections]
        if (isAdmin) {
          sections.push(...doctorAdminSections)
        }
        return sections
      case "admin":
        return adminNavSections
      default:
        return []
    }
  }

  const navSections = getNavSections()

  // Initialize expanded sections
  useState(() => {
    const initialExpanded = new Set<string>()
    navSections.forEach(section => {
      if (section.defaultExpanded) {
        initialExpanded.add(section.title)
      }
    })
    setExpandedSections(initialExpanded)
  })

  const toggleSection = (title: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(title)) {
        newSet.delete(title)
      } else {
        newSet.add(title)
      }
      return newSet
    })
  }

  const handleExport = () => {
    window.location.href = "/api/doctor/export?format=csv"
  }

  const getSectionVariantStyles = (sectionVariant: string) => {
    switch (sectionVariant) {
      case "primary":
        return "border-indigo-200/50 bg-indigo-50/30 dark:border-indigo-500/20 dark:bg-indigo-500/5"
      case "secondary":
        return "border-violet-200/50 bg-violet-50/30 dark:border-violet-500/20 dark:bg-violet-500/5"
      case "tools":
        return "border-slate-200/50 bg-slate-50/30 dark:border-white/10 dark:bg-white/5"
      default:
        return "border-white/20"
    }
  }

  const getSectionHeaderStyles = (sectionVariant: string) => {
    switch (sectionVariant) {
      case "primary":
        return "text-indigo-700 dark:text-indigo-400"
      case "secondary":
        return "text-violet-700 dark:text-violet-400"
      case "tools":
        return "text-slate-600 dark:text-slate-400"
      default:
        return "text-muted-foreground"
    }
  }

  const getActiveItemStyles = (sectionVariant: string) => {
    switch (sectionVariant) {
      case "primary":
        return "bg-linear-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25"
      case "secondary":
        return "bg-linear-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/25"
      case "tools":
        return "bg-linear-to-r from-slate-600 to-slate-700 text-white shadow-lg shadow-slate-500/25"
      default:
        return "bg-linear-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25"
    }
  }

  const getHoverItemStyles = (sectionVariant: string) => {
    switch (sectionVariant) {
      case "primary":
        return "hover:bg-indigo-100/80 dark:hover:bg-indigo-500/10 hover:text-indigo-700 dark:hover:text-indigo-300"
      case "secondary":
        return "hover:bg-violet-100/80 dark:hover:bg-violet-500/10 hover:text-violet-700 dark:hover:text-violet-300"
      case "tools":
        return "hover:bg-slate-100/80 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-slate-300"
      default:
        return "hover:bg-white/60 dark:hover:bg-white/10 hover:text-foreground"
    }
  }

  const getBadgeStyles = (sectionVariant: string, isActive: boolean) => {
    if (isActive) return "bg-white/20 text-white"
    
    switch (sectionVariant) {
      case "primary":
        return "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
      case "secondary":
        return "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300"
      case "tools":
        return "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300"
      default:
        return "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300"
    }
  }

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col">
      <div className="sticky top-24 space-y-4">
        {/* Logo/Brand Header */}
        <div className="dashboard-card rounded-2xl p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold bg-linear-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                InstantMed
              </span>
              <p className="text-xs text-muted-foreground capitalize">{variant} Portal</p>
            </div>
          </div>
        </div>

        {/* Navigation Sections */}
        {navSections.map((section) => {
          const isExpanded = expandedSections.has(section.title)
          
          return (
            <nav 
              key={section.title}
              className={cn(
                "dashboard-card rounded-2xl p-3 space-y-1 border transition-all duration-300",
                getSectionVariantStyles(section.variant)
              )}
            >
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.title)}
                className="flex items-center justify-between w-full px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              >
                <h4 className={cn(
                  "uppercase tracking-wider",
                  getSectionHeaderStyles(section.variant)
                )}>
                  {section.title}
                </h4>
                <ChevronRight 
                  className={cn(
                    "w-4 h-4 transition-transform duration-200",
                    getSectionHeaderStyles(section.variant),
                    isExpanded && "rotate-90"
                  )}
                />
              </button>

              {/* Section Items */}
              {isExpanded && (
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href || 
                                  (item.href !== "#" && pathname?.startsWith(item.href))
                    const showBadge = item.badge && (
                      variant === "doctor" ? pendingCount > 0 : 
                      variant === "patient" ? requestCount > 0 : false
                    )
                    const badgeCount = variant === "doctor" ? pendingCount : requestCount
                    
                    return (
                      <Link
                        key={item.href}
                        href={item.href === "#export" ? "#" : item.href}
                        onClick={item.href === "#export" ? handleExport : undefined}
                        className={cn(
                          "group flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300",
                          isActive
                            ? getActiveItemStyles(section.variant)
                            : cn(
                                "text-muted-foreground",
                                getHoverItemStyles(section.variant),
                                "hover:-translate-y-0.5 hover:shadow-sm"
                              )
                        )}
                        title={item.description}
                      >
                        <span className="flex items-center gap-3">
                          <item.icon className={cn(
                            "w-4 h-4 transition-transform duration-300",
                            !isActive && "group-hover:scale-110"
                          )} />
                          <div className="flex flex-col items-start">
                            <span>{item.label}</span>
                            {item.description && (
                              <span className="text-xs opacity-70 hidden group-hover:inline">
                                {item.description}
                              </span>
                            )}
                          </div>
                        </span>
                        {showBadge && (
                          <Badge
                            variant="secondary"
                            className={cn(
                              "px-2 py-0.5 rounded-full text-xs font-semibold transition-colors",
                              getBadgeStyles(section.variant, isActive)
                            )}
                          >
                            {badgeCount}
                          </Badge>
                        )}
                      </Link>
                    )
                  })}
                </div>
              )}
            </nav>
          )
        })}

        {/* Quick Stats - Doctor only */}
        {variant === "doctor" && (
          <div className="dashboard-card rounded-2xl p-4 space-y-3 border border-white/20">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Stats</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20">
                <span className="text-sm text-indigo-700 dark:text-indigo-300">Pending Review</span>
                <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{pendingCount}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-violet-50/80 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20">
                <span className="text-sm text-violet-700 dark:text-violet-300">Scripts to Send</span>
                <span className="text-sm font-bold text-violet-700 dark:text-violet-300">{pendingCount}</span>
              </div>
            </div>
          </div>
        )}

        {/* Tools Section */}
        {variant === "doctor" && (
          <div className="dashboard-card rounded-2xl p-4 border border-white/20 space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tools</h4>
            <KeyboardShortcutsModal 
              trigger={
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full rounded-xl bg-white/50 dark:bg-white/5 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:border-indigo-200 dark:hover:border-indigo-500/30 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors justify-between"
                >
                  <span className="flex items-center">
                    <Keyboard className="w-4 h-4 mr-2" />
                    Shortcuts
                  </span>
                  <kbd className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">⌘?</kbd>
                </Button>
              }
            />
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full rounded-xl bg-white/50 dark:bg-white/5 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:border-indigo-200 dark:hover:border-indigo-500/30 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors" 
              onClick={handleExport}
            >
              <Download className="w-4 h-4 mr-2" />
              Export to CSV
            </Button>
          </div>
        )}

        {/* Quick Actions - Patient only */}
        {variant === "patient" && (
          <div className="dashboard-card rounded-2xl p-4 space-y-3 border border-white/20">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Actions</h4>
            <Button 
              asChild 
              className="w-full rounded-xl bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/25"
            >
              <Link href="/request">
                New Request
              </Link>
            </Button>
          </div>
        )}

        {/* User Profile Card */}
        <div className="dashboard-card rounded-2xl p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-violet-600 text-white font-semibold">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">{userName}</p>
              <p className="text-xs text-muted-foreground capitalize">{userRole || variant}</p>
            </div>
            {isAdmin && (
              <Badge variant="secondary" className="text-xs">
                Admin
              </Badge>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}
