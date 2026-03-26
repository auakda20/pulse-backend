const router = require('express').Router()
const { PrismaClient } = require('@prisma/client')
const authMw = require('../middleware/auth')
const { todayBRT } = require('../utils/dateUtils')

const prisma = new PrismaClient()

// Criar meta
router.post('/', authMw, async (req, res) => {
  const { title, vertical } = req.body
  if (!title || !vertical) return res.status(400).json({ error: 'title e vertical obrigatórios' })

  const goal = await prisma.goal.create({
    data: { userId: req.user.id, date: todayBRT(), title, vertical },
  })
  res.json(goal)
})

// Metas de hoje
router.get('/today', authMw, async (req, res) => {
  const goals = await prisma.goal.findMany({
    where:   { userId: req.user.id, date: todayBRT() },
    orderBy: { createdAt: 'asc' },
  })
  res.json(goals)
})

// Marcar como concluída / não concluída
router.patch('/:id', authMw, async (req, res) => {
  const goal = await prisma.goal.findUnique({ where: { id: Number(req.params.id) } })
  if (!goal || goal.userId !== req.user.id) return res.status(404).json({ error: 'Meta não encontrada' })

  const updated = await prisma.goal.update({
    where: { id: goal.id },
    data:  { completed: !goal.completed },
  })
  res.json(updated)
})

// Deletar meta
router.delete('/:id', authMw, async (req, res) => {
  const goal = await prisma.goal.findUnique({ where: { id: Number(req.params.id) } })
  if (!goal || goal.userId !== req.user.id) return res.status(404).json({ error: 'Meta não encontrada' })

  await prisma.goal.delete({ where: { id: goal.id } })
  res.json({ ok: true })
})

module.exports = router
