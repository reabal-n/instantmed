import { type ChildProcess, spawn } from "node:child_process"
import { randomBytes } from "node:crypto"
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises"
import { createServer } from "node:net"
import { tmpdir } from "node:os"
import { basename, join, resolve } from "node:path"
import { Redis } from "@upstash/redis"
import { Ratelimit } from "@upstash/ratelimit"

const ALLOWED_SPECS = ["e2e/certificate-resend-render.spec.ts", "e2e/plan5-navigation.spec.ts", "e2e/checkout-resume.spec.ts", "e2e/doctor.prescription-ui.spec.ts"]
const LOCAL_PORTS = [3060, 55320, 55321, 55322, 55323, 55324, 55325, 55326, 55329, 55330]
const REDIS_TOKEN = "production-e2e-local-only"
const REDIS_IMAGE = "redis:7.4-alpine@sha256:ff02b58f971e7d7d156a1267e283fcbbeee91773b6aa36c49dac28ecfe28eadf"
const REDIS_HTTP_IMAGE = "hiett/serverless-redis-http:0.0.10@sha256:65128347949bca511e448fd7238780d624573d74c22b79155a7563db19e9b678"
const PROVIDER_BLOCK_MESSAGE = "E2E provider blocked before external delivery"
const activeChildren = new Set<ChildProcess>()
let receivedSignal: NodeJS.Signals | null = null

type CommandResult = { stdout: string; stderr: string }
type OwnedDockerResources = { containers: string[]; volumes: string[]; networks: string[] }

function redact(value: string): string {
  return value
    .replace(/eyJ[A-Za-z0-9._-]{20,}/g, "[redacted-jwt]")
    .replace(/(ANON_KEY|SERVICE_ROLE_KEY|SECRET_KEY|TOKEN)=?[^\s]*/gi, "$1=[redacted]")
}

async function run(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
  options: { allowDuringShutdown?: boolean; cwd?: string; stream?: boolean } = {},
): Promise<CommandResult> {
  if (receivedSignal && !options.allowDuringShutdown) {
    throw new Error(`Runner interrupted by ${receivedSignal}`)
  }
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? process.cwd(),
      detached: process.platform !== "win32",
      env,
      stdio: ["ignore", "pipe", "pipe"],
    })
    activeChildren.add(child)
    let stdout = ""
    let stderr = ""
    child.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString()
      stdout += text
      if (options.stream) process.stdout.write(text)
    })
    child.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString()
      stderr += text
      if (options.stream) process.stderr.write(text)
    })
    child.once("error", (error) => {
      activeChildren.delete(child)
      reject(error)
    })
    child.once("exit", (code) => {
      activeChildren.delete(child)
      if (code === 0) {
        resolvePromise({ stdout, stderr })
        return
      }
      reject(new Error(
        `${basename(command)} exited ${code ?? "without a status"}\n${redact(stderr || stdout)}`,
      ))
    })
  })
}

function terminateChild(child: ChildProcess) {
  if (!child.pid || child.exitCode !== null) return
  try {
    if (process.platform !== "win32") process.kill(-child.pid, "SIGTERM")
    else child.kill("SIGTERM")
  } catch {
    // The exact tracked process may have exited between the check and signal.
  }
}

function handleSignal(signal: NodeJS.Signals) {
  if (!receivedSignal) receivedSignal = signal
  for (const child of activeChildren) terminateChild(child)
}

process.once("SIGINT", handleSignal)
process.once("SIGTERM", handleSignal)

async function assertPortFree(port: number): Promise<void> {
  await new Promise<void>((resolvePromise, reject) => {
    const server = createServer()
    server.unref()
    server.once("error", () => reject(new Error(
      `Required isolated E2E port ${port} is already in use; refusing to stop or replace its owner`,
    )))
    server.listen(port, "127.0.0.1", () => {
      server.close((error) => error ? reject(error) : resolvePromise())
    })
  })
}

