'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  Home,
  FileText,
  FolderOpen,
  Settings,
  Plus,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Activity,
  Bell,
  MessageSquare,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { usePanel } from '@/components/panels'

/**
 * LeftRail - Persistent navigation for authenticated areas
 * 
 * Philosophy:
 * - Always visible (dimmed when panel active)
 * - Minimal, focused actions
 * - User context at top
 * - "New Request" is primary action for patients
 * - 64px collapsed, 240px expanded
 */

interface LeftRailProps {
  userName: string
  userAvatar?: string
  userRole: 'patient' | 'doctor'
  onNewRequest?: () => void
}

export function LeftRail({ userName, userAvatar, userRole, onNewRequest }: LeftRailProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const pathname = usePathname()
  const { isPanelOpen } = usePanel()

  // LeftRail is only used by the patient layout (AuthenticatedShell).
  // Doctor layout uses DashboardSidebar instead.
  const navItems = [
    { icon: Home, label: 'Overview', href: '/patient' },
    { icon: FileText, label: 'My Requests', href: '/patient/intakes' },
    { icon: ClipboardList, label: 'Prescriptions', href: '/patient/prescriptions' },
    { icon: Activity, label: 'Health Summary', href: '/patient/health-summary' },
    { icon: FolderOpen, label: 'Documents', href: '/patient/documents' },
    { icon: MessageSquare, label: 'Messages', href: '/patient/messages' },
    { icon: Settings, label: 'Settings', href: '/patient/settings' },
  ]

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 h-screen bg-background border-r border-border transition-all duration-300 z-40 flex flex-col",
        isExpanded ? "w-60" : "w-16",
        isPanelOpen && "opacity-60 pointer-events-none"
      )}
    >
      {/* Header */}
      <div className="h-16 border-b border-border flex items-center justify-between px-4 shrink-0">
        {isExpanded && (
          <span className="font-semibold text-primary">InstantMed</span>
        )}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
          aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isExpanded ? (
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            {userAvatar ? (
              <Image 
                src={userAvatar} 
                alt={userName} 
                className="w-full h-full rounded-full object-cover"
                width={40}
                height={40}
              />
            ) : (
              <span className="text-sm font-medium text-primary">
                {userName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          {isExpanded && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-foreground">{userName}</p>
              <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
            </div>
          )}
          <Link
            href="/patient/notifications"
            className="p-2 rounded-lg hover:bg-muted transition-colors shrink-0"
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4 text-muted-foreground" />
          </Link>
        </div>
      </div>

      {/* New Request Button - Primary Action for Patients */}
      {userRole === 'patient' && (
        <div className="p-4 shrink-0">
          <Button
            className={cn(
              "w-full bg-primary text-white hover:bg-primary/90",
              !isExpanded && "aspect-square p-0"
            )}
            onClick={onNewRequest}
          >
            {isExpanded ? (
              <>
                <Plus className="w-4 h-4 mr-2" />
                New Request
              </>
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </Button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                isActive 
                  ? "bg-primary/10 text-primary font-medium" 
                  : "text-muted-foreground hover:bg-muted"
              )}
              title={!isExpanded ? item.label : undefined}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {isExpanded && <span className="text-sm">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border shrink-0">
        <a
          href="https://instantmed.com.au"
          className={cn(
            "flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors",
            isExpanded ? "mb-3" : "justify-center mb-2",
          )}
          title="Back to InstantMed.com.au"
        >
          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          {isExpanded && "Back to InstantMed.com.au"}
        </a>
        {isExpanded && (
          <p className="text-xs text-muted-foreground text-center">
            InstantMed © {new Date().getFullYear()}
          </p>
        )}
      </div>
    </aside>
  )
}
