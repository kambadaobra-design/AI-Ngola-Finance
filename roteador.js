// NGOLA_V
(globalThis.NGOLA_V = globalThis.NGOLA_V || {}).roteador = 11;
// Decide COMO a Ngola responde. É usado pelo site (app.js) e pelo teste (teste.html): o mesmo código, os mesmos resultados.
const LIMITE = 0.3;

function rotear(pergunta) {
  const { intencao, confianca } = ngola.prever(pergunta);
  const entendeu = intencao !== "outro" && confianca >= LIMITE;
  const achados = biblioteca.pesquisar(pergunta, 3, ["banca", "programacao"].includes(intencao) ? 0.4 : intencao === "outro" ? 0.8 : 0);
  const conteudo = achados.filter(a => !a.idx), indice = achados.filter(a => a.idx);
  const geral = entendeu ? RESPOSTAS[intencao] : "";
  if (conteudo.length) return { tipo: "conteudo", intencao, confianca, conteudo, achados };
  if (indice.length) return { tipo: "indice", intencao, confianca, indice, geral, achados };
  if (geral) return { tipo: "pronta", intencao, confianca, geral, achados };
  return { tipo: "naopercebi", intencao, confianca, achados };
}
