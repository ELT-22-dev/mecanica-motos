import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { blink } from '@/blink/client'
import { useState, useMemo } from 'react'
import {
  Wrench, Search, Trash2, ArrowUpDown,
  TrendingUp, Percent, Plus,
  MoreHorizontal, Filter,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { SERVICE_ORDER_STATUS_CONFIG as STATUS_CONFIG } from '@/lib/serviceOrderStatus'

interface ServiceOrder {
  id: string; client_id: string | null; client_name: string
  vehicle_id: string | null; vehicle_label: string | null
  mechanic_name: string | null; status: string
  total: string; created_at: string
}

export const Route = createFileRoute('/_app/ordens-servico/')({
  head: () => ({ meta: [{ title: 'Ordens de Servico · MotoManage Pro' }] }),
  component: ServiceOrdersPage,
})

function ServiceOrdersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortNewest, setSortNewest] = useState(true)

  const { data: orders = [] } = useQuery<ServiceOrder[]>({
    queryKey: ['serviceOrders'],
    queryFn: () => blink.db.table<ServiceOrder>('service_orders').list(),
  })

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const open = orders.filter((o) => o.status === 'open' || o.status === 'in_progress' || o.status === 'waiting_parts').length
    const completedToday = orders.filter((o) => o.status === 'completed' && o.created_at.slice(0, 10) === today).length
    const total = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0)
    const avg = orders.length > 0 ? total / orders.length : 0
    return { open, completedToday, avg }
  }, [orders])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length }
    for (const o of orders) counts[o.status] = (counts[o.status] || 0) + 1
    return counts
  }, [orders])

  const filtered = useMemo(() => {
    let list = orders
    if (statusFilter !== 'all') list = list.filter((o) => o.status === statusFilter)
    if (search) {
      const s = search.toLowerCase()
      list = list.filter((o) =>
        o.client_name.toLowerCase().includes(s) ||
        (o.vehicle_label && o.vehicle_label.toLowerCase().includes(s)) ||
        (o.mechanic_name && o.mechanic_name.toLowerCase().includes(s))
      )
    }
    return list.sort((a, b) => {
      const cmp = a.created_at.localeCompare(b.created_at)
      return sortNewest ? -cmp : cmp
    })
  }, [orders, search, statusFilter, sortNewest])

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta ordem de servico? Os itens associados tambem serao removidos.')) return
    try {
      await blink.db.table('service_orders').delete(id)
      queryClient.invalidateQueries({ queryKey: ['serviceOrders'] })
      toast.success('Ordem de servico excluida')
    } catch (err: any) { toast.error(err?.message || 'Erro') }
  }

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const statusBadge = (status: string) => {
    const s = STATUS_CONFIG[status] || { label: status, cls: '' }
    return <Badge variant="secondary" className={cn('text-[10px] px-1.5', s.cls)}>{s.label}</Badge>
  }

  const statusFilters = [
    { value: 'all', label: 'Todas', count: statusCounts.all || 0 },
    { value: 'open', label: 'Abertas', count: statusCounts.open || 0 },
    { value: 'in_progress', label: 'Em andamento', count: statusCounts.in_progress || 0 },
    { value: 'waiting_parts', label: 'Aguard. pecas', count: statusCounts.waiting_parts || 0 },
    { value: 'completed', label: 'Concluidas', count: statusCounts.completed || 0 },
    { value: 'delivered', label: 'Entregues', count: statusCounts.delivered || 0 },
    { value: 'cancelled', label: 'Canceladas', count: statusCounts.cancelled || 0 },
  ]

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Ordens de Servico</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {orders.length} ordem{orders.length !== 1 ? 'ns' : ''} de servico registrada{orders.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link to="/ordens-servico/nova">
          <Button size="sm" className="gap-2">
            <Plus className="size-4" /> Nova OS
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
        {/* ────── Left sidebar ────── */}
        <div className="space-y-4">
          {/* Stats cards */}
          <div className="grid grid-cols-1 gap-3">
            <StatsCard icon={<Wrench className="size-4" />} label="Em aberto" value={stats.open}
              color="text-sky-600 dark:text-sky-400" bg="bg-sky-50 dark:bg-sky-950/40" />
            <StatsCard icon={<TrendingUp className="size-4" />} label="Concluidas hoje" value={stats.completedToday}
              color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-50 dark:bg-emerald-950/40" />
            <StatsCard icon={<Percent className="size-4" />} label="Ticket medio" value={formatCurrency(stats.avg)}
              color="text-amber-600 dark:text-amber-400" bg="bg-amber-50 dark:bg-amber-950/40" />
          </div>

          {/* Status filter */}
          <Card className="border-border/60">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Filter className="size-3" /> Status
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="flex flex-wrap gap-1.5">
                {statusFilters.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setStatusFilter(f.value)}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer',
                      statusFilter === f.value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}
                  >
                    {f.label} ({f.count})
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ────── Right side: list ────── */}
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, veiculo ou mecanico..."
                className="pl-9 h-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={() => setSortNewest(!sortNewest)}
              title={sortNewest ? 'Mais recentes primeiro' : 'Mais antigas primeiro'}
            >
              <ArrowUpDown className={cn('size-4', !sortNewest && 'rotate-180')} />
            </Button>
          </div>

          {filtered.length === 0 ? (
            <Card className="border-border/60 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Wrench className="size-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Nenhuma ordem de servico encontrada</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {search || statusFilter !== 'all' ? 'Tente mudar os filtros' : 'Clique em Nova OS para comecar'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/60">
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {filtered.map((o) => (
                    <div key={o.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors group">
                      <div className="w-14 shrink-0 text-center">
                        <p className="text-xs font-medium text-muted-foreground">
                          {new Date(o.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </p>
                      </div>
                      <Link to="/ordens-servico/$id" params={{ id: o.id }} className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate hover:text-primary hover:underline transition-colors">
                          {o.client_name}{o.vehicle_label ? ` · ${o.vehicle_label}` : ''}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {o.mechanic_name || 'Sem mecanico atribuido'} · {formatCurrency(Number(o.total) || 0)}
                        </p>
                      </Link>
                      {statusBadge(o.status)}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="size-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem asChild>
                            <Link to="/ordens-servico/$id" params={{ id: o.id }}>Ver detalhes</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(o.id)}>
                            <Trash2 className="size-3.5 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function StatsCard({
  icon, label, value, color, bg,
}: {
  icon: React.ReactNode; label: string; value: string | number; color: string; bg: string
}) {
  return (
    <div className={cn('rounded-xl p-3 flex items-center gap-3', bg)}>
      <div className={cn('shrink-0', color)}>{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn('text-lg font-bold', color)}>{value}</p>
      </div>
    </div>
  )
}
