# 🏗️ Essential Infrastructure Implementation Guide

**Date:** April 2026  
**Status:** Complete implementation patterns  
**Purpose:** Build robust, accessible, performant infrastructure

---

## ✅ 1. Form Auto-Save System (IMPLEMENTED)

### **Location:** `hooks/use-form-autosave.ts`

### **Features:**
- ✅ Automatic debounced saves to localStorage/sessionStorage
- ✅ Configurable save interval (default: 2000ms)
- ✅ Automatic cleanup of old data (7 days)
- ✅ Unsaved changes warning
- ✅ React Hook Form integration

### **Usage:**

```tsx
import { useFormAutosave, useUnsavedChangesWarning } from '@/hooks/use-form-autosave'

function MedicalCertForm() {
  const [formData, setFormData] = useState({})
  const [hasChanges, setHasChanges] = useState(false)
  
  // Setup autosave
  const { saveForm, loadForm, clearForm, hasAutosavedData } = useFormAutosave('med-cert-form', {
    debounceMs: 2000,
    storage: 'session',
    onSave: () => setHasChanges(false),
    onLoad: (data) => setFormData(data)
  })
  
  // Warn about unsaved changes
  useUnsavedChangesWarning(hasChanges)
  
  // Load saved data on mount
  useEffect(() => {
    const saved = loadForm()
    if (saved) {
      setFormData(saved)
      toast.info('Draft restored', {
        description: 'Your previous progress was loaded'
      })
    }
  }, [])
  
  // Auto-save on changes
  useEffect(() => {
    if (hasChanges) {
      saveForm(formData)
    }
  }, [formData, hasChanges])
  
  // Clear on successful submit
  const handleSubmit = async () => {
    await submitForm(formData)
    clearForm()
    setHasChanges(false)
  }
  
  return <form>...</form>
}
```

### **With React Hook Form:**

```tsx
import { useForm } from 'react-hook-form'
import { useFormAutosaveWithRHF } from '@/hooks/use-form-autosave'

function MedicalCertForm() {
  const { register, handleSubmit, watch } = useForm()
  
  // Auto-save with RHF
  const { loadForm, clearForm } = useFormAutosaveWithRHF(
    'med-cert-form',
    watch,
    { debounceMs: 2000 }
  )
  
  // Load saved data on mount
  useEffect(() => {
    const saved = loadForm()
    if (saved) {
      // Reset form with saved data
      reset(saved)
    }
  }, [])
  
  return <form>...</form>
}
```

---

## 🎯 2. Accessibility Improvements

### **A. Keyboard Navigation**

**Pattern:**
```tsx
// components/ui/accessible-button.tsx
import { forwardRef, KeyboardEvent } from 'react'

interface AccessibleButtonProps {
  onClick: () => void
  children: React.ReactNode
  disabled?: boolean
  ariaLabel?: string
}

export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  ({ onClick, children, disabled, ariaLabel }, ref) => {
    const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
      // Enter and Space should trigger the button
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        if (!disabled) {
          onClick()
        }
      }
    }
    
    return (
      <button
        ref={ref}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-label={ariaLabel}
        className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        {children}
      </button>
    )
  }
)
```

### **B. ARIA Labels & Roles**

**Implementation:**

```tsx
// Enhanced form inputs
<Input
  id="email"
  type="email"
  aria-label="Email address"
  aria-required="true"
  aria-invalid={!!errors.email}
  aria-describedby={errors.email ? "email-error" : undefined}
/>
{errors.email && (
  <span id="email-error" role="alert" className="text-sm text-red-600">
    {errors.email.message}
  </span>
)}

// Status badges
<span
  role="status"
  aria-label={`Request status: ${status}`}
  className="badge"
>
  {status}
</span>

// Loading states
<div role="status" aria-live="polite" aria-busy="true">
  <span className="sr-only">Loading...</span>
  <Loader className="animate-spin" />
</div>

// Panels
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="panel-title"
  aria-describedby="panel-description"
>
  <h2 id="panel-title">Request Details</h2>
  <p id="panel-description">Review your request information</p>
</div>
```

### **C. Focus Management**

**Pattern:**
```tsx
// hooks/use-focus-trap.ts
import { useEffect, useRef } from 'react'

export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<Element | null>(null)
  
  useEffect(() => {
    if (!isActive) return
    
    // Store previously focused element
    previousActiveElement.current = document.activeElement
    
    // Focus first focusable element
    const focusableElements = containerRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    if (focusableElements && focusableElements.length > 0) {
      (focusableElements[0] as HTMLElement).focus()
    }
    
    // Trap focus within container
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !containerRef.current) return
      
      const focusableElements = Array.from(
        containerRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ) as HTMLElement[]
      
      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault()
        lastElement.focus()
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault()
        firstElement.focus()
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      
      // Restore focus
      if (previousActiveElement.current instanceof HTMLElement) {
        previousActiveElement.current.focus()
      }
    }
  }, [isActive])
  
  return containerRef
}

// Usage
function Modal({ isOpen }: { isOpen: boolean }) {
  const containerRef = useFocusTrap(isOpen)
  
  return (
    <div ref={containerRef} role="dialog">
      {/* Modal content */}
    </div>
  )
}
```

