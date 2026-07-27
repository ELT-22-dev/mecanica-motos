import Papa from 'papaparse'

export const CLIENT_FIELDS = [
  'name', 'cpf_cnpj', 'phone', 'whatsapp', 'email',
  'address', 'city', 'state', 'zip', 'notes',
] as const

export type ClientField = (typeof CLIENT_FIELDS)[number]

export const CLIENT_FIELD_LABELS: Record<ClientField, string> = {
  name: 'Nome', cpf_cnpj: 'CPF/CNPJ', phone: 'Telefone',
  whatsapp: 'WhatsApp', email: 'Email', address: 'Endereco', city: 'Cidade',
  state: 'Estado', zip: 'CEP', notes: 'Observacoes',
}

const FIELD_ALIASES: Record<ClientField, string[]> = {
  name: ['nome', 'nomecompleto', 'cliente', 'name', 'nomecliente'],
  cpf_cnpj: ['cpf', 'cnpj', 'cpfcnpj'],
  phone: ['telefone', 'fone', 'phone', 'celular', 'tel'],
  whatsapp: ['whatsapp', 'whats', 'zap'],
  email: ['email'],
  address: ['endereco', 'address', 'rua', 'logradouro'],
  city: ['cidade', 'city', 'municipio'],
  state: ['estado', 'uf', 'state'],
  zip: ['cep', 'zip', 'zipcode'],
  notes: ['observacoes', 'obs', 'notes', 'observacao'],
}

function normalizeHeader(header: string): string {
  return header
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

export interface ParsedCsv {
  headers: string[]
  rows: Record<string, string>[]
}

export function parseCsv(text: string): ParsedCsv {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  })
  const headers = result.meta.fields ?? []
  return { headers, rows: result.data }
}

/** Maps each known client field to the original CSV header that matches it, if any. */
export function detectColumnMapping(headers: string[]): Partial<Record<ClientField, string>> {
  const normalizedHeaders = headers.map((h) => ({ original: h, normalized: normalizeHeader(h) }))
  const mapping: Partial<Record<ClientField, string>> = {}
  for (const field of CLIENT_FIELDS) {
    const aliases = FIELD_ALIASES[field]
    const match = normalizedHeaders.find((h) => aliases.includes(h.normalized))
    if (match) mapping[field] = match.original
  }
  return mapping
}

export function mapRowToClient(
  row: Record<string, string>,
  mapping: Partial<Record<ClientField, string>>
): Record<string, string> {
  const client: Record<string, string> = {}
  for (const field of CLIENT_FIELDS) {
    const header = mapping[field]
    if (header && row[header] != null) {
      client[field] = String(row[header]).trim()
    }
  }
  return client
}
