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

module.exports = async function bootSeed() {
  try {
    if ((await prisma.user.count()) === 0) {
      for (const u of USERS) {
        const password = await bcrypt.hash(u.password, 10)
        await prisma.user.create({ data: { ...u, password } })
      }
      console.log('[bootSeed] usuários iniciais criados (admin@pulse.com / pulse123)')
    }

    if ((await prisma.runbookPage.count()) === 0) {
      for (const p of PAGES) {
        await prisma.runbookPage.create({ data: p })
      }
      console.log(`[bootSeed] runbook inicial criado (${PAGES.length} página(s))`)
    }
  } catch (e) {
    console.error('[bootSeed] ignorado (não bloqueia o boot):', e.message)
  }
}
