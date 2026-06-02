const router = require('express').Router()
const { PrismaClient } = require('@prisma/client')
const authMw = require('../middleware/auth')

const prisma = new PrismaClient()

// Edição é exclusiva do admin (Kauã). Leitura é liberada a qualquer membro logado.
function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Apenas o admin pode editar o runbook.' })
  }
  next()
}

function slugify(s) {
  return String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

// ── Leitura (todos os membros) ──────────────────────────────────────────────
// GET /api/runbook?vertical=auto  -> lista (ordenada). vertical é opcional.
router.get('/', authMw, async (req, res) => {
  const where = req.query.vertical ? { vertical: req.query.vertical } : {}
  const pages = await prisma.runbookPage.findMany({
    where,
    orderBy: [{ vertical: 'asc' }, { categoria: 'asc' }, { ordem: 'asc' }],
  })
  res.json(pages)
})

// GET /api/runbook/:slug
router.get('/:slug', authMw, async (req, res) => {
  const page = await prisma.runbookPage.findUnique({ where: { slug: req.params.slug } })
  if (!page) return res.status(404).json({ error: 'Página não encontrada.' })
  res.json(page)
})

// ── Escrita (apenas admin) ──────────────────────────────────────────────────
// POST /api/runbook
router.post('/', authMw, adminOnly, async (req, res) => {
  const { vertical, categoria, titulo, conteudo, ordem } = req.body
  if (!vertical || !titulo) {
    return res.status(400).json({ error: 'vertical e titulo são obrigatórios.' })
  }
  let slug = slugify(req.body.slug || `${vertical}-${titulo}`)
  // garante unicidade do slug
  if (await prisma.runbookPage.findUnique({ where: { slug } })) {
    slug = `${slug}-${Date.now().toString(36)}`
  }
  const page = await prisma.runbookPage.create({
    data: {
      vertical,
      categoria: categoria || 'processo',
      slug,
      titulo,
      conteudo: conteudo || '',
      ordem: Number.isInteger(ordem) ? ordem : 0,
    },
  })
  res.status(201).json(page)
})

// PUT /api/runbook/:id
router.put('/:id', authMw, adminOnly, async (req, res) => {
  const id = Number(req.params.id)
  const { titulo, conteudo, categoria, vertical, ordem } = req.body
  const data = {}
  if (titulo !== undefined) data.titulo = titulo
  if (conteudo !== undefined) data.conteudo = conteudo
  if (categoria !== undefined) data.categoria = categoria
  if (vertical !== undefined) data.vertical = vertical
  if (ordem !== undefined) data.ordem = Number(ordem)
  try {
    const page = await prisma.runbookPage.update({ where: { id }, data })
    res.json(page)
  } catch {
    res.status(404).json({ error: 'Página não encontrada.' })
  }
})

// DELETE /api/runbook/:id
router.delete('/:id', authMw, adminOnly, async (req, res) => {
  const id = Number(req.params.id)
  try {
    await prisma.runbookPage.delete({ where: { id } })
    res.status(204).end()
  } catch {
    res.status(404).json({ error: 'Página não encontrada.' })
  }
})

module.exports = router
