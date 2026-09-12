import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { readFile } from "node:fs/promises"
import vm from "node:vm"

const routeBundlePath = new URL(
  "../.next/server/app/api/webhooks/twilio/voice/stream/route.js",
  import.meta.url,
)
const routeBundle = await readFile(routeBundlePath, "utf8")

const bundleVariable = routeBundle.match(
  /\(\(\)=>\{var ([A-Za-z_$][\w$]*)=\{\};\1\.id=/,
)?.[1]

assert.ok(bundleVariable, "Could not identify the Twilio route module table")

const runtimeLoadPattern = /var [A-Za-z_$][\w$]*=require\("[^"]*webpack-runtime\.js"\)/
assert.match(routeBundle, runtimeLoadPattern)

const instrumentedBundle = routeBundle.replace(
  runtimeLoadPattern,
  (runtimeLoad) =>
    `globalThis.__twilioRouteModules=${bundleVariable}.modules;return;${runtimeLoad}`,
)

const require = createRequire(routeBundlePath)
const sandbox = {
  Blob,
  Buffer,
  Error,
  require,
  process: { env: {} },
}
vm.createContext(sandbox)
vm.runInContext(instrumentedBundle, sandbox, {
  filename: routeBundlePath.pathname,
})

const modules = sandbox.__twilioRouteModules
assert.ok(modules && typeof modules === "object", "Twilio route modules were not exposed")

const receiverEntry = Object.entries(modules).find(([, factory]) =>
  factory.toString().includes("Too many buffered chunks"),
)
assert.ok(receiverEntry, "Could not find the bundled ws Receiver")

const moduleCache = new Map()
function loadBundledModule(id) {
  const cacheKey = String(id)
  const cached = moduleCache.get(cacheKey)
  if (cached) return cached.exports

  const factory = modules[cacheKey]
  assert.equal(typeof factory, "function", `Missing bundled module ${cacheKey}`)

  const module = { exports: {} }
  moduleCache.set(cacheKey, module)
  factory(module, module.exports, loadBundledModule)
  return module.exports
}

const Receiver = loadBundledModule(receiverEntry[0])
const payload = Buffer.from("x".repeat(64), "utf8")
const mask = Buffer.from([0x11, 0x22, 0x33, 0x44])
const maskedPayload = Buffer.alloc(payload.length)

for (let index = 0; index < payload.length; index += 1) {
  maskedPayload[index] = payload[index] ^ mask[index & 3]
}

const frame = Buffer.concat([
  Buffer.from([0x81, 0x80 | payload.length]),
  mask,
  maskedPayload,
])

const received = await new Promise((resolve, reject) => {
  const receiver = new Receiver({ isServer: true, maxPayload: 1024 })
  receiver.once("message", (data) => resolve(Buffer.from(data)))
  receiver.once("error", reject)
  receiver.write(frame, (error) => {
    if (error) reject(error)
  })
})

assert.deepEqual(received, payload)
process.stdout.write("ok: bundled Twilio WebSocket receiver accepts masked audio frames\n")
