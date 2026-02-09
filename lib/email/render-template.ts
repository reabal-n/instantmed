/**
 * Email Template Renderer
 *
 * Re-exports from the canonical implementation in react-renderer-server.ts.
 * This file previously contained a duplicate implementation. Any new code
 * should import from "@/lib/email/react-renderer-server" directly.
 */

export { renderEmailToHtml } from "./react-renderer-server"
