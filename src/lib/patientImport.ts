import Papa from 'papaparse'

export const PATIENT_FIELDS = [
  'name', 'cpf', 'rg', 'birth_date', 'sex', 'marital_status', 'profession',
  'phone', 'whatsapp', 'email', 'address', 'city', 'state', 'zip', 'notes',
  'emergency_contact', 'insurance', 'insurance_number', 'financial_guardian',
] as const

export type PatientField = (typeof PATIENT_FIELDS)[number]

export const PATIENT_FIELD_LABELS: Record<PatientField, string> = {
  name: 'Nome', cpf: 'CPF', rg: 'RG', birth_date: 'Nascimento', sex: 'Sexo',
  marital_status: 'Estado civil', profession: 'Profissao', phone: 'Telefone',
  whatsapp: 'WhatsApp', email: 'Email', address: 'Endereco', city: 'Cidade',
  state: 'Estado', zip: 'CEP', notes: 'Observacoes',
  emergency_contact: 'Contato de emergencia', insurance: 'Convenio',
  insurance_number: 'No. Carteirinha', financial_guardian: 'Responsavel financeiro',
}

const FIELD_ALIASES: Record<PatientField, string[]> = {
  name: ['nome', 'nomecompleto', 'paciente', 'name', 'nomepaciente'],
  cpf: ['cpf'],
  rg: ['rg'],
  birth_date: ['nascimento', 'datanascimento', 'dtnascimento', 'birthdate', 'datadenascimento'],
  sex: ['sexo', 'genero', 'sex'],
  marital_status: ['estadocivil', 'maritalstatus'],
  profession: ['profissao', 'profession', 'ocupacao'],
  phone: ['telefone', 'fone', 'phone', 'celular', 'tel'],
  whatsapp: ['whatsapp', 'whats', 'zap'],
  email: ['email'],
  address: ['endereco', 'address', 'rua', 'logradouro'],
  city: ['cidade', 'city', 'municipio'],
  state: ['estado', 'uf', 'state'],
  zip: ['cep', 'zip', 'zipcode'],
  notes: ['observacoes', 'obs', 'notes', 'observacao'],
  emergency_contact: ['contatodeemergencia', 'emergencia', 'emergencycontact'],
  insurance: ['convenio', 'plano', 'insurance'],
  insurance_number: ['carteirinha', 'numerocarteirinha', 'insurancenumber'],
  financial_guardian: ['responsavelfinanceiro', 'responsavel', 'guardian', 'financialguardian'],
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

/** Maps each known patient field to the original CSV header that matches it, if any. */
export function detectColumnMapping(headers: string[]): Partial<Record<PatientField, string>> {
  const normalizedHeaders = headers.map((h) => ({ original: h, normalized: normalizeHeader(h) }))
  const mapping: Partial<Record<PatientField, string>> = {}
  for (const field of PATIENT_FIELDS) {
    const aliases = FIELD_ALIASES[field]
    const match = normalizedHeaders.find((h) => aliases.includes(h.normalized))
    if (match) mapping[field] = match.original
  }
  return mapping
}

export function mapRowToPatient(
  row: Record<string, string>,
  mapping: Partial<Record<PatientField, string>>
): Record<string, string> {
  const patient: Record<string, string> = {}
  for (const field of PATIENT_FIELDS) {
    const header = mapping[field]
    if (header && row[header] != null) {
      patient[field] = String(row[header]).trim()
    }
  }
  return patient
}
