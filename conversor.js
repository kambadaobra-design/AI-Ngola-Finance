// Conversor de aulas/livros em trechos da biblioteca. Corre no navegador, sem servidor e sem Python.
// (Versão em JavaScript do que fizemos em Python: separa código de texto, repara o recuo, divide em trechos.)
const Conv = (() => {
  const ABRE = /^(?:async\s+)?(def|class|for|while|if|elif|else|try|except|finally|with)\b.*:\s*(#.*)?$/;
  const INICIO = /^(def |class |import |from \S+ import |@\w|for .+ in .+:|while .+:|if .+:|try:|with .+:|print\(|if __name__|#|[a-z_]\w*(\.\w+)*\s*(=|\+=|-=)\s*\S|[a-z_]\w*(\.\w+)*\(.*\)?$)/;
  const CODE_UP = /^([A-Z]\w*(\.\w+)*\s*(\(|=|\[|\.)|True\b|False\b|None\b)/;
  const EMOJI = /^[^\p{L}\p{N}_\s#@"'(\[{)\-]/u;
  const AULA = /^[^\wÀ-ú]*Aula\s+(\d+)\b\s*[:\-–—.]/;
  const BOX = /[─│┌┐└┘├┤┬┴┼═║╔╗╚╝╠╣╦╩╬]+/g;
  const slug = t => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "x";

  function aberto(txt) {                         // termina dentro de parênteses/aspas abertos?
    let i = 0, prof = 0, q = null; const n = txt.length;
    while (i < n) {
      const c = txt[i];
      if (q) {
        if (c === "\\") { i += 2; continue; }
        if (txt.startsWith(q, i)) { i += q.length; q = null; continue; }
      } else {
        if (c === "#") { const j = txt.indexOf("\n", i); i = j < 0 ? n : j; continue; }
        if (txt.startsWith('"""', i) || txt.startsWith("'''", i)) { q = txt.slice(i, i + 3); i += 3; continue; }
        if (c === '"' || c === "'") { q = c; i++; continue; }
        if ("([{".includes(c)) prof++; else if (")]}".includes(c)) prof = Math.max(0, prof - 1);
      }
      i++;
    }
    return prof > 0 || q !== null;
  }

  function ehProsa(s) {
    if (EMOJI.test(s)) return true;
    if (/^(Aula|Objetivo|Projeto|Abaixo|Com as|Neste|Nesta|Agora|Resumo|Nota|Exemplo|Observa|\d+\.\s+[A-ZÀ-Ú])/.test(s)) return true;
    return /^[A-ZÀ-Ú]/.test(s) && !CODE_UP.test(s) && s.split(/\s+/).length >= 3;
  }

  function segmentar(linhas) {
    const segs = []; let cur = [], tipo = "prosa";
    const fechar = () => { if (cur.length) { segs.push([tipo, cur]); cur = []; } };
    for (const raw of linhas) {
      const s = raw.trim();
      if (!s) { if (tipo === "codigo") cur.push(""); continue; }
      if (tipo === "codigo") {
        if (!aberto(cur.join("\n")) && ehProsa(s)) { while (cur.length && cur[cur.length - 1] === "") cur.pop(); fechar(); tipo = "prosa"; cur = [s]; }
        else cur.push(raw);
      } else if (INICIO.test(s) && !ehProsa(s)) { fechar(); tipo = "codigo"; cur = [raw]; }
      else cur.push(s);
    }
    while (cur.length && cur[cur.length - 1] === "") cur.pop();
    fechar(); return segs;
  }

  const recuo = l => l.length - l.trimStart().length;
  function semRecuo(L) {                          // o recuo perdeu-se? (bloco aberto seguido de linha sem recuo)
    for (let i = 0; i < L.length - 1; i++) {
      if (ABRE.test(L[i].trim())) {
        let j = i + 1; while (j < L.length && !L[j].trim()) j++;
        if (j < L.length && recuo(L[j]) <= recuo(L[i])) return true;
      }
    }
    return false;
  }

  function desembrulhar(linhas) {                 // junta linhas partidas a meio e separa instruções coladas
    const out = []; let acc = null;
    for (const raw of linhas) {
      const s = raw.trim();
      if (acc !== null) { acc += " " + s; if (!aberto(acc)) { out.push(acc); acc = null; } continue; }
      if (!s) { out.push(""); continue; }
      if (/^[=\-_]{5,}$/.test(s)) continue;
      const m = s.match(/^(from \S+ import \S+) (import .+)$/);
      if (m) { out.push(m[1], m[2]); continue; }
      if (out.length && out[out.length - 1].startsWith("#") && /^\([^=]*\)$/.test(s)) { out[out.length - 1] += " " + s; continue; }
      if (aberto(s)) acc = s; else out.push(s);
    }
    if (acc !== null) out.push(acc);
    return out.filter(l => l !== "#");
  }

  function reindentar(linhas) {
    const out = [], n = linhas.length; let stack = [], nivel = 0, abriu = false, terminou = false;
    const proximo = i => { for (let k = i + 1; k < n; k++) { const t = linhas[k].trim(); if (t.startsWith("@") || !t) continue; return t; } return ""; };
    for (let i = 0; i < n; i++) {
      const s = linhas[i];
      if (!s) { out.push([null, ""]); continue; }
      const w = (s.match(/^[A-Za-z_]+/) || [""])[0];
      if (s.startsWith("#")) { out.push([null, s]); continue; }
      if (["elif", "else", "except", "finally"].includes(w)) {
        const quer = { elif: ["if", "elif"], else: ["if", "elif", "for", "while", "try", "except"], except: ["try", "except"], finally: ["try", "except", "else"] }[w];
        while (stack.length && !quer.includes(stack[stack.length - 1][0])) stack.pop();
        if (stack.length) { nivel = stack[stack.length - 1][1]; stack[stack.length - 1] = [w, nivel]; } else nivel = 0;
      } else if (w === "def" || w === "class" || s.startsWith("@") || s.startsWith("async def")) {
        const alvo = s.startsWith("@") ? proximo(i) : s;
        const metodo = /^(async )?def \w+\((self|cls)\b/.test(alvo) || /^@(staticmethod|classmethod|property|abstractmethod)/.test(s) || /^@\w+\.(setter|getter)/.test(s);
        if (abriu) nivel += 1;
        else if (metodo) { while (stack.length && stack[stack.length - 1][0] !== "class") stack.pop(); nivel = stack.length ? stack[stack.length - 1][1] + 1 : 0; }
        else { stack = []; nivel = 0; }
        if (w === "def" || w === "class" || s.startsWith("async def")) {
          while (stack.length && stack[stack.length - 1][1] >= nivel) stack.pop();
          stack.push([w === "class" ? "class" : "def", nivel]);
        }
      } else {
        if (abriu) nivel += 1; else if (terminou) nivel = Math.max(nivel - 1, 0);
        if (s.startsWith("if __name__") || ((w === "import" || w === "from") && !abriu)) nivel = 0;
        while (stack.length && stack[stack.length - 1][1] >= nivel && !["class", "def"].includes(stack[stack.length - 1][0])) stack.pop();
        if (ABRE.test(s)) stack.push([w, nivel]);
      }
      out.push([nivel, s]);
      abriu = ABRE.test(s); terminou = ["return", "break", "continue", "raise", "pass"].includes(w);
      if (abriu && !["else", "elif", "except", "finally", "def", "class"].includes(w) && !stack.length) stack.push([w, nivel]);
    }
    return out.map(([nv, s], i) => {
      if (nv === null && s) { let nx = 0; for (let k = i + 1; k < out.length; k++) if (out[k][0] !== null && out[k][1]) { nx = out[k][0]; break; } return "    ".repeat(nx) + s; }
      return s ? "    ".repeat(nv || 0) + s : "";
    });
  }

  // Verificação leve (no navegador não há analisador de Python): parênteses/aspas fechados e blocos seguidos de linha com mais recuo
  function plausivel(L) {
    if (aberto(L.join("\n"))) return false;
    for (let i = 0; i < L.length - 1; i++) if (ABRE.test(L[i].trim())) {
      let j = i + 1; while (j < L.length && !L[j].trim()) j++;
      if (j >= L.length || recuo(L[j]) <= recuo(L[i])) return false;
    }
    return true;
  }

  function preparar(texto, python, stats) {
    const L = texto.split("\n").map(l => l.replace(BOX, " ").replace(/\u200b/g, "").replace(/^\t+/, m => "    ".repeat(m.length)).replace(/\t/g, "    ").replace(/\s+$/, ""));
    if (!python) return L.filter(l => l.trim()).map(l => ["p", l.trim()]);
    const blocos = [];
    for (const [tipo, linhas] of segmentar(L)) {
      if (tipo === "prosa") { linhas.forEach(l => blocos.push(["p", l])); continue; }
      let novo, est;
      if (semRecuo(linhas)) { novo = reindentar(desembrulhar(linhas)); est = plausivel(novo) ? "rec" : "bad"; }
      else { novo = linhas; est = plausivel(linhas) ? "ok" : "bad"; }
      stats[est]++; blocos.push(["c", novo, est]);
    }
    return blocos;
  }

  function dividir(blocos, loc0, maxp = 140) {
    const out = []; let partes = [], n = 0, loc = loc0, cod = 0, chunkLoc = loc0, prosa = [];
    const fechar = () => {
      const txt = partes.join("\n").trim();
      if (txt && n >= 8) {
        const t = { t: txt }; if (chunkLoc) t.loc = chunkLoc; if (cod) t.cod = cod;
        if (n <= 25 && /^-?\s*Aula\s+\d+/.test(txt)) t.idx = 1;
        out.push(t);
      }
      partes = []; n = 0; cod = 0; chunkLoc = loc;
    };
    const vazar = () => { if (prosa.length) { partes.push(prosa.join(" ")); prosa = []; } };
    for (const b of blocos) {
      if (b[0] === "p") {
        const m = b[1].match(AULA);
        if (m) { vazar(); fechar(); loc = "Aula " + m[1]; chunkLoc = loc; }
        if (chunkLoc === null || chunkLoc === undefined) chunkLoc = loc;
        prosa.push(b[1]); n += b[1].split(/\s+/).length;
        if (n >= maxp) { vazar(); fechar(); }
      } else {
        vazar(); const [, linhas, est] = b;
        const palavras = linhas.reduce((a, l) => a + l.split(/\s+/).filter(Boolean).length, 0);
        if (n && n + palavras > maxp * 1.6) fechar();
        let sub = [], cnt = 0;
        for (const l of linhas) {
          if (cnt >= 170 && l && !l.startsWith(" ")) { partes.push("```\n" + sub.join("\n").replace(/\s+$/, "") + "\n```"); n += cnt; fechar(); sub = []; cnt = 0; }
          sub.push(l); cnt += l.split(/\s+/).filter(Boolean).length;
        }
        if (sub.length) { partes.push("```\n" + sub.join("\n").replace(/\s+$/, "") + "\n```"); n += cnt; }
        cod = Math.max(cod, est === "bad" ? 2 : est === "rec" ? 1 : 0);
        if (chunkLoc === null || chunkLoc === undefined) chunkLoc = loc;
        if (n >= maxp) fechar();
      }
    }
    vazar(); fechar(); return out;
  }

  // texto -> trechos. opcoes: {livro, versao, python}
  function converter(texto, { livro, versao, python, pais }) {
    const stats = { ok: 0, rec: 0, bad: 0 };
    const topo = texto.trim().split("\n").slice(0, 3).join(" ");
    const m = topo.match(/\bAulas?\s+(\d+)(?:\s*(?:e|a|-)\s*(\d+))?/);
    const loc0 = m ? (m[2] ? `Aulas ${m[1]} e ${m[2]}` : `Aula ${m[1]}`) : null;
    const trechos = dividir(preparar(texto, python, stats), loc0).map(t => ({ ...t, livro, v: versao, ...(pais ? { pais } : {}) }));
    return { trechos, stats };
  }

  // junta aos trechos existentes: aulas com a mesma etiqueta são substituídas (inclui as linhas de índice)
  function juntar(existente, novos, area, livro) {
    const ex = existente ? existente.trechos : [];
    const locs = new Set(novos.map(t => t.loc).filter(l => l && !l.startsWith("parte")));
    const manter = ex.filter(t => !(t.livro === livro && locs.has(t.loc)));
    const removidos = ex.length - manter.length;
    let p = Math.max(0, ...manter.filter(t => t.livro === livro).map(t => t.p || 0));
    const stamp = Date.now().toString(36), base = slug(livro) + "-v" + slug(novos[0] ? novos[0].v : "x");
    const add = novos.map((t, i) => { p++; return { id: `${base}-${stamp}-${i + 1}`, livro: t.livro, v: t.v, ...(t.pais ? { pais: t.pais } : {}), p, loc: t.loc || `parte ${p}`, ...(t.cod ? { cod: t.cod } : {}), ...(t.idx ? { idx: 1 } : {}), t: t.t }; });
    return { dados: { area, trechos: [...manter, ...add] }, removidos, locs: [...locs] };
  }


  // ---------- ÍNDICES (de leis e livros): só títulos e números, sem o texto ----------
  const semAcentos = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const NIVEL = [["LIVRO", 0], ["SUBTITULO", 2], ["TITULO", 1], ["SUBSECCAO", 5], ["SECCAO", 4], ["CAPITULO", 3], ["DIVISAO", 6]];
  const nivelDe = l => { const u = semAcentos(l.trim()).toUpperCase(); for (const [k, n] of NIVEL) if (new RegExp("^" + k + "\\b").test(u)) return n; return -1; };
  const ARTIGO = /(\d{1,4})\s*\.?\s*[ºo°]\s*\.?\s*$/;                     // "... 642.º"
  const PAG = /^(.*?)\s*[.·…]{2,}\s*(\d{1,4})?\s*$|^(.*\S)\s+\(pág\.\s*(\d+)\)\s*$/;

  const junta = (a, b) => /[a-zà-ú]-$/.test(a) && /^[a-zà-ú]/.test(b) ? a.slice(0, -1) + b : a + " " + b;
  const bonito = t => {                                                  // "TÍTULO II — DO PROCESSO" -> "Título II — Do processo"
    const [pre, ...resto] = t.split(" — "), maius = s => s && s === s.toUpperCase() && /[A-ZÀ-Ú]/.test(s);
    const k = pre.split(" "); const cab = k[0] && maius(k[0]) ? k[0][0] + k[0].slice(1).toLowerCase() : k[0];
    const frase = s => maius(s) ? s[0] + s.slice(1).toLowerCase() : s;
    return [[cab, ...k.slice(1)].join(" "), ...resto.map(frase)].join(" — ");
  };
  function converterIndice(texto, { livro, versao, pais, loc }) {
    const entradas = []; let pilha = [], ultimo = null, buf = [];
    const limpaLinha = l => l.replace(BOX, " ").replace(/\u200b/g, "").replace(/\s+$/, "").trim();
    for (const bruta of texto.split("\n")) {
      const l = limpaLinha(bruta); if (!l) continue;
      const n = nivelDe(l);
      if (n >= 0) {                                                   // linha de índice sistemático
        buf = []; ultimo = { n, bruto: l, pag: null }; entradas.push(ultimo);
        const m = l.match(PAG);
        if (m && m[1] !== undefined) { ultimo.titulo = m[1].trim(); ultimo.pag = m[2] || null; ultimo.fechado = !!m[2]; }
        else if (m) { ultimo.titulo = m[3].trim(); ultimo.pag = m[4]; ultimo.fechado = true; }
        else { ultimo.titulo = l; ultimo.fechado = false; }
      } else if (ultimo && !ultimo.fechado && !ARTIGO.test(l) && buf.length === 0) {   // título que continua na linha seguinte
        const m = l.match(PAG);
        if (m && m[1] !== undefined) { ultimo.titulo = junta(ultimo.titulo, m[1].trim()); ultimo.pag = m[2] || null; ultimo.fechado = !!m[2]; }
        else if (m) { ultimo.titulo = junta(ultimo.titulo, m[3].trim()); ultimo.pag = m[4]; ultimo.fechado = true; }
        else ultimo.titulo = junta(ultimo.titulo, l);
      } else {                                                         // índice de epígrafes: acumula até ao "NNN.º"
        buf.push(l);
        if (ARTIGO.test(l)) {
          const txt = buf.reduce((a, b2, k) => k === 0 ? b2 : (buf.length === 2 ? a + " — " + b2 : junta(a, b2)), "");
          entradas.push({ epigrafe: txt.replace(/;?\s*(\d{1,4})\s*\.?\s*[ºo°]\s*\.?\s*$/, " (artigo $1.º)") }); buf = []; ultimo = null;
        }
      }
    }
    const trechos = [];
    for (const e of entradas) {
      if (e.epigrafe) { trechos.push({ t: e.epigrafe.replace(/\s+/g, " "), idx: 1, loc: loc || "índice de epígrafes" }); continue; }
      while (pilha.length && pilha[pilha.length - 1].n >= e.n) pilha.pop();
      const caminho = pilha.map(p => p.titulo), tit = bonito(e.titulo.replace(/\s+/g, " "));
      pilha.push({ n: e.n, titulo: tit });
      const t = [...caminho, tit].join(" › ") + (e.pag ? ` (pág. ${e.pag})` : "");
      trechos.push({ t, idx: 1, loc: loc || "índice sistemático" });
    }
    return { trechos: trechos.map(t => ({ ...t, livro, v: versao, ...(pais ? { pais } : {}) })), stats: { ok: 0, rec: 0, bad: 0 } };
  }

  return { converter, converterIndice, juntar, slug, aberto };
})();
if (typeof module !== "undefined") module.exports = Conv;
