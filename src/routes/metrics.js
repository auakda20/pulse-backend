const router = require('express').Router()
const { PrismaClient } = require('@prisma/client')
const authMw = require('../middleware/auth')

const prisma = new PrismaClient()

// Métricas são EXCLUSIVAS do admin — inclusive a LEITURA (membros não veem).
function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Acesso restrito ao admin.' })
  next()
}

// Listar todos os snapshots (admin)
router.get('/', authMw, adminOnly, async (req, res) => {
  const snaps = await prisma.kpiSnapshot.findMany({ orderBy: { mes: 'asc' } })
  res.json(snaps)
})

// Upsert do mês (admin)
router.put('/:mes', authMw, adminOnly, async (req, res) => {
  const mes = req.params.mes
  if (!/^\d{4}-\d{2}$/.test(mes)) return res.status(400).json({ error: 'Mês inválido (use YYYY-MM).' })

  const b = req.body || {}
  const num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0)
  // projetos: normaliza p/ [{nome, mrr, receita}]
  let projetos = '[]'
  try {
    const arr = Array.isArray(b.projetos) ? b.projetos : []
    projetos = JSON.stringify(arr.map(p => ({ nome: String(p.nome || ''), mrr: num(p.mrr), receita: num(p.receita) })).filter(p => p.nome))
  } catch { projetos = '[]' }

  const data = {
    caixa: num(b.caixa), gastos: num(b.gastos),
    kelsenCadastros: Math.round(num(b.kelsenCadastros)),
    kelsenTestando:  Math.round(num(b.kelsenTestando)),
    kelsenPagantes:  Math.round(num(b.kelsenPagantes)),
    projetos,
  }
  const snap = await prisma.kpiSnapshot.upsert({
    where: { mes }, update: data, create: { mes, ...data },
  })
  res.json(snap)
})

// Remover um mês (admin)
router.delete('/:mes', authMw, adminOnly, async (req, res) => {
  try {
    await prisma.kpiSnapshot.delete({ where: { mes: req.params.mes } })
    res.status(204).end()
  } catch {
    res.status(404).json({ error: 'Mês não encontrado.' })
  }
})

module.exports = router
