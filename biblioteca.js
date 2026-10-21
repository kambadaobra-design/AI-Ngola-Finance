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
          this.trechos.push({ tipo: "trecho", id: t.id, livro: t.livro, area: d.area, v: t.v, p: t.p, t: t.t });
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
    this.tf = []; this.len = []; this.df = {};
    let total = 0;
    for (const t of this.trechos) {
      const palavras = normalizar(t.busca || t.t), f = {};
      for (const p of palavras) f[p] = (f[p] || 0) + 1;
      for (const p in f) this.df[p] = (this.df[p] || 0) + 1;
      this.tf.push(f); this.len.push(palavras.length); total += palavras.length;
    }
    this.avg = total / (this.trechos.length || 1);
  },

  pesquisar(pergunta, k = 3) {
    const N = this.trechos.length;
    if (!N) return [];
    const todas = [...new Set(normalizar(pergunta))];
    const q = todas.filter(p => this.df[p]);
    if (!q.length) return [];
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
      if (s > 0) res.push({ ...t, score: s, cobertura: achou / todas.length });
    }
    res.sort((a, c) => c.score - a.score);
    if (!res.length || res[0].cobertura < 0.5) return [];
    const fichasTrechos = new Set(res.filter(r => r.tipo === "ficha" && r.trecho_id).map(r => r.trecho_id));
    return res.filter(r => r.score >= res[0].score * 0.6 && !fichasTrechos.has(r.id)).slice(0, k);
  },

  formatar(achados) {
    const juridico = achados.some(a => (a.area || "").startsWith("direito"));
    const intro = juridico ? "Encontrei isto na minha biblioteca (excerto de texto, não é aconselhamento jurídico):"
                           : "Encontrei isto na minha biblioteca:";
    const partes = achados.map((a, i) => {
      const t = a.t.length > 650 ? a.t.slice(0, 650).replace(/\s\S*$/, "") + "…" : a.t;
      let fonte = a.tipo === "ficha" ? `✔ verificado · ${a.livro}, pág. ${a.p}` : `📖 ${a.livro}, pág. ${a.p}`;
      if (a.v) fonte += ` (versão ${a.v})`;
      const atual = this.versoes[a.livro];
      if (a.tipo === "ficha" && atual && a.v && atual !== a.v)
        fonte += `\n⚠ O livro foi atualizado para a versão ${atual}: confirma se esta ficha ainda vale.`;
      return `[${i + 1}] ${t}\n${fonte}`;
    });
    return intro + "\n\n" + partes.join("\n\n");
  },
};
