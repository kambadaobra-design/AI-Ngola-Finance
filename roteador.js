// NGOLA_V
(globalThis.NGOLA_V = globalThis.NGOLA_V || {}).roteador = 13;
// Decide COMO a Ngola responde. É usado pelo site (app.js) e pelo teste (teste.html): o mesmo código, os mesmos resultados.
const LIMITE = 0.3;

function rotear(pergunta) {
  const { intencao, confianca } = ngola.prever(pergunta);
  const entendeu = intencao !== "outro" && confianca >= LIMITE;
  if (intencao === "areas" && entendeu) return { tipo: "areas", intencao, confianca, texto: biblioteca.resumoAreas() };

  const achados = biblioteca.pesquisar(pergunta, 3, ["banca", "programacao"].includes(intencao) ? 0.4 : intencao === "outro" ? 0.8 : 0);
  const conteudo = achados.filter(a => !a.idx), indice = achados.filter(a => a.idx);
  const geral = entendeu ? RESPOSTAS[intencao] : "";
  // se o melhor resultado é uma linha de índice, só cede o lugar a um trecho com texto que seja quase tão relevante (>= 75%)
  if (achados.length && achados[0].idx && indice.length && !(conteudo.length && conteudo[0].score >= 0.75 * achados[0].score)) return { tipo: "indice", intencao, confianca, indice, geral, achados };
  if (conteudo.length) return { tipo: "conteudo", intencao, confianca, conteudo, achados };
  if (indice.length) return { tipo: "indice", intencao, confianca, indice, geral, achados };

  // Sem conteúdo na biblioteca: de que área é a pergunta? (só se não houver já uma resposta geral confiante)
  const det = detetarArea(pergunta);
  const forte = det.length && det[0].pontos >= 4;           // várias palavras-chave da mesma área
  // uma resposta geral de finanças pessoais só cede o lugar com evidência forte, ou a áreas de Direito, Economia e Tecnologia
  if (det.length && (!geral || forte || (confianca < 0.6 && det[0].grupo !== "Finanças"))) {
    return { tipo: "semconteudo", intencao, confianca, geral: "", areas: det.map(d => ({ ...d, n: biblioteca.contagem(d.id) })), achados };
  }
  if (geral) return { tipo: "pronta", intencao, confianca, geral, achados };
  return { tipo: "naopercebi", intencao, confianca, achados };
}
