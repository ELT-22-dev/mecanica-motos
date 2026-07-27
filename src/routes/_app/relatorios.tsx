import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { blink } from '@/blink/client'
import { useMemo, useState } from 'react'
import {
  BarChart3, TrendingUp, Users, Wrench, Trophy,
  Package, Calendar, Award,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { SERVICE_ORDER_STATUS_CONFIG } from '@/lib/serviceOrderStatus'

interface Transaction {
  id: string; type: string; status: string; amount: string; created_at: string
}
interface ServiceOrder {
  id: string; client_id: string | null; client_name: string
  mechanic_name: string | null; status: string; total: string; created_at: string
}
interface ServiceOrderItem {
  id: string; service_order_id: string; item_type: string
  description: string; quantity: string; total: string
}

type Period = 'this-month' | 'last-month' | 'last-3-months' | 'this-year' | 'all'

const PERIOD_LABELS: Record<Period, string> = {
  'this-month': 'Este mes',
  'last-month': 'Mes passado',
  'last-3-months': 'Ultimos 3 meses',
  'this-year': 'Este ano',
  'all': 'Tudo',
}

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const CHART_COLORS = [
  'oklch(0.63 0.19 45)', 'oklch(0.5 0.12 235)', 'oklch(0.75 0.15 85)',
  'oklch(0.4 0.02 250)', 'oklch(0.55 0.16 20)',
]

function getPeriodRange(period: Period): { start: Date; end: Date } | null {
  const now = new Date()
  switch (period) {
    case 'this-month':
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now }
    case 'last-month': {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      return { start: prev, end: new Date(now.getFullYear(), now.getMonth(), 0) }
    }
    case 'last-3-months':
      return { start: new Date(now.getFullYear(), now.getMonth() - 3, 1), end: now }
    case 'this-year':
      return { start: new Date(now.getFullYear(), 0, 1), end: now }
    case 'all':
      return null
  }
}

export const Route = createFileRoute('/_app/relatorios')({
  head: () => ({
    meta: [
      { title: 'Relatorios · MotoManage Pro' },
      { name: 'description', content: 'Relatorios gerenciais de vendas e desempenho da oficina' },
    ],
  }),
  component: RelatoriosPage,
})

