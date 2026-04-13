// ═══ Constantes compartilhadas do Bolão na Copa ═══

import type { RegraInfo, ModoConfig } from "./types";

// ── Labels curtos para badges ──
export const MODO_LABELS: Record<string, string> = {
  casual: "Casual",
  placar_correto: "Placar Correto",
  amador: "Amador",
  vencedor_ou_nada: "Vencedor ou Nada",
  profissional: "Profissional",
  fanatico: "Torcedor Fanático",
  mata_mata: "Mata a Mata",
};

// ── Regras detalhadas de cada modo (versão unificada) ──
export const MODO_REGRAS: Record<string, RegraInfo> = {
  casual: {
    titulo: "Modo Casual",
    descricao: "Modo simples para quem está começando.",
    regras: [
      { texto: "Placar exato", pontos: "10 pts", acerto: true },
      { texto: "Acertar o vencedor", pontos: "3 pts", acerto: true },
      { texto: "Empate com gols errados", pontos: "5 pts", acerto: true },
    ],
  },
  placar_correto: {
    titulo: "Modo Placar Correto",
    descricao: "Acertou o placar, pontuou. Errou, zero.",
    regras: [
      { texto: "Placar exato", pontos: "10 pts", acerto: true },
      { texto: "Errou o placar", pontos: "0 pts", acerto: false },
    ],
  },
  amador: {
    titulo: "Modo Amador",
    descricao: "Intermediário, com pontos por diferença de gols.",
    regras: [
      { texto: "Placar exato", pontos: "10 pts", acerto: true },
      { texto: "Acertar o vencedor", pontos: "3 pts", acerto: true },
      { texto: "Empate com gols errados", pontos: "5 pts", acerto: true },
      { texto: "Diferença de gols correta", pontos: "3 pts", acerto: true },
      { texto: "Gols do vencedor", pontos: "2 pts", acerto: true },
      { texto: "Gols do perdedor", pontos: "2 pts", acerto: true },
    ],
  },
  vencedor_ou_nada: {
    titulo: "Modo Vencedor ou Nada",
    descricao: "Acerte o vencedor ou o empate.",
    regras: [
      { texto: "Vencedor / Empate", pontos: "5 pts", acerto: true },
      { texto: "Errou", pontos: "0 pts", acerto: false },
    ],
  },
  profissional: {
    titulo: "Modo Profissional",
    descricao: "Modo completo com pontuações altas e bonificações detalhadas.",
    regras: [
      { texto: "Placar exato", pontos: "20 pts", acerto: true },
      { texto: "Vencedor + diferença de gols", pontos: "10 pts", acerto: true },
      { texto: "Acertar o vencedor", pontos: "5 pts", acerto: true },
      { texto: "Empate com gols errados", pontos: "8 pts", acerto: true },
      { texto: "Gols do vencedor", pontos: "2 pts", acerto: true },
      { texto: "Gols do perdedor", pontos: "2 pts", acerto: true },
    ],
  },
  fanatico: {
    titulo: "Modo Torcedor Fanático",
    descricao: "Só jogos do seu time, pontuação máxima.",
    regras: [
      { texto: "Placar exato", pontos: "20 pts", acerto: true },
      { texto: "Vencedor + diferença de gols", pontos: "10 pts", acerto: true },
      { texto: "Acertar o vencedor", pontos: "5 pts", acerto: true },
      { texto: "Empate com gols errados", pontos: "8 pts", acerto: true },
      { texto: "Gols do vencedor", pontos: "2 pts", acerto: true },
      { texto: "Gols do perdedor", pontos: "2 pts", acerto: true },
    ],
  },
  mata_mata: {
    titulo: "Modo Mata a Mata",
    descricao: "Escolha um time por rodada. Se vencer ou empatar, você continua. Se perder, está fora!",
    regras: [
      { texto: "Escolha 1 time por rodada para vencer", pontos: "✅", acerto: true },
      { texto: "Time venceu ou empatou → você sobrevive", pontos: "✅", acerto: true },
      { texto: "Time perdeu → eliminado", pontos: "❌", acerto: false },
      { texto: "Não pode repetir time já escolhido", pontos: "🔒", acerto: false },
      { texto: "Último sobrevivente marca pontos (20 − rodadas)", pontos: "🏆", acerto: true },
    ],
  },
};

