import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { blink } from '@/blink/client'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft, Trash2, Plus, Printer, Wrench, Package,
  MessageCircle, Receipt, ChevronDown, CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { openWhatsApp, buildServiceOrderReadyMessage } from '@/lib/whatsapp'
import { SERVICE_ORDER_STATUS_CONFIG, SERVICE_ORDER_STATUS_ORDER } from '@/lib/serviceOrderStatus'

interface ServiceOrder {
  id: string; client_id: string | null; client_name: string
  vehicle_id: string | null; vehicle_label: string | null
  mechanic_name: string | null; status: string
  problem_description: string | null; diagnosis: string | null; notes: string | null
  labor_cost: string; discount: string; total: string
  opened_at: string; completed_at: string | null; created_at: string
}

interface ServiceOrderItem {
  id: string; service_order_id: string; part_id: string | null
  item_type: string; description: string; quantity: string; unit_price: string; total: string
}

interface Part { id: string; name: string; unit_price: string; quantity: number; sku: string | null }
interface Client { id: string; phone: string | null; whatsapp: string | null }
interface Transaction { id: string; service_order_id: string | null }

const blankItemForm = { item_type: 'part', part_id: '', description: '', quantity: '1', unit_price: '' }

export const Route = createFileRoute('/_app/ordens-servico/$id')({
  head: () => ({ meta: [{ title: 'Ordem de Servico · MotoManage Pro' }] }),
  component: ServiceOrderDetailPage,
})

function ServiceOrderDetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [headerForm, setHeaderForm] = useState({
    mechanic_name: '', problem_description: '', diagnosis: '', notes: '',
    labor_cost: '0', discount: '0',
  })
  const [savingHeader, setSavingHeader] = useState(false)
  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [itemForm, setItemForm] = useState({ ...blankItemForm })
  const [savingItem, setSavingItem] = useState(false)

  const { data: order, isLoading } = useQuery<ServiceOrder | null>({
    queryKey: ['serviceOrders', id],
    queryFn: () => blink.db.table<ServiceOrder>('service_orders').get(id),
  })

  const { data: items = [] } = useQuery<ServiceOrderItem[]>({
    queryKey: ['serviceOrderItems', id],
    queryFn: () => blink.db.table<ServiceOrderItem>('service_order_items').list(),
    enabled: !!order,
  })
  const orderItems = items.filter((it) => it.service_order_id === id)

  const { data: parts = [] } = useQuery<Part[]>({
    queryKey: ['parts'],
    queryFn: () => blink.db.table<Part>('parts').list({ orderBy: { name: 'asc' } }),
  })

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: () => blink.db.table<Client>('clients').list(),
    enabled: !!order,
  })

  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ['transactions'],
    queryFn: () => blink.db.table<Transaction>('transactions').list(),
    enabled: !!order,
  })
  const alreadyInvoiced = transactions.some((t) => t.service_order_id === id)

  useEffect(() => {
    if (order) {
      setHeaderForm({
        mechanic_name: order.mechanic_name || '',
        problem_description: order.problem_description || '',
        diagnosis: order.diagnosis || '',
        notes: order.notes || '',
        labor_cost: String(order.labor_cost ?? '0'),
        discount: String(order.discount ?? '0'),
      })
    }
  }, [order])

  const itemsTotal = useMemo(
    () => orderItems.reduce((sum, it) => sum + (Number(it.total) || 0), 0),
    [orderItems]
  )

  const recalcTotal = async (laborCost: number, discount: number, itemsSum: number) => {
    const total = Math.max(0, laborCost + itemsSum - discount)
    await blink.db.table('service_orders').update(id, { total } as any)
    queryClient.invalidateQueries({ queryKey: ['serviceOrders'] })
  }

  const handleSaveHeader = async () => {
    setSavingHeader(true)
    try {
      const laborCost = Number(headerForm.labor_cost) || 0
      const discount = Number(headerForm.discount) || 0
      await blink.db.table('service_orders').update(id, {
        mechanic_name: headerForm.mechanic_name,
        problem_description: headerForm.problem_description,
        diagnosis: headerForm.diagnosis,
        notes: headerForm.notes,
        labor_cost: laborCost,
        discount,
      } as any)
      await recalcTotal(laborCost, discount, itemsTotal)
      toast.success('Ordem de servico atualizada')
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar')
    } finally {
      setSavingHeader(false)
    }
  }

  const updateStatus = async (status: string) => {
    try {
      const payload: Record<string, unknown> = { status }
      if (status === 'completed' || status === 'delivered') payload.completed_at = new Date().toISOString()
      await blink.db.table('service_orders').update(id, payload as any)
      queryClient.invalidateQueries({ queryKey: ['serviceOrders'] })
      toast.success('Status atualizado')
    } catch (err: any) {
      toast.error(err?.message || 'Erro')
    }
  }

  const handleDeleteOrder = async () => {
    if (!order) return
    if (!confirm('Excluir esta ordem de servico? Os itens associados tambem serao removidos.')) return
    try {
      await blink.db.table('service_orders').delete(order.id)
      queryClient.invalidateQueries({ queryKey: ['serviceOrders'] })
      toast.success('Ordem de servico excluida')
      navigate({ to: '/ordens-servico' })
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao excluir')
    }
  }

  const selectedPart = parts.find((p) => p.id === itemForm.part_id)

  const handleSaveItem = async () => {
    const quantity = Number(itemForm.quantity) || 0
    const unitPrice = Number(itemForm.unit_price) || 0
    if (quantity <= 0) {
      toast.error('Quantidade deve ser maior que zero')
      return
    }
    if (itemForm.item_type === 'part' && !itemForm.part_id) {
      toast.error('Selecione uma peca')
      return
    }
    if (itemForm.item_type === 'labor' && !itemForm.description.trim()) {
      toast.error('Descreva o servico de mao de obra')
      return
    }
    setSavingItem(true)
    try {
      const total = quantity * unitPrice
      const description = itemForm.item_type === 'part'
        ? (selectedPart ? `${selectedPart.name}${selectedPart.sku ? ` (${selectedPart.sku})` : ''}` : itemForm.description)
        : itemForm.description

      await blink.db.table('service_order_items').create({
        service_order_id: id,
        part_id: itemForm.item_type === 'part' ? itemForm.part_id : null,
        item_type: itemForm.item_type,
        description,
        quantity,
        unit_price: unitPrice,
        total,
      } as any)

      if (itemForm.item_type === 'part' && selectedPart) {
        const newQty = selectedPart.quantity - quantity
        await blink.db.table('parts').update(selectedPart.id, { quantity: newQty } as any)
        if (newQty < 0) toast.warning(`Estoque de "${selectedPart.name}" ficou negativo`)
        queryClient.invalidateQueries({ queryKey: ['parts'] })
      }

      queryClient.invalidateQueries({ queryKey: ['serviceOrderItems', id] })
      await recalcTotal(Number(headerForm.labor_cost) || 0, Number(headerForm.discount) || 0, itemsTotal + total)
      toast.success('Item adicionado')
      setItemDialogOpen(false)
      setItemForm({ ...blankItemForm })
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao adicionar item')
    } finally {
      setSavingItem(false)
    }
  }

  const handleDeleteItem = async (item: ServiceOrderItem) => {
    if (!confirm('Remover este item da OS?')) return
    try {
      await blink.db.table('service_order_items').delete(item.id)
      if (item.item_type === 'part' && item.part_id) {
        const part = parts.find((p) => p.id === item.part_id)
        if (part) {
          await blink.db.table('parts').update(part.id, { quantity: part.quantity + Number(item.quantity) } as any)
          queryClient.invalidateQueries({ queryKey: ['parts'] })
        }
      }
      queryClient.invalidateQueries({ queryKey: ['serviceOrderItems', id] })
      await recalcTotal(
        Number(headerForm.labor_cost) || 0,
        Number(headerForm.discount) || 0,
        itemsTotal - (Number(item.total) || 0)
      )
      toast.success('Item removido')
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao remover item')
    }
  }

  const handleGenerateInvoice = async () => {
    if (!order) return
    try {
      await blink.db.table('transactions').create({
        client_id: order.client_id,
        client_name: order.client_name,
        service_order_id: order.id,
        type: 'income',
        category: 'Ordem de Servico',
        description: `OS · ${order.vehicle_label || order.client_name}`,
        amount: Number(order.total) || 0,
        payment_method: 'a definir',
        status: 'pending',
        paid_date: null,
      } as any)
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      toast.success('Lancado no financeiro')
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao lancar no financeiro')
    }
  }

  const handleWhatsApp = () => {
    if (!order) return
    const client = clients.find((c) => c.id === order.client_id)
    const contact = client?.whatsapp || client?.phone
    if (!contact) {
      toast.error('Este cliente nao tem telefone ou WhatsApp cadastrado')
      return
    }
    try {
      openWhatsApp(contact, buildServiceOrderReadyMessage({
        clientName: order.client_name,
        vehicleLabel: order.vehicle_label,
        total: Number(order.total) || 0,
      }))
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao abrir WhatsApp')
    }
  }

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="p-4 md:p-6 text-center">
        <p className="text-muted-foreground">Ordem de servico nao encontrada</p>
        <Link to="/ordens-servico" className="text-primary text-sm hover:underline mt-2 inline-block">
          Voltar para ordens de servico
        </Link>
      </div>
    )
  }

  const statusInfo = SERVICE_ORDER_STATUS_CONFIG[order.status] || { label: order.status, cls: '' }

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 print:hidden">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/ordens-servico' })}>
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {order.client_id ? (
                  <Link to="/clientes/$id" params={{ id: order.client_id }} className="hover:underline hover:text-primary">
                    {order.client_name}
                  </Link>
                ) : order.client_name}
              </h1>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button>
                    <Badge variant="secondary" className={cn('text-xs cursor-pointer gap-1', statusInfo.cls)}>
                      {statusInfo.label} <ChevronDown className="size-3" />
                    </Badge>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {SERVICE_ORDER_STATUS_ORDER.map((s) => (
                    <DropdownMenuItem key={s} onClick={() => updateStatus(s)}>
                      {SERVICE_ORDER_STATUS_CONFIG[s].label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {order.vehicle_label || 'Sem veiculo vinculado'} · Aberta em {new Date(order.created_at).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleWhatsApp}>
            <MessageCircle className="size-4" /> WhatsApp
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
            <Printer className="size-4" /> Imprimir
          </Button>
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive gap-2" onClick={handleDeleteOrder}>
            <Trash2 className="size-4" /> Excluir
          </Button>
        </div>
      </div>

      {/* Print-only header */}
      <div className="hidden print:block">
        <h1 className="text-xl font-bold">Ordem de Servico · {order.client_name}</h1>
        <p className="text-sm">{order.vehicle_label || ''}</p>
        <p className="text-sm">Status: {statusInfo.label} · {new Date(order.created_at).toLocaleDateString('pt-BR')}</p>
      </div>

      {/* Problem / diagnosis / notes */}
      <Card className="border-border/60 print:border print:shadow-none">
        <CardHeader className="pb-4 print:hidden">
          <CardTitle className="text-base">Detalhes do Servico</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5 print:hidden">
            <Label>Mecanico responsavel</Label>
            <Input
              value={headerForm.mechanic_name}
              onChange={(e) => setHeaderForm((f) => ({ ...f, mechanic_name: e.target.value }))}
              placeholder="Nome do mecanico"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="print:hidden">Problema relatado / Servico solicitado</Label>
            <Textarea
              className="print:hidden"
              value={headerForm.problem_description}
              onChange={(e) => setHeaderForm((f) => ({ ...f, problem_description: e.target.value }))}
              rows={3}
            />
            <p className="hidden print:block text-sm"><strong>Problema relatado:</strong> {headerForm.problem_description || '-'}</p>
          </div>
          <div className="space-y-1.5">
            <Label className="print:hidden">Diagnostico</Label>
            <Textarea
              className="print:hidden"
              value={headerForm.diagnosis}
              onChange={(e) => setHeaderForm((f) => ({ ...f, diagnosis: e.target.value }))}
              rows={2}
            />
            <p className="hidden print:block text-sm"><strong>Diagnostico:</strong> {headerForm.diagnosis || '-'}</p>
          </div>
          <div className="space-y-1.5">
            <Label className="print:hidden">Observacoes</Label>
            <Textarea
              className="print:hidden"
              value={headerForm.notes}
              onChange={(e) => setHeaderForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
            />
            <p className="hidden print:block text-sm"><strong>Observacoes:</strong> {headerForm.notes || '-'}</p>
          </div>
          <div className="flex justify-end print:hidden">
            <Button size="sm" onClick={handleSaveHeader} disabled={savingHeader}>
              {savingHeader ? 'Salvando...' : 'Salvar alteracoes'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card className="border-border/60 print:border print:shadow-none">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Pecas e Mao de Obra</CardTitle>
          <Button size="sm" variant="outline" className="gap-2 print:hidden" onClick={() => setItemDialogOpen(true)}>
            <Plus className="size-4" /> Adicionar Item
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {orderItems.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground text-sm">
              <Wrench className="size-8 mx-auto mb-2 opacity-30" />
              Nenhum item adicionado ainda
            </div>
          ) : (
            <div className="divide-y divide-border">
              {orderItems.map((it) => (
                <div key={it.id} className="flex items-center gap-3 px-4 py-3 group">
                  <div className={cn(
                    'flex items-center justify-center size-8 rounded-md shrink-0',
                    it.item_type === 'part'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                      : 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
                  )}>
                    {it.item_type === 'part' ? <Package className="size-4" /> : <Wrench className="size-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{it.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {Number(it.quantity)} x {formatCurrency(Number(it.unit_price))}
                    </p>
                  </div>
                  <p className="text-sm font-semibold shrink-0">{formatCurrency(Number(it.total))}</p>
                  <Button
                    variant="ghost" size="icon"
                    className="size-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-muted-foreground hover:text-destructive print:hidden"
                    onClick={() => handleDeleteItem(it)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className="border-t border-border px-4 py-3 space-y-1">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Pecas + mao de obra (itens)</span>
              <span>{formatCurrency(itemsTotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Mao de obra adicional</span>
              <span>{formatCurrency(Number(headerForm.labor_cost) || 0)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Desconto</span>
              <span>- {formatCurrency(Number(headerForm.discount) || 0)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-foreground pt-1 border-t border-border/60">
              <span>Total</span>
              <span>{formatCurrency(Number(order.total) || 0)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Extra labor cost / discount editors */}
      <Card className="border-border/60 print:hidden">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Mao de Obra Adicional e Desconto</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Mao de obra adicional (R$)</Label>
            <Input
              type="number" step="0.01"
              value={headerForm.labor_cost}
              onChange={(e) => setHeaderForm((f) => ({ ...f, labor_cost: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Desconto (R$)</Label>
            <Input
              type="number" step="0.01"
              value={headerForm.discount}
              onChange={(e) => setHeaderForm((f) => ({ ...f, discount: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button size="sm" onClick={handleSaveHeader} disabled={savingHeader}>
              {savingHeader ? 'Salvando...' : 'Salvar e recalcular total'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invoice / financeiro */}
      <Card className="border-border/60 print:hidden">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Receipt className="size-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-medium">Lancamento no financeiro</p>
              <p className="text-xs text-muted-foreground">
                {alreadyInvoiced ? 'Ja lancado no financeiro' : 'Gera uma cobranca pendente no financeiro com o valor total desta OS'}
              </p>
            </div>
          </div>
          {alreadyInvoiced ? (
            <Badge variant="secondary" className="gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              <CheckCircle2 className="size-3.5" /> Lancado
            </Badge>
          ) : (
            <Button size="sm" variant="outline" onClick={handleGenerateInvoice}>
              Lancar no financeiro
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Add item dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={(open) => { setItemDialogOpen(open); if (!open) setItemForm({ ...blankItemForm }) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              {(['part', 'labor'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setItemForm((f) => ({ ...blankItemForm, item_type: t }))}
                  className={cn(
                    'flex-1 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer',
                    itemForm.item_type === t
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {t === 'part' ? 'Peca (estoque)' : 'Mao de obra'}
                </button>
              ))}
            </div>

            {itemForm.item_type === 'part' ? (
              <div className="space-y-1.5">
                <Label>Peca *</Label>
                <select
                  className="file:text-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm"
                  value={itemForm.part_id}
                  onChange={(e) => {
                    const part = parts.find((p) => p.id === e.target.value)
                    setItemForm((f) => ({ ...f, part_id: e.target.value, unit_price: part ? String(part.unit_price) : f.unit_price }))
                  }}
                >
                  <option value="">{parts.length === 0 ? 'Nenhuma peca cadastrada' : 'Selecione uma peca'}</option>
                  {parts.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} (estoque: {p.quantity})</option>
                  ))}
                </select>
                {parts.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    <Link to="/estoque" className="text-primary hover:underline">Cadastre pecas no estoque</Link> primeiro.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Descricao *</Label>
                <Input
                  value={itemForm.description}
                  onChange={(e) => setItemForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Ex: Troca de oleo, revisao geral..."
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Quantidade</Label>
                <Input
                  type="number" step="1" min="1"
                  value={itemForm.quantity}
                  onChange={(e) => setItemForm((f) => ({ ...f, quantity: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Valor unitario (R$)</Label>
                <Input
                  type="number" step="0.01"
                  value={itemForm.unit_price}
                  onChange={(e) => setItemForm((f) => ({ ...f, unit_price: e.target.value }))}
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Total do item: <span className="font-semibold text-foreground">
                {formatCurrency((Number(itemForm.quantity) || 0) * (Number(itemForm.unit_price) || 0))}
              </span>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveItem} disabled={savingItem}>
              {savingItem ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
