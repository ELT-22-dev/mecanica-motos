import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { blink } from '@/blink/client'
import { useState, useMemo } from 'react'
import {
  CalendarDays, Plus, ChevronLeft, ChevronRight,
  MoreHorizontal, Trash2, CheckCircle, XCircle, UserX, Play, MessageCircle
} from 'lucide-react'
import { openWhatsApp, buildAppointmentReminderMessage } from '@/lib/whatsapp'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Appointment {
  id: string; client_id: string | null; client_name: string; vehicle_id: string | null
  vehicle_label: string | null; mechanic_name: string | null
  date: string; time: string; service_type: string
  notes: string | null; status: string
}

interface Client {
  id: string; name: string; phone: string | null; whatsapp: string | null
}

interface Vehicle {
  id: string; client_id: string; brand: string; model: string; plate: string | null
}

export const Route = createFileRoute('/_app/agenda')({
  head: () => ({ meta: [{ title: 'Agenda · MotoManage Pro' }] }),
  component: AgendaPage,
})

function AgendaPage() {
  const queryClient = useQueryClient()
  const today = new Date().toISOString().slice(0, 10)
  const [selectedDate, setSelectedDate] = useState(today)
  const [newApptOpen, setNewApptOpen] = useState(false)
  const [apptForm, setApptForm] = useState({
    client_id: '', client_name: '', vehicle_id: '', mechanic_name: '', time: '',
    service_type: 'Revisao', notes: '',
  })

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ['appointments'],
    queryFn: () => blink.db.table<Appointment>('appointments').list(),
  })

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: () => blink.db.table<Client>('clients').list({ orderBy: { name: 'asc' } }),
  })

  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: () => blink.db.table<Vehicle>('vehicles').list(),
  })

  const formVehicles = vehicles.filter((v) => v.client_id === apptForm.client_id)

  const dayAppts = appointments.filter((a) => a.date === selectedDate)

  const sendReminder = (a: Appointment) => {
    const client = clients.find((c) => c.id === a.client_id)
    const contact = client?.whatsapp || client?.phone
    if (!contact) {
      toast.error('Este cliente nao tem telefone ou WhatsApp cadastrado')
      return
    }
    const message = buildAppointmentReminderMessage({
      clientName: a.client_name,
      date: a.date,
      time: a.time,
      mechanicName: a.mechanic_name,
      serviceType: a.service_type,
      vehicleLabel: a.vehicle_label,
    })
    try {
      openWhatsApp(contact, message)
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao abrir WhatsApp')
    }
  }

  const weekDates = useMemo(() => {
    const d = new Date(selectedDate + 'T00:00')
    const day = d.getDay()
    const monday = new Date(d)
    monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(monday)
      date.setDate(monday.getDate() + i)
      return date.toISOString().slice(0, 10)
    })
  }, [selectedDate])

  const navigateDate = (dir: number) => {
    const d = new Date(selectedDate + 'T00:00')
    d.setDate(d.getDate() + dir * 7)
    setSelectedDate(d.toISOString().slice(0, 10))
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      await blink.db.table('appointments').update(id, { status } as any)
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      toast.success('Status atualizado')
    } catch (err: any) { toast.error(err?.message || 'Erro') }
  }

  const deleteAppt = async (id: string) => {
    if (!confirm('Excluir este agendamento?')) return
    try {
      await blink.db.table('appointments').delete(id)
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      toast.success('Agendamento removido')
    } catch (err: any) { toast.error(err?.message || 'Erro') }
  }

  const handleNewAppt = async () => {
    if (!apptForm.client_id || !apptForm.time) {
      toast.error('Cliente e horario sao obrigatorios')
      return
    }
    try {
      const vehicle = vehicles.find((v) => v.id === apptForm.vehicle_id)
      await blink.db.table<Appointment>('appointments').create({
        client_id: apptForm.client_id,
        client_name: apptForm.client_name,
        vehicle_id: apptForm.vehicle_id || null,
        vehicle_label: vehicle ? `${vehicle.brand} ${vehicle.model}${vehicle.plate ? ` (${vehicle.plate})` : ''}` : null,
        mechanic_name: apptForm.mechanic_name,
        time: apptForm.time,
        service_type: apptForm.service_type,
        notes: apptForm.notes,
        date: selectedDate,
        status: 'scheduled',
      } as any)
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      setNewApptOpen(false)
      setApptForm({ client_id: '', client_name: '', vehicle_id: '', mechanic_name: '', time: '', service_type: 'Revisao', notes: '' })
      toast.success('Agendamento criado!')
    } catch (err: any) { toast.error(err?.message || 'Erro') }
  }

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      scheduled: { label: 'Agendado', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
      confirmed: { label: 'Confirmado', cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
      in_progress: { label: 'Em atend.', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
      completed: { label: 'Finalizado', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
      cancelled: { label: 'Cancelado', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
      no_show: { label: 'Faltou', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
    }
    const s = map[status] || { label: status, cls: '' }
    return <Badge variant="secondary" className={cn('text-[10px] px-1.5', s.cls)}>{s.label}</Badge>
  }

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Agenda</h1>
          <p className="text-sm text-muted-foreground mt-1">Visualizacao semanal</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setNewApptOpen(true)}>
          <Plus className="size-4" />
          Novo Agendamento
        </Button>
      </div>

      {/* Week navigation */}
      <Card className="border-border/60">
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-3">
            <Button variant="ghost" size="icon" className="size-8" onClick={() => navigateDate(-1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm font-medium text-foreground">
              {new Date(weekDates[0] + 'T00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })} —{' '}
              {new Date(weekDates[6] + 'T00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
            </span>
            <Button variant="ghost" size="icon" className="size-8" onClick={() => navigateDate(1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {weekDates.map((date) => {
              const d = new Date(date + 'T00:00')
              const isSel = date === selectedDate
              const isToday = date === today
              const dayName = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
              const count = appointments.filter((a) => a.date === date).length
              return (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={cn(
                    'flex flex-col items-center rounded-lg py-2 text-center transition-colors cursor-pointer',
                    isSel ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                    isToday && !isSel && 'ring-1 ring-primary/40'
                  )}
                >
                  <span className="text-[10px] uppercase font-medium">{dayName}</span>
                  <span className="text-lg font-bold">{d.getDate()}</span>
                  {count > 0 && (
                    <span className={cn('text-[10px] mt-0.5', isSel ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                      {count} agend.
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Day's appointments */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {new Date(selectedDate + 'T00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {dayAppts.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              <CalendarDays className="size-10 mx-auto mb-2 opacity-30" />
              Nenhum agendamento neste dia
            </div>
          ) : (
            <div className="divide-y divide-border">
              {dayAppts.sort((a, b) => a.time.localeCompare(b.time)).map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors group">
                  <span className="text-sm font-mono text-primary font-medium w-12 shrink-0">{a.time}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {a.client_id ? (
                        <Link to="/clientes/$id" params={{ id: a.client_id }} className="hover:underline hover:text-primary">
                          {a.client_name}
                        </Link>
                      ) : a.client_name}
                      {a.vehicle_label ? ` · ${a.vehicle_label}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {a.service_type}{a.mechanic_name ? ` · ${a.mechanic_name}` : ''}
                    </p>
                  </div>
                  {statusBadge(a.status)}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="size-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => sendReminder(a)}>
                        <MessageCircle className="size-3.5 mr-2 text-emerald-600" /> Lembrete (WhatsApp)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateStatus(a.id, 'confirmed')}>
                        <CheckCircle className="size-3.5 mr-2 text-green-600" /> Confirmar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateStatus(a.id, 'in_progress')}>
                        <Play className="size-3.5 mr-2 text-amber-600" /> Em atendimento
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateStatus(a.id, 'completed')}>
                        <CheckCircle className="size-3.5 mr-2 text-emerald-600" /> Finalizar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateStatus(a.id, 'cancelled')}>
                        <XCircle className="size-3.5 mr-2 text-red-600" /> Cancelar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateStatus(a.id, 'no_show')}>
                        <UserX className="size-3.5 mr-2 text-gray-600" /> Faltou
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => deleteAppt(a.id)}>
                        <Trash2 className="size-3.5 mr-2" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* New appointment dialog */}
      <Dialog open={newApptOpen} onOpenChange={setNewApptOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Agendamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Cliente *</Label>
              <select
                className="file:text-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm"
                value={apptForm.client_id}
                onChange={(e) => {
                  const client = clients.find((c) => c.id === e.target.value)
                  setApptForm((f) => ({ ...f, client_id: e.target.value, client_name: client?.name || '', vehicle_id: '' }))
                }}
              >
                <option value="">
                  {clients.length === 0 ? 'Nenhum cliente cadastrado' : 'Selecione um cliente'}
                </option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Veiculo</Label>
              <select
                className="file:text-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm"
                value={apptForm.vehicle_id}
                disabled={!apptForm.client_id}
                onChange={(e) => setApptForm((f) => ({ ...f, vehicle_id: e.target.value }))}
              >
                <option value="">
                  {!apptForm.client_id ? 'Selecione um cliente primeiro' : formVehicles.length === 0 ? 'Sem veiculos cadastrados' : 'Selecione um veiculo'}
                </option>
                {formVehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.brand} {v.model}{v.plate ? ` (${v.plate})` : ''}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Horario *</Label>
                <Input type="time" value={apptForm.time} onChange={(e) => setApptForm((f) => ({ ...f, time: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo de servico</Label>
                <Input value={apptForm.service_type} onChange={(e) => setApptForm((f) => ({ ...f, service_type: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Mecanico</Label>
              <Input
                placeholder="Nome do mecanico"
                value={apptForm.mechanic_name}
                onChange={(e) => setApptForm((f) => ({ ...f, mechanic_name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Observacoes</Label>
              <Input value={apptForm.notes} onChange={(e) => setApptForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewApptOpen(false)}>Cancelar</Button>
            <Button onClick={handleNewAppt}>Agendar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
