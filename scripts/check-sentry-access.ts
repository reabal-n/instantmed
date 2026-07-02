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
  const token = env("SENTRY_AUTH_TOKEN")
  const org = env("SENTRY_ORG") || "reys-projects"
  const project = env("SENTRY_PROJECT") || "instantmed"
  const apiBase = env("SENTRY_API_BASE_URL") || "https://sentry.io"

  if (!token) {
    throw new Error("Missing SENTRY_AUTH_TOKEN. Create or rotate a token with project read/release access before release.")
  }

  const baseUrl = apiBase.replace(/\/$/, "")
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  }

  const projectPath = `/api/0/projects/${encodeURIComponent(org)}/${encodeURIComponent(project)}/`
  const response = await fetch(`${baseUrl}${projectPath}`, { headers })

  if (response.ok) {
    const body = await response.json() as { slug?: string; organization?: { slug?: string } }
    console.log(`Sentry access passed for ${body.organization?.slug || org}/${body.slug || project} via project API.`)
    return
  }

  if (response.status === 401) {
    throw new Error("Sentry token was rejected with 401. Rotate SENTRY_AUTH_TOKEN.")
  }

  if (response.status === 403 || response.status === 404) {
    const releasesPath = `/api/0/projects/${encodeURIComponent(org)}/${encodeURIComponent(project)}/releases/?per_page=1`
    const releasesResponse = await fetch(`${baseUrl}${releasesPath}`, { headers })

    if (releasesResponse.ok) {
      console.log(`Sentry access passed for ${org}/${project} via release API.`)
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
