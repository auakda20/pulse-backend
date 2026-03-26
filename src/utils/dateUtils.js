// Retorna midnight UTC do dia atual no fuso de Brasília (BRT, UTC-3)
// Garante que o "dia" vire às 00:00 BRT e não em outro horário
function todayBRT() {
  const brtDate = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  return new Date(brtDate + 'T00:00:00.000Z')
}

// Retorna a data de início do range no fuso BRT
function rangeStartBRT(range) {
  const d = todayBRT()
  if (range === 'week')  d.setUTCDate(d.getUTCDate() - 6)
  if (range === 'month') d.setUTCDate(d.getUTCDate() - 29)
  if (range === 'year')  { d.setUTCMonth(d.getUTCMonth() - 11); d.setUTCDate(1) }
  return d
}

// Converte um Date vindo do DB (@db.Date = midnight UTC) para chave de string
function dateKey(date, range) {
  return range === 'year'
    ? date.toISOString().slice(0, 7)
    : date.toISOString().slice(0, 10)
}

module.exports = { todayBRT, rangeStartBRT, dateKey }
