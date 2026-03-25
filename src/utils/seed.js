require('dotenv').config()
const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const USERS = [
  { name: 'Admin',   email: 'admin@pulse.com',   password: 'pulse123', color: '#6366f1', role: 'admin'  },
  { name: 'Membro 1', email: 'membro1@pulse.com', password: 'pulse123', color: '#10b981', role: 'member' },
  { name: 'Membro 2', email: 'membro2@pulse.com', password: 'pulse123', color: '#f59e0b', role: 'member' },
]

async function main() {
  for (const u of USERS) {
    const hash = await bcrypt.hash(u.password, 10)
    await prisma.user.upsert({
      where:  { email: u.email },
      update: {},
      create: { ...u, password: hash },
    })
    console.log(`Usuário criado: ${u.email}`)
  }
  console.log('Seed concluído!')
}

main().catch(console.error).finally(() => prisma.$disconnect())
