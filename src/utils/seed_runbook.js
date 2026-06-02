/**
 * Seed do Runbook "Como Trabalhamos".
 * Idempotente: faz upsert por slug — rodar de novo NÃO duplica, atualiza.
 * Uso: node src/utils/seed_runbook.js   (usa o DATABASE_URL do .env)
 *
 * conteudo é HTML compatível com o editor tiptap (h2/p/ul/li/hr/strong/em).
 */
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const PAGES = [
  {
    slug: 'auto-lei-geral',
    vertical: 'auto',
    categoria: 'lei_geral',
    titulo: 'Lei Geral — como trabalhamos no AUTO',
    ordem: 0,
    conteudo: `
<h2>O que é o AUTO</h2>
<p>AUTO é a vertical de <strong>produtos de software e IA</strong> da empresa (Kelsen, CasaPrime, IA Contábil, Arbly). Aqui a régua é <strong>qualidade e confiança acima de velocidade</strong>. No Kelsen, especificamente, a <strong>anti-alucinação é sagrada</strong>: nada que invente fonte/jurisprudência/lei vai para produção. Quebrar isso é o pior erro possível.</p>
<hr>
<h2>O método (siga sempre, sem exceção)</h2>
<p>Todo trabalho segue este ciclo, <strong>um item de cada vez</strong>:</p>
<ol>
<li><strong>Entenda a tarefa</strong> antes de codar. Se não está claro, pergunte (em bloco) antes de começar.</li>
<li><strong>Implemente</strong> só aquele item — não misture 5 mudanças num bolo.</li>
<li><strong>Teste localmente</strong> e prove que funciona (rode os testes, valide o build).</li>
<li><strong>Reporte o resultado</strong>: o que mudou, o que passou, o que ficou pendente.</li>
<li><strong>Espere o "vai"</strong> antes de deployar/dar push em produção.</li>
<li><strong>Commit + push</strong> com mensagem clara.</li>
</ol>
<hr>
<h2>Honestidade brutal (o valor nº 1)</h2>
<ul>
<li>Nunca diga "está pronto" sem ter <strong>testado</strong>. "Acho que funciona" não conta.</li>
<li>Sempre separe o que está <strong>feito e verificado</strong> do que está <strong>pendente</strong>.</li>
<li>Se quebrou, errou ou pulou uma etapa, <strong>diga na hora</strong> — esconder custa 10x mais depois.</li>
<li>Prefira reportar um problema cedo e feio do que uma surpresa tarde.</li>
</ul>
<hr>
<h2>Definition of Done (o que é "terminado")</h2>
<ul>
<li>Os testes passam e <strong>não há regressão</strong> (nada que funcionava parou).</li>
<li>Foi <strong>reportado</strong> com o resultado real.</li>
<li>Foi <strong>aprovado</strong> ("vai") e <strong>deployado</strong>.</li>
</ul>
<hr>
<h2>Como pedir ajuda (importante)</h2>
<p>Antes de perguntar "como faz X":</p>
<ol>
<li><strong>Tente</strong>. Leia a doc/código, veja um exemplo no próprio projeto, assista um vídeo se precisar.</li>
<li><strong>Junte as dúvidas</strong> e pergunte em bloco — não interrompa de 10 em 10 minutos.</li>
<li>Quando perguntar, diga <strong>o que já tentou</strong> e qual o erro exato.</li>
</ol>
<p>Autonomia é o que mais vale aqui. Quem destrava sozinho cresce rápido.</p>
<hr>
<h2>Segurança & dados (inegociável)</h2>
<ul>
<li><strong>Nunca</strong> commite segredo: <em>.env</em>, chave de API, senha, token. Confira o <em>git status</em> antes do commit.</li>
<li>Dados de cliente são sensíveis (LGPD). Não jogue em ferramenta de terceiro sem garantia.</li>
<li>Na dúvida sobre expor algo, <strong>pergunte antes</strong>.</li>
</ul>
<hr>
<h2>Ferramentas & ambientes</h2>
<ul>
<li><strong>Repos:</strong> cada projeto tem o seu (ex.: kelsen-backend / kelsen-frontend).</li>
<li><strong>Deploy:</strong> push na <em>main</em> → Railway (backend) e Vercel (frontend) publicam sozinhos. Por isso "espere o vai".</li>
<li><strong>Claude Code</strong> é a ferramenta padrão de desenvolvimento.</li>
</ul>
<p><em>As particularidades de cada projeto (stack, o que não quebrar, como rodar) estão nas páginas de "Processos" desta mesma aba.</em></p>
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

// Só executa o seed quando rodado direto (node src/utils/seed_runbook.js),
// não quando importado pelo bootSeed.
if (require.main === module) {
  main()
    .then(() => { console.log('Seed do runbook concluído.'); return prisma.$disconnect() })
    .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
}
