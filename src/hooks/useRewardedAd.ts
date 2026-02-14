import { useState, useCallback, useRef } from "react";
import { useUserPlan } from "./useUserPlan";

// Chave localStorage para controle diário
const LAST_PALPITE_AD_KEY = "bolao_last_palpite_ad";
const getToday = () => new Date().toISOString().split("T")[0];

// Tipo global para o AdMob (disponível apenas no app nativo)
declare global {
  interface Window {
    Capacitor?: { isNativePlatform?: () => boolean };
    AdMobPlugin?: {
      prepareRewardVideoAd: (opts: { adId: string }) => Promise<void>;
      showRewardVideoAd: () => Promise<void>;
      addListener: (event: string, cb: () => void) => void;
    };
  }
}

/**
 * Hook para gerenciar Rewarded Ads
 * - Web: usa modal de countdown (AdRewardModal)
 * - Nativo: usa Google AdMob via Capacitor (carregado em runtime)
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
      // Import dinâmico só no nativo — Vite ignora em build web pois nunca entra aqui
      const mod = await (Function('return import("@capacitor-community/admob")')() as Promise<any>);
      const AdMob = mod.AdMob;

      await AdMob.prepareRewardVideoAd({
        adId: "ca-app-pub-8494311740043165/9218959284", // Reward Bolão - Produção
      });

      return new Promise<boolean>((resolve) => {
        AdMob.addListener("onRewardedVideoAdDismissed", () => {
          if (tipo === "palpite") markPalpiteAdWatched();
          setAdLoading(false);
          resolve(true);
        });
        AdMob.addListener("onRewardedVideoAdFailedToLoad", () => {
          setAdLoading(false);
          resolve(true); // Deixa continuar se falhar
        });
        AdMob.showRewardVideoAd();
      });
    } catch {
      setAdLoading(false);
      return true; // Fallback: deixa continuar
    }
  }, [markPalpiteAdWatched]);

  const showAd = useCallback(async (tipo: "criar" | "palpite" | "entrar"): Promise<boolean> => {
    if (isPremium) return true;
    if (tipo === "palpite" && hasWatchedPalpiteAdToday()) return true;

    setAdLoading(true);

    // App nativo: usa AdMob real | Web: usa modal countdown
    if (isNative()) { return showNativeAd(tipo); }

    return new Promise<boolean>((resolve) => {
      resolveRef.current = (watched: boolean) => {
        if (watched && tipo === "palpite") markPalpiteAdWatched();
        setAdLoading(false);
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
