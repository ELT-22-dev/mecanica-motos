import { createFileRoute } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { User, Sun, Moon, Monitor, Download, Upload, Trash2, FileSpreadsheet, CalendarClock } from 'lucide-react'
import { blink, exportAllData, importAllData, clearAllData } from '@/blink/client'
import {
  parseCsv, detectColumnMapping, mapRowToPatient,
  PATIENT_FIELD_LABELS, type ParsedCsv, type PatientField,
} from '@/lib/patientImport'
import { useAuth } from '@/hooks/useAuth'
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar'
import { createEvent as createGoogleEvent } from '@/lib/googleCalendar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export const Route = createFileRoute('/_app/configuracoes')({
  head: () => ({ meta: [{ title: 'Configuracoes · OdontoManage Pro' }] }),
  component: SettingsPage,
})

type ThemeMode = 'light' | 'dark' | 'system'

function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'system'
  const t = localStorage.getItem('theme')
  return t === 'dark' || t === 'light' ? t : 'system'
}

function applyTheme(mode: ThemeMode) {
  if (mode === 'system') {
    localStorage.removeItem('theme')
  } else {
    localStorage.setItem('theme', mode)
  }
  const isDark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', isDark)
}

function SettingsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)
  const googleCalendar = useGoogleCalendar()
  const [connectingGoogle, setConnectingGoogle] = useState(false)
  const [syncingAppointments, setSyncingAppointments] = useState(false)

  const [name, setName] = useState(user?.displayName || '')
  const [email, setEmail] = useState(user?.email || '')
  const [theme, setTheme] = useState<ThemeMode>(() => getStoredTheme())
  const [csvPreview, setCsvPreview] = useState<ParsedCsv | null>(null)
  const [csvMapping, setCsvMapping] = useState<Partial<Record<PatientField, string>>>({})
  const [importingCsv, setImportingCsv] = useState(false)

  useEffect(() => {
    if (!user) return
    setName(user.displayName)
    setEmail(user.email)
  }, [user])

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await blink.auth.updateProfile({ name, email })
      toast.success('Perfil atualizado')
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao atualizar perfil')
    }
  }

  const chooseTheme = (mode: ThemeMode) => {
    setTheme(mode)
    applyTheme(mode)
  }

  const handleExport = async () => {
    try {
      const json = await exportAllData()
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `odontomanage-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Backup exportado')
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao exportar backup')
    }
  }

  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text()
      await importAllData(text)
      queryClient.invalidateQueries()
      toast.success('Dados importados com sucesso')
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao importar arquivo')
    }
  }

  const handleCsvFile = async (file: File) => {
    try {
      const text = await file.text()
      const parsed = parseCsv(text)
      if (parsed.rows.length === 0) {
        toast.error('Nenhuma linha encontrada no arquivo')
        return
      }
      if (parsed.rows.length > 5000) {
        toast.error(`Arquivo tem ${parsed.rows.length} linhas — o limite por importacao e 5000. Divida o arquivo em partes menores.`)
        return
      }
      const mapping = detectColumnMapping(parsed.headers)
      if (!mapping.name) {
        toast.error('Nao encontrei uma coluna de nome do paciente no arquivo')
        return
      }
      setCsvMapping(mapping)
      setCsvPreview(parsed)
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao ler arquivo CSV')
    }
  }

  const confirmCsvImport = async () => {
    if (!csvPreview) return
    setImportingCsv(true)
    try {
      const rows = csvPreview.rows
        .map((row) => mapRowToPatient(row, csvMapping))
        .filter((patient) => !!patient.name)
        .map((patient) => ({ ...patient, status: 'active' }))
      const skipped = csvPreview.rows.length - rows.length
      const inserted = await blink.db.table('patients').createMany(rows as any)
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      toast.success(`${inserted.length} paciente${inserted.length !== 1 ? 's' : ''} importado${inserted.length !== 1 ? 's' : ''}${skipped ? `, ${skipped} sem nome (ignorado${skipped !== 1 ? 's' : ''})` : ''}`)
      setCsvPreview(null)
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao importar pacientes')
    } finally {
      setImportingCsv(false)
    }
  }

  const handleGoogleConnect = async () => {
    setConnectingGoogle(true)
    try {
      await googleCalendar.connect()
      toast.success('Google Calendar conectado! Novas consultas serao sincronizadas.')
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao conectar com o Google')
    } finally {
      setConnectingGoogle(false)
    }
  }

  const handleSyncPendingAppointments = async () => {
    setSyncingAppointments(true)
    try {
      const today = new Date().toISOString().slice(0, 10)
      const appointments = await blink.db.table<{
        id: string; patient_name: string; type: string; date: string; time: string
        dentist_name: string | null; room: string | null; notes: string | null
        status: string; google_event_id: string | null
      }>('appointments').list()
      const pending = appointments.filter(
        (a) => !a.google_event_id && a.date >= today && (a.status === 'scheduled' || a.status === 'confirmed')
      )
      if (pending.length === 0) {
        toast.success('Nenhuma consulta pendente para sincronizar')
        return
      }
      let success = 0
      for (const appt of pending) {
        try {
          const eventId = await createGoogleEvent({
            patientName: appt.patient_name,
            type: appt.type,
            date: appt.date,
            time: appt.time,
            dentistName: appt.dentist_name,
            room: appt.room,
            notes: appt.notes,
          })
          await blink.db.table('appointments').update(appt.id, { google_event_id: eventId } as any)
          success++
        } catch {
          // keep going with the rest
        }
      }
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      toast.success(`${success} de ${pending.length} consulta${pending.length !== 1 ? 's' : ''} sincronizada${success !== 1 ? 's' : ''}`)
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao sincronizar consultas')
    } finally {
      setSyncingAppointments(false)
    }
  }

  const handleClearData = async () => {
    if (!confirm('Isso vai apagar TODOS os pacientes, consultas, transacoes e prontuarios cadastrados. Esta acao nao pode ser desfeita. Continuar?')) return
    try {
      await clearAllData()
      queryClient.invalidateQueries()
      toast.success('Todos os dados foram apagados')
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao apagar dados')
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Configuracoes</h1>
        <p className="text-sm text-muted-foreground mt-1">Perfil, aparencia e dados do sistema</p>
      </div>

      {/* Perfil */}
      <Card className="border-border/60">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="size-4" /> Perfil
          </CardTitle>
          <CardDescription>Essas informacoes aparecem na barra lateral do sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="profile-name">Nome</Label>
                <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-email">Email</Label>
                <Input id="profile-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" size="sm">Salvar perfil</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Aparencia */}
      <Card className="border-border/60">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Aparencia</CardTitle>
          <CardDescription>Escolha entre tema claro, escuro ou o padrao do sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {([
              { mode: 'light' as const, label: 'Claro', icon: Sun },
              { mode: 'dark' as const, label: 'Escuro', icon: Moon },
              { mode: 'system' as const, label: 'Sistema', icon: Monitor },
            ]).map(({ mode, label, icon: Icon }) => (
              <button
                key={mode}
                type="button"
                onClick={() => chooseTheme(mode)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-lg border py-4 text-sm font-medium transition-colors cursor-pointer',
                  theme === mode
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border/60 text-muted-foreground hover:bg-muted/50'
                )}
              >
                <Icon className="size-5" />
                {label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Integracoes */}
      <Card className="border-border/60">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="size-4" /> Integracoes
          </CardTitle>
          <CardDescription>
            Conecte seu Google Calendar para que novas consultas apareçam automaticamente na sua agenda do Google.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 px-4 py-3">
            <div>
              <p className="text-sm font-medium">Google Calendar</p>
              <p className="text-xs text-muted-foreground">
                {googleCalendar.connected
                  ? 'Conectado — a conexao dura cerca de 1 hora, reconecte quando expirar.'
                  : 'Nao conectado'}
              </p>
            </div>
            {googleCalendar.connected ? (
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleSyncPendingAppointments} disabled={syncingAppointments}>
                  {syncingAppointments ? 'Sincronizando...' : 'Sincronizar pendentes'}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={googleCalendar.disconnect}>
                  Desconectar
                </Button>
              </div>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={handleGoogleConnect} disabled={connectingGoogle}>
                {connectingGoogle ? 'Conectando...' : 'Conectar'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dados do sistema */}
      <Card className="border-border/60">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Dados do sistema</CardTitle>
          <CardDescription>
            Os dados ficam salvos no banco de dados da clinica. Use o backup para ter uma copia extra, ou importe uma planilha para trazer pacientes de outro sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Backup completo (formato deste sistema)</p>
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={handleExport}>
                <Download className="size-4" /> Exportar backup
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="size-4" /> Importar backup (.json)
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleImportFile(file)
                  e.target.value = ''
                }}
              />
            </div>
          </div>

          <div className="pt-3 border-t border-border/60">
            <p className="text-xs font-medium text-muted-foreground mb-2">Migrar pacientes de outro sistema (.csv)</p>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => csvInputRef.current?.click()}
              >
                <FileSpreadsheet className="size-4" /> Importar pacientes (CSV)
              </Button>
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleCsvFile(file)
                  e.target.value = ''
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Exporte sua planilha antiga como .csv (Excel/Google Sheets: Arquivo → Salvar como/Exportar → CSV). Colunas como "Nome", "CPF", "Telefone", "Email" sao detectadas automaticamente.
            </p>
          </div>

          <div className="pt-3 border-t border-border/60">
            <Button type="button" variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive" onClick={handleClearData}>
              <Trash2 className="size-4" /> Apagar todos os dados
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* CSV import preview dialog */}
      <Dialog open={!!csvPreview} onOpenChange={(open) => !open && setCsvPreview(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirmar importacao de pacientes</DialogTitle>
            <DialogDescription>
              {csvPreview ? `${csvPreview.rows.length} linha${csvPreview.rows.length !== 1 ? 's' : ''} encontrada${csvPreview.rows.length !== 1 ? 's' : ''} no arquivo.` : ''}
            </DialogDescription>
          </DialogHeader>
          {csvPreview && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Colunas detectadas</p>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(csvMapping) as PatientField[]).map((field) => (
                    <span key={field} className="text-xs bg-muted rounded-full px-2.5 py-1">
                      {PATIENT_FIELD_LABELS[field]} <span className="text-muted-foreground">← {csvMapping[field]}</span>
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Previa (primeiras linhas)</p>
                <div className="rounded-md border border-border/60 divide-y divide-border max-h-40 overflow-y-auto">
                  {csvPreview.rows.slice(0, 5).map((row, i) => {
                    const patient = mapRowToPatient(row, csvMapping)
                    return (
                      <div key={i} className="px-3 py-2 text-sm">
                        <span className="font-medium">{patient.name || '(sem nome)'}</span>
                        {patient.phone && <span className="text-muted-foreground"> · {patient.phone}</span>}
                        {patient.email && <span className="text-muted-foreground"> · {patient.email}</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCsvPreview(null)} disabled={importingCsv}>
              Cancelar
            </Button>
            <Button type="button" onClick={confirmCsvImport} disabled={importingCsv}>
              {importingCsv ? 'Importando...' : `Importar ${csvPreview?.rows.length ?? 0} paciente${csvPreview?.rows.length !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
