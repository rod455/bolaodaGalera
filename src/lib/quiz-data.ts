// ═══ Quiz "Qual seleção da Copa 2026 você seria?" ═══
// 48 seleções, 10 perguntas, 5 dimensões de perfil

export interface SelecaoQuiz {
  id: string;
  nome: string;
  bandeira: string;
  pesos: Perfil;
  titulo: string;
  desc: string;
  share: string;
}

export interface Perfil {
  artista: number;
  maquina: number;
  guerreiro: number;
  surpresa: number;
  festa: number;
}

export interface PerguntaQuiz {
  texto: string;
  opcoes: { texto: string; icone: string; pontos: number[] }[];
}

// ── 48 seleções com pesos de perfil ──
export const SELECOES: SelecaoQuiz[] = [
  { id: "brasil", nome: "Brasil", bandeira: "🇧🇷", pesos: { artista:3, maquina:1, guerreiro:2, surpresa:1, festa:3 },
    titulo: "Você é Brasil!", desc: "Criativo, alegre e com aquela ginga que ninguém explica. Você joga bonito — e a torcida levanta quando você toca na bola.",
    share: "Fiz o quiz e sou o BRASIL 🇧🇷⚽ Qual seleção combina com você? → bolaonacopa.com.br/quiz-selecao" },
  { id: "argentina", nome: "Argentina", bandeira: "🇦🇷", pesos: { artista:1, maquina:1, guerreiro:3, surpresa:1, festa:2 },
    titulo: "Você é Argentina!", desc: "Paixão acima de tudo. Você vai até o fim — mesmo nos pênaltis. Quando acredita, nada te para.",
    share: "Fiz o quiz e sou a ARGENTINA 🇦🇷⚽ Paixão total! Descobre a sua → bolaonacopa.com.br/quiz-selecao" },
  { id: "colombia", nome: "Colômbia", bandeira: "🇨🇴", pesos: { artista:2, maquina:1, guerreiro:2, surpresa:2, festa:3 },
    titulo: "Você é Colômbia!", desc: "Raça, talento e aquele ritmo que é difícil de parar. Você é imprevisível e divertido ao mesmo tempo.",
    share: "Fiz o quiz e sou a COLÔMBIA 🇨🇴⚽ Ritmo e raça! Descobre a tua → bolaonacopa.com.br/quiz-selecao" },
  { id: "uruguai", nome: "Uruguai", bandeira: "🇺🇾", pesos: { artista:0, maquina:2, guerreiro:3, surpresa:1, festa:1 },
    titulo: "Você é Uruguai!", desc: "Pequeno em tamanho, gigante em garra. Você não recua, não entrega — cada centímetro é disputado como se fosse o último.",
    share: "Fiz o quiz e sou o URUGUAI 🇺🇾⚽ Garra acima de tudo! Qual é a sua seleção? → bolaonacopa.com.br/quiz-selecao" },
  { id: "equador", nome: "Equador", bandeira: "🇪🇨", pesos: { artista:1, maquina:2, guerreiro:2, surpresa:2, festa:1 },
    titulo: "Você é Equador!", desc: "Organizado, consistente e com qualidade que muita gente subestima. Você entrega sem fazer barulho.",
    share: "Fiz o quiz e sou o EQUADOR 🇪🇨⚽ Subestimado mas consistente! Qual é a sua? → bolaonacopa.com.br/quiz-selecao" },
  { id: "paraguai", nome: "Paraguai", bandeira: "🇵🇾", pesos: { artista:0, maquina:2, guerreiro:3, surpresa:2, festa:1 },
    titulo: "Você é Paraguai!", desc: "Defensivamente sólido e perigoso no contra-ataque. Você é difícil de bater quando está bem postado.",
    share: "Fiz o quiz e sou o PARAGUAI 🇵🇾⚽ Difícil de bater! Descobre a sua → bolaonacopa.com.br/quiz-selecao" },
  { id: "franca", nome: "França", bandeira: "🇫🇷", pesos: { artista:2, maquina:2, guerreiro:1, surpresa:1, festa:2 },
    titulo: "Você é França!", desc: "Técnica refinada e eficiência de alto nível. Elegante, mas letal quando precisa.",
    share: "Fiz o quiz e sou a FRANÇA 🇫🇷⚽ Elegante e letal! Qual é a sua seleção? → bolaonacopa.com.br/quiz-selecao" },
  { id: "espanha", nome: "Espanha", bandeira: "🇪🇸", pesos: { artista:3, maquina:2, guerreiro:0, surpresa:1, festa:2 },
    titulo: "Você é Espanha!", desc: "Posse, toque curto e paciência cirúrgica. Quando você quer, a bola não sai dos seus pés.",
    share: "Fiz o quiz e sou a ESPANHA 🇪🇸⚽ Toque e posse! Descobre a tua seleção → bolaonacopa.com.br/quiz-selecao" },
  { id: "alemanha", nome: "Alemanha", bandeira: "🇩🇪", pesos: { artista:1, maquina:3, guerreiro:1, surpresa:0, festa:1 },
    titulo: "Você é Alemanha!", desc: "Eficiente, disciplinado e sempre preparado. Você não precisa de magia — só de execução impecável.",
    share: "Fiz o quiz e sou a ALEMANHA 🇩🇪⚽ Eficiência total! Qual é a sua? → bolaonacopa.com.br/quiz-selecao" },
  { id: "portugal", nome: "Portugal", bandeira: "🇵🇹", pesos: { artista:2, maquina:1, guerreiro:2, surpresa:1, festa:2 },
    titulo: "Você é Portugal!", desc: "Talento individual combinado com raça coletiva. Você tem aquele jogador especial dentro de você.",
    share: "Fiz o quiz e sou PORTUGAL 🇵🇹⚽ Talento e raça! Descobre a tua seleção → bolaonacopa.com.br/quiz-selecao" },
  { id: "holanda", nome: "Holanda", bandeira: "🇳🇱", pesos: { artista:2, maquina:2, guerreiro:1, surpresa:2, festa:1 },
    titulo: "Você é Holanda!", desc: "Futebol total. Você joga em todas as posições e entende o jogo em 360°. Versátil e inteligente.",
    share: "Fiz o quiz e sou a HOLANDA 🇳🇱⚽ Futebol total! Descobre a tua → bolaonacopa.com.br/quiz-selecao" },
  { id: "belgica", nome: "Bélgica", bandeira: "🇧🇪", pesos: { artista:2, maquina:2, guerreiro:2, surpresa:1, festa:1 },
    titulo: "Você é Bélgica!", desc: "Talento coletivo equilibrado. Você tem qualidade em todas as posições e nunca depende de um só jogador.",
    share: "Fiz o quiz e sou a BÉLGICA 🇧🇪⚽ Equilíbrio total! Qual é a sua seleção? → bolaonacopa.com.br/quiz-selecao" },
  { id: "inglaterra", nome: "Inglaterra", bandeira: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", pesos: { artista:1, maquina:2, guerreiro:2, surpresa:1, festa:2 },
    titulo: "Você é Inglaterra!", desc: "Você tem tudo para ser campeão — talento, estrutura e história. Só falta mostrar no momento certo.",
    share: "Fiz o quiz e sou a INGLATERRA 🏴󠁧󠁢󠁥󠁮󠁧󠁿⚽ Tudo para vencer! Descobre a tua → bolaonacopa.com.br/quiz-selecao" },
  { id: "suica", nome: "Suíça", bandeira: "🇨🇭", pesos: { artista:1, maquina:3, guerreiro:1, surpresa:1, festa:0 },
    titulo: "Você é Suíça!", desc: "Consistência e organização acima de qualquer fantasia. Você raramente falha e raramente é lembrado — mas está sempre lá.",
    share: "Fiz o quiz e sou a SUÍÇA 🇨🇭⚽ Consistência acima de tudo! Qual é a sua? → bolaonacopa.com.br/quiz-selecao" },
  { id: "croacia", nome: "Croácia", bandeira: "🇭🇷", pesos: { artista:2, maquina:2, guerreiro:2, surpresa:1, festa:1 },
    titulo: "Você é Croácia!", desc: "Solidez tática com toques de genialidade. Você entende de jogo de alto nível e nunca subestima adversários.",
    share: "Fiz o quiz e sou a CROÁCIA 🇭🇷⚽ Tático e genial! Descobre a tua seleção → bolaonacopa.com.br/quiz-selecao" },
  { id: "austria", nome: "Áustria", bandeira: "🇦🇹", pesos: { artista:1, maquina:2, guerreiro:2, surpresa:2, festa:1 },
    titulo: "Você é Áustria!", desc: "Intensidade e press alto. Você não deixa o adversário respirar e vai em cima desde o começo.",
    share: "Fiz o quiz e sou a ÁUSTRIA 🇦🇹⚽ Intensidade total! Qual é a sua seleção? → bolaonacopa.com.br/quiz-selecao" },
  { id: "dinamarca", nome: "Dinamarca", bandeira: "🇩🇰", pesos: { artista:1, maquina:3, guerreiro:2, surpresa:1, festa:1 },
    titulo: "Você é Dinamarca!", desc: "Organização nórdica com coração guerreiro. Você é confiável sob pressão e cresce nos momentos difíceis.",
    share: "Fiz o quiz e sou a DINAMARCA 🇩🇰⚽ Guerreiro e confiável! Descobre a tua → bolaonacopa.com.br/quiz-selecao" },
  { id: "suecia", nome: "Suécia", bandeira: "🇸🇪", pesos: { artista:1, maquina:2, guerreiro:2, surpresa:1, festa:1 },
    titulo: "Você é Suécia!", desc: "Disciplina coletiva e eficiência. Você não precisa de craques individuais — o time funciona como um relógio.",
    share: "Fiz o quiz e sou a SUÉCIA 🇸🇪⚽ Time coletivo e disciplinado! Qual é a tua? → bolaonacopa.com.br/quiz-selecao" },
  { id: "noruega", nome: "Noruega", bandeira: "🇳🇴", pesos: { artista:1, maquina:2, guerreiro:3, surpresa:1, festa:1 },
    titulo: "Você é Noruega!", desc: "Força física, atletismo e um centroavante que assusta qualquer defesa. Você é direto e eficaz.",
    share: "Fiz o quiz e sou a NORUEGA 🇳🇴⚽ Força e atletismo! Descobre a tua seleção → bolaonacopa.com.br/quiz-selecao" },
  { id: "escocia", nome: "Escócia", bandeira: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", pesos: { artista:0, maquina:1, guerreiro:3, surpresa:2, festa:2 },
    titulo: "Você é Escócia!", desc: "Raça, emoção e aquela torcida que nunca abandona. Você joga com o coração na manga.",
    share: "Fiz o quiz e sou a ESCÓCIA 🏴󠁧󠁢󠁳󠁣󠁴󠁿⚽ Raça e emoção! Qual é a tua seleção? → bolaonacopa.com.br/quiz-selecao" },
  { id: "republica_tcheca", nome: "Rep. Tcheca", bandeira: "🇨🇿", pesos: { artista:1, maquina:2, guerreiro:2, surpresa:2, festa:1 },
    titulo: "Você é Rep. Tcheca!", desc: "Técnica europeia combinada com raça. Você supera adversários teoricamente melhores pela organização.",
    share: "Fiz o quiz e sou a REP. TCHECA 🇨🇿⚽ Raça e organização! Descobre a tua → bolaonacopa.com.br/quiz-selecao" },
  { id: "turquia", nome: "Turquia", bandeira: "🇹🇷", pesos: { artista:2, maquina:1, guerreiro:2, surpresa:2, festa:2 },
    titulo: "Você é Turquia!", desc: "Instinto, velocidade e aquela imprevisibilidade que deixa adversários nervosos. Você é perigoso no caos.",
    share: "Fiz o quiz e sou a TURQUIA 🇹🇷⚽ Imprevisível e perigoso! Qual é a tua? → bolaonacopa.com.br/quiz-selecao" },
  { id: "bosnia", nome: "Bósnia", bandeira: "🇧🇦", pesos: { artista:1, maquina:1, guerreiro:3, surpresa:2, festa:2 },
    titulo: "Você é Bósnia!", desc: "Você saiu das eliminatórias por uma zebra histórica. Raça, emoção e uma história que inspira.",
    share: "Fiz o quiz e sou a BÓSNIA 🇧🇦⚽ A zebra histórica! Descobre a tua seleção → bolaonacopa.com.br/quiz-selecao" },
  { id: "marrocos", nome: "Marrocos", bandeira: "🇲🇦", pesos: { artista:0, maquina:2, guerreiro:2, surpresa:3, festa:2 },
    titulo: "Você é Marrocos!", desc: "A zebra mais bonita. Ninguém apostava em você, mas você foi além de tudo que esperavam. Resiliência que vem de dentro.",
    share: "Fiz o quiz e sou MARROCOS 🇲🇦⚽ A zebra da Copa! Descobre a tua seleção → bolaonacopa.com.br/quiz-selecao" },
  { id: "senegal", nome: "Senegal", bandeira: "🇸🇳", pesos: { artista:2, maquina:1, guerreiro:2, surpresa:2, festa:2 },
    titulo: "Você é Senegal!", desc: "Atletismo, técnica e aquela ginga africana. Você é rápido, forte e belo ao mesmo tempo.",
    share: "Fiz o quiz e sou o SENEGAL 🇸🇳⚽ Atletismo e ginga! Qual é a tua seleção? → bolaonacopa.com.br/quiz-selecao" },
  { id: "africa_do_sul", nome: "África do Sul", bandeira: "🇿🇦", pesos: { artista:1, maquina:1, guerreiro:2, surpresa:3, festa:3 },
    titulo: "Você é África do Sul!", desc: "Bafana Bafana de volta! Você tem aquela energia de quem tem algo a provar para o mundo.",
    share: "Fiz o quiz e sou a ÁFRICA DO SUL 🇿🇦⚽ Com tudo a provar! Descobre a tua → bolaonacopa.com.br/quiz-selecao" },
  { id: "costa_do_marfim", nome: "Costa do Marfim", bandeira: "🇨🇮", pesos: { artista:2, maquina:1, guerreiro:2, surpresa:2, festa:2 },
    titulo: "Você é Costa do Marfim!", desc: "Velocidade, técnica e aquela ginga da Costa Ocidental. Você é explosivo e difícil de parar em transição.",
    share: "Fiz o quiz e sou a COSTA DO MARFIM 🇨🇮⚽ Explosivo e técnico! Qual é a tua? → bolaonacopa.com.br/quiz-selecao" },
  { id: "egito", nome: "Egito", bandeira: "🇪🇬", pesos: { artista:1, maquina:2, guerreiro:2, surpresa:2, festa:2 },
    titulo: "Você é Egito!", desc: "Organização árabe com qualidade técnica. Você depende dos seus líderes para brilhar — e quando eles brilham, você brilha junto.",
    share: "Fiz o quiz e sou o EGITO 🇪🇬⚽ Organizado e confiante! Descobre a tua → bolaonacopa.com.br/quiz-selecao" },
  { id: "tunizia", nome: "Tunísia", bandeira: "🇹🇳", pesos: { artista:1, maquina:2, guerreiro:2, surpresa:2, festa:1 },
    titulo: "Você é Tunísia!", desc: "Disciplina tática e capacidade de surpreender. Você não é favorito em nada — e é perigoso por isso.",
    share: "Fiz o quiz e sou a TUNÍSIA 🇹🇳⚽ Tático e perigoso! Qual é a tua seleção? → bolaonacopa.com.br/quiz-selecao" },
  { id: "congo", nome: "RD Congo", bandeira: "🇨🇩", pesos: { artista:2, maquina:0, guerreiro:2, surpresa:3, festa:3 },
    titulo: "Você é RD Congo!", desc: "50 anos sem Copa e de volta com tudo! Você é movido pelo orgulho e por uma história que ninguém conhece ainda.",
    share: "Fiz o quiz e sou a RD CONGO 🇨🇩⚽ 50 anos esperando e chegou! Descobre a tua → bolaonacopa.com.br/quiz-selecao" },
  { id: "japao", nome: "Japão", bandeira: "🇯🇵", pesos: { artista:1, maquina:3, guerreiro:1, surpresa:3, festa:1 },
    titulo: "Você é Japão!", desc: "Organização impecável com velocidade surpreendente. Você chega quieto, faz o impossível e vai embora antes de todos entenderem.",
    share: "Fiz o quiz e sou o JAPÃO 🇯🇵⚽ Silencioso e surpreendente! Qual é a tua? → bolaonacopa.com.br/quiz-selecao" },
  { id: "coreia_do_sul", nome: "Coreia do Sul", bandeira: "🇰🇷", pesos: { artista:1, maquina:2, guerreiro:2, surpresa:2, festa:2 },
    titulo: "Você é Coreia do Sul!", desc: "Atletismo, intensidade e aquela capacidade de criar festas inesperadas. Você dá tudo em campo.",
    share: "Fiz o quiz e sou a COREIA DO SUL 🇰🇷⚽ Intensidade total! Descobre a tua seleção → bolaonacopa.com.br/quiz-selecao" },
  { id: "australia", nome: "Austrália", bandeira: "🇦🇺", pesos: { artista:1, maquina:2, guerreiro:2, surpresa:2, festa:2 },
    titulo: "Você é Austrália!", desc: "Raça australiana combinada com qualidade técnica crescente. Você vai mais longe do que todos esperam.",
    share: "Fiz o quiz e sou a AUSTRÁLIA 🇦🇺⚽ Vai mais longe do que esperam! Qual é a tua? → bolaonacopa.com.br/quiz-selecao" },
  { id: "ira", nome: "Irã", bandeira: "🇮🇷", pesos: { artista:0, maquina:3, guerreiro:2, surpresa:1, festa:1 },
    titulo: "Você é Irã!", desc: "Disciplina tática e solidez defensiva. Você é difícil de bater e sabe ser eficaz com os recursos que tem.",
    share: "Fiz o quiz e sou o IRÃ 🇮🇷⚽ Disciplinado e sólido! Descobre a tua seleção → bolaonacopa.com.br/quiz-selecao" },
  { id: "arabia_saudita", nome: "Arábia Saudita", bandeira: "🇸🇦", pesos: { artista:1, maquina:1, guerreiro:2, surpresa:3, festa:2 },
    titulo: "Você é Arábia Saudita!", desc: "Você causou a maior zebra da Copa 2022. Quando a motivação bate, você para qualquer gigante.",
    share: "Fiz o quiz e sou a ARÁBIA SAUDITA 🇸🇦⚽ Para qualquer gigante! Qual é a tua? → bolaonacopa.com.br/quiz-selecao" },
  { id: "uzbequistao", nome: "Uzbequistão", bandeira: "🇺🇿", pesos: { artista:1, maquina:2, guerreiro:1, surpresa:3, festa:1 },
    titulo: "Você é Uzbequistão!", desc: "Estreante cheio de ambição. Você está aqui para mostrar ao mundo que existe — e vai causar surpresa.",
    share: "Fiz o quiz e sou o UZBEQUISTÃO 🇺🇿⚽ Estreante ambicioso! Descobre a tua → bolaonacopa.com.br/quiz-selecao" },
  { id: "iraque", nome: "Iraque", bandeira: "🇮🇶", pesos: { artista:0, maquina:1, guerreiro:3, surpresa:2, festa:2 },
    titulo: "Você é Iraque!", desc: "Voltou depois de décadas e chegou com tudo a provar. Você é movido pela história e pelo orgulho nacional.",
    share: "Fiz o quiz e sou o IRAQUE 🇮🇶⚽ Com tudo a provar! Qual é a tua seleção? → bolaonacopa.com.br/quiz-selecao" },
  { id: "eua", nome: "EUA", bandeira: "🇺🇸", pesos: { artista:1, maquina:2, guerreiro:2, surpresa:2, festa:2 },
    titulo: "Você é EUA!", desc: "Atletismo, intensidade e crescimento rápido. Você está melhorando a cada jogo — e todos estão começando a prestar atenção.",
    share: "Fiz o quiz e sou os EUA 🇺🇸⚽ Crescendo a cada jogo! Descobre a tua seleção → bolaonacopa.com.br/quiz-selecao" },
  { id: "mexico", nome: "México", bandeira: "🇲🇽", pesos: { artista:2, maquina:1, guerreiro:2, surpresa:2, festa:3 },
    titulo: "Você é México!", desc: "Raça, garra e aquela festa que só o México faz. Você dá tudo em campo e transforma o estádio numa celebração.",
    share: "Fiz o quiz e sou o MÉXICO 🇲🇽⚽ Raça e festa! Descobre a tua seleção → bolaonacopa.com.br/quiz-selecao" },
  { id: "canada", nome: "Canadá", bandeira: "🇨🇦", pesos: { artista:1, maquina:2, guerreiro:2, surpresa:2, festa:2 },
    titulo: "Você é Canadá!", desc: "Crescimento meteórico. Você chegou à Copa sem avisar e agora quer mostrar que veio para ficar.",
    share: "Fiz o quiz e sou o CANADÁ 🇨🇦⚽ Chegou sem avisar! Qual é a tua seleção? → bolaonacopa.com.br/quiz-selecao" },
  { id: "honduras", nome: "Honduras", bandeira: "🇭🇳", pesos: { artista:0, maquina:1, guerreiro:3, surpresa:2, festa:2 },
    titulo: "Você é Honduras!", desc: "Raça pura e coração grande. Você não tem os recursos dos grandes, mas tem algo que não se compra.",
    share: "Fiz o quiz e sou HONDURAS 🇭🇳⚽ Coração grande! Descobre a tua seleção → bolaonacopa.com.br/quiz-selecao" },
  { id: "costa_rica", nome: "Costa Rica", bandeira: "🇨🇷", pesos: { artista:0, maquina:2, guerreiro:2, surpresa:3, festa:1 },
    titulo: "Você é Costa Rica!", desc: "A zebra de 2014. Você mostra ao mundo que organização e crença podem levar qualquer time longe.",
    share: "Fiz o quiz e sou a COSTA RICA 🇨🇷⚽ A zebra que inspira! Qual é a tua? → bolaonacopa.com.br/quiz-selecao" },
  { id: "jamaica", nome: "Jamaica", bandeira: "🇯🇲", pesos: { artista:2, maquina:0, guerreiro:2, surpresa:3, festa:3 },
    titulo: "Você é Jamaica!", desc: "Velocidade, vibração e aquele jeito jamaicano de encarar a vida. Você torna tudo mais leve e mais rápido.",
    share: "Fiz o quiz e sou a JAMAICA 🇯🇲⚽ Velocidade e vibração! Descobre a tua → bolaonacopa.com.br/quiz-selecao" },
  { id: "curacao", nome: "Curaçao", bandeira: "🇨🇼", pesos: { artista:2, maquina:1, guerreiro:1, surpresa:3, festa:2 },
    titulo: "Você é Curaçao!", desc: "Pequena ilha com coração enorme. Você chegou à Copa como uma revelação — e vai surpreender muito ainda.",
    share: "Fiz o quiz e sou CURAÇAO 🇨🇼⚽ A surpresa da Copa! Qual é a tua seleção? → bolaonacopa.com.br/quiz-selecao" },
  { id: "haiti", nome: "Haiti", bandeira: "🇭🇹", pesos: { artista:1, maquina:0, guerreiro:2, surpresa:3, festa:3 },
    titulo: "Você é Haiti!", desc: "52 anos esperando e de volta! Você é movido pelo orgulho de um povo que nunca desistiu.",
    share: "Fiz o quiz e sou o HAITI 🇭🇹⚽ 52 anos esperando! Descobre a tua seleção → bolaonacopa.com.br/quiz-selecao" },
  { id: "nova_zelandia", nome: "Nova Zelândia", bandeira: "🇳🇿", pesos: { artista:1, maquina:2, guerreiro:1, surpresa:3, festa:2 },
    titulo: "Você é Nova Zelândia!", desc: "Da Oceania para o mundo. Você defende suas cores com orgulho e surpreende quem não te conhece.",
    share: "Fiz o quiz e sou a NOVA ZELÂNDIA 🇳🇿⚽ Da Oceania para o mundo! Qual é a tua? → bolaonacopa.com.br/quiz-selecao" },
  { id: "catar", nome: "Catar", bandeira: "🇶🇦", pesos: { artista:0, maquina:3, guerreiro:1, surpresa:2, festa:2 },
    titulo: "Você é Catar!", desc: "Organização e visão de longo prazo. Você constrói sistemas onde outros improvisam.",
    share: "Fiz o quiz e sou o CATAR 🇶🇦⚽ Organização e visão! Descobre a tua seleção → bolaonacopa.com.br/quiz-selecao" },
];

