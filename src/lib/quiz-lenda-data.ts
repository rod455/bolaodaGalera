// ═══ Quiz "Qual lenda da Copa do Mundo você seria?" ═══
// 25 lendas · 10 perguntas · 5 opções · Validado em 1M simulações

export interface Lenda {
  id: string;
  nome: string;
  bandeira: string;
  emoji: string;
  titulo: string;
  desc: string;
  share: string;
}

export const LENDAS: Lenda[] = [
  // ── BRASILEIROS (6) ──
  {
    id: "pele", nome: "Pelé", bandeira: "🇧🇷", emoji: "👑",
    titulo: "Você é PELÉ — o Rei do Futebol!",
    desc: "O maior de todos os tempos. Técnica, genialidade e uma alegria que contagia todos ao redor. Tricampeão mundial porque uma Copa jamais seria suficiente para ele.",
    share: "Fiz o quiz do Bolão da Galera e sou PELÉ 👑⚽ O Rei! Descobre qual lenda você seria → bolaonacopa.com.br/quiz-lenda",
  },
  {
    id: "r9", nome: "Ronaldo Fenômeno", bandeira: "🇧🇷", emoji: "⚡",
    titulo: "Você é RONALDO FENÔMENO — o impossível virou realidade!",
    desc: "Dado como fora, caiu mais de uma vez e voltou mais forte. Dois gols na final de 2002 contra a Alemanha. Velocidade, habilidade e gols que ninguém mais faria.",
    share: "Fiz o quiz e sou RONALDO FENÔMENO ⚡⚽ O impossível aconteceu! Descobre a tua lenda → bolaonacopa.com.br/quiz-lenda",
  },
  {
    id: "ronaldinho", nome: "Ronaldinho Gaúcho", bandeira: "🇧🇷", emoji: "😁",
    titulo: "Você é RONALDINHO GAÚCHO — alegria e magia em campo!",
    desc: "Você transformou futebol em espetáculo. O sorriso mesmo nas situações difíceis, os dribles impossíveis, a torcida adversária aplaudindo. Único na história do esporte.",
    share: "Fiz o quiz e sou RONALDINHO GAÚCHO 😁⚽ Alegria e magia! Descobre a tua lenda → bolaonacopa.com.br/quiz-lenda",
  },
  {
    id: "romario", nome: "Romário", bandeira: "🇧🇷", emoji: "🎯",
    titulo: "Você é ROMÁRIO — instinto de gol puro!",
    desc: "Sempre no lugar certo na hora certa. Instinto de gol incomparável, drible curto letal e frieza na finalização que parece sobrenatural. O Baixinho do Pentacampeonato.",
    share: "Fiz o quiz e sou ROMÁRIO 🎯⚽ Instinto puro! Descobre a tua lenda → bolaonacopa.com.br/quiz-lenda",
  },
  {
    id: "zico", nome: "Zico", bandeira: "🇧🇷", emoji: "⚽",
    titulo: "Você é ZICO — o Galinho eterno!",
    desc: "Técnica refinada, faltas impossíveis e visão de jogo privilegiada. O craque que o Brasil não conseguiu ver campeão do mundo — mas que nunca foi e nunca será esquecido.",
    share: "Fiz o quiz e sou ZICO ⚽ O Galinho! Descobre a tua lenda → bolaonacopa.com.br/quiz-lenda",
  },
  {
    id: "kaka", nome: "Kaká", bandeira: "🇧🇷", emoji: "🙏",
    titulo: "Você é KAKÁ — talento e propósito unidos!",
    desc: "Velocidade com bola, visão de jogo privilegiada e serenidade que desconcerta adversários. Você combina talento técnico extraordinário com equilíbrio emocional único.",
    share: "Fiz o quiz e sou KAKÁ 🙏⚽ Talento com propósito! Descobre a tua lenda → bolaonacopa.com.br/quiz-lenda",
  },
  // ── INTERNACIONAIS (19) ──
  {
    id: "maradona", nome: "Maradona", bandeira: "🇦🇷", emoji: "🔥",
    titulo: "Você é MARADONA — genial e absolutamente imparável!",
    desc: "Contraditório, humano e genial ao mesmo tempo. Você carrega um time nas costas e faz o impossível virar realidade. A Mão de Deus e o Gol do Século no mesmo jogo — isso só você faz.",
    share: "Fiz o quiz e sou MARADONA 🔥⚽ Genial e imparável! Descobre a tua lenda → bolaonacopa.com.br/quiz-lenda",
  },
  {
    id: "messi", nome: "Messi", bandeira: "🇦🇷", emoji: "🐐",
    titulo: "Você é MESSI — o GOAT silencioso!",
    desc: "Silencioso fora de campo, devastador dentro dele. Paciência, genialidade e aquele drible que ninguém acompanha. Você esperou a Copa que era sua — e foi buscar com tudo.",
    share: "Fiz o quiz e sou MESSI 🐐⚽ O GOAT! Descobre a tua lenda → bolaonacopa.com.br/quiz-lenda",
  },
  {
    id: "cr7", nome: "Cristiano Ronaldo", bandeira: "🇵🇹", emoji: "💪",
    titulo: "Você é CRISTIANO RONALDO — dedicação e determinação absolutas!",
    desc: "Trabalho duro acima de tudo. Você acredita que o talento se treina e que a disciplina vence o dom natural. Ambicioso, focado, com vontade de ganhar que impressiona até os adversários.",
    share: "Fiz o quiz e sou CRISTIANO RONALDO 💪⚽ Dedicação total! Descobre a tua lenda → bolaonacopa.com.br/quiz-lenda",
  },
  {
    id: "zidane", nome: "Zidane", bandeira: "🇫🇷", emoji: "🎩",
    titulo: "Você é ZIDANE — elegância e inteligência pura!",
    desc: "Você pensa antes de agir, age com precisão cirúrgica e raramente erra. Técnica refinada, visão de jogo extraordinária. Quando está em dia, o jogo parece feito para você.",
    share: "Fiz o quiz e sou ZIDANE 🎩⚽ Elegante e preciso! Descobre a tua lenda → bolaonacopa.com.br/quiz-lenda",
  },
  {
    id: "mbappe", nome: "Mbappé", bandeira: "🇫🇷", emoji: "💨",
    titulo: "Você é MBAPPÉ — velocidade e talento da nova geração!",
    desc: "Velocidade que poucos alcançam, técnica para o que a velocidade não resolve e sangue frio de veterano ainda jovem. Você é o presente e o futuro — e ainda mal começou.",
    share: "Fiz o quiz e sou MBAPPÉ 💨⚽ A nova geração chegou! Descobre a tua lenda → bolaonacopa.com.br/quiz-lenda",
  },
  {
    id: "henry", nome: "Thierry Henry", bandeira: "🇫🇷", emoji: "🏹",
    titulo: "Você é THIERRY HENRY — velocidade com técnica de artista!",
    desc: "Velocidade explosiva combinada com técnica refinada que poucos equilibram. Você criava gols do nada e fazia parecer fácil o que era impossível para qualquer outro atacante.",
    share: "Fiz o quiz e sou THIERRY HENRY 🏹⚽ Velocidade de artista! Descobre a tua lenda → bolaonacopa.com.br/quiz-lenda",
  },
  {
    id: "platini", nome: "Platini", bandeira: "🇫🇷", emoji: "✨",
    titulo: "Você é MICHEL PLATINI — o maestro dos maestros!",
    desc: "Visão de jogo que ia além do que qualquer câmera captava. Você enxerga o espaço antes de ele existir e finaliza com precisão milimétrica. Três Bolas de Ouro consecutivas.",
    share: "Fiz o quiz e sou MICHEL PLATINI ✨⚽ O maestro! Descobre a tua lenda → bolaonacopa.com.br/quiz-lenda",
  },
  {
    id: "cruyff", nome: "Johan Cruyff", bandeira: "🇳🇱", emoji: "🔄",
    titulo: "Você é JOHAN CRUYFF — o futebol total e revolucionário!",
    desc: "Visionário, à frente do seu tempo. Você não apenas joga — você pensa o jogo numa dimensão que poucos alcançam. O futebol total, a Cruyff-turn, o Barcelona moderno — tudo nasceu com você.",
    share: "Fiz o quiz e sou JOHAN CRUYFF 🔄⚽ Futebol total! Descobre a tua lenda → bolaonacopa.com.br/quiz-lenda",
  },
  {
    id: "beckenbauer", nome: "Beckenbauer", bandeira: "🇩🇪", emoji: "🛡️",
    titulo: "Você é BECKENBAUER — o Kaiser!",
    desc: "Liderança natural e elegância defensiva que redefiniu o que um zagueiro pode fazer. Você organiza, comanda e dita o ritmo sem precisar levantar a voz. Todos te seguem naturalmente.",
    share: "Fiz o quiz e sou BECKENBAUER 🛡️⚽ O Kaiser! Descobre a tua lenda → bolaonacopa.com.br/quiz-lenda",
  },
  {
    id: "muller", nome: "Gerd Müller", bandeira: "🇩🇪", emoji: "💣",
    titulo: "Você é GERD MÜLLER — o Bombardeiro implacável!",
    desc: "Sem estética, sem floreio — só gols. O maior artilheiro da Copa por décadas. Os números dizem tudo: sempre gols quando o jogo e o time precisavam.",
    share: "Fiz o quiz e sou GERD MÜLLER 💣⚽ O Bombardeiro! Descobre a tua lenda → bolaonacopa.com.br/quiz-lenda",
  },
  {
    id: "xavi", nome: "Xavi", bandeira: "🇪🇸", emoji: "🔵",
    titulo: "Você é XAVI — o metrônomo do futebol!",
    desc: "Você controla o jogo pelo toque, pelo ritmo e pela posição. Nenhum toque desperdiçado. Você é o coração do sistema — sem você, nada funciona da mesma forma.",
    share: "Fiz o quiz e sou XAVI 🔵⚽ O metrônomo! Descobre a tua lenda → bolaonacopa.com.br/quiz-lenda",
  },
  {
    id: "iniesta", nome: "Iniesta", bandeira: "🇪🇸", emoji: "🥇",
    titulo: "Você é INIESTA — o gol que parou o mundo!",
    desc: "Discreto, eficiente e decisivo nos momentos que importam. Aquele gol no último minuto da prorrogação da final da Copa. Você não precisa de holofote — seus momentos falam por si.",
    share: "Fiz o quiz e sou INIESTA 🥇⚽ O gol que parou o mundo! Descobre a tua lenda → bolaonacopa.com.br/quiz-lenda",
  },
  {
    id: "kane", nome: "Harry Kane", bandeira: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", emoji: "🎖️",
    titulo: "Você é HARRY KANE — o capitão que nunca desiste!",
    desc: "Líder pelo exemplo, artilheiro nato e alguém que carrega a responsabilidade sem reclamar. Você não tem o título que merecia — mas nunca parou de tentar. Isso te define.",
    share: "Fiz o quiz e sou HARRY KANE 🎖️⚽ O capitão! Descobre a tua lenda → bolaonacopa.com.br/quiz-lenda",
  },
  {
    id: "buffon", nome: "Gianluigi Buffon", bandeira: "🇮🇹", emoji: "🧤",
    titulo: "Você é BUFFON — o guardião que inspira!",
    desc: "Presença que impõe respeito, liderança que tranquiliza companheiros e reflexos que salvam jogos perdidos. Quando você está lá, o time inteiro acredita que é possível.",
    share: "Fiz o quiz e sou BUFFON 🧤⚽ O guardião! Descobre a tua lenda → bolaonacopa.com.br/quiz-lenda",
  },
  {
    id: "baggio", nome: "Roberto Baggio", bandeira: "🇮🇹", emoji: "🦁",
    titulo: "Você é ROBERTO BAGGIO — a cauda de cavalo mais famosa do futebol!",
    desc: "Genialidade técnica, dribles que hipnotizavam e aquele pênalti perdido que revelou toda a sua humanidade. Você é lembrado tanto pelo que fez quanto pelo que sentiu.",
    share: "Fiz o quiz e sou ROBERTO BAGGIO 🦁⚽ A cauda de cavalo! Descobre a tua lenda → bolaonacopa.com.br/quiz-lenda",
  },
  {
    id: "totti", nome: "Francesco Totti", bandeira: "🇮🇹", emoji: "🏛️",
    titulo: "Você é FRANCESCO TOTTI — il Capitano eterno!",
    desc: "Leal, genial e absolutamente único. Você passou a carreira inteira no mesmo clube por amor — e deixou um legado que vai muito além de qualquer título.",
    share: "Fiz o quiz e sou FRANCESCO TOTTI 🏛️⚽ Il Capitano! Descobre a tua lenda → bolaonacopa.com.br/quiz-lenda",
  },
  {
    id: "eusebio", nome: "Eusébio", bandeira: "🇵🇹", emoji: "🌍",
    titulo: "Você é EUSÉBIO — a Pantera Negra!",
    desc: "Velocidade felina, chute potente e uma elegância natural que deixou o mundo de boca aberta. Você abriu o caminho de um país inteiro para o futebol de alto nível.",
    share: "Fiz o quiz e sou EUSÉBIO 🌍⚽ A Pantera Negra! Descobre a tua lenda → bolaonacopa.com.br/quiz-lenda",
  },
  {
    id: "yashin", nome: "Lev Yashin", bandeira: "🇷🇺", emoji: "🕷️",
    titulo: "Você é LEV YASHIN — a Aranha Negra!",
    desc: "O único goleiro a vencer a Bola de Ouro. Você defendia o indefensável e comandava a defesa com uma autoridade que poucos conseguiram imitar em décadas.",
    share: "Fiz o quiz e sou LEV YASHIN 🕷️⚽ A Aranha Negra! Descobre a tua lenda → bolaonacopa.com.br/quiz-lenda",
  },
  {
    id: "cafu", nome: "Cafu", bandeira: "🇧🇷", emoji: "🏃",
    titulo: "Você é CAFU — o lateral mais raçudo do mundo!",
    desc: "Incansável, disciplinado e sempre presente. De defesa a ataque sem parar, lidera pelo exemplo e nunca entrega. Dois Mundiais e uma determinação que inspirou gerações.",
    share: "Fiz o quiz e sou CAFU 🏃⚽ O mais raçudo! Descobre a tua lenda → bolaonacopa.com.br/quiz-lenda",
  },
];

