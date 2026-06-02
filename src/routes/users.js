const router = require('express').Router()
const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')
const authMw = require('../middleware/auth')

const prisma = new PrismaClient()

// Toda gestão de usuários é exclusiva do admin.
function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Apenas o admin gerencia usuários.' })
  next()
}

const SELECT = { id: true, name: true, email: true, color: true, role: true, createdAt: true }

// Listar todos
router.get('/', authMw, adminOnly, async (req, res) => {
  const users = await prisma.user.findMany({ select: SELECT, orderBy: { id: 'asc' } })
  res.json(users)
})

// Criar usuário (ex.: cadastrar Pedro / Leandro)
router.post('/', authMw, adminOnly, async (req, res) => {
  const { name, email, password, role = 'member', color = '#6366f1' } = req.body
  if (!name || !email || !password || password.length < 6) {
    return res.status(400).json({ error: 'Nome, e-mail e senha (mín. 6) são obrigatórios.' })
  }
  if (await prisma.user.findUnique({ where: { email } })) {
    return res.status(400).json({ error: 'E-mail já cadastrado.' })
  }
  const hash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { name, email, password: hash, role: role === 'admin' ? 'admin' : 'member', color },
    select: SELECT,
  })
  res.status(201).json(user)
})

// Atualizar nome / cor / role de qualquer usuário
router.put('/:id', authMw, adminOnly, async (req, res) => {
  const id = Number(req.params.id)
  const { name, color, role } = req.body
  const data = {}
  if (typeof name === 'string' && name.trim()) data.name = name.trim()
  if (typeof color === 'string' && color) data.color = color
  if (role === 'admin' || role === 'member') {
    if (id === req.user.id && role !== 'admin') {
      return res.status(400).json({ error: 'Você não pode remover o seu próprio admin.' })
    }
    data.role = role
  }
  try {
    const user = await prisma.user.update({ where: { id }, data, select: SELECT })
    res.json(user)
  } catch {
    res.status(404).json({ error: 'Usuário não encontrado.' })
  }
})

// Resetar senha de um usuário
router.put('/:id/password', authMw, adminOnly, async (req, res) => {
  const { newPassword } = req.body
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Nova senha com ao menos 6 caracteres.' })
  }
  const hash = await bcrypt.hash(newPassword, 10)
  try {
    await prisma.user.update({ where: { id: Number(req.params.id) }, data: { password: hash } })
    res.json({ ok: true })
  } catch {
    res.status(404).json({ error: 'Usuário não encontrado.' })
  }
})

// Remover usuário (não pode remover a si mesmo)
router.delete('/:id', authMw, adminOnly, async (req, res) => {
  const id = Number(req.params.id)
  if (id === req.user.id) return res.status(400).json({ error: 'Você não pode remover a si mesmo.' })
  try {
    await prisma.user.delete({ where: { id } })
    res.status(204).end()
  } catch {
    res.status(404).json({ error: 'Usuário não encontrado.' })
  }
})

module.exports = router
