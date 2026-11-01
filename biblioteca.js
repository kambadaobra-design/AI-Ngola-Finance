// NGOLA_V
(globalThis.NGOLA_V = globalThis.NGOLA_V || {}).biblioteca = 13;
// Biblioteca da Ngola: trechos de livros + fichas verificadas, pesquisa BM25

// Fórmulas LaTeX -> símbolos legíveis (sem bibliotecas de terceiros). Só para mostrar; a pesquisa usa o texto original.
const _SIMB = { alpha:"α", beta:"β", gamma:"γ", delta:"δ", Delta:"Δ", theta:"θ", pi:"π", sigma:"σ", Sigma:"Σ", mu:"μ", lambda:"λ", rho:"ρ", omega:"ω", epsilon:"ε",
  cdot:"·", times:"×", div:"÷", pm:"±", approx:"≈", equiv:"≡", ge:"≥", geq:"≥", le:"≤", leq:"≤", neq:"≠", infty:"∞", rightarrow:"→", to:"→", dots:"…", ldots:"…",
  sum:"Σ", prod:"Π", int:"∫", ln:"ln", log:"log", max:"max", min:"min", vert:"|", left:"", right:"", quad:" ", qquad:"  " };
const _SUP = { "0":"⁰","1":"¹","2":"²","3":"³","4":"⁴","5":"⁵","6":"⁶","7":"⁷","8":"⁸","9":"⁹","+":"⁺","-":"⁻","=":"⁼","(":"⁽",")":"⁾","n":"ⁿ","i":"ⁱ" };
const _SUB = { "0":"₀","1":"₁","2":"₂","3":"₃","4":"₄","5":"₅","6":"₆","7":"₇","8":"₈","9":"₉","+":"₊","-":"₋","=":"₌","(":"₍",")":"₎","a":"ₐ","e":"ₑ","h":"ₕ","i":"ᵢ","j":"ⱼ","k":"ₖ","l":"ₗ","m":"ₘ","n":"ₙ","o":"ₒ","p":"ₚ","r":"ᵣ","s":"ₛ","t":"ₜ","u":"ᵤ","v":"ᵥ","x":"ₓ" };

function _grupo(s, i) {                       // s[i] === "{": devolve [conteúdo, índice a seguir ao "}"]
  let prof = 0;
  for (let j = i; j < s.length; j++) { if (s[j] === "{") prof++; else if (s[j] === "}" && --prof === 0) return [s.slice(i + 1, j), j + 1]; }
  return [s.slice(i + 1), s.length];
}
function _marca(txt, mapa, pref) {            // converte para sobrescrito/subscrito Unicode, ou usa ^(…) / _(…)
  return [...txt].every(c => mapa[c]) ? [...txt].map(c => mapa[c]).join("") : (txt.length === 1 ? pref + txt : pref + "(" + txt + ")");
}

function latexParaTexto(s) {
  if (!/\\[A-Za-z]/.test(s)) return s;
  s = s.replace(/\\\\+/g, "\\");              // \\frac -> \frac
  const conv = (t) => {
    let out = "";
    for (let i = 0; i < t.length; ) {
      const c = t[i];
      if (c === "\\") {
        const m = t.slice(i + 1).match(/^[A-Za-z]+/);
        if (!m) { const n = t[i + 1]; out += (n === "," || n === ";" || n === "!" || n === " ") ? " " : (n || ""); i += 2; continue; }
        const nome = m[0]; i += 1 + nome.length;
        if (nome === "frac" && t[i] === "{") {
          const [a, i2] = _grupo(t, i); const [b, i3] = t[i2] === "{" ? _grupo(t, i2) : ["", i2]; i = i3;
          const A = conv(a), B = conv(b), simples = x => /^[\w.,·()ˆ̂]+$/.test(x) || x.length <= 2;
          out += (simples(A) ? A : "(" + A + ")") + "/" + (simples(B) ? B : "(" + B + ")"); continue;
        }
        if (["text", "mathrm", "textbf", "mathbf", "operatorname"].includes(nome) && t[i] === "{") { const [a, i2] = _grupo(t, i); out += conv(a); i = i2; continue; }
        if (nome === "hat" && t[i] === "{") { const [a, i2] = _grupo(t, i); out += conv(a) + "\u0302"; i = i2; continue; }
        if (nome === "bar" && t[i] === "{") { const [a, i2] = _grupo(t, i); out += conv(a) + "\u0304"; i = i2; continue; }
        if (nome === "sqrt" && t[i] === "{") { const [a, i2] = _grupo(t, i); out += "√(" + conv(a) + ")"; i = i2; continue; }
        out += (nome in _SIMB) ? _SIMB[nome] : nome; continue;
      }
      if ((c === "^" || c === "_") && i + 1 < t.length) {
        let arg, j;
        if (t[i + 1] === "{") { [arg, j] = _grupo(t, i + 1); } else { arg = t[i + 1]; j = i + 2; }
        out += _marca(conv(arg), c === "^" ? _SUP : _SUB, c); i = j; continue;
      }
      if (c === "{" && t.slice(i, i + 3) === "{,}") { out += ","; i += 3; continue; }
      if (c === "{" || c === "}" || c === "$") { i++; continue; }
      out += c; i++;
    }
    return out;
  };
  return conv(s).replace(/[ \t]{2,}/g, " ");
}

