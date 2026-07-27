export const SERVICE_ORDER_STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  open: { label: 'Aberta', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  in_progress: { label: 'Em andamento', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  waiting_parts: { label: 'Aguard. pecas', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  completed: { label: 'Concluida', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  delivered: { label: 'Entregue', cls: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' },
  cancelled: { label: 'Cancelada', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
}

export const SERVICE_ORDER_STATUS_ORDER = ['open', 'in_progress', 'waiting_parts', 'completed', 'delivered', 'cancelled'] as const
