/** Loaded before Next; this disposable fixture process may fetch only loopback. */
const realFetch = globalThis.fetch
const allowed = new Set(["localhost", "127.0.0.1", "[::1]"])
globalThis.fetch = (input, init) => {
  const value = input instanceof Request ? input.url : input
  if (!allowed.has(new URL(value).hostname)) {
    return Promise.reject(new Error("External fetch denied in action-access fixture"))
  }
  return realFetch(input, init)
}
