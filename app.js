const SUPABASE_URL = "https://jhxqhlggzmpytbysvskm.supabase.co";
const SUPABASE_KEY = "sb_publishable_PEOef1yV76nxews5F8KVHQ_G0w5Z5yP";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const LIMITE = 0.5; // abaixo disto a Ngola admite que não percebeu
const chat = document.getElementById("chat");
const mensagens = document.getElementById("mensagens");
const vazio = document.getElementById("vazio");
const input = document.getElementById("pergunta");
const botao = document.getElementById("enviar");

// textContent = seguro contra XSS
function adicionar(tipo, texto, meta) {
  vazio.style.display = "none";
  const div = document.createElement("div");
  div.className = "msg " + tipo;
  div.textContent = texto;
  if (meta) {
    const m = document.createElement("div");
    m.className = "meta";
    m.textContent = meta;
    div.appendChild(m);
  }
  mensagens.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

async function perguntar(texto) {
  const pergunta = (texto || input.value).trim();
  if (!pergunta) return;
  input.value = "";
  input.style.height = "auto";
  botao.disabled = true;

  adicionar("user", pergunta);

  const { intencao, confianca } = ngola.prever(pergunta);
  const entendeu = intencao && intencao !== "outro" && confianca >= LIMITE;
  const resposta = entendeu
    ? RESPOSTAS[intencao]
    : "Ainda não percebi bem. Podes reformular? Sei falar de poupança, câmbio, crédito e orçamento.";

  adicionar("ngola", resposta,
    `intenção: ${intencao || "nenhuma"} · confiança: ${Math.round(confianca * 100)}%`);

  const { error } = await supabaseClient
    .from("memorias")
    .insert([{ pergunta, resposta, intencao }]);
  if (error) console.error(error);

  botao.disabled = false;
  input.focus();
}

// Enter envia, Shift+Enter muda de linha
input.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); perguntar(); }
});
input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 140) + "px";
});
botao.addEventListener("click", () => perguntar());
document.querySelectorAll(".sugestoes button").forEach(b =>
  b.addEventListener("click", () => perguntar(b.textContent)));

// Carregar histórico anterior
async function carregarHistorico() {
  const { data, error } = await supabaseClient
    .from("memorias").select("pergunta,resposta")
    .order("created_at", { ascending: false }).limit(6);
  if (error) { console.error(error); return; }
  data.reverse().forEach(m => {
    adicionar("user", m.pergunta);
    adicionar("ngola", m.resposta);
  });
}
carregarHistorico();
