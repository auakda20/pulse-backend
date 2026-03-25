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

app.get('/health', (_, res) => res.json({ ok: true }))

app.post('/setup', async (req, res) => {
  const bcrypt = require('bcryptjs')
  const { PrismaClient } = require('@prisma/client')
  const prisma = new PrismaClient()
  const USERS = [
    { name: 'Admin',    email: 'auak8h@gmail.com',          password: 'Davinci@88',  color: '#6366f1', role: 'admin'  },
    { name: 'Nicholas', email: 'nick.20042827@gmail.com',    password: 'nicholas27',  color: '#10b981', role: 'member' },
    { name: 'Victor',   email: 'victorcabralcd1@gmail.com',  password: 'cabral123',   color: '#f59e0b', role: 'member' },
  ]
  try {
    const { execSync } = require('child_process')
    execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' })
    for (const u of USERS) {
      const hash = await bcrypt.hash(u.password, 10)
      await prisma.user.upsert({ where: { email: u.email }, update: { name: u.name, password: hash, color: u.color, role: u.role }, create: { ...u, password: hash } })
    }
    await prisma.$disconnect()
    res.json({ ok: true, msg: 'Tabelas criadas e usuários inseridos!' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

const PORT = process.env.PORT || 3002
app.listen(PORT, () => console.log(`Pulse backend rodando na porta ${PORT}`))
