/**
 * Data layer backed by the local Express + SQLite server (`server/`). Keeps the
 * same call surface the routes already use (`blink.db.table(name).list/get/
 * create/update/delete`) so page code doesn't need to change when the storage
 * backend changes — this used to talk to Supabase, now it talks to `/api/*`.
 *
 * DEMO_MODE (`VITE_DEMO_MODE=true`, set for the Vercel portfolio deployment)
 * swaps this for a browser-only `localStorage` store (`localStore.ts`, seeded
 * by `demoSeed.ts`) — there is no server to talk to on that deployment.
 */
import { localTable, clearLocalTable } from './localStore'

export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true'

type OrderBy = Record<string, 'asc' | 'desc'>

interface ListOptions {
  orderBy?: OrderBy
}

/** Empty-string form fields become null so optional date/number columns don't reject "" as invalid. */
function sanitize<T extends Record<string, unknown>>(data: T): T {
  const out = {} as T
  for (const [key, value] of Object.entries(data)) {
    ;(out as Record<string, unknown>)[key] = value === '' ? null : value
  }
  return out
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error || `Erro ${res.status} ao acessar ${path}`)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

function apiTable<T extends { id?: string }>(name: string) {
  return {
    async list(options?: ListOptions): Promise<T[]> {
      const query = options?.orderBy ? `?orderBy=${encodeURIComponent(JSON.stringify(options.orderBy))}` : ''
      return request<T[]>(`/api/${name}${query}`)
    },
    async get(id: string): Promise<T | null> {
      return request<T | null>(`/api/${name}/${id}`)
    },
    async create(data: Partial<T>): Promise<T> {
      return request<T>(`/api/${name}`, { method: 'POST', body: JSON.stringify(sanitize(data)) })
    },
    /** Bulk insert — one round trip instead of one request per row. */
    async createMany(rows: Partial<T>[]): Promise<T[]> {
      return request<T[]>(`/api/${name}/bulk`, {
        method: 'POST',
        body: JSON.stringify(rows.map((row) => sanitize(row))),
      })
    },
    async update(id: string, data: Partial<T>): Promise<T> {
      return request<T>(`/api/${name}/${id}`, { method: 'PATCH', body: JSON.stringify(sanitize(data)) })
    },
    async delete(id: string): Promise<void> {
      await request<void>(`/api/${name}/${id}`, { method: 'DELETE' })
    },
  }
}

function table<T extends { id?: string }>(name: string) {
  return DEMO_MODE ? localTable<T>(name) : apiTable<T>(name)
}

const BACKUP_TABLES = [
  'clients', 'vehicles', 'appointments', 'parts',
  'service_orders', 'service_order_items', 'transactions',
]

export async function exportAllData(): Promise<string> {
  const dump: Record<string, unknown[]> = {}
  for (const name of BACKUP_TABLES) {
    dump[name] = await table(name).list()
  }
  return JSON.stringify({ exported_at: new Date().toISOString(), tables: dump }, null, 2)
}

export async function importAllData(json: string) {
  const parsed = JSON.parse(json) as { tables?: Record<string, Record<string, unknown>[]> }
  if (!parsed.tables) throw new Error('Arquivo invalido: nenhuma tabela encontrada')
  for (const [name, rows] of Object.entries(parsed.tables)) {
    if (!rows.length) continue
    await table(name).createMany(rows)
  }
}

export async function clearAllData() {
  if (DEMO_MODE) {
    for (const name of BACKUP_TABLES) clearLocalTable(name)
    return
  }
  for (const name of BACKUP_TABLES) {
    await request(`/api/${name}`, { method: 'DELETE' })
  }
}

export const blink = {
  db: { table },
}
