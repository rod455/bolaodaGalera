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

  // Comparar usando data local (sem hora) para evitar problemas de fuso
  const dLocal = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const nowLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((dLocal.getTime() - nowLocal.getTime()) / (1000 * 60 * 60 * 24));

  const hora = d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (diffDays === 0) return `Hoje • ${hora}`;
  if (diffDays === 1) return `Amanhã • ${hora}`;

  const weekday = d.toLocaleDateString("pt-BR", { weekday: "long" });
  const capitalWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);

  if (diffDays >= 2 && diffDays <= 3) {
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


