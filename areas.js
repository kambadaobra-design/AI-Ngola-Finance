// NGOLA_V
(globalThis.NGOLA_V = globalThis.NGOLA_V || {}).areas = 12;

// CATÁLOGO DE ÁREAS DO SABER DA NGOLA
// - id: é o nome da "área" usada nos ficheiros livros/<id>.json (o mesmo id serve para vários livros e países)
// - palavras: servem para reconhecer de que área é uma pergunta quando ainda não há conteúdo carregado
// - fontes: sugestões do que carregar (confirma sempre a versão em vigor)
// - semDeteccao: a área tem respostas próprias e não deve ser "apanhada" pelo detetor
const GRUPOS = ["Direito", "Finanças", "Economia", "Tecnologia"];

const AREAS = (() => {
  const a = (id, nome, grupo, desc, palavras, extra = {}) => ({ id, nome, grupo, desc, palavras, ...extra });
  return [
    // ================= DIREITO (Angola em primeiro lugar) =================
    a("direito_constitucional", "Direito Constitucional", "Direito", "Constituição, direitos fundamentais, órgãos de soberania",
      ["constituição", "constitucional", "direitos fundamentais", "presidente da república", "assembleia nacional", "tribunal constitucional", "órgãos de soberania", "separação de poderes"],
      { fontes: "Constituição da República de Angola" }),
    a("direito_civil", "Direito Civil", "Direito", "Parte geral, direitos reais, sucessões",
      ["código civil", "personalidade jurídica", "capacidade jurídica", "direitos reais", "propriedade", "posse", "usucapião", "herança", "testamento", "sucessões", "registo predial", "negócio jurídico"],
      { fontes: "Código Civil; Código da Família" }),
    a("direito_obrigacoes", "Direito das Obrigações", "Direito", "Cumprimento, incumprimento, responsabilidade civil, garantias",
      ["obrigações", "responsabilidade civil", "incumprimento", "mora", "cumprimento da obrigação", "cessão de créditos", "novação", "obrigação solidária", "prescrição", "caso fortuito", "indemnização", "cláusula penal", "garantias das obrigações"],
      { fontes: "Código Civil (Livro das Obrigações)" }),
    a("direito_contratual", "Direito Contratual", "Direito", "Contratos em especial: compra e venda, locação, mandato, mútuo, fiança…",
      ["contrato", "contratos", "compra e venda", "locação", "arrendamento", "mandato", "empreitada", "mútuo", "fiança", "doação", "depósito", "comodato", "resolução do contrato", "contrato de seguro"],
      { fontes: "Código Civil (contratos em especial); legislação do arrendamento" }),
    a("direito_comercial", "Direito Comercial e Societário", "Direito", "Sociedades comerciais, insolvência, títulos de crédito",
      ["sociedade comercial", "sociedade por quotas", "sociedade anónima", "comerciante", "falência", "insolvência", "recuperação de empresas", "título de crédito", "cheque", "registo comercial", "sócio", "gerente", "dissolução da sociedade"],
      { fontes: "Lei das Sociedades Comerciais; legislação da insolvência e do registo comercial" }),
    a("direito_financeiro", "Direito Financeiro (finanças públicas)", "Direito", "Orçamento do Estado, receita e despesa pública, tesouro, dívida pública",
      ["orçamento geral do estado", "oge", "finanças públicas", "receita pública", "despesa pública", "dívida pública", "tesouro nacional", "lei de bases do orçamento", "execução orçamental", "tribunal de contas", "conta geral do estado"],
      { fontes: "Legislação de finanças públicas e do Orçamento Geral do Estado" }),
    a("direito_bancario", "Direito Bancário e dos Mercados", "Direito", "Regulação bancária, BNA, instituições financeiras, valores mobiliários, seguros",
      ["banco nacional de angola", "bna", "instituições financeiras", "lei das instituições financeiras", "licença bancária", "supervisão bancária", "valores mobiliários", "bodiva", "comissão do mercado de capitais", "sistema financeiro", "arseg", "depósitos bancários", "crédito ao consumo", "taxa de juro máxima", "aviso do bna"],
      { fontes: "Lei do BNA; Lei das Instituições Financeiras; avisos e instrutivos do BNA; Código dos Valores Mobiliários" }),
    a("direito_fiscal", "Direito Fiscal", "Direito", "Impostos, contribuintes, procedimento e infrações tributárias",
      ["imposto", "impostos", "iva", "irt", "imposto industrial", "imposto de selo", "imposto predial", "código geral tributário", "cgt", "contribuinte", "administração geral tributária", "agt", "liquidação do imposto", "isenção fiscal", "evasão fiscal", "declaração fiscal", "nif", "retenção na fonte", "imposto sobre o rendimento"],
      { fontes: "Código Geral Tributário; códigos e leis dos principais impostos (IVA, IRT, Imposto Industrial, Selo…)" }),
    a("direito_aduaneiro", "Direito Aduaneiro", "Direito", "Código aduaneiro, pauta aduaneira, importação e exportação",
      ["aduana", "aduaneiro", "pauta aduaneira", "código aduaneiro", "direitos aduaneiros", "despacho aduaneiro", "contrabando", "valor aduaneiro", "origem das mercadorias", "regime aduaneiro", "classificação pautal", "sistema harmonizado", "regime de trânsito", "taxa aduaneira"],
      { fontes: "Código Aduaneiro; Pauta Aduaneira (versão em vigor)" }),
    a("direito_penal", "Direito Penal", "Direito", "Crimes, penas, crimes económico-financeiros",
      ["código penal", "crime", "crimes", "pena", "penas", "homicídio", "furto", "roubo", "burla", "corrupção", "branqueamento de capitais", "peculato", "prisão", "contravenção", "dolo", "tentativa"],
      { fontes: "Código Penal; legislação sobre crimes económicos e branqueamento de capitais" }),
    a("direito_processual", "Direito Processual", "Direito", "Processo civil e penal, recursos, execução",
      ["código de processo civil", "processo civil", "processo penal", "petição inicial", "contestação", "recurso", "sentença", "citação", "penhora", "execução", "prazo processual", "providência cautelar", "custas judiciais"],
      { fontes: "Código de Processo Civil; Código de Processo Penal" }),
    a("direito_trabalho", "Direito do Trabalho", "Direito", "Contrato de trabalho, salários, despedimento, segurança social",
      ["lei geral do trabalho", "contrato de trabalho", "despedimento", "salário", "férias", "trabalhador", "empregador", "segurança social", "inss", "horário de trabalho", "greve", "sindicato"],
      { fontes: "Lei Geral do Trabalho; legislação da segurança social" }),
    a("direito_administrativo", "Direito Administrativo e Contratação Pública", "Direito", "Administração pública, concursos, concessões, PPP",
      ["contratação pública", "concurso público", "ajuste direto", "administração pública", "ato administrativo", "licenciamento", "concessão", "parceria público-privada", "ppp"],
      { fontes: "Legislação da contratação pública; Código do Procedimento Administrativo" }),

    // ================= FINANÇAS =================
    a("financas_pessoais", "Finanças Pessoais", "Finanças", "Poupança, orçamento familiar, crédito pessoal, investimento",
      ["poupança", "orçamento familiar", "crédito pessoal", "reserva de emergência", "dívidas pessoais"], { semDeteccao: true, geral: true }),
    a("banca", "Banca e Sistema Bancário", "Finanças", "Como funcionam os bancos, crédito, risco bancário",
      ["banca", "banco", "bancos", "crédito bancário", "spread", "liquidez bancária", "basileia", "rácio de solvabilidade", "margem financeira", "risco de crédito", "garantia bancária", "project finance"]),
    a("financas_corporativas", "Finanças Corporativas", "Finanças", "Estrutura e custo de capital, valorização, orçamento de capital",
      ["finanças corporativas", "estrutura de capital", "custo de capital", "wacc", "valor presente líquido", "vpl", "tir", "orçamento de capital", "política de dividendos", "alavancagem", "valorização de empresas", "fusões e aquisições", "capital de giro", "fundo de maneio", "fluxo de caixa descontado", "capm"]),
    a("matematica_financeira", "Matemática Financeira", "Finanças", "Juros, anuidades, amortização de empréstimos, VPL e TIR",
      ["juros compostos", "juro simples", "taxa efetiva", "anuidade", "amortização", "tabela price", "valor atual", "valor futuro", "capitalização", "equivalência de taxas", "plano de amortização"]),
    a("contabilidade_financeira", "Contabilidade Financeira", "Finanças", "Plano de contas, balanço, demonstração de resultados, normas contabilísticas",
      ["contabilidade", "balanço", "demonstração de resultados", "plano geral de contabilidade", "pgc", "ifrs", "partidas dobradas", "lançamento contabilístico", "balancete", "depreciação", "provisões", "capital próprio", "ativo e passivo"]),
    a("contabilidade_gestao", "Contabilidade de Gestão e Custos", "Finanças", "Custeio, ponto de equilíbrio, orçamentos, controlo de gestão",
      ["custeio", "custos fixos", "custos variáveis", "custo direto", "ponto de equilíbrio", "margem de contribuição", "centro de custos", "custo padrão", "contabilidade analítica", "contabilidade de gestão", "orçamento operacional"]),
    a("analise_financeira", "Análise Financeira", "Finanças", "Rácios, fluxos de caixa, rendibilidade, endividamento",
      ["análise financeira", "rácios", "liquidez geral", "rendibilidade", "roe", "roa", "ebitda", "demonstração de fluxos de caixa", "endividamento", "autonomia financeira", "análise de balanços", "equilíbrio financeiro", "dupont"]),
    a("financas_executivos", "Finanças para Executivos e Gestores", "Finanças", "Finanças para não financeiros, planeamento, tesouraria, indicadores",
      ["finanças para executivos", "finanças para gestores", "kpi", "indicadores de desempenho", "orçamento empresarial", "planeamento financeiro", "tesouraria", "gestão de caixa", "decisão financeira", "business case", "forecast", "controlling"]),
    a("mercado_capitais", "Mercado de Capitais e Investimentos", "Finanças", "Bolsa, ações, obrigações, títulos do Tesouro, fundos",
      ["bolsa de valores", "ações", "acções", "obrigações do tesouro", "bilhetes do tesouro", "títulos do tesouro", "fundo de investimento", "corretora", "carteira de investimentos", "dividendos", "mercado de capitais", "diversificação"]),
    a("gestao_risco_seguros", "Gestão de Risco, Seguros e Pensões", "Finanças", "Riscos financeiros, seguros, fundos de pensões",
      ["gestão de risco", "risco operacional", "risco de mercado", "risco de liquidez", "seguro", "apólice", "prémio de seguro", "sinistro", "resseguro", "fundo de pensões", "atuarial"]),
    a("auditoria_controlo", "Auditoria, Controlo Interno e Compliance", "Finanças", "Auditoria, fraude, conformidade, prevenção do branqueamento",
      ["auditoria", "auditor", "controlo interno", "compliance", "conformidade", "fraude", "kyc", "prevenção da fraude", "parecer do auditor", "relatório de auditoria"]),
    a("financas_internacionais", "Finanças Internacionais e Câmbios", "Finanças", "Câmbio, balança de pagamentos, comércio externo, cobertura de risco cambial",
      ["taxa de câmbio", "moeda estrangeira", "balança de pagamentos", "reservas internacionais", "crédito documentário", "carta de crédito", "incoterms", "hedging", "swap", "divisas", "regime cambial", "arbitragem cambial"]),
    a("financas_publicas", "Finanças Públicas (economia do setor público)", "Finanças", "Orçamento, dívida e défice públicos, política orçamental",
      ["orçamento do estado", "dívida pública", "défice orçamental", "receitas fiscais", "política orçamental", "sustentabilidade da dívida", "fundo soberano", "ciclo orçamental"]),
    a("fintech_pagamentos", "Pagamentos, Fintech e Criptoativos", "Finanças", "Pagamentos eletrónicos, moeda digital, blockchain",
      ["multicaixa", "pagamentos eletrónicos", "carteira digital", "mobile money", "moeda eletrónica", "criptomoedas", "bitcoin", "blockchain", "fintech", "tpa", "open banking"]),
    a("empreendedorismo_pme", "Empreendedorismo e Financiamento de PME", "Finanças", "Plano de negócios, microcrédito, capital de risco",
      ["plano de negócios", "pme", "microcrédito", "startup", "financiamento de empresas", "capital de risco", "business plan", "sociedade unipessoal", "viabilidade económica"]),

    // ================= ECONOMIA =================
    a("microeconomia", "Microeconomia", "Economia", "Oferta e procura, mercados, comportamento do consumidor e da empresa",
      ["oferta e procura", "elasticidade", "utilidade marginal", "equilíbrio de mercado", "concorrência perfeita", "monopólio", "oligopólio", "custo marginal", "excedente do consumidor", "bens públicos", "externalidades"]),
    a("macroeconomia", "Macroeconomia", "Economia", "PIB, inflação, desemprego, política monetária e orçamental",
      ["pib", "produto interno bruto", "inflação", "deflação", "desemprego", "política monetária", "taxa de juro diretora", "oferta de moeda", "crescimento económico", "recessão", "balança comercial"]),
    a("economia_angolana", "Economia Angolana", "Economia", "Petróleo, diversificação, kwanza, história económica de Angola",
      ["economia angolana", "kwanza", "petróleo", "diversificação da economia", "sonangol", "diamantes", "pib de angola", "desvalorização do kwanza", "inflação em angola", "setor não petrolífero"]),
    a("economia_internacional", "Economia Internacional", "Economia", "Comércio internacional, integração regional, investimento estrangeiro",
      ["comércio internacional", "vantagens comparativas", "sadc", "integração económica", "zona de comércio livre", "afcfta", "tarifas", "proteccionismo", "globalização", "omc", "investimento direto estrangeiro"]),
    a("estatistica_econometria", "Estatística e Econometria", "Economia", "Estatística descritiva, probabilidade, regressão, séries temporais",
      ["estatística", "média", "mediana", "desvio padrão", "regressão", "correlação", "amostra", "probabilidade", "econometria", "séries temporais", "teste de hipóteses", "variância"]),
    a("desenvolvimento_economico", "Desenvolvimento Económico", "Economia", "Pobreza, desigualdade, indicadores de desenvolvimento",
      ["desenvolvimento económico", "pobreza", "desigualdade", "idh", "índice de desenvolvimento humano", "coeficiente de gini", "objetivos de desenvolvimento sustentável", "industrialização"]),

    // ================= TECNOLOGIA =================
    a("programacao", "Programação", "Tecnologia", "Python e fundamentos de programação",
      ["python", "javascript", "programar", "algoritmo", "variável", "função", "classe", "base de dados", "sql"], { semDeteccao: true }),
    a("desenho_graficos", "Desenho e Gráficos", "Tecnologia", "Gráficos e desenho com código", [], { futuro: true }),
    a("visao_imagens", "Reconhecimento de Imagens", "Tecnologia", "Identificar objetos em fotos (casas, carros…)", [], { futuro: true }),
  ];
})();

const AREA_POR_ID = Object.fromEntries(AREAS.map(x => [x.id, x]));

// De que área parece ser esta pergunta? (por palavras-chave; só usado quando a biblioteca não tem resposta)
let _areasIdx = null;
function detetarArea(pergunta) {
  if (!_areasIdx) _areasIdx = AREAS.filter(x => !x.semDeteccao && !x.futuro).map(x => ({ a: x, chaves: x.palavras.map(p => [...new Set(normalizar(p))]).filter(t => t.length) }));
  const q = new Set(normalizar(pergunta));
  const res = [];
  for (const { a, chaves } of _areasIdx) {
    let pontos = 0;
    for (const toks of chaves) if (toks.every(t => q.has(t))) pontos += toks.length; // frases pesam mais do que palavras soltas
    if (pontos) res.push({ id: a.id, nome: a.nome, grupo: a.grupo, pontos });
  }
  res.sort((x, y) => y.pontos - x.pontos);
  return res.length ? res.filter(r => r.pontos === res[0].pontos).slice(0, 2) : [];
}