export interface PerguntaLenda {
  texto: string;
  opcoes: string[];
}

export const PERGUNTAS_LENDA: PerguntaLenda[] = [
  {
    texto: "No último minuto empatado, o que você faz?",
    opcoes: [
      "Analiso o espaço livre e executo o passe decisivo com precisão cirúrgica",
      "Pego a bola e acelero — minha velocidade não tem resposta",
      "Organizo o time, defino papéis e lidero a jogada coletiva",
      "Improviso um drible impossível que ninguém imaginou e finalizo",
      "Disputo cada centímetro — meu físico e raça decidem o jogo",
    ],
  },
  {
    texto: "Seus companheiros de time te descrevem como:",
    opcoes: [
      "'Ele lê o jogo três jogadas à frente de todo mundo'",
      "'A capacidade física dele é de outro nível — absurdo'",
      "'Quando ele fala, todo mundo para e segue o que diz'",
      "'Nunca sabe o que vai fazer — mas sempre surpreende'",
      "'É o último a sair do treino e nunca desiste de nada'",
    ],
  },
  {
    texto: "Fora do campo, qual é o seu jeito de ser?",
    opcoes: [
      "Estudo táticas e analiso o jogo constantemente",
      "Academia, alimentação controlada, corpo como máquina de alta performance",
      "Sou referência para as pessoas — buscam minha opinião para decidir",
      "Vivo intensamente, confio no instinto e me expresso livremente",
      "Nunca me contento — tem sempre algo a melhorar e alcançar",
    ],
  },
  {
    texto: "Qual gol te representa melhor?",
    opcoes: [
      "Jogada coletiva perfeita — todos tocaram antes de eu finalizar",
      "Chute de potência descomunal de fora da área — o goleiro não saiu do lugar",
      "Gol de liderança no momento exato que o time precisava de mim",
      "Três dribles impossíveis antes de tocar no ângulo tranquilamente",
      "Qualquer gol — desde que seja em final decisiva quando tudo parecia perdido",
    ],
  },
  {
    texto: "Perdendo por 1x0 na semi. Você é o técnico por 1 minuto:",
    opcoes: [
      "Reposiciono taticamente para explorar o espaço que o adversário está deixando",
      "Coloco os mais velozes para pressionar e explorar o contra-ataque",
      "Discurso motivacional — lembro cada jogador do porquê chegou até aqui",
      "Libero a criatividade total — mando jogar sem esquema fixo",
      "Pressão máxima até o apito — todo o time vai para cima",
    ],
  },
  {
    texto: "Como você reage a um erro grave em jogo decisivo?",
    opcoes: [
      "Analiso friamente e mentalmente já corrijo para o próximo lance",
      "Frustração que vira energia — o próximo esforço físico será meu",
      "Me preocupo com o coletivo — meu erro não pode afetar o time",
      "Sorrio e vou criar algo ainda mais bonito logo em seguida",
      "Raiva pura — aquele erro vai me dar força para redimir agora",
    ],
  },
  {
    texto: "Qual frase define seu estilo dentro e fora do campo?",
    opcoes: [
      "'Não é sorte — é estudo, preparação e execução impecável'",
      "'Meu corpo é minha maior ferramenta — treino como ninguém'",
      "'Um time que acredita junto, vence junto — eu sou o elo'",
      "'Futebol é arte — e eu pinto quadros com a bola'",
      "'Me disseram que era improvável. Ainda estou aqui.'",
    ],
  },
  {
    texto: "Em que situação você brilha mais?",
    opcoes: [
      "Em jogadas ensaiadas com tempo e espaço para pensar e executar",
      "Em contra-ataques de velocidade máxima — quanto mais rápido melhor",
      "Nos momentos de tensão máxima — quando o time precisa de uma referência",
      "Na liberdade criativa total — sem marcação, sem esquema, só jogo",
      "Nos momentos em que todos desistiram — eu nunca desisto",
    ],
  },
  {
    texto: "O que mais define o seu estilo de jogo?",
    opcoes: [
      "Inteligência e visão — enxergo espaços que outros não percebem",
      "Potência e velocidade — meu físico é minha maior identidade",
      "Liderança — faço o time funcionar como um conjunto coeso",
      "Imprevisibilidade — minha criatividade não segue padrão algum",
      "Determinação — dou mais do que tenho fisicamente para vencer",
    ],
  },
  {
    texto: "Qual conquista te definiria completamente?",
    opcoes: [
      "Uma Copa construída com jogo bonito, coletivo e técnico impecável",
      "Ser o artilheiro do torneio com gols de força e potência absurda",
      "Ser eleito o capitão que conduziu o time ao título pela liderança",
      "O gol mais bonito da história da Copa — lembrado para sempre",
      "Ganhar uma Copa depois de superar tudo que pareceu impossível",
    ],
  },
];

