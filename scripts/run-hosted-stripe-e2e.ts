import { type ChildProcess, spawn } from "node:child_process"
import { createHash, randomBytes } from "node:crypto"
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises"
import { createServer } from "node:net"
import { tmpdir } from "node:os"
import { basename, dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import {
  assertHostedStripeE2EEnvironment,
  assertStripeCliWebhookSecret,
  HOSTED_STRIPE_PRICE_REQUIREMENTS,
} from "./hosted-stripe-e2e-preflight"

const EXPECTED_SPEC = "e2e/hosted-stripe-guest-journey.spec.ts"
const APP_ORIGIN = "http://127.0.0.1:3060"
const SUPABASE_API_ORIGIN = "http://127.0.0.1:55321"
const MAILPIT_ORIGIN = "http://127.0.0.1:55324"
const STRIPE_LISTENER_TIMEOUT_MS = 30_000
const HEALTH_TIMEOUT_MS = 60_000
const activeChildren = new Set<ChildProcess>()
let receivedSignal: NodeJS.Signals | null = null

export const HOSTED_STRIPE_E2E_PORTS = [
  3060,
  55320,
  55321,
  55322,
  55323,
  55324,
  55325,
  55326,
  55327,
  55328,
  55329,
] as const

const SYSTEM_ENV_ALLOWLIST = [
  "PATH",
  "HOME",
  "TMPDIR",
  "LANG",
  "LC_ALL",
  "TERM",
  "DOCKER_HOST",
  "XDG_CONFIG_HOME",
] as const

const DEDICATED_PROVIDER_ENV_ALLOWLIST = [
  "HOSTED_STRIPE_E2E_STRIPE_SECRET_KEY",
  ...HOSTED_STRIPE_PRICE_REQUIREMENTS.map(
    ({ envKey }) => `HOSTED_STRIPE_E2E_${envKey}`,
  ),
] as const

export interface OwnedDockerResources {
  containers: string[]
  volumes: string[]
  networks: string[]
}

interface LocalSupabaseCoordinates {
  anonKey: string
  apiUrl: string
  mailpitUrl?: string
  serviceRoleKey: string
}

interface BuildHostedStripeChildEnvironmentInput {
  bootstrapEnv: Partial<NodeJS.ProcessEnv>
  localSupabase: LocalSupabaseCoordinates
  runId: string
  webhookSecret: string
}

export interface HostedStripeReceipt {
  runId: string
  gitSha: string
  startedAt: string
  finishedAt: string
  stripe: {
    eventType: "checkout.session.completed"
    livemode: false
  }
  assertions: {
    hostedCheckout: boolean
    signedWebhook: boolean
    skippedAccount: boolean
    linkedAccount: boolean
    zeroSurvivors: boolean
  }
  counts: {
    journeys: number
    webhookEvents: number
    survivors: number
  }
}

export interface HostedStripeBrowserEvidence {
  stripe: {
    eventType: "checkout.session.completed"
    livemode: false
  }
  assertions: {
    hostedCheckout: true
    signedWebhook: true
    skippedAccount: true
    linkedAccount: true
  }
  counts: {
    journeys: 2
    webhookEvents: 2
  }
}

/** Accept only Docker endpoints that cannot address a remote daemon. */
export function assertLocalDockerEndpoint(value: unknown): string {
  const endpoint = typeof value === "string" ? value.trim() : ""
  if (
    /^unix:\/\/\/[^\0\r\n]+$/.test(endpoint)
    || /^npipe:\/\/\/\/\.\/pipe\/[A-Za-z0-9._-]+$/.test(endpoint)
  ) {
    return endpoint
  }
  throw new Error(
    "Hosted Stripe E2E requires a verified local Docker socket endpoint",
  )
}

/** Bind copied source and the final receipt to one clean Git commit. */
export function assertStableHostedStripeSourceState({
  expectedSha,
  sha,
  status,
}: {
  expectedSha?: string
  sha: string
  status: string
}): string {
  const normalizedSha = sha.trim().toLowerCase()
  if (!/^[0-9a-f]{40}$/.test(normalizedSha)) {
    throw new Error("Hosted Stripe E2E could not bind source to a Git revision")
  }
  if (status.trim()) {
    throw new Error(
      "Hosted Stripe E2E requires a clean Git worktree before producing commit-bound evidence",
    )
  }
  if (expectedSha && normalizedSha !== expectedSha.toLowerCase()) {
    throw new Error("Hosted Stripe E2E Git revision changed during the run")
  }
  return normalizedSha
}

type CommandResult = { stdout: string; stderr: string }

function safeCommandFailure(command: string, code: number | null): Error {
  return new Error(`${basename(command)} exited ${code ?? "without a status"}; command output suppressed`)
}

async function runCommand(
  command: string,
  args: string[],
  env: Partial<NodeJS.ProcessEnv>,
  options: {
    allowDuringShutdown?: boolean
    cwd?: string
    sensitiveOutput?: boolean
    stream?: boolean
  } = {},
): Promise<CommandResult> {
  if (receivedSignal && !options.allowDuringShutdown) {
    throw new Error(`Hosted Stripe E2E interrupted by ${receivedSignal}`)
  }

  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? process.cwd(),
      detached: process.platform !== "win32",
      env: env as NodeJS.ProcessEnv,
      stdio: ["ignore", "pipe", "pipe"],
    })
    activeChildren.add(child)
    let stdout = ""
    let stderr = ""
    child.stdout.on("data", (chunk: Buffer) => {
      const output = chunk.toString()
      stdout += output
      if (options.stream && !options.sensitiveOutput) process.stdout.write(output)
    })
    child.stderr.on("data", (chunk: Buffer) => {
      const output = chunk.toString()
      stderr += output
      if (options.stream && !options.sensitiveOutput) process.stderr.write(output)
    })
    child.once("error", (error) => {
      activeChildren.delete(child)
      reject(options.sensitiveOutput ? new Error(`${basename(command)} could not start`) : error)
    })
    child.once("exit", (code) => {
      activeChildren.delete(child)
      if (code === 0) {
        resolvePromise({ stdout, stderr })
        return
      }
      reject(safeCommandFailure(command, code))
    })
  })
}