const biblioteca = {
  trechos: [], tf: [], len: [], df: {}, avg: 1,
  versoes: {},          // livro -> versão atual
  bloqueados: new Set(), // ids de trechos marcados como errados

  async carregar(base = "livros/") {
    try {
      const idx = await (await fetch(base + "index.json")).json();
      for (const f of idx.ficheiros) {
        const r = await fetch(base + f);
        if (!r.ok) continue;
        const d = await r.json();
        for (const t of d.trechos) {
          this.trechos.push({ tipo: "trecho", id: t.id, livro: t.livro, area: d.area, v: t.v, p: t.p, loc: t.loc, cod: t.cod, idx: t.idx, prog: t.prog, pais: t.pais, t: t.t, busca: t.idx ? t.t + " " + t.livro : undefined });
          if (t.v) this.versoes[t.livro] = t.v;
        }
      }
      this.indexar();
      console.log("Biblioteca:", this.trechos.length, "trechos");
    } catch (e) { console.warn("Biblioteca indisponível:", e); }
  },

  // Fichas: só "verificado" é usado nas respostas; "errado" bloqueia o trecho de origem
  async carregarFichas(cliente) {
    try {
      const { data, error } = await cliente.from("fichas").select("*").in("estado", ["verificado", "errado"]).limit(2000);
      if (error) throw error;
      this.trechos = this.trechos.filter(t => t.tipo !== "ficha");
      this.bloqueados = new Set();
      for (const f of data) {
        if (f.estado === "errado") { if (f.trecho_id) this.bloqueados.add(f.trecho_id); continue; }
        this.trechos.push({ tipo: "ficha", id: "ficha-" + f.id, trecho_id: f.trecho_id, livro: f.fonte_livro,
          area: f.tema || "", p: f.fonte_pagina, v: f.versao, t: f.texto, busca: (f.pergunta || "") + " " + f.texto });
      }
      this.indexar();
      console.log("Fichas verificadas:", this.trechos.filter(t => t.tipo === "ficha").length, "| bloqueados:", this.bloqueados.size);
    } catch (e) { console.warn("Fichas indisponíveis:", e); }
  },

  indexar() {
    this.tf = []; this.len = []; this.df = {}; this.seq = [];
    let total = 0;
    for (const t of this.trechos) {
      const palavras = normalizar(t.busca || t.t), f = {};
      for (const p of palavras) f[p] = (f[p] || 0) + 1;
      for (const p in f) this.df[p] = (this.df[p] || 0) + 1;
      this.tf.push(f); this.len.push(palavras.length); this.seq.push(palavras); total += palavras.length;
    }
    this.avg = total / (this.trechos.length || 1);
  },

  pesquisar(pergunta, k = 3, relaxado = false) {
    const N = this.trechos.length;
    if (!N) return [];
    const todas = [...new Set(normalizar(pergunta))];
    const q = todas.filter(p => this.df[p]);
    if (!q.length) return [];
    const minCob = relaxado === true ? 0.4 : (relaxado || 0), conj = new Set(todas);
    const k1 = 1.5, b = 0.75, res = [];
    for (let i = 0; i < N; i++) {
      const t = this.trechos[i];
      if (this.bloqueados.has(t.id)) continue;
      let s = 0, achou = 0;
      for (const p of q) {
        const f = this.tf[i][p]; if (!f) continue;
        achou++;
        const idf = Math.log(1 + (N - this.df[p] + 0.5) / (this.df[p] + 0.5));
        s += idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * this.len[i] / this.avg));
      }
      if (t.tipo === "ficha") s *= 1.4; // conhecimento verificado tem prioridade
      let adj = 0;                       // pares de palavras da pergunta que aparecem seguidas no trecho
      if (todas.length >= 2) { const q2 = this.seq[i]; for (let j = 0; j + 1 < q2.length; j++) if (q2[j] !== q2[j+1] && conj.has(q2[j]) && conj.has(q2[j+1])) adj++; }
      if (adj) s *= 1.25;
      if (t.prog) s *= 0.5;
      if (t.pais && t.pais !== "AO" && t.pais !== "INT") s *= 0.8; // direito de outros países pesa menos do que o angolano             // texto geral do programa do curso pesa menos do que as aulas
      if (s > 0) res.push({ ...t, score: s, achou, adj, cobertura: achou / todas.length });
    }
    res.sort((a, c) => c.score - a.score);
    if (!res.length) return [];
    // Só responde se o melhor trecho for mesmo relevante (calibrado com perguntas reais)
    const r0 = res[0];
    const forte = r0.achou >= 2 ? (r0.cobertura > 0.5 && (todas.length < 2 || r0.adj > 0)) : (todas.length === 1 && r0.score >= 6);
    const fraco = minCob > 0 && r0.cobertura >= minCob && r0.score >= 4.5 && (todas.length !== 2 || r0.achou < 2 || r0.adj > 0); // perguntas de 2 palavras: têm de aparecer seguidas // banca/programação: 0.4 · fora do assunto: 0.8
    if (!forte && !fraco) return [];
    const fichasTrechos = new Set(res.filter(r => r.tipo === "ficha" && r.trecho_id).map(r => r.trecho_id));
    return res.filter(r => r.score >= res[0].score * 0.6 && !fichasTrechos.has(r.id)).slice(0, k);
  },

  // Texto de uma resposta feita só com trechos de conteúdo (os de índice tratam-se à parte)
  formatar(achados) {
    const juridico = achados.some(a => (a.area || "").startsWith("direito"));
    const sufixo = a => /_brasil$|\(Brasil\)/i.test((a.area || "") + " " + (a.livro || "")) ? "BR" : /_portugal$|\(Portugal\)/i.test((a.area || "") + " " + (a.livro || "")) ? "PT" : "";
    const pais = achados.some(a => a.pais === "BR" || sufixo(a) === "BR") ? "brasil" : achados.some(a => a.pais === "PT" || sufixo(a) === "PT") ? "portugal" : "";
    const aviso = { brasil: "⚠ ATENÇÃO: este texto é de direito BRASILEIRO, não de Angola. Artigos e leis citados não valem cá.\n\n",
                    portugal: "⚠ ATENÇÃO: este texto é de direito PORTUGUÊS. O Código Civil angolano tem a mesma origem (1966), mas artigos e leis especiais podem ser diferentes em Angola. Confirma sempre no código angolano em vigor.\n\n" }[pais] || "";
    const intro = aviso + (juridico ? "Encontrei isto na minha biblioteca (excerto de texto, não é aconselhamento jurídico):"
                                    : "Encontrei isto na minha biblioteca:");
    const partes = achados.map((a, i) => {
      const tem = a.t.includes("```");
      const max = tem ? 1600 : 650;
      let t = a.t.split("```").map((p, k) => k % 2 ? p : latexParaTexto(p)).join("```");
      if (t.length > max) { t = t.slice(0, max).replace(/\s\S*$/, "") + "…"; if ((t.match(/```/g) || []).length % 2) t += "\n```"; }
      const onde = a.loc || ("pág. " + a.p);
      let fonte = a.tipo === "ficha" ? `✔ verificado · ${a.livro}, ${onde}` : `📖 ${a.livro}, ${onde}`;
      if (a.v) fonte += ` (versão ${a.v})`;
      const atual = this.versoes[a.livro];
      if (a.tipo === "ficha" && atual && a.v && atual !== a.v)
        fonte += `\n⚠ O livro foi atualizado para a versão ${atual}: confirma se esta ficha ainda vale.`;
      if (a.cod === 1) fonte += "\n⚠ Código reconstruído automaticamente (a indentação original perdeu-se; em testes ~82% das linhas saem certas). Confirma antes de copiar.";
      if (a.cod === 2) fonte += "\n⚠ Este código não passou na verificação de sintaxe. Não copies sem rever.";
      return `[${i + 1}] ${t}\n${fonte}`;
    });
    return intro + "\n\n" + partes.join("\n\n");
  },

  // Quantos trechos há por área (para o "que áreas conheces?")
  resumoAreas() {
    const cont = {};
    for (const t of this.trechos) { if (t.tipo === "ficha") continue; const k = t.area || "?"; cont[k] = cont[k] || { n: 0, p: new Set() }; cont[k].n++; if (t.pais) cont[k].p.add(t.pais); }
    const com = [], sem = [];
    for (const a of AREAS) {
      if (a.futuro) continue;
      const c = cont[a.id]; delete cont[a.id];
      if (!c && a.geral) { com.push(`• ${a.nome}: respostas gerais (poupança, câmbio, crédito, orçamento, investimento)`); continue; }
      if (c) com.push(`• ${a.nome}: ${c.n} trechos` + (c.p.size ? " (" + [...c.p].join(", ") + ")" : "")); else sem.push(a.nome);
    }
    const fora = Object.keys(cont).map(k => `• ${k} (fora do catálogo): ${cont[k].n} trechos`);
    return "Áreas que já tenho na biblioteca:\n" + ([...com, ...fora].join("\n") || "(nenhuma)") +
      "\n\nÁreas que conheço mas ainda estão sem conteúdo (por ensinar):\n" + sem.join(" · ") +
      "\n\nPergunta-me sobre qualquer uma das que já tenho.";
  },

  contagem(areaId) { return this.trechos.filter(t => t.tipo !== "ficha" && t.area === areaId).length; },

  // Quando só há títulos do índice do curso (sem conteúdo)
  formatarIndice(achados) {
    const linhas = achados.slice(0, 4).map(a => `• ${a.t.replace(/^-\s*/, "")} [${a.livro.split(" (")[0]}]`);
    return "Só tenho o índice (títulos e números, sem o texto) sobre isto:\n" + linhas.join("\n");
  },
};
