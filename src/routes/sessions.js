const router  = require('express').Router()
const { PrismaClient } = require('@prisma/client')
const authMw  = require('../middleware/auth')
const { todayBRT, rangeStartBRT, dateKey } = require('../utils/dateUtils')
const { cappedDuration, validMinutes, diaZerado } = require('../utils/worktime')

const prisma = new PrismaClient()

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Acesso restrito ao admin.' })
  next()
}

// Check-in
router.post('/checkin', authMw, async (req, res) => {
  const openSession = await prisma.workSession.findFirst({
    where: { userId: req.user.id, date: todayBRT(), checkoutAt: null },
  })
  if (openSession) return res.status(400).json({ error: 'Já tem check-in aberto' })

  const agora = new Date()
  const session = await prisma.workSession.create({
    data: { userId: req.user.id, date: todayBRT(), checkinAt: agora, lastHeartbeatAt: agora },
  })
  res.json(session)
})

// Heartbeat (C): o front pinga enquanto o usuário está ativo. Sem heartbeat, a
// sessão é fechada como ociosa pelo auto-close (não conta tempo parado).
router.post('/heartbeat', authMw, async (req, res) => {
  const open = await prisma.workSession.findFirst({
    where: { userId: req.user.id, date: todayBRT(), checkoutAt: null },
  })
  if (!open) return res.json({ ok: false, openSession: false })
  await prisma.workSession.update({ where: { id: open.id }, data: { lastHeartbeatAt: new Date() } })
  res.json({ ok: true })
})

// Check-out (A: duração capada no teto de 5h)
router.post('/checkout', authMw, async (req, res) => {
  const openSession = await prisma.workSession.findFirst({
    where: { userId: req.user.id, date: todayBRT(), checkoutAt: null },
  })
  if (!openSession) return res.status(400).json({ error: 'Sem check-in aberto' })

  const agora = new Date()
  const updated = await prisma.workSession.update({
    where: { id: openSession.id },
    data:  { checkoutAt: agora, durationMinutes: cappedDuration(openSession.checkinAt, agora) },
  })
  res.json(updated)
})

// Sessões de hoje do usuário logado
router.get('/today', authMw, async (req, res) => {
  const sessions = await prisma.workSession.findMany({
    where:   { userId: req.user.id, date: todayBRT() },
    orderBy: { checkinAt: 'asc' },
  })
  const openSession  = sessions.find(s => !s.checkoutAt) || null
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0)
  res.json({ sessions, openSession, totalMinutes })
})

// Histórico pessoal: range = week | month | year
// Por dia: { minutes, minutesValidos, zerado, goalsCompleted, goalsTotal, activitiesCount }
router.get('/history', authMw, async (req, res) => {
  const range = req.query.range || 'week'
  const start = rangeStartBRT(range)

  const [sessions, goals, activities] = await Promise.all([
    prisma.workSession.findMany({
      where:   { userId: req.user.id, date: { gte: start }, checkoutAt: { not: null } },
      orderBy: { date: 'asc' },
    }),
    prisma.goal.findMany({ where: { userId: req.user.id, date: { gte: start } } }),
    prisma.activity.findMany({ where: { userId: req.user.id, date: { gte: start } } }),
  ])

  const grouped = {}
  const ensureDay = (key) => {
    if (!grouped[key]) grouped[key] = { minutes: 0, goalsCompleted: 0, goalsTotal: 0, activitiesCount: 0 }
  }
  for (const s of sessions) { const k = dateKey(s.date, range); ensureDay(k); grouped[k].minutes += s.durationMinutes || 0 }
  for (const g of goals) { const k = dateKey(g.date, range); ensureDay(k); grouped[k].goalsTotal++; if (g.completed) grouped[k].goalsCompleted++ }
  for (const a of activities) { const k = dateKey(a.date, range); ensureDay(k); grouped[k].activitiesCount++ }

  // B: horas válidas (zera o dia de 5h+ com < 2 atividades).
  for (const k of Object.keys(grouped)) {
    const d = grouped[k]
    d.minutesValidos = validMinutes(d.minutes, d.activitiesCount)
    d.zerado = diaZerado(d.minutes, d.activitiesCount)
  }

  res.json(grouped)
})

// Produtividade do TIME (admin): horas x entrega por pessoa/dia, com flag de dia zerado.
router.get('/produtividade', authMw, adminOnly, async (req, res) => {
  const range = req.query.range || 'week'
  const start = rangeStartBRT(range)

  const [sessions, goals, activities, users] = await Promise.all([
    prisma.workSession.findMany({ where: { date: { gte: start }, checkoutAt: { not: null } } }),
    prisma.goal.findMany({ where: { date: { gte: start } } }),
    prisma.activity.findMany({ where: { date: { gte: start } } }),
    prisma.user.findMany({ select: { id: true, name: true, color: true } }),
  ])

  const byUser = {}
  const ensure = (uid, key) => {
    byUser[uid] = byUser[uid] || { dias: {} }
    byUser[uid].dias[key] = byUser[uid].dias[key] || { minutos: 0, atividades: 0, metasConcluidas: 0, metasTotal: 0 }
  }
  for (const s of sessions) { const k = dateKey(s.date, range); ensure(s.userId, k); byUser[s.userId].dias[k].minutos += s.durationMinutes || 0 }
  for (const a of activities) { const k = dateKey(a.date, range); ensure(a.userId, k); byUser[a.userId].dias[k].atividades++ }
  for (const g of goals) { const k = dateKey(g.date, range); ensure(g.userId, k); byUser[g.userId].dias[k].metasTotal++; if (g.completed) byUser[g.userId].dias[k].metasConcluidas++ }

  const resultado = users.filter(u => byUser[u.id]).map(u => {
    const dias = Object.entries(byUser[u.id].dias).map(([data, d]) => ({
      data, ...d,
      minutosValidos: validMinutes(d.minutos, d.atividades),
      zerado: diaZerado(d.minutos, d.atividades),
    })).sort((a, b) => a.data.localeCompare(b.data))
    return {
      userId: u.id, name: u.name, color: u.color,
      totalMinutos: dias.reduce((s, d) => s + d.minutos, 0),
      totalValidos: dias.reduce((s, d) => s + d.minutosValidos, 0),
      diasZerados:  dias.filter(d => d.zerado).length,
      dias,
    }
  })

  res.json(resultado)
})

module.exports = router