function inheritedProcessEnv(): NodeJS.ProcessEnv {
  const inherited: NodeJS.ProcessEnv = {
    NODE_ENV: process.env.NODE_ENV ?? "production",
  }
  for (const key of [
    "PATH",
    "HOME",
    "TMPDIR",
    "LANG",
    "LC_ALL",
    "TERM",
    "DOCKER_HOST",
    "XDG_CONFIG_HOME",
  ]) {
    if (process.env[key]) inherited[key] = process.env[key]
  }
  return inherited
}

function parseSupabaseEnv(output: string): Record<string, string> {
  const values: Record<string, string> = {}
  for (const line of output.split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(?:"([^"]*)"|'([^']*)'|(.*))$/)
    if (!match) continue
    values[match[1]] = match[2] ?? match[3] ?? match[4] ?? ""
  }
  return values
}

function nonEmptyLines(output: string): string[] {
  return output.split("\n").map((line) => line.trim()).filter(Boolean)
}

async function listOwnedDockerResources(
  projectId: string,
  env: NodeJS.ProcessEnv,
): Promise<OwnedDockerResources> {
  const exactProjectLabel = `label=com.supabase.cli.project=${projectId}`
  const [containers, volumes, networks] = await Promise.all([
    run("docker", [
      "ps",
      "-a",
      "--filter",
      exactProjectLabel,
      "--format",
      "{{.ID}}",
    ], env, { allowDuringShutdown: true }),
    run("docker", [
      "volume",
      "ls",
      "--filter",
      exactProjectLabel,
      "--format",
      "{{.Name}}",
    ], env, { allowDuringShutdown: true }),
    run("docker", [
      "network",
      "ls",
      "--filter",
      exactProjectLabel,
      "--format",
      "{{.Name}}",
    ], env, { allowDuringShutdown: true }),
  ])
  return {
    containers: nonEmptyLines(containers.stdout),
    volumes: nonEmptyLines(volumes.stdout),
    networks: nonEmptyLines(networks.stdout),
  }
}

