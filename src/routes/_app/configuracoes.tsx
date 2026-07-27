import { createFileRoute } from '@tanstack/react-router'
import { Settings } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export const Route = createFileRoute('/_app/configuracoes')({
  head: () => ({ meta: [{ title: 'Configuracoes · OdontoManage Pro' }] }),
  component: SettingsPage,
})

function SettingsPage() {
  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Configuracoes</h1>
        <p className="text-sm text-muted-foreground mt-1">Modulo de configuracoes - em breve</p>
      </div>
      <Card className="border-dashed border-border/60">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Settings className="size-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Modulo em desenvolvimento</p>
          <p className="text-xs text-muted-foreground mt-1">Dados da clinica, usuarios e permissoes em breve.</p>
        </CardContent>
      </Card>
    </div>
  )
}
