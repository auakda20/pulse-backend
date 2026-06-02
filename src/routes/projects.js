const router = require('express').Router()
const { PrismaClient } = require('@prisma/client')
const authMw = require('../middleware/auth')

const prisma = new PrismaClient()

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Apenas o admin pode editar projetos.' })
  }
  next()
}

const CAMPOS = ['nome', 'vertical', 'status', 'descricao', 'responsavel', 'repoUrl', 'deployUrl', 'docsUrl', 'cor', 'ordem']

function pick(body) {
  const data = {}
  for (const k of CAMPOS) if (body[k] !== undefined) data[k] = k === 'ordem' ? Number(body[k]) : body[k]
  return data
}

// Leitura (todos os membros)
router.get('/', authMw, async (req, res) => {
  const where = req.query.vertical ? { vertical: req.query.vertical } : {}
  const projects = await prisma.project.findMany({
    where,
    orderBy: [{ vertical: 'asc' }, { ordem: 'asc' }, { nome: 'asc' }],
  })
  res.json(projects)
})

// Escrita (só admin)
router.post('/', authMw, adminOnly, async (req, res) => {
  const data = pick(req.body)
  if (!data.nome || !data.vertical) {
    return res.status(400).json({ error: 'nome e vertical são obrigatórios.' })
  }
  const project = await prisma.project.create({ data })
  res.status(201).json(project)
})

router.put('/:id', authMw, adminOnly, async (req, res) => {
  try {
    const project = await prisma.project.update({ where: { id: Number(req.params.id) }, data: pick(req.body) })
    res.json(project)
  } catch {
    res.status(404).json({ error: 'Projeto não encontrado.' })
  }
})

router.delete('/:id', authMw, adminOnly, async (req, res) => {
  try {
    await prisma.project.delete({ where: { id: Number(req.params.id) } })
    res.status(204).end()
  } catch {
    res.status(404).json({ error: 'Projeto não encontrado.' })
  }
})

module.exports = router