function RelatoriosPage() {
  const [period, setPeriod] = useState<Period>('this-month')

  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ['transactions'],
    queryFn: () => blink.db.table<Transaction>('transactions').list(),
  })

  const { data: serviceOrders = [] } = useQuery<ServiceOrder[]>({
    queryKey: ['serviceOrders'],
    queryFn: () => blink.db.table<ServiceOrder>('service_orders').list(),
  })

  const { data: items = [] } = useQuery<ServiceOrderItem[]>({
    queryKey: ['serviceOrderItemsAll'],
    queryFn: () => blink.db.table<ServiceOrderItem>('service_order_items').list(),
  })

  const range = useMemo(() => getPeriodRange(period), [period])
  const inRange = <T extends { created_at: string }>(list: T[]) => {
    if (!range) return list
    return list.filter((t) => {
      const d = new Date(t.created_at)
      return !isNaN(d.getTime()) && d >= range.start && d <= range.end
    })
  }

  const ordersInRange = useMemo(() => inRange(serviceOrders), [serviceOrders, range])
  const transactionsInRange = useMemo(() => inRange(transactions), [transactions, range])

  const orderIdsInRange = useMemo(() => new Set(ordersInRange.map((o) => o.id)), [ordersInRange])
  const itemsInRange = useMemo(() => items.filter((it) => orderIdsInRange.has(it.service_order_id)), [items, orderIdsInRange])

  const kpis = useMemo(() => {
    const revenue = transactionsInRange
      .filter((t) => t.type === 'income' && t.status === 'paid')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
    const completedOrders = ordersInRange.filter((o) => o.status === 'completed' || o.status === 'delivered')
    const ticketMedio = completedOrders.length > 0
      ? completedOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0) / completedOrders.length
      : 0
    const uniqueClients = new Set(ordersInRange.map((o) => o.client_id).filter(Boolean)).size
    return { revenue, completedCount: completedOrders.length, ticketMedio, uniqueClients }
  }, [transactionsInRange, ordersInRange])

  const monthlyRevenue = useMemo(() => {
    const now = new Date()
    const months: { month: string; faturamento: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({ month: MONTH_NAMES[d.getMonth()], faturamento: 0 })
    }
    for (const t of transactions) {
      if (t.type !== 'income' || t.status !== 'paid') continue
      const d = new Date(t.created_at)
      if (isNaN(d.getTime())) continue
      const idx = months.findIndex((m) => m.month === MONTH_NAMES[d.getMonth()])
      if (idx === -1) continue
      months[idx].faturamento += Number(t.amount) || 0
    }
    return months
  }, [transactions])

  const topClients = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number }>()
    for (const o of ordersInRange) {
      const key = o.client_id || o.client_name
      const entry = map.get(key) || { name: o.client_name, total: 0, count: 0 }
      entry.total += Number(o.total) || 0
      entry.count += 1
      map.set(key, entry)
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 5)
  }, [ordersInRange])

  const mechanicPerformance = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number }>()
    for (const o of ordersInRange) {
      const key = o.mechanic_name || 'Sem mecanico'
      const entry = map.get(key) || { name: key, total: 0, count: 0 }
      entry.total += Number(o.total) || 0
      entry.count += 1
      map.set(key, entry)
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [ordersInRange])

  const topParts = useMemo(() => {
    const map = new Map<string, { name: string; quantity: number; total: number }>()
    for (const it of itemsInRange) {
      if (it.item_type !== 'part') continue
      const entry = map.get(it.description) || { name: it.description, quantity: 0, total: 0 }
      entry.quantity += Number(it.quantity) || 0
      entry.total += Number(it.total) || 0
      map.set(it.description, entry)
    }
    return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 5)
  }, [itemsInRange])

  const statusBreakdown = useMemo(() => {
    const map = new Map<string, number>()
    for (const o of ordersInRange) map.set(o.status, (map.get(o.status) || 0) + 1)
    return Array.from(map.entries())
      .map(([status, value]) => ({ name: SERVICE_ORDER_STATUS_CONFIG[status]?.label || status, value }))
      .sort((a, b) => b.value - a.value)
  }, [ordersInRange])

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Relatorios</h1>
        <p className="text-sm text-muted-foreground mt-1">Vendas e desempenho da oficina</p>
      </div>

      {/* Period filter */}
      <div className="flex flex-wrap items-center gap-2">
        <Calendar className="size-4 text-muted-foreground shrink-0" />
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer border',
              period === p
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-background text-muted-foreground border-border hover:text-foreground hover:border-primary/40'
            )}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 shrink-0">
              <TrendingUp className="size-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{formatCurrency(kpis.revenue)}</p>
              <p className="text-xs text-muted-foreground">Faturamento recebido</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex items-center justify-center size-10 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 shrink-0">
              <Wrench className="size-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{kpis.completedCount}</p>
              <p className="text-xs text-muted-foreground">OS concluidas/entregues</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex items-center justify-center size-10 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 shrink-0">
              <Award className="size-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{formatCurrency(kpis.ticketMedio)}</p>
              <p className="text-xs text-muted-foreground">Ticket medio</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex items-center justify-center size-10 rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 shrink-0">
              <Users className="size-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{kpis.uniqueClients}</p>
              <p className="text-xs text-muted-foreground">Clientes atendidos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="size-4" /> Faturamento mensal (ultimos 6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyRevenue.every((m) => m.faturamento === 0) ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BarChart3 className="size-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Sem dados no periodo</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyRevenue} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-popover)' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Bar dataKey="faturamento" name="Faturamento" fill="oklch(0.63 0.19 45)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wrench className="size-4" /> Ordens de servico por status (periodo)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusBreakdown.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Wrench className="size-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma OS no periodo</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={statusBreakdown} cx="50%" cy="50%"
                    innerRadius={60} outerRadius={100} paddingAngle={2}
                    dataKey="value" nameKey="name"
                  >
                    {statusBreakdown.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-popover)' }}
                  />
                  <Legend formatter={(value: string) => <span className="text-xs text-foreground">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rankings */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Trophy className="size-4" /> Clientes que mais gastam
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {topClients.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Sem dados no periodo</p>
            ) : (
              <div className="divide-y divide-border">
                {topClients.map((c, i) => (
                  <div key={c.name + i} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.count} OS</p>
                    </div>
                    <p className="text-sm font-semibold shrink-0">{formatCurrency(c.total)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="size-4" /> Desempenho por mecanico
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {mechanicPerformance.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Sem dados no periodo</p>
            ) : (
              <div className="divide-y divide-border">
                {mechanicPerformance.map((m, i) => (
                  <div key={m.name + i} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.count} OS</p>
                    </div>
                    <p className="text-sm font-semibold shrink-0">{formatCurrency(m.total)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="size-4" /> Pecas mais usadas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {topParts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Sem dados no periodo</p>
            ) : (
              <div className="divide-y divide-border">
                {topParts.map((p, i) => (
                  <div key={p.name + i} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.quantity} un.</p>
                    </div>
                    <p className="text-sm font-semibold shrink-0">{formatCurrency(p.total)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Para o extrato completo de transacoes, veja <Link to="/financeiro" className="text-primary hover:underline">Financeiro</Link>.
      </p>
    </div>
  )
}
