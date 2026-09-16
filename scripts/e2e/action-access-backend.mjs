/** Disposable PostgREST-shaped fixture for compiled action authorization tests.
 * This tests application guards, never Supabase RLS or database constraints.
 * No credentials, provider connections, or durable data exist in this process.
 */
import { createServer } from "node:http"

const tables = new Map()
const metrics = { draftReads: 0, intakeReads: 0, writes: 0 }
const profile = (suffix, role, extra = {}) => ({
  id: `e2e00000-0000-0000-0000-00000000000${suffix}`, role,
  full_name: "Synthetic action fixture", email: `e2e-action-${suffix}@test.instantmed.com.au`,
  auth_user_id: null, account_closed_at: null, onboarding_completed: true, email_verified: true,
  can_review_med_certs: true, ...extra,
})
tables.set("profiles", [profile(1, "admin"), profile(2, "patient"), profile(3, "doctor"), profile(4, "support")])
const rowsFor = table => {
  if (!tables.has(table)) tables.set(table, [])
  return tables.get(table)
}
function matches(row, query) {
  for (const [key, filter] of query) {
    if (["select", "order", "limit", "offset"].includes(key)) continue
    if (filter.startsWith("eq.") && String(row[key]) !== filter.slice(3)) return false
    if (filter.startsWith("in.(") && !filter.slice(4, -1).split(",").includes(String(row[key]))) return false
  }
  return true
}
function send(res, status, body, headers = {}) {
  res.writeHead(status, { "content-type": "application/json", ...headers })
  res.end(body === undefined ? undefined : JSON.stringify(body))
}
const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1")
  if (url.pathname === "/metrics") return send(res, 200, metrics)
  if (url.pathname === "/health") return send(res, 200, { ready: true })
  if (!url.pathname.startsWith("/rest/v1/")) return send(res, 401, { message: "No fixture auth session" })
  const table = url.pathname.slice("/rest/v1/".length)
  if (table.startsWith("rpc/")) return send(res, 200, [])
  if (["GET", "HEAD"].includes(req.method)) {
    if (table === "document_drafts") metrics.draftReads += 1
    if (table === "intakes") metrics.intakeReads += 1
  } else metrics.writes += 1
  const rows = rowsFor(table)
  let selected = rows.filter(row => matches(row, url.searchParams))
  if (req.method === "POST" || req.method === "PATCH") {
    let body = ""
    for await (const chunk of req) body += chunk
    const values = body ? JSON.parse(body) : {}
    if (req.method === "POST") {
      selected = (Array.isArray(values) ? values : [values]).map(value => ({
        ...(table === "document_drafts" ? { approved_at: null, approved_by: null, rejected_at: null, rejected_by: null, edited_content: null, edited_content_enc: null, input_hash: null } : {}),
        ...value,
      }))
      rows.push(...selected)
    } else selected.forEach(row => Object.assign(row, values))
  } else if (req.method === "DELETE") {
    tables.set(table, rows.filter(row => !selected.includes(row)))
  }
  if (table === "intakes" && url.searchParams.get("select")?.includes("service:")) {
    selected = selected.map(row => ({ ...row, service: { type: "med_certs" } }))
  }
  const count = selected.length
  const headers = { "content-range": count ? `0-${count - 1}/${count}` : "*/0" }
  if (req.method === "HEAD") return send(res, 200, undefined, headers)
  if (req.method !== "GET" && !req.headers.prefer?.includes("return=representation")) return send(res, req.method === "POST" ? 201 : 204, undefined, headers)
  if (req.headers.accept?.includes("application/vnd.pgrst.object+json")) {
    if (count !== 1) return send(res, 406, { code: "PGRST116", message: "Fixture row count mismatch" })
    return send(res, 200, selected[0], headers)
  }
  return send(res, 200, selected, headers)
})
server.listen(Number(process.env.ACTION_ACCESS_BACKEND_PORT || 3079), "127.0.0.1")
