import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { blink } from '@/blink/client'
import { useEffect, useState } from 'react'
import {
  ArrowLeft, Edit, Trash2, Phone, Mail, MapPin,
  ChevronRight, MessageCircle, Bike, Plus, MoreHorizontal, Wrench
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { openWhatsApp, buildGreetingMessage } from '@/lib/whatsapp'

interface Client {
  id: string; name: string; cpf_cnpj: string | null
  phone: string | null; whatsapp: string | null
  email: string | null; address: string | null; city: string | null
  state: string | null; zip: string | null; notes: string | null
  status: string; created_at: string
}

interface Vehicle {
  id: string; client_id: string; client_name: string
  brand: string; model: string; year: string | null; plate: string | null
  color: string | null; chassis: string | null; mileage: number | null
  notes: string | null; created_at: string
}

interface ServiceOrder {
  id: string; client_id: string; vehicle_id: string | null; vehicle_label: string | null
  status: string; total: string; created_at: string
}

const blankVehicleForm = {
  brand: '', model: '', year: '', plate: '', color: '', chassis: '', mileage: '', notes: '',
}

export const Route = createFileRoute('/_app/clientes/$id')({
  head: () => ({ meta: [{ title: 'Cliente · MotoManage Pro' }] }),
  component: ClientDetailPage,
})

function ClientDetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [vehicleForm, setVehicleForm] = useState({ ...blankVehicleForm })
  const [savingVehicle, setSavingVehicle] = useState(false)

  const { data: client, isLoading } = useQuery<Client | null>({
    queryKey: ['clients', id],
    queryFn: () => blink.db.table<Client>('clients').get(id),
  })

  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ['vehicles', id],
    queryFn: () => blink.db.table<Vehicle>('vehicles').list(),
    enabled: !!client,
  })
  const clientVehicles = vehicles.filter((v) => v.client_id === id)

  const { data: serviceOrders = [] } = useQuery<ServiceOrder[]>({
    queryKey: ['serviceOrders', id],
    queryFn: () => blink.db.table<ServiceOrder>('service_orders').list(),
    enabled: !!client,
  })
  const clientOrders = serviceOrders
    .filter((o) => o.client_id === id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))

  useEffect(() => {
    if (editingVehicle && vehicleDialogOpen) {
      setVehicleForm({
        brand: editingVehicle.brand, model: editingVehicle.model,
        year: editingVehicle.year || '', plate: editingVehicle.plate || '',
        color: editingVehicle.color || '', chassis: editingVehicle.chassis || '',
        mileage: editingVehicle.mileage != null ? String(editingVehicle.mileage) : '',
        notes: editingVehicle.notes || '',
      })
    }
  }, [editingVehicle, vehicleDialogOpen])

  const handleVehicleDialogClose = (open: boolean) => {
    setVehicleDialogOpen(open)
    if (!open) {
      setEditingVehicle(null)
      setVehicleForm({ ...blankVehicleForm })
    }
  }

  const handleSaveVehicle = async () => {
    if (!client) return
    if (!vehicleForm.brand.trim() || !vehicleForm.model.trim()) {
      toast.error('Marca e modelo sao obrigatorios')
      return
    }
    setSavingVehicle(true)
    try {
      const payload = {
        ...vehicleForm,
        mileage: vehicleForm.mileage ? Number(vehicleForm.mileage) : null,
        client_id: client.id,
        client_name: client.name,
      }
      if (editingVehicle) {
        await blink.db.table('vehicles').update(editingVehicle.id, payload as any)
        toast.success('Veiculo atualizado')
      } else {
        await blink.db.table('vehicles').create(payload as any)
        toast.success('Veiculo cadastrado')
      }
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      handleVehicleDialogClose(false)
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar veiculo')
    } finally {
      setSavingVehicle(false)
    }
  }

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!confirm('Excluir este veiculo?')) return
    try {
      await blink.db.table('vehicles').delete(vehicleId)
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      toast.success('Veiculo removido')
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao excluir veiculo')
    }
  }

  const handleWhatsApp = () => {
    if (!client) return
    const contact = client.whatsapp || client.phone
    if (!contact) {
      toast.error('Este cliente nao tem telefone ou WhatsApp cadastrado')
      return
    }
    try {
      openWhatsApp(contact, buildGreetingMessage(client.name))
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao abrir WhatsApp')
    }
  }

  const handleDeleteClient = async () => {
    if (!client) return
    if (!confirm(`Excluir cliente "${client.name}"?`)) return
    try {
      await blink.db.table('clients').delete(client.id)
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      toast.success('Cliente excluido')
      navigate({ to: '/clientes' })
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao excluir')
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="p-4 md:p-6 text-center">
        <p className="text-muted-foreground">Cliente nao encontrado</p>
        <Link to="/clientes" className="text-primary text-sm hover:underline mt-2 inline-block">
          Voltar para clientes
        </Link>
      </div>
    )
  }

  const statusBadge = (s: string) => (
    <Badge variant="secondary" className={cn(
      'text-xs',
      s === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
    )}>
      {s === 'active' ? 'Ativo' : 'Inativo'}
    </Badge>
  )

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
    return <Badge variant="secondary" className={cn('text-xs', s.cls)}>{s.label}</Badge>
  }

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/clientes' })}>
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-11 rounded-full bg-primary/10 text-primary shrink-0">
                <span className="text-sm font-bold">
                  {client.name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">{client.name}</h1>
                <div className="flex gap-2 mt-0.5">{statusBadge(client.status)}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {(client.whatsapp || client.phone) && (
            <Button variant="outline" size="sm" className="gap-2" onClick={handleWhatsApp}>
              <MessageCircle className="size-4" />
              WhatsApp
            </Button>
          )}
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive gap-2" onClick={handleDeleteClient}>
            <Trash2 className="size-4" />
            Excluir
          </Button>
        </div>
      </div>

      <Tabs defaultValue="info" className="w-full">
        <TabsList>
          <TabsTrigger value="info">Informacoes</TabsTrigger>
          <TabsTrigger value="vehicles">Veiculos ({clientVehicles.length})</TabsTrigger>
          <TabsTrigger value="orders">Ordens de Servico ({clientOrders.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-6 mt-4">
          {/* Contact info */}
          <div className="grid gap-4 sm:grid-cols-3">
            {client.phone && (
              <Card className="border-border/60">
                <CardContent className="p-3 flex items-center gap-3">
                  <Phone className="size-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0"><p className="text-xs text-muted-foreground">Telefone</p><p className="text-sm font-medium truncate">{client.phone}</p></div>
                </CardContent>
              </Card>
            )}
            {client.whatsapp && (
              <Card className="border-border/60">
                <CardContent className="p-3 flex items-center gap-3">
                  <Phone className="size-4 text-green-500 shrink-0" />
                  <div className="min-w-0"><p className="text-xs text-muted-foreground">WhatsApp</p><p className="text-sm font-medium truncate">{client.whatsapp}</p></div>
                </CardContent>
              </Card>
            )}
            {client.email && (
              <Card className="border-border/60">
                <CardContent className="p-3 flex items-center gap-3">
                  <Mail className="size-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0"><p className="text-xs text-muted-foreground">Email</p><p className="text-sm font-medium truncate">{client.email}</p></div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Personal data */}
          {client.cpf_cnpj && (
            <Card className="border-border/60">
              <CardHeader className="pb-3"><CardTitle className="text-base">Dados</CardTitle></CardHeader>
              <CardContent className="text-sm">
                <span className="text-muted-foreground">CPF/CNPJ:</span> <span className="font-medium">{client.cpf_cnpj}</span>
              </CardContent>
            </Card>
          )}

          {/* Address */}
          {(client.address || client.city) && (
            <Card className="border-border/60">
              <CardHeader className="pb-3"><CardTitle className="text-base">Endereco</CardTitle></CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
                {client.address && <div className="sm:col-span-2"><span className="text-muted-foreground">Endereco:</span> <span className="font-medium">{client.address}</span></div>}
                {client.city && <div><span className="text-muted-foreground">Cidade:</span> <span className="font-medium">{client.city}</span></div>}
                {client.state && <div><span className="text-muted-foreground">Estado:</span> <span className="font-medium">{client.state}</span></div>}
                {client.zip && <div><span className="text-muted-foreground">CEP:</span> <span className="font-medium">{client.zip}</span></div>}
              </CardContent>
            </Card>
          )}

          {client.notes && (
            <Card className="border-border/60">
              <CardHeader className="pb-3"><CardTitle className="text-base">Observacoes</CardTitle></CardHeader>
              <CardContent className="text-sm"><p className="font-medium">{client.notes}</p></CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="vehicles" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" className="gap-2" onClick={() => setVehicleDialogOpen(true)}>
              <Plus className="size-4" /> Novo Veiculo
            </Button>
          </div>
          {clientVehicles.length === 0 ? (
            <Card className="border-border/60 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Bike className="size-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Nenhum veiculo cadastrado</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {clientVehicles.map((v) => (
                <Card key={v.id} className="border-border/60">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="flex items-center justify-center size-10 rounded-lg bg-primary/10 text-primary shrink-0">
                      <Bike className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{v.brand} {v.model}{v.year ? ` (${v.year})` : ''}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
                        {v.plate && <span>Placa: {v.plate}</span>}
                        {v.color && <span>{v.color}</span>}
                        {v.mileage != null && <span>{v.mileage.toLocaleString('pt-BR')} km</span>}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditingVehicle(v); setVehicleDialogOpen(true) }}>
                          <Edit className="size-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteVehicle(v.id)}>
                          <Trash2 className="size-4 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="orders" className="mt-4">
          {clientOrders.length === 0 ? (
            <Card className="border-border/60 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Wrench className="size-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Nenhuma ordem de servico registrada</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {clientOrders.map((o) => (
                <Link key={o.id} to="/ordens-servico/$id" params={{ id: o.id }} className="block">
                  <Card className="border-border/60 hover:border-border hover:shadow-sm transition-all cursor-pointer">
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{o.vehicle_label || 'Sem veiculo'}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(o.created_at).toLocaleDateString('pt-BR')} · {formatCurrency(Number(o.total) || 0)}
                        </p>
                      </div>
                      {osStatusBadge(o.status)}
                      <ChevronRight className="size-4 text-muted-foreground/30" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Vehicle create/edit dialog */}
      <Dialog open={vehicleDialogOpen} onOpenChange={handleVehicleDialogClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingVehicle ? 'Editar Veiculo' : 'Novo Veiculo'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Marca *</Label>
              <Input value={vehicleForm.brand} onChange={(e) => setVehicleForm((f) => ({ ...f, brand: e.target.value }))} placeholder="Honda, Yamaha..." />
            </div>
            <div className="space-y-1.5">
              <Label>Modelo *</Label>
              <Input value={vehicleForm.model} onChange={(e) => setVehicleForm((f) => ({ ...f, model: e.target.value }))} placeholder="CG 160, Fazer 250..." />
            </div>
            <div className="space-y-1.5">
              <Label>Ano</Label>
              <Input value={vehicleForm.year} onChange={(e) => setVehicleForm((f) => ({ ...f, year: e.target.value }))} placeholder="2022" />
            </div>
            <div className="space-y-1.5">
              <Label>Placa</Label>
              <Input value={vehicleForm.plate} onChange={(e) => setVehicleForm((f) => ({ ...f, plate: e.target.value.toUpperCase() }))} placeholder="ABC1D23" />
            </div>
            <div className="space-y-1.5">
              <Label>Cor</Label>
              <Input value={vehicleForm.color} onChange={(e) => setVehicleForm((f) => ({ ...f, color: e.target.value }))} placeholder="Preta" />
            </div>
            <div className="space-y-1.5">
              <Label>Quilometragem</Label>
              <Input type="number" value={vehicleForm.mileage} onChange={(e) => setVehicleForm((f) => ({ ...f, mileage: e.target.value }))} placeholder="15000" />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Chassi</Label>
              <Input value={vehicleForm.chassis} onChange={(e) => setVehicleForm((f) => ({ ...f, chassis: e.target.value }))} placeholder="Numero do chassi" />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Observacoes</Label>
              <Input value={vehicleForm.notes} onChange={(e) => setVehicleForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Observacoes sobre o veiculo" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleVehicleDialogClose(false)}>Cancelar</Button>
            <Button onClick={handleSaveVehicle} disabled={savingVehicle}>
              {savingVehicle ? 'Salvando...' : editingVehicle ? 'Atualizar' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
