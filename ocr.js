// Leitura de fotografias (OCR) no navegador, SEM serviços externos.
// Usa o Tesseract.js (código aberto) copiado para a pasta ocr/ do TEU site: ver ocr/LEIAME.txt.
// As fotografias nunca saem do teu navegador.
const Ocr = (() => {
  // O GitHub Pages distingue maiúsculas de minúsculas: aceita a pasta "ocr/" ou "OCR/".
  const CANDIDATAS = ["ocr/", "OCR/"];
  let BASE = "ocr/", localizada = false, worker = null;
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

  // ---- limpeza do texto lido (não precisa do navegador) ----
  function limpar(txt) {
    let L = txt.replace(/\r/g, "").split("\n").map(l => l.replace(/[ \t]+/g, " ").trim());
    L = L.filter(l => { if (!l) return true; const letras = (l.match(/[A-Za-zÀ-ÿ]/g) || []).length; return letras >= 3 && letras / l.length > 0.45; });   // tira linhas de "ruído"
    return L.join("\n")
      .replace(/([a-zà-ú])-\n(?=(?:lo|la|los|las|no|na|nos|nas|se|me|te|lhe|lhes)\b)/g, "$1-")     // respeitá-\nlo
      .replace(/([a-zà-ú])-\n([a-zà-ú])/g, "$1$2")                                                 // contra-\nto
      .replace(/\n{3,}/g, "\n\n").trim();
  }

  return { verificar, iniciar, preparar, ler, detetarRotacao, autoteste, limpar, localizar, obrigatorios };
})();
if (typeof module !== "undefined") module.exports = Ocr;