async function readStableHostedStripeSourceState({
  env,
  expectedSha,
  root,
}: {
  env: Partial<NodeJS.ProcessEnv>
  expectedSha?: string
  root: string
}): Promise<string> {
  const [revision, status] = await Promise.all([
    runCommand("git", ["rev-parse", "HEAD"], env, {
      cwd: root,
      sensitiveOutput: true,
    }),
    runCommand(
      "git",
      ["status", "--porcelain=v1", "--untracked-files=all"],
      env,
      { cwd: root, sensitiveOutput: true },
    ),
  ])
  return assertStableHostedStripeSourceState({
    expectedSha,
    sha: revision.stdout,
    status: status.stdout,
  })
}

async function resolveVerifiedLocalDockerEndpoint(
  bootstrapEnv: Partial<NodeJS.ProcessEnv>,
  commandEnv: Partial<NodeJS.ProcessEnv>,
): Promise<string> {
  const explicitEndpoint = bootstrapEnv.DOCKER_HOST?.trim()
  if (explicitEndpoint) return assertLocalDockerEndpoint(explicitEndpoint)

  const contextResult = await runCommand("docker", ["context", "show"], commandEnv, {
    sensitiveOutput: true,
  })
  const contextName = contextResult.stdout.trim()
  if (!/^[A-Za-z0-9._-]+$/.test(contextName)) {
    throw new Error("Hosted Stripe E2E could not verify the local Docker context")
  }
  const endpointResult = await runCommand(
    "docker",
    [
      "context",
      "inspect",
      contextName,
      "--format",
      "{{json .Endpoints.docker.Host}}",
    ],
    commandEnv,
    { sensitiveOutput: true },
  )
  let endpoint: unknown
  try {
    endpoint = JSON.parse(endpointResult.stdout.trim())
  } catch {
    throw new Error("Hosted Stripe E2E could not verify the local Docker context")
  }
  return assertLocalDockerEndpoint(endpoint)
}

function spawnOwned(
  command: string,
  args: string[],
  env: Partial<NodeJS.ProcessEnv>,
  cwd: string,
): ChildProcess {
  if (receivedSignal) throw new Error(`Hosted Stripe E2E interrupted by ${receivedSignal}`)
  const child = spawn(command, args, {
    cwd,
    detached: process.platform !== "win32",
    env: env as NodeJS.ProcessEnv,
    stdio: ["ignore", "pipe", "pipe"],
  })
  activeChildren.add(child)
  child.once("exit", () => activeChildren.delete(child))
  return child
}

function terminateChild(child: ChildProcess): void {
  if (!child.pid || child.exitCode !== null || child.killed) return
  try {
    if (process.platform !== "win32") process.kill(-child.pid, "SIGTERM")
    else child.kill("SIGTERM")
  } catch {
    // The tracked child can exit between the state check and the signal.
  }
}

function forceTerminateChild(child: ChildProcess): void {
  if (!child.pid || child.exitCode !== null) return
  try {
    if (process.platform !== "win32") process.kill(-child.pid, "SIGKILL")
    else child.kill("SIGKILL")
  } catch {
    // The tracked child can exit between the state check and the signal.
  }
}

async function terminateOwnedChildren(): Promise<void> {
  const children = [...activeChildren]
  for (const child of children) terminateChild(child)
  if (children.length === 0) return

  const allExited = Promise.all(children.map((child) => (
    child.exitCode !== null
      ? Promise.resolve()
      : new Promise<void>((resolvePromise) => child.once("exit", () => resolvePromise()))
  )))
  const terminated = await Promise.race([
    allExited.then(() => true),
    new Promise<false>((resolvePromise) => setTimeout(() => resolvePromise(false), 5_000)),
  ])
  if (terminated) return

  for (const child of children) forceTerminateChild(child)
  await Promise.race([
    allExited,
    new Promise<void>((resolvePromise) => setTimeout(resolvePromise, 2_000)),
  ])
  if (children.some((child) => child.exitCode === null)) {
    throw new Error("Runner-owned child processes did not terminate")
  }
}

