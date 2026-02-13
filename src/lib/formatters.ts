// ═══ Funções utilitárias compartilhadas ═══

import { FASE_TRADUCAO } from "./constants";

/**
 * Traduz fase da API (inglês) para português.
 */
export function traduzirFase(fase: string | null): string | null {
  if (!fase) return null;
  return FASE_TRADUCAO[fase] || FASE_TRADUCAO[fase.toUpperCase()] || fase;
}

/**
 * Formata data de jogo para exibição amigável.
 * Ex: "Hoje • 16:00", "Amanhã • 20:30", "Quarta-feira • 21:00", "15 de junho • Sábado • 18:00"
 */
export function formatDataJogo(isoDate: string): string {
  const d = new Date(isoDate);
  const now = new Date();

  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow =
    d.getDate() === tomorrow.getDate() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getFullYear() === tomorrow.getFullYear();

  const hora = d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isToday) return `Hoje • ${hora}`;
  if (isTomorrow) return `Amanhã • ${hora}`;

  const weekday = d.toLocaleDateString("pt-BR", { weekday: "long" });
  const capitalWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);

  const diffDays = Math.floor(
    (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays < 7 && diffDays >= 0) {
    return `${capitalWeekday} • ${hora}`;
  }

  return `${d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
  })} • ${capitalWeekday} • ${hora}`;
}

/**
 * Formata apenas a hora de uma data ISO.
 */
export function formatHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Extrai número de uma rodada string (ex: "Rodada 5" → 5).
 */
export function rodadaNum(rodada: string | null): number {
  if (!rodada) return 0;
  const m = rodada.match(/\d+/);
  return m ? parseInt(m[0]) : 0;
}

/**
 * Gera iniciais do nome para avatar (ex: "João Silva" → "JS").
 */
export function getInitials(nome: string): string {
  return nome
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}
