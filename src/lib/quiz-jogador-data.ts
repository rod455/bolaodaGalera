// ═══════════════════════════════════════════════════════
// Quiz "Qual jogador de futebol você seria na vida?"
// 20 resultados · 7 perguntas · 5 opções
// ═══════════════════════════════════════════════════════

export interface Jogador {
  id: string;
  posicao: string;
  emoji: string;
  titulo: string;
  desc: string;
  share: string;
}

export const JOGADORES: Jogador[] = [
  {
    id: "centroavante",
    posicao: "Centroavante",
    emoji: "🎯",
    titulo: "Você é o CENTROAVANTE — centro das atenções!",
    desc: "Só aparece nas horas certas, mas quando aparece todo mundo fala. Some a semana toda e aparece sexta no bar dizendo 'fui eu que chamei a galera'.",
    share: "Fiz o quiz do Grupo da Galera e sou o CENTROAVANTE 🎯⚽ Some a semana, aparece na sexta. Descobre qual jogador você seria → bolaodagalera-ten.vercel.app/quiz-jogador",
  },
  {
    id: "lateral_direito",
    posicao: "Lateral Direito",
    emoji: "🏃",
    titulo: "Você é o LATERAL DIREITO — vai e volta sem parar!",
    desc: "Está em todo lugar — na festa, no trabalho, ajudando a mudar, no churrasco. Mas no final do dia não sabe bem o que fez de útil.",
    share: "Fiz o quiz e sou o LATERAL DIREITO 🏃⚽ Em todo lugar, em lugar nenhum. Descobre o seu → bolaodagalera-ten.vercel.app/quiz-jogador",
  },
  {
    id: "lateral_esquerdo",
    posicao: "Lateral Esquerdo",
    emoji: "👻",
    titulo: "Você é o LATERAL ESQUERDO — ninguém lembra que você existe!",
    desc: "Igual ao lateral direito mas invisível até fazer falta. O colaborador silencioso que só aparece no RH quando pede demissão.",
    share: "Fiz o quiz e sou o LATERAL ESQUERDO 👻⚽ Ninguém lembra até fazer falta. Descobre o seu → bolaodagalera-ten.vercel.app/quiz-jogador",
  },
  {
    id: "zagueiro_racudo",
    posicao: "Zagueiro Raçudo",
    emoji: "💥",
    titulo: "Você é o ZAGUEIRO RAÇUDO — sem técnica mas com coração!",
    desc: "Bate em qualquer um sem hesitar. Não entende nada da reunião mas é o primeiro a defender o chefe na hora do problema.",
    share: "Fiz o quiz e sou o ZAGUEIRO RAÇUDO 💥⚽ Sem técnica, com coração. Descobre o seu → bolaodagalera-ten.vercel.app/quiz-jogador",
  },
  {
    id: "zagueiro_elegante",
    posicao: "Zagueiro Elegante",
    emoji: "🧊",
    titulo: "Você é o ZAGUEIRO ELEGANTE — nunca parece se esforçar!",
    desc: "Sai jogando pelo chão, cabelo no lugar. Faz tudo na última hora e entrega impecável. Todo mundo odeia com carinho.",
    share: "Fiz o quiz e sou o ZAGUEIRO ELEGANTE 🧊⚽ Última hora, resultado impecável. Descobre o seu → bolaodagalera-ten.vercel.app/quiz-jogador",
  },
  {
    id: "volante_destruidor",
    posicao: "Volante Destruidor",
    emoji: "🔨",
    titulo: "Você é o VOLANTE DESTRUIDOR — não cria nada mas acaba com tudo!",
    desc: "Nunca tem ideia própria mas sempre sabe onde o plano vai dar errado antes de todo mundo. O pessimista que salva o grupo.",
    share: "Fiz o quiz e sou o VOLANTE DESTRUIDOR 🔨⚽ Não cria, mas prevê o desastre. Descobre o seu → bolaodagalera-ten.vercel.app/quiz-jogador",
  },
  {
    id: "volante_box",
    posicao: "Volante Box-to-Box",
    emoji: "🐴",
    titulo: "Você é o VOLANTE BOX-TO-BOX — corre 12km e ninguém percebe!",
    desc: "Faz o trabalho de quatro pessoas, não recebe aumento e ainda sorri na foto da confraternização. O herói sem cabo.",
    share: "Fiz o quiz e sou o VOLANTE BOX-TO-BOX 🐴⚽ Trabalha por quatro, crédito zero. Descobre o seu → bolaodagalera-ten.vercel.app/quiz-jogador",
  },
  {
    id: "meia_armador",
    posicao: "Meia Armador",
    emoji: "🎩",
    titulo: "Você é o MEIA ARMADOR — toca em 3 bolas mas muda o jogo!",
    desc: "Fala pouco na reunião mas quando fala todo mundo anota. O passe que muda tudo vem sempre de você — quando você aparece.",
    share: "Fiz o quiz e sou o MEIA ARMADOR 🎩⚽ Fala pouco, muda tudo. Descobre o seu → bolaodagalera-ten.vercel.app/quiz-jogador",
  },
  {
    id: "meia_atacante",
    posicao: "Meia Atacante",
    emoji: "🌪️",
    titulo: "Você é o MEIA ATACANTE — genial mas inconsistente!",
    desc: "Jogo perfeito semana sim, sumido semana não. Tem a melhor ideia do grupo e esquece de executar. Potencial ilimitado, entrega variável.",
    share: "Fiz o quiz e sou o MEIA ATACANTE 🌪️⚽ Melhor ideia do grupo, entrega variável. Descobre o seu → bolaodagalera-ten.vercel.app/quiz-jogador",
  },
  {
    id: "ponta_direita",
    posicao: "Ponta Direita",
    emoji: "🚀",
    titulo: "Você é a PONTA DIREITA — velocidade absurda no primeiro passo!",
    desc: "Começa 7 projetos por mês, termina nenhum. O drible sai, o que vem depois... a gente torce.",
    share: "Fiz o quiz e sou a PONTA DIREITA 🚀⚽ Começa tudo, termina nada. Descobre o seu → bolaodagalera-ten.vercel.app/quiz-jogador",
  },
  {
    id: "ponta_esquerda",
    posicao: "Ponta Esquerda",
    emoji: "🐧",
    titulo: "Você é a PONTA ESQUERDA — faz tudo diferente e não é pior!",
    desc: "Usa Linux, bebe café sem açúcar e explica isso pra todo mundo sem ser perguntado. Diferente por princípio, não por acidente.",
    share: "Fiz o quiz e sou a PONTA ESQUERDA 🐧⚽ Diferente por princípio. Descobre o seu → bolaodagalera-ten.vercel.app/quiz-jogador",
  },
  {
    id: "falso_9",
    posicao: "Falso 9",
    emoji: "🌀",
    titulo: "Você é o FALSO 9 — ninguém sabe o que você faz mas funciona!",
    desc: "Cargo de 'analista sênior de projetos estratégicos' no LinkedIn. A mãe ainda pergunta o que você faz. O resultado aparece, a função ninguém explica.",
    share: "Fiz o quiz e sou o FALSO 9 🌀⚽ Ninguém entende, mas funciona. Descobre o seu → bolaodagalera-ten.vercel.app/quiz-jogador",
  },
  {
    id: "goleiro_tranquilo",
    posicao: "Goleiro Tranquilo",
    emoji: "😴",
    titulo: "Você é o GOLEIRO TRANQUILO — 80 minutos sem tocar na bola!",
    desc: "Não vai a nenhuma reunião desnecessária e no prazo final entrega tudo enquanto os outros entram em colapso. O zen do escritório.",
    share: "Fiz o quiz e sou o GOLEIRO TRANQUILO 😴⚽ Sumido até salvar tudo. Descobre o seu → bolaodagalera-ten.vercel.app/quiz-jogador",
  },
  {
    id: "goleiro_nervoso",
    posicao: "Goleiro Nervoso",
    emoji: "😬",
    titulo: "Você é o GOLEIRO NERVOSO — se autoboicota na hora H!",
    desc: "Estudou para a prova, dormiu bem, tomou café — e na hora esqueceu o nome do professor. Preparado para tudo, traído pelo próprio cérebro.",
    share: "Fiz o quiz e sou o GOLEIRO NERVOSO 😬⚽ Preparado, traído na hora H. Descobre o seu → bolaodagalera-ten.vercel.app/quiz-jogador",
  },
  {
    id: "segundo_volante",
    posicao: "Segundo Volante",
    emoji: "🔗",
    titulo: "Você é o SEGUNDO VOLANTE — ninguém define o que você faz!",
    desc: "Remove de time e o time piora. O amigo do grupo que 'não faz nada' mas sem ele o grupo se dissolve em 3 semanas.",
    share: "Fiz o quiz e sou o SEGUNDO VOLANTE 🔗⚽ Ninguém define, todos precisam. Descobre o seu → bolaodagalera-ten.vercel.app/quiz-jogador",
  },
  {
    id: "reserva",
    posicao: "Atacante Reserva",
    emoji: "⚡",
    titulo: "Você é o ATACANTE RESERVA — entra nos últimos 15 com energia total!",
    desc: "Chega na festa 23h quando todo mundo está em modo automático e acha que acabou de começar. Energia fora de hora, mas genuína.",
    share: "Fiz o quiz e sou o ATACANTE RESERVA ⚡⚽ Energia fora de hora. Descobre o seu → bolaodagalera-ten.vercel.app/quiz-jogador",
  },
  {
    id: "libero",
    posicao: "Zagueiro-Líbero",
    emoji: "🧠",
    titulo: "Você é o ZAGUEIRO-LÍBERO — parece meia mas mora na defesa!",
    desc: "O gerente que ainda faz o trabalho dos analistas 'só para ajudar'. Organiza tudo, delega nada, reclama de tudo — e está certo em tudo.",
    share: "Fiz o quiz e sou o ZAGUEIRO-LÍBERO 🧠⚽ Chefe que não delega. Descobre o seu → bolaodagalera-ten.vercel.app/quiz-jogador",
  },
  {
    id: "meia_classico",
    posicao: "Meia Clássico",
    emoji: "📠",
    titulo: "Você é o MEIA CLÁSSICO — joga do mesmo jeito há 15 anos!",
    desc: "Funcionava em 2009 e funciona agora. Ainda manda e-mail formal com 'Prezados' para pedir pizza na sexta. Consistente como um fax.",
    share: "Fiz o quiz e sou o MEIA CLÁSSICO 📠⚽ Consistente como um fax. Descobre o seu → bolaodagalera-ten.vercel.app/quiz-jogador",
  },
  {
    id: "pivo",
    posicao: "Centroavante Pivô",
    emoji: "🫱",
    titulo: "Você é o CENTROAVANTE PIVÔ — coloca o time para frente mas nunca aparece!",
    desc: "Recebe de costas, protege, distribui para os outros brilharem. O líder que nunca aparece no press release mas é o motivo do sucesso.",
    share: "Fiz o quiz e sou o CENTROAVANTE PIVÔ 🫱⚽ Trabalha nos bastidores, vitória dos outros. Descobre o seu → bolaodagalera-ten.vercel.app/quiz-jogador",
  },
  {
    id: "coringa",
    posicao: "Lateral que Virou Centroavante",
    emoji: "🤷",
    titulo: "Você é o LATERAL QUE VIROU CENTROAVANTE — não sabe mais o que é!",
    desc: "Formado em Direito, trabalha com marketing, tem canal no YouTube sobre finanças. Começou numa função, foi empurrado para outra. Versátil ou perdido? Por que não os dois?",
    share: "Fiz o quiz e sou o LATERAL QUE VIROU CENTROAVANTE 🤷⚽ Formado em Direito, trabalha com marketing. Descobre o seu → bolaodagalera-ten.vercel.app/quiz-jogador",
  },
];

