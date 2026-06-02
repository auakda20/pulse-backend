const router  = require('express').Router()
const bcrypt  = require('bcryptjs')
const jwt     = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')
const authMw  = require('../middleware/auth')

const prisma = new PrismaClient()

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !await bcrypt.compare(password, user.password))
    return res.status(401).json({ error: 'Email ou senha incorretos' })

  const token = jwt.sign({ id: user.id, name: user.name, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' })
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, color: user.color, role: user.role } })
})

router.get('/me', authMw, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, name: true, email: true, color: true, role: true } })
  res.json(user)
})

// Atualizar perfil (nome / cor)
router.put('/me', authMw, async (req, res) => {
  const data = {}
  if (typeof req.body.name === 'string' && req.body.name.trim()) data.name = req.body.name.trim()
  if (typeof req.body.color === 'string' && req.body.color) data.color = req.body.color
  const user = await prisma.user.update({
    where: { id: req.user.id }, data,
    select: { id: true, name: true, email: true, color: true, role: true },
  })
  res.json(user)
})

// Trocar senha (exige a senha atual)
router.put('/password', authMw, async (req, res) => {
  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Informe a senha atual e uma nova com ao menos 6 caracteres.' })
  }
  const user = await prisma.user.findUnique({ where: { id: req.user.id } })
  if (!user || !await bcrypt.compare(currentPassword, user.password)) {
    return res.status(401).json({ error: 'Senha atual incorreta.' })
  }
  const hash = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({ where: { id: user.id }, data: { password: hash } })
  res.json({ ok: true })
})

module.exports = router
