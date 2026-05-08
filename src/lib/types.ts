// ═══ Tipos compartilhados do Grupo da Galera ═══

export interface Campeonato {
  id?: string;
  nome?: string;
  nome_popular: string;
  logo_url: string;
  temporada?: number;
  tipo?: string;
}

export interface Bolao {
  id: string;
  nome: string;
  descricao: string | null;
  imagem_url: string | null;
  campeonato_id: string | null;
  is_nacional: boolean;
  is_publico?: boolean;
  codigo_convite: string | null;
  criador_id: string | null;
  modo_pontuacao: string;
  time_favorito?: string | null;
  aprovacao_entrada?: boolean;
  campeonatos?: Campeonato | null;
}

export interface Jogo {
  id: string;
  time_a: string;
  time_b: string;
  logo_time_a: string | null;
  logo_time_b: string | null;
  data_hora: string;
  fase: string | null;
  rodada: string | null;
  status: string;
  placar_time_a: number | null;
  placar_time_b: number | null;
  campeonato_id?: string;
  campeonatos?: { nome_popular: string; logo_url: string } | null;
}

export interface Palpite {
  id?: string;
  jogo_id: string;
  placar_time_a: number;
  placar_time_b: number;
  pontos: number | null;
}

export interface RankingEntry {
  pos: number;
  nome: string;
  avatar: string;
  pontos: number;
  isCurrentUser: boolean;
  userId?: string;
}

export interface RegraInfo {
  titulo: string;
  descricao: string;
  regras: { texto: string; pontos: string; acerto: boolean }[];
}

export interface ModoConfig {
  id: string;
  nome: string;
  subtitulo: string;
  plano: string;
}

// ── Mata a Mata ──

export interface MataMataCiclo {
  id: string;
  bolao_id: string;
  ciclo_numero: number;
  rodada_atual: number;
  status: "ativo" | "finalizado";
  pontos_iniciais: number;
  vencedor_id: string | null;
  pontos_vencedor: number | null;
  created_at: string;
  finalizado_em: string | null;
}

export interface MataMataParticipante {
  id: string;
  ciclo_id: string;
  user_id: string;
  status: "vivo" | "eliminado" | "vencedor";
  eliminado_na_rodada: number | null;
  pontos_ganhos: number;
}

export interface MataMataEscolha {
  id: string;
  ciclo_id: string;
  user_id: string;
  rodada: number;
  time_escolhido: string;
  jogo_id: string;
  resultado: "vitoria" | "derrota" | "empate" | null;
}