### **D. Screen Reader Optimization**

**Patterns:**

```tsx
// Skip to content link
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:p-4 focus:bg-white focus:shadow-lg"
>
  Skip to main content
</a>

// Live regions for dynamic content
<div
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
>
  {toastMessage}
</div>

// Progress indication
<div
  role="progressbar"
  aria-valuenow={currentStep}
  aria-valuemin={1}
  aria-valuemax={totalSteps}
  aria-label={`Step ${currentStep} of ${totalSteps}`}
>
  <span className="sr-only">
    Step {currentStep} of {totalSteps}: {stepTitle}
  </span>
</div>
```

---

## 🔄 3. Error Recovery System

### **A. Automatic Retry with Exponential Backoff**

```tsx
// lib/utils/retry.ts
export interface RetryOptions {
  maxRetries?: number
  initialDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  shouldRetry?: (error: Error) => boolean
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    shouldRetry = () => true
  } = options
  
  let lastError: Error
  let delay = initialDelay
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      // Don't retry if we've exhausted attempts or shouldn't retry this error
      if (attempt === maxRetries || !shouldRetry(lastError)) {
        throw lastError
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay))
      
      // Exponential backoff
      delay = Math.min(delay * backoffMultiplier, maxDelay)
      
      logger.info(`Retrying (attempt ${attempt + 2}/${maxRetries + 1})`, {
        error: lastError.message,
        delay
      })
    }
  }
  
  throw lastError!
}

// Usage
const fetchData = async () => {
  return await retryWithBackoff(
    () => fetch('/api/endpoint').then(r => r.json()),
    {
      maxRetries: 3,
      shouldRetry: (error) => {
        // Only retry on network errors, not 4xx
        return !error.message.includes('404')
      }
    }
  )
}
```

### **B. Circuit Breaker Pattern**

```tsx
// lib/utils/circuit-breaker.ts
export class CircuitBreaker {
  private failureCount = 0
  private lastFailureTime: number | null = null
  private state: 'closed' | 'open' | 'half-open' = 'closed'
  
  constructor(
    private threshold: number = 5,
    private timeout: number = 60000,
    private resetTimeout: number = 30000
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime! >= this.resetTimeout) {
        this.state = 'half-open'
      } else {
        throw new Error('Circuit breaker is open')
      }
    }
    
    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }
  
  private onSuccess() {
    this.failureCount = 0
    this.state = 'closed'
  }
  
  private onFailure() {
    this.failureCount++
    this.lastFailureTime = Date.now()
    
    if (this.failureCount >= this.threshold) {
      this.state = 'open'
      logger.warn('Circuit breaker opened', {
        failureCount: this.failureCount,
        threshold: this.threshold
      })
    }
  }
  
  getState() {
    return this.state
  }
}

// Usage
const apiCircuitBreaker = new CircuitBreaker(5, 60000, 30000)

const fetchWithCircuitBreaker = async () => {
  try {
    return await apiCircuitBreaker.execute(() =>
      fetch('/api/endpoint').then(r => r.json())
    )
  } catch (error) {
    if (error.message === 'Circuit breaker is open') {
      toast.error('Service temporarily unavailable', {
        description: 'Please try again in a moment'
      })
    }
    throw error
  }
}
```

### **C. Graceful Degradation**

```tsx
// components/with-fallback.tsx
import { Component, ReactNode } from 'react'

interface ErrorBoundaryProps {
  fallback: ReactNode
  children: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  { hasError: boolean }
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }
  
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('Component error', { error, errorInfo })
    this.props.onError?.(error, errorInfo)
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }
    
    return this.props.children
  }
}

// Usage
<ErrorBoundary
  fallback={
    <div className="p-6 text-center">
      <p>Something went wrong</p>
      <Button onClick={() => window.location.reload()}>
        Reload page
      </Button>
    </div>
  }
>
  <YourComponent />
</ErrorBoundary>
```

---

## ⚡ 4. Performance Optimizations

### **A. Code Splitting & Lazy Loading**

```tsx
// Dynamic imports
import { lazy, Suspense } from 'react'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'

const MedicalCertFlow = lazy(() => import('@/app/medical-certificate/request/med-cert-flow-client'))

function MedicalCertPage() {
  return (
    <Suspense fallback={<SkeletonLoader count={5} />}>
      <MedicalCertFlow />
    </Suspense>
  )
}
```

### **B. Memoization & React.memo**

