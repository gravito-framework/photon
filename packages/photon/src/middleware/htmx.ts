import type { GravitoMiddleware } from '@gravito/core'

/**
 * HTMX Middleware for Photon.
 *
 * Automatically detects HTMX requests and populates the context with
 * HTMX-specific headers and state.
 *
 * @remarks
 * This middleware enables hypermedia-driven UIs by providing first-class
 * support for HTMX. It allows handlers to easily distinguish between
 * full-page loads and partial updates.
 *
 * Implemented with Gravito types, exported as Hono-compatible middleware.
 *
 * @returns A middleware handler that populates HTMX context variables.
 *
 * @example
 * ```typescript
 * import { Photon } from '@gravito/photon'
 * import { htmxMiddleware } from '@gravito/photon/middleware/htmx'
 *
 * const app = new Photon()
 * app.use(htmxMiddleware())
 *
 * app.get('/search', async (c) => {
 *   // Check if request is from HTMX
 *   if (c.get('htmx')) {
 *     return c.html('<div>Search results...</div>')
 *   }
 *
 *   return c.html('<html>...</html>')
 * })
 * ```
 *
 * @context_variables
 * - `htmx`: Boolean indicating if the request is an HTMX request.
 * - `htmx.boosted`: Boolean indicating if the request was boosted.
 * - `htmx.target`: The ID of the target element.
 * - `htmx.trigger`: The ID of the trigger element.
 */
export const htmxMiddleware = (): GravitoMiddleware => {
  const middleware: GravitoMiddleware = async (c, next) => {
    // Check for HTMX request header
    const isHtmx = c.req.header('HX-Request') === 'true'

    // Store in context for easy access
    c.set('htmx', isHtmx)

    // Also store HTMX-specific headers if present
    if (isHtmx) {
      c.set('htmx.boosted', c.req.header('HX-Boosted') === 'true')
      c.set('htmx.currentUrl', c.req.header('HX-Current-URL') || null)
      c.set('htmx.historyRestoreRequest', c.req.header('HX-History-Restore-Request') === 'true')
      c.set('htmx.prompt', c.req.header('HX-Prompt') || null)
      c.set('htmx.request', c.req.header('HX-Request') === 'true')
      c.set('htmx.target', c.req.header('HX-Target') || null)
      c.set('htmx.trigger', c.req.header('HX-Trigger') || null)
      c.set('htmx.triggerName', c.req.header('HX-Trigger-Name') || null)
    }

    return await next()
  }

  return middleware
}
