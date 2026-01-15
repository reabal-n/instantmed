/**
 * Returning User Detection & Personalization
 * Stores user data locally for personalized experiences
 */

const USER_DATA_KEY = 'instantmed_user_data'
const VISIT_HISTORY_KEY = 'instantmed_visits'

export interface UserData {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  dateOfBirth?: string
  lastService?: string
  lastServiceName?: string
  lastVisit?: number
  totalVisits?: number
  hasCompletedPurchase?: boolean
  preferredServices?: string[]
}

interface VisitRecord {
  page: string
  service?: string
  timestamp: number
}

/**
 * Get stored user data for personalization
 */
export function getUserData(): UserData | null {
  if (typeof window === 'undefined') return null

  try {
    const data = localStorage.getItem(USER_DATA_KEY)
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

/**
 * Update stored user data
 */
export function updateUserData(updates: Partial<UserData>) {
  if (typeof window === 'undefined') return

  try {
    const existing = getUserData() || {}
    const updated: UserData = {
      ...existing,
      ...updates,
      lastVisit: Date.now(),
      totalVisits: (existing.totalVisits || 0) + (updates.totalVisits ? 0 : 0),
    }

    localStorage.setItem(USER_DATA_KEY, JSON.stringify(updated))
  } catch {
    // Storage not available
  }
}

/**
 * Store user details from form submission
 */
export function storeUserDetails(details: {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  dateOfBirth?: string
}) {
  updateUserData(details)
}

/**
 * Store the service user interacted with
 */
export function storeLastService(service: string, serviceName: string) {
  updateUserData({
    lastService: service,
    lastServiceName: serviceName,
  })

  // Also track in preferred services
  const userData = getUserData()
  const preferred = userData?.preferredServices || []
  if (!preferred.includes(service)) {
    preferred.push(service)
    // Keep only last 5
    if (preferred.length > 5) {
      preferred.shift()
    }
    updateUserData({ preferredServices: preferred })
  }
}

/**
 * Mark user as having completed a purchase
 */
export function markPurchaseComplete() {
  updateUserData({ hasCompletedPurchase: true })
}

/**
 * Check if user is returning (has visited before)
 */
export function isReturningUser(): boolean {
  const userData = getUserData()
  return !!(userData && userData.lastVisit)
}

/**
 * Check if user has completed a purchase before
 */
export function isPreviousCustomer(): boolean {
  const userData = getUserData()
  return !!userData?.hasCompletedPurchase
}

/**
 * Get personalized greeting based on user data
 */
export function getPersonalizedGreeting(): string | null {
  const userData = getUserData()
  
  if (!userData) return null

  if (userData.firstName) {
    if (userData.hasCompletedPurchase) {
      return `Welcome back, ${userData.firstName}`
    }
    return `Good to see you again, ${userData.firstName}`
  }

  if (userData.lastService) {
    return `Welcome back`
  }

  return null
}

/**
 * Get suggested service based on history
 */
export function getSuggestedService(): { service: string; name: string } | null {
  const userData = getUserData()
  
  if (userData?.lastService && userData?.lastServiceName) {
    return {
      service: userData.lastService,
      name: userData.lastServiceName,
    }
  }

  return null
}

/**
 * Track page visit
 */
export function trackVisit(page: string, service?: string) {
  if (typeof window === 'undefined') return

  try {
    // Update visit count
    const userData = getUserData() || {}
    updateUserData({
      totalVisits: (userData.totalVisits || 0) + 1,
      lastVisit: Date.now(),
    })

    // Store visit record
    const existingVisits = localStorage.getItem(VISIT_HISTORY_KEY)
    const visits: VisitRecord[] = existingVisits ? JSON.parse(existingVisits) : []

    visits.push({
      page,
      service,
      timestamp: Date.now(),
    })

    // Keep only last 50 visits
    if (visits.length > 50) {
      visits.splice(0, visits.length - 50)
    }

    localStorage.setItem(VISIT_HISTORY_KEY, JSON.stringify(visits))
  } catch {
    // Storage not available
  }
}

/**
 * Get visit history for analytics
 */
export function getVisitHistory(): VisitRecord[] {
  if (typeof window === 'undefined') return []

  try {
    const data = localStorage.getItem(VISIT_HISTORY_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

/**
 * Get time since last visit in human readable format
 */
export function getTimeSinceLastVisit(): string | null {
  const userData = getUserData()
  if (!userData?.lastVisit) return null

  const diff = Date.now() - userData.lastVisit
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor(diff / (1000 * 60))

  if (days > 30) return 'over a month ago'
  if (days > 7) return `${Math.floor(days / 7)} weeks ago`
  if (days > 1) return `${days} days ago`
  if (days === 1) return 'yesterday'
  if (hours > 1) return `${hours} hours ago`
  if (minutes > 1) return `${minutes} minutes ago`
  return 'just now'
}

/**
 * Clear all user data (for privacy/logout)
 */
export function clearUserData() {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(USER_DATA_KEY)
    localStorage.removeItem(VISIT_HISTORY_KEY)
  } catch {
    // Storage not available
  }
}
