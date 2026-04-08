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

app.get('/health', (_, res) => res.json({ ok: true }))


const PORT = process.env.PORT || 3002
app.listen(PORT, () => console.log(`Pulse backend rodando na porta ${PORT}`))
