import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { blink } from '@/blink/client'
import { useEffect, useMemo, useState } from 'react'
import {
  Package, Plus, Search, Trash2, Edit, AlertTriangle,
  MoreHorizontal, DollarSign, Boxes,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Part {
  id: string; name: string; sku: string | null; category: string | null; brand: string | null
  unit_price: string; cost_price: string; quantity: number; min_quantity: number
  supplier: string | null; location: string | null; created_at: string
}

const blankForm = {
  name: '', sku: '', category: '', brand: '', unit_price: '', cost_price: '',
  quantity: '0', min_quantity: '1', supplier: '', location: '',
}

export const Route = createFileRoute('/_app/estoque')({
  head: () => ({
    meta: [
      { title: 'Estoque · MotoManage Pro' },
      { name: 'description', content: 'Controle de estoque de pecas' },
    ],
  }),
  component: EstoquePage,
})

function EstoquePage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPart, setEditingPart] = useState<Part | null>(null)
  const [form, setForm] = useState({ ...blankForm })
  const [saving, setSaving] = useState(false)

  const { data: parts = [] } = useQuery<Part[]>({
    queryKey: ['parts'],
    queryFn: () => blink.db.table<Part>('parts').list({ orderBy: { name: 'asc' } }),
  })

  useEffect(() => {
    if (editingPart && dialogOpen) {
      setForm({
        name: editingPart.name, sku: editingPart.sku || '', category: editingPart.category || '',
        brand: editingPart.brand || '', unit_price: String(editingPart.unit_price ?? ''),
        cost_price: String(editingPart.cost_price ?? ''), quantity: String(editingPart.quantity ?? '0'),
        min_quantity: String(editingPart.min_quantity ?? '1'), supplier: editingPart.supplier || '',
        location: editingPart.location || '',
      })
    }
  }, [editingPart, dialogOpen])

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingPart(null)
      setForm({ ...blankForm })
    }
  }

  const lowStock = parts.filter((p) => p.quantity <= p.min_quantity)

  const stats = useMemo(() => {
    const stockValue = parts.reduce((sum, p) => sum + (Number(p.cost_price) || 0) * p.quantity, 0)
    return { total: parts.length, lowStock: lowStock.length, stockValue }
  }, [parts, lowStock])

  const filtered = useMemo(() => {
    let list = parts
    if (lowStockOnly) list = list.filter((p) => p.quantity <= p.min_quantity)
    if (search) {
      const s = search.toLowerCase()
      list = list.filter((p) =>
        p.name.toLowerCase().includes(s) ||
        (p.sku && p.sku.toLowerCase().includes(s)) ||
        (p.category && p.category.toLowerCase().includes(s)) ||
        (p.brand && p.brand.toLowerCase().includes(s))
      )
    }
    return list
  }, [parts, search, lowStockOnly])

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Nome da peca e obrigatorio')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        unit_price: Number(form.unit_price) || 0,
        cost_price: Number(form.cost_price) || 0,
        quantity: Number(form.quantity) || 0,
        min_quantity: Number(form.min_quantity) || 0,
      }
      if (editingPart) {
        await blink.db.table('parts').update(editingPart.id, payload as any)
        toast.success('Peca atualizada')
      } else {
        await blink.db.table('parts').create(payload as any)
        toast.success('Peca cadastrada')
      }
      queryClient.invalidateQueries({ queryKey: ['parts'] })
      handleDialogClose(false)
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar peca')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir a peca "${name}"?`)) return
    try {
      await blink.db.table('parts').delete(id)
      queryClient.invalidateQueries({ queryKey: ['parts'] })
      toast.success('Peca excluida')
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao excluir')
    }
  }

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Estoque</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {parts.length} peca{parts.length !== 1 ? 's' : ''} cadastrada{parts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" /> Nova Peca
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 shrink-0">
              <Boxes className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Pecas cadastradas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 shrink-0">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.lowStock}</p>
              <p className="text-xs text-muted-foreground">Estoque baixo</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 shrink-0">
              <DollarSign className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.stockValue)}</p>
              <p className="text-xs text-muted-foreground">Valor em estoque (custo)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, codigo, categoria ou marca..."
            className="pl-9 h-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => setLowStockOnly((v) => !v)}
          className={cn(
            'flex items-center gap-2 px-4 h-10 rounded-md text-sm font-medium border transition-colors cursor-pointer shrink-0',
            lowStockOnly
              ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800'
              : 'bg-background text-muted-foreground border-border hover:text-foreground'
          )}
        >
          <AlertTriangle className="size-4" /> So estoque baixo
        </button>
      </div>

      {/* Parts list */}
      {filtered.length === 0 ? (
        <Card className="border-border/60 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="size-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {search || lowStockOnly ? 'Nenhuma peca encontrada' : 'Nenhuma peca cadastrada'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {search || lowStockOnly ? 'Tente mudar os filtros' : 'Clique em "Nova Peca" para comecar'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/60">
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {filtered.map((p) => {
                const isLow = p.quantity <= p.min_quantity
                return (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors group">
                    <div className={cn(
                      'flex items-center justify-center size-9 rounded-lg shrink-0',
                      isLow ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-muted text-muted-foreground'
                    )}>
                      <Package className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        {isLow && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                            Estoque baixo
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
                        {p.sku && <span>Cod: {p.sku}</span>}
                        {p.category && <span>{p.category}</span>}
                        {p.brand && <span>{p.brand}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={cn('text-sm font-semibold', isLow ? 'text-amber-600 dark:text-amber-400' : 'text-foreground')}>
                        {p.quantity} un.
                      </p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(Number(p.unit_price) || 0)}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditingPart(p); setDialogOpen(true) }}>
                          <Edit className="size-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(p.id, p.name)}>
                          <Trash2 className="size-4 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPart ? 'Editar Peca' : 'Nova Peca'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Nome *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Pastilha de freio dianteira" />
            </div>
            <div className="space-y-1.5">
              <Label>Codigo / SKU</Label>
              <Input value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} placeholder="PF-1234" />
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="Freios" />
            </div>
            <div className="space-y-1.5">
              <Label>Marca</Label>
              <Input value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} placeholder="Fabricante" />
            </div>
            <div className="space-y-1.5">
              <Label>Fornecedor</Label>
              <Input value={form.supplier} onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))} placeholder="Fornecedor" />
            </div>
            <div className="space-y-1.5">
              <Label>Preco de venda (R$)</Label>
              <Input type="number" step="0.01" value={form.unit_price} onChange={(e) => setForm((f) => ({ ...f, unit_price: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Preco de custo (R$)</Label>
              <Input type="number" step="0.01" value={form.cost_price} onChange={(e) => setForm((f) => ({ ...f, cost_price: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Quantidade em estoque</Label>
              <Input type="number" step="1" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Estoque minimo (alerta)</Label>
              <Input type="number" step="1" value={form.min_quantity} onChange={(e) => setForm((f) => ({ ...f, min_quantity: e.target.value }))} />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Localizacao</Label>
              <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Prateleira A3" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleDialogClose(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : editingPart ? 'Atualizar' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
