const SUPABASE_URL = "https://jhxqhlggzmpytbysvskm.supabase.co";
const SUPABASE_KEY = "sb_publishable_PEOef1yV76nxews5F8KVHQ_G0w5Z5yP";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const LIMITE = 0.3;
const INTENCOES = Object.keys(DADOS);
const NOMES = { poupar:"Poupança", cambio:"Câmbio", credito:"Crédito", orcamento:"Orçamento",
  investir:"Investimento", programacao:"Programação", banca:"Banca", saudacao:"Saudação", sobre_ngola:"Sobre a Ngola", conversa:"Conversa", outro:"Fora do assunto" };
const USA_LIVROS = new Set(["programacao", "banca", "outro"]);
const $ = id => document.getElementById(id);
const chat = $("chat"), mensagens = $("mensagens"), vazio = $("vazio"),
      input = $("pergunta"), botao = $("enviar"), lista = $("lista"), lateral = $("lateral");

let utilizador = localStorage.getItem("ngola_user");
if (!utilizador) { utilizador = crypto.randomUUID(); localStorage.setItem("ngola_user", utilizador); }
let conversaId = crypto.randomUUID();

function adicionar(tipo, texto, meta) {
  vazio.style.display = "none";
  const div = document.createElement("div");
  div.className = "msg " + tipo;
  texto.split("```").forEach((p, i) => {       // blocos ``` viram <pre>; tudo via textContent (seguro contra XSS)
    if (i % 2) { const pre = document.createElement("pre"), cd = document.createElement("code"); cd.textContent = p.replace(/^\n/, "").replace(/\n$/, ""); pre.appendChild(cd); div.appendChild(pre); }
    else if (p) div.appendChild(document.createTextNode(p));
  });
  if (meta) { const m = document.createElement("div"); m.className = "meta"; m.textContent = meta; div.appendChild(m); }
  mensagens.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
  return div;
}

// ---------- APRENDIZAGEM ----------
async function carregarExemplos() {
  const { data, error } = await supabaseClient.from("exemplos")
    .select("frase,intencao").eq("aprovado", true).limit(2000);
  if (error) { console.error(error); return; }
  let n = 0;
  for (const e of data) if (INTENCOES.includes(e.intencao)) { ngola.treinar(e.intencao, e.frase); n++; }
  console.log("Exemplos aprendidos:", n);
}

async function guardarExemplo(frase, intencao, voto) {
  ngola.treinar(intencao, frase); // aprende já, nesta sessão
  const { error } = await supabaseClient.from("exemplos").insert([{ frase, intencao, voto, utilizador }]);
  if (error) console.error(error);
}

function botaoFb(texto, fn) {
  const b = document.createElement("button"); b.textContent = texto; b.onclick = fn; return b;
}

function adicionarFeedback(div, pergunta, intencao) {
  const barra = document.createElement("div"); barra.className = "fb";
  const mostrar = t => { barra.replaceChildren(document.createTextNode(t)); };

  const certo = botaoFb("👍", async () => { mostrar("Obrigada! Aprendi com isto ✅"); await guardarExemplo(pergunta, intencao, "certo"); });
  const errado = botaoFb("👎", () => {
    barra.replaceChildren(document.createTextNode("Sobre o que era? "));
    for (const i of INTENCOES) {
      barra.appendChild(botaoFb(NOMES[i] || i, async () => {
        mostrar("Obrigada! Vou lembrar-me disto ✅");
        await guardarExemplo(pergunta, i, "corrigido");
        const ach = biblioteca.pesquisar(pergunta, 3, true).filter(a => !a.idx);
        adicionar("ngola", ach.length ? biblioteca.formatar(ach)
          : `Anotado: é sobre ${NOMES[i] || i}. Ainda não tenho conteúdo que responda a isto com precisão: ele tem de entrar na biblioteca.`);
      }));
    }
  });
  barra.append(certo, errado);
  div.appendChild(barra);
}

async function guardarFicha(pergunta, a) {
  const { error } = await supabaseClient.from("fichas").insert([{
    pergunta, tema: a.area, texto: a.t, fonte_livro: a.livro, fonte_pagina: a.p,
    versao: a.v || null, trecho_id: a.id || null, estado: "por_verificar", utilizador }]);
  if (error) console.error(error);
  return !error;
}

