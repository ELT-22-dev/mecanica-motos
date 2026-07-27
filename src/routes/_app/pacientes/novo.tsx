import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { blink } from '@/blink/client'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export const Route = createFileRoute('/_app/pacientes/novo')({
  head: () => ({ meta: [{ title: 'Novo Paciente · OdontoManage Pro' }] }),
  component: NewPatientPage,
})

function NewPatientPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', cpf: '', rg: '', birth_date: '', sex: '', marital_status: '',
    profession: '', phone: '', whatsapp: '', email: '', address: '',
    city: '', state: '', zip: '', notes: '', emergency_contact: '',
    insurance: '', insurance_number: '', financial_guardian: '',
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
      await blink.db.table('patients').create({
        ...form,
        status: 'active',
        user_id: 'user',
      } as any)
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      toast.success('Paciente cadastrado com sucesso!')
      navigate({ to: '/pacientes' })
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao cadastrar paciente')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/pacientes' })}>
          <ArrowLeft className="size-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Novo Paciente</h1>
          <p className="text-sm text-muted-foreground">Preencha os dados do paciente</p>
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
              <Input id="name" name="name" value={form.name} onChange={handleChange} placeholder="Nome do paciente" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cpf">CPF</Label>
              <Input id="cpf" name="cpf" value={form.cpf} onChange={handleChange} placeholder="000.000.000-00" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rg">RG</Label>
              <Input id="rg" name="rg" value={form.rg} onChange={handleChange} placeholder="RG" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="birth_date">Data de nascimento</Label>
              <Input id="birth_date" name="birth_date" type="date" value={form.birth_date} onChange={handleChange} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sex">Sexo</Label>
              <Input id="sex" name="sex" value={form.sex} onChange={handleChange} placeholder="Feminino / Masculino" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="marital_status">Estado civil</Label>
              <Input id="marital_status" name="marital_status" value={form.marital_status} onChange={handleChange} placeholder="Solteiro(a)" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profession">Profissao</Label>
              <Input id="profession" name="profession" value={form.profession} onChange={handleChange} placeholder="Profissao" />
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
            <CardTitle className="text-base">Informacoes Adicionais</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="insurance">Convenio</Label>
              <Input id="insurance" name="insurance" value={form.insurance} onChange={handleChange} placeholder="Nome do convenio" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="insurance_number">No. Carteirinha</Label>
              <Input id="insurance_number" name="insurance_number" value={form.insurance_number} onChange={handleChange} placeholder="Numero" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emergency_contact">Contato de emergencia</Label>
              <Input id="emergency_contact" name="emergency_contact" value={form.emergency_contact} onChange={handleChange} placeholder="Nome e telefone" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="financial_guardian">Responsavel financeiro</Label>
              <Input id="financial_guardian" name="financial_guardian" value={form.financial_guardian} onChange={handleChange} placeholder="Nome" />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="notes">Observacoes</Label>
              <Input id="notes" name="notes" value={form.notes} onChange={handleChange} placeholder="Observacoes gerais" />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate({ to: '/pacientes' })}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? (
              <div className="size-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Salvar Paciente
          </Button>
        </div>
      </form>
    </div>
  )
}
