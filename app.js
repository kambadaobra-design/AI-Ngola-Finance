const SUPABASE_URL = "https://jhxqhlggzmpytbysvskm.supabase.co";
const SUPABASE_KEY = "sb_publishable_PEOef1yV76nxews5F8KVHQ_G0w5Z5yP";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

function escapar(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

async function perguntar() {
  const input = document.getElementById("pergunta");
  const pergunta = input.value.trim();
  if (!pergunta) return;

  const { intencao, confianca } = ngola.prever(pergunta);
  const LIMITE = 0.5; // abaixo disto a Ngola admite que não percebeu

  let resposta;
  if (intencao && confianca >= LIMITE) {
    resposta = RESPOSTAS[intencao];
  } else {
    resposta = "Ainda não percebi bem. Podes reformular? Sei falar de poupança, câmbio, crédito e orçamento.";
  }

  const pct = Math.round(confianca * 100);
  document.getElementById("resposta").textContent =
    `${resposta}  [intenção: ${intencao || "nenhuma"}, confiança: ${pct}%]`;

  const { error } = await supabaseClient
    .from("memorias")
    .insert([{ pergunta, resposta, intencao }]);

  if (error) console.error(error);
  input.value = "";
  carregarHistorico();
}

async function carregarHistorico() {
  const { data, error } = await supabaseClient
    .from("memorias").select("*")
    .order("created_at", { ascending: false }).limit(10);
  if (error) { console.error(error); return; }
  document.getElementById("historico").innerHTML = data
    .map(m => `<div class="item"><b>Você:</b> ${escapar(m.pergunta)}<br><b>Ngola:</b> ${escapar(m.resposta)}</div>`)
    .join("");
}

carregarHistorico();