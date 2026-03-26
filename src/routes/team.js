const router = require('express').Router()
const { PrismaClient } = require('@prisma/client')
const { todayBRT, rangeStartBRT, dateKey } = require('../utils/dateUtils')

const prisma = new PrismaClient()

// Painel público de hoje — sem autenticação
router.get('/today', async (req, res) => {
  const users = await prisma.user.findMany({
    select:  { id: true, name: true, color: true },
    orderBy: { name: 'asc' },
  })

  const data = await Promise.all(users.map(async (user) => {
    const [sessions, goals, activities] = await Promise.all([
      prisma.workSession.findMany({
        where:   { userId: user.id, date: todayBRT() },
        orderBy: { checkinAt: 'asc' },
      }),
      prisma.goal.findMany({
        where:   { userId: user.id, date: todayBRT() },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.activity.findMany({
        where:   { userId: user.id, date: todayBRT() },
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
// Retorna por dia: { minutes, goalsCompleted, goalsTotal, activitiesCount }
router.get('/history', async (req, res) => {
  const range = req.query.range || 'week'
  const start = rangeStartBRT(range)

  const users = await prisma.user.findMany({
    select:  { id: true, name: true, color: true },
    orderBy: { name: 'asc' },
  })

  const data = await Promise.all(users.map(async (user) => {
    const [sessions, goals, activities] = await Promise.all([
      prisma.workSession.findMany({
        where:   { userId: user.id, date: { gte: start }, checkoutAt: { not: null } },
        orderBy: { date: 'asc' },
      }),
      prisma.goal.findMany({
        where: { userId: user.id, date: { gte: start } },
      }),
      prisma.activity.findMany({
        where: { userId: user.id, date: { gte: start } },
      }),
    ])

    const days = {}
    const ensureDay = (key) => {
      if (!days[key]) days[key] = { minutes: 0, goalsCompleted: 0, goalsTotal: 0, activitiesCount: 0 }
    }

    for (const s of sessions) {
      const key = dateKey(s.date, range)
      ensureDay(key)
      days[key].minutes += s.durationMinutes || 0
    }
    for (const g of goals) {
      const key = dateKey(g.date, range)
      ensureDay(key)
      days[key].goalsTotal++
      if (g.completed) days[key].goalsCompleted++
    }
    for (const a of activities) {
      const key = dateKey(a.date, range)
      ensureDay(key)
      days[key].activitiesCount++
    }

    return { user, days }
  }))

  res.json(data)
})

module.exports = router
