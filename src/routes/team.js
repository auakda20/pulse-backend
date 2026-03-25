const router = require('express').Router()
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

function today() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

// Painel público — sem autenticação
router.get('/today', async (req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, color: true },
    orderBy: { name: 'asc' },
  })

  const data = await Promise.all(users.map(async (user) => {
    const [session, goals, activities] = await Promise.all([
      prisma.dailySession.findUnique({
        where: { userId_date: { userId: user.id, date: today() } },
      }),
      prisma.goal.findMany({
        where:   { userId: user.id, date: today() },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.activity.findMany({
        where:   { userId: user.id, date: today() },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    return { user, session, goals, activities }
  }))

  res.json(data)
})

module.exports = router
