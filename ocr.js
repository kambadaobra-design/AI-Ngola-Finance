// Leitura de fotografias (OCR) no navegador, SEM serviços externos.
// Usa o Tesseract.js (código aberto) copiado para a pasta ocr/ do TEU site: ver ocr/LEIAME.txt.
// As fotografias nunca saem do teu navegador.
const Ocr = (() => {
  // O GitHub Pages distingue maiúsculas de minúsculas: aceita a pasta "ocr/" ou "OCR/".
  const CANDIDATAS = ["ocr/", "OCR/"];
  let BASE = "ocr/", localizada = false, worker = null;
  const PSM_AUTO = (globalThis.Tesseract && Tesseract.PSM && Tesseract.PSM.AUTO) || "3";
  const obrigatorios = () => [BASE + "tesseract.min.js", BASE + "worker.min.js", BASE + "lang/por.traineddata.gz",
                              BASE + "core/tesseract-core-simd-lstm.wasm.js", BASE + "core/tesseract-core-lstm.wasm.js"];

  async function existe(url) { try { return (await fetch(url + "?t=" + Date.now(), { method: "HEAD" })).ok; } catch (e) { return false; } }
  async function localizar() {                                    // descobre se a pasta se chama ocr/ ou OCR/
    if (localizada) return BASE;
    for (const c of CANDIDATAS) if (await existe(c + "tesseract.min.js")) { BASE = c; break; }
    localizada = true; return BASE;
  }
  async function verificar() {
    await localizar(); const faltam = [];
    for (const u of obrigatorios()) if (!(await existe(u))) faltam.push(u);
    return { ok: !faltam.length, faltam, pasta: BASE };
  }

  function carregarScript() {
    return new Promise((res, rej) => {
      if (globalThis.Tesseract) return res();
      const s = document.createElement("script"); s.src = BASE + "tesseract.min.js";
      s.onload = res; s.onerror = () => rej(new Error("Não consegui carregar ocr/tesseract.min.js")); document.head.appendChild(s);
    });
  }
  async function iniciar(progresso) {
    if (worker) return worker;
    await localizar();
    await carregarScript();
    worker = await Tesseract.createWorker("por", 1, { workerPath: BASE + "worker.min.js", corePath: BASE + "core", langPath: BASE + "lang", logger: m => progresso && progresso(m) });
    await worker.setParameters({ tessedit_pageseg_mode: PSM_AUTO });   // por omissão o motor trata a página como UM bloco e cola as colunas
    return worker;
  }

  // ---- imagem: rodar, tons de cinzento, esticar o contraste, (opcional) dividir em duas páginas ----
  function contraste(c) {
    const x = c.getContext("2d"), img = x.getImageData(0, 0, c.width, c.height), d = img.data, hist = new Uint32Array(256);
    for (let i = 0; i < d.length; i += 4) { const g = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0; d[i] = d[i + 1] = d[i + 2] = g; hist[g]++; }
    const total = d.length / 4; let acc = 0, lo = 0, hi = 255;
    for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= total * 0.01) { lo = v; break; } }
    acc = 0; for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc >= total * 0.01) { hi = v; break; } }
    const k = hi > lo ? 255 / (hi - lo) : 1;
    for (let i = 0; i < d.length; i += 4) { const g = Math.max(0, Math.min(255, (d[i] - lo) * k)) | 0; d[i] = d[i + 1] = d[i + 2] = g; }
    x.putImageData(img, 0, 0);
  }
  function recortar(c, sx, sy, sw, sh) {
    const o = document.createElement("canvas"); o.width = Math.round(sw); o.height = Math.round(sh);
    o.getContext("2d").drawImage(c, sx, sy, sw, sh, 0, 0, o.width, o.height); return o;
  }
  async function preparar(ficheiro, { rot = 0, dividir = false, max = 2400 } = {}) {
    const bmp = await createImageBitmap(ficheiro), girar = rot % 180 !== 0;
    const w = girar ? bmp.height : bmp.width, h = girar ? bmp.width : bmp.height, esc = Math.min(1, max / Math.max(w, h));
    const cw = Math.round(w * esc), ch = Math.round(h * esc);
    const c = document.createElement("canvas"); c.width = cw; c.height = ch;
    const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, cw, ch);
    x.translate(cw / 2, ch / 2); x.rotate(rot * Math.PI / 180);
    const dw = girar ? ch : cw, dh = girar ? cw : ch;
    x.drawImage(bmp, -dw / 2, -dh / 2, dw, dh);
    contraste(c);
    return dividir ? [recortar(c, 0, 0, cw / 2, ch), recortar(c, cw / 2, 0, cw / 2, ch)] : [c];
  }

  async function ler(canvas, progresso) { const w = await iniciar(progresso); const { data } = await w.recognize(canvas); return { texto: data.text, confianca: data.confidence }; }
  async function detetarRotacao(ficheiro, progresso) {            // tenta 0° e 180° numa cópia pequena e escolhe a de maior confiança
    const r = [];
    for (const rot of [0, 180]) { const [c] = await preparar(ficheiro, { rot, max: 1100 }); r.push({ rot, conf: (await ler(c, progresso)).confianca }); }
    return r.sort((a, b) => b.conf - a.conf)[0].rot;
  }
  async function autoteste() {                                     // desenha uma linha de texto e vê se o OCR a lê
    const c = document.createElement("canvas"); c.width = 900; c.height = 150; const x = c.getContext("2d");
    x.fillStyle = "#fff"; x.fillRect(0, 0, 900, 150); x.fillStyle = "#000"; x.font = "52px serif"; x.fillText("SECÇÃO VI — Arresto 237", 20, 95);
    return (await ler(c)).texto.trim();
  }


  // ---------- COLUNAS: deteta a margem (mesmo inclinada) entre duas colunas e separa-as ----------
  // Trabalha com matrizes de cinzentos (Uint8Array), por isso também se testa fora do navegador.
  function limiarOtsu(g) {
    const h = new Float64Array(256); for (let i = 0; i < g.length; i++) h[g[i]]++;
    let soma = 0; for (let t = 0; t < 256; t++) soma += t * h[t];
    let sB = 0, wB = 0, melhor = 0, lim = 127;
    for (let t = 0; t < 256; t++) { wB += h[t]; if (!wB) continue; const wF = g.length - wB; if (!wF) break; sB += t * h[t];
      const mB = sB / wB, mF = (soma - sB) / wF, v = wB * wF * (mB - mF) * (mB - mF); if (v > melhor) { melhor = v; lim = t; } }
    return lim;
  }

  // devolve { ok, a, b, yIni } onde a margem é x = a + b*y (tudo à esquerda é coluna 1, à direita coluna 2)
  function detetarColunas(gray, w, h) {
    const lim = limiarOtsu(gray) * 0.92;                              // um pouco abaixo de Otsu: só tinta escura
    const fh = Math.max(32, Math.round(h / 40)), passo = Math.max(8, fh >> 1);
    const x0 = Math.round(w * 0.15), x1 = Math.round(w * 0.88), cand = []; let faixasComTexto = 0;
    for (let y = 0; y + fh <= h; y += passo) {
      const col = new Int32Array(w); let tinta = 0;
      for (let yy = y; yy < y + fh; yy++) { const o = yy * w; for (let x = x0; x < x1; x++) if (gray[o + x] < lim) { col[x]++; tinta++; } }
      if (tinta < (x1 - x0) * fh * 0.012) continue;
      faixasComTexto++;
      const tol = Math.max(1, Math.round(fh * 0.05)); let ini = -1;
      for (let x = x0; x <= x1; x++) {
        const vazio = x < x1 && col[x] <= tol;
        if (vazio && ini < 0) ini = x;
        if (!vazio && ini >= 0) { const len = x - ini; if (len >= w * 0.018 && len <= w * 0.16) cand.push({ y: y + fh / 2, x: ini + len / 2, len }); ini = -1; }
      }
    }
    if (cand.length < 6) return { ok: false, motivo: "poucos candidatos", faixasComTexto };
    let melhor = null;                                                // RANSAC: a recta x = a + b*y com mais pontos próximos
    for (let i = 0; i < cand.length; i++) for (let j = i + 1; j < cand.length; j++) {
      const dy = cand[j].y - cand[i].y; if (Math.abs(dy) < h * 0.12) continue;
      const b = (cand[j].x - cand[i].x) / dy; if (Math.abs(b) > 0.35) continue;
      const a = cand[i].x - b * cand[i].y; let n = 0; for (const c of cand) if (Math.abs(c.x - (a + b * c.y)) <= w * 0.012) n++;
      if (!melhor || n > melhor.n) melhor = { a, b, n };
    }
    if (!melhor) return { ok: false, motivo: "sem recta", faixasComTexto };
    const dentro = cand.filter(c => Math.abs(c.x - (melhor.a + melhor.b * c.y)) <= w * 0.012);
    const ys = dentro.map(c => c.y), faixasDistintas = new Set(ys.map(y => Math.round(y / passo))).size;
    let sy = 0, sx = 0, syy = 0, sxy = 0; for (const c of dentro) { sy += c.y; sx += c.x; syy += c.y * c.y; sxy += c.y * c.x; }
    const n = dentro.length, den = n * syy - sy * sy, b = den ? (n * sxy - sy * sx) / den : melhor.b, a = (sx - b * sy) / n;   // mínimos quadrados
    const cobre = (Math.max(...ys) - Math.min(...ys)) / h;
    const ok = faixasDistintas >= Math.max(6, faixasComTexto * 0.4) && cobre >= 0.3;
    // o cabeçalho acaba na última linha em branco acima da primeira faixa com margem (em vez de cortar uma linha de texto ao meio)
    const primeira = Math.min(...ys) - fh / 2; let yIni = Math.max(0, Math.round(primeira - fh * 1.5));
    for (let y = Math.round(primeira); y > Math.max(0, primeira - fh * 3); y--) {
      let tinta = 0; for (let x = 0; x < w; x++) if (gray[y * w + x] < lim) tinta++;
      if (tinta <= w * 0.004) { yIni = y; break; }
    }
    return { ok, a, b, yIni, faixasDistintas, faixasComTexto, cobre };
  }

  // copia só uma parte da página (lado esquerdo/direito da margem, ou o cabeçalho) e põe o resto a branco
  function mascarar(gray, w, h, col, parte) {
    const out = new Uint8Array(w * h).fill(255);
    for (let y = 0; y < h; y++) {
      const xs = col.a + col.b * y;
      for (let x = 0; x < w; x++) {
        const quer = parte === "cabecalho" ? y < col.yIni : y >= col.yIni && (parte === "esq" ? x < xs : x >= xs);
        if (quer) out[y * w + x] = gray[y * w + x];
      }
    }
    return out;
  }


  // caixa que contém o texto (recorte rente), com margem
  function caixaTexto(gray, w, h, lim, margem = 25) {
    const L = new Int32Array(h), C = new Int32Array(w);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (gray[y * w + x] < lim) { L[y]++; C[x]++; }
    const ruido = 3; let y0 = 0, y1 = h - 1, x0 = 0, x1 = w - 1;
    while (y0 < h - 1 && L[y0] <= ruido) y0++; while (y1 > y0 && L[y1] <= ruido) y1--;
    while (x0 < w - 1 && C[x0] <= ruido) x0++; while (x1 > x0 && C[x1] <= ruido) x1--;
    return { x0: Math.max(0, x0 - margem), y0: Math.max(0, y0 - margem), x1: Math.min(w - 1, x1 + margem), y1: Math.min(h - 1, y1 + margem) };
  }

  function canvasDeCinzentos(gray, w, h) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const x = c.getContext("2d"), img = x.createImageData(w, h);
    for (let i = 0; i < w * h; i++) { img.data[4 * i] = img.data[4 * i + 1] = img.data[4 * i + 2] = gray[i]; img.data[4 * i + 3] = 255; }
    x.putImageData(img, 0, 0); return c;
  }
  function recorteAmpliado(gray, w, h, lim, escala = 2) {            // recorta rente ao texto e amplia (melhora muito a leitura)
    const b = caixaTexto(gray, w, h, lim), cw = b.x1 - b.x0 + 1, ch = b.y1 - b.y0 + 1;
    const o = document.createElement("canvas"); o.width = cw * escala; o.height = ch * escala;
    const x = o.getContext("2d"); x.imageSmoothingQuality = "high"; x.drawImage(canvasDeCinzentos(gray, w, h), b.x0, b.y0, cw, ch, 0, 0, o.width, o.height); return o;
  }

  // Lê uma página. modo: "auto" (deteta duas colunas) | "1" (uma coluna) | "2" (duas colunas, mesmo que não detete a margem)
  async function lerPagina(canvas, modo = "auto", progresso) {
    const w = await iniciar(progresso), cw = canvas.width, ch = canvas.height;
    const normal = async () => { const { data } = await w.recognize(canvas); return { texto: data.text, confianca: data.confidence, colunas: 1 }; };
    if (modo === "1") return normal();
    const gray = new Uint8Array(cw * ch), px = canvas.getContext("2d").getImageData(0, 0, cw, ch).data;
    for (let i = 0; i < cw * ch; i++) gray[i] = px[4 * i];
    let col = detetarColunas(gray, cw, ch);
    if (!col.ok) { if (modo !== "2") return normal(); col = { ok: true, a: cw / 2, b: 0, yIni: 0 }; }   // "2": parte ao meio
    const lim = limiarOtsu(gray) * 0.92, partes = [];
    if (col.yIni > 40) {                                                // cabeçalho (só linhas com boa confiança: títulos grandes e tortos leem mal)
      const cab = recorteAmpliado(mascarar(gray, cw, ch, col, "cabecalho"), cw, ch, lim);
      const { data } = await w.recognize(cab);
      const boas = (data.lines || []).filter(l => l.confidence >= 65).map(l => l.text.trim());
      if (boas.length) partes.push(boas.join("\n")); else if (!data.lines && data.confidence >= 65) partes.push(data.text);
    }
    let soma = 0;
    for (const lado of ["esq", "dir"]) {                                // cada coluna sozinha, recortada e ampliada
      const { data } = await w.recognize(recorteAmpliado(mascarar(gray, cw, ch, col, lado), cw, ch, lim));
      partes.push(data.text); soma += data.confidence;
    }
    return { texto: partes.join("\n"), confianca: soma / 2, colunas: 2 };
  }

  // ---- limpeza do texto lido (não precisa do navegador) ----
  function limpar(txt) {
    let L = txt.replace(/\r/g, "").split("\n").map(l => l.replace(/[ \t]+/g, " ").trim());
    L = L.filter(l => { if (!l) return true; const letras = (l.match(/[A-Za-zÀ-ÿ]/g) || []).length; return letras >= 3 && letras / l.length > 0.45; });   // tira linhas de "ruído"
    return L.join("\n")
      .replace(/([a-zà-ú])-\n(?=(?:lo|la|los|las|no|na|nos|nas|se|me|te|lhe|lhes)\b)/g, "$1-")     // respeitá-\nlo
      .replace(/([a-zà-ú])-\n([a-zà-ú])/g, "$1$2")                                                 // contra-\nto
      .replace(/\n{3,}/g, "\n\n").trim();
  }

  return { verificar, iniciar, preparar, ler, detetarRotacao, autoteste, limpar, localizar, obrigatorios, detetarColunas, mascarar, limiarOtsu, caixaTexto, lerPagina };
})();
if (typeof module !== "undefined") module.exports = Ocr;
