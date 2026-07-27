import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { BlinkClientBoundary } from '@/components/BlinkClientBoundary'
import { AppLayout } from '@/components/AppLayout'

export const Route = createFileRoute('/_app')({
  component: AppLayoutRoute,
})

function AppLayoutRoute() {
  return (
    <BlinkClientBoundary fallback={<LayoutSkeleton />}>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </BlinkClientBoundary>
  )
}

function LayoutSkeleton() {
  return (
    <div className="flex h-dvh overflow-hidden">
      <div className="hidden md:block w-[15rem] shrink-0 border-r border-border bg-sidebar animate-pulse" />
      <div className="flex flex-1 flex-col">
        <div className="md:hidden flex items-center gap-3 px-4 h-14 border-b border-border" />
        <div className="flex flex-1 items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    </div>
  )
}
