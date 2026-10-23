// Biblioteca da Ngola: trechos de livros + fichas verificadas, pesquisa BM25
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
          this.trechos.push({ tipo: "trecho", id: t.id, livro: t.livro, area: d.area, v: t.v, p: t.p, loc: t.loc, cod: t.cod, idx: t.idx, prog: t.prog, t: t.t });
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
      if (t.prog) s *= 0.5;             // texto geral do programa do curso pesa menos do que as aulas
      if (s > 0) res.push({ ...t, score: s, achou, adj, cobertura: achou / todas.length });
    }
    res.sort((a, c) => c.score - a.score);
    if (!res.length) return [];
    // Só responde se o melhor trecho for mesmo relevante (calibrado com perguntas reais)
    const r0 = res[0];
    const forte = r0.achou >= 2 ? (r0.cobertura > 0.5 && (todas.length < 2 || r0.adj > 0)) : (todas.length === 1 && r0.score >= 6);
    const fraco = minCob > 0 && r0.cobertura >= minCob && r0.score >= 4.5; // banca/programação: 0.4 · fora do assunto: 0.8
    if (!forte && !fraco) return [];
    const fichasTrechos = new Set(res.filter(r => r.tipo === "ficha" && r.trecho_id).map(r => r.trecho_id));
    return res.filter(r => r.score >= res[0].score * 0.6 && !fichasTrechos.has(r.id)).slice(0, k);
  },

  // Texto de uma resposta feita só com trechos de conteúdo (os de índice tratam-se à parte)
  formatar(achados) {
    const juridico = achados.some(a => (a.area || "").startsWith("direito"));
    const intro = juridico ? "Encontrei isto na minha biblioteca (excerto de texto, não é aconselhamento jurídico):"
                           : "Encontrei isto na minha biblioteca:";
    const partes = achados.map((a, i) => {
      const tem = a.t.includes("```");
      const max = tem ? 1600 : 650;
      let t = a.t;
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

  // Quando só há títulos do índice do curso (sem conteúdo)
  formatarIndice(achados) {
    const linhas = achados.slice(0, 3).map(a => `• ${a.t.replace(/^-\s*/, "")} (${a.livro.split(" (")[0]})`);
    return "No índice do meu curso há aulas sobre isto, mas ainda não tenho o conteúdo delas:\n" + linhas.join("\n");
  },
};
