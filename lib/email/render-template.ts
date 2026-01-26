/**
 * Email Template Renderer
 * 
 * Server-only utility to render React email templates to HTML.
 * Uses dynamic import to work around Next.js 15 bundler restrictions.
 */

import "server-only"
import type { ReactElement } from "react"

/**
 * Render a React email template to HTML string
 * Uses dynamic import to bypass Next.js bundler restrictions on react-dom/server
 */
export async function renderEmailToHtml(template: ReactElement): Promise<string> {
  // Dynamic import to avoid bundler restrictions
  const ReactDOMServer = await import("react-dom/server")
  const html = ReactDOMServer.renderToStaticMarkup(template)
  return `<!DOCTYPE html>${html}`
}