// SLOTS[perguntaIndex * 5 + opcaoIndex] = índices das lendas que ganham +1 ponto
// Validado em 1.000.000 simulações: todas as 25 lendas com resultado (min 2.3%)
export const SLOTS: number[][] = [
  [0, 7, 9, 16, 17],   [3, 15, 19, 20, 22], [2, 6, 11, 14, 24],  [1, 4, 8, 12, 21],   [5, 10, 13, 18, 23],
  [1, 6, 11, 17, 22],  [3, 9, 14, 20, 23],  [0, 7, 8, 18, 21],   [4, 5, 15, 16, 19],  [2, 10, 12, 13, 24],
  [2, 11, 14, 20, 22], [4, 7, 10, 18, 19],  [1, 5, 8, 21, 23],   [6, 12, 15, 16, 24], [0, 3, 9, 13, 17],
  [1, 8, 11, 18, 22],  [2, 9, 10, 15, 19],  [5, 7, 16, 23, 24],  [3, 13, 14, 17, 21], [0, 4, 6, 12, 20],
  [3, 4, 8, 21, 24],   [11, 13, 15, 19, 20],[1, 5, 7, 14, 17],   [0, 6, 9, 12, 18],   [2, 10, 16, 22, 23],
  [4, 7, 8, 13, 15],   [0, 1, 9, 12, 23],   [3, 16, 17, 22, 24], [2, 5, 11, 14, 18],  [6, 10, 19, 20, 21],
  [1, 5, 12, 13, 17],  [9, 11, 19, 21, 24], [2, 6, 15, 18, 20],  [3, 7, 10, 14, 16],  [0, 4, 8, 22, 23],
  [3, 4, 8, 11, 13],   [1, 2, 12, 17, 24],  [0, 7, 15, 18, 23],  [5, 9, 10, 14, 20],  [6, 16, 19, 21, 22],
  [1, 10, 12, 17, 18], [4, 5, 13, 15, 22],  [0, 11, 19, 20, 21], [2, 3, 7, 14, 16],   [6, 8, 9, 23, 24],
  [14, 17, 19, 21, 22],[4, 12, 13, 20, 24], [3, 8, 9, 11, 15],   [0, 1, 2, 16, 18],   [5, 6, 7, 10, 23],
];

export function calcularLenda(respostas: number[]): Lenda {
  const scores = new Array(25).fill(0);
  respostas.forEach((resp, qi) => {
    SLOTS[qi * 5 + resp].forEach((idx) => {
      scores[idx] += 1;
    });
  });
  const maxScore = Math.max(...scores);
  return LENDAS[scores.indexOf(maxScore)];
}
