/**
 * Browser-only data layer for the portfolio/demo build (`VITE_DEMO_MODE=true`,
 * used for the Vercel deployment). Same `list/get/create/createMany/update/
 * delete` surface as the real API client (`client.ts`) so routes don't know
 * the difference — everything just lives in `localStorage` instead of the
 * self-hosted server. Seeded once with example data by `seedDemoData()`.
 */

const PREFIX = 'motomanage_demo_'

function readTable<T>(name: string): T[] {
  try {
    const raw = localStorage.getItem(PREFIX + name)
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch {
    return []
  }
}

function writeTable<T>(name: string, rows: T[]) {
  localStorage.setItem(PREFIX + name, JSON.stringify(rows))
}

/** Empty-string form fields become null so optional date/number columns don't reject "" as invalid. */
function sanitize<T extends Record<string, unknown>>(data: T): T {
  const out = {} as T
  for (const [key, value] of Object.entries(data)) {
    ;(out as Record<string, unknown>)[key] = value === '' ? null : value
  }
  return out
}

type OrderBy = Record<string, 'asc' | 'desc'>
interface ListOptions {
  orderBy?: OrderBy
}

export function localTable<T extends { id?: string; created_at?: string }>(name: string) {
  return {
    async list(options?: ListOptions): Promise<T[]> {
      let rows = readTable<T>(name)
      if (options?.orderBy) {
        const entries = Object.entries(options.orderBy)
        rows = [...rows].sort((a, b) => {
          for (const [field, dir] of entries) {
            const av = (a as Record<string, unknown>)[field] as string | number | undefined
            const bv = (b as Record<string, unknown>)[field] as string | number | undefined
            if (av === bv) continue
            const cmp = (av ?? '') > (bv ?? '') ? 1 : -1
            return dir === 'desc' ? -cmp : cmp
          }
          return 0
        })
      }
      return rows
    },
    async get(id: string): Promise<T | null> {
      return readTable<T>(name).find((r) => (r as { id?: string }).id === id) ?? null
    },
    async create(data: Partial<T>): Promise<T> {
      const rows = readTable<T>(name)
      const row = {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        ...sanitize(data as Record<string, unknown>),
      } as T
      rows.push(row)
      writeTable(name, rows)
      return row
    },
    async createMany(items: Partial<T>[]): Promise<T[]> {
      const rows = readTable<T>(name)
      const created = items.map((data) => ({
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        ...sanitize(data as Record<string, unknown>),
      })) as T[]
      writeTable(name, [...rows, ...created])
      return created
    },
    async update(id: string, data: Partial<T>): Promise<T> {
      const rows = readTable<T>(name)
      const idx = rows.findIndex((r) => (r as { id?: string }).id === id)
      if (idx === -1) throw new Error(`Registro nao encontrado em "${name}"`)
      rows[idx] = { ...rows[idx], ...sanitize(data as Record<string, unknown>) }
      writeTable(name, rows)
      return rows[idx]
    },
    async delete(id: string): Promise<void> {
      writeTable(name, readTable<T>(name).filter((r) => (r as { id?: string }).id !== id))
    },
  }
}

export function clearLocalTable(name: string) {
  localStorage.removeItem(PREFIX + name)
}

export function readLocalTable<T>(name: string): T[] {
  return readTable<T>(name)
}

export function writeLocalTable<T>(name: string, rows: T[]) {
  writeTable(name, rows)
}
