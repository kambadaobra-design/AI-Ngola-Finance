// NGOLA_V
(globalThis.NGOLA_V = globalThis.NGOLA_V || {}).calculos = 14;

// =====================================================================================
// CÁLCULOS FINANCEIROS DA NGOLA (fase D: "pensar com números")
// Tudo é código nosso, sem serviços externos. Uma calculadora não "adivinha": calcula.
//  - Calc.<função>: matemática pura (reutilizada pela página calculadoras.html)
//  - Calc.calcular(pergunta): lê uma pergunta em português e responde com os passos
// =====================================================================================
const Calc = (() => {
  // ---------------------------- formatação (1.234.567,89) ----------------------------
  const fmt = (x, d = 2) => {
    if (!isFinite(x)) return "—";
    const [i, f] = Math.abs(x).toFixed(d).split(".");
    return (x < 0 && Math.abs(x) >= 0.5 * Math.pow(10, -d) ? "−" : "") + i.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (f ? "," + f : "");
  };
  const fmtM = (x, m) => fmt(x) + (m ? " " + m : "");
  const fmtP = (x, d = 2) => { let s = fmt(x * 100, d); if (s.includes(",")) s = s.replace(/,?0+$/, ""); return s + "%"; };

  // ---------------------------- matemática financeira pura ---------------------------
  const jurosSimples = (C, i, n) => ({ juros: C * i * n, montante: C * (1 + i * n) });
  const montante = (C, i, n) => C * Math.pow(1 + i, n);
  const capital = (M, i, n) => M / Math.pow(1 + i, n);
  const tempoComposto = (C, M, i) => Math.log(M / C) / Math.log(1 + i);
  const taxaComposta = (C, M, n) => Math.pow(M / C, 1 / n) - 1;
  const pmt = (P, i, n) => (Math.abs(i) < 1e-12 ? P / n : (P * i) / (1 - Math.pow(1 + i, -n)));
  const fvAnuidade = (p, i, n) => (Math.abs(i) < 1e-12 ? p * n : p * ((Math.pow(1 + i, n) - 1) / i));
  const pmtMeta = (FV, i, n) => (Math.abs(i) < 1e-12 ? FV / n : (FV * i) / (Math.pow(1 + i, n) - 1));
  const tabelaPrice = (P, i, n) => {                         // prestações iguais
    const p = pmt(P, i, n), linhas = []; let saldo = P;
    for (let k = 1; k <= n; k++) { const j = saldo * i, a = p - j; saldo -= a; linhas.push({ k, prestacao: p, juros: j, amort: a, saldo: Math.max(0, saldo) }); }
    return linhas;
  };
  const tabelaSAC = (P, i, n) => {                           // amortização constante
    const a = P / n, linhas = []; let saldo = P;
    for (let k = 1; k <= n; k++) { const j = saldo * i; saldo -= a; linhas.push({ k, prestacao: a + j, juros: j, amort: a, saldo: Math.max(0, saldo) }); }
    return linhas;
  };
  const vpl = (taxa, f) => f.reduce((s, c, t) => s + c / Math.pow(1 + taxa, t), 0);
  const tir = f => {                                         // procura o zero do VPL: primeiro por varrimento, depois por bisseção
    const npv = r => vpl(r, f);
    const grelha = []; for (let r = -0.99; r <= 10; r += 0.05) grelha.push(r); for (const r of [15, 20, 50, 100, 300, 1000, 1e4, 1e5]) grelha.push(r);
    let lo = null, hi = null, flo = 0, fhi = 0, prev = grelha[0], fp = npv(prev);
    for (let k = 1; k < grelha.length; k++) { const r = grelha[k], fr = npv(r); if (fp === 0) return prev; if (fp * fr < 0) { lo = prev; hi = r; flo = fp; fhi = fr; break; } prev = r; fp = fr; }
    if (lo === null) return null;
    for (let k = 0; k < 400; k++) { const m = (lo + hi) / 2, fm = npv(m); if (fm === 0 || (hi - lo) < 1e-14 * Math.max(1, Math.abs(m))) return m; if (flo * fm < 0) { hi = m; fhi = fm; } else { lo = m; flo = fm; } }
    return (lo + hi) / 2;
  };
  const payback = (f, taxa = 0) => {                         // em períodos; null se nunca recupera
    let acum = 0;
    for (let t = 0; t < f.length; t++) {
      const v = f[t] / Math.pow(1 + taxa, t), antes = acum; acum += v;
      if (t > 0 && acum >= 0 && antes < 0) return t - 1 + (-antes) / v;
    }
    return null;
  };
  const variacao = (a, b) => (b - a) / a;
  const acumulada = taxas => taxas.reduce((p, r) => p * (1 + r), 1) - 1;
  const fisher = (i, pi) => (1 + i) / (1 + pi) - 1;
  const margem = (custo, preco) => ({ lucro: preco - custo, sobreVenda: (preco - custo) / preco, sobreCusto: (preco - custo) / custo });
  const equilibrio = (CF, preco, cv) => CF / (preco - cv);
  const taxaEsforco = (prest, rend) => prest / rend;
  const tempoDobrar = i => Math.log(2) / Math.log(1 + i);
  const ivaDe = (valor, taxa, incluido) => incluido
    ? { base: valor / (1 + taxa), iva: valor - valor / (1 + taxa), total: valor }
    : { base: valor, iva: valor * taxa, total: valor * (1 + taxa) };
  const roi = (custo, ganho) => (ganho - custo) / custo;

  // ---------------------------- ler números em português ------------------------------
  const semAc = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\u00a0/g, " ");
  const PAL = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, quinze: 15, vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, cem: 100, cento: 100 };
  const MAG = { "mil milhoes": 1e9, milhoes: 1e6, milhao: 1e6, mil: 1e3 };
  const lerNum = s => {
    s = s.trim();
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) return parseFloat(s.replace(/\./g, "").replace(",", "."));   // 5.000.000
    if (/^\d{1,3}(\s\d{3})+(,\d+)?$/.test(s)) return parseFloat(s.replace(/\s/g, "").replace(",", "."));    // 5 000 000
    return parseFloat(s.replace(",", "."));                                                                  // 1,5  1.5  250000
  };
  const periodoDe = j => /(ao mes|mensal|mensais|por mes|a\.m\b|\/mes)/.test(j) ? "mes"
    : /(ao ano|anual|anuais|por ano|a\.a\b|p\.a\b|\/ano)/.test(j) ? "ano"
    : /(ao trimestre|trimestral)/.test(j) ? "trimestre" : /(ao semestre|semestral)/.test(j) ? "semestre" : /(ao dia|diari)/.test(j) ? "dia" : null;
  const MESES_UN = { mes: 1, meses: 1, ano: 12, anos: 12, dia: 1 / 30, dias: 1 / 30, semana: 7 / 30, semanas: 7 / 30, trimestre: 3, trimestres: 3, semestre: 6, semestres: 6 };

  function analisar(pergunta) {
    let t = semAc(pergunta);
    const I = { t, pct: [], tempo: [], val: [] };
    I.moeda = /\b(kz|kwanzas?|aoa)\b/.test(t) ? "Kz" : /(usd|us\$|\bdolar|\$)/.test(t) ? "USD" : /(\beur\b|\beuros?\b|€)/.test(t) ? "EUR" : "";
    // percentagens (guardam o período mais próximo: "ao mês", "ao ano"…)
    t = t.replace(/(\d+(?:[.,]\d+)?)\s*(%|por\s*cento)/g, (m, num, _u, off) => {
      I.pct.push({ v: lerNum(num) / 100, per: periodoDe(t.slice(Math.max(0, off - 24), off + m.length + 26)), idx: off });
      return " ".repeat(m.length);
    });
    // prazos: "24 meses", "dois anos"
    t = t.replace(/(\d+(?:[.,]\d+)?|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|quinze|vinte|trinta)\s*(meses|mes|anos|ano|dias|dia|semanas|semana|trimestres|trimestre|semestres|semestre)\b/g, (m, n, un, off) => {
      const num = PAL[n] !== undefined ? PAL[n] : lerNum(n); I.tempo.push({ n: num, un, meses: num * MESES_UN[un], idx: off });
      return " ".repeat(m.length);
    });
    // "cinco milhões", "250 mil"
    t = t.replace(/\b(um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|vinte|trinta|quarenta|cinquenta|cem|cento)\s+(mil milhoes|milhoes|milhao|mil)\b/g, (m, w, g) => String(PAL[w] * MAG[g]).padEnd(m.length, " "));
    // valores
    const re = /(us\$|\$|€)?\s*(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d{1,3}(?:\s\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?)\s*(mil milhoes|milhoes|milhao|mil\b)?\s*(kz|kwanzas?|aoa|usd|us\$|dolares?|euros?|eur\b|€)?/g;
    let m;
    while ((m = re.exec(t))) {
      let v = lerNum(m[2]); if (m[3]) v *= MAG[m[3].trim()];
      const c = ((m[1] || "") + (m[4] || "")).toLowerCase();
      I.val.push({ v, moeda: /kz|kwanza|aoa/.test(c) ? "Kz" : /us|\$|dolar|usd/.test(c) ? "USD" : /eur|€/.test(c) ? "EUR" : "", idx: m.index });
    }
    I.pctDe = /(\d+(?:[.,]\d+)?)\s*(?:%|por\s*cento)\s*de\s+(?:\d|um|uma|dois|tres|cinco)/.test(semAc(pergunta));
    return I;
  }

  // ---------------------------- resultados e pedidos de dados -------------------------
  const pedir = (titulo, faltam, exemplo) => ({ titulo, faltam, exemplo });
  const mesesDe = I => I.tempo.length ? I.tempo[0].meses : null;
  // taxa equivalente por mês (efetiva) a partir de uma percentagem com período
  const taxaMes = (p, assumirAno) => {
    const per = p.per || (assumirAno ? "ano" : "mes"), meses = { dia: 1 / 30, mes: 1, trimestre: 3, semestre: 6, ano: 12 }[per];
    return { i: Math.pow(1 + p.v, 1 / meses) - 1, per, assumido: !p.per, nominalMes: p.v / meses };
  };
  const nomePer = { mes: "ao mês", ano: "ao ano", trimestre: "ao trimestre", semestre: "ao semestre", dia: "ao dia" };
  const tpTxt = I => I.tempo[0] ? `${fmt(I.tempo[0].n, I.tempo[0].n % 1 ? 1 : 0)} ${I.tempo[0].un}` : "";
  const moedaDe = (I, i) => (I.val[i] && I.val[i].moeda) || I.moeda;

  // ---------------------------- intenções (da mais específica à mais geral) ------------
  const INTENCOES = [

    function vplTir(I) {
      const t = I.t; if (!/(\bvpl\b|valor presente liquido|\bvan\b|\btir\b|taxa interna|payback)/.test(t)) return null;
      if (I.val.length < 2) return pedir("VPL, TIR e payback", ["o investimento inicial e os fluxos de caixa de cada ano"], "Exemplo: «VPL de um projeto com investimento de 1.000.000 Kz e fluxos de 400.000, 500.000 e 600.000 a 10%»");
      const f = [-Math.abs(I.val[0].v), ...I.val.slice(1).map(x => x.v)], m = moedaDe(I, 0), taxa = I.pct.length ? I.pct[0].v : null, L = [], V = {};
      const dados = [`investimento ${fmtM(-f[0], m)}`, `fluxos ${f.slice(1).map(x => fmt(x, 0)).join("; ")}`].concat(taxa != null ? [`taxa ${fmtP(taxa)} ao ano`] : []);
      if (taxa != null) { V.vpl = vpl(taxa, f); L.push(`VPL = ${fmtM(V.vpl, m)} → ${V.vpl > 0 ? "o projeto cria valor (VPL positivo)" : V.vpl < 0 ? "o projeto destrói valor à taxa pedida (VPL negativo)" : "indiferente"}`); }
      const r = tir(f); if (r != null) { V.tir = r; L.push(`TIR = ${fmtP(r)} ao ano${taxa != null ? (r > taxa ? " (acima da taxa exigida: aceitável)" : " (abaixo da taxa exigida: rejeitar)") : ""}`); } else L.push("TIR: não existe (os fluxos não mudam de sinal).");
      const pb = payback(f, 0); if (pb != null) { V.payback = pb; L.push(`Payback simples ≈ ${fmt(pb, 2)} anos`); } else L.push("Payback simples: o investimento não é recuperado no período dado.");
      if (taxa != null) { const pd = payback(f, taxa); if (pd != null) { V.paybackDesc = pd; L.push(`Payback descontado ≈ ${fmt(pd, 2)} anos`); } }
      return { titulo: "Avaliação de um projeto (VPL, TIR e payback)", dados, formula: "VPL = Σ fluxo(t) / (1 + taxa)^t, com o investimento em t = 0", resultado: L, valores: V, pressupostos: ["Os fluxos são anuais, recebidos no fim de cada ano."] };
    },

    function cambio(I) {
      const t = I.t; if (!/(converter|converte|cambio|quanto (sao|e|valem|vale)|cotacao|em kz|para kz|em dolares|em euros|para dolares|para euros)/.test(t)) return null;
      if (!/(kz|kwanza|usd|dolar|\$|eur|euro|€)/.test(t) || !I.val.length) return null;
      const m = t.match(/(?:cambio|taxa|cotacao|a|de)\s*(?:de|do|=)?\s*(\d+(?:[.,]\d+)?)\s*(?:kz|kwanzas?)?\s*(?:por|\/)?\s*(?:dolar|usd|euro|eur)?/);
      let taxa = null;
      if (I.val.length >= 2) taxa = I.val[1].v; else if (m && lerNum(m[1]) !== I.val[0].v) taxa = lerNum(m[1]);
      const m0 = I.val[0].moeda || (/(dolar|usd|\$)/.test(t) ? "USD" : /(euro|eur|€)/.test(t) ? "EUR" : "Kz");
      if (taxa == null) return pedir("Conversão de moeda", ["a taxa de câmbio do dia (eu não invento cotações)"], "Exemplo: «converter 500 dólares para kwanzas ao câmbio de 900»");
      const paraKz = m0 !== "Kz" || /(para kz|em kz|kwanzas)/.test(t) && m0 !== "Kz";
      const valor = I.val[0].v, res = paraKz ? valor * taxa : valor / taxa;
      return { titulo: "Conversão de moeda", dados: [`${fmtM(valor, m0)}`, `câmbio 1 ${m0 === "Kz" ? "moeda estrangeira" : m0} = ${fmt(taxa)} Kz`],
        formula: paraKz ? "valor × câmbio" : "valor ÷ câmbio", resultado: [`${fmtM(valor, m0)} = ${fmtM(res, paraKz ? "Kz" : (/(euro|eur|€)/.test(t) ? "EUR" : "USD"))}`], valores: { resultado: res, taxa },
        pressupostos: ["Usei o câmbio que indicaste; o câmbio real depende do banco ou da casa de câmbio e do dia (oficial ou paralelo)."] };
    },

    function iva(I) {
      if (!/\biva\b/.test(I.t) || !I.val.length) return null;
      const taxa = I.pct.length ? I.pct[0].v : 0.14, incl = /(incluid|ja (com|tem)|com iva incluido|retirar|tirar o iva|sem o iva|valor sem iva)/.test(I.t), v = I.val[0].v, m = moedaDe(I, 0), r = ivaDe(v, taxa, incl);
      return { titulo: "Cálculo do IVA", dados: [`${incl ? "valor com IVA" : "valor sem IVA"} ${fmtM(v, m)}`, `taxa ${fmtP(taxa)}`], formula: incl ? "base = total ÷ (1 + taxa); IVA = total − base" : "IVA = base × taxa; total = base + IVA",
        resultado: [`Base (sem IVA): ${fmtM(r.base, m)}`, `IVA: ${fmtM(r.iva, m)}`, `Total (com IVA): ${fmtM(r.total, m)}`], valores: { base: r.base, iva: r.iva, total: r.total, taxa },
        pressupostos: I.pct.length ? [] : ["Não indicaste a taxa: usei 14%, a taxa geral que aparece nas tuas aulas. Confirma a taxa em vigor e se o bem tem isenção."] };
    },

    function dobrar(I) {
      if (!/(dobrar|duplicar|regra dos 72|regra de 72)/.test(I.t) || !I.pct.length) return null;
      const p = I.pct[0], per = p.per || "ano", n = tempoDobrar(p.v);
      return { titulo: "Quanto tempo para dobrar o dinheiro", dados: [`taxa ${fmtP(p.v)} ${nomePer[per]} (juros compostos)`], formula: "n = ln 2 ÷ ln(1 + taxa)  (atalho: 72 ÷ taxa em %)",
        resultado: [`≈ ${fmt(n, 2)} ${per === "mes" ? "meses" : per === "ano" ? "anos" : "períodos"}`, `Regra dos 72: ${fmt(72 / (p.v * 100), 2)} ${per === "mes" ? "meses" : "anos"}`], valores: { n, regra72: 72 / (p.v * 100) } };
    },

    function esforco(I) {
      if (!/(taxa de esforco|taxa de endividamento|quanto do (meu )?(salario|rendimento|ordenado))/.test(I.t) || I.val.length < 2) return null;
      const t = I.t, iP = t.search(/prestac|mensalidade|credito|emprestimo/), iR = t.search(/salario|rendimento|ordenado|ganho/);
      const a = I.val[0], b = I.val[1], [prest, rend] = (iP >= 0 && iR >= 0 && iR < iP) ? [b.v, a.v] : [a.v, b.v], te = taxaEsforco(prest, rend), m = moedaDe(I, 0);
      return { titulo: "Taxa de esforço (peso da prestação no rendimento)", dados: [`prestação ${fmtM(prest, m)}`, `rendimento ${fmtM(rend, m)}`], formula: "prestação ÷ rendimento mensal",
        resultado: [`Taxa de esforço = ${fmtP(te)}`, te <= 0.3 ? "Dentro do confortável (até cerca de 30% do rendimento)." : te <= 0.4 ? "Zona de atenção (entre 30% e 40%)." : "Elevada: acima de 40% o orçamento fica muito apertado."], valores: { taxaEsforco: te },
        pressupostos: ["Os limites (30% e 40%) são uma regra prática comum, não uma regra legal; cada banco usa os seus critérios."] };
    },

    function pontoEquilibrio(I) {
      if (!/(ponto de equilibrio|break.?even)/.test(I.t) || I.val.length < 3) return null;
      const t = I.t, pos = k => t.search(k), ordem = [["fixo", /fixo/], ["preco", /preco/], ["var", /variav/]].map(([n, r]) => ({ n, i: pos(r) })), V = I.val;
      const pegar = i => { const c = V.find(x => x.idx > i); return c ? c.v : null; };
      let cf = pegar(ordem[0].i), p = pegar(ordem[1].i), cv = pegar(ordem[2].i);
      if (cf == null || p == null || cv == null || new Set([cf, p, cv]).size < 3 && ordem.some(o => o.i < 0)) { cf = V[0].v; p = V[1].v; cv = V[2].v; }
      if (p <= cv) return { titulo: "Ponto de equilíbrio", dados: [], resultado: ["O preço tem de ser superior ao custo variável unitário; caso contrário nunca há ponto de equilíbrio."], valores: {} };
      const q = equilibrio(cf, p, cv), m = moedaDe(I, 0);
      return { titulo: "Ponto de equilíbrio", dados: [`custos fixos ${fmtM(cf, m)}`, `preço unitário ${fmtM(p, m)}`, `custo variável unitário ${fmtM(cv, m)}`], formula: "quantidade = custos fixos ÷ (preço − custo variável)",
        resultado: [`Margem de contribuição por unidade: ${fmtM(p - cv, m)}`, `Ponto de equilíbrio: ${fmt(q, 1)} unidades (≈ ${fmt(Math.ceil(q), 0)} para não ter prejuízo)`, `Receita no equilíbrio: ${fmtM(q * p, m)}`], valores: { quantidade: q, receita: q * p } };
    },

    function margemMarkup(I) {
      if (!/(margem|markup|mark-up|lucro)/.test(I.t) || !/(custo|compr|vend|preco)/.test(I.t)) return null;
      const t = I.t;
      if (I.val.length === 1 && I.pct.length && /(que preco|preco de venda|a quanto (devo )?vender|vender a quanto)/.test(t)) {      // preço a partir do custo e da margem
        const c = I.val[0].v, p = I.pct[0].v, m = moedaDe(I, 0), sobreCusto = /(markup|sobre o custo|sobre custo|acrescentar)/.test(t);
        const preco = sobreCusto ? c * (1 + p) : c / (1 - p);
        return { titulo: sobreCusto ? "Preço de venda com markup sobre o custo" : "Preço de venda para uma margem sobre a venda", dados: [`custo ${fmtM(c, m)}`, `${sobreCusto ? "markup" : "margem sobre a venda"} ${fmtP(p)}`],
          formula: sobreCusto ? "preço = custo × (1 + markup)" : "preço = custo ÷ (1 − margem)", resultado: [`Preço de venda: ${fmtM(preco, m)}`, `Lucro por unidade: ${fmtM(preco - c, m)}`], valores: { preco },
          pressupostos: ["Margem sobre a venda e markup não são a mesma coisa: 25% de markup dá 20% de margem."] };
      }
      if (I.val.length < 2) return null;
      const ic = t.search(/compr|custo|custou|custa/), iv = t.search(/vend|preco/), [c, p] = (iv >= 0 && ic >= 0 && iv < ic) ? [I.val[1].v, I.val[0].v] : [I.val[0].v, I.val[1].v], r = margem(c, p), m = moedaDe(I, 0);
      return { titulo: "Margem e markup", dados: [`custo ${fmtM(c, m)}`, `preço de venda ${fmtM(p, m)}`], formula: "margem = lucro ÷ preço; markup = lucro ÷ custo",
        resultado: [`Lucro por unidade: ${fmtM(r.lucro, m)}`, `Margem sobre a venda: ${fmtP(r.sobreVenda)}`, `Markup sobre o custo: ${fmtP(r.sobreCusto)}`], valores: { lucro: r.lucro, margem: r.sobreVenda, markup: r.sobreCusto } };
    },

    function roiDscr(I) {
      const t = I.t;
      if (/\bdscr\b|cobertura do servico da divida/.test(t) && I.val.length >= 2) {
        const d = I.val[0].v / I.val[1].v, m = moedaDe(I, 0);
        return { titulo: "DSCR (cobertura do serviço da dívida)", dados: [`fluxo de caixa disponível ${fmtM(I.val[0].v, m)}`, `serviço da dívida ${fmtM(I.val[1].v, m)}`], formula: "DSCR = fluxo de caixa disponível ÷ serviço da dívida",
          resultado: [`DSCR = ${fmt(d, 2)}`, d >= 1.2 ? "Confortável: os bancos costumam exigir pelo menos cerca de 1,2." : d >= 1 ? "Apertado: cobre a dívida, mas com pouca folga." : "Insuficiente: o fluxo não cobre a dívida."], valores: { dscr: d } };
      }
      if (/\broi\b|retorno (sobre|do) investimento/.test(t) && I.val.length >= 2) {
        const r = roi(I.val[0].v, I.val[1].v), m = moedaDe(I, 0);
        return { titulo: "ROI (retorno do investimento)", dados: [`investido ${fmtM(I.val[0].v, m)}`, `resultado final ${fmtM(I.val[1].v, m)}`], formula: "ROI = (ganho − custo) ÷ custo", resultado: [`ROI = ${fmtP(r)}`], valores: { roi: r },
          pressupostos: ["Considerei o segundo valor como o total recebido (capital + ganho)."] };
      }
      return null;
    },

    function inflacao(I) {
      const t = I.t; if (!/(inflacao|poder de compra|valor real|taxa real|perde valor|custara|vai custar)/.test(t) || !I.pct.length) return null;
      if (/taxa real/.test(t) && I.pct.length >= 2) { const r = fisher(I.pct[0].v, I.pct[1].v); return { titulo: "Taxa de juro real (equação de Fisher)", dados: [`juro nominal ${fmtP(I.pct[0].v)}`, `inflação ${fmtP(I.pct[1].v)}`], formula: "real = (1 + nominal) ÷ (1 + inflação) − 1", resultado: [`Taxa real = ${fmtP(r)}`, r < 0 ? "Negativa: o dinheiro perde poder de compra mesmo a render juros." : "Positiva: o dinheiro ganha poder de compra."], valores: { real: r } }; }
      if (I.pct.length >= 2 && !I.val.length) { const a = acumulada(I.pct.map(p => p.v)); return { titulo: "Inflação acumulada", dados: [`taxas ${I.pct.map(p => fmtP(p.v)).join("; ")}`], formula: "Π (1 + taxa) − 1", resultado: [`Inflação acumulada = ${fmtP(a)}`], valores: { acumulada: a } }; }
      const n = I.tempo.length ? I.tempo[0].meses / 12 : null, p = I.pct[0].v;
      if (!I.val.length || n == null) return pedir("Efeito da inflação", ["o valor, a inflação anual e o número de anos"], "Exemplo: «com inflação de 15% ao ano, quanto custará daqui a 3 anos algo que hoje custa 100.000 Kz?»");
      const v = I.val[0].v, m = moedaDe(I, 0), futuro = /(custara|vai custar|custar|preco|subir)/.test(t);
      if (futuro) { const r = v * Math.pow(1 + p, n); return { titulo: "Preço futuro com inflação", dados: [`preço hoje ${fmtM(v, m)}`, `inflação ${fmtP(p)} ao ano`, `${fmt(n, 1)} anos`], formula: "preço futuro = preço × (1 + inflação)^anos", resultado: [`Preço daqui a ${fmt(n, 1)} anos: ${fmtM(r, m)}`], valores: { futuro: r } }; }
      const r = v / Math.pow(1 + p, n); return { titulo: "Poder de compra depois da inflação", dados: [`valor ${fmtM(v, m)}`, `inflação ${fmtP(p)} ao ano`, `${fmt(n, 1)} anos`], formula: "valor real = valor ÷ (1 + inflação)^anos", resultado: [`Daqui a ${fmt(n, 1)} anos, ${fmtM(v, m)} compram o que hoje compram ${fmtM(r, m)}`, `Perda de poder de compra: ${fmtP(1 - r / v)}`], valores: { real: r } };
    },

    function poupanca(I) {
      const t = I.t; if (!/(poupar|poupanca|juntar|guardar|depositar|aplicar|investir)/.test(t) || !/(por mes|mensal|todos os meses|cada mes|ao mes por mes|mensalmente|mes a mes)/.test(t) && !/(quanto (devo|preciso|tenho de|tenho que) (poupar|guardar|juntar))/.test(t)) return null;
      if (/(prestac|credito|emprestimo)/.test(t) && !/(poupar|juntar)/.test(t)) return null;
      const meta = /(para (juntar|ter|chegar|atingir|comprar|alcancar|conseguir|fazer)|quanto (devo|preciso|tenho de|tenho que) (poupar|guardar|juntar)|meta|objetivo)/.test(t);
      const n = mesesDe(I), m = moedaDe(I, 0);
      if (!I.val.length || n == null) return pedir(meta ? "Quanto poupar por mês" : "Poupança mensal", [meta ? "a meta (quanto quer juntar) e o prazo" : "o valor mensal e o prazo", "(opcional) a taxa de juro"], meta ? "Exemplo: «quanto devo poupar por mês para juntar 2.000.000 Kz em 18 meses a 8% ao ano?»" : "Exemplo: «se poupar 50.000 Kz por mês durante 24 meses a 10% ao ano, quanto junto?»");
      const tx = I.pct.length ? taxaMes(I.pct[0], true) : null, i = tx ? tx.i : 0, press = [];
      press.push(tx ? `Taxa de ${fmtP(I.pct[0].v)} ${nomePer[tx.per]} convertida em ${fmtP(i, 4)} ao mês (taxa equivalente), com depósitos no fim de cada mês${tx.assumido ? "; como não disseste o período, assumi que é ao ano" : ""}.` : "Não indicaste taxa de juro: calculei sem juros (só o dinheiro depositado).");
      if (meta) {
        const FV = Math.max(...I.val.map(x => x.v)), p = pmtMeta(FV, i, n);
        return { titulo: "Quanto poupar por mês para atingir a meta", dados: [`meta ${fmtM(FV, m)}`, `prazo ${fmt(n, 0)} meses`].concat(tx ? [`taxa ${fmtP(I.pct[0].v)} ${nomePer[tx.per]}`] : []), formula: "prestação = meta × i ÷ ((1 + i)^n − 1)",
          resultado: [`Tens de poupar ${fmtM(p, m)} por mês`, `Total depositado: ${fmtM(p * n, m)}`, `Juros ganhos: ${fmtM(FV - p * n, m)}`], valores: { poupancaMensal: p, depositado: p * n, juros: FV - p * n }, pressupostos: press };
      }
      const p = I.val[0].v, FV = fvAnuidade(p, i, n);
      return { titulo: "Poupança mensal: quanto vais juntar", dados: [`${fmtM(p, m)} por mês`, `prazo ${fmt(n, 0)} meses`].concat(tx ? [`taxa ${fmtP(I.pct[0].v)} ${nomePer[tx.per]}`] : []), formula: "valor futuro = prestação × ((1 + i)^n − 1) ÷ i",
        resultado: [`Valor acumulado: ${fmtM(FV, m)}`, `Total depositado: ${fmtM(p * n, m)}`, `Juros ganhos: ${fmtM(FV - p * n, m)}`], valores: { acumulado: FV, depositado: p * n, juros: FV - p * n }, pressupostos: press };
    },

    function credito(I) {
      const t = I.t; if (!/(prestac|mensalidade|credito|emprestimo|financiamento|pagar por mes|pago por mes|amortizacao constante|\bsac\b)/.test(t)) return null;
      if (/(poupar|poupanca|rende |rendimento|depositar|aplicar|investir)/.test(t) && !/(prestac|credito|emprestimo)/.test(t)) return null;
      if (/(taxa de esforco|taxa de endividamento)/.test(t)) return null;
      const falt = []; if (!I.val.length) falt.push("o valor do crédito (ex.: 5.000.000 Kz)"); if (!I.tempo.length) falt.push("o prazo (ex.: 24 meses ou 5 anos)"); if (!I.pct.length) falt.push("a taxa de juro (ex.: 2% ao mês ou 25% ao ano)");
      if (falt.length) return pedir("Prestação de um crédito", falt, "Exemplo: «qual a prestação de um crédito de 5.000.000 Kz a 24 meses com juros de 2% ao mês?»");
      const P = I.val[0].v, n = Math.round(mesesDe(I)), m = moedaDe(I, 0), pc = I.pct[0], assumeAno = pc.per ? false : pc.v >= 0.06;
      const tx = taxaMes(pc, assumeAno), i = tx.i, sac = /(sac|amortizacao constante)/.test(t), pr = tabelaPrice(P, i, n), sc = tabelaSAC(P, i, n);
      const totP = pr[0].prestacao * n, totS = sc.reduce((s, r) => s + r.prestacao, 0), pp = [];
      pp.push(`Taxa de ${fmtP(pc.v)} ${nomePer[tx.per]}${tx.assumido ? " (não indicaste o período: assumi " + (tx.per === "ano" ? "ao ano" : "ao mês") + ")" : ""}${tx.per === "mes" ? "" : ", convertida na taxa mensal equivalente de " + fmtP(i, 4)}.`);
      if (tx.per === "ano") pp.push(`Se o banco usar a taxa nominal (${fmtP(pc.v)} ÷ 12 = ${fmtP(tx.nominalMes, 4)} ao mês), a prestação seria ${fmtM(pmt(P, tx.nominalMes, n), m)}.`);
      pp.push("Não incluí comissões, seguros nem impostos, que alteram o custo real.");
      const base = { dados: [`crédito ${fmtM(P, m)}`, `prazo ${n} meses`, `taxa ${fmtP(pc.v)} ${nomePer[tx.per]}`], pressupostos: pp };
      if (sac) return { titulo: "Crédito pelo sistema SAC (amortização constante)", ...base, formula: "amortização = capital ÷ n; juros = saldo × i; prestação = amortização + juros",
        resultado: [`1.ª prestação: ${fmtM(sc[0].prestacao, m)} (juros ${fmtM(sc[0].juros, m)} + amortização ${fmtM(sc[0].amort, m)})`, `Última prestação: ${fmtM(sc[n - 1].prestacao, m)}`, `Total a pagar: ${fmtM(totS, m)} · juros: ${fmtM(totS - P, m)}`], extra: [`No sistema Price (prestações iguais) pagarias ${fmtM(pr[0].prestacao, m)} por mês, no total ${fmtM(totP, m)}.`], valores: { primeira: sc[0].prestacao, ultima: sc[n - 1].prestacao, total: totS, juros: totS - P } };
      return { titulo: "Prestação de um crédito (sistema Price, prestações iguais)", ...base, formula: "prestação = capital × i ÷ (1 − (1 + i)^−n)",
        resultado: [`Prestação mensal: ${fmtM(pr[0].prestacao, m)}`, `Total a pagar: ${fmtM(totP, m)} · juros totais: ${fmtM(totP - P, m)}`, `1.ª prestação: juros ${fmtM(pr[0].juros, m)} + amortização ${fmtM(pr[0].amort, m)}`],
        extra: [`No sistema SAC (amortização constante) a 1.ª prestação seria ${fmtM(sc[0].prestacao, m)} e a última ${fmtM(sc[n - 1].prestacao, m)}, com juros totais de ${fmtM(totS - P, m)}.`], valores: { prestacao: pr[0].prestacao, total: totP, juros: totP - P, i, n, primeiraJuros: pr[0].juros, primeiraAmort: pr[0].amort, sacPrimeira: sc[0].prestacao, sacUltima: sc[n - 1].prestacao } };
    },

    function jurosCapital(I) {
      const t = I.t; if (!/(juros compostos|juros simples|rende|render|rendimento|aplic|deposit|invest|montante|capitaliz|quanto fica|quanto tenho|a prazo|quanto tempo|em quanto tempo|quantos (anos|meses)|que taxa|qual a taxa)/.test(t)) return null;
      if (/(prestac|emprestimo|financiamento|mensalidade|credito)/.test(t)) return null;
      const m = moedaDe(I, 0);
      if (/(quanto tempo|em quanto tempo|quantos (anos|meses))/.test(t) && I.val.length >= 2 && I.pct.length) {
        const p = I.pct[0], per = p.per || "ano", C = I.val[0].v, M = I.val[1].v, n = tempoComposto(C, M, p.v);
        return { titulo: "Tempo para atingir um valor", dados: [`capital ${fmtM(C, m)}`, `objetivo ${fmtM(M, m)}`, `taxa ${fmtP(p.v)} ${nomePer[per]}`], formula: "n = ln(M ÷ C) ÷ ln(1 + i)", resultado: [`≈ ${fmt(n, 2)} ${per === "mes" ? "meses" : per === "ano" ? "anos" : "períodos"}`], valores: { n }, pressupostos: ["Juros compostos, sem novos depósitos."] };
      }
      if (/(que taxa|qual a taxa|taxa necessaria)/.test(t) && I.val.length >= 2 && I.tempo.length) {
        const n = I.tempo[0].meses / 12, C = I.val[0].v, M = I.val[1].v, i = taxaComposta(C, M, n);
        return { titulo: "Taxa necessária", dados: [`capital ${fmtM(C, m)}`, `objetivo ${fmtM(M, m)}`, `prazo ${tpTxt(I)}`], formula: "i = (M ÷ C)^(1 ÷ n) − 1", resultado: [`Taxa necessária: ${fmtP(i)} ao ano`], valores: { taxa: i }, pressupostos: ["Juros compostos anuais, sem novos depósitos."] };
      }
      if (!I.val.length || !I.pct.length || !I.tempo.length) return pedir("Juros sobre um capital", [!I.val.length ? "o capital" : null, !I.pct.length ? "a taxa de juro" : null, !I.tempo.length ? "o prazo" : null].filter(Boolean), "Exemplo: «quanto rende 1.000.000 Kz a 12% ao ano durante 3 anos?»");
      const C = I.val[0].v, p = I.pct[0], per = p.per || "ano", periodosAno = { dia: 360, mes: 12, trimestre: 4, semestre: 2, ano: 1 }[per], n = I.tempo[0].meses / 12 * periodosAno, simples = /juros simples/.test(t);
      const comp = montante(C, p.v, n), sim = jurosSimples(C, p.v, n);
      const A = simples ? ["Juros simples", sim.montante, sim.juros, "montante = capital × (1 + i × n)", comp, "compostos"] : ["Juros compostos", comp, comp - C, "montante = capital × (1 + i)^n", sim.montante, "simples"];
      return { titulo: `${A[0]}: quanto rende o capital`, dados: [`capital ${fmtM(C, m)}`, `taxa ${fmtP(p.v)} ${nomePer[per]}`, `prazo ${tpTxt(I)}`], formula: A[3],
        resultado: [`Montante final: ${fmtM(A[1], m)}`, `Juros: ${fmtM(A[2], m)}`], extra: [`Com juros ${A[5]} o montante seria ${fmtM(A[4], m)}.`], valores: { montante: A[1], juros: A[2], alternativa: A[4] },
        pressupostos: [p.per ? "" : "Não indicaste o período da taxa: assumi que é ao ano.", simples ? "" : "Sem indicação, usei juros compostos (capitalização no fim de cada período)."].filter(Boolean) };
    },

    function descontoAumento(I) {
      const t = I.t; if (I.pct.length !== 1 || I.val.length < 1) return null;
      const p = I.pct[0].v, v = I.val[0].v, m = moedaDe(I, 0);
      if (/desconto/.test(t)) return { titulo: "Preço com desconto", dados: [`preço ${fmtM(v, m)}`, `desconto ${fmtP(p)}`], formula: "preço final = preço × (1 − desconto)", resultado: [`Desconto: ${fmtM(v * p, m)}`, `Preço final: ${fmtM(v * (1 - p), m)}`], valores: { final: v * (1 - p), desconto: v * p } };
      if (/(aumento|acrescimo|subida|subir|aumentar|sobe)/.test(t)) return { titulo: "Valor depois de um aumento", dados: [`valor ${fmtM(v, m)}`, `aumento ${fmtP(p)}`], formula: "novo valor = valor × (1 + aumento)", resultado: [`Aumento: ${fmtM(v * p, m)}`, `Novo valor: ${fmtM(v * (1 + p), m)}`], valores: { novo: v * (1 + p), aumento: v * p } };
      if (I.pctDe) return { titulo: "Percentagem de um valor", dados: [`${fmtP(p)} de ${fmtM(v, m)}`], formula: "valor × percentagem", resultado: [`${fmtP(p)} de ${fmtM(v, m)} = ${fmtM(v * p, m)}`], valores: { resultado: v * p } };
      return null;
    },

    function variacaoPct(I) {
      if (!/(variacao|subiu|desceu|caiu|cresceu|aumentou|diminuiu|quanto por cento|percentagem de (aumento|descida|queda)|diferenca percentual|valorizou|desvalorizou)/.test(I.t) || I.val.length < 2 || I.pct.length) return null;
      const a = I.val[0].v, b = I.val[1].v, v = variacao(a, b), m = moedaDe(I, 0);
      return { titulo: "Variação percentual", dados: [`valor inicial ${fmtM(a, m)}`, `valor final ${fmtM(b, m)}`], formula: "variação = (final − inicial) ÷ inicial", resultado: [`${v >= 0 ? "Aumento" : "Descida"} de ${fmtP(Math.abs(v))} (${v >= 0 ? "+" : "−"}${fmtM(Math.abs(b - a), m)})`], valores: { variacao: v } };
    },

    function orcamento(I) {
      if (!/(salario|rendimento|ordenado)/.test(I.t) || !/(50.?30.?20|dividir|organizar|distribuir|orcamento|repartir)/.test(I.t) || !I.val.length) return null;
      const v = I.val[0].v, m = moedaDe(I, 0);
      return { titulo: "Orçamento mensal pela regra 50/30/20", dados: [`rendimento ${fmtM(v, m)}`], formula: "50% necessidades · 30% desejos · 20% poupança e dívidas",
        resultado: [`Necessidades (50%): ${fmtM(v * 0.5, m)}`, `Desejos (30%): ${fmtM(v * 0.3, m)}`, `Poupança e dívidas (20%): ${fmtM(v * 0.2, m)}`], valores: { necessidades: v * 0.5, desejos: v * 0.3, poupanca: v * 0.2 }, pressupostos: ["É uma regra prática: adapta as percentagens à tua realidade (renda, transporte, dependentes)."] };
    },
  ];

  function calcular(pergunta) {
    try {
      const I = analisar(pergunta);
      if (!I.val.length && !I.pct.length) return null;                 // sem números não há cálculo (perguntas como "o que é o VPL?" vão para a biblioteca)
      for (const f of INTENCOES) { const r = f(I); if (r) return r; }
    } catch (e) { console.warn("Calc:", e); }
    return null;
  }

  function formatar(c) {
    if (c.faltam) return `🧮 ${c.titulo}\nPara calcular preciso de: ${c.faltam.join("; ")}.\n${c.exemplo || ""}`.trim();
    const L = [`🧮 ${c.titulo}`];
    if (c.dados && c.dados.length) L.push("Dados: " + c.dados.join(" · "));
    if (c.formula) L.push("Fórmula: " + c.formula);
    L.push("", ...c.resultado);
    if (c.extra && c.extra.length) L.push("", ...c.extra);
    if (c.pressupostos && c.pressupostos.length) L.push("", "Pressupostos: " + c.pressupostos.join(" "));
    L.push("", "⚠ Cálculo ilustrativo: confirma sempre com o banco, o contabilista ou a lei em vigor. Mais simuladores em calculadoras.html.");
    return L.join("\n");
  }

  return { fmt, fmtM, fmtP, jurosSimples, montante, capital, tempoComposto, taxaComposta, pmt, fvAnuidade, pmtMeta, tabelaPrice, tabelaSAC, vpl, tir, payback, variacao, acumulada, fisher, margem, equilibrio, taxaEsforco, tempoDobrar, ivaDe, roi, analisar, calcular, formatar };
})();
if (typeof module !== "undefined") module.exports = Calc;
