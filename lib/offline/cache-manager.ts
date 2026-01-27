/**
 * Offline Cache Manager
 * 
 * Manages caching of patient data for offline viewing.
 * Uses IndexedDB for structured data and Cache API for assets.
 */

const DB_NAME = "instantmed-offline"
const DB_VERSION = 1
const STORES = {
  intakes: "intakes",
  certificates: "certificates",
  profile: "profile",
  syncQueue: "sync-queue",
} as const

interface CachedIntake {
  id: string
  data: Record<string, unknown>
  cachedAt: number
  expiresAt: number
}

interface CachedCertificate {
  id: string
  intakeId: string
  blob: Blob
  filename: string
  cachedAt: number
}

interface SyncQueueItem {
  id: string
  action: string
  payload: Record<string, unknown>
  createdAt: number
  retries: number
}

class OfflineCacheManager {
  private db: IDBDatabase | null = null
  private dbPromise: Promise<IDBDatabase> | null = null

  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db
    if (this.dbPromise) return this.dbPromise

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Intakes store
        if (!db.objectStoreNames.contains(STORES.intakes)) {
          const intakesStore = db.createObjectStore(STORES.intakes, { keyPath: "id" })
          intakesStore.createIndex("cachedAt", "cachedAt", { unique: false })
        }

        // Certificates store
        if (!db.objectStoreNames.contains(STORES.certificates)) {
          const certsStore = db.createObjectStore(STORES.certificates, { keyPath: "id" })
          certsStore.createIndex("intakeId", "intakeId", { unique: false })
        }

        // Profile store
        if (!db.objectStoreNames.contains(STORES.profile)) {
          db.createObjectStore(STORES.profile, { keyPath: "id" })
        }

        // Sync queue for offline actions
        if (!db.objectStoreNames.contains(STORES.syncQueue)) {
          const syncStore = db.createObjectStore(STORES.syncQueue, { keyPath: "id" })
          syncStore.createIndex("createdAt", "createdAt", { unique: false })
        }
      }
    })

    return this.dbPromise
  }

  // Intakes
  async cacheIntake(id: string, data: Record<string, unknown>, ttlHours = 24): Promise<void> {
    const db = await this.init()
    const tx = db.transaction(STORES.intakes, "readwrite")
    const store = tx.objectStore(STORES.intakes)

    const cached: CachedIntake = {
      id,
      data,
      cachedAt: Date.now(),
      expiresAt: Date.now() + ttlHours * 60 * 60 * 1000,
    }

    await new Promise<void>((resolve, reject) => {
      const request = store.put(cached)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getIntake(id: string): Promise<Record<string, unknown> | null> {
    const db = await this.init()
    const tx = db.transaction(STORES.intakes, "readonly")
    const store = tx.objectStore(STORES.intakes)

    return new Promise((resolve, reject) => {
      const request = store.get(id)
      request.onsuccess = () => {
        const cached = request.result as CachedIntake | undefined
        if (!cached || cached.expiresAt < Date.now()) {
          resolve(null)
        } else {
          resolve(cached.data)
        }
      }
      request.onerror = () => reject(request.error)
    })
  }

  async getAllIntakes(): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
    const db = await this.init()
    const tx = db.transaction(STORES.intakes, "readonly")
    const store = tx.objectStore(STORES.intakes)

    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => {
        const now = Date.now()
        const intakes = (request.result as CachedIntake[])
          .filter((i) => i.expiresAt > now)
          .map((i) => ({ id: i.id, data: i.data }))
        resolve(intakes)
      }
      request.onerror = () => reject(request.error)
    })
  }

  // Certificates
  async cacheCertificate(id: string, intakeId: string, blob: Blob, filename: string): Promise<void> {
    const db = await this.init()
    const tx = db.transaction(STORES.certificates, "readwrite")
    const store = tx.objectStore(STORES.certificates)

    const cached: CachedCertificate = {
      id,
      intakeId,
      blob,
      filename,
      cachedAt: Date.now(),
    }

    await new Promise<void>((resolve, reject) => {
      const request = store.put(cached)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getCertificate(id: string): Promise<{ blob: Blob; filename: string } | null> {
    const db = await this.init()
    const tx = db.transaction(STORES.certificates, "readonly")
    const store = tx.objectStore(STORES.certificates)

    return new Promise((resolve, reject) => {
      const request = store.get(id)
      request.onsuccess = () => {
        const cached = request.result as CachedCertificate | undefined
        if (!cached) {
          resolve(null)
        } else {
          resolve({ blob: cached.blob, filename: cached.filename })
        }
      }
      request.onerror = () => reject(request.error)
    })
  }

  // Profile
  async cacheProfile(data: Record<string, unknown>): Promise<void> {
    const db = await this.init()
    const tx = db.transaction(STORES.profile, "readwrite")
    const store = tx.objectStore(STORES.profile)

    await new Promise<void>((resolve, reject) => {
      const request = store.put({ id: "current", data, cachedAt: Date.now() })
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getProfile(): Promise<Record<string, unknown> | null> {
    const db = await this.init()
    const tx = db.transaction(STORES.profile, "readonly")
    const store = tx.objectStore(STORES.profile)

    return new Promise((resolve, reject) => {
      const request = store.get("current")
      request.onsuccess = () => {
        const cached = request.result as { data: Record<string, unknown> } | undefined
        resolve(cached?.data || null)
      }
      request.onerror = () => reject(request.error)
    })
  }

  // Sync Queue (for offline actions)
  async queueAction(action: string, payload: Record<string, unknown>): Promise<string> {
    const db = await this.init()
    const tx = db.transaction(STORES.syncQueue, "readwrite")
    const store = tx.objectStore(STORES.syncQueue)

    const item: SyncQueueItem = {
      id: crypto.randomUUID(),
      action,
      payload,
      createdAt: Date.now(),
      retries: 0,
    }

    await new Promise<void>((resolve, reject) => {
      const request = store.put(item)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })

    return item.id
  }

  async getPendingActions(): Promise<SyncQueueItem[]> {
    const db = await this.init()
    const tx = db.transaction(STORES.syncQueue, "readonly")
    const store = tx.objectStore(STORES.syncQueue)

    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result as SyncQueueItem[])
      request.onerror = () => reject(request.error)
    })
  }

  async removeAction(id: string): Promise<void> {
    const db = await this.init()
    const tx = db.transaction(STORES.syncQueue, "readwrite")
    const store = tx.objectStore(STORES.syncQueue)

    await new Promise<void>((resolve, reject) => {
      const request = store.delete(id)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // Cleanup
  async clearExpired(): Promise<void> {
    const db = await this.init()
    const tx = db.transaction(STORES.intakes, "readwrite")
    const store = tx.objectStore(STORES.intakes)

    const now = Date.now()

    await new Promise<void>((resolve, reject) => {
      const request = store.openCursor()
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
        if (cursor) {
          const cached = cursor.value as CachedIntake
          if (cached.expiresAt < now) {
            cursor.delete()
          }
          cursor.continue()
        } else {
          resolve()
        }
      }
      request.onerror = () => reject(request.error)
    })
  }

  async clearAll(): Promise<void> {
    const db = await this.init()
    
    for (const storeName of Object.values(STORES)) {
      const tx = db.transaction(storeName, "readwrite")
      const store = tx.objectStore(storeName)
      await new Promise<void>((resolve, reject) => {
        const request = store.clear()
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    }
  }
}

// Singleton instance
export const offlineCache = new OfflineCacheManager()

// Hook for React components
export function useOfflineCache() {
  return offlineCache
}
