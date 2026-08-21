import { useState, useCallback } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Wrench,
  Package,
  DollarSign,
  BarChart3,
  Settings,
  PanelLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkshopBranding } from '@/hooks/useWorkshopBranding'
import { DEMO_MODE } from '@/blink/client'

const SIDEBAR_KEY = 'moto_sidebar'

interface NavItemDef {
  href: string
  icon: React.ReactNode
  label: string
}

const NAV_ITEMS: NavItemDef[] = [
  { href: '/', icon: <LayoutDashboard className="size-4" />, label: 'Dashboard' },
  { href: '/clientes', icon: <Users className="size-4" />, label: 'Clientes' },
  { href: '/agenda', icon: <CalendarDays className="size-4" />, label: 'Agenda' },
  { href: '/ordens-servico', icon: <Wrench className="size-4" />, label: 'Ordens de Servico' },
  { href: '/estoque', icon: <Package className="size-4" />, label: 'Estoque' },
  { href: '/financeiro', icon: <DollarSign className="size-4" />, label: 'Financeiro' },
  { href: '/relatorios', icon: <BarChart3 className="size-4" />, label: 'Relatorios' },
]

const BOTTOM_ITEMS: NavItemDef[] = [
  { href: '/configuracoes', icon: <Settings className="size-4" />, label: 'Configuracoes' },
]

interface AppSidebarProps {
  onNavigate?: () => void
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(SIDEBAR_KEY) === 'true'
  })
  const location = useLocation()
  const { workshopName, logoDataUrl } = useWorkshopBranding()

  const toggle = useCallback(() => {
    setCollapsed((v) => {
      const next = !v
      localStorage.setItem(SIDEBAR_KEY, String(next))
      return next
    })
  }, [])

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          'flex flex-col h-full bg-sidebar border-r border-sidebar-border overflow-hidden',
          'transition-[width] duration-200 ease-linear shrink-0',
          collapsed ? 'w-[3rem]' : 'w-[15rem]'
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'flex items-center gap-2 shrink-0 border-b border-sidebar-border h-[52px] px-3',
            collapsed && 'justify-center px-2'
          )}
        >
          {!collapsed && (
            <>
              {logoDataUrl ? (
                <img src={logoDataUrl} alt="" className="size-7 rounded-md object-cover shrink-0" />
              ) : (
                <div className="flex items-center justify-center size-7 rounded-md bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold shrink-0">
                  {workshopName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="flex-1 min-w-0 font-semibold text-sm truncate text-sidebar-foreground">
                {workshopName}
              </span>
              {DEMO_MODE && (
                <span className="shrink-0 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-semibold px-1.5 py-0.5">
                  DEMO
                </span>
              )}
            </>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 shrink-0 text-sidebar-foreground/60 hover:text-sidebar-foreground"
                onClick={toggle}
              >
                <PanelLeft
                  className={cn(
                    'size-4 transition-transform duration-200',
                    collapsed && 'rotate-180'
                  )}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {collapsed ? 'Expandir menu' : 'Recolher menu'}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Nav items */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 py-2 space-y-0.5">
          {!collapsed && (
            <p className="px-3 pt-1 pb-1 text-[10px] font-medium text-sidebar-foreground/50 uppercase tracking-wider">
              Modulos
            </p>
          )}
          {NAV_ITEMS.map((item) => (
            <SidebarNavItem
              key={item.href}
              item={item}
              collapsed={collapsed}
              active={location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href))}
              onClick={onNavigate}
            />
          ))}
        </div>

        {/* Bottom items */}
        <div className="shrink-0 border-t border-sidebar-border px-2 py-2 space-y-0.5">
          {!collapsed && (
            <p className="px-3 pt-1 pb-1 text-[10px] font-medium text-sidebar-foreground/50 uppercase tracking-wider">
              Sistema
            </p>
          )}
          {BOTTOM_ITEMS.map((item) => (
            <SidebarNavItem
              key={item.href}
              item={item}
              collapsed={collapsed}
              active={location.pathname === item.href}
              onClick={onNavigate}
            />
          ))}
        </div>
      </div>
    </TooltipProvider>
  )
}

function SidebarNavItem({
  item,
  collapsed,
  active,
  onClick,
}: {
  item: NavItemDef
  collapsed: boolean
  active: boolean
  onClick?: () => void
}) {
  const link = (
    <Link
      to={item.href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 rounded-md text-sm transition-colors cursor-pointer',
        collapsed ? 'justify-center w-8 h-8 mx-auto' : 'px-3 py-2 w-full',
        active
          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
          : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
      )}
    >
      <span className="shrink-0">{item.icon}</span>
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  )

  if (!collapsed) return link
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  )
}
