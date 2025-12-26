# Draft Persistence Test Specification

This document outlines the test cases for the draft persistence system.
To implement these tests, install vitest or jest with @testing-library/react.

## Test Setup

```bash
npm install -D vitest @testing-library/react jsdom
```

## Test Cases

### Draft Storage (`draft/storage.ts`)

#### `getSessionId()`
- ✅ Creates a new session ID if none exists (format: `sess_<timestamp>_<random>`)
- ✅ Returns existing session ID if one exists in localStorage
- ✅ Persists session ID to localStorage

#### `saveLocalDraft(draft)`
- ✅ Saves draft to localStorage with correct key (`instantmed-draft-<sessionId>`)
- ✅ Updates the current draft pointer
- ✅ Increments version number on save
- ✅ Updates `updatedAt` timestamp
- ✅ Calculates progress percentage

#### `loadLocalDraft(sessionId)`
- ✅ Loads draft from localStorage
- ✅ Returns null if draft doesn't exist
- ✅ Returns null on JSON parse error

#### `deleteLocalDraft(sessionId)`
- ✅ Removes draft from localStorage
- ✅ Clears current draft pointer if it matches

#### `getAllLocalDrafts()`
- ✅ Returns all incomplete drafts
- ✅ Excludes drafts at checkout step
- ✅ Sorts by most recently updated

#### `hasResumableDraft(serviceSlug?)`
- ✅ Returns true if drafts exist
- ✅ Filters by service slug when provided

#### `savePendingFlow(state)` / `loadPendingFlow()`
- ✅ Saves state to localStorage
- ✅ Loads and clears pending state
- ✅ Expires after 1 hour

---

### Draft Types (`draft/types.ts`)

#### `calculateProgress(currentStep)`
- ✅ Returns 0 for 'service'
- ✅ Returns 20 for 'questionnaire'
- ✅ Returns 40 for 'safety'
- ✅ Returns 60 for 'account'
- ✅ Returns 80 for 'details'
- ✅ Returns 100 for 'checkout'
- ✅ Returns 0 for unknown step

#### `getServiceName(slug)`
- ✅ Returns friendly name for known services
- ✅ Returns slug for unknown services

#### `getStepLabel(step)`
- ✅ Returns friendly label for known steps
- ✅ Returns step for unknown steps

---

### Store (`store.ts`)

#### Service Selection
- ✅ Creates draft when service selected
- ✅ Resets form data when service changes

#### Autosave
- ✅ Debounces rapid changes (1.5s)
- ✅ Saves to localStorage immediately
- ✅ Syncs to server after debounce

#### Navigation
- ✅ Triggers save on step change
- ✅ Triggers save on group change

---

### API Routes

#### `POST /api/flow/drafts`
- ✅ Creates new draft
- ✅ Returns existing draft ID if found
- ✅ Associates with authenticated user

#### `PATCH /api/flow/drafts/:id`
- ✅ Updates draft data
- ✅ Verifies ownership
- ✅ Returns updated timestamp

#### `DELETE /api/flow/drafts/:id`
- ✅ Deletes draft
- ✅ Verifies ownership

#### `POST /api/flow/drafts/:id/claim`
- ✅ Claims anonymous draft for authenticated user
- ✅ Merges with existing user draft if present
- ✅ Requires authentication

---

### Hooks

#### `useDraftPersistence`
- ✅ Sets up auto-save interval
- ✅ Warns on beforeunload with unsaved changes
- ✅ Saves on tab visibility change

#### `useDraftResume`
- ✅ Detects existing drafts on mount
- ✅ Loads drafts from localStorage and server
- ✅ Merges and dedupes drafts
- ✅ Resumes draft and restores state
- ✅ Deletes drafts

---

### Components

#### `ResumePrompt`
- ✅ Displays resumable drafts
- ✅ Shows progress and service info
- ✅ Handles resume action
- ✅ Handles start fresh action
- ✅ Handles delete action
- ✅ Shows loading state

---

## Sample Test Implementation

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { 
  getSessionId, 
  saveLocalDraft, 
  loadLocalDraft 
} from '../draft/storage'

// Mock localStorage
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key) => localStorageMock.store[key] ?? null),
  setItem: vi.fn((key, value) => { localStorageMock.store[key] = value }),
  removeItem: vi.fn((key) => { delete localStorageMock.store[key] }),
  clear: vi.fn(() => { localStorageMock.store = {} }),
}

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('Draft Storage', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  describe('getSessionId', () => {
    it('creates new session ID', () => {
      const sessionId = getSessionId()
      expect(sessionId).toMatch(/^sess_\d+_[a-z0-9]+$/)
    })
  })
})
```