// ── 10 perguntas ──
export const PERGUNTAS: PerguntaQuiz[] = [
  { texto: "No último minuto empatado, o que você faz?", opcoes: [
    { texto: "Driblo todo mundo e finalizo com categoria", icone: "🎨", pontos: [3,0,1,0,1] },
    { texto: "Analiso o espaço e executo o plano perfeito", icone: "⚙️", pontos: [0,3,0,1,0] },
    { texto: "Pego a bola e decido na raça — sem espaço pra medo", icone: "🔥", pontos: [0,0,3,1,0] },
    { texto: "Espero o erro do adversário e explodo no contra-ataque", icone: "⚡", pontos: [1,1,1,3,0] },
    { texto: "Chamo o time, crio o clima e faço a festa acontecer", icone: "🎉", pontos: [1,0,1,0,3] },
  ]},
  { texto: "Como seus parceiros de racha te descrevem em campo?", opcoes: [
    { texto: "\"Cara, ele joga bonito demais\"", icone: "🎨", pontos: [3,0,0,1,1] },
    { texto: "\"Esse aí nunca perde posicionamento\"", icone: "⚙️", pontos: [0,3,1,0,0] },
    { texto: "\"Quando ele entra, o time muda de energia\"", icone: "🔥", pontos: [1,0,3,0,1] },
    { texto: "\"Ninguém entende de onde ele surge\"", icone: "⚡", pontos: [1,1,0,3,0] },
    { texto: "\"É impossível jogar contra ele sem rir\"", icone: "🎉", pontos: [0,0,1,1,3] },
  ]},
  { texto: "Perdendo de 2 a 0 no 2º tempo, o que você faz?", opcoes: [
    { texto: "Chamo o time com confiança e alegria", icone: "🎨", pontos: [2,0,2,0,2] },
    { texto: "Reorganizo a equipe com frieza e execução", icone: "⚙️", pontos: [0,3,0,1,0] },
    { texto: "Raiva vira combustível — fico mais perigoso", icone: "🔥", pontos: [0,0,3,1,0] },
    { texto: "Fecho o bloco e espero o momento certeiro", icone: "⚡", pontos: [0,2,0,3,0] },
    { texto: "Mantenho o clima leve — pressão não me abala", icone: "🎉", pontos: [1,0,1,0,3] },
  ]},
  { texto: "Qual frase define melhor seu estilo de jogo?", opcoes: [
    { texto: "\"Futebol é arte — tem que ser bonito\"", icone: "🎨", pontos: [3,0,0,1,1] },
    { texto: "\"Eficiência e organização acima de tudo\"", icone: "⚙️", pontos: [0,3,1,0,0] },
    { texto: "\"Nunca desisti, nunca vou desistir\"", icone: "🔥", pontos: [1,0,3,0,1] },
    { texto: "\"Ninguém acreditava — e a gente foi além\"", icone: "⚡", pontos: [0,1,1,3,0] },
    { texto: "\"O jogo tem que ter emoção e celebração\"", icone: "🎉", pontos: [1,0,1,0,3] },
  ]},
  { texto: "Num racha entre amigos, o que você prefere?", opcoes: [
    { texto: "Fazer os gols mais bonitos, mesmo perdendo", icone: "🎨", pontos: [3,0,1,0,1] },
    { texto: "Organizar o time e dominar taticamente", icone: "⚙️", pontos: [0,3,0,1,0] },
    { texto: "Brigar por cada lance e dar sangue pelo time", icone: "🔥", pontos: [0,0,3,1,0] },
    { texto: "Defender bem e sair em velocidade no contra", icone: "⚡", pontos: [1,1,1,3,0] },
    { texto: "Fazer a galera rir e criar memórias", icone: "🎉", pontos: [1,0,0,1,3] },
  ]},
  { texto: "Qual é sua maior qualidade no bolão da Copa?", opcoes: [
    { texto: "Criatividade — acerto placares que ninguém tentaria", icone: "🎨", pontos: [3,0,0,2,0] },
    { texto: "Consistência — raramente erro o resultado", icone: "⚙️", pontos: [0,3,1,0,0] },
    { texto: "Convicção — vou no palpite mesmo contra a maioria", icone: "🔥", pontos: [0,0,3,1,0] },
    { texto: "Surpresa — palpito na zebra e acerto", icone: "⚡", pontos: [1,0,0,3,0] },
    { texto: "Animação — faço o grupo todo participar", icone: "🎉", pontos: [0,0,1,0,3] },
  ]},
  { texto: "Qual seria o gol dos seus sonhos?", opcoes: [
    { texto: "Driblar três e bater no ângulo com categoria", icone: "🎨", pontos: [3,0,1,0,0] },
    { texto: "Jogada ensaiada com execução perfeita", icone: "⚙️", pontos: [1,3,0,0,0] },
    { texto: "Falta livre no último minuto — decisão pura", icone: "🔥", pontos: [1,0,3,0,0] },
    { texto: "Contra-ataque fulminante de 80 metros", icone: "⚡", pontos: [0,1,1,3,0] },
    { texto: "Golaço e celebração inesquecível com o time todo", icone: "🎉", pontos: [1,0,1,0,3] },
  ]},
  { texto: "Quando você assiste um jogo, o que mais te emociona?", opcoes: [
    { texto: "Um drible impossível ou uma jogada genial", icone: "🎨", pontos: [3,0,0,1,0] },
    { texto: "Um sistema tático perfeitamente executado", icone: "⚙️", pontos: [0,3,0,0,0] },
    { texto: "Uma virada épica nos acréscimos com raça pura", icone: "🔥", pontos: [0,0,3,0,1] },
    { texto: "Uma zebra absurda — o azarão derrubando o favorito", icone: "⚡", pontos: [0,1,0,3,0] },
    { texto: "A torcida explodindo — a festa coletiva", icone: "🎉", pontos: [0,0,0,1,3] },
  ]},
  { texto: "No trabalho ou na vida, seus amigos te descrevem como:", opcoes: [
    { texto: "O criativo — sempre aparece com a ideia que muda tudo", icone: "🎨", pontos: [3,0,0,1,0] },
    { texto: "O estrategista — você sempre tem um plano B e C", icone: "⚙️", pontos: [0,3,1,0,0] },
    { texto: "O determinado — quando decide, não tem quem pare", icone: "🔥", pontos: [0,0,3,0,1] },
    { texto: "O coringa — ninguém sabe o que esperar de você", icone: "⚡", pontos: [1,0,0,3,0] },
    { texto: "O animador — onde você chega, o clima muda", icone: "🎉", pontos: [0,0,0,1,3] },
  ]},
  { texto: "O que você nunca abre mão num jogo de futebol?", opcoes: [
    { texto: "Beleza — o jeito bonito de jogar importa tanto quanto ganhar", icone: "🎨", pontos: [3,0,0,0,1] },
    { texto: "Organização — sem sistema, nada funciona", icone: "⚙️", pontos: [0,3,1,0,0] },
    { texto: "Intensidade — cada bola disputada como se fosse a última", icone: "🔥", pontos: [0,0,3,1,0] },
    { texto: "Imprevisibilidade — nunca jogar igual duas vezes", icone: "⚡", pontos: [1,0,0,3,0] },
    { texto: "Alegria — futebol sem celebração não faz sentido", icone: "🎉", pontos: [0,0,1,0,3] },
  ]},
];

