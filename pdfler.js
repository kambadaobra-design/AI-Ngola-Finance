// Leitura de PDFs na página Ensinar, SEM serviços externos.
// Usa o pdf.js (Mozilla, código aberto) copiado para a pasta pdfjs/ do TEU site: ver pdfjs/LEIAME.txt.
//  - PDF com texto: lê o texto diretamente (e põe as duas colunas pela ordem certa)
//  - PDF digitalizado (imagens): desenha a página e lê com o OCR da página Ensinar
const PdfLer = (() => {
  const CANDIDATAS = ["pdfjs/", "PDFJS/"];                        // o GitHub Pages distingue maiúsculas de minúsculas
  let BASE = "pdfjs/", localizada = false, lib = null;
  const existe = async url => { try { return (await fetch(url + "?t=" + Date.now(), { method: "HEAD" })).ok; } catch (e) { return false; } };
  async function localizar() { if (localizada) return BASE; for (const c of CANDIDATAS) if (await existe(c + "pdf.min.js")) { BASE = c; break; } localizada = true; return BASE; }
  async function verificar() {
    await localizar(); const faltam = [];
    for (const n of ["pdf.min.js", "pdf.worker.min.js"]) if (!(await existe(BASE + n))) faltam.push(BASE + n);
    return { ok: !faltam.length, faltam, pasta: BASE };
  }
  async function carregar() {
    if (lib) return lib;
    await localizar();
    const obter = () => globalThis["pdfjs-dist/build/pdf"] || globalThis.pdfjsLib;
    if (!obter()) await new Promise((res, rej) => { const s = document.createElement("script"); s.src = BASE + "pdf.min.js"; s.onload = res; s.onerror = () => rej(new Error("Não consegui carregar " + BASE + "pdf.min.js")); document.head.appendChild(s); });
    lib = obter(); if (!lib) throw new Error("O pdf.js não ficou disponível.");
    lib.GlobalWorkerOptions.workerSrc = BASE + "pdf.worker.min.js";
    return lib;
  }

  // ---- organiza os fragmentos de texto de uma página: linhas, e duas colunas (esquerda inteira, depois direita) ----
  // itens: [{ str, x, y, w, h }]  (y cresce para cima, como no PDF)
  function organizarItens(itens) {
    const it = itens.filter(i => i.str && i.str.trim() !== "").map(i => ({ ...i, cx: i.x + i.w / 2 }));
    if (!it.length) return "";
    const hs = it.map(i => i.h).filter(h => h > 0).sort((a, b) => a - b), hm = hs.length ? hs[hs.length >> 1] : 10;
    const linhasDe = lista => {
      const ord = [...lista].sort((a, b) => b.y - a.y || a.x - b.x), linhas = [];
      for (const i of ord) { const l = linhas[linhas.length - 1]; if (l && Math.abs(l.y - i.y) <= hm * 0.5) l.itens.push(i); else linhas.push({ y: i.y, itens: [i] }); }
      return linhas.map(l => {
        l.itens.sort((a, b) => a.x - b.x); let s = "";
        l.itens.forEach((i, k) => { if (k) { const a = l.itens[k - 1]; if (i.x - (a.x + a.w) > hm * 0.2 && !/\s$/.test(s) && !/^\s/.test(i.str)) s += " "; } s += i.str; });
        return { y: l.y, texto: s.replace(/\s+/g, " ").trim() };
      }).filter(l => l.texto);
    };
    const x0 = Math.min(...it.map(i => i.x)), x1 = Math.max(...it.map(i => i.x + i.w)), W = x1 - x0, passo = Math.max(1, W / 400);
    const cob = new Int32Array(Math.ceil(W / passo) + 3);
    for (const i of it) for (let b = Math.floor((i.x - x0) / passo); b <= Math.floor((i.x + i.w - x0) / passo); b++) cob[b]++;
    const tol = Math.max(1, Math.round(linhasDe(it).length * 0.06)), a = Math.floor(0.3 * W / passo), z = Math.floor(0.7 * W / passo);
    let melhor = null, ini = -1;
    for (let b = a; b <= z + 1; b++) { const vazio = b <= z && cob[b] <= tol; if (vazio && ini < 0) ini = b; if (!vazio && ini >= 0) { if (!melhor || b - ini > melhor.len) melhor = { ini, len: b - ini }; ini = -1; } }
    if (melhor && melhor.len * passo >= W * 0.025) {
      const g = x0 + (melhor.ini + melhor.len / 2) * passo, cruza = i => i.x < g && i.x + i.w > g;
      const esq = it.filter(i => !cruza(i) && i.cx < g), dir = it.filter(i => !cruza(i) && i.cx >= g), largos = it.filter(cruza);
      if (esq.length >= it.length * 0.25 && dir.length >= it.length * 0.25) {
        const yTopo = Math.max(...esq.concat(dir).map(i => i.y)) - hm * 0.5, partes = [];
        partes.push(...linhasDe(largos.filter(i => i.y >= yTopo)), ...linhasDe(esq), ...linhasDe(dir), ...linhasDe(largos.filter(i => i.y < yTopo)));
        return partes.map(l => l.texto).join("\n");
      }
    }
    return linhasDe(it).map(l => l.texto).join("\n");
  }

  async function extrairTexto(pagina) {
    const tc = await pagina.getTextContent();
    return organizarItens(tc.items.filter(i => i.str !== undefined).map(i => ({ str: i.str, x: i.transform[4], y: i.transform[5], w: i.width, h: Math.abs(i.height || i.transform[3]) })));
  }

  // Lê um PDF. opcoes: { de, ate, modo: "auto"|"texto"|"ocr", colunas, progresso, prog }
  async function lerPdf(ficheiro, { de = 1, ate = null, modo = "auto", colunas = "auto", progresso, prog } = {}) {
    const pdfjs = await carregar();
    const doc = await pdfjs.getDocument({ data: await ficheiro.arrayBuffer(), isEvalSupported: false }).promise;   // isEvalSupported:false evita a falha CVE-2024-4367 do pdf.js 3.x
    const total = doc.numPages, a = Math.max(1, de), b = Math.min(total, ate || total), saida = []; let comTexto = 0, comOcr = 0;
    for (let p = a; p <= b; p++) {
      progresso && progresso(`PDF: página ${p} de ${b}…`);
      const pg = await doc.getPage(p); let txt = "";
      if (modo !== "ocr") txt = await extrairTexto(pg);
      if (modo !== "ocr" && (txt.match(/[A-Za-zÀ-ÿ]/g) || []).length >= 40) { saida.push(globalThis.Ocr ? Ocr.limpar(txt) : txt); comTexto++; continue; }
      if (modo === "texto") continue;                                      // só texto: páginas de imagem ficam de fora
      const vp = pg.getViewport({ scale: 2 }), c = document.createElement("canvas"); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
      const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
      await pg.render({ canvasContext: x, viewport: vp }).promise;
      Ocr.contraste(c);
      const r = await Ocr.lerPagina(c, colunas, prog); saida.push(Ocr.limpar(r.texto)); comOcr++;
    }
    return { texto: saida.join("\n\n"), paginas: b - a + 1, comTexto, comOcr, total };
  }

  return { verificar, carregar, lerPdf, organizarItens, localizar };
})();
if (typeof module !== "undefined") module.exports = PdfLer;
