/** Converts a Brazilian phone number into the digits-only format wa.me expects (country code + DDD + number). */
function toWhatsAppNumber(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, '')
  if (digits.length >= 12 && digits.startsWith('55')) return digits
  return `55${digits}`
}

export function openWhatsApp(rawPhone: string, message: string) {
  const digits = rawPhone.replace(/\D/g, '')
  if (!digits) throw new Error('Este contato nao tem telefone/WhatsApp cadastrado')
  const number = toWhatsAppNumber(rawPhone)
  const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

export function buildAppointmentReminderMessage(params: {
  clientName: string
  date: string
  time: string
  mechanicName?: string | null
  serviceType?: string | null
  vehicleLabel?: string | null
}): string {
  const { clientName, date, time, mechanicName, serviceType, vehicleLabel } = params
  const formattedDate = new Date(date + 'T00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
  })
  const typeLabel = serviceType && serviceType.trim().toLowerCase() !== 'revisao' ? ` de ${serviceType}` : ''
  const vehiclePart = vehicleLabel ? ` da sua moto (${vehicleLabel})` : ''
  let msg = `Ola ${clientName}! Passando para lembrar do servico${typeLabel}${vehiclePart} agendado para ${formattedDate} as ${time}`
  if (mechanicName) msg += ` com ${mechanicName}`
  msg += '. Qualquer duvida ou imprevisto, e so responder por aqui. Ate breve!'
  return msg
}

export function buildServiceOrderReadyMessage(params: {
  clientName: string
  vehicleLabel?: string | null
  total?: number | null
}): string {
  const { clientName, vehicleLabel, total } = params
  const vehiclePart = vehicleLabel ? ` (${vehicleLabel})` : ''
  let msg = `Ola ${clientName}! Sua moto${vehiclePart} ja esta pronta para retirada.`
  if (total != null) {
    msg += ` Valor total do servico: ${total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`
  }
  msg += ' Qualquer duvida, e so responder por aqui. Obrigado pela preferencia!'
  return msg
}

export function buildGreetingMessage(clientName: string): string {
  return `Ola ${clientName}! Aqui e da oficina. Tudo bem?`
}
