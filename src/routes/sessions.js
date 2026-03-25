const router = require('express').Router()
const { PrismaClient } = require('@prisma/client')
const authMw = require('../middleware/auth')

const prisma = new PrismaClient()

function today() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

// Check-in
router.post('/checkin', authMw, async (req, res) => {
  const existing = await prisma.dailySession.findUnique({
    where: { userId_date: { userId: req.user.id, date: today() } },
  })
  if (existing) return res.status(400).json({ error: 'Check-in já realizado hoje' })

  const session = await prisma.dailySession.create({
    data: { userId: req.user.id, date: today(), checkinAt: new Date() },
  })
  res.json(session)
})

// Check-out
router.post('/checkout', authMw, async (req, res) => {
  const session = await prisma.dailySession.findUnique({
    where: { userId_date: { userId: req.user.id, date: today() } },
  })
  if (!session)       return res.status(400).json({ error: 'Sem check-in hoje' })
  if (session.checkoutAt) return res.status(400).json({ error: 'Check-out já realizado' })

  const totalMinutes = Math.round((new Date() - new Date(session.checkinAt)) / 60000)
  const updated = await prisma.dailySession.update({
    where: { id: session.id },
    data:  { checkoutAt: new Date(), totalMinutes },
  })
  res.json(updated)
})

// Sessão de hoje do usuário logado
router.get('/today', authMw, async (req, res) => {
  const session = await prisma.dailySession.findUnique({
    where: { userId_date: { userId: req.user.id, date: today() } },
  })
  res.json(session || null)
})

module.exports = router
