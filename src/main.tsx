import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { createRouter } from './router'
import { DEMO_MODE } from '@/blink/client'
import { seedDemoDataIfNeeded } from '@/blink/demoSeed'
import './index.css'

if (DEMO_MODE) seedDemoDataIfNeeded()

// staleTime avoids an extra API round-trip every time a page remounts (e.g.
// switching tabs in the sidebar) — data is refetched at most once per window
// instead of on every single navigation. Window-focus refetch stays on so
// changes made elsewhere still show up when this tab regains focus.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
    },
  },
})

const router = createRouter()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={0}>
        <Toaster />
        <RouterProvider router={router} />
      </TooltipProvider>
    </QueryClientProvider>
  </StrictMode>
)
