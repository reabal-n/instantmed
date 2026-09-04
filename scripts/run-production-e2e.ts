import { randomBytes } from "node:crypto"
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises"
import { createServer } from "node:net"
import { tmpdir } from "node:os"
import { basename, join, resolve } from "node:path"
import { spawn } from "node:child_process"

const EXPECTED_SPEC = "e2e/certificate-resend-render.spec.ts"
const SUPABASE_PROJECT_ID = "instantmed-cert-resend-e2e"
const LOCAL_PORTS = [3060, 55320, 55321, 55322, 55323, 55324, 55325, 55326, 55329]
const PROVIDER_BLOCK_MESSAGE = "E2E provider blocked before external delivery"

type CommandResult = { stdout: string; stderr: string }

function redact(value: string): string {
  return value
    .replace(/eyJ[A-Za-z0-9._-]{20,}/g, "[redacted-jwt]")
    .replace(/(ANON_KEY|SERVICE_ROLE_KEY|SECRET_KEY|TOKEN)=?[^\s]*/gi, "$1=[redacted]")
}

async function run(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
  options: { stream?: boolean } = {},
): Promise<CommandResult> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env,
      stdio: ["ignore", "pipe", "pipe"],
    })
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
    child.once("error", reject)
    child.once("exit", (code) => {
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
    UPSTASH_REDIS_REST_URL: "http://127.0.0.1:9",
    UPSTASH_REDIS_REST_TOKEN: "e2e-local-only",
    CRON_SECRET: randomBytes(32).toString("hex"),
    TELEGRAM_BOT_TOKEN: "e2e-local-only",
    TELEGRAM_CHAT_ID: "0",
    INSTANTMED_VALIDATE_PRODUCTION_ENV: "false",
    NODE_OPTIONS: `--require=${providerPreload}`,
  }
}

async function main() {
  const args = process.argv.slice(2).filter((arg) => arg !== "--")
  const specArg = args.find((arg) => arg.startsWith("--spec="))
  if (args.length !== 1 || specArg !== `--spec=${EXPECTED_SPEC}`) {
    throw new Error(`Use exactly --spec=${EXPECTED_SPEC}`)
  }

  const root = resolve(process.cwd())
  if (await readFile(join(root, "package.json"), "utf8").then(
    (source) => !source.includes('"name": "instantmed"'),
  )) {
    throw new Error("Production E2E must run from the InstantMed repository root")
  }

  await Promise.all(LOCAL_PORTS.map(assertPortFree))

  const temporaryRoot = await mkdtemp(join(tmpdir(), "instantmed-cert-resend-e2e-"))
  const temporarySupabase = join(temporaryRoot, "supabase")
  const providerPreload = join(temporaryRoot, "block-resend-provider.cjs")
  const commandEnv = inheritedProcessEnv()
  let startedSupabase = false

  try {
    await mkdir(temporarySupabase)
    const sourceConfig = await readFile(join(root, "supabase/config.toml"), "utf8")
    const isolatedConfig = sourceConfig
      .replace(/^project_id = .*$/m, `project_id = "${SUPABASE_PROJECT_ID}"`)
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
      "  if (new URL(url).hostname === 'api.resend.com') {",
      "    return new Response(JSON.stringify({ message: process.env.E2E_PROVIDER_BLOCK_MESSAGE }), {",
      "      status: 503,",
      "      headers: { 'Content-Type': 'application/json' },",
      "    })",
      "  }",
      "  return originalFetch(input, init)",
      "}",
      "",
    ].join("\n"), { mode: 0o600 })

    process.stdout.write("Starting isolated Supabase on ports 55320-55329...\n")
    await run("supabase", [
      "start",
      "--workdir",
      temporaryRoot,
    ], commandEnv)
    startedSupabase = true

    // The checked-in baseline still names this production column `answers_enc`.
    // Keep the compatibility shim inside the disposable stack; do not mutate a
    // shared database or conceal the migration drift with an app fallback.
    await run("docker", [
      "exec",
      `supabase_db_${SUPABASE_PROJECT_ID}`,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "--set",
      "ON_ERROR_STOP=1",
      "--command",
      "ALTER TABLE public.intake_answers ADD COLUMN IF NOT EXISTS answers_encrypted jsonb, ADD COLUMN IF NOT EXISTS encryption_metadata jsonb",
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
    const env = testEnvironment(local, providerPreload)

    process.stdout.write("Building the production Webpack bundle with isolated local coordinates...\n")
    await run(process.execPath, [
      join(root, "node_modules/next/dist/bin/next"),
      "build",
    ], { ...env, NODE_OPTIONS: "--max-old-space-size=8192" }, { stream: true })

    process.stdout.write("Running the certificate resend production-server spec...\n")
    await run(process.execPath, [
      join(root, "node_modules/@playwright/test/cli.js"),
      "test",
      "--config=playwright.production.config.ts",
      "--project=chromium",
      EXPECTED_SPEC,
    ], env, { stream: true })
  } finally {
    if (startedSupabase) {
      process.stdout.write("Stopping only the runner-owned isolated Supabase stack...\n")
      try {
        await run("supabase", [
          "stop",
          "--workdir",
          temporaryRoot,
          "--no-backup",
        ], commandEnv)
      } catch (error) {
        process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
      }
    }
    await rm(temporaryRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
