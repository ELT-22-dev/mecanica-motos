import { createRouter as createTanStackRouter, createHashHistory } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { DEMO_MODE } from '@/blink/client'

/**
 * `routeTree.gen.ts` is generated automatically by the TanStack Router Vite
 * plugin from the files under `src/routes/` (do not edit it by hand).
 */
export function createRouter() {
  return createTanStackRouter({
    routeTree,
    defaultPreload: 'intent',
    scrollRestoration: true,
    // The demo build can be dropped on any static host (GitHub Pages, etc.)
    // with no server-side rewrite rules configured — hash history keeps the
    // whole route path client-side (after the `#`), so a direct link or a
    // page refresh on e.g. /clientes never 404s at the host.
    history: DEMO_MODE ? createHashHistory() : undefined,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>
  }
}
