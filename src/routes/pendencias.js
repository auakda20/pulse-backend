const router = require('express').Router()
const { PrismaClient } = require('@prisma/client')
const authMw = require('../middleware/auth')

const prisma = new PrismaClient()

// GET /pendencias — todas as pendências (requer login)
router.get('/', authMw, async (req, res) => {
  const pendencias = await prisma.pendencia.findMany({
    orderBy: [{ done: 'asc' }, { priority: 'asc' }, { createdAt: 'asc' }],
  })
  res.json(pendencias)
})

// POST /pendencias — criar pendência
router.post('/', authMw, async (req, res) => {
  const { text, project, priority = 'alta' } = req.body
  if (!text || !project) {
    return res.status(400).json({ error: 'text e project são obrigatórios' })
  }
  const pendencia = await prisma.pendencia.create({
    data: { text, project, priority },
  })
  res.json(pendencia)
})

// POST /pendencias/seed — seed inicial das pendências do Obsidian
router.post('/seed', authMw, async (req, res) => {
  const count = await prisma.pendencia.count()
  if (count > 0) return res.json({ seeded: false, message: 'Já existem pendências' })

  const SEED = [
    { project: 'CasaPrime',      priority: 'alta',  text: 'Deploy real — backend, frontend e mobile com URL fixa' },
    { project: 'CasaPrime',      priority: 'alta',  text: 'Configurar SMTP (Gmail ou Sendgrid) para reset de senha' },
    { project: 'CasaPrime',      priority: 'media', text: 'Upload de fotos dos imóveis' },
    { project: 'CasaPrime',      priority: 'media', text: 'Abrir PJ (desbloqueia Asaas / boleto real)' },
    { project: 'Facilis',        priority: 'media', text: 'Testar fluxo completo: criar brain → subir referência → footage → aprovar → render' },
    { project: 'SureThing',      priority: 'alta',  text: 'Completar executor Betano' },
    { project: 'SureThing',      priority: 'alta',  text: 'Estabilizar seletores Playwright (quebram com updates dos sites)' },
    { project: 'SureThing',      priority: 'alta',  text: 'Resolução automática de resultado (win/loss/void)' },
    { project: 'STUDIO',         priority: 'alta',  text: 'Documentar workflow de produção de vídeos IA (risco de processo se perder)' },
    { project: 'STUDIO',         priority: 'alta',  text: 'TripX — garantir renovação de contrato antes de junho (R$1k/mês em risco)' },
    { project: 'Launching',      priority: 'media', text: 'Inserir Google Places API Key e testar scraper RJ' },
    { project: 'ForceAds',       priority: 'media', text: 'Testar end-to-end com Claude API (aguardando créditos)' },
    { project: 'NBAProps',       priority: 'media', text: 'Adicionar auth + billing (Stripe) + deploy produção' },
    { project: 'Sonati Website', priority: 'media', text: 'Deploy no Vercel + configurar domínio sonati.studio' },
    { project: 'Onboarding',     priority: 'media', text: 'Configurar Google Calendar (credentials.json) + Resend API Key + deploy Railway' },
  ]

  await prisma.pendencia.createMany({ data: SEED })
  res.json({ seeded: true, count: SEED.length })
})

// PATCH /pendencias/:id — atualizar (done, text, priority, doneBy)
router.patch('/:id', authMw, async (req, res) => {
  const pendencia = await prisma.pendencia.findUnique({ where: { id: req.params.id } })
  if (!pendencia) return res.status(404).json({ error: 'Pendência não encontrada' })

  const { text, priority, done, doneBy } = req.body
  const updated = await prisma.pendencia.update({
    where: { id: pendencia.id },
    data: {
      ...(text     !== undefined && { text }),
      ...(priority !== undefined && { priority }),
      ...(done     !== undefined && { done }),
      ...(doneBy   !== undefined && { doneBy }),
    },
  })
  res.json(updated)
})

// DELETE /pendencias/:id
router.delete('/:id', authMw, async (req, res) => {
  const pendencia = await prisma.pendencia.findUnique({ where: { id: req.params.id } })
  if (!pendencia) return res.status(404).json({ error: 'Pendência não encontrada' })

  await prisma.pendencia.delete({ where: { id: pendencia.id } })
  res.json({ ok: true })
})

module.exports = router
