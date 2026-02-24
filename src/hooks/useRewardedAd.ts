import { useState, useCallback, useRef } from "react";
import { useUserPlan } from "./useUserPlan";

// Chave localStorage para controle diário
const LAST_PALPITE_AD_KEY = "bolao_last_palpite_ad";
const getToday = () => new Date().toISOString().split("T")[0];

// Tipo global para o AdMob (disponível apenas no app nativo)
declare global {
  interface Window {
    Capacitor?: { isNativePlatform?: () => boolean };
  }
}

/**
 * Hook para gerenciar Rewarded Ads
 * - Web: sem ads (retorna true direto)
 * - Nativo: usa Google AdMob via Capacitor
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

  const isNative = () => {
    try { return !!window.Capacitor?.isNativePlatform?.(); }
    catch { return false; }
  };

  const showNativeAd = useCallback(async (tipo: string): Promise<boolean> => {
    try {
      const mod = await (Function('return import("@capacitor-community/admob")')() as Promise<any>);
      const AdMob = mod.AdMob;

      await AdMob.prepareRewardVideoAd({
        adId: "ca-app-pub-8494311740043165/9218959284",
      });

      return new Promise<boolean>((resolve) => {
        AdMob.addListener("onRewardedVideoAdDismissed", () => {
          if (tipo === "palpite") markPalpiteAdWatched();
          setAdLoading(false);
          resolve(true);
        });
        AdMob.addListener("onRewardedVideoAdFailedToLoad", () => {
          setAdLoading(false);
          resolve(true);
        });
        AdMob.showRewardVideoAd();
      });
    } catch {
      setAdLoading(false);
      return true;
    }
  }, [markPalpiteAdWatched]);

  const showAd = useCallback(async (tipo: "criar" | "palpite" | "entrar"): Promise<boolean> => {
    if (isPremium) return true;
    if (!isNative()) return true; // Web: sem ads
    if (tipo === "palpite" && hasWatchedPalpiteAdToday()) return true;

    setAdLoading(true);
    return showNativeAd(tipo);
  }, [isPremium, hasWatchedPalpiteAdToday, showNativeAd]);

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
