const router = require('express').Router()
const { PrismaClient } = require('@prisma/client')
const authMw = require('../middleware/auth')

const prisma = new PrismaClient()

function todayDate() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function rangeStart(range) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  if (range === 'week')  d.setDate(d.getDate() - 6)
  if (range === 'month') d.setDate(d.getDate() - 29)
  if (range === 'year')  { d.setMonth(d.getMonth() - 11); d.setDate(1) }
  return d
}

// Check-in
router.post('/checkin', authMw, async (req, res) => {
  const openSession = await prisma.workSession.findFirst({
    where: { userId: req.user.id, date: todayDate(), checkoutAt: null },
  })
  if (openSession) return res.status(400).json({ error: 'Já tem check-in aberto' })

  const session = await prisma.workSession.create({
    data: { userId: req.user.id, date: todayDate(), checkinAt: new Date() },
  })
  res.json(session)
})

// Check-out
router.post('/checkout', authMw, async (req, res) => {
  const openSession = await prisma.workSession.findFirst({
    where: { userId: req.user.id, date: todayDate(), checkoutAt: null },
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
    where:   { userId: req.user.id, date: todayDate() },
    orderBy: { checkinAt: 'asc' },
  })
  const openSession   = sessions.find(s => !s.checkoutAt) || null
  const totalMinutes  = sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0)
  res.json({ sessions, openSession, totalMinutes })
})

// Histórico pessoal: range = week | month | year
router.get('/history', authMw, async (req, res) => {
  const range = req.query.range || 'week'
  const sessions = await prisma.workSession.findMany({
    where: {
      userId:     req.user.id,
      date:       { gte: rangeStart(range) },
      checkoutAt: { not: null },
    },
    orderBy: { date: 'asc' },
  })

  const grouped = {}
  for (const s of sessions) {
    const key = range === 'year'
      ? s.date.toISOString().slice(0, 7)
      : s.date.toISOString().slice(0, 10)
    grouped[key] = (grouped[key] || 0) + (s.durationMinutes || 0)
  }
  res.json(grouped)
})

module.exports = router
