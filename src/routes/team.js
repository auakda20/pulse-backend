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

// Log do time — metas e atividades completas por dia — sem autenticação
// Retorna: [{ date, members: [{ user, goals, activities }] }]
router.get('/log', async (req, res) => {
  const range = req.query.range || 'week'
  const start = rangeStartBRT(range)

  const users = await prisma.user.findMany({
    select:  { id: true, name: true, color: true },
    orderBy: { name: 'asc' },
  })

  // Busca todos os dados de uma vez
  const [allGoals, allActivities] = await Promise.all([
    prisma.goal.findMany({
      where:   { date: { gte: start } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.activity.findMany({
      where:   { date: { gte: start } },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  // Agrupa por data
  const daysMap = {}
  const ensureDay = (dateStr) => {
    if (!daysMap[dateStr]) daysMap[dateStr] = {}
  }
  const ensureMember = (dateStr, userId) => {
    ensureDay(dateStr)
    if (!daysMap[dateStr][userId]) {
      daysMap[dateStr][userId] = { goals: [], activities: [] }
    }
  }

  for (const g of allGoals) {
    const key = dateKey(g.date, 'week') // sempre YYYY-MM-DD no log
    ensureMember(key, g.userId)
    daysMap[key][g.userId].goals.push(g)
  }
  for (const a of allActivities) {
    const key = dateKey(a.date, 'week')
    ensureMember(key, a.userId)
    daysMap[key][a.userId].activities.push(a)
  }

  const usersById = Object.fromEntries(users.map(u => [u.id, u]))

  // Formata resposta ordenada por data decrescente
  const result = Object.entries(daysMap)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, membersMap]) => ({
      date,
      members: Object.entries(membersMap)
        .map(([userId, data]) => ({
          user:       usersById[Number(userId)],
          goals:      data.goals,
          activities: data.activities,
        }))
        .filter(m => m.user)
        .sort((a, b) => a.user.name.localeCompare(b.user.name)),
    }))

  res.json(result)
})

module.exports = router