// ── Configuração dos modos para CriarBolao (com plano requerido) ──
export const MODOS_PONTUACAO: ModoConfig[] = [
  { id: "casual", nome: "Casual", subtitulo: "Iniciantes", plano: "free" },
  { id: "mata_mata", nome: "Mata a Mata", subtitulo: "Último sobrevivente pontua", plano: "free" },
  { id: "placar_correto", nome: "Placar Correto", subtitulo: "Acertou o placar ou zero", plano: "free" },
  { id: "amador", nome: "Amador", subtitulo: "Intermediário", plano: "premium" },
  { id: "vencedor_ou_nada", nome: "Vencedor ou Nada", subtitulo: "Acerte o vencedor", plano: "premium" },
  { id: "profissional", nome: "Profissional", subtitulo: "Avançado", plano: "premium_pro" },
  { id: "fanatico", nome: "Torcedor Fanático", subtitulo: "Só jogos do seu time", plano: "premium_pro" },
];

// ── Tradução de fases (football-data.org → PT-BR) ──
export const FASE_TRADUCAO: Record<string, string> = {
  GROUP_STAGE: "Fase de Grupos",
  LAST_16: "Oitavas de Final",
  LAST_32: "Fase Eliminatória",
  QUARTER_FINALS: "Quartas de Final",
  QUARTER_FINAL: "Quartas de Final",
  SEMI_FINALS: "Semifinal",
  SEMI_FINAL: "Semifinal",
  FINAL: "Final",
  THIRD_PLACE: "Terceiro Lugar",
  PLAYOFF: "Repescagem",
  PLAY_OFF: "Repescagem",
  LEAGUE_STAGE: "Liga",
  REGULAR_SEASON: "Liga",
  ROUND_OF_16: "Oitavas de Final",
  ROUND_OF_32: "Fase Eliminatória",
};

// ── Limites de planos ──
export const FREE_MAX_CRIAR = 1;
export const FREE_MAX_PRIVADOS = 3;
export const FREE_MAX_PARTICIPANTES = 15;
export const PREMIUM_MAX_PARTICIPANTES = 30;
export const PREMIUM_PRO_MAX_PARTICIPANTES = 50;

// ── Imagens fallback para cards de bolão ──
export const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=600&h=300&fit=crop",
  "https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=600&h=300&fit=crop",
  "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=600&h=300&fit=crop",
];

// ── Ordem canônica de fases para sorting ──
export const FASE_ORDER = [
  "Fase de Grupos",
  "Liga",
  "Última Rodada",
  "Fase Eliminatória",
  "Oitavas de Final",
  "Quartas de Final",
  "Semifinal",
  "Terceiro Lugar",
  "Final",
];

// ── URLs com UTM para convites ──
export const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.bolaonacopa.app";
export const APP_STORE_URL = "https://apps.apple.com/app/bolao-na-copa/id6761629695";

// Retorna a URL da loja correta baseado na plataforma
import { Capacitor } from "@capacitor/core";
export function isIOSPlatform(): boolean {
  try {
    if (Capacitor.getPlatform() === "ios") return true;
    if (typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent)) return true;
  } catch {}
  return false;
}
export function getStoreUrl(): string {
  return isIOSPlatform() ? APP_STORE_URL : PLAY_STORE_URL;
}
const BASE_URL = "https://www.bolaonacopa.com.br";

export function getInviteUrl(bolaoId: string, codigoConvite: string, medium: "whatsapp" | "share" | "copy" = "share"): string {
  return `${BASE_URL}/entrar?codigo=${codigoConvite}&utm_source=convite&utm_medium=${medium}&utm_campaign=bolao_${bolaoId}`;
}

export function getReferralUrl(referralCode: string, medium: "whatsapp" | "share" | "copy" = "share"): string {
  return `${BASE_URL}/auth?modo=cadastro&ref=${referralCode}&utm_source=referral&utm_medium=${medium}&utm_campaign=indicacao`;
}