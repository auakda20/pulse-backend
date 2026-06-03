/**
 * Geração de feed iCalendar (.ics) do Pulse — Demands (deadlines) + CalendarEvents.
 * Funções puras (testáveis sem rede/DB). Consumido assinando a URL
 * /api/calendar/feed.ics?token=<CALENDAR_FEED_TOKEN> no Google/Apple Calendar.
 *
 * NÃO emitimos VALARM de propósito: a notificação é disparada pelo PRÓPRIO Pulse
 * (cron → Discord/WhatsApp), confiável em qualquer cliente. O feed é só visão.
 */

function _pad(n) { return String(n).padStart(2, '0') }

// dueDate (Demand) é String livre no schema — aceitamos os formatos mais comuns.
function parseDueDate(s) {
  if (!s || typeof s !== 'string') return null
  const t = s.trim()
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/)            // YYYY-MM-DD[...]
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)          // DD/MM/YYYY
  if (m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]))
  return null
}

// Demanda vence hoje (fuso BRT)? Usada para urgência do WhatsApp.
function isDueToday(s, now = new Date()) {
  const d = parseDueDate(s)
  if (!d) return false
  const brt = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  return d.getUTCFullYear() === brt.getFullYear()
    && d.getUTCMonth() === brt.getMonth()
    && d.getUTCDate() === brt.getDate()
}

function _fmtDate(d) {  // all-day: YYYYMMDD (em UTC)
  return `${d.getUTCFullYear()}${_pad(d.getUTCMonth() + 1)}${_pad(d.getUTCDate())}`
}

function _fmtStamp(d) { // timed/UTC: YYYYMMDDTHHMMSSZ
  return `${d.getUTCFullYear()}${_pad(d.getUTCMonth() + 1)}${_pad(d.getUTCDate())}`
    + `T${_pad(d.getUTCHours())}${_pad(d.getUTCMinutes())}${_pad(d.getUTCSeconds())}Z`
}

// Escape conforme RFC 5545 (texto de SUMMARY/DESCRIPTION).
function _esc(s) {
  return String(s == null ? '' : s)
    .replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

// Mapeia Demands (com dueDate parseável) → eventos all-day.
function demandsToEvents(demands) {
  const out = []
  for (const d of demands || []) {
    const due = parseDueDate(d.dueDate)
    if (!due) continue
    out.push({
      uid: `demand-${d.id}@pulse`,
      summary: `[${d.sourceName || '—'}] ${d.text || ''}`,
      description: `Demanda · prioridade: ${d.priority || '—'}`,
      start: due,
      allDay: true,
    })
  }
  return out
}

// Mapeia CalendarEvents → eventos (com hora ou all-day).
function calendarEventsToEvents(rows) {
  const out = []
  for (const e of rows || []) {
    const start = e.startsAt instanceof Date ? e.startsAt : new Date(e.startsAt)
    if (isNaN(start.getTime())) continue
    out.push({
      uid: `event-${e.id}@pulse`,
      summary: e.title || '(sem título)',
      description: e.description || '',
      start,
      allDay: !!e.allDay,
    })
  }
  return out
}

/**
 * Monta o .ics a partir de eventos normalizados:
 *   { uid, summary, description, start: Date, allDay: bool }
 * all-day → VALUE=DATE (DTEND no dia seguinte); com hora → DTSTART/DTEND em UTC (+1h).
 */
function buildICS(events, opts = {}) {
  const name = opts.name || 'Pulse'
  const stamp = _fmtStamp(opts.now || new Date())
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pulse//Calendario//PT-BR',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${_esc(name)}`,
    `NAME:${_esc(name)}`,
  ]
  for (const ev of events || []) {
    if (!ev || !(ev.start instanceof Date) || isNaN(ev.start.getTime())) continue
    lines.push('BEGIN:VEVENT', `UID:${ev.uid}`, `DTSTAMP:${stamp}`)
    if (ev.allDay) {
      const end = new Date(ev.start.getTime() + 86400000)
      lines.push(`DTSTART;VALUE=DATE:${_fmtDate(ev.start)}`, `DTEND;VALUE=DATE:${_fmtDate(end)}`)
    } else {
      const end = new Date(ev.start.getTime() + 3600000) // duração padrão 1h
      lines.push(`DTSTART:${_fmtStamp(ev.start)}`, `DTEND:${_fmtStamp(end)}`)
    }
    lines.push(`SUMMARY:${_esc(ev.summary)}`)
    if (ev.description) lines.push(`DESCRIPTION:${_esc(ev.description)}`)
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n') + '\r\n'
}

module.exports = {
  parseDueDate, isDueToday, buildICS, demandsToEvents, calendarEventsToEvents,
}