```tsx
import { memo, useMemo, useCallback } from 'react'

// Memoize expensive components
const RequestCard = memo(function RequestCard({ request }: { request: Request }) {
  return <div>{/* Card content */}</div>
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if request ID or status changed
  return prevProps.request.id === nextProps.request.id &&
         prevProps.request.status === nextProps.request.status
})

// Memoize expensive computations
const filteredRequests = useMemo(() => {
  return requests.filter(r => r.status === statusFilter)
}, [requests, statusFilter])

// Memoize callbacks
const handleClick = useCallback((id: string) => {
  console.log('Clicked:', id)
}, [])
```

### **C. Virtual Scrolling for Large Lists**

```tsx
// Install: npm install react-window
import { FixedSizeList } from 'react-window'

function LargeRequestList({ requests }: { requests: Request[] }) {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <RequestCard request={requests[index]} />
    </div>
  )
  
  return (
    <FixedSizeList
      height={600}
      itemCount={requests.length}
      itemSize={100}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  )
}
```

### **D. Debouncing & Throttling**

```tsx
// hooks/use-debounce.ts
import { useEffect, useState } from 'react'

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)
    
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])
  
  return debouncedValue
}

// Usage
function SearchInput() {
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedQuery = useDebounce(searchQuery, 500)
  
  useEffect(() => {
    if (debouncedQuery) {
      // Perform search
      searchRequests(debouncedQuery)
    }
  }, [debouncedQuery])
  
  return (
    <Input
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      placeholder="Search..."
    />
  )
}
```

### **E. Image Optimization**

```tsx
// Use Next.js Image component
import Image from 'next/image'

<Image
  src="/doctor-headshot.jpg"
  alt="Doctor profile"
  width={400}
  height={400}
  loading="lazy"
  placeholder="blur"
  blurDataURL="/doctor-headshot-blur.jpg"
/>
```

### **F. React Query for Data Caching**

```tsx
// Install: npm install @tanstack/react-query
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

function RequestsList() {
  const queryClient = useQueryClient()
  
  // Fetch with caching
  const { data, isLoading, error } = useQuery({
    queryKey: ['requests'],
    queryFn: () => fetch('/api/requests').then(r => r.json()),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 3
  })
  
  // Mutation with optimistic update
  const mutation = useMutation({
    mutationFn: (id: string) => 
      fetch(`/api/requests/${id}/approve`, { method: 'POST' }),
    onMutate: async (id) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['requests'] })
      const previousRequests = queryClient.getQueryData(['requests'])
      
      queryClient.setQueryData(['requests'], (old: Request[]) =>
        old.map(r => r.id === id ? { ...r, status: 'approved' } : r)
      )
      
      return { previousRequests }
    },
    onError: (err, id, context) => {
      // Rollback
      queryClient.setQueryData(['requests'], context?.previousRequests)
    },
    onSettled: () => {
      // Refetch to sync
      queryClient.invalidateQueries({ queryKey: ['requests'] })
    }
  })
  
  return <div>{/* Component */}</div>
}
```

---

## 📋 Implementation Checklist

### **Form Auto-Save:**
- [x] Create `useFormAutosave` hook
- [x] Add debouncing (2000ms default)
- [x] Add storage interface (localStorage/sessionStorage)
- [x] Add unsaved changes warning
- [x] Add React Hook Form integration
- [ ] Apply to medical certificate form
- [ ] Apply to consultation form
- [ ] Apply to prescription form

### **Accessibility:**
- [ ] Add ARIA labels to all form inputs
- [ ] Add ARIA roles to status indicators
- [ ] Implement keyboard navigation
- [ ] Add focus trapping to modals/panels
- [ ] Add screen reader optimizations
- [ ] Test with screen reader (NVDA/JAWS)
- [ ] Add skip to content link
- [ ] Ensure color contrast compliance (WCAG AA)

### **Error Recovery:**
- [ ] Implement retry with exponential backoff
- [ ] Add circuit breaker for API calls
- [ ] Add error boundaries to all major components
- [ ] Implement graceful degradation
- [ ] Add network status detection
- [ ] Add offline mode indicators

### **Performance:**
- [ ] Add lazy loading for routes
- [ ] Memoize expensive components
- [ ] Implement virtual scrolling for long lists
- [ ] Add debouncing to search inputs
- [ ] Optimize images with Next.js Image
- [ ] Implement React Query for data caching
- [ ] Add service worker for offline support

---

## ✨ Summary

**Infrastructure Created:**
1. ✅ **Form Auto-Save System** - Complete with hooks and patterns
2. 📝 **Accessibility Improvements** - Patterns and examples provided
3. 📝 **Error Recovery System** - Retry, circuit breaker, error boundaries
4. 📝 **Performance Optimizations** - Code splitting, memoization, caching

**Ready to Apply:**
- Form autosave to all major forms
- Accessibility enhancements throughout
- Error recovery patterns to API calls
- Performance optimizations to lists and images

**Your platform now has world-class infrastructure patterns! 🚀✨**
