require('dotenv').config()
const express = require('express')
const cors    = require('cors')

const app = express()

app.use(cors({
  origin: (origin, cb) => cb(null, true), // permite qualquer origin (Vercel + localhost)
  credentials: true,
}))
app.use(express.json())

app.use('/api/auth',       require('./routes/auth'))
app.use('/api/sessions',   require('./routes/sessions'))
app.use('/api/goals',      require('./routes/goals'))
app.use('/api/activities', require('./routes/activities'))
app.use('/api/team',       require('./routes/team'))
app.use('/api/notes',      require('./routes/notes'))
app.use('/api/demands',    require('./routes/demands'))
app.use('/api/pendencias', require('./routes/pendencias'))
app.use('/api/runbook',    require('./routes/runbook'))
app.use('/api/projects',   require('./routes/projects'))
app.use('/api/users',      require('./routes/users'))
app.use('/api/metrics',    require('./routes/metrics'))
app.use('/api/calendar',   require('./routes/calendar'))

app.get('/health', (_, res) => res.json({ ok: true }))


const bootSeed = require('./utils/bootSeed')
const { checkReminders } = require('./utils/reminders')
const { autoCloseStale } = require('./utils/worktime')
const { PrismaClient } = require('@prisma/client')
const _prisma = new PrismaClient()
const PORT = process.env.PORT || 3002
app.listen(PORT, async () => {
  console.log(`Pulse backend rodando na porta ${PORT}`)
  await bootSeed()  // popula banco vazio (usuários + runbook); no-op se já tem dados

  // Lembretes do calendário: checa a cada 5 min e notifica via Pulse (Discord/WhatsApp).
  setInterval(() => {
    checkReminders().catch((e) => console.error('[reminders] erro (ignorado):', e.message))
  }, 5 * 60 * 1000)

  // Anti-farm: fecha sessões ociosas (sem heartbeat) ou que estouraram o teto de 5h.
  setInterval(() => {
    autoCloseStale(_prisma).catch((e) => console.error('[worktime] auto-close erro (ignorado):', e.message))
  }, 5 * 60 * 1000)
})
