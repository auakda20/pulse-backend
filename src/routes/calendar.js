/**
 * Feed iCalendar das Demands (deadlines do time).
 * Assinatura: adicionar a URL abaixo em Google/Apple Calendar ("assinar por URL"):
 *   GET /api/calendar/feed.ics?token=<CALENDAR_FEED_TOKEN>
 *
 * Sem auth por header (apps de calendário não enviam Authorization) — o acesso é
 * por token na query, comparado com a env CALENDAR_FEED_TOKEN. Se a env não estiver
 * setada, o feed fica desligado (503), no mesmo espírito env-gated dos outros canais.
 */
const router = require('express').Router()
const { PrismaClient } = require('@prisma/client')
const { buildICS } = require('../utils/ics')

const prisma = new PrismaClient()

router.get('/feed.ics', async (req, res) => {
  const esperado = process.env.CALENDAR_FEED_TOKEN
  if (!esperado) {
    return res.status(503).json({ error: 'Feed de calendário não configurado (CALENDAR_FEED_TOKEN ausente).' })
  }
  if (req.query.token !== esperado) {
    return res.status(403).json({ error: 'Token inválido.' })
  }

  const demands = await prisma.demand.findMany({
    where: { done: false, dueDate: { not: null } },
    orderBy: { dueDate: 'asc' },
  })

  const ics = buildICS(demands)
  res.set('Content-Type', 'text/calendar; charset=utf-8')
  res.set('Content-Disposition', 'inline; filename="pulse-demandas.ics"')
  res.send(ics)
})

module.exports = router
