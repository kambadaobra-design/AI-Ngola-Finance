const supabaseUrl = "https://TEU-PROJETO.supabase.co";
const supabaseKey = "TUA_CHAVE";

const supabase =
supabase.createClient(
  supabaseUrl,
  supabaseKey
);

async function perguntar() {

let pergunta =
document.getElementById("pergunta").value;

let resposta =
"Aprendi a pergunta: " + pergunta;

document.getElementById("resposta").innerText =
resposta;

await supabase
.from("memorias")
.insert([
{
pergunta,
resposta
}
]);

}