function handleSignal(signal: NodeJS.Signals): void {
  if (!receivedSignal) receivedSignal = signal
  for (const child of activeChildren) terminateChild(child)
}

process.once("SIGINT", handleSignal)
process.once("SIGTERM", handleSignal)

export function buildRunnerBootstrapEnvironment(
  source: Partial<NodeJS.ProcessEnv>,
): Partial<NodeJS.ProcessEnv> {
  const result: Partial<NodeJS.ProcessEnv> = {}
  for (const key of SYSTEM_ENV_ALLOWLIST) {
    if (source[key] !== undefined) result[key] = source[key]
  }
  for (const key of DEDICATED_PROVIDER_ENV_ALLOWLIST) {
    if (source[key] !== undefined) result[key] = source[key]
  }
  return result
}

function dedicatedProviderValue(
  bootstrapEnv: Partial<NodeJS.ProcessEnv>,
  key: string,
): string {
  const dedicatedKey = `HOSTED_STRIPE_E2E_${key}`
  const value = bootstrapEnv[dedicatedKey]
  if (!value) {
    throw new Error(
      `Hosted Stripe E2E requires ${dedicatedKey}; configure only dedicated Stripe test-mode values`,
    )
  }
  return value
}

export function buildHostedStripeChildEnvironment({
  bootstrapEnv,
  localSupabase,
  runId,
  webhookSecret,
}: BuildHostedStripeChildEnvironmentInput): NodeJS.ProcessEnv {
  assertStripeCliWebhookSecret(webhookSecret)
  const stripeSecretKey = dedicatedProviderValue(bootstrapEnv, "STRIPE_SECRET_KEY")
  const systemEnv = buildRunnerBootstrapEnvironment(
    Object.fromEntries(SYSTEM_ENV_ALLOWLIST.map((key) => [key, bootstrapEnv[key]])),
  )
  const priceEnv = Object.fromEntries(HOSTED_STRIPE_PRICE_REQUIREMENTS.map(({ envKey }) => [
    envKey,
    dedicatedProviderValue(bootstrapEnv, envKey),
  ]))
  const encryptionKey = randomBytes(32).toString("base64")

  return {
    ...systemEnv,
    NODE_ENV: "production",
    NEXT_TELEMETRY_DISABLED: "1",
    PLAYWRIGHT: "1",
    NEXT_PUBLIC_PLAYWRIGHT: "1",
    ALLOW_STRIPE_TEST_WEBHOOKS: "true",
    HOSTED_STRIPE_E2E_RUN_ID: runId,
    HOSTED_STRIPE_E2E_SUPABASE_API_URL: localSupabase.apiUrl,
    HOSTED_STRIPE_E2E_MAILPIT_URL: localSupabase.mailpitUrl ?? MAILPIT_ORIGIN,
    PLAYWRIGHT_BASE_URL: APP_ORIGIN,
    NEXT_PUBLIC_APP_URL: APP_ORIGIN,
    NEXT_PUBLIC_SITE_URL: APP_ORIGIN,
    SUPABASE_URL: localSupabase.apiUrl,
    NEXT_PUBLIC_SUPABASE_URL: localSupabase.apiUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: localSupabase.anonKey,
    SUPABASE_SERVICE_ROLE_KEY: localSupabase.serviceRoleKey,
    STRIPE_SECRET_KEY: stripeSecretKey,
    STRIPE_WEBHOOK_SECRET: webhookSecret,
    ...priceEnv,
    INTERNAL_API_SECRET: randomBytes(32).toString("hex"),
    ENCRYPTION_KEY: encryptionKey,
    PHI_MASTER_KEY: encryptionKey,
    PHI_ENCRYPTION_ENABLED: "true",
    PHI_ENCRYPTION_WRITE_ENABLED: "true",
    PHI_ENCRYPTION_READ_ENABLED: "true",
    INSTANTMED_VALIDATE_PRODUCTION_ENV: "false",
    SENTRY_AUTH_TOKEN: "",
    SENTRY_DSN: "",
    NEXT_PUBLIC_SENTRY_DSN: "",
    POSTHOG_API_KEY: "",
    NEXT_PUBLIC_POSTHOG_KEY: "",
    RESEND_API_KEY: "re_hosted_e2e_blocked",
    RESEND_FROM_EMAIL: "InstantMed <support@example.test>",
    UPSTASH_REDIS_REST_URL: "http://127.0.0.1:9",
    UPSTASH_REDIS_REST_TOKEN: "hosted-e2e-local-only",
    CRON_SECRET: randomBytes(32).toString("hex"),
    TELEGRAM_BOT_TOKEN: "",
    TELEGRAM_CHAT_ID: "",
  }
}