// ── Algoritmo ──
const DIMS = ["artista", "maquina", "guerreiro", "surpresa", "festa"] as const;

// Mapeia perfil dominante para posição de futebol
const POSICAO_MAP: Record<string, string> = {
  artista: "Meia-Atacante",
  maquina: "Volante",
  guerreiro: "Zagueiro",
  surpresa: "Ponta",
  festa: "Camisa 10",
};

export function getPosicaoPerfil(perfil: Perfil): string {
  let max = -1;
  let dim = "festa";
  for (const d of DIMS) {
    if (perfil[d] > max) { max = perfil[d]; dim = d; }
  }
  return POSICAO_MAP[dim] || "Camisa 10";
}

export function calcularPerfil(respostas: number[]): Perfil {
  const p: Perfil = { artista: 0, maquina: 0, guerreiro: 0, surpresa: 0, festa: 0 };
  respostas.forEach((resp, qi) => {
    if (qi >= PERGUNTAS.length || resp < 0 || resp >= 5) return;
    const pts = PERGUNTAS[qi].opcoes[resp].pontos;
    DIMS.forEach((d, i) => { p[d] += pts[i]; });
  });
  return p;
}

export function encontrarSelecao(perfil: Perfil): SelecaoQuiz {
  let best = -1;
  let result = SELECOES[0];
  SELECOES.forEach((s) => {
    const score =
      perfil.artista * s.pesos.artista +
      perfil.maquina * s.pesos.maquina +
      perfil.guerreiro * s.pesos.guerreiro +
      perfil.surpresa * s.pesos.surpresa +
      perfil.festa * s.pesos.festa;
    if (score > best) {
      best = score;
      result = s;
    }
  });
  return result;
}

