/**
 * Google Calendar sync via Google Identity Services (GIS) — client-only,
 * no backend. The access token GIS returns is short-lived (~1h) and there is
 * no refresh token in this flow, so the connection needs to be renewed
 * ("Conectar Google Calendar") periodically. Trade-off accepted to avoid
 * running a server just to keep an OAuth client secret safe.
 */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
const SCOPE = 'https://www.googleapis.com/auth/calendar.events'
const TOKEN_STORAGE_KEY = 'odonto_google_calendar_token'
const APPOINTMENT_DURATION_MINUTES = 30

interface StoredToken {
  accessToken: string
  expiresAt: number
}

interface GisTokenClient {
  requestAccessToken: (overrides?: { prompt?: string }) => void
}

interface GisTokenResponse {
  access_token?: string
  expires_in?: number
  error?: string
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: GisTokenResponse) => void
          }) => GisTokenClient
        }
      }
    }
  }
}

let gisLoadPromise: Promise<void> | null = null

function loadGis(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Google Calendar requires a browser'))
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (gisLoadPromise) return gisLoadPromise
  gisLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Falha ao carregar o script do Google'))
    document.head.appendChild(script)
  })
  return gisLoadPromise
}

function getStoredToken(): StoredToken | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!raw) return null
    const token = JSON.parse(raw) as StoredToken
    if (token.expiresAt <= Date.now()) return null
    return token
  } catch {
    return null
  }
}

function saveToken(accessToken: string, expiresInSeconds: number) {
  const token: StoredToken = { accessToken, expiresAt: Date.now() + expiresInSeconds * 1000 - 30_000 }
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(token))
}

export function isConnected(): boolean {
  return getStoredToken() !== null
}

export function disconnect() {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
}

export async function connect(): Promise<void> {
  if (!CLIENT_ID) throw new Error('VITE_GOOGLE_CLIENT_ID nao configurado')
  await loadGis()
  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error || 'Nao foi possivel conectar ao Google'))
          return
        }
        saveToken(response.access_token, response.expires_in ?? 3600)
        resolve()
      },
    })
    client.requestAccessToken()
  })
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getStoredToken()
  if (!token) throw new Error('Google Calendar nao conectado')
  const res = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token.accessToken}`,
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Google Calendar API error (${res.status}): ${body.slice(0, 200)}`)
  }
  return res
}

export interface CalendarAppointmentInput {
  patientName: string
  type: string
  date: string // YYYY-MM-DD
  time: string // HH:MM
  dentistName?: string | null
  room?: string | null
  notes?: string | null
}

function toEventBody(input: CalendarAppointmentInput) {
  const start = new Date(`${input.date}T${input.time}:00`)
  const end = new Date(start.getTime() + APPOINTMENT_DURATION_MINUTES * 60_000)
  const descriptionParts = [
    input.dentistName ? `Dentista: ${input.dentistName}` : null,
    input.room ? `Sala: ${input.room}` : null,
    input.notes || null,
  ].filter(Boolean)
  return {
    summary: `${input.type} - ${input.patientName}`,
    description: descriptionParts.join('\n') || undefined,
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
  }
}

export async function createEvent(input: CalendarAppointmentInput): Promise<string> {
  const res = await apiFetch('/calendars/primary/events', {
    method: 'POST',
    body: JSON.stringify(toEventBody(input)),
  })
  const data = await res.json()
  return data.id as string
}

export async function updateEvent(eventId: string, input: CalendarAppointmentInput): Promise<void> {
  await apiFetch(`/calendars/primary/events/${encodeURIComponent(eventId)}`, {
    method: 'PATCH',
    body: JSON.stringify(toEventBody(input)),
  })
}

export async function deleteEvent(eventId: string): Promise<void> {
  try {
    await apiFetch(`/calendars/primary/events/${encodeURIComponent(eventId)}`, { method: 'DELETE' })
  } catch {
    // Event may already be gone (deleted directly in Google Calendar) — not fatal.
  }
}
