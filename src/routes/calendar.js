/**
 * Calendário do Pulse:
 *  - GET /api/calendar/feed.ics?token=<CALENDAR_FEED_TOKEN>  → feed iCalendar
 *    (Demands com dueDate + CalendarEvents). Sem auth por header — apps de
 *    calendário não mandam Authorization; o acesso é pelo token na query.
 *    Se CALENDAR_FEED_TOKEN não estiver setada, o feed fica desligado (503).
 *  - CRUD /api/calendar/events  → eventos do calendário (requer login).
 *
 * A notificação dos eventos é disparada pelo próprio Pulse (utils/reminders.js),
 * não pelo app de calendário.
 */
const router = require('express').Router()
const { PrismaClient } = require('@prisma/client')
const authMw = require('../middleware/auth')
const { buildICS, demandsToEvents, calendarEventsToEvents } = require('../utils/ics')

const prisma = new PrismaClient()

// ── Feed ICS (token na query) ───────────────────────────────────────────────
router.get('/feed.ics', async (req, res) => {
  const esperado = process.env.CALENDAR_FEED_TOKEN
  if (!esperado) {
    return res.status(503).json({ error: 'Feed de calendário não configurado (CALENDAR_FEED_TOKEN ausente).' })
  }
  if (req.query.token !== esperado) {
    return res.status(403).json({ error: 'Token inválido.' })
  }

  const [demands, eventos] = await Promise.all([
    prisma.demand.findMany({ where: { done: false, dueDate: { not: null } } }),
    prisma.calendarEvent.findMany({ orderBy: { startsAt: 'asc' } }),
  ])

  const ics = buildICS([...demandsToEvents(demands), ...calendarEventsToEvents(eventos)])
  res.set('Content-Type', 'text/calendar; charset=utf-8')
  res.set('Content-Disposition', 'inline; filename="pulse.ics"')
  res.send(ics)
})

// ── CRUD de eventos (requer login) ──────────────────────────────────────────
router.get('/events', authMw, async (req, res) => {
  const eventos = await prisma.calendarEvent.findMany({ orderBy: { startsAt: 'asc' } })
  res.json(eventos)
})

router.post('/events', authMw, async (req, res) => {
  const { title, description, startsAt, allDay = false, remindMinutes = 60, vertical } = req.body
  if (!title || !startsAt) {
    return res.status(400).json({ error: 'title e startsAt são obrigatórios' })
  }
  const dt = new Date(startsAt)
  if (isNaN(dt.getTime())) {
    return res.status(400).json({ error: 'startsAt inválido (use ISO, ex: 2026-06-10T14:30:00)' })
  }
  const evento = await prisma.calendarEvent.create({
    data: {
      title,
      description: description || null,
      startsAt: dt,
      allDay: !!allDay,
      remindMinutes: Number.isFinite(+remindMinutes) ? Math.max(0, +remindMinutes) : 60,
      vertical: vertical || null,
      createdBy: (req.user && req.user.name) || null,
    },
  })
  res.json(evento)
})

router.patch('/events/:id', authMw, async (req, res) => {
  const ev = await prisma.calendarEvent.findUnique({ where: { id: req.params.id } })
  if (!ev) return res.status(404).json({ error: 'Evento não encontrado' })

  const { title, description, startsAt, allDay, remindMinutes, vertical } = req.body
  const data = {}
  if (title !== undefined) data.title = title
  if (description !== undefined) data.description = description || null
  if (allDay !== undefined) data.allDay = !!allDay
  if (vertical !== undefined) data.vertical = vertical || null
  if (remindMinutes !== undefined) data.remindMinutes = Math.max(0, +remindMinutes || 0)
  if (startsAt !== undefined) {
    const dt = new Date(startsAt)
    if (isNaN(dt.getTime())) return res.status(400).json({ error: 'startsAt inválido' })
    data.startsAt = dt
    data.remindedAt = null // reagenda o lembrete se a data mudou
  }
  const updated = await prisma.calendarEvent.update({ where: { id: ev.id }, data })
  res.json(updated)
})

router.delete('/events/:id', authMw, async (req, res) => {
  const ev = await prisma.calendarEvent.findUnique({ where: { id: req.params.id } })
  if (!ev) return res.status(404).json({ error: 'Evento não encontrado' })
  await prisma.calendarEvent.delete({ where: { id: ev.id } })
  res.json({ ok: true })
})

module.exports = router