export function perfilParaPorcentagens(perfil: Perfil): { dim: string; label: string; pct: number; cor: string; icone: string }[] {
  const total = perfil.artista + perfil.maquina + perfil.guerreiro + perfil.surpresa + perfil.festa || 1;
  return [
    { dim: "artista", label: "Artista", pct: Math.round((perfil.artista / total) * 100), cor: "#22c55e", icone: "🎨" },
    { dim: "festa", label: "Festa", pct: Math.round((perfil.festa / total) * 100), cor: "#facc15", icone: "🎉" },
    { dim: "guerreiro", label: "Guerreiro", pct: Math.round((perfil.guerreiro / total) * 100), cor: "#f97316", icone: "🔥" },
    { dim: "surpresa", label: "Surpresa", pct: Math.round((perfil.surpresa / total) * 100), cor: "#a78bfa", icone: "⚡" },
    { dim: "maquina", label: "Máquina", pct: Math.round((perfil.maquina / total) * 100), cor: "#60a5fa", icone: "⚙️" },
  ].sort((a, b) => b.pct - a.pct);
}

export function calcularCompatibilidade(perfil: Perfil, selecao: SelecaoQuiz): number {
  const maxPossivel = 30 * 3; // 10 perguntas * max 3 pts * max peso 3
  const score =
    perfil.artista * selecao.pesos.artista +
    perfil.maquina * selecao.pesos.maquina +
    perfil.guerreiro * selecao.pesos.guerreiro +
    perfil.surpresa * selecao.pesos.surpresa +
    perfil.festa * selecao.pesos.festa;
  return Math.min(99, Math.max(55, Math.round((score / maxPossivel) * 100) + 40));
}
