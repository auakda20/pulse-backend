/**
 * Boot-seed protegido: roda no start do backend.
 * - Se NÃO houver usuários, cria os usuários iniciais (admin + membros).
 * - Se NÃO houver páginas de runbook, cria o conteúdo inicial (Lei Geral do AUTO).
 * Idempotente ("só se vazio"), nunca sobrescreve edições, e nunca derruba o boot.
 *
 * Resolve a fricção de não dar pra semear o banco interno do Railway de fora:
 * o próprio backend (dentro da rede do Railway) popula o banco novo no 1o deploy.
 */
const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')
const { PAGES } = require('./seed_runbook')

const prisma = new PrismaClient()

const USERS = [
  { name: 'Admin',    email: 'admin@pulse.com',   password: 'pulse123', color: '#6366f1', role: 'admin'  },
  { name: 'Membro 1', email: 'membro1@pulse.com', password: 'pulse123', color: '#10b981', role: 'member' },
  { name: 'Membro 2', email: 'membro2@pulse.com', password: 'pulse123', color: '#f59e0b', role: 'member' },
]

const PROJECTS = [
  { nome: 'Kelsen',      vertical: 'auto', status: 'ativo',     cor: '#6366f1', ordem: 0, responsavel: 'Kauã',  descricao: 'IA jurídica premium (produto nº1).' },
  { nome: 'CasaPrime',   vertical: 'auto', status: 'pausado',   cor: '#10b981', ordem: 1, responsavel: 'Kauã',  descricao: 'Plataforma imobiliária (web + mobile).' },
  { nome: 'IA Contábil', vertical: 'auto', status: 'planejado', cor: '#f59e0b', ordem: 2, responsavel: 'Kauã',  descricao: 'Módulo do Kelsen (após 50+ pagantes).' },
  { nome: 'Arbly',       vertical: 'auto', status: 'ativo',     cor: '#a855f7', ordem: 3, responsavel: 'Pedro', descricao: 'SaaS surebets/valuebets (side business).' },
  { nome: 'STUDIO',      vertical: 'studio', status: 'ativo',   cor: '#ec4899', ordem: 0, responsavel: 'Leandro', descricao: 'Produção criativa / ORIGINALS (motor de caixa).' },
]

module.exports = async function bootSeed() {
  try {
    if ((await prisma.user.count()) === 0) {
      for (const u of USERS) {
        const password = await bcrypt.hash(u.password, 10)
        await prisma.user.create({ data: { ...u, password } })
      }
      console.log('[bootSeed] usuários iniciais criados (admin@pulse.com / pulse123)')
    }

    // Por slug: cria só as páginas que ainda não existem. NUNCA sobrescreve
    // edições do admin (páginas já existentes ficam intocadas).
    let novas = 0
    for (const p of PAGES) {
      const existe = await prisma.runbookPage.findUnique({ where: { slug: p.slug } })
      if (!existe) { await prisma.runbookPage.create({ data: p }); novas++ }
    }
    if (novas) console.log(`[bootSeed] runbook: ${novas} página(s) nova(s) criada(s)`)

    // Projetos: cria só se a tabela estiver vazia (depois é gerido pela tela).
    if ((await prisma.project.count()) === 0) {
      for (const p of PROJECTS) await prisma.project.create({ data: p })
      console.log(`[bootSeed] projetos iniciais criados (${PROJECTS.length})`)
    }
  } catch (e) {
    console.error('[bootSeed] ignorado (não bloqueia o boot):', e.message)
  }
}
