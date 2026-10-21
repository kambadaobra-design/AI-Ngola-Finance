// Passo 1: transformar texto em lista de palavras limpas
const STOP = new Set(["qual","quais","de","do","da","dos","das","um","uma","em",
  "no","na","para","por","com","que","eu","me","meu","minha","se","ao","como","quanto"]);

function reduzir(p) {
  if (p.length > 4 && p.endsWith("es")) return p.slice(0, -2); // dolares -> dolar
  if (p.length > 3 && p.endsWith("s")) return p.slice(0, -1);  // kwanzas -> kwanza
  return p;
}

function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(p => p.length > 1 && !STOP.has(p))
    .map(reduzir);
}
class Classificador {
  constructor() {
    this.docs = {};          // nº de frases por intenção
    this.contagem = {};      // contagem[intencao][palavra]
    this.totalPalavras = {}; // total de palavras por intenção
    this.vocab = new Set();  // todas as palavras conhecidas
    this.totalDocs = 0;
  }

  // TREINAR = contar
  treinar(intencao, frase) {
    if (!this.docs[intencao]) {
      this.docs[intencao] = 0;
      this.contagem[intencao] = {};
      this.totalPalavras[intencao] = 0;
    }
    this.docs[intencao]++;
    this.totalDocs++;
    for (const p of normalizar(frase)) {
      this.contagem[intencao][p] = (this.contagem[intencao][p] || 0) + 1;
      this.totalPalavras[intencao]++;
      this.vocab.add(p);
    }
  }

  // PREVER = qual intenção explica melhor esta frase?
  prever(frase) {
    const palavras = normalizar(frase).filter(p => this.vocab.has(p));
    if (palavras.length === 0) return { intencao: null, confianca: 0 };

    const scores = {};
    for (const intencao in this.docs) {
      // probabilidade inicial da intenção
      let s = Math.log(this.docs[intencao] / this.totalDocs);
      for (const p of palavras) {
        const c = this.contagem[intencao][p] || 0;
        s += Math.log((c + 1) / (this.totalPalavras[intencao] + this.vocab.size));
      }
      scores[intencao] = s;
    }

    // converter scores em percentagens (softmax)
    const max = Math.max(...Object.values(scores));
    let soma = 0;
    const exp = {};
    for (const i in scores) { exp[i] = Math.exp(scores[i] - max); soma += exp[i]; }

    let melhor = null, melhorP = 0;
    for (const i in exp) {
      const p = exp[i] / soma;
      if (p > melhorP) { melhorP = p; melhor = i; }
    }
    return { intencao: melhor, confianca: melhorP };
  }
}

// Criar a Ngola e treiná-la com os dados
const ngola = new Classificador();
for (const intencao in DADOS) {
  for (const frase of DADOS[intencao]) ngola.treinar(intencao, frase);
}