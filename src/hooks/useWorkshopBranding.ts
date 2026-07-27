import { useQuery } from '@tanstack/react-query'
import { blink } from '@/blink/client'

interface WorkshopSettings {
  id?: string
  workshop_name: string | null
  logo_data_url: string | null
}

export function useWorkshopBranding() {
  const { data } = useQuery({
    queryKey: ['workshop-settings'],
    queryFn: async () => {
      const rows = await blink.db.table<WorkshopSettings>('workshop_settings').list()
      return rows[0] ?? null
    },
  })

  return {
    workshopName: data?.workshop_name?.trim() || 'MotoManage Pro',
    logoDataUrl: data?.logo_data_url || null,
  }
}
