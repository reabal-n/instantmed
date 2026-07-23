"use client"

import { useEffect } from "react"

import {
  getRetiredDraftFlowIdFromStorageKey,
  pruneExpiredRetiredDraftFlows,
} from "@/lib/request/draft-retirement"

/**
 * Keeps explicit intake-draft deletion durable across reloads and offline
 * periods. This must stay mounted at the root rather than behind interaction
 * deferral: a patient may discard, leave, and only later revisit another page.
 */
export function DraftDiscardRetry() {
  useEffect(() => {
    const retry = () => {
      pruneExpiredRetiredDraftFlows()
      void import("@/lib/request/server-draft").then(
        ({ retryPendingServerDraftDiscards }) => retryPendingServerDraftDiscards(),
      ).catch(() => {
        // A later online/visibility/storage event will retry the chunk load.
      })
    }

    retry()
    window.addEventListener("online", retry)
    window.addEventListener("pagehide", retry)
    const retryWhenVisible = () => {
      if (document.visibilityState === "visible") retry()
    }
    const retryFromAnotherTab = (event: StorageEvent) => {
      if (
        event.key?.startsWith("instantmed-server-draft-discard-pending-") ||
        getRetiredDraftFlowIdFromStorageKey(event.key)
      ) {
        retry()
      }
    }
    document.addEventListener("visibilitychange", retryWhenVisible)
    window.addEventListener("storage", retryFromAnotherTab)
    return () => {
      window.removeEventListener("online", retry)
      window.removeEventListener("pagehide", retry)
      window.removeEventListener("storage", retryFromAnotherTab)
      document.removeEventListener("visibilitychange", retryWhenVisible)
    }
  }, [])

  return null
}
