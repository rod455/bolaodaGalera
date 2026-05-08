// ═══ Tipos de Notificação do Grupo da Galera ═══

export type NotificacaoTipo =
  | "palpite_pendente"
  | "jogo_encerrado"
  | "ranking_update"
  | "novo_participante"
  | "evento_especial"
  | "convite_bolao"
  | "sistema";

export interface Notificacao {
  id: string;
  user_id: string;
  tipo: NotificacaoTipo;
  titulo: string;
  mensagem: string;
  dados: NotificacaoDados;
  lida: boolean;
  push_enviada: boolean;
  created_at: string;
}

export interface NotificacaoDados {
  bolao_id?: string;
  bolao_nome?: string;
  jogo_id?: string;
  rota?: string; // Rota para navegar ao clicar (ex: "/bolao/abc/palpites?jogo=xyz")
  icone?: string; // lucide icon name
  [key: string]: any;
}

export interface NotificacaoPreferencias {
  user_id: string;
  push_ativo: boolean;
  palpite_pendente: boolean;
  jogo_encerrado: boolean;
  ranking_update: boolean;
  novo_participante: boolean;
  evento_especial: boolean;
  horario_silencio_inicio: string | null;
  horario_silencio_fim: string | null;
  updated_at: string;
}

// Config visual por tipo de notificação (para renderização)
export interface NotificacaoVisualConfig {
  icone: string;
  cor: string;
  bg: string;
  border: string;
}

export const NOTIFICACAO_VISUAL: Record<NotificacaoTipo, NotificacaoVisualConfig> = {
  palpite_pendente: {
    icone: "Clock",
    cor: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  jogo_encerrado: {
    icone: "Trophy",
    cor: "text-copa-green-600",
    bg: "bg-copa-green-50",
    border: "border-copa-green-200",
  },
  ranking_update: {
    icone: "TrendingUp",
    cor: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  novo_participante: {
    icone: "UserPlus",
    cor: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
  },
  evento_especial: {
    icone: "Flame",
    cor: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-200",
  },
  convite_bolao: {
    icone: "Mail",
    cor: "text-copa-green-600",
    bg: "bg-copa-green-50",
    border: "border-copa-green-200",
  },
  sistema: {
    icone: "Info",
    cor: "text-gray-600",
    bg: "bg-gray-50",
    border: "border-gray-200",
  },
};
