import { useQuery } from '@tanstack/react-query'
import { blink } from '@/blink/client'

interface ClinicSettings {
  id?: string
  clinic_name: string | null
  logo_data_url: string | null
}

export function useClinicBranding() {
  const { data } = useQuery({
    queryKey: ['clinic-settings'],
    queryFn: async () => {
      const rows = await blink.db.table<ClinicSettings>('clinic_settings').list()
      return rows[0] ?? null
    },
  })

  return {
    clinicName: data?.clinic_name?.trim() || 'OdontoManage Pro',
    logoDataUrl: data?.logo_data_url || null,
  }
}
