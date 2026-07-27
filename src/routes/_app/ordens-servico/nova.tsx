import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { blink } from '@/blink/client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save, Bike } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

interface Client { id: string; name: string }
interface Vehicle { id: string; client_id: string; brand: string; model: string; plate: string | null }

export const Route = createFileRoute('/_app/ordens-servico/nova')({
  head: () => ({ meta: [{ title: 'Nova Ordem de Servico · MotoManage Pro' }] }),
  component: NewServiceOrderPage,
})

function NewServiceOrderPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    client_id: '', vehicle_id: '', mechanic_name: '', problem_description: '',
  })

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: () => blink.db.table<Client>('clients').list({ orderBy: { name: 'asc' } }),
  })

  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: () => blink.db.table<Vehicle>('vehicles').list(),
  })

  const formVehicles = vehicles.filter((v) => v.client_id === form.client_id)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.client_id) {
      toast.error('Selecione um cliente')
      return
    }
    setSaving(true)
    try {
      const client = clients.find((c) => c.id === form.client_id)
      const vehicle = vehicles.find((v) => v.id === form.vehicle_id)
      const created = await blink.db.table('service_orders').create({
        client_id: form.client_id,
        client_name: client?.name || '',
        vehicle_id: form.vehicle_id || null,
        vehicle_label: vehicle ? `${vehicle.brand} ${vehicle.model}${vehicle.plate ? ` (${vehicle.plate})` : ''}` : null,
        mechanic_name: form.mechanic_name,
        problem_description: form.problem_description,
        status: 'open',
        labor_cost: 0,
        discount: 0,
        total: 0,
      } as any)
      queryClient.invalidateQueries({ queryKey: ['serviceOrders'] })
      toast.success('Ordem de servico criada!')
      navigate({ to: '/ordens-servico/$id', params: { id: (created as any).id } })
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao criar ordem de servico')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/ordens-servico' })}>
          <ArrowLeft className="size-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Nova Ordem de Servico</h1>
          <p className="text-sm text-muted-foreground">Selecione o cliente e o veiculo para comecar</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Cliente e Veiculo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Cliente *</Label>
              <select
                className="file:text-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm"
                value={form.client_id}
                onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value, vehicle_id: '' }))}
              >
                <option value="">
                  {clients.length === 0 ? 'Nenhum cliente cadastrado' : 'Selecione um cliente'}
                </option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {clients.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  <Link to="/clientes/novo" className="text-primary hover:underline">Cadastre um cliente</Link> antes de abrir uma OS.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Veiculo</Label>
              <select
                className="file:text-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm"
                value={form.vehicle_id}
                disabled={!form.client_id}
                onChange={(e) => setForm((f) => ({ ...f, vehicle_id: e.target.value }))}
              >
                <option value="">
                  {!form.client_id ? 'Selecione um cliente primeiro' : formVehicles.length === 0 ? 'Sem veiculos cadastrados' : 'Selecione um veiculo'}
                </option>
                {formVehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.brand} {v.model}{v.plate ? ` (${v.plate})` : ''}</option>
                ))}
              </select>
              {form.client_id && formVehicles.length === 0 && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Bike className="size-3" />
                  <Link to="/clientes/$id" params={{ id: form.client_id }} className="text-primary hover:underline">
                    Cadastre um veiculo para este cliente
                  </Link>
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Detalhes do Servico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Mecanico responsavel</Label>
              <Input
                value={form.mechanic_name}
                onChange={(e) => setForm((f) => ({ ...f, mechanic_name: e.target.value }))}
                placeholder="Nome do mecanico"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Problema relatado / Servico solicitado</Label>
              <Textarea
                value={form.problem_description}
                onChange={(e) => setForm((f) => ({ ...f, problem_description: e.target.value }))}
                placeholder="Descreva o problema relatado pelo cliente ou o servico solicitado..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate({ to: '/ordens-servico' })}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? (
              <div className="size-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Criar OS
          </Button>
        </div>
      </form>
    </div>
  )
}
