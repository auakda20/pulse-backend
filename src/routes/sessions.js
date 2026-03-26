const router  = require('express').Router()
const { PrismaClient } = require('@prisma/client')
const authMw  = require('../middleware/auth')
const { todayBRT, rangeStartBRT, dateKey } = require('../utils/dateUtils')

const prisma = new PrismaClient()

// Check-in
router.post('/checkin', authMw, async (req, res) => {
  const openSession = await prisma.workSession.findFirst({
    where: { userId: req.user.id, date: todayBRT(), checkoutAt: null },
  })
  if (openSession) return res.status(400).json({ error: 'Já tem check-in aberto' })

  const session = await prisma.workSession.create({
    data: { userId: req.user.id, date: todayBRT(), checkinAt: new Date() },
  })
  res.json(session)
})

// Check-out
router.post('/checkout', authMw, async (req, res) => {
  const openSession = await prisma.workSession.findFirst({
    where: { userId: req.user.id, date: todayBRT(), checkoutAt: null },
  })
  if (!openSession) return res.status(400).json({ error: 'Sem check-in aberto' })

  const durationMinutes = Math.round((new Date() - new Date(openSession.checkinAt)) / 60000)
  const updated = await prisma.workSession.update({
    where: { id: openSession.id },
    data:  { checkoutAt: new Date(), durationMinutes },
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
// Retorna por dia: { minutes, goalsCompleted, goalsTotal, activitiesCount }
router.get('/history', authMw, async (req, res) => {
  const range = req.query.range || 'week'
  const start = rangeStartBRT(range)

  const [sessions, goals, activities] = await Promise.all([
    prisma.workSession.findMany({
      where:   { userId: req.user.id, date: { gte: start }, checkoutAt: { not: null } },
      orderBy: { date: 'asc' },
    }),
    prisma.goal.findMany({
      where: { userId: req.user.id, date: { gte: start } },
    }),
    prisma.activity.findMany({
      where: { userId: req.user.id, date: { gte: start } },
    }),
  ])

  const grouped = {}
  const ensureDay = (key) => {
    if (!grouped[key]) grouped[key] = { minutes: 0, goalsCompleted: 0, goalsTotal: 0, activitiesCount: 0 }
  }

  for (const s of sessions) {
    const key = dateKey(s.date, range)
    ensureDay(key)
    grouped[key].minutes += s.durationMinutes || 0
  }
  for (const g of goals) {
    const key = dateKey(g.date, range)
    ensureDay(key)
    grouped[key].goalsTotal++
    if (g.completed) grouped[key].goalsCompleted++
  }
  for (const a of activities) {
    const key = dateKey(a.date, range)
    ensureDay(key)
    grouped[key].activitiesCount++
  }

  res.json(grouped)
})

module.exports = router