export function buildHostedStripeSupabaseConfig(
  source: string,
  projectId: string,
): string {
  if (!/^hosted-stripe-e2e-[a-z0-9-]+$/.test(projectId)) {
    throw new Error("Hosted Stripe Supabase project ID is not run-scoped")
  }

  const replacements = new Map([
    [54320, 55320],
    [54321, 55321],
    [54322, 55322],
    [54323, 55323],
    [54324, 55324],
    [54325, 55325],
    [54326, 55326],
    [54327, 55327],
    [54328, 55328],
    [54329, 55329],
  ])
  let overlay = source.replace(/^project_id = .*$/m, `project_id = "${projectId}"`)
  for (const [sourcePort, targetPort] of replacements) {
    overlay = overlay.replaceAll(String(sourcePort), String(targetPort))
  }
  overlay = overlay
    .replace(/^site_url = .*$/m, `site_url = "${APP_ORIGIN}"`)
    .replace(
      /^additional_redirect_urls = .*$/m,
      `additional_redirect_urls = ["${APP_ORIGIN}/**"]`,
    )

  if (
    overlay.includes("witzcrovsoumktyndqgz") ||
    overlay.includes("instantmed.com.au") ||
    /\b5432[0-9]\b/.test(overlay)
  ) {
    throw new Error("Hosted Stripe Supabase overlay retained a production or default target")
  }
  return overlay
}

async function defaultPortProbe(port: number): Promise<boolean> {
  return new Promise((resolvePromise) => {
    const server = createServer()
    server.unref()
    server.once("error", () => resolvePromise(false))
    server.listen(port, "127.0.0.1", () => {
      server.close(() => resolvePromise(true))
    })
  })
}

export async function assertPortsAvailable(
  ports: readonly number[],
  probe: (port: number) => Promise<boolean> = defaultPortProbe,
): Promise<void> {
  for (const port of ports) {
    if (!(await probe(port))) {
      throw new Error(
        `Required hosted Stripe E2E port ${port} is already in use; refusing to stop or replace its owner`,
      )
    }
  }
}

export function assertNoOwnedDockerResources(
  owned: OwnedDockerResources,
): void {
  if (
    owned.containers.length > 0 ||
    owned.volumes.length > 0 ||
    owned.networks.length > 0
  ) {
    throw new Error(
      "Hosted Stripe E2E cleanup left run-owned Docker resources",
    )
  }
}

function nonEmptyLines(output: string): string[] {
  return output.split("\n").map((line) => line.trim()).filter(Boolean)
}

async function listOwnedDockerResources(
  projectId: string,
  env: Partial<NodeJS.ProcessEnv>,
): Promise<OwnedDockerResources> {
  const label = `label=com.supabase.cli.project=${projectId}`
  const [containers, volumes, networks] = await Promise.all([
    runCommand("docker", ["ps", "-a", "--filter", label, "--format", "{{.ID}}"], env, {
      allowDuringShutdown: true,
      sensitiveOutput: true,
    }),
    runCommand("docker", ["volume", "ls", "--filter", label, "--format", "{{.Name}}"], env, {
      allowDuringShutdown: true,
      sensitiveOutput: true,
    }),
    runCommand("docker", ["network", "ls", "--filter", label, "--format", "{{.Name}}"], env, {
      allowDuringShutdown: true,
      sensitiveOutput: true,
    }),
  ])
  return {
    containers: nonEmptyLines(containers.stdout),
    volumes: nonEmptyLines(volumes.stdout),
    networks: nonEmptyLines(networks.stdout),
  }
}

function parseSupabaseEnvironment(output: string): Record<string, string> {
  const values: Record<string, string> = {}
  for (const line of output.split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(?:"([^"]*)"|'([^']*)'|(.*))$/)
    if (!match) continue
    values[match[1]] = match[2] ?? match[3] ?? match[4] ?? ""
  }
  return values
}

