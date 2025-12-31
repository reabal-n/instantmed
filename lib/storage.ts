"use client"
/* eslint-disable no-console -- Client-side storage utilities need console for error reporting */

/**
 * Storage utilities with TTL support for form persistence
 */

const DEFAULT_TTL = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

interface StoredData<T> {
  data: T
  expiry: number
}

/**
 * Save data to localStorage with TTL expiration
 */
export function saveWithTTL<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL): void {
  try {
    const item: StoredData<T> = {
      data,
      expiry: Date.now() + ttlMs,
    }
    localStorage.setItem(key, JSON.stringify(item))
  } catch (e) {
    console.error(`Failed to save to localStorage: ${key}`, e)
  }
}

/**
 * Load data from localStorage, checking TTL expiration
 */
export function loadWithTTL<T>(key: string): T | null {
  try {
    const itemStr = localStorage.getItem(key)
    if (!itemStr) return null

    const item: StoredData<T> = JSON.parse(itemStr)
    
    if (Date.now() > item.expiry) {
      localStorage.removeItem(key)
      return null
    }
    
    return item.data
  } catch (e) {
    console.error(`Failed to load from localStorage: ${key}`, e)
    return null
  }
}

/**
 * Remove data from localStorage
 */
export function removeFromStorage(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch (e) {
    console.error(`Failed to remove from localStorage: ${key}`, e)
  }
}

/**
 * Save form data with fallback - tries sessionStorage first, then localStorage with TTL
 */
export function saveFormData<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL): void {
  try {
    // Save to sessionStorage for current session
    sessionStorage.setItem(key, JSON.stringify(data))
    // Also save to localStorage with TTL as fallback
    saveWithTTL(key, data, ttlMs)
  } catch (e) {
    console.error(`Failed to save form data: ${key}`, e)
  }
}

/**
 * Load form data - tries sessionStorage first, then localStorage with TTL check
 */
export function loadFormData<T>(key: string): T | null {
  try {
    // Try sessionStorage first
    const sessionData = sessionStorage.getItem(key)
    if (sessionData) {
      return JSON.parse(sessionData)
    }
    
    // Fall back to localStorage with TTL check
    return loadWithTTL<T>(key)
  } catch (e) {
    console.error(`Failed to load form data: ${key}`, e)
    return null
  }
}

/**
 * Clear form data from both storages
 */
export function clearFormData(key: string): void {
  try {
    sessionStorage.removeItem(key)
    localStorage.removeItem(key)
  } catch (e) {
    console.error(`Failed to clear form data: ${key}`, e)
  }
}

// Storage keys for forms
export const STORAGE_KEYS = {
  MED_CERT_FORM: "med_cert_form_data",
  MED_CERT_STEP: "med_cert_form_step",
  PRESCRIPTION_FORM: "prescription_form_data",
  PRESCRIPTION_STEP: "prescription_form_step",
  FORM_DRAFT_ID: "form_draft_id",
} as const
