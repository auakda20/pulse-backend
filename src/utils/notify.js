/**
 * Notificações externas (Discord). Env-gated e fail-soft:
 * - Se DISCORD_WEBHOOK_URL não estiver setada, é no-op (não faz nada).
 * - Erro de rede nunca derruba a request que chamou.
 *
 * Para ativar: criar um Webhook no canal do Discord (Configurações do canal →
 * Integrações → Webhooks → Novo) e colar a URL na variável DISCORD_WEBHOOK_URL
 * do serviço backend no Railway.
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

module.exports = { notifyDiscord }
