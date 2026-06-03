/**
 * Lembretes do calendário do Pulse. Rodado periodicamente (setInterval no app.js).
 * Dispara a notificação pelo próprio Pulse (Discord/WhatsApp via notify), em vez
 * de depender do alarme do app de calendário (que o Google ignora em feed assinado).
 *
 * Regra: para cada evento futuro com lembrete ligado e ainda não avisado, quando
 * o horário atual passa de (startsAt - remindMinutes), notifica e marca remindedAt.
 */
const { PrismaClient } = require('@prisma/client')
const { notify } = require('./notify')

const prisma = new PrismaClient()

function _quando(ev) {
  const opt = { timeZone: 'America/Sao_Paulo' }
  if (ev.allDay) return ev.startsAt.toLocaleDateString('pt-BR', opt)
  return ev.startsAt.toLocaleString('pt-BR', { ...opt, dateStyle: 'short', timeStyle: 'short' })
}

async function checkReminders(now = new Date()) {
  const eventos = await prisma.calendarEvent.findMany({
    where: { remindedAt: null, remindMinutes: { gt: 0 }, startsAt: { gt: now } },
  })
  for (const ev of eventos) {
    const fireAt = new Date(ev.startsAt.getTime() - ev.remindMinutes * 60000)
    if (now < fireAt) continue // ainda não chegou a hora de avisar
    notify({ text: `⏰ Lembrete: ${ev.title} — ${_quando(ev)}`, urgent: true })
    try {
      await prisma.calendarEvent.update({ where: { id: ev.id }, data: { remindedAt: now } })
    } catch (e) {
      console.error('[reminders] falha ao marcar remindedAt (ignorado):', e.message)
    }
  }
}

module.exports = { checkReminders }
