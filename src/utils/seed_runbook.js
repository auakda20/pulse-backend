/**
 * Conteúdo do Runbook "Como Trabalhamos".
 * Idempotente: rodar direto faz upsert por slug. O bootSeed só cria as que faltam
 * (nunca sobrescreve edição do admin). conteudo = HTML do editor tiptap.
 * Uso direto: node src/utils/seed_runbook.js
 */
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const PAGES = [
  // ───────────────────────── AUTO · LEI GERAL ─────────────────────────
  {
    slug: 'auto-lei-geral', vertical: 'auto', categoria: 'lei_geral', ordem: 0,
    titulo: 'Lei Geral — como trabalhamos no AUTO',
    conteudo: `
<h2>O que é o AUTO</h2>
<p>AUTO é a vertical de <strong>produtos de software e IA</strong> (Kelsen, CasaPrime, IA Contábil, Arbly). A régua aqui é <strong>qualidade e confiança acima de velocidade</strong>. No Kelsen, a <strong>anti-alucinação é sagrada</strong>: nada que invente fonte/jurisprudência/lei vai para produção.</p>
<hr>
<h2>O método (sempre, um item de cada vez)</h2>
<ol>
<li><strong>Entenda a tarefa</strong> antes de codar. Dúvida? Pergunte (em bloco) antes de começar.</li>
<li><strong>Implemente</strong> só aquele item — não misture 5 mudanças.</li>
<li><strong>Teste localmente</strong> e prove que funciona (rode testes/valide build).</li>
<li><strong>Reporte</strong>: o que mudou, o que passou, o que ficou pendente.</li>
<li><strong>Espere o "vai"</strong> antes de deployar em produção.</li>
<li><strong>Commit + push</strong> com mensagem clara.</li>
</ol>
<hr>
<h2>Honestidade brutal (valor nº 1)</h2>
<ul>
<li>Nunca diga "pronto" sem ter <strong>testado</strong>.</li>
<li>Separe sempre o que está <strong>feito e verificado</strong> do que está <strong>pendente</strong>.</li>
<li>Errou/quebrou/pulou etapa? <strong>Fale na hora.</strong></li>
</ul>
<hr>
<h2>Definition of Done</h2>
<ul>
<li>Testes passam e <strong>não há regressão</strong>.</li>
<li>Foi <strong>reportado</strong> com o resultado real.</li>
<li>Foi <strong>aprovado</strong> e <strong>deployado</strong>.</li>
</ul>
<hr>
<h2>Como pedir ajuda</h2>
<ol>
<li><strong>Tente</strong>: leia doc/código, veja um exemplo no próprio projeto, assista um vídeo.</li>
<li><strong>Junte as dúvidas</strong> e pergunte em bloco — não interrompa de 10 em 10 min.</li>
<li>Diga <strong>o que já tentou</strong> e o erro exato.</li>
</ol>
<p>Autonomia é o que mais vale. Quem destrava sozinho cresce rápido.</p>
<hr>
<h2>Segurança & dados (inegociável)</h2>
<ul>
<li><strong>Nunca</strong> commite segredo (.env, chave, senha, token). Confira o <em>git status</em> antes do commit.</li>
<li>Dado de cliente é sensível (LGPD). Não jogue em ferramenta de terceiro sem garantia.</li>
<li>Na dúvida sobre expor algo, <strong>pergunte antes</strong>.</li>
</ul>
<hr>
<h2>Ferramentas & deploy</h2>
<ul>
<li><strong>Repos:</strong> cada projeto tem o seu (backend/frontend separados).</li>
<li><strong>Deploy:</strong> push na <em>main</em> → Railway (backend) e Vercel (frontend) publicam sozinhos. Por isso "espere o vai".</li>
<li><strong>Claude Code</strong> é a ferramenta padrão de dev.</li>
</ul>
<p><em>Particularidades de cada projeto: nas páginas de "Processos" desta aba.</em></p>
`.trim(),
  },

  // ───────────────────────── AUTO · PROCESSOS ─────────────────────────
  {
    slug: 'auto-kelsen', vertical: 'auto', categoria: 'processo', ordem: 0,
    titulo: 'Kelsen — IA jurídica (produto nº1)',
    conteudo: `
<h2>O que é</h2>
<p>IA jurídica premium: gera petições/contratos/peças fundamentadas em jurisprudência <strong>real e verificável</strong>. Posicionamento: <em>"a única IA jurídica que não alucina"</em>. É o produto principal da empresa.</p>
<hr>
<h2>A regra de ouro: anti-alucinação é SAGRADA</h2>
<ul>
<li>Toda citação tem <strong>fonte real com link</strong>. Sem fonte → o sistema <strong>avisa</strong>, não inventa.</li>
<li>Há uma <strong>2ª passada (Opus)</strong> que confere tese vs ementa real e sinaliza lei revogada.</li>
<li>Mexeu em geração/jurisprudência/validação? <strong>Teste anti-alucinação antes.</strong> Quebrar isso é o pior erro possível — destrói a marca.</li>
</ul>
<hr>
<h2>Stack & repos</h2>
<ul>
<li><strong>kelsen-backend</strong>: Python, FastAPI, SQLAlchemy, Postgres (Railway), migrations Alembic.</li>
<li><strong>kelsen-frontend</strong>: React + Vite + Tailwind, deploy Vercel.</li>
<li>IA: Claude via <em>services/llm_client.py</em> (modelos centralizados em <em>MODEL_OPUS/SONNET/HAIKU</em>).</li>
</ul>
<hr>
<h2>Como rodar / testar</h2>
<ul>
<li>Testes: <strong><em>pytest -m "not integration"</em></strong> (os "integration" batem em API externa/Claude — pulam no CI).</li>
<li>Antes de qualquer push: <strong>suíte verde, zero regressão.</strong></li>
<li>Migrations: Alembic (<em>0001…</em>). Banco roda <em>db push</em>? Não — Kelsen usa <strong>migrations versionadas</strong>.</li>
</ul>
<hr>
<h2>Deploy</h2>
<ul>
<li>Push na <em>main</em> → Railway (backend) + Vercel (frontend). <strong>Sempre depois do "vai".</strong></li>
<li>Variáveis sensíveis (METRICS_TOKEN, STRIPE_*, chaves) ficam no Railway, nunca no código.</li>
</ul>
<hr>
<h2>O que NÃO quebrar</h2>
<ul>
<li>Pipeline anti-alucinação (jurisprudência multi-fonte + 2ª passada + link verificável).</li>
<li>Gating por plano (Jurimetria/Risco/Due Diligence = PME+; equipe = Escritório+).</li>
<li>Cálculos jurídicos (prazos CPC com recesso forense, trabalhista). Erro de cálculo = dano ao cliente.</li>
</ul>
`.trim(),
  },
  {
    slug: 'auto-casaprime', vertical: 'auto', categoria: 'processo', ordem: 1,
    titulo: 'CasaPrime — imobiliária (web + mobile)',
    conteudo: `
<h2>O que é</h2>
<p>Plataforma para imobiliária (web + mobile). Prioridade nº2 da empresa, atrás do Kelsen — entra forte quando o Kelsen tiver MRR estável. Primeiros clientes: 3 imobiliárias da família.</p>
<hr>
<h2>Stack & repos</h2>
<ul>
<li><strong>casaprime-frontend</strong> (web), <strong>casaprime-mobile</strong> (app), <strong>imobiliaria-backend</strong>.</li>
<li><em>[completar: stack exata de cada — framework mobile, backend, banco]</em></li>
</ul>
<hr>
<h2>Status atual</h2>
<p>Parado há mais de 1 mês (foco no Kelsen). <em>[completar: o que estava em andamento e o que falta pra MVP]</em></p>
<hr>
<h2>Como rodar / deploy</h2>
<p><em>[completar: comandos de dev, onde deploya, variáveis necessárias]</em></p>
<hr>
<h2>O que NÃO quebrar</h2>
<p><em>[completar: fluxos críticos — cadastro de imóvel, busca, etc.]</em></p>
`.trim(),
  },
  {
    slug: 'auto-ia-contabil', vertical: 'auto', categoria: 'processo', ordem: 2,
    titulo: 'IA Contábil — módulo do Kelsen',
    conteudo: `
<h2>O que é</h2>
<p><strong>Não é produto novo</strong> — é um <strong>módulo do Kelsen</strong>. Entra no roadmap depois de 50+ advogados pagantes. A mesma régua anti-alucinação do Kelsen se aplica: nada de número/norma fabricada.</p>
<hr>
<h2>Status</h2>
<p>Futuro/planejado. Sem código dedicado ainda. <em>[completar quando começar: escopo do módulo, fontes de dados contábeis]</em></p>
`.trim(),
  },
  {
    slug: 'auto-arbly', vertical: 'auto', categoria: 'processo', ordem: 3,
    titulo: 'Arbly — surebets / valuebets',
    conteudo: `
<h2>O que é</h2>
<p>SaaS de apostas esportivas (surebets/valuebets). Side business, ~R$250/mês. Pedro atua como dev; Kauã direciona.</p>
<hr>
<h2>Stack & repos</h2>
<ul>
<li>Repos separados: <strong>arbly-backend</strong> + <strong>arbly-frontend</strong> (Pedro é collaborator).</li>
<li><em>[completar: stack exata]</em></li>
</ul>
<hr>
<h2>Conceito-chave: sobrevivência de conta</h2>
<p>O maior risco do usuário é a casa de aposta <strong>limitar/banir a conta</strong> quando detecta apostador com edge (stakes de calculadora, só +EV, saque imediato). O produto deve ajudar a <strong>não queimar conta</strong> (stake disfarçado, priorizar exchanges/casas sharp, mug betting) — isso retém usuário tanto quanto "achar a surebet".</p>
<hr>
<h2>O que NÃO quebrar</h2>
<p><em>[completar: cálculo de odds/arbitragem, integrações com casas]</em></p>
`.trim(),
  },

  // ───────────────────────── STUDIO · LEI GERAL ─────────────────────────
  {
    slug: 'studio-lei-geral', vertical: 'studio', categoria: 'lei_geral', ordem: 0,
    titulo: 'Lei Geral — como trabalhamos no STUDIO',
    conteudo: `
<h2>O que é o STUDIO</h2>
<p>Vertical <strong>criativa / de produção de conteúdo</strong> — o motor de caixa que financia o AUTO. Clientes ORIGINALS (Natuice, Ligue Imóveis, PraCasa, TakePics, TripX) + produção via Facilis.</p>
<hr>
<h2>Princípios</h2>
<ul>
<li><strong>Prazo de cliente é lei.</strong> Atraso queima relação e caixa.</li>
<li><strong>Padrão premium sempre</strong> — o que sai com nosso nome representa a marca.</li>
<li><strong>Volume com consistência</strong>: entregar bom e no prazo, repetidamente, vale mais que um pico genial seguido de sumiço.</li>
</ul>
<hr>
<h2>Fluxo de produção</h2>
<ol>
<li><strong>Briefing</strong> — entender o que o cliente quer (referências, tom, formato, prazo).</li>
<li><strong>Produção</strong> — criar dentro do padrão e da identidade do cliente.</li>
<li><strong>Revisão interna</strong> — nada vai pro cliente sem uma 2ª olhada.</li>
<li><strong>Entrega</strong> — no formato e prazo combinados.</li>
<li><strong>Aprovação do cliente</strong> — ajustes se preciso, registrar o aceite.</li>
</ol>
<hr>
<h2>Como pedir ajuda / reportar</h2>
<ul>
<li>Travou numa ferramenta? Tente, pesquise, e pergunte em bloco (não de 10 em 10 min).</li>
<li>Vai atrasar? <strong>Avise ANTES</strong> do prazo, não depois.</li>
</ul>
<hr>
<h2>Onde ficam as coisas</h2>
<p><em>[completar: pastas de assets, drive, ferramentas e acessos — Facilis, FreePik, Midjourney, etc.]</em></p>
`.trim(),
  },
  {
    slug: 'studio-processos', vertical: 'studio', categoria: 'processo', ordem: 0,
    titulo: 'Clientes & entregas (ORIGINALS)',
    conteudo: `
<h2>Clientes ativos</h2>
<ul>
<li><strong>Natuice</strong> — <em>[completar: tipo de entrega, volume, prazo]</em></li>
<li><strong>Ligue Imóveis / PraCasa</strong> — <em>[completar]</em></li>
<li><strong>TakePics</strong> — ~R$50/vídeo, 30-40+/mês. Produção via Facilis.</li>
<li><strong>TripX</strong> — coleções de fotos (modelos IA). Recorrente por coleção nova.</li>
</ul>
<hr>
<h2>Padrões por tipo de entrega</h2>
<p><em>[completar: specs de vídeo/foto, formatos, naming, onde subir]</em></p>
<hr>
<h2>Cadência & volume</h2>
<p><em>[completar: metas semanais/mensais por cliente]</em></p>
`.trim(),
  },
]

async function main() {
  for (const p of PAGES) {
    await prisma.runbookPage.upsert({
      where:  { slug: p.slug },
      update: { vertical: p.vertical, categoria: p.categoria, titulo: p.titulo, conteudo: p.conteudo, ordem: p.ordem },
      create: p,
    })
    console.log('runbook page upsert:', p.slug)
  }
}

module.exports = { PAGES }

if (require.main === module) {
  main()
    .then(() => { console.log('Seed do runbook concluído.'); return prisma.$disconnect() })
    .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
}
