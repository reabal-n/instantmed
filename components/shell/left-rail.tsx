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
  Stethoscope,
  ClipboardList,
  Activity
} from 'lucide-react'
import { Button } from '@heroui/react'
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

  const navItems = userRole === 'patient' ? [
    { icon: Home, label: 'Overview', href: '/patient' },
    { icon: FileText, label: 'My Requests', href: '/patient/requests' },
    { icon: Activity, label: 'Health Summary', href: '/patient/health-summary' },
    { icon: FolderOpen, label: 'Documents', href: '/patient/documents' },
    { icon: Settings, label: 'Settings', href: '/patient/settings' },
  ] : [
    { icon: Home, label: 'Dashboard', href: '/doctor' },
    { icon: ClipboardList, label: 'Queue', href: '/doctor/queue' },
    { icon: Stethoscope, label: 'Profile', href: '/doctor/profile' },
    { icon: Settings, label: 'Settings', href: '/doctor/settings' },
  ]

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 h-screen bg-white border-r border-gray-200 transition-all duration-300 z-40 flex flex-col",
        isExpanded ? "w-60" : "w-16",
        isPanelOpen && "opacity-60 pointer-events-none"
      )}
    >
      {/* Header */}
      <div className="h-16 border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
        {isExpanded && (
          <span className="font-semibold text-primary">InstantMed</span>
        )}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isExpanded ? (
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-600" />
          )}
        </button>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-gray-200 shrink-0">
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
              <p className="text-sm font-medium truncate text-gray-900">{userName}</p>
              <p className="text-xs text-gray-500 capitalize">{userRole}</p>
            </div>
          )}
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
                  : "text-gray-600 hover:bg-gray-100"
              )}
              title={!isExpanded ? item.label : undefined}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {isExpanded && <span className="text-sm">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer - Optional branding */}
      {isExpanded && (
        <div className="p-4 border-t border-gray-200 shrink-0">
          <p className="text-xs text-gray-500 text-center">
            InstantMed © {new Date().getFullYear()}
          </p>
        </div>
      )}
    </aside>
  )
}
