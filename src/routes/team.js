const router = require('express').Router()
const { PrismaClient } = require('@prisma/client')

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

// Painel público de hoje — sem autenticação
router.get('/today', async (req, res) => {
  const users = await prisma.user.findMany({
    select:  { id: true, name: true, color: true },
    orderBy: { name: 'asc' },
  })

  const data = await Promise.all(users.map(async (user) => {
    const [sessions, goals, activities] = await Promise.all([
      prisma.workSession.findMany({
        where:   { userId: user.id, date: todayDate() },
        orderBy: { checkinAt: 'asc' },
      }),
      prisma.goal.findMany({
        where:   { userId: user.id, date: todayDate() },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.activity.findMany({
        where:   { userId: user.id, date: todayDate() },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    const openSession  = sessions.find(s => !s.checkoutAt) || null
    const totalMinutes = sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0)

    return { user, session: { openSession, totalMinutes, sessions }, goals, activities }
  }))

  res.json(data)
})

// Histórico do time — sem autenticação
router.get('/history', async (req, res) => {
  const range = req.query.range || 'week'

  const users = await prisma.user.findMany({
    select:  { id: true, name: true, color: true },
    orderBy: { name: 'asc' },
  })

  const data = await Promise.all(users.map(async (user) => {
    const sessions = await prisma.workSession.findMany({
      where: {
        userId:     user.id,
        date:       { gte: rangeStart(range) },
        checkoutAt: { not: null },
      },
      orderBy: { date: 'asc' },
    })

    const days = {}
    for (const s of sessions) {
      const key = range === 'year'
        ? s.date.toISOString().slice(0, 7)
        : s.date.toISOString().slice(0, 10)
      days[key] = (days[key] || 0) + (s.durationMinutes || 0)
    }

    return { user, days }
  }))

  res.json(data)
})

module.exports = router