function requireLocalSupabaseCoordinates(
  values: Record<string, string>,
): LocalSupabaseCoordinates {
  const apiUrl = values.API_URL
  const dbUrl = values.DB_URL
  const mailpitUrl = values.INBUCKET_URL ?? values.MAILPIT_URL
  if (apiUrl !== SUPABASE_API_ORIGIN) {
    throw new Error("Supabase CLI did not return the runner-owned API coordinate")
  }
  if (!dbUrl?.match(/@(127\.0\.0\.1|localhost):55322\//)) {
    throw new Error("Supabase CLI did not return the runner-owned database coordinate")
  }
  if (mailpitUrl !== MAILPIT_ORIGIN) {
    throw new Error("Supabase CLI did not return the runner-owned Mailpit coordinate")
  }
  if (!values.ANON_KEY || !values.SERVICE_ROLE_KEY) {
    throw new Error("Supabase CLI did not return local API credentials")
  }
  return {
    anonKey: values.ANON_KEY,
    apiUrl,
    mailpitUrl,
    serviceRoleKey: values.SERVICE_ROLE_KEY,
  }
}

async function waitForHttpHealth(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() <= deadline) {
    try {
      const response = await fetch(url, { method: "GET" })
      if (response.ok) return
    } catch {
      // The owned process can still be starting.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250))
  }
  throw new Error("Runner-owned local health endpoint did not become ready")
}

async function captureStripeListenerSecret(child: ChildProcess): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    let settled = false
    let carry = ""
    const finish = (error?: Error, secret?: string) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      child.off("exit", onExit)
      child.stdout?.off("data", onData)
      child.stderr?.off("data", onData)
      child.stdout?.resume()
      child.stderr?.resume()
      if (error) reject(error)
      else resolvePromise(secret!)
    }
    const onData = (chunk: Buffer) => {
      carry = `${carry}${chunk.toString()}`.slice(-4096)
      const match = carry.match(/whsec_[A-Za-z0-9]{24,}/)
      if (!match) return
      try {
        assertStripeCliWebhookSecret(match[0])
        finish(undefined, match[0])
      } catch {
        finish(new Error("Stripe CLI returned a malformed webhook signing secret"))
      }
    }
    const onExit = () => finish(new Error(
      "Stripe listener stopped before providing a signing secret; run stripe login or configure a fresh dedicated test credential",
    ))
    const timeout = setTimeout(() => finish(new Error(
      "Stripe listener did not provide a signing secret; run stripe login or configure a fresh dedicated test credential",
    )), STRIPE_LISTENER_TIMEOUT_MS)
    child.stdout?.on("data", onData)
    child.stderr?.on("data", onData)
    child.once("exit", onExit)
  })
}

function validateExactKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      throw new Error(`Hosted Stripe receipt contains a forbidden field at ${path}.${key}`)
    }
  }
  for (const key of allowed) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      throw new Error(`Hosted Stripe receipt is missing ${path}.${key}`)
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function isCanonicalTimestamp(value: unknown): value is string {
  return typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
    Number.isFinite(Date.parse(value))
}

export function validateHostedStripeReceipt(
  value: unknown,
): asserts value is HostedStripeReceipt {
  if (!isRecord(value)) throw new Error("Hosted Stripe receipt contains a forbidden root value")
  validateExactKeys(
    value,
    ["runId", "gitSha", "startedAt", "finishedAt", "stripe", "assertions", "counts"],
    "receipt",
  )
  if (
    typeof value.runId !== "string" ||
    !/^run-[a-z0-9-]+$/i.test(value.runId) ||
    typeof value.gitSha !== "string" ||
    !/^[0-9a-f]{40}$/i.test(value.gitSha) ||
    !isCanonicalTimestamp(value.startedAt) ||
    !isCanonicalTimestamp(value.finishedAt) ||
    Date.parse(value.finishedAt) < Date.parse(value.startedAt)
  ) {
    throw new Error("Hosted Stripe receipt contains a forbidden identifier or timestamp")
  }

  if (!isRecord(value.stripe)) throw new Error("Hosted Stripe receipt contains a forbidden Stripe value")
  validateExactKeys(value.stripe, ["eventType", "livemode"], "receipt.stripe")
  if (
    value.stripe.eventType !== "checkout.session.completed" ||
    value.stripe.livemode !== false
  ) {
    throw new Error("Hosted Stripe receipt contains a forbidden Stripe assertion")
  }

  if (!isRecord(value.assertions)) throw new Error("Hosted Stripe receipt contains a forbidden assertion value")
  validateExactKeys(value.assertions, [
    "hostedCheckout",
    "signedWebhook",
    "skippedAccount",
    "linkedAccount",
    "zeroSurvivors",
  ], "receipt.assertions")
  if (Object.values(value.assertions).some((assertion) => typeof assertion !== "boolean")) {
    throw new Error("Hosted Stripe receipt contains a forbidden assertion value")
  }
  if (Object.values(value.assertions).some((assertion) => assertion !== true)) {
    throw new Error("Hosted Stripe receipt contains a forbidden failed assertion")
  }

  if (!isRecord(value.counts)) throw new Error("Hosted Stripe receipt contains a forbidden count value")
  validateExactKeys(value.counts, ["journeys", "webhookEvents", "survivors"], "receipt.counts")
  if (Object.values(value.counts).some((count) => !Number.isSafeInteger(count) || Number(count) < 0)) {
    throw new Error("Hosted Stripe receipt contains a forbidden count value")
  }
  if (
    value.counts.journeys !== 2 ||
    value.counts.webhookEvents !== 2 ||
    value.counts.survivors !== 0
  ) {
    throw new Error("Hosted Stripe receipt contains a forbidden incomplete count")
  }
}

