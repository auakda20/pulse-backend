const router = require('express').Router()
const { PrismaClient } = require('@prisma/client')
const authMw = require('../middleware/auth')

const prisma = new PrismaClient()

function today() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

// Registrar atividade
router.post('/', authMw, async (req, res) => {
  const { title, vertical, description } = req.body
  if (!title || !vertical) return res.status(400).json({ error: 'title e vertical obrigatórios' })

  const activity = await prisma.activity.create({
    data: { userId: req.user.id, date: today(), title, vertical, description: description || null },
  })
  res.json(activity)
})

// Atividades de hoje
router.get('/today', authMw, async (req, res) => {
  const activities = await prisma.activity.findMany({
    where:   { userId: req.user.id, date: today() },
    orderBy: { createdAt: 'desc' },
  })
  res.json(activities)
})

// Deletar atividade
router.delete('/:id', authMw, async (req, res) => {
  const activity = await prisma.activity.findUnique({ where: { id: Number(req.params.id) } })
  if (!activity || activity.userId !== req.user.id) return res.status(404).json({ error: 'Atividade não encontrada' })

  await prisma.activity.delete({ where: { id: activity.id } })
  res.json({ ok: true })
})

module.exports = router
