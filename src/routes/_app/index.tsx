import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { blink } from '@/blink/client'
import { useAuth } from '@/hooks/useAuth'
import {
  Users, CalendarDays, TrendingUp, Stethoscope, Clock
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useMemo } from 'react'

interface Patient { id: string; name: string; status: string; created_at: string }
interface Appointment {
  id: string; patient_name: string; dentist_name: string | null
  date: string; time: string; type: string; status: string
}

export const Route = createFileRoute('/_app/')({
  head: () => ({
    meta: [
      { title: 'Dashboard · OdontoManage Pro' },
      { name: 'description', content: 'Dashboard da clinica odontologica' },
    ],
  }),
  component: Dashboard,
})

function Dashboard() {
  const { user } = useAuth()

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ['patients'],
    queryFn: () => blink.db.table<Patient>('patients').list(),
  })

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ['appointments'],
    queryFn: () => blink.db.table<Appointment>('appointments').list(),
  })

  const today = new Date().toISOString().slice(0, 10)
  const todayAppts = appointments.filter((a) => a.date === today)
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  const weekAppts = appointments.filter((a) => a.date >= weekStart.toISOString().slice(0, 10))

  const stats = useMemo(() => [
    { label: 'Pacientes', value: patients.length, icon: Users, color: 'bg-chart-1/10 text-chart-1' },
    { label: 'Hoje', value: todayAppts.length, icon: CalendarDays, color: 'bg-chart-2/10 text-chart-2' },
    { label: 'Semana', value: weekAppts.length, icon: TrendingUp, color: 'bg-chart-3/10 text-chart-3' },
    { label: 'Ativos', value: patients.filter((p) => p.status === 'active').length, icon: Stethoscope, color: 'bg-chart-4/10 text-chart-4' },
  ], [patients, todayAppts, weekAppts])

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
      scheduled: 'Agendada', confirmed: 'Confirmada', in_progress: 'Em atendimento',
      completed: 'Finalizada', cancelled: 'Cancelada', no_show: 'Faltou',
    }
    return (
      <Badge variant="secondary" className={cn('text-xs font-medium', map[status] || '')}>
        {labels[status] || status}
      </Badge>
    )
  }

  const upcoming = appointments
    .filter((a) => a.status === 'scheduled' || a.status === 'confirmed')
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 8)

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Bem-vindo{user?.displayName ? `, ${user.displayName}` : ''} · Visao geral da clinica
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

      {/* Today's appointments */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Consultas de Hoje</CardTitle>
            <span className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {todayAppts.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground text-sm">
              <CalendarDays className="size-8 mx-auto mb-2 opacity-30" />
              Nenhuma consulta agendada para hoje
            </div>
          ) : (
            <div className="divide-y divide-border">
              {todayAppts.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
                  <span className="text-sm font-mono text-primary font-medium w-12 shrink-0">{a.time}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{a.patient_name}</p>
                    <p className="text-xs text-muted-foreground">{a.type}{a.dentist_name ? ` · Dr(a). ${a.dentist_name}` : ''}</p>
                  </div>
                  {statusBadge(a.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming appointments */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Proximas Consultas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {upcoming.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground text-sm">
              <Clock className="size-8 mx-auto mb-2 opacity-30" />
              Nenhuma consulta agendada
            </div>
          ) : (
            <div className="divide-y divide-border">
              {upcoming.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
                  <div className="w-12 shrink-0 text-right">
                    <p className="text-xs font-medium text-muted-foreground">
                      {new Date(a.date + 'T00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                  <span className="text-sm font-mono text-primary font-medium w-10 shrink-0">{a.time}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{a.patient_name}</p>
                    <p className="text-xs text-muted-foreground">{a.type}</p>
                  </div>
                  {statusBadge(a.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