export function validateHostedStripeBrowserEvidence(
  value: unknown,
): asserts value is HostedStripeBrowserEvidence {
  if (!isRecord(value)) {
    throw new Error("Hosted Stripe browser evidence contains a forbidden root value")
  }
  validateExactKeys(value, ["stripe", "assertions", "counts"], "browserEvidence")

  if (!isRecord(value.stripe)) {
    throw new Error("Hosted Stripe browser evidence contains a forbidden Stripe value")
  }
  validateExactKeys(value.stripe, ["eventType", "livemode"], "browserEvidence.stripe")
  if (
    value.stripe.eventType !== "checkout.session.completed" ||
    value.stripe.livemode !== false
  ) {
    throw new Error("Hosted Stripe browser evidence contains a forbidden Stripe assertion")
  }

  if (!isRecord(value.assertions)) {
    throw new Error("Hosted Stripe browser evidence contains a forbidden assertion value")
  }
  validateExactKeys(value.assertions, [
    "hostedCheckout",
    "signedWebhook",
    "skippedAccount",
    "linkedAccount",
  ], "browserEvidence.assertions")
  if (Object.values(value.assertions).some((assertion) => assertion !== true)) {
    throw new Error("Hosted Stripe browser evidence contains a forbidden failed assertion")
  }

  if (!isRecord(value.counts)) {
    throw new Error("Hosted Stripe browser evidence contains a forbidden count value")
  }
  validateExactKeys(value.counts, ["journeys", "webhookEvents"], "browserEvidence.counts")
  if (value.counts.journeys !== 2 || value.counts.webhookEvents !== 2) {
    throw new Error("Hosted Stripe browser evidence contains a forbidden incomplete count")
  }
}

async function writeRestrictedJsonAtomic(
  path: string,
  value: unknown,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 })
  const temporaryPath = `${path}.${randomBytes(6).toString("hex")}.tmp`
  try {
    await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 })
    await rename(temporaryPath, path)
    await chmod(path, 0o600)
  } finally {
    await rm(temporaryPath, { force: true })
  }
}

export async function writeHostedStripeReceiptAtomic(
  path: string,
  receipt: unknown,
): Promise<void> {
  validateHostedStripeReceipt(receipt)
  await writeRestrictedJsonAtomic(path, receipt)
}

export async function writeHostedStripeBrowserEvidenceAtomic(
  path: string,
  evidence: unknown,
): Promise<void> {
  validateHostedStripeBrowserEvidence(evidence)
  await writeRestrictedJsonAtomic(path, evidence)
}

function providerGuardSource(): string {
  return [
    "const originalFetch = globalThis.fetch.bind(globalThis)",
    "globalThis.fetch = async (input, init) => {",
    "  const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url",
    "  const url = new URL(raw)",
    "  const method = (init?.method || (typeof input === 'object' && 'method' in input ? input.method : 'GET')).toUpperCase()",
    "  const local = ['127.0.0.1', 'localhost'].includes(url.hostname)",
    "  const stripe = url.hostname === 'api.stripe.com'",
    "  if (url.hostname === 'api.resend.com') {",
    "    return new Response(JSON.stringify({ message: 'Hosted E2E provider blocked' }), { status: 503, headers: { 'Content-Type': 'application/json' } })",
    "  }",
    "  if (!local && !stripe && !['GET', 'HEAD'].includes(method)) {",
    "    throw new Error(`Hosted E2E external mutation blocked: ${method} ${url.hostname}`)",
    "  }",
    "  return originalFetch(input, init)",
    "}",
    "",
  ].join("\n")
}

function runIdForNow(): string {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)
  return `stripe-run-${timestamp}-${randomBytes(4).toString("hex")}`
}

