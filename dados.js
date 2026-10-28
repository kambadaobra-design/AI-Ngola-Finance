// NGOLA_V
(globalThis.NGOLA_V = globalThis.NGOLA_V || {}).dados = 12;
const DADOS = {
  poupar: ["como poupar dinheiro","quero guardar dinheiro todos os meses","como juntar kwanzas","dicas para economizar","quero fazer uma reserva de emergencia","como gastar menos e guardar mais","quanto devo guardar do meu salario","ajuda-me a poupar para comprar um carro","quero poupar","preciso de poupar mais","como criar o habito de poupar","poupanca mensal","guardar dinheiro para o futuro"],
  cambio: ["qual o cambio do dolar hoje","quanto vale o euro em kwanzas","como trocar kwanzas por dolares","o kwanza esta a desvalorizar","onde comprar dolares","taxa de cambio do banco","converter dolares para kz","diferenca entre cambio oficial e paralelo","quanto custa o dolar","preco do dolar hoje","quanto esta o euro","o dolar sobe ou desce","valor do dolar no mercado"],
  credito: ["quero fazer um emprestimo como faco","como faco um emprestimo","como pedir um emprestimo no banco","quero um credito para comprar casa","quais os juros do credito","como funciona o credito pessoal","posso pedir dinheiro emprestado","preciso de financiamento para o meu negocio","o que e a taxa de juro","como pagar uma divida","preciso de um emprestimo","credito habitacao","como sair das dividas","cartao de credito"],
  orcamento: ["como fazer um orcamento mensal","como organizar o meu salario","para onde vai o meu dinheiro","controlar as minhas despesas","como dividir o salario pelas despesas","quero planear os meus gastos","regra 50 30 20","como registar as despesas do mes","como controlar gastos","controlar os gastos do mes","planear o orcamento da familia","reduzir despesas"],
  investir: ["o que sao certificados de aforro","como investir o meu dinheiro","o que sao obrigacoes do tesouro","bilhetes do tesouro vale a pena","onde investir em angola","o que e a bodiva","como comprar acoes","investimento seguro com bons juros","depositos a prazo","o que e um fundo de investimento"],
  saudacao: ["oi","oi ngola","ola ola","ola","bom dia","boa tarde","boa noite","o que sabes fazer","ajuda","oi tudo bem","ola ngola","tudo bem","e ai"],
  sobre_ngola: ["o que sabes","o que e que sabes","sabes fazer o que","o que consegues fazer","o que sabes fazer","o que podes fazer","em que me podes ajudar","quem es tu","es humana","es um robo","onde vives","quem te criou","como te chamas","tens nome","es uma pessoa","o que es tu","es inteligente","es um programa","quem te fez"],
  conversa: ["obrigado","obrigada","muito obrigado","obrigado pela ajuda","valeu","boa ideia","muito bem","esta a crescer","boa resposta","gostei","parabens","kkkk","hahaha","que fixe","excelente","obrigada pela ajuda","estas a melhorar","obrigado","boa ngola","meu filho","que giro"],
  programacao: ["programacao","sabes programar","sabes python","programacao em python","como aprender python","o que e uma variavel","como fazer um ciclo for","o que e uma funcao","erro no meu codigo","como programar","o que e javascript","como criar um site","o que e um algoritmo","ensina-me a programar","o que e uma lista em python","como ligar ao supabase"],
  banca: ["o que e a banca","como funciona a banca angolana","riscos da banca angolana","como esta o sistema bancario","o que e um banco comercial","o que e o banco central","o que e liquidez bancaria","como funciona um banco","o que e a supervisao bancaria","banca angolana o que e","como avaliar o risco de um banco","negociacao com o banco"],
  areas: ["que areas conheces","sobre que temas sabes falar","que assuntos tens","o que tens na biblioteca","lista de areas","que areas tens","quais sao as tuas areas","que temas conheces","em que areas podes ajudar","que livros tens"],
  outro: ["qual a capital de franca","quem ganhou o jogo de futebol","receita de funge","que horas sao","como esta o tempo hoje","conta-me uma piada","quem e o presidente","como aprender ingles","quero ver um filme","como instalar o whatsapp","nao entendi","qual a tua cor favorita"],
};

const RESPOSTAS = {
  poupar: "Para poupar: separa uma percentagem do salário assim que o recebes (começa com 10%), antes de gastar. Define uma meta concreta em Kz e um prazo.",
  cambio: "Sobre câmbio: o valor oficial (BNA) e o do mercado paralelo diferem. Consulta sempre o BNA ou o teu banco antes de trocar.",
  credito: "Sobre crédito: compara a taxa de juro e o custo total entre bancos, e confirma que a prestação cabe no teu orçamento (idealmente abaixo de 30% do rendimento).",
  orcamento: "Para o orçamento, experimenta a regra 50/30/20: 50% necessidades, 30% desejos, 20% poupança e dívidas. Regista as despesas durante um mês para veres a realidade.",
  investir: "Certificados de aforro e títulos do Tesouro são produtos em que emprestas dinheiro ao Estado em troca de juros. Compara taxa, prazo e facilidade de resgate, e confirma as condições actuais no teu banco.",
  saudacao: "Olá! Sou a Ngola. Pergunta-me sobre poupança, câmbio, crédito, orçamento ou investimento.",
  sobre_ngola: "Sou a Ngola, uma IA pequena e simples, criada para aprender sobre finanças pessoais em Kwanzas. Não sou humana: sou código que aprende com exemplos.",
  conversa: "Obrigada! Estou a aprender contigo. Quanto mais perguntas fizeres, melhor eu fico.",
  programacao: "Sim, programação é um dos meus temas! Tenho aulas de Python na biblioteca: pergunta algo concreto, por exemplo \"como funciona o try except?\". Se não encontrar, é porque ainda não tenho essa aula.",
  banca: "Procurei na minha biblioteca de banca e não encontrei isto. Só tenho o conteúdo de algumas aulas do curso; as restantes ainda não foram carregadas.",
  areas: "",
  outro: "",
};
