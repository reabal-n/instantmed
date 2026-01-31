/**
 * Server-side React Email Renderer
 * 
 * Renders React email templates to HTML string for email sending.
 * Uses dynamic import to avoid Next.js bundler restrictions.
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
