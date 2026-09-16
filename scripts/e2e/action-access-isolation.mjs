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

// Some SDKs use Node HTTP directly rather than fetch (including Stripe).
import http from "node:http"
import https from "node:https"
import { syncBuiltinESMExports } from "node:module"
for (const transport of [http, https]) {
  for (const method of ["request", "get"]) {
    const original = transport[method]
    transport[method] = function (...args) {
      const target = args[0]
      const hostname = typeof target === "string" || target instanceof URL
        ? new URL(target).hostname
        : (target?.hostname || target?.host || "localhost").split(":")[0]
      if (!allowed.has(hostname)) throw new Error("External HTTP denied in action-access fixture")
      return original.apply(this, args)
    }
  }
}
syncBuiltinESMExports()
