const STOP = new Set(["qual","quais","de","do","da","dos","das","um","uma","em","no","na","para","por","com","que","eu","me","meu","minha","se","ao","como","quanto","quero","preciso","sao","posso","tenho","ele","ela"]);

function reduzir(p) {
  if (p.length > 4 && p.endsWith("es")) return p.slice(0, -2); // dolares -> dolar
  if (p.length > 3 && p.endsWith("s")) return p.slice(0, -1);  // kwanzas -> kwanza
  return p;
}

function normalizar(texto) {
  return texto.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(p => p.length > 1 && !STOP.has(p))
    .map(reduzir);
}

class Classificador {
  constructor() { this.contagem = {}; this.total = {}; this.vocab = new Set(); }

  treinar(intencao, frase) {
    if (!this.contagem[intencao]) { this.contagem[intencao] = {}; this.total[intencao] = 0; }
    for (const p of normalizar(frase)) {
      this.contagem[intencao][p] = (this.contagem[intencao][p] || 0) + 1;
      this.total[intencao]++;
      this.vocab.add(p);
    }
  }

  prever(frase) {
    const palavras = normalizar(frase).filter(p => this.vocab.has(p));
    if (palavras.length === 0) return { intencao: "outro", confianca: 0 };
    const scores = {};
    for (const i in this.contagem) {
      let s = 0; // prioridades iguais: o tamanho dos grupos não pesa
      for (const p of palavras) {
        s += Math.log(((this.contagem[i][p] || 0) + 0.5) / (this.total[i] + 0.5 * this.vocab.size));
      }
      scores[i] = s;
    }
    const max = Math.max(...Object.values(scores));
    let soma = 0; const e = {};
    for (const i in scores) { e[i] = Math.exp(scores[i] - max); soma += e[i]; }
    let melhor = null, mp = 0;
    for (const i in e) { const p = e[i] / soma; if (p > mp) { mp = p; melhor = i; } }
    return { intencao: melhor, confianca: mp };
  }
}

const ngola = new Classificador();
for (const i in DADOS) for (const f of DADOS[i]) ngola.treinar(i, f);
