import { type ReactNode, useState } from 'react'
import { AppSidebar } from '@/components/AppSidebar'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'
import { useWorkshopBranding } from '@/hooks/useWorkshopBranding'
import { DEMO_MODE } from '@/blink/client'

export function AppLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { workshopName } = useWorkshopBranding()

  return (
    <div className="flex h-dvh overflow-hidden">
      <aside className="hidden md:block shrink-0">
        <AppSidebar />
      </aside>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10">
            <AppSidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <main className="flex flex-1 min-w-0 flex-col">
        <div className="md:hidden flex items-center gap-3 px-4 h-14 border-b border-border bg-background sticky top-0 z-30">
          <Button
            variant="ghost"
            size="icon"
            className="-ml-2"
            aria-label="Abrir menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
          <span className="font-semibold text-sm flex-1 truncate">{workshopName}</span>
          {DEMO_MODE && (
            <span className="shrink-0 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-semibold px-1.5 py-0.5">
              DEMO
            </span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  )
}