export const PERGUNTAS_JOGADOR = [
  {
    texto: "Chega segunda-feira. Qual é o seu estado?",
    opcoes: [
      "Já estou no escritório às 8h, café na mão, plano do dia pronto",
      "Apareço quando precisam de mim — até lá estou 'disponível'",
      "Entro na reunião sem ter lido o e-mail mas finjo que li",
      "Já estou cansado desde domingo à noite",
      "Segunda? Achei que era terça",
    ],
  },
  {
    texto: "Como você age no trabalho em equipe?",
    opcoes: [
      "Faço minha parte, a parte do lado, e às vezes a do outro lado também",
      "Fico de olho onde vai dar errado e aviso antes de acontecer",
      "Apareço na hora certa com a solução — enquanto isso, sumo",
      "Organizo todo mundo sem que ninguém peça",
      "Não sei bem o que faço mas sem mim o time piora",
    ],
  },
  {
    texto: "Como é a sua relação com prazos?",
    opcoes: [
      "Entrego antes do prazo — às vezes dois dias antes por ansiedade",
      "Entrego no último segundo, impecável, sem suar",
      "Começo cedo, empaco no meio, entrego às pressas",
      "Prazo? Achei que era uma sugestão",
      "Entrego no prazo mas entro em colapso antes",
    ],
  },
  {
    texto: "Qual é o seu papel em uma festa?",
    opcoes: [
      "Chego cedo, ajudo a organizar, saio antes de bagunçar",
      "Apareço no horário certo, bebo, sumo quando a coisa piora",
      "Chego às 23h quando todo mundo está acabado e acho que começou",
      "Estou em todas mas não lembro de ter organizado nenhuma",
      "Fico no canto mas sem mim o ambiente seria horrível",
    ],
  },
  {
    texto: "Como você lida com uma crise?",
    opcoes: [
      "Já sabia que ia acontecer. Avisei. Ninguém ouviu. Resolvo assim mesmo",
      "Entro em pânico, me preparo pra tudo e esqueço o óbvio na hora H",
      "Resolvo sem aparecer. Depois ninguém sabe que fui eu",
      "Chamo todo mundo, organizo, delego — e faço tudo sozinho no fim",
      "Apareço no momento exato com a solução que ninguém esperava",
    ],
  },
  {
    texto: "Qual frase mais combina com você?",
    opcoes: [
      "'Eu estava disponível o tempo todo. Vocês que não me chamaram.'",
      "'Fui eu que fiz. Alguém viu? Não? Ok.'",
      "'Começo amanhã. Definitivamente amanhã.'",
      "'Não sei o que eu faço aqui mas sem mim não funciona.'",
      "'Minha função é essa? Desde quando?'",
    ],
  },
  {
    texto: "Como você usa sua energia ao longo do dia?",
    opcoes: [
      "Constante do início ao fim — ninguém me para",
      "Zero pela manhã, pico às 22h, inútil às 23h",
      "Explosão no começo, sumo no meio, apareço no final",
      "Distribuída — um pouco de tudo, um pouco em nada",
      "Reservo para o momento exato. Pode demorar. Mas chega.",
    ],
  },
];

