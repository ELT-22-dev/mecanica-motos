import { type ReactNode, useState } from 'react'
import { blink } from '@/blink/client'
import { useAuth } from '@/hooks/useAuth'
import { AppSidebar } from '@/components/AppSidebar'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="flex min-h-dvh">
        <div className="hidden md:block w-[15rem] shrink-0 border-r border-border bg-sidebar animate-pulse" />
        <div className="flex flex-1 items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center bg-background">
        <div className="space-y-2">
          <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-xl bg-primary text-primary-foreground text-2xl font-bold">
            O
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">OdontoManage Pro</h1>
          <p className="text-muted-foreground max-w-sm">
            Sistema completo de gestao para sua clinica odontologica.
          </p>
        </div>
        <Button size="lg" onClick={() => blink.auth.login()}>
          Entrar
        </Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh">
      <aside className="hidden md:block shrink-0">
        <AppSidebar user={user} />
      </aside>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10">
            <AppSidebar user={user} onNavigate={() => setMobileOpen(false)} />
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
          <span className="font-semibold text-sm">OdontoManage Pro</span>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  )
}