function requireLocalSupabaseCoordinates(values: Record<string, string>) {
  const apiUrl = values.API_URL
  const dbUrl = values.DB_URL
  if (!apiUrl || !new URL(apiUrl).hostname.match(/^(127\.0\.0\.1|localhost)$/)) {
    throw new Error("Supabase runner did not return an explicit loopback API URL")
  }
  if (new URL(apiUrl).port !== "55321") {
    throw new Error("Supabase runner returned an unexpected API port")
  }
  if (!dbUrl || !dbUrl.match(/@(127\.0\.0\.1|localhost):55322\//)) {
    throw new Error("Supabase runner did not return the isolated database coordinate")
  }
  if (!values.ANON_KEY || !values.SERVICE_ROLE_KEY) {
    throw new Error("Supabase runner did not return local API credentials")
  }
}

function testEnvironment(
  local: Record<string, string>,
  providerPreload: string,
  temporaryApp: string,
): NodeJS.ProcessEnv {
  const encryptionKey = randomBytes(32).toString("base64")
  const appUrl = "http://127.0.0.1:3060"
  return {
    ...inheritedProcessEnv(),
    NODE_ENV: "production",
    NEXT_TELEMETRY_DISABLED: "1",
    PLAYWRIGHT: "1",
    NEXT_PUBLIC_PLAYWRIGHT: "1",
    E2E_ISOLATED_SUPABASE: "1",
    E2E_RUN_ID: `certificate-resend-${Date.now()}`,
    E2E_SECRET: randomBytes(32).toString("hex"),
    E2E_PROVIDER_BLOCK_MESSAGE: PROVIDER_BLOCK_MESSAGE,
    PRODUCTION_E2E_APP_ROOT: temporaryApp,
    PLAYWRIGHT_BASE_URL: appUrl,
    PLAYWRIGHT_PORT: "3060",
    NEXT_PUBLIC_APP_URL: appUrl,
    NEXT_PUBLIC_SITE_URL: appUrl,
    SUPABASE_URL: local.API_URL,
    NEXT_PUBLIC_SUPABASE_URL: local.API_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: local.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: local.SERVICE_ROLE_KEY,
    INTERNAL_API_SECRET: randomBytes(32).toString("hex"),
    ENCRYPTION_KEY: encryptionKey,
    PHI_MASTER_KEY: encryptionKey,
    PHI_ENCRYPTION_ENABLED: "true",
    PHI_ENCRYPTION_WRITE_ENABLED: "true",
    PHI_ENCRYPTION_READ_ENABLED: "true",
    RESEND_API_KEY: "re_e2e_local_blocked",
    RESEND_FROM_EMAIL: "InstantMed <support@example.test>",
    STRIPE_SECRET_KEY: "sk_e2e_local_only",
    STRIPE_WEBHOOK_SECRET: "whsec_e2e_local_only",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_e2e_local_only",
    STRIPE_PRICE_MEDCERT: "price_e2e_medcert",
    STRIPE_PRICE_MEDCERT_2DAY: "price_e2e_medcert_2day",
    STRIPE_PRICE_MEDCERT_3DAY: "price_e2e_medcert_3day",
    STRIPE_PRICE_REPEAT_SCRIPT: "price_e2e_repeat",
    STRIPE_PRICE_CONSULT: "price_e2e_consult",
    STRIPE_PRICE_CONSULT_ED: "price_e2e_ed",
    STRIPE_PRICE_CONSULT_HAIR_LOSS: "price_e2e_hair",
    STRIPE_PRICE_CONSULT_WOMENS_HEALTH: "price_e2e_womens",
    STRIPE_PRICE_CONSULT_WEIGHT_LOSS: "price_e2e_weight",
    STRIPE_PRICE_PRIORITY_FEE: "price_e2e_priority",
    UPSTASH_REDIS_REST_URL: "http://127.0.0.1:55330",
    UPSTASH_REDIS_REST_TOKEN: REDIS_TOKEN,
    CRON_SECRET: randomBytes(32).toString("hex"),
    TELEGRAM_BOT_TOKEN: "e2e-local-only",
    TELEGRAM_CHAT_ID: "0",
    INSTANTMED_VALIDATE_PRODUCTION_ENV: "false",
    SENTRY_AUTH_TOKEN: "",
    SENTRY_DSN: "",
    NEXT_PUBLIC_SENTRY_DSN: "",
    POSTHOG_API_KEY: "",
    NEXT_PUBLIC_POSTHOG_KEY: "",
    NODE_OPTIONS: `--require=${providerPreload}`,
  }
}

async function main() {
  const args = process.argv.slice(2).filter((arg) => arg !== "--")
  const specArg = args.find((arg) => arg.startsWith("--spec="))
  const spec = specArg?.slice("--spec=".length)
  if (args.length !== 1 || !spec || !ALLOWED_SPECS.includes(spec)) {
    throw new Error(`Use exactly one --spec from: ${ALLOWED_SPECS.join(", ")}`)
  }

  const root = resolve(process.cwd())
  if (await readFile(join(root, "package.json"), "utf8").then(
    (source) => !source.includes('"name": "instantmed"'),
  )) {
    throw new Error("Production E2E must run from the InstantMed repository root")
  }

  await Promise.all(LOCAL_PORTS.map(assertPortFree))

  const temporaryRoot = await mkdtemp(join(tmpdir(), "instantmed-cert-resend-e2e-"))
  const temporaryApp = join(temporaryRoot, "app")
  const temporarySupabase = join(temporaryRoot, "supabase")
  const providerPreload = join(temporaryRoot, "block-resend-provider.cjs")
  const commandEnv = inheritedProcessEnv()
  const supabaseProjectId = `instantmed-cert-resend-e2e-${randomBytes(4).toString("hex")}`
  let supabaseStartAttempted = false
  let primaryError: unknown
  let cleanupError: unknown
  let cleanupPromise: Promise<void> | undefined
  const redisContainers: string[] = []

  function cleanup(): Promise<void> {
    if (cleanupPromise) return cleanupPromise
    cleanupPromise = (async () => {
      for (const child of activeChildren) terminateChild(child)
      const redisCleanupErrors: unknown[] = []
      for (const container of redisContainers.reverse()) {
        try {
          const existing = await run("docker", ["ps", "-aq", "--filter", `name=^/${container}$`],
            commandEnv, { allowDuringShutdown: true })
          if (existing.stdout.trim()) {
            await run("docker", ["rm", "-f", "-v", container], commandEnv, { allowDuringShutdown: true })
          }
        } catch (error) {
          redisCleanupErrors.push(error)
        }
      }

      let stopError: unknown
      if (supabaseStartAttempted) {
        process.stdout.write("Stopping only the runner-owned isolated Supabase stack...\n")
        try {
          await run("supabase", [
            "stop",
            "--workdir",
            temporaryRoot,
            "--no-backup",
          ], commandEnv, { allowDuringShutdown: true })
        } catch (error) {
          stopError = error
        }

        const owned = await listOwnedDockerResources(supabaseProjectId, commandEnv)
        if (
          owned.containers.length > 0 ||
          owned.volumes.length > 0 ||
          owned.networks.length > 0
        ) {
          throw new AggregateError(
            stopError ? [stopError] : [],
            `Cleanup left ${owned.containers.length} container(s), ${owned.volumes.length} volume(s), and ${owned.networks.length} network(s) owned by ${supabaseProjectId}`,
          )
        }
        if (stopError) {
          process.stderr.write(
            "Supabase stop exited nonzero after partial startup; exact project-label verification found no owned containers, volumes, or networks.\n",
          )
        }
      }

      await rm(temporaryRoot, { recursive: true, force: true })
      if (redisCleanupErrors.length) {
        throw new AggregateError(redisCleanupErrors, "Could not remove all runner-owned Redis containers")
      }
    })()
    return cleanupPromise
  }

  try {
    await mkdir(temporaryApp)
    await mkdir(temporarySupabase)
    await run("rsync", [
      "-a",
      "--exclude=.git",
      "--exclude=.next",
      "--exclude=node_modules",
      "--exclude=.env",
      "--exclude=.env.*",
      "--exclude=.superpowers",
      "--exclude=coverage",
      "--exclude=output",
      "--exclude=playwright-report",
      "--exclude=test-results",
      `${root}/`,
      `${temporaryApp}/`,
    ], commandEnv)
    await symlink(join(root, "node_modules"), join(temporaryApp, "node_modules"), "dir")

    const sourceConfig = await readFile(join(root, "supabase/config.toml"), "utf8")
    const isolatedConfig = sourceConfig
      .replace(/^project_id = .*$/m, `project_id = "${supabaseProjectId}"`)
      .replace("port = 54321", "port = 55321")
      .replace("port = 54322", "port = 55322")
      .replace("shadow_port = 54320", "shadow_port = 55320")
      .replace("port = 54329", "port = 55329")
      .replace("port = 54323", "port = 55323")
      .replace("port = 54324", "port = 55324")
      .replace("smtp_port = 54325", "smtp_port = 55325")
      .replace("pop3_port = 54326", "pop3_port = 55326")
    await writeFile(join(temporarySupabase, "config.toml"), isolatedConfig, { mode: 0o600 })
    await symlink(join(root, "supabase/migrations"), join(temporarySupabase, "migrations"), "dir")
    await writeFile(providerPreload, [
      "const originalFetch = globalThis.fetch.bind(globalThis)",
      "globalThis.fetch = async (input, init) => {",
      "  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url",
      "  const parsed = new URL(url)",
      "  const method = (init?.method || (typeof input === 'object' && 'method' in input ? input.method : 'GET')).toUpperCase()",
      "  if (parsed.hostname === 'api.resend.com') {",
      "    return new Response(JSON.stringify({ message: process.env.E2E_PROVIDER_BLOCK_MESSAGE }), {",
      "      status: 503,",
      "      headers: { 'Content-Type': 'application/json' },",
      "    })",
      "  }",
      "  if (!['127.0.0.1', 'localhost'].includes(parsed.hostname) && !['GET', 'HEAD'].includes(method)) {",
      "    throw new Error(`E2E external network mutation blocked: ${method} ${parsed.hostname}`)",
      "  }",
      "  return originalFetch(input, init)",
      "}",
      "",
    ].join("\n"), { mode: 0o600 })

    process.stdout.write("Starting isolated Supabase on ports 55320-55329...\n")
    supabaseStartAttempted = true
    await run("supabase", [
      "start",
      "--workdir",
      temporaryRoot,
    ], commandEnv)

    const status = await run("supabase", [
      "status",
      "--workdir",
      temporaryRoot,
      "-o",
      "env",
    ], commandEnv)
    const local = parseSupabaseEnv(status.stdout)
    requireLocalSupabaseCoordinates(local)
    const env = testEnvironment(local, providerPreload, temporaryApp)

    // Real local Redis keeps fail-closed download/auth protection enabled.
    // Names are unique to this runner and removed before its Supabase stack.
    const redisName = `${supabaseProjectId}-redis`
    const redisHttpName = `${supabaseProjectId}-redis-http`
    redisContainers.push(redisName)
    await run("docker", ["run", "-d", "--name", redisName,
      REDIS_IMAGE, "redis-server", "--save", "", "--appendonly", "no"], commandEnv)
    redisContainers.push(redisHttpName)
    await run("docker", ["run", "-d", "--name", redisHttpName,
      "--link", `${redisName}:redis`, "-p", "127.0.0.1:55330:80",
      "-e", "SRH_MODE=env", "-e", `SRH_TOKEN=${REDIS_TOKEN}`,
      "-e", "SRH_CONNECTION_STRING=redis://redis:6379", REDIS_HTTP_IMAGE], commandEnv)
    const redis = new Redis({ url: env.UPSTASH_REDIS_REST_URL!, token: REDIS_TOKEN, retry: false })
    const deadline = Date.now() + 30_000
    while (true) {
      try { if (await redis.ping() === "PONG") break } catch { /* bounded startup */ }
      if (Date.now() >= deadline) throw new Error("Local Redis did not become ready")
      await new Promise(resolvePromise => setTimeout(resolvePromise, 250))
    }
    const limiter = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(1, "1 m"),
      prefix: "production-e2e-readiness", analytics: false })
    const first = await limiter.limit("probe")
    const second = await limiter.limit("probe")
    await Promise.all([first.pending, second.pending])
    if (!first.success || second.success) throw new Error("Local Redis did not enforce quota")

    process.stdout.write("Building the production Webpack bundle in a dotenv-free temporary app copy...\n")
    await run(process.execPath, [
      join(temporaryApp, "node_modules/next/dist/bin/next"),
      "build",
    ], { ...env, NODE_OPTIONS: `--max-old-space-size=8192 --require=${providerPreload}` }, {
      cwd: temporaryApp,
      stream: true,
    })

    process.stdout.write(`Running the isolated production-server spec ${spec}...\n`)
    await run(process.execPath, [
      join(root, "node_modules/@playwright/test/cli.js"),
      "test",
      "--config=playwright.production.config.ts",
      "--project=chromium",
      spec,
    ], env, { stream: true })
  } catch (error) {
    primaryError = error
  } finally {
    try {
      await cleanup()
    } catch (error) {
      cleanupError = error
    }
  }

  if (cleanupError) {
    process.stderr.write(`Cleanup incomplete; recovery workdir retained at ${temporaryRoot}\n`)
    throw new AggregateError(
      [primaryError, cleanupError].filter((error) => error !== undefined),
      "Production E2E failed and cleanup did not complete",
    )
  }
  if (primaryError) throw primaryError
  if (receivedSignal) throw new Error(`Runner interrupted by ${receivedSignal}`)
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