function adicionarFichas(div, pergunta, achados) {
  const barra = document.createElement("div"); barra.className = "fb";
  barra.appendChild(document.createTextNode("Guardar como ficha para verificação: "));
  let n = 0;
  achados.forEach((a, i) => {
    if (a.tipo === "ficha") return;
    n++;
    barra.appendChild(botaoFb("📌 " + (i + 1), async () => {
      const ok = await guardarFicha(pergunta, a);
      barra.replaceChildren(document.createTextNode(ok ? "Ficha guardada: fica por verificar até ser aprovada ✅" : "Não consegui guardar a ficha."));
    }));
  });
  if (n) div.appendChild(barra);
}

// ---------- CONVERSA ----------
async function perguntar(texto) {
  const pergunta = (texto || input.value).trim();
  if (!pergunta) return;
  if (pergunta.length > 600) { // textos longos não são perguntas: não guardar
    input.value = ""; input.style.height = "auto";
    adicionar("user", pergunta.slice(0, 200) + "…");
    adicionar("ngola", "Isto parece um texto longo, não uma pergunta, por isso não o guardei. Para me ensinares com aulas ou livros, eles têm de entrar na biblioteca.");
    return;
  }
  input.value = ""; input.style.height = "auto"; botao.disabled = true;
  adicionar("user", pergunta);

  const { intencao, confianca } = ngola.prever(pergunta);
  const entendeu = intencao !== "outro" && confianca >= LIMITE;
  const achados = biblioteca.pesquisar(pergunta, 3, ["banca", "programacao", "outro"].includes(intencao));
  const conteudo = achados.filter(a => !a.idx), indice = achados.filter(a => a.idx);
  const geral = entendeu ? RESPOSTAS[intencao] : "";
  let resposta, div;
  if (conteudo.length) {
    resposta = biblioteca.formatar(conteudo);
    div = adicionar("ngola", resposta, `📖 pesquisa na biblioteca · ${conteudo.length} trecho(s)`);
    adicionarFichas(div, pergunta, conteudo);
  } else if (indice.length) {
    resposta = biblioteca.formatarIndice(indice) + (geral ? "\n\nResposta geral: " + geral : "");
    div = adicionar("ngola", resposta, "📑 só tenho o índice · diz-me se queres que a Ngola aprenda estas aulas");
  } else {
    resposta = geral || "Ainda não percebi bem. Podes reformular? Sei falar de poupança, câmbio, crédito, orçamento, investimento, banca e programação.";
    div = adicionar("ngola", resposta, `intenção: ${intencao} · confiança: ${Math.round(confianca * 100)}%`);
    adicionarFeedback(div, pergunta, intencao);
  }

  const { error } = await supabaseClient.from("memorias")
    .insert([{ pergunta, resposta, intencao, conversa_id: conversaId, utilizador }]);
  if (error) console.error(error);
  botao.disabled = false; input.focus();
  carregarLista();
}

function novaConversa() {
  conversaId = crypto.randomUUID();
  mensagens.innerHTML = ""; vazio.style.display = "";
  lateral.classList.remove("aberta");
  carregarLista(); input.focus();
}

async function abrirConversa(id) {
  const { data, error } = await supabaseClient.from("memorias")
    .select("pergunta,resposta").eq("conversa_id", id).eq("utilizador", utilizador)
    .order("created_at", { ascending: true });
  if (error) { console.error(error); return; }
  conversaId = id; mensagens.innerHTML = "";
  data.forEach(m => { adicionar("user", m.pergunta); adicionar("ngola", m.resposta); });
  lateral.classList.remove("aberta"); carregarLista();
}

async function carregarLista() {
  const { data, error } = await supabaseClient.from("memorias")
    .select("pergunta,conversa_id,created_at").eq("utilizador", utilizador)
    .not("conversa_id", "is", null)
    .order("created_at", { ascending: false }).limit(300);
  if (error) { console.error(error); return; }
  const conversas = new Map();
  for (const m of data) conversas.set(m.conversa_id, m.pergunta);
  lista.innerHTML = "";
  for (const [id, titulo] of conversas) {
    const d = document.createElement("div");
    d.textContent = titulo; d.title = titulo;
    if (id === conversaId) d.className = "ativa";
    d.onclick = () => abrirConversa(id);
    lista.appendChild(d);
  }
}

input.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); perguntar(); } });
input.addEventListener("input", () => { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 140) + "px"; });
botao.onclick = () => perguntar();
$("nova").onclick = novaConversa;
$("menu").onclick = () => lateral.classList.toggle("aberta");
$("fechar").onclick = () => lateral.classList.remove("aberta");
$("fundo").onclick = () => lateral.classList.remove("aberta");
document.querySelectorAll(".sugestoes button").forEach(b => b.onclick = () => perguntar(b.textContent));
biblioteca.carregar().then(() => biblioteca.carregarFichas(supabaseClient));
carregarExemplos();
carregarLista();
