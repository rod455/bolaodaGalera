// ═══ Tipos compartilhados do Bolão na Copa ═══

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
