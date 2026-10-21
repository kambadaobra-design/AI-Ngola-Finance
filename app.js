const SUPABASE_URL = "https://jhxqhlggzmpytbysvskm.supabase.co";
const SUPABASE_KEY = "sb_publishable_PEOef1yV76nxews5F8KVHQ_G0w5Z5yP";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const LIMITE = 0.3;
const $ = id => document.getElementById(id);
const chat = $("chat"), mensagens = $("mensagens"), vazio = $("vazio"),
      input = $("pergunta"), botao = $("enviar"), lista = $("lista"), lateral = $("lateral");

// Identificador deste navegador (cada pessoa vê só as suas conversas)
let utilizador = localStorage.getItem("ngola_user");
if (!utilizador) { utilizador = crypto.randomUUID(); localStorage.setItem("ngola_user", utilizador); }
let conversaId = crypto.randomUUID();

function adicionar(tipo, texto, meta) {
  vazio.style.display = "none";
  const div = document.createElement("div");
  div.className = "msg " + tipo;
  div.textContent = texto; // textContent = seguro contra XSS
  if (meta) { const m = document.createElement("div"); m.className = "meta"; m.textContent = meta; div.appendChild(m); }
  mensagens.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

async function perguntar(texto) {
  const pergunta = (texto || input.value).trim();
  if (!pergunta) return;
  input.value = ""; input.style.height = "auto"; botao.disabled = true;
  adicionar("user", pergunta);

  const { intencao, confianca } = ngola.prever(pergunta);
  const entendeu = intencao !== "outro" && confianca >= LIMITE;
  const resposta = entendeu ? RESPOSTAS[intencao]
    : "Ainda não percebi bem. Podes reformular? Sei falar de poupança, câmbio, crédito, orçamento e investimento.";
  adicionar("ngola", resposta, `intenção: ${intencao} · confiança: ${Math.round(confianca * 100)}%`);

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
  const conversas = new Map(); // título = primeira pergunta da conversa
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
document.querySelectorAll(".sugestoes button").forEach(b => b.onclick = () => perguntar(b.textContent));
carregarLista();
