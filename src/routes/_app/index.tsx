import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { blink } from '@/blink/client'
import { useAuth } from '@/hooks/useAuth'
import {
  Users, CalendarDays, Wrench, PackageX, Clock, AlertTriangle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useMemo } from 'react'

interface Client { id: string; name: string; status: string; created_at: string }
interface Appointment {
  id: string; client_name: string; vehicle_label: string | null; mechanic_name: string | null
  date: string; time: string; service_type: string; status: string
}
interface ServiceOrder {
  id: string; client_name: string; vehicle_label: string | null
  status: string; total: string; created_at: string
}
interface Part { id: string; name: string; quantity: number; min_quantity: number }
interface Transaction { id: string; type: string; status: string; amount: string; created_at: string }

export const Route = createFileRoute('/_app/')({
  head: () => ({
    meta: [
      { title: 'Dashboard · MotoManage Pro' },
      { name: 'description', content: 'Dashboard da oficina de motos' },
    ],
  }),
  component: Dashboard,
})

function Dashboard() {
  const { user } = useAuth()

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: () => blink.db.table<Client>('clients').list(),
  })

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ['appointments'],
    queryFn: () => blink.db.table<Appointment>('appointments').list(),
  })

  const { data: serviceOrders = [] } = useQuery<ServiceOrder[]>({
    queryKey: ['serviceOrders'],
    queryFn: () => blink.db.table<ServiceOrder>('service_orders').list(),
  })

  const { data: parts = [] } = useQuery<Part[]>({
    queryKey: ['parts'],
    queryFn: () => blink.db.table<Part>('parts').list(),
  })

  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ['transactions'],
    queryFn: () => blink.db.table<Transaction>('transactions').list(),
  })

  const today = new Date().toISOString().slice(0, 10)
  const todayAppts = appointments.filter((a) => a.date === today)
  const openOrders = serviceOrders.filter((o) => o.status === 'open' || o.status === 'in_progress' || o.status === 'waiting_parts')
  const lowStockParts = parts.filter((p) => p.quantity <= p.min_quantity)

  const monthRevenue = useMemo(() => {
    const now = new Date()
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    return transactions
      .filter((t) => t.type === 'income' && t.status === 'paid' && t.created_at.startsWith(monthKey))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
  }, [transactions])

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const stats = useMemo(() => [
    { label: 'Clientes', value: clients.length, icon: Users, color: 'bg-chart-1/10 text-chart-1' },
    { label: 'OS em aberto', value: openOrders.length, icon: Wrench, color: 'bg-chart-2/10 text-chart-2' },
    { label: 'Receita do mes', value: formatCurrency(monthRevenue), icon: CalendarDays, color: 'bg-chart-3/10 text-chart-3' },
    { label: 'Pecas em falta', value: lowStockParts.length, icon: PackageX, color: 'bg-chart-4/10 text-chart-4' },
  ], [clients, openOrders, monthRevenue, lowStockParts])

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
      confirmed: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
      in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
      completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
      cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
      no_show: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    }
    const labels: Record<string, string> = {
      scheduled: 'Agendado', confirmed: 'Confirmado', in_progress: 'Em atendimento',
      completed: 'Finalizado', cancelled: 'Cancelado', no_show: 'Faltou',
    }
    return (
      <Badge variant="secondary" className={cn('text-xs font-medium', map[status] || '')}>
        {labels[status] || status}
      </Badge>
    )
  }

  const osStatusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      open: { label: 'Aberta', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
      in_progress: { label: 'Em andamento', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
      waiting_parts: { label: 'Aguard. pecas', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
      completed: { label: 'Concluida', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
      delivered: { label: 'Entregue', cls: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' },
      cancelled: { label: 'Cancelada', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
    }
    const s = map[status] || { label: status, cls: '' }
    return <Badge variant="secondary" className={cn('text-xs font-medium', s.cls)}>{s.label}</Badge>
  }

  const recentOpenOrders = [...openOrders]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 8)

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Bem-vindo{user?.displayName ? `, ${user.displayName}` : ''} · Visao geral da oficina
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="border-border/60">
            <CardContent className="p-4 flex items-center gap-4">
              <div className={cn('flex items-center justify-center size-10 rounded-lg shrink-0', s.color)}>
                <s.icon className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Low stock alert */}
      {lowStockParts.length > 0 && (
        <Card className="border-amber-300/60 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-800/60">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-300">
              {lowStockParts.length} peca{lowStockParts.length !== 1 ? 's' : ''} com estoque baixo ou zerado.{' '}
              <Link to="/estoque" className="font-semibold underline">Ver estoque</Link>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Today's appointments */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Agendamentos de Hoje</CardTitle>
            <span className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {todayAppts.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground text-sm">
              <CalendarDays className="size-8 mx-auto mb-2 opacity-30" />
              Nenhum agendamento para hoje
            </div>
          ) : (
            <div className="divide-y divide-border">
              {todayAppts.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
                  <span className="text-sm font-mono text-primary font-medium w-12 shrink-0">{a.time}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{a.client_name}{a.vehicle_label ? ` · ${a.vehicle_label}` : ''}</p>
                    <p className="text-xs text-muted-foreground">{a.service_type}{a.mechanic_name ? ` · ${a.mechanic_name}` : ''}</p>
                  </div>
                  {statusBadge(a.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Open service orders */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ordens de Servico em Aberto</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recentOpenOrders.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground text-sm">
              <Clock className="size-8 mx-auto mb-2 opacity-30" />
              Nenhuma ordem de servico em aberto
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentOpenOrders.map((o) => (
                <Link
                  key={o.id}
                  to="/ordens-servico/$id"
                  params={{ id: o.id }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{o.client_name}{o.vehicle_label ? ` · ${o.vehicle_label}` : ''}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(Number(o.total) || 0)}</p>
                  </div>
                  {osStatusBadge(o.status)}
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
