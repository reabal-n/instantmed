import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const onboarding = vi.hoisted(() => vi.fn(async () => null))
vi.mock('@/lib/data/staff-nav-counts', () => ({ getStaffNavCounts: async () => ({}) }))
vi.mock('@/lib/doctor/onboarding-status', () => ({ getDoctorOnboardingStatus: onboarding }))
vi.mock('@/lib/observability/logger', () => ({ createLogger: () => ({ error: vi.fn() }) }))
vi.mock('@/components/operator/operator-shell', () => ({ OperatorShell: ({ children, hideMobileHamburger, contentMaxWidth }: { children: React.ReactNode; hideMobileHamburger: boolean; contentMaxWidth: string }) => <main data-width={contentMaxWidth}>{!hideMobileHamburger && <nav>Staff menu</nav>}{children}</main> }))
vi.mock('@/app/doctor/doctor-shell', () => ({ DoctorShell: ({ children }: { children: React.ReactNode }) => <section>{children}<nav>Clinical tabs</nav></section> }))
vi.mock('@/components/doctor/onboarding-banner', () => ({ DoctorOnboardingBanner: () => <aside>Setup</aside> }))

import { StaffLayout } from '@/components/operator/staff-layout'

beforeEach(() => vi.clearAllMocks())
describe('shared staff frame', () => {
  it.each(['admin', 'doctor', 'support'] as const)('keeps %s navigation and setup within its role', async role => {
    const html = renderToStaticMarkup(await StaffLayout({ profile: { id: 'staff-a', full_name: 'Test Staff', role }, children: <p>Record</p> }))
    expect(html).toContain('data-width="wide"')
    expect(html.includes('Staff menu')).toBe(role !== 'doctor')
    expect(html.includes('Clinical tabs')).toBe(role !== 'support')
    expect(html.includes('Setup')).toBe(role !== 'support')
    expect(onboarding).toHaveBeenCalledTimes(role === 'support' ? 0 : 1)
    expect(html).toContain('Record')
  })
})
