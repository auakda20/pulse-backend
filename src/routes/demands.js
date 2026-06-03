const router = require('express').Router()
const { PrismaClient } = require('@prisma/client')
const authMw = require('../middleware/auth')
const { notify } = require('../utils/notify')
const { isDueToday } = require('../utils/ics')

const prisma = new PrismaClient()

// GET /demands — todas as demandas do time (requer login)
router.get('/', authMw, async (req, res) => {
  const demands = await prisma.demand.findMany({
    orderBy: [{ done: 'asc' }, { dueDate: 'asc' }, { createdAt: 'asc' }],
  })
  res.json(demands)
})

// POST /demands — criar demanda
router.post('/', authMw, async (req, res) => {
  const { text, priority = 'média', dueDate, sourceName, sourceColor, sourceType } = req.body
  if (!text || !sourceName || !sourceType) {
    return res.status(400).json({ error: 'text, sourceName e sourceType são obrigatórios' })
  }
  const demand = await prisma.demand.create({
    data: { text, priority, dueDate: dueDate || null, sourceName, sourceColor, sourceType },
  })
  // Discord sempre; WhatsApp se prioridade alta ou vencendo hoje (urgente).
  const urgente = String(demand.priority || '').toLowerCase().includes('alta') || isDueToday(demand.dueDate)
  notify({
    text: `📌 Nova demanda [${demand.sourceName}] (${demand.priority})`
      + `${demand.dueDate ? ' · vence ' + demand.dueDate : ''}: ${demand.text}`,
    urgent: urgente,
  })
  res.json(demand)
})

// PATCH /demands/:id — atualizar (done, text, priority, dueDate)
router.patch('/:id', authMw, async (req, res) => {
  const demand = await prisma.demand.findUnique({ where: { id: req.params.id } })
  if (!demand) return res.status(404).json({ error: 'Demanda não encontrada' })

  const { text, priority, dueDate, done } = req.body
  const updated = await prisma.demand.update({
    where: { id: demand.id },
    data: {
      ...(text      !== undefined && { text }),
      ...(priority  !== undefined && { priority }),
      ...(dueDate   !== undefined && { dueDate: dueDate || null }),
      ...(done      !== undefined && { done }),
    },
  })
  // Notifica o time quando uma demanda é concluída (só na transição p/ done).
  if (done === true && !demand.done) {
    notify({ text: `✅ Demanda concluída [${updated.sourceName}]: ${updated.text}` })
  }
  res.json(updated)
})

// DELETE /demands/:id
router.delete('/:id', authMw, async (req, res) => {
  const demand = await prisma.demand.findUnique({ where: { id: req.params.id } })
  if (!demand) return res.status(404).json({ error: 'Demanda não encontrada' })

  await prisma.demand.delete({ where: { id: demand.id } })
  res.json({ ok: true })
})

module.exports = router
