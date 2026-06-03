/**
 * Notificações externas do Pulse. Tudo env-gated e fail-soft:
 * - Se a credencial do canal não estiver setada, é no-op (não faz nada).
 * - Erro de rede nunca derruba a request que chamou (fire-and-forget).
 *
 * Canais:
 * - Discord  → DISCORD_WEBHOOK_URL (Webhook do canal). Recebe TODOS os eventos.
 * - WhatsApp → WHATSAPP_TOKEN + WHATSAPP_PHONE_ID (Meta Cloud API) +
 *              WHATSAPP_ALERT_TO (destinatários separados por vírgula, formato
 *              5521999999999). Recebe APENAS eventos urgentes.
 */

async function notifyDiscord(content) {
  const url = process.env.DISCORD_WEBHOOK_URL
  if (!url || !content) return
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: String(content).slice(0, 1900) }),
    })
  } catch (e) {
    console.error('[notify] Discord falhou (ignorado):', e.message)
  }
}

async function notifyWhatsApp(text) {
  const token = process.env.WHATSAPP_TOKEN
  const phoneId = process.env.WHATSAPP_PHONE_ID
  const destinos = (process.env.WHATSAPP_ALERT_TO || '')
    .split(',').map((s) => s.trim()).filter(Boolean)
  if (!token || !phoneId || !destinos.length || !text) return

  const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`
  for (const to of destinos) {
    try {
      await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: String(text).slice(0, 4096) },
        }),
      })
    } catch (e) {
      console.error('[notify] WhatsApp falhou (ignorado):', e.message)
    }
  }
}

/**
 * Dispara um evento para os canais. Discord sempre; WhatsApp só se urgent=true.
 * Fire-and-forget: NÃO use await — o erro de cada canal já é engolido internamente.
 */
function notify({ text, urgent = false }) {
  notifyDiscord(text)
  if (urgent) notifyWhatsApp(text)
}

module.exports = { notifyDiscord, notifyWhatsApp, notify }