// SLOTS[perguntaIndex * 5 + opcaoIndex] = índices dos jogadores que ganham +1 ponto
export const SLOTS_JOGADOR: number[][] = [
  // P1 — segunda-feira
  [6, 7, 13, 17, 18],
  [0, 8, 12, 14, 19],
  [3, 9, 11, 15, 16],
  [1, 4, 5, 10, 18],
  [2, 6, 9, 13, 19],

  // P2 — trabalho em equipe
  [1, 6, 14, 16, 18],
  [5, 8, 11, 13, 17],
  [0, 7, 12, 15, 19],
  [3, 9, 10, 16, 17],
  [2, 4, 6, 14, 18],

  // P3 — prazos
  [4, 7, 12, 16, 17],
  [4, 9, 11, 14, 18],
  [8, 10, 15, 17, 19],
  [0, 2, 9, 13, 19],
  [1, 5, 13, 14, 16],

  // P4 — festa
  [4, 7, 12, 17, 18],
  [0, 8, 11, 13, 19],
  [3, 9, 15, 16, 19],
  [1, 6, 10, 14, 18],
  [2, 5, 11, 14, 17],

  // P5 — crise
  [5, 8, 13, 16, 19],
  [3, 9, 13, 14, 18],
  [2, 7, 12, 16, 18],
  [1, 6, 10, 15, 17],
  [0, 4, 11, 13, 19],

  // P6 — frase
  [2, 8, 13, 14, 16],
  [6, 7, 12, 18, 19],
  [9, 10, 15, 17, 19],
  [3, 4, 11, 14, 18],
  [0, 1, 5, 13, 19],

  // P7 — energia
  [1, 6, 7, 16, 17],
  [9, 10, 13, 18, 19],
  [0, 8, 11, 15, 19],
  [2, 3, 5, 14, 18],
  [4, 7, 12, 16, 17],
];

export function calcularJogador(respostas: number[]): Jogador {
  const scores = new Array(20).fill(0);
  respostas.forEach((resp, qi) => {
    SLOTS_JOGADOR[qi * 5 + resp].forEach((idx) => {
      scores[idx] += 1;
    });
  });
  const maxScore = Math.max(...scores);
  return JOGADORES[scores.indexOf(maxScore)];
}


