/**
 * Geração de feed iCalendar (.ics) para as Demands do Pulse.
 * Funções puras (testáveis sem rede/DB). O feed é consumido por Google/Apple
 * Calendar assinando a URL /api/calendar/feed.ics?token=<CALENDAR_FEED_TOKEN>.
 */

function _pad(n) { return String(n).padStart(2, '0') }

// dueDate é String livre no schema — aceitamos os formatos mais comuns.
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

function _fmtDate(d) {
  return `${d.getUTCFullYear()}${_pad(d.getUTCMonth() + 1)}${_pad(d.getUTCDate())}`
}

function _fmtStamp(d) {
  return `${d.getUTCFullYear()}${_pad(d.getUTCMonth() + 1)}${_pad(d.getUTCDate())}`
    + `T${_pad(d.getUTCHours())}${_pad(d.getUTCMinutes())}${_pad(d.getUTCSeconds())}Z`
}

// Escape conforme RFC 5545 (texto de SUMMARY/DESCRIPTION).
function _esc(s) {
  return String(s == null ? '' : s)
    .replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/**
 * Monta o .ics a partir de uma lista de Demands. Demandas sem dueDate parseável
 * são ignoradas (não quebram o feed). Eventos são "all-day" (VALUE=DATE).
 */
function buildICS(demands, opts = {}) {
  const name = opts.name || 'Pulse — Demandas'
  const stamp = _fmtStamp(opts.now || new Date())
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pulse//Demandas//PT-BR',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${_esc(name)}`,
    `NAME:${_esc(name)}`,
  ]
  for (const d of demands || []) {
    const due = parseDueDate(d.dueDate)
    if (!due) continue
    const end = new Date(due.getTime() + 86400000) // all-day → DTEND = dia seguinte
    lines.push(
      'BEGIN:VEVENT',
      `UID:demand-${d.id}@pulse`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${_fmtDate(due)}`,
      `DTEND;VALUE=DATE:${_fmtDate(end)}`,
      `SUMMARY:${_esc(`[${d.sourceName || '—'}] ${d.text || ''}`)}`,
      `DESCRIPTION:${_esc(`Prioridade: ${d.priority || '—'}${d.done ? ' · concluída' : ''}`)}`,
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n') + '\r\n'
}

module.exports = { parseDueDate, isDueToday, buildICS }
