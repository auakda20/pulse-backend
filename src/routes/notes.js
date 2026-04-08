const router = require('express').Router()
const { PrismaClient } = require('@prisma/client')
const authMw = require('../middleware/auth')
const { todayBRT } = require('../utils/dateUtils')

const prisma = new PrismaClient()

// Buscar nota de hoje (ou de uma data específica ?date=YYYY-MM-DD)
router.get('/today', authMw, async (req, res) => {
  const date = req.query.date
    ? new Date(req.query.date + 'T00:00:00.000Z')
    : todayBRT()

  const note = await prisma.note.findUnique({
    where: { userId_date: { userId: req.user.id, date } },
  })
  res.json(note || { content: '' })
})

// Salvar/atualizar nota (upsert)
router.put('/today', authMw, async (req, res) => {
  const { content, date: dateStr } = req.body
  const date = dateStr ? new Date(dateStr + 'T00:00:00.000Z') : todayBRT()

  const note = await prisma.note.upsert({
    where:  { userId_date: { userId: req.user.id, date } },
    update: { content },
    create: { userId: req.user.id, date, content },
  })
  res.json(note)
})

module.exports = router
