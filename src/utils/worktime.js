/**
 * Regras de tempo de trabalho do Pulse — anti-"farm" de horas.
 *
 * A) Sessão contínua tem TETO (5h). Passou disso, a duração é capada.
 * C) Sessão OCIOSA (sem heartbeat há > IDLE_LIMIT) é fechada no último heartbeat —
 *    tempo parado (check-in esquecido ligado) NÃO conta.
 * B) Dia com >= 5h E menos de 2 atividades NÃO conta (minutosValidos = 0). Os dados
 *    crus (checkin/checkout) ficam preservados para auditoria.
 */
const SESSION_CAP_MIN = Number(process.env.SESSION_CAP_MIN || 300)  // 5h
const IDLE_LIMIT_MIN  = Number(process.env.IDLE_LIMIT_MIN  || 15)   // sem heartbeat = ocioso
const ZERO_DAY_MIN_HORAS = 300        // >= 5h
const ZERO_DAY_MAX_ATIVIDADES = 2     // menos de 2 atividades

// Duração de uma sessão, capada no teto.
function cappedDuration(checkinAt, endAt) {
  const mins = Math.round((new Date(endAt) - new Date(checkinAt)) / 60000)
  return Math.max(0, Math.min(mins, SESSION_CAP_MIN))
}

// "Zera o dia": 5h+ com menos de 2 atividades = farm → horas não contam.
function diaZerado(minutos, atividades) {
  return minutos >= ZERO_DAY_MIN_HORAS && atividades < ZERO_DAY_MAX_ATIVIDADES
}

// Minutos VÁLIDOS do dia (0 se zerado).
function validMinutes(minutos, atividades) {
  return diaZerado(minutos, atividades) ? 0 : minutos
}

/**
 * Fecha sessões abertas que ficaram ociosas ou estouraram o teto. Rodado por um
 * intervalo no app.js. Devolve quantas fechou.
 */
async function autoCloseStale(prisma, now = new Date()) {
  const abertas = await prisma.workSession.findMany({ where: { checkoutAt: null } })
  let fechadas = 0
  for (const s of abertas) {
    const ref = s.lastHeartbeatAt || s.checkinAt
    const ociosaMin   = (now - new Date(ref)) / 60000
    const decorridaMin = (now - new Date(s.checkinAt)) / 60000
    let end
    if (ociosaMin > IDLE_LIMIT_MIN) {
      end = new Date(ref)  // fecha no último sinal de vida — não conta o tempo parado
    } else if (decorridaMin > SESSION_CAP_MIN) {
      end = new Date(new Date(s.checkinAt).getTime() + SESSION_CAP_MIN * 60000)
    } else {
      continue  // ainda ativa e dentro do teto
    }
    await prisma.workSession.update({
      where: { id: s.id },
      data: { checkoutAt: end, durationMinutes: cappedDuration(s.checkinAt, end), autoClosed: true },
    })
    fechadas++
  }
  return fechadas
}

module.exports = {
  SESSION_CAP_MIN, IDLE_LIMIT_MIN, ZERO_DAY_MIN_HORAS, ZERO_DAY_MAX_ATIVIDADES,
  cappedDuration, diaZerado, validMinutes, autoCloseStale,
}
