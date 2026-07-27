import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { blink } from '@/blink/client'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export const Route = createFileRoute('/_app/clientes/novo')({
  head: () => ({ meta: [{ title: 'Novo Cliente · MotoManage Pro' }] }),
  component: NewClientPage,
})

function NewClientPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', cpf_cnpj: '', phone: '', whatsapp: '', email: '',
    address: '', city: '', state: '', zip: '', notes: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Nome e obrigatorio')
      return
    }
    setSaving(true)
    try {
      await blink.db.table('clients').create({
        ...form,
        status: 'active',
      } as any)
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      toast.success('Cliente cadastrado com sucesso!')
      navigate({ to: '/clientes' })
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao cadastrar cliente')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/clientes' })}>
          <ArrowLeft className="size-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Novo Cliente</h1>
          <p className="text-sm text-muted-foreground">Preencha os dados do cliente</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Dados Pessoais</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="name">Nome completo *</Label>
              <Input id="name" name="name" value={form.name} onChange={handleChange} placeholder="Nome do cliente" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cpf_cnpj">CPF/CNPJ</Label>
              <Input id="cpf_cnpj" name="cpf_cnpj" value={form.cpf_cnpj} onChange={handleChange} placeholder="000.000.000-00" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Contato</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" name="phone" value={form.phone} onChange={handleChange} placeholder="(00) 0000-0000" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input id="whatsapp" name="whatsapp" value={form.whatsapp} onChange={handleChange} placeholder="(00) 00000-0000" />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="email@exemplo.com" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Endereco</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="address">Endereco</Label>
              <Input id="address" name="address" value={form.address} onChange={handleChange} placeholder="Rua, numero, bairro" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">Cidade</Label>
              <Input id="city" name="city" value={form.city} onChange={handleChange} placeholder="Cidade" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state">Estado</Label>
              <Input id="state" name="state" value={form.state} onChange={handleChange} placeholder="Estado" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="zip">CEP</Label>
              <Input id="zip" name="zip" value={form.zip} onChange={handleChange} placeholder="00000-000" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Observacoes</CardTitle>
          </CardHeader>
          <CardContent>
            <Input id="notes" name="notes" value={form.notes} onChange={handleChange} placeholder="Observacoes gerais sobre o cliente" />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate({ to: '/clientes' })}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? (
              <div className="size-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Salvar Cliente
          </Button>
        </div>
      </form>
    </div>
  )
}
