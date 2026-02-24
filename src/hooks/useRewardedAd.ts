import { useState, useCallback, useRef } from "react";
import { useUserPlan } from "./useUserPlan";

// Chave localStorage para controle diário
const LAST_PALPITE_AD_KEY = "bolao_last_palpite_ad";
const getToday = () => new Date().toISOString().split("T")[0];

/**
 * Hook para gerenciar Rewarded Ads
 * - Mostra AdRewardModal (countdown) em todas as plataformas (web + app)
 * - Premium: nunca vê ads
 * - Palpites: só mostra ad no primeiro do dia
 */
export const useRewardedAd = () => {
  const { plano } = useUserPlan();
  const [adLoading, setAdLoading] = useState(false);
  const resolveRef = useRef<((watched: boolean) => void) | null>(null);

  const isPremium = plano === "premium" || plano === "premium_pro";

  const hasWatchedPalpiteAdToday = useCallback(() => {
    try { return localStorage.getItem(LAST_PALPITE_AD_KEY) === getToday(); }
    catch { return false; }
  }, []);

  const markPalpiteAdWatched = useCallback(() => {
    try { localStorage.setItem(LAST_PALPITE_AD_KEY, getToday()); } catch {}
  }, []);

  const showAd = useCallback(async (tipo: "criar" | "palpite" | "entrar"): Promise<boolean> => {
    // Premium: sem ads
    if (isPremium) return true;

    // Palpite: só mostra ad no primeiro do dia
    if (tipo === "palpite" && hasWatchedPalpiteAdToday()) return true;

    // Retorna uma Promise que será resolvida quando resolveWebAd for chamado
    // O componente que consome o hook é responsável por abrir o AdRewardModal
    return new Promise<boolean>((resolve) => {
      resolveRef.current = (watched: boolean) => {
        if (tipo === "palpite" && watched) markPalpiteAdWatched();
        resolve(watched);
      };
    });
  }, [isPremium, hasWatchedPalpiteAdToday, markPalpiteAdWatched]);

  const resolveWebAd = useCallback((watched: boolean) => {
    if (resolveRef.current) {
      resolveRef.current(watched);
      resolveRef.current = null;
    }
  }, []);

  return {
    showAd,
    adLoading,
    isPremium,
    resolveWebAd,
    needsAd: !isPremium,
  };
};
