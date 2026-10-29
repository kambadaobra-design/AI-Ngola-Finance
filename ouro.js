// PERGUNTAS DE OURO da Ngola: o que ela deve responder, para medirmos cada melhoria.
// Estado: "proposto" = escrito por Claude a partir do conteúdo das aulas; tu confirmas/corriges.
// Tipos de esperado:  pronta (resposta geral) · conteudo (trecho de livro/aula certo) · naopercebi (recusa) · naoConteudo (não pode fingir que sabe)
const P = (q, intencoes, cat = "Finanças pessoais") => ({ cat, q, esp: { tipo: ["pronta"], intencao: intencoes } });
const L = (q, livro, locs, cat) => ({ cat, q, esp: { livro, locs } });
const R = q => ({ cat: "Recusa (fora do assunto)", q, esp: { tipo: ["naopercebi"] } });
const I = (q, termo) => ({ cat: "Índices de leis (só títulos)", q, esp: { indiceTermo: termo } });
const AR = q => ({ cat: "Áreas do saber", q, esp: { tipo: ["areas"] } });
const DA = (q, area) => ({ cat: "Áreas do saber", q, esp: { area } });   // sem conteúdo ainda, mas a Ngola sabe de que área é
const S = q => ({ cat: "Sem conteúdo (não inventar)", q, esp: { naoConteudo: true } });

const OURO = [
  // --- Social e identidade ---
  P("Oi", ["saudacao"], "Social"), P("bom dia", ["saudacao"], "Social"),
  P("quem és tu?", ["sobre_ngola"], "Social"), P("és humana?", ["sobre_ngola"], "Social"),
  P("o que sabes fazer?", ["sobre_ngola", "saudacao"], "Social"),
  P("boa, está a crescer meu filho Ngola, kkkk", ["conversa"], "Social"), P("obrigado", ["conversa"], "Social"),
  // --- Finanças pessoais ---
  P("quero poupar dinheiro", ["poupar"]), P("como poupar dinheiro?", ["poupar"]),
  P("Guardar dinheiro é melhor no banco ou em casa?", ["poupar"]),
  P("quanto custa o dolar", ["cambio"]), P("qual o cambio do dolar hoje", ["cambio"]),
  P("preciso de um emprestimo", ["credito"]), P("Quero fazer um empréstimo, como faço?", ["credito"]),
  P("como controlar gastos", ["orcamento"]), P("como fazer um orçamento mensal", ["orcamento"]),
  P("o que são certificados de aforro?", ["investir"]),
  // --- Fora do assunto: tem de recusar ---
  R("qual a capital de França"), R("o que é a capital do Brasil"), R("receita de funge"),
  R("quem ganhou o jogo de futebol"), R("conta-me uma piada"),
  // --- Programação (conteúdo das aulas de Python) ---
  L("como funciona o tratamento de erros try except", "Python", [7, 8], "Programação"),
  L("o que são classes abstratas e polimorfismo", "Python", [20], "Programação"),
  L("como criar uma base de dados sqlite", "Python", [13, 14], "Programação"),
  L("como escrever testes unitarios com unittest", "Python", [23, 24], "Programação"),
  L("como fazer web scraping com beautifulsoup", "Python", [25, 26], "Programação"),
  L("o que é uma variável em python", "Python", [1, 2], "Programação"),
  L("como usar threads em python", "Python", [21, 22], "Programação"),
  L("o que é uma função em python", "Python", [5, 6], "Programação"),
  L("como fazer um ciclo for em python", "Python", [3, 4], "Programação"),
  P("Sabes programar?", ["programacao"], "Programação"),
  // --- Banca (conteúdo das Aulas 1-10 do curso) ---
  L("o que é moeda", "Banca", [1, 2], "Banca"),
  L("o que é liquidez bancária", "Banca", [1, 2, 6], "Banca"),
  L("como os bancos criam depósitos", "Banca", [2], "Banca"),
  L("qual a estrutura de capital ideal", "Banca", [7, 8], "Banca"),
  L("o que é inflação", "Banca", [1, 5], "Banca"),
  L("como se calcula o valor presente líquido?", "Banca", [3, 5], "Finanças corporativas (aulas)"),
  L("o que é o custo de capital?", "Banca", [7], "Finanças corporativas (aulas)"),
  L("o que é o WACC?", "Banca", [5, 7, 8], "Finanças corporativas (aulas)"),
  L("como os bancos lucram com o credito?", "Banca", [2, 3, 4, 9, 10], "Banca"),
  // --- Áreas do saber (a Ngola reconhece o tema mesmo sem conteúdo; ao carregares conteúdo, muda estes casos) ---
  AR("que áreas conheces?"), AR("sobre que temas sabes falar?"), AR("o que tens na biblioteca?"),
  DA("o que é o IVA?", "direito_fiscal"), DA("qual a pena para quem comete furto?", "direito_penal"),
  DA("o que é uma pauta aduaneira?", "direito_aduaneiro"),
  DA("qual a diferença entre custos fixos e custos variáveis?", "contabilidade_gestao"), DA("o que é a elasticidade da procura?", "microeconomia"),
  DA("como se faz um balanço contabilístico?", "contabilidade_financeira"), DA("o que é uma sociedade por quotas?", "direito_comercial"),
  // --- Índices de leis (a Ngola só tem os títulos do Código de Processo Civil, não o texto dos artigos) ---
  I("em que artigo do código de processo civil está a acareação?", "642"), I("o que é o arresto?", "Arresto"),
  I("o que é o agravo?", "Agravo"), I("como funciona o inventário?", "inventário"),
  I("que artigo trata das acções de honorários?", "76"),
  // --- Temas sem aula carregada: a Ngola NÃO pode fingir que sabe ---
  S("o que é um credito pessoal?"), S("qual a taxa maxima de juros permitida no mercado angolano?"),
  S("o que é uma taxa de esforço?"), S("quantos tipos de credito existe, quais as modalidades no nosso mercado?"),
  S("até quantas parcelas é permitido paga o credito?"), S("como funciona a reputação para pedir credito de um individuo?"),
  S("qual o lucro maximo se existe, de um banco?"),
];

function avaliarOuro(c, r) {
  const e = c.esp;
  if (e.indiceTermo) return { ok: r.tipo === "indice" && r.indice.some(a => a.t.toLowerCase().includes(e.indiceTermo.toLowerCase())), obs: r.tipo + (r.indice ? " · " + r.indice[0].t.slice(0, 45) : "") };
  if (e.area) return { ok: r.tipo === "semconteudo" && r.areas.some(a => a.id === e.area), obs: r.tipo + (r.areas ? " · " + r.areas.map(a => a.id).join("/") : "") };
  if (e.naoConteudo) return { ok: r.tipo !== "conteudo", obs: r.tipo };
  if (e.locs) {
    if (r.tipo !== "conteudo") return { ok: false, obs: r.tipo };
    const a = r.conteudo[0], nums = (a.loc.match(/\d+/g) || []).map(Number);
    return { ok: a.livro.includes(e.livro) && nums.some(n => e.locs.includes(n)), obs: a.livro.split(" (")[0] + " · " + a.loc };
  }
  return { ok: e.tipo.includes(r.tipo) && (!e.intencao || e.intencao.includes(r.intencao)), obs: r.tipo + (r.intencao ? " · " + r.intencao : "") };
}

function correrOuro() { return OURO.map(c => ({ ...c, ...avaliarOuro(c, rotear(c.q)) })); }
