export async function clearInstantMedBrowserCaches(): Promise<void> {
  if (typeof window === "undefined") return

  const tasks: Promise<unknown>[] = []

  if ("caches" in window) {
    tasks.push(
      caches.keys().then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith("instantmed-"))
            .map((name) => caches.delete(name)),
        ),
      ),
    )
  }

  if ("serviceWorker" in navigator) {
    tasks.push(
      navigator.serviceWorker.getRegistrations().then((registrations) =>
        Promise.all(registrations.map((registration) => registration.unregister())),
      ),
    )
  }

  await Promise.allSettled(tasks)
}
