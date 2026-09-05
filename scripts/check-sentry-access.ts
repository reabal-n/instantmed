#!/usr/bin/env npx tsx
/* eslint-disable no-console */

import path from "node:path"

import dotenv from "dotenv"

dotenv.config({ path: path.join(process.cwd(), ".env.local"), override: false, quiet: true })
dotenv.config({ path: path.join(process.cwd(), ".env"), override: false, quiet: true })

function env(name: string): string | undefined {
  const value = process.env[name]?.trim()
  return value ? value : undefined
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.length > 1 || (args.length === 1 && args[0] !== "--issues")) {
    throw new Error("Usage: pnpm check:sentry [--issues]")
  }
  const checkIssues = args[0] === "--issues"
  const token = env("SENTRY_AUTH_TOKEN")
  const org = env("SENTRY_ORG") || "reys-projects"
  const project = env("SENTRY_PROJECT") || "instantmed"
  const apiBase = env("SENTRY_API_BASE_URL") || "https://sentry.io"

  if (!token) {
    throw new Error(`Missing SENTRY_AUTH_TOKEN. Set a local token with ${checkIssues ? "project:read and event:read" : "project read/release access"}. Do not paste tokens into chat.`)
  }

  const baseUrl = apiBase.replace(/\/$/, "")
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  }

  const projectPath = `/api/0/projects/${encodeURIComponent(org)}/${encodeURIComponent(project)}/`
  if (checkIssues) {
    const issuesResponse = await fetch(
      `${baseUrl}${projectPath}issues/?per_page=1&statsPeriod=24h&environment=production`,
      { headers, signal: AbortSignal.timeout(10_000) },
    )
    // This is an access check only: never print issue titles or event payloads.
    if (issuesResponse.ok) {
      console.log(`Sentry production issue-list read access passed for ${org}/${project}.`)
      return
    }
    if (issuesResponse.status === 401) {
      throw new Error("Sentry token was rejected with 401. Rotate SENTRY_AUTH_TOKEN.")
    }
    if (issuesResponse.status === 403) {
      throw new Error(`Sentry token lacks issue-read access to ${org}/${project}. Use a read-only token with project:read and event:read; source-map release permission is insufficient.`)
    }
    if (issuesResponse.status === 404) {
      throw new Error(`Sentry project ${org}/${project} was not found or is not visible to this token. Check SENTRY_ORG and SENTRY_PROJECT.`)
    }
    throw new Error(`Sentry issue-read access check failed with ${issuesResponse.status}.`)
  }
  const response = await fetch(`${baseUrl}${projectPath}`, { headers })

  if (response.ok) {
    const body = await response.json() as { slug?: string; organization?: { slug?: string } }
    console.log(`Sentry project access passed for ${body.organization?.slug || org}/${body.slug || project} via project API. Issue/event read access was not checked; use --issues for incident investigation.`)
    return
  }

  if (response.status === 401) {
    throw new Error("Sentry token was rejected with 401. Rotate SENTRY_AUTH_TOKEN.")
  }

  if (response.status === 403 || response.status === 404) {
    const releasesPath = `/api/0/projects/${encodeURIComponent(org)}/${encodeURIComponent(project)}/releases/?per_page=1`
    const releasesResponse = await fetch(`${baseUrl}${releasesPath}`, { headers })

    if (releasesResponse.ok) {
      console.log(`Sentry access passed for ${org}/${project} via release API. Issue/event read access was not checked; use --issues for incident investigation.`)
      return
    }

    if (releasesResponse.status === 401) {
      throw new Error("Sentry token was rejected with 401. Rotate SENTRY_AUTH_TOKEN.")
    }
    if (releasesResponse.status === 403) {
      throw new Error(`Sentry token lacks release access to ${org}/${project}. Use a Sentry organization token or add project release scopes.`)
    }
    if (releasesResponse.status === 404) {
      throw new Error(`Sentry project ${org}/${project} was not found or is not visible to this token. Check SENTRY_ORG and SENTRY_PROJECT.`)
    }

    const releasesBody = await releasesResponse.text().catch(() => "")
    throw new Error(`Sentry release access check failed with ${releasesResponse.status}${releasesBody ? `: ${releasesBody.slice(0, 200)}` : ""}`)
  }

  const body = await response.text().catch(() => "")
  throw new Error(`Sentry access check failed with ${response.status}${body ? `: ${body.slice(0, 200)}` : ""}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