function safeReceiptRunId(runId: string): string {
  return `run-${createHash("sha256").update(runId).digest("hex").slice(0, 16)}`
}

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((arg) => arg !== "--")
  if (args.length > 0) {
    throw new Error("e2e:stripe-hosted accepts no spec or target override")
  }

  const root = resolve(process.cwd())
  const packageSource = await readFile(join(root, "package.json"), "utf8")
  if (!packageSource.includes('"name": "instantmed"')) {
    throw new Error("Hosted Stripe E2E must run from the InstantMed repository root")
  }

  const bootstrapEnv = buildRunnerBootstrapEnvironment(process.env)
  const dedicatedStripeKey = dedicatedProviderValue(bootstrapEnv, "STRIPE_SECRET_KEY")
  if (!/^(?:sk|rk)_test_/.test(dedicatedStripeKey)) {
    throw new Error(
      "HOSTED_STRIPE_E2E_STRIPE_SECRET_KEY must be a fresh dedicated sk_test_* or rk_test_* credential; never use the primary live environment",
    )
  }
  for (const { envKey } of HOSTED_STRIPE_PRICE_REQUIREMENTS) {
    dedicatedProviderValue(bootstrapEnv, envKey)
  }

  const baseCommandEnv = buildRunnerBootstrapEnvironment(
    Object.fromEntries(SYSTEM_ENV_ALLOWLIST.map((key) => [key, bootstrapEnv[key]])),
  )
  const gitSha = await readStableHostedStripeSourceState({
    env: baseCommandEnv,
    root,
  })
  const localDockerEndpoint = await resolveVerifiedLocalDockerEndpoint(
    bootstrapEnv,
    baseCommandEnv,
  )
  const commandEnv = {
    ...baseCommandEnv,
    DOCKER_HOST: localDockerEndpoint,
  }
  await assertPortsAvailable(HOSTED_STRIPE_E2E_PORTS)

  const runId = runIdForNow()
  const startedAt = new Date().toISOString()
  const temporaryRoot = await mkdtemp(join(tmpdir(), "instantmed-hosted-stripe-e2e-"))
  const temporaryApp = join(temporaryRoot, "app")
  const temporaryStripeHome = join(temporaryRoot, "stripe-home")
  const temporarySupabase = join(temporaryRoot, "supabase")
  const providerGuard = join(temporaryRoot, "provider-guard.cjs")
  const privateBrowserEvidencePath = join(temporaryRoot, "browser-evidence.json")
  const archiveReceiptPath = join(root, ".artifacts", "hosted-stripe-e2e", `${safeReceiptRunId(runId)}.json`)
  const projectId = `hosted-stripe-e2e-${randomBytes(6).toString("hex")}`
  let supabaseStartAttempted = false
  let runtimeEnv: NodeJS.ProcessEnv | undefined
  let browserEvidence: HostedStripeBrowserEvidence | undefined
  let survivorCount: number | undefined
  let primaryError: unknown
  let cleanupError: unknown
  let cleanupPromise: Promise<number> | undefined

  async function cleanup(): Promise<number> {
    if (cleanupPromise) return cleanupPromise
    cleanupPromise = (async () => {
      const errors: unknown[] = []
      let childrenStopped = false
      let survivors = 0
      try {
        await terminateOwnedChildren()
        childrenStopped = true
      } catch (error) {
        errors.push(error)
      }

      if (runtimeEnv && childrenStopped) {
        try {
          const { cleanupHostedStripeRunArtifacts } = await import(
            "../e2e/helpers/hosted-stripe"
          )
          survivors = await cleanupHostedStripeRunArtifacts(runId, runtimeEnv)
        } catch (error) {
          errors.push(error)
        }
      }

      let stopError: unknown
      if (supabaseStartAttempted) {
        process.stdout.write("Stopping only the runner-owned hosted Stripe Supabase stack...\n")
        try {
          await runCommand("supabase", [
            "stop",
            "--workdir",
            temporaryRoot,
            "--no-backup",
          ], commandEnv, { allowDuringShutdown: true, sensitiveOutput: true })
        } catch (error) {
          stopError = error
        }

        try {
          const owned = await listOwnedDockerResources(projectId, commandEnv)
          assertNoOwnedDockerResources(owned)
          if (stopError) {
            process.stderr.write(
              "Supabase stop exited nonzero after partial startup; exact project-label verification found no owned resources.\n",
            )
          }
        } catch (error) {
          errors.push(stopError ? new AggregateError([stopError, error]) : error)
        }
      }

      if (errors.length > 0) {
        throw new AggregateError(errors, "Hosted Stripe E2E cleanup did not complete")
      }
      await rm(temporaryRoot, { recursive: true, force: true })
      return survivors
    })()
    return cleanupPromise
  }

  try {
    await mkdir(temporaryApp)
    await mkdir(join(temporaryStripeHome, ".config"), {
      mode: 0o700,
      recursive: true,
    })
    await mkdir(temporarySupabase)
    await runCommand("rsync", [
      "-a",
      "--exclude=.git",
      "--exclude=.next",
      "--exclude=node_modules",
      "--exclude=.env",
      "--exclude=.env.*",
      "--exclude=.superpowers",
      "--exclude=.artifacts",
      "--exclude=coverage",
      "--exclude=playwright-report",
      "--exclude=test-results",
      `${root}/`,
      `${temporaryApp}/`,
    ], commandEnv, { sensitiveOutput: true })
    await symlink(join(root, "node_modules"), join(temporaryApp, "node_modules"), "dir")

    const sourceConfig = await readFile(join(root, "supabase/config.toml"), "utf8")
    const overlay = buildHostedStripeSupabaseConfig(sourceConfig, projectId)
    await writeFile(join(temporarySupabase, "config.toml"), overlay, { mode: 0o600 })
    await symlink(join(root, "supabase/migrations"), join(temporarySupabase, "migrations"), "dir")
    await writeFile(providerGuard, providerGuardSource(), { mode: 0o600 })

    process.stdout.write("Starting the isolated hosted Stripe Supabase overlay on ports 55320-55329...\n")
    supabaseStartAttempted = true
    await runCommand("supabase", ["start", "--workdir", temporaryRoot], commandEnv, {
      sensitiveOutput: true,
    })
    await runCommand("supabase", [
      "db",
      "reset",
      "--local",
      "--no-seed",
      "--workdir",
      temporaryRoot,
    ], commandEnv, { sensitiveOutput: true })
    const status = await runCommand("supabase", [
      "status",
      "--workdir",
      temporaryRoot,
      "-o",
      "env",
    ], commandEnv, { sensitiveOutput: true })
    const localSupabase = requireLocalSupabaseCoordinates(
      parseSupabaseEnvironment(status.stdout),
    )
    await waitForHttpHealth(`${localSupabase.apiUrl}/auth/v1/health`, HEALTH_TIMEOUT_MS)
    await waitForHttpHealth(localSupabase.mailpitUrl!, HEALTH_TIMEOUT_MS)

    const placeholderWebhookSecret = `whsec_${randomBytes(24).toString("hex")}`
    runtimeEnv = buildHostedStripeChildEnvironment({
      bootstrapEnv,
      localSupabase,
      runId,
      webhookSecret: placeholderWebhookSecret,
    })
    await assertHostedStripeE2EEnvironment({ env: runtimeEnv })

    process.stdout.write("Starting the Stripe test-mode webhook listener...\n")
    const stripeListener = spawnOwned("stripe", [
      "listen",
      "--forward-to",
      `${APP_ORIGIN}/api/stripe/webhook`,
      "--events",
      "checkout.session.completed",
    ], {
      ...commandEnv,
      HOME: temporaryStripeHome,
      STRIPE_API_KEY: dedicatedStripeKey,
      STRIPE_CLI_TELEMETRY_OPTOUT: "1",
      XDG_CONFIG_HOME: join(temporaryStripeHome, ".config"),
    }, root)
    const webhookSecret = await captureStripeListenerSecret(stripeListener)
    assertStripeCliWebhookSecret(webhookSecret)
    runtimeEnv = {
      ...runtimeEnv,
      STRIPE_WEBHOOK_SECRET: webhookSecret,
      NODE_OPTIONS: `--require=${providerGuard}`,
      HOSTED_STRIPE_E2E_BROWSER_EVIDENCE_PATH: privateBrowserEvidencePath,
    }

    process.stdout.write("Building a dotenv-free production Webpack bundle...\n")
    await runCommand(process.execPath, [
      join(temporaryApp, "node_modules/next/dist/bin/next"),
      "build",
    ], {
      ...runtimeEnv,
      NODE_OPTIONS: `--max-old-space-size=8192 --require=${providerGuard}`,
    }, { cwd: temporaryApp, sensitiveOutput: true })

    process.stdout.write("Starting the runner-owned production server...\n")
    const appServer = spawnOwned(process.execPath, [
      join(temporaryApp, "node_modules/next/dist/bin/next"),
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3060",
    ], runtimeEnv, temporaryApp)
    appServer.stdout?.resume()
    appServer.stderr?.resume()
    await waitForHttpHealth(`${APP_ORIGIN}/api/health`, HEALTH_TIMEOUT_MS)

    process.stdout.write("Running both real hosted guest checkout branches...\n")
    await runCommand(process.execPath, [
      join(root, "node_modules/@playwright/test/cli.js"),
      "test",
      "--config=playwright.hosted-stripe.config.ts",
      "--project=chromium",
      EXPECTED_SPEC,
    ], runtimeEnv, { cwd: root, sensitiveOutput: true })

    const rawBrowserEvidence = JSON.parse(
      await readFile(privateBrowserEvidencePath, "utf8"),
    ) as unknown
    validateHostedStripeBrowserEvidence(rawBrowserEvidence)
    browserEvidence = rawBrowserEvidence
  } catch (error) {
    primaryError = error
  } finally {
    try {
      survivorCount = await cleanup()
    } catch (error) {
      cleanupError = cleanupError
        ? new AggregateError([cleanupError, error], "Hosted Stripe E2E cleanup failed")
        : error
    }
  }

  if (cleanupError) {
    process.stderr.write(`Cleanup incomplete; recovery workdir retained at ${temporaryRoot}\n`)
    throw new AggregateError(
      [primaryError, cleanupError].filter((error) => error !== undefined),
      "Hosted Stripe E2E failed and cleanup did not complete",
    )
  }
  if (primaryError) throw primaryError
  if (receivedSignal) throw new Error(`Hosted Stripe E2E interrupted by ${receivedSignal}`)
  if (!browserEvidence || survivorCount === undefined) {
    throw new Error("Hosted Stripe E2E did not produce complete browser and cleanup evidence")
  }

  // Cleanup imports its run-scoped helper from the source checkout, so bind
  // the receipt only after every executed source path is finished.
  await readStableHostedStripeSourceState({
    env: commandEnv,
    expectedSha: gitSha,
    root,
  })

  const finishedAt = new Date().toISOString()
  if (Date.parse(finishedAt) < Date.parse(startedAt)) {
    throw new Error("Hosted Stripe E2E clock moved backwards")
  }
  await writeHostedStripeReceiptAtomic(archiveReceiptPath, {
    runId: safeReceiptRunId(runId),
    gitSha,
    startedAt,
    finishedAt,
    stripe: browserEvidence.stripe,
    assertions: {
      ...browserEvidence.assertions,
      zeroSurvivors: survivorCount === 0,
    },
    counts: {
      ...browserEvidence.counts,
      survivors: survivorCount,
    },
  })
  process.stdout.write(
    `Hosted Stripe E2E passed; PHI-free receipt archived at ${archiveReceiptPath}\n`,
  )
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : ""
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
}